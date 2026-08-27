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
  createClassificacaoDefault,
  updateClassificacaoDefault,
  type ClassificacaoDocumentoDefaultResponse,
} from "@/lib/api/classificacaoService";

/**
 * Create/edit form for one default documento inside a Classificação.
 *
 * Free-form catalog (label/ícone/cadência em texto, sem o DocTipo fechado) —
 * espelha `ui_kits/compass/DocRepo.jsx`'s ASSET_TYPES catalog no design de
 * referência. Ao ser aplicado a um Ativo, vira um Documento com tipo="outro".
 */
export function DefaultDocDialog({
  classificacaoId,
  open,
  onOpenChange,
  initial,
}: {
  classificacaoId: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** Present = edit mode; absent = create mode. */
  initial?: ClassificacaoDocumentoDefaultResponse;
}) {
  const isEdit = !!initial;
  const [label, setLabel] = useState(initial?.label ?? "");
  const [cadenciaLabel, setCadenciaLabel] = useState(initial?.cadencia_label ?? "");
  const [refHint, setRefHint] = useState(initial?.ref_hint ?? "");
  const [nota, setNota] = useState(initial?.nota ?? "");
  const queryClient = useQueryClient();

  useEffect(() => {
    if (open) {
      setLabel(initial?.label ?? "");
      setCadenciaLabel(initial?.cadencia_label ?? "");
      setRefHint(initial?.ref_hint ?? "");
      setNota(initial?.nota ?? "");
    }
  }, [open, initial]);

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        label: label.trim(),
        cadencia_label: cadenciaLabel.trim() || undefined,
        ref_hint: refHint.trim() || undefined,
        nota: nota.trim() || undefined,
      };
      return isEdit
        ? updateClassificacaoDefault(initial!.id, payload)
        : createClassificacaoDefault(classificacaoId, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: classificacaoKeys.all });
      toast({ description: isEdit ? "Documento padrão atualizado." : "Documento padrão adicionado." });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", description: error.message });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar documento padrão" : "Novo documento padrão"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label>Nome do documento</Label>
            <Input
              placeholder="ex.: CVC (Compromisso de Venda e Compra)"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label>Cadência</Label>
            <Input
              placeholder="ex.: Mensal, Por operação, Único..."
              value={cadenciaLabel}
              onChange={(e) => setCadenciaLabel(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Referência</Label>
            <Input
              placeholder="ex.: nome/nº da unidade"
              value={refHint}
              onChange={(e) => setRefHint(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Nota (opcional)</Label>
            <Input
              placeholder="ex.: Anual, ou quando há atualização."
              value={nota}
              onChange={(e) => setNota(e.target.value)}
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
            disabled={mutation.isPending || !label.trim()}
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
