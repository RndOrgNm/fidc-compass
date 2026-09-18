import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  SquarePen,
  Trash2,
  Loader2,
  Building2,
  Tags,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { docLabel } from "@/data/ativosData";
import { documentoKeys, classificacaoKeys } from "@/lib/queryKeys";
import { DocumentTable } from "@/components/fundos/DocumentTable";
import { DocumentDialog, type PrazoPrefill } from "@/components/fundos/DocumentDialog";
import { DocumentViewerSheet } from "@/components/fundos/DocumentViewerSheet";
import {
  listDocumentosByFundo,
  createAtivo,
  updateAtivo,
  deleteAtivo,
  createDocumento,
  updateDocumento,
  deleteDocumento,
  uploadDocumentoFile,
  desvincularPrazo,
  updateFundDocumentosMeta,
  type DocTipo,
  type Cadencia,
  type DocumentoResponse,
  type AtivoComDocumentosResponse,
  type AtivoCreateRequest,
  type AtivoUpdateRequest,
  type DocumentoOrderBy,
  type OrderDir,
} from "@/lib/api/documentoService";
import { listClassificacoes } from "@/lib/api/classificacaoService";
import { ClassificacaoDialog } from "@/components/classificacoes/ClassificacaoDialog";
import { ClassificacoesSheet } from "@/components/classificacoes/ClassificacoesSheet";

export interface AtivosContentProps {
  fundoId: number | null;
  fundName?: string;
}

