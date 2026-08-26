import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, SquarePen, Trash2 } from "lucide-react";

import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
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
import {
  deleteClassificacaoDefault,
  type ClassificacaoResponse,
  type ClassificacaoDocumentoDefaultResponse,
} from "@/lib/api/classificacaoService";
import { DefaultDocDialog } from "./DefaultDocDialog";

/** Lists (and lets the user add/edit/delete) the default documentos of one Classificação. */
export function ClassificacaoDefaultsPanel({ classificacao }: { classificacao: ClassificacaoResponse }) {
  const [dialogState, setDialogState] = useState<
    { mode: "create" } | { mode: "edit"; item: ClassificacaoDocumentoDefaultResponse } | null
  >(null);
  const [deleteTarget, setDeleteTarget] = useState<ClassificacaoDocumentoDefaultResponse | null>(null);
  const queryClient = useQueryClient();

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteClassificacaoDefault(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: classificacaoKeys.all });
      toast({ description: "Documento padrão removido." });
      setDeleteTarget(null);
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", description: error.message });
    },
  });

  return (
    <div className="space-y-3">
      {classificacao.defaults.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum documento padrão ainda.</p>
      ) : (
        <ul className="space-y-1.5">
          {classificacao.defaults.map((d) => (
            <li
              key={d.id}
              className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2 text-sm"
            >
              <div className="min-w-0">
                <span className="font-medium">{d.label}</span>
                {d.cadencia_label && (
                  <span className="ml-2 text-xs text-muted-foreground">{d.cadencia_label}</span>
                )}
                {d.resp && <span className="ml-2 text-xs text-muted-foreground">· {d.resp}</span>}
              </div>
              <div className="flex shrink-0 gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => setDialogState({ mode: "edit", item: d })}
                >
                  <SquarePen className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => setDeleteTarget(d)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Button size="sm" variant="outline" onClick={() => setDialogState({ mode: "create" })}>
        <Plus className="mr-1 h-4 w-4" />
        Adicionar documento padrão
      </Button>

      <DefaultDocDialog
        classificacaoId={classificacao.id}
        open={dialogState != null}
        onOpenChange={(o) => !o && setDialogState(null)}
        initial={dialogState?.mode === "edit" ? dialogState.item : undefined}
      />

      <AlertDialog open={deleteTarget != null} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover "{deleteTarget?.label}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso só afeta o template desta classificação — documentos já criados em ativos não são
              alterados. Esta ação não pode ser desfeita pela interface.
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
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
