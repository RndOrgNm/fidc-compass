import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, SquarePen, Trash2 } from "lucide-react";

import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { classificacaoKeys } from "@/lib/queryKeys";
import { deleteClassificacao, type ClassificacaoResponse } from "@/lib/api/classificacaoService";
import { ClassificacaoDialog } from "./ClassificacaoDialog";
import { ClassificacaoDefaultsPanel } from "./ClassificacaoDefaultsPanel";

export function ClassificacaoList({ items }: { items: ClassificacaoResponse[] }) {
  const [dialogState, setDialogState] = useState<
    { mode: "create" } | { mode: "edit"; item: ClassificacaoResponse } | null
  >(null);
  const [deleteTarget, setDeleteTarget] = useState<ClassificacaoResponse | null>(null);
  const queryClient = useQueryClient();

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteClassificacao(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: classificacaoKeys.all });
      toast({ description: "Classificação removida." });
      setDeleteTarget(null);
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", description: error.message });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setDialogState({ mode: "create" })}>
          <Plus className="mr-1 h-4 w-4" />
          Nova classificação
        </Button>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma classificação cadastrada.</p>
      ) : (
        <Accordion type="multiple" className="rounded-md border border-border/60 px-2">
          {items.map((c) => (
            <AccordionItem key={c.id} value={c.id}>
              <div className="flex items-center gap-2 pr-1">
                <AccordionTrigger className="flex-1">
                  <span className="flex items-baseline gap-2">
                    <span className={!c.ativa ? "text-muted-foreground line-through" : undefined}>
                      {c.nome}
                    </span>
                    <span className="text-xs font-normal text-muted-foreground">
                      {c.defaults.length} documento(s) padrão
                    </span>
                  </span>
                </AccordionTrigger>
                <div className="flex shrink-0 gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => setDialogState({ mode: "edit", item: c })}
                  >
                    <SquarePen className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => setDeleteTarget(c)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <AccordionContent>
                <ClassificacaoDefaultsPanel classificacao={c} />
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}

      <ClassificacaoDialog
        open={dialogState != null}
        onOpenChange={(o) => !o && setDialogState(null)}
        initial={dialogState?.mode === "edit" ? dialogState.item : undefined}
      />

      <AlertDialog open={deleteTarget != null} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir "{deleteTarget?.nome}"?</AlertDialogTitle>
            <AlertDialogDescription>
              A classificação deixa de aparecer para novos ativos, mas ativos que já a usam
              continuam com a referência preservada. Esta ação não pode ser desfeita pela interface.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMut.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMut.isPending}
              onClick={() => deleteTarget && deleteMut.mutate(deleteTarget.id)}
            >
              {deleteMut.isPending ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-1 h-4 w-4" />
              )}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
