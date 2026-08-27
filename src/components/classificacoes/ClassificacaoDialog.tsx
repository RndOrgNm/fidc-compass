import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, SquarePen } from "lucide-react";

import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { classificacaoKeys } from "@/lib/queryKeys";
import {
  createClassificacao,
  updateClassificacao,
  type ClassificacaoResponse,
} from "@/lib/api/classificacaoService";

/**
 * Create/edit form for a Classificação — a single "nome" input.
 *
 * Shared component: used both by the admin page's own "Nova classificação" /
 * "Editar" actions AND by the inline "+ Nova classificação" flow inside the
 * Ativo dialogs (NovoAtivoDialog/EditAtivoDialog) — `onCreated` is what the
 * latter uses to immediately select the newly created classificação.
 */
export function ClassificacaoDialog({
  open,
  onOpenChange,
  initial,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** Present = edit mode; absent = create mode. */
  initial?: ClassificacaoResponse;
  /** Called only on a successful create (not edit) — lets a caller select the new item. */
  onCreated?: (classificacao: ClassificacaoResponse) => void;
}) {
  const isEdit = !!initial;
  const [nome, setNome] = useState(initial?.nome ?? "");
  const queryClient = useQueryClient();

  useEffect(() => {
    if (open) setNome(initial?.nome ?? "");
  }, [open, initial]);

  const mutation = useMutation({
    mutationFn: () =>
      isEdit
        ? updateClassificacao(initial!.id, { nome: nome.trim() })
        : createClassificacao({ nome: nome.trim() }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: classificacaoKeys.all });
      toast({ description: isEdit ? "Classificação atualizada." : "Classificação criada." });
      onOpenChange(false);
      if (!isEdit) onCreated?.(result);
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", description: error.message });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar classificação" : "Nova classificação"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label>Nome</Label>
            <Input
              placeholder="ex.: Terreno"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              autoFocus
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={mutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            size="sm"
            disabled={mutation.isPending || !nome.trim()}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : isEdit ? (
              <SquarePen className="mr-1 h-4 w-4" />
            ) : (
              <Plus className="mr-1 h-4 w-4" />
            )}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
