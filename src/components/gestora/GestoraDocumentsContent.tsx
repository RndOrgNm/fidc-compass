import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Loader2 } from "lucide-react";

import { toast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { docLabel } from "@/data/ativosData";
import { documentoKeys } from "@/lib/queryKeys";
import { DocumentTable } from "@/components/fundos/DocumentTable";
import { DocumentDialog, type PrazoPrefill } from "@/components/fundos/DocumentDialog";
import { DocumentViewerSheet } from "@/components/fundos/DocumentViewerSheet";
import {
  listGestoras,
  listDocumentosByGestora,
} from "@/lib/api/gestoraService";
import {
  createDocumento,
  updateDocumento,
  deleteDocumento,
  uploadDocumentoFile,
  desvincularPrazo,
  type DocTipo,
  type Cadencia,
  type DocumentoResponse,
  type DocumentoOrderBy,
  type OrderDir,
} from "@/lib/api/documentoService";

export function GestoraDocumentsContent() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [orderBy, setOrderBy] = useState<DocumentoOrderBy | undefined>(undefined);
  const [orderDir, setOrderDir] = useState<OrderDir>("asc");

  const gestorasQuery = useQuery({ queryKey: ["gestoras"], queryFn: listGestoras });
  const gestora = gestorasQuery.data?.items[0];

  const documentosQuery = useQuery({
    queryKey: gestora ? [...documentoKeys.byGestora(gestora.id), orderBy, orderDir] : documentoKeys.all,
    queryFn: () => listDocumentosByGestora(gestora!.id, orderBy, orderDir),
    enabled: !!gestora,
  });

  const [docState, setDocState] = useState<{ doc: DocumentoResponse | null; isNew: boolean } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DocumentoResponse | null>(null);
  const [viewDoc, setViewDoc] = useState<DocumentoResponse | null>(null);
  const [saving, setSaving] = useState(false);

  function invalidate() {
    return gestora
      ? queryClient.invalidateQueries({ queryKey: documentoKeys.byGestora(gestora.id) })
      : Promise.resolve();
  }

  const desvincularPrazoMut = useMutation({
    mutationFn: (documentoId: string) => desvincularPrazo(documentoId),
    onSuccess: async (updated) => {
      await invalidate();
      setDocState((s) => (s ? { ...s, doc: updated } : s));
      toast({ title: "Prazo desvinculado", description: "A obrigação continua na aba Prazos." });
    },
    onError: (e: Error) =>
      toast({ title: "Erro ao desvincular prazo", description: e.message, variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteDocumento(id),
    onSuccess: async () => {
      await invalidate();
      toast({ title: "Documento excluído" });
      setDeleteTarget(null);
    },
    onError: (e: Error) => toast({ title: "Erro ao excluir", description: e.message, variant: "destructive" }),
  });

  async function handleSaveDocument(values: {
    tipo: DocTipo;
    nomePersonalizado: string;
    cadencia: Cadencia;
    periodo: string;
    observacao: string;
    file: File | null;
  }) {
    if (!gestora) return;
    setSaving(true);
    try {
      let docId = docState?.doc?.id;
      if (docState?.isNew) {
        const created = await createDocumento({
          gestora_id: gestora.id,
          tipo: values.tipo,
          nome_personalizado: values.tipo === "outro" ? values.nomePersonalizado : undefined,
          cadencia: values.cadencia,
          periodo_referencia: values.periodo || undefined,
          observacao: values.observacao.trim() || undefined,
        });
        docId = created.id;
      } else if (docId) {
        await updateDocumento(docId, {
          nome_personalizado: values.tipo === "outro" ? values.nomePersonalizado : undefined,
          cadencia: values.cadencia,
          periodo_referencia: values.periodo || undefined,
          observacao: values.observacao.trim() || undefined,
        });
      }
      if (docId && values.file) {
        await uploadDocumentoFile(docId, values.file);
      }
      await invalidate();
      toast({ title: "Documento salvo" });
      setDocState(null);
    } catch (e) {
      toast({ title: "Erro ao salvar documento", description: (e as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  // Mesmo deep-link pra Prazos → Nova Obrigação que a aba Ativos usa (ver
  // AtivosContent.tsx), só que pra /gestora/prazos em vez de /fundos/prazos/:id.
  function goToNovaObrigacao(prefill: PrazoPrefill) {
    navigate("/gestora/prazos", {
      state: {
        novaObrigacao: {
          documentoId: prefill.documentoId,
          prefill: {
            topico: prefill.topico,
            descricao: prefill.resp ? `Responsável sugerido: ${prefill.resp}` : undefined,
            categoria: "REGULATORIO",
            tipo_prazo: "DIA_FIXO",
            parametros: {},
            antecedencia_alerta_dias: 7,
          },
        },
      },
    });
  }

  function goToPrazo(obrigacaoId: string) {
    navigate("/gestora/prazos", {
      state: { verObrigacao: { obrigacaoId } },
    });
  }

  const documentos = documentosQuery.data?.documentos ?? [];

  if (gestorasQuery.isLoading) {
    return <div className="py-8 text-center text-sm text-muted-foreground">Carregando…</div>;
  }
  if (!gestora) {
    return <div className="py-8 text-center text-sm text-muted-foreground">Nenhuma Gestora cadastrada.</div>;
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{gestora.nome}</h2>
          <p className="text-[13px] text-muted-foreground">
            Documentos da Gestora — não associados a nenhum fundo específico.
          </p>
        </div>
        <Button size="sm" onClick={() => setDocState({ doc: null, isNew: true })}>
          <Plus className="mr-1 h-4 w-4" /> Novo documento
        </Button>
      </div>

      <DocumentTable
        docs={documentos}
        contextName={gestora.nome}
        orderBy={orderBy}
        orderDir={orderDir}
        onSortChange={(o, d) => { setOrderBy(o); setOrderDir(d); }}
        onView={setViewDoc}
        onEdit={(d) => setDocState({ doc: d, isNew: false })}
        onDelete={setDeleteTarget}
        onCreatePrazo={goToNovaObrigacao}
        onVerPrazo={goToPrazo}
        emptyMessage='Nenhum documento da Gestora ainda. Clique em "Novo documento" para começar.'
      />

      <DocumentDialog
        contextName={gestora.nome}
        doc={docState?.doc ?? null}
        isNew={docState?.isNew ?? false}
        open={docState != null}
        onOpenChange={(o) => !o && setDocState(null)}
        onSave={handleSaveDocument}
        saving={saving}
        onCriarPrazo={(prefill) => {
          setDocState(null);
          goToNovaObrigacao(prefill);
        }}
        onVerPrazo={(obrigacaoId) => {
          setDocState(null);
          goToPrazo(obrigacaoId);
        }}
        onDesvincularPrazo={(documentoId) => desvincularPrazoMut.mutate(documentoId)}
        desvinculando={desvincularPrazoMut.isPending}
      />

      <AlertDialog open={deleteTarget != null} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Excluir "{deleteTarget && docLabel(deleteTarget.tipo, deleteTarget.nome_personalizado)}"?
            </AlertDialogTitle>
            <AlertDialogDescription>
              O registro e o arquivo enviado serão removidos. Esta ação não pode ser desfeita pela interface.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMut.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMut.isPending}
              onClick={() => deleteTarget && deleteMut.mutate(deleteTarget.id)}
            >
              {deleteMut.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Trash2 className="mr-1 h-4 w-4" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <DocumentViewerSheet
        doc={viewDoc}
        open={viewDoc != null}
        onOpenChange={(o) => !o && setViewDoc(null)}
      />
    </div>
  );
}