// ── Asset card ────────────────────────────────────────────────────────────────
function AssetCard({
  asset,
  fundoId,
  isFundoSingleton,
  onOpenClassificacoes,
  orderBy,
  orderDir,
  onSortChange,
}: {
  asset: AtivoComDocumentosResponse;
  fundoId: number;
  /** The "Documentos do Fundo" card — auto-created singleton, not user-deletable. */
  isFundoSingleton?: boolean;
  onOpenClassificacoes: () => void;
  /** Ordenação é global (um único fetch por fundo) — não por card. */
  orderBy: DocumentoOrderBy | undefined;
  orderDir: OrderDir;
  onSortChange: (orderBy: DocumentoOrderBy | undefined, orderDir: OrderDir) => void;
}) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [docState, setDocState] = useState<{ doc: DocumentoResponse | null; isNew: boolean } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DocumentoResponse | null>(null);
  const [editAtivoOpen, setEditAtivoOpen] = useState(false);
  const [viewDoc, setViewDoc] = useState<DocumentoResponse | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteAtivoConfirm, setDeleteAtivoConfirm] = useState(false);
  const docs = asset.documentos;
  const contextName = asset.nome.split(" · ")[0];

  function invalidate() {
    return queryClient.invalidateQueries({ queryKey: documentoKeys.byFundo(fundoId) });
  }

  const updateAtivoMut = useMutation({
    mutationFn: (data: AtivoUpdateRequest) =>
      isFundoSingleton
        ? updateFundDocumentosMeta(fundoId, { documentos_nome: data.nome, documentos_sub: data.sub })
        : updateAtivo(asset.ativo_id, data),
    onSuccess: async () => {
      await invalidate();
      toast({ title: isFundoSingleton ? "Card atualizado" : "Ativo atualizado" });
      setEditAtivoOpen(false);
    },
    onError: (e: Error) => toast({ title: "Erro ao atualizar", description: e.message, variant: "destructive" }),
  });

  const deleteAtivoMut = useMutation({
    mutationFn: () => deleteAtivo(asset.ativo_id),
    onSuccess: async () => {
      await invalidate();
      toast({ title: "Ativo excluído" });
      setDeleteAtivoConfirm(false);
    },
    onError: (e: Error) => toast({ title: "Erro ao excluir ativo", description: e.message, variant: "destructive" }),
  });

  const desvincularPrazoMut = useMutation({
    mutationFn: (documentoId: string) => desvincularPrazo(documentoId),
    onSuccess: async (updated) => {
      await invalidate();
      // Mantém o diálogo aberto no documento já atualizado (agora sem prazo).
      setDocState((s) => (s ? { ...s, doc: updated } : s));
      toast({ title: "Prazo desvinculado", description: "A obrigação continua na aba Prazos." });
    },
    onError: (e: Error) =>
      toast({ title: "Erro ao desvincular prazo", description: e.message, variant: "destructive" }),
  });

  async function handleSaveDocument(values: {
    tipo: DocTipo;
    nomePersonalizado: string;
    cadencia: Cadencia;
    periodo: string;
    observacao: string;
    file: File | null;
  }) {
    setSaving(true);
    try {
      let docId = docState?.doc?.id;
      if (docState?.isNew) {
        const created = await createDocumento({
          // O card "Documentos do Fundo" não tem Ativo por trás (T11/D9) —
          // `asset.ativo_id` ali é só uma chave sintética, não um id real.
          ativo_id: isFundoSingleton ? undefined : asset.ativo_id,
          fundo_id: fundoId,
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
      toast({ title: "Documento salvo", description: "Documento enviado e versão atualizada." });
      setDocState(null);
    } catch (e) {
      toast({ title: "Erro ao salvar documento", description: (e as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteDocumento(id),
    onSuccess: async () => {
      await invalidate();
      toast({ title: "Documento excluído" });
      setDeleteTarget(null);
    },
    onError: (e: Error) => toast({ title: "Erro ao excluir", description: e.message, variant: "destructive" }),
  });

  // Deep-links to Prazos → Nova Obrigação, prefilled from the document. The
  // dialog there links the created obrigação back to this document once saved
  // (PrazosContent's `novaObrigacao` deep-link + `handleCreated`).
  function goToNovaObrigacao(prefill: PrazoPrefill) {
    navigate(`/fundos/prazos/${fundoId}`, {
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
    navigate(`/fundos/prazos/${fundoId}`, {
      state: { verObrigacao: { obrigacaoId } },
    });
  }

  return (
    <div
      className="mb-4 rounded-lg border border-l-[3px] border-border bg-card/50 px-5 py-4"
      style={{ borderLeftColor: asset.cor ?? undefined }}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <div>
            <div className="text-sm font-semibold text-foreground">{asset.nome}</div>
            {asset.sub && <div className="mt-0.5 text-[11px] text-muted-foreground">{asset.sub}</div>}
          </div>
          {asset.classificacao_nome && (
            <span
              className="mt-0.5 inline-flex items-center rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
              style={
                asset.cor
                  ? {
                      borderColor: asset.cor,
                      color: asset.cor,
                      backgroundColor: `color-mix(in srgb, ${asset.cor} 12%, transparent)`,
                    }
                  : undefined
              }
            >
              {asset.classificacao_nome}
            </span>
          )}
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            aria-label="Editar ativo"
            onClick={() => setEditAtivoOpen(true)}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <SquarePen className="h-4 w-4" />
          </button>
          {!isFundoSingleton && (
            <button
              aria-label="Classificações"
              title="Classificações"
              onClick={onOpenClassificacoes}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <Tags className="h-4 w-4" />
            </button>
          )}
          {!isFundoSingleton && (
            <button
              aria-label="Excluir ativo"
              onClick={() => setDeleteAtivoConfirm(true)}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="mb-3">
        <Button size="sm" onClick={() => setDocState({ doc: null, isNew: true })}>
          <Plus className="mr-1 h-4 w-4" /> Novo documento
        </Button>
      </div>

      <DocumentTable
        docs={docs}
        contextName={contextName}
        orderBy={orderBy}
        orderDir={orderDir}
        onSortChange={onSortChange}
        onView={setViewDoc}
        onEdit={(d) => setDocState({ doc: d, isNew: false })}
        onDelete={setDeleteTarget}
        onCreatePrazo={goToNovaObrigacao}
        onVerPrazo={goToPrazo}
        emptyMessage='Nenhum documento configurado para este ativo ainda. Clique em "Novo documento" para começar.'
      />

      <DocumentDialog
        contextName={contextName}
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
            <AlertDialogTitle>Excluir "{deleteTarget && docLabel(deleteTarget.tipo, deleteTarget.nome_personalizado)}"?</AlertDialogTitle>
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

      <EditAtivoDialog
        asset={asset}
        open={editAtivoOpen}
        onOpenChange={setEditAtivoOpen}
        onSave={(data) => updateAtivoMut.mutate(data)}
        saving={updateAtivoMut.isPending}
        showClassificacao={!isFundoSingleton}
      />

      <AlertDialog open={deleteAtivoConfirm} onOpenChange={setDeleteAtivoConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir "{asset.nome}"?</AlertDialogTitle>
            <AlertDialogDescription>
              O ativo será removido da lista, mas seus documentos e histórico são preservados.
              Esta ação não pode ser desfeita pela interface.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteAtivoMut.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteAtivoMut.isPending}
              onClick={() => deleteAtivoMut.mutate()}
            >
              {deleteAtivoMut.isPending ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-1 h-4 w-4" />
              )}
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

// ── Editar ativo dialog ───────────────────────────────────────────────────────
// ── Classificação picker (Ativo dialogs) ────────────────────────────────────
const CLASSIFICACAO_NONE = "__none__";
const CLASSIFICACAO_CREATE = "__create__";

/**
 * Select for an Ativo's Classificação, shared by NovoAtivoDialog/EditAtivoDialog.
 * Includes an inline "+ Nova classificação" option that opens ClassificacaoDialog
 * without leaving the Ativo form — on create, the new item is selected immediately.
 */
function ClassificacaoSelect({
  value,
  onChange,
}: {
  value: string | undefined;
  onChange: (classificacaoId: string | undefined) => void;
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const { data } = useQuery({
    queryKey: classificacaoKeys.list(),
    queryFn: () => listClassificacoes(),
  });
  const items = data?.items ?? [];

  function handleChange(v: string) {
    if (v === CLASSIFICACAO_CREATE) {
      setCreateOpen(true);
      return;
    }
    onChange(v === CLASSIFICACAO_NONE ? undefined : v);
  }

  return (
    <>
      <Select value={value ?? CLASSIFICACAO_NONE} onValueChange={handleChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={CLASSIFICACAO_NONE}>Sem classificação</SelectItem>
          {items.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.nome}
            </SelectItem>
          ))}
          <SelectItem value={CLASSIFICACAO_CREATE}>+ Nova classificação</SelectItem>
        </SelectContent>
      </Select>
      <ClassificacaoDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(created) => onChange(created.id)}
      />
    </>
  );
}

function EditAtivoDialog({
  asset,
  open,
  onOpenChange,
  onSave,
  saving,
  showClassificacao = true,
}: {
  asset: AtivoComDocumentosResponse;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSave: (data: AtivoUpdateRequest) => void;
  saving: boolean;
  /** false for the "Documentos do Fundo" card — Fund não tem classificação. */
  showClassificacao?: boolean;
}) {
  const [nome, setNome] = useState(asset.nome);
  const [sub, setSub] = useState(asset.sub ?? "");
  const [classificacaoId, setClassificacaoId] = useState<string | undefined>(
    asset.classificacao_id ?? undefined
  );

  useEffect(() => {
    if (open) {
      setNome(asset.nome);
      setSub(asset.sub ?? "");
      setClassificacaoId(asset.classificacao_id ?? undefined);
    }
  }, [open, asset]);

  function handleSave() {
    if (!nome.trim()) return;
    onSave({
      nome: nome.trim(),
      sub: sub.trim() || undefined,
      ...(showClassificacao ? { classificacao_id: classificacaoId } : {}),
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar ativo</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label>Nome</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Subtítulo</Label>
            <Input
              placeholder="ex.: SPE 171 · incorporação em 22/04/2026"
              value={sub}
              onChange={(e) => setSub(e.target.value)}
            />
          </div>
          {showClassificacao && (
            <div className="space-y-1.5">
              <Label>Classificação</Label>
              <ClassificacaoSelect value={classificacaoId} onChange={setClassificacaoId} />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button size="sm" disabled={saving || !nome.trim()} onClick={handleSave}>
            {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <SquarePen className="mr-1 h-4 w-4" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Novo ativo dialog ─────────────────────────────────────────────────────────
const COR_PRESETS = [
  { label: "Verde", value: "hsl(var(--success))" },
  { label: "Âmbar", value: "#E0A23C" },
  { label: "Vermelho", value: "hsl(var(--destructive))" },
  { label: "Azul", value: "#3B82F6" },
  { label: "Roxo", value: "#8B5CF6" },
  { label: "Neutro", value: "hsl(var(--muted-foreground))" },
] as const;

function NovoAtivoDialog({
  fundoId,
  open,
  onOpenChange,
  onSave,
  saving,
}: {
  fundoId: number | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSave: (data: AtivoCreateRequest) => void;
  saving: boolean;
}) {
  const [nome, setNome] = useState("");
  const [sub, setSub] = useState("");
  const [cor, setCor] = useState<string>(COR_PRESETS[COR_PRESETS.length - 1].value);
  const [classificacaoId, setClassificacaoId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (open) {
      setNome("");
      setSub("");
      setCor(COR_PRESETS[COR_PRESETS.length - 1].value);
      setClassificacaoId(undefined);
    }
  }, [open]);

  function handleSave() {
    if (fundoId == null || !nome.trim()) return;
    onSave({
      fundo_id: fundoId,
      nome: nome.trim(),
      sub: sub.trim() || undefined,
      cor,
      classificacao_id: classificacaoId,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo ativo</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label>Nome</Label>
            <Input placeholder="ex.: Wish Down Town" value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Subtítulo</Label>
            <Input
              placeholder="ex.: SPE 171 · incorporação em 22/04/2026"
              value={sub}
              onChange={(e) => setSub(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Classificação</Label>
            <ClassificacaoSelect value={classificacaoId} onChange={setClassificacaoId} />
          </div>
          <div className="space-y-1.5">
            <Label>Cor de destaque</Label>
            <div className="flex gap-2">
              {COR_PRESETS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  aria-label={p.label}
                  onClick={() => setCor(p.value)}
                  className={cn(
                    "h-7 w-7 rounded-full border-2 transition-transform",
                    cor === p.value ? "scale-110 border-foreground" : "border-transparent",
                  )}
                  style={{ background: p.value }}
                />
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button size="sm" disabled={saving || !nome.trim()} onClick={handleSave}>
            {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Plus className="mr-1 h-4 w-4" />}
            Criar ativo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Content ───────────────────────────────────────────────────────────────────
export function AtivosContent({ fundoId, fundName }: AtivosContentProps) {
  const queryClient = useQueryClient();
  const [novoAtivoOpen, setNovoAtivoOpen] = useState(false);
  const [classificacoesOpen, setClassificacoesOpen] = useState(false);
  const [orderBy, setOrderBy] = useState<DocumentoOrderBy | undefined>(undefined);
  const [orderDir, setOrderDir] = useState<OrderDir>("asc");

  const query = useQuery({
    queryKey: fundoId != null
      ? [...documentoKeys.byFundo(fundoId), orderBy, orderDir]
      : documentoKeys.all,
    queryFn: () => listDocumentosByFundo(fundoId as number, orderBy, orderDir),
    enabled: fundoId != null,
  });

  const createAtivoMut = useMutation({
    mutationFn: (data: AtivoCreateRequest) => createAtivo(data),
    onSuccess: async () => {
      if (fundoId != null) await queryClient.invalidateQueries({ queryKey: documentoKeys.byFundo(fundoId) });
      toast({ title: "Ativo criado", description: "O empreendimento foi adicionado." });
      setNovoAtivoOpen(false);
    },
    onError: (e: Error) => toast({ title: "Erro ao criar ativo", description: e.message, variant: "destructive" }),
  });

  if (fundoId == null) {
    return (
      <p className="py-16 text-center text-sm text-muted-foreground">
        Selecione um fundo para ver seus ativos.
      </p>
    );
  }

  if (query.isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando ativos…
      </div>
    );
  }

  if (query.isError) {
    return (
      <p className="py-16 text-center text-sm text-destructive">
        Erro ao carregar ativos: {(query.error as Error).message}
      </p>
    );
  }

  const assets = query.data?.assets ?? [];
  const fundo = query.data?.fundo;

  function handleSortChange(nextOrderBy: DocumentoOrderBy | undefined, nextOrderDir: OrderDir) {
    setOrderBy(nextOrderBy);
    setOrderDir(nextOrderDir);
  }

  return (
    <div>
      {/* ── Documentos por Ativos ── */}
      <div className="mb-4 flex items-baseline justify-between">
        <h3 className="text-base font-semibold">Documentos por Ativos</h3>
        {assets.length > 0 && (
          <Button size="sm" variant="outline" onClick={() => setNovoAtivoOpen(true)}>
            <Plus className="mr-1 h-4 w-4" /> Novo ativo
          </Button>
        )}
      </div>

      {assets.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <Building2 className="h-7 w-7 text-muted-foreground/60" />
          <p className="max-w-sm text-sm text-muted-foreground">
            Sem ativos cadastrados para este fundo{fundName ? ` (${fundName})` : ""}.
          </p>
          <Button size="sm" onClick={() => setNovoAtivoOpen(true)}>
            <Plus className="mr-1 h-4 w-4" /> Novo ativo
          </Button>
        </div>
      ) : (
        assets.map((asset) => (
          <AssetCard
            key={asset.ativo_id}
            asset={asset}
            fundoId={fundoId}
            onOpenClassificacoes={() => setClassificacoesOpen(true)}
            orderBy={orderBy}
            orderDir={orderDir}
            onSortChange={handleSortChange}
          />
        ))
      )}

      {/* ── Documentos por Fundo ── */}
      <div className="mb-4 mt-9">
        <h3 className="text-base font-semibold">Documentos por Fundo</h3>
      </div>
      {fundo && (
        <AssetCard
          asset={fundo}
          fundoId={fundoId}
          isFundoSingleton
          onOpenClassificacoes={() => setClassificacoesOpen(true)}
          orderBy={orderBy}
          orderDir={orderDir}
          onSortChange={handleSortChange}
        />
      )}

      <NovoAtivoDialog
        fundoId={fundoId}
        open={novoAtivoOpen}
        onOpenChange={setNovoAtivoOpen}
        onSave={(data) => createAtivoMut.mutate(data)}
        saving={createAtivoMut.isPending}
      />
      <ClassificacoesSheet open={classificacoesOpen} onOpenChange={setClassificacoesOpen} />
    </div>
  );
}
