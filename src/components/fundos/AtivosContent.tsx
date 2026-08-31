import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  SquarePen,
  Trash2,
  Upload,
  UploadCloud,
  FileCheck2,
  FileText,
  CalendarClock,
  CalendarPlus,
  Calendar as CalendarIcon,
  FolderX,
  Loader2,
  Building2,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Tags,
  Unlink,
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
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
import { PdfViewerCanvas } from "@/components/PdfViewerCanvas";
import { XlsxViewerTable } from "@/components/XlsxViewerTable";
import { DOC_TYPES, DOC_STATUS, CADENCIA_LABELS, cadenciaSugerida, docLabel } from "@/data/ativosData";
import { documentoKeys, classificacaoKeys } from "@/lib/queryKeys";
import {
  listDocumentosByFundo,
  createAtivo,
  updateAtivo,
  deleteAtivo,
  createDocumento,
  updateDocumento,
  deleteDocumento,
  uploadDocumentoFile,
  getDownloadUrl,
  desvincularPrazo,
  type DocTipo,
  type Cadencia,
  type DocumentoResponse,
  type AtivoComDocumentosResponse,
  type AtivoCreateRequest,
  type AtivoUpdateRequest,
} from "@/lib/api/documentoService";
import { listClassificacoes } from "@/lib/api/classificacaoService";
import { ClassificacaoDialog } from "@/components/classificacoes/ClassificacaoDialog";
import { ClassificacoesSheet } from "@/components/classificacoes/ClassificacoesSheet";

export interface AtivosContentProps {
  fundoId: number | null;
  fundName?: string;
}

// ── Date helpers (API: "YYYY-MM-DD" ↔ UI: "dd/mm/aaaa") ────────────────────────

function isoToBr(iso?: string | null): string | null {
  if (!iso) return null;
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return null;
  return `${d}/${m}/${y}`;
}

function formatBytes(bytes?: number | null): string {
  if (bytes == null) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// "Criar prazo" no longer opens an in-place dialog — it navigates to the
// Prazos tab's real "Nova Obrigação" form (richer: categoria, tipo_prazo,
// recorrência, real Clerk responsáveis), prefilled from the document, and
// links the resulting obrigação back to the document once saved (see
// PrazosContent's `novaObrigacao` deep-link + `handleCreated`).
interface PrazoPrefill {
  documentoId: string;
  topico: string;
  resp: string;
}

// ── Document (upload / edit fields) dialog ────────────────────────────────────
function DocumentDialog({
  asset,
  doc,
  isNew,
  open,
  onOpenChange,
  onSave,
  saving,
  onCriarPrazo,
  onVerPrazo,
  onDesvincularPrazo,
  desvinculando,
}: {
  asset: AtivoComDocumentosResponse;
  doc: DocumentoResponse | null;
  isNew: boolean;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSave: (values: {
    tipo: DocTipo;
    nomePersonalizado: string;
    cadencia: Cadencia;
    periodo: string;
    file: File | null;
  }) => void;
  saving: boolean;
  onCriarPrazo: (prefill: PrazoPrefill) => void;
  onVerPrazo: (obrigacaoId: string) => void;
  onDesvincularPrazo: (documentoId: string) => void;
  desvinculando: boolean;
}) {
  const [tipo, setTipo] = useState<DocTipo>(doc?.tipo ?? "balancete");
  const [nomePersonalizado, setNomePersonalizado] = useState(doc?.nome_personalizado ?? "");
  const [cadencia, setCadencia] = useState<Cadencia>(
    doc?.cadencia ?? cadenciaSugerida("balancete")
  );
  const [periodo, setPeriodo] = useState(doc?.periodo_referencia ?? "");
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Re-seed local state whenever a different document opens the dialog.
  useEffect(() => {
    if (open) {
      const initialTipo = doc?.tipo ?? "balancete";
      setTipo(initialTipo);
      setNomePersonalizado(doc?.nome_personalizado ?? "");
      setCadencia(doc?.cadencia ?? cadenciaSugerida(initialTipo));
      setPeriodo(doc?.periodo_referencia ?? "");
      setFile(null);
    }
  }, [open, doc, isNew]);

  const meta = DOC_TYPES[tipo];
  const label = docLabel(tipo, tipo === "outro" ? nomePersonalizado : undefined);
  const isOutroSemNome = tipo === "outro" && !nomePersonalizado.trim();

  function handleTipoChange(v: string) {
    const next = v as DocTipo;
    setTipo(next);
    // Re-suggest the cadência for the new type — the user can still override it.
    setCadencia(cadenciaSugerida(next));
  }

  async function handleDownload() {
    if (!doc) return;
    try {
      const { download_url } = await getDownloadUrl(doc.id);
      window.open(download_url, "_blank", "noopener,noreferrer");
    } catch (e) {
      toast({ title: "Erro ao baixar", description: (e as Error).message, variant: "destructive" });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isNew ? "Novo documento" : `${label} · ${asset.nome.split(" · ")[0]}`}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {doc?.arquivo_nome && (
            <div className="flex items-center gap-3 rounded-lg border border-border bg-card/50 px-3.5 py-2.5">
              <FileCheck2 className="h-5 w-5 shrink-0 text-success" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-medium">{doc.arquivo_nome}</div>
                <div className="text-[11px] text-muted-foreground">
                  {formatBytes(doc.arquivo_tamanho)} · vigente desde {isoToBr(doc.vigente_desde)}
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Baixar" onClick={handleDownload}>
                <Upload className="h-4 w-4 rotate-180" />
              </Button>
            </div>
          )}

          <div
            className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border py-7 text-center"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const dropped = e.dataTransfer.files?.[0];
              if (dropped) setFile(dropped);
            }}
          >
            <UploadCloud className="h-6 w-6 text-muted-foreground" />
            <p className="text-[13px] font-medium">
              {file ? file.name : doc?.arquivo_nome ? "Enviar nova versão" : "Enviar arquivo"}
            </p>
            <span className="text-[11px] text-muted-foreground">Arraste ou clique para selecionar · PDF, XLSX, DOCX</span>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.xlsx,.xls,.docx,.doc"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Tipo de documento</Label>
            {isNew ? (
              <Select value={tipo} onValueChange={handleTipoChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(DOC_TYPES) as DocTipo[]).map((k) => (
                    <SelectItem key={k} value={k}>{DOC_TYPES[k].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input value={meta.label} disabled />
            )}
          </div>

          {tipo === "outro" && (
            <div className="space-y-1.5">
              <Label>Nome do documento</Label>
              <Input
                placeholder="ex.: Apólice de Seguro Fiança"
                value={nomePersonalizado}
                onChange={(e) => setNomePersonalizado(e.target.value)}
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Cadência</Label>
            <Select
              value={cadencia}
              onValueChange={(v) => setCadencia(v as Cadencia)}
              disabled={!!doc?.prazo}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(CADENCIA_LABELS) as Cadencia[]).map((c) => (
                  <SelectItem key={c} value={c}>{CADENCIA_LABELS[c]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {doc?.prazo && (
              <p className="text-[11px] text-muted-foreground">
                Definida pela Frequência do prazo vinculado — desvincule para editar aqui.
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Período de referência</Label>
            <Input placeholder="ex.: 2º tri/2026" value={periodo} onChange={(e) => setPeriodo(e.target.value)} />
          </div>

          {!isNew && doc && (
            <div className="space-y-1.5">
              <Label>Vincular a um prazo</Label>
              {doc.prazo ? (
                <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                  <span className="flex items-center gap-1.5 text-[13px]">
                    <CalendarClock className="h-4 w-4 text-muted-foreground" />
                    {doc.prazo.topico} · vence {isoToBr(doc.prazo.data_vencimento)}
                  </span>
                  <div className="flex items-center gap-2">
                    {doc.prazo.responsavel_nome && (
                      <span className="text-[11px] text-muted-foreground">{doc.prazo.responsavel_nome}</span>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      aria-label="Ver prazo na aba Prazos"
                      title="Ver prazo na aba Prazos"
                      onClick={() => onVerPrazo(doc.prazo!.obrigacao_id)}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      aria-label="Desvincular prazo"
                      title="Desvincular prazo (a obrigação continua na aba Prazos)"
                      disabled={desvinculando}
                      onClick={() => onDesvincularPrazo(doc.id)}
                    >
                      {desvinculando ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Unlink className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-fit"
                  onClick={() =>
                    onCriarPrazo({
                      documentoId: doc.id,
                      topico: `${label} — ${asset.nome.split(" · ")[0]}`,
                      resp: meta.resp,
                    })
                  }
                >
                  <CalendarPlus className="mr-1 h-4 w-4" /> Criar prazo
                </Button>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button
            size="sm"
            disabled={saving || isOutroSemNome}
            onClick={() => onSave({ tipo, nomePersonalizado: nomePersonalizado.trim(), cadencia, periodo, file })}
          >
            {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Upload className="mr-1 h-4 w-4" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Prazo cell ────────────────────────────────────────────────────────────────
function DocPrazoCell({
  doc,
  onCreatePrazo,
  onVerPrazo,
}: {
  doc: DocumentoResponse;
  onCreatePrazo: () => void;
  onVerPrazo: (obrigacaoId: string) => void;
}) {
  if (doc.prazo) {
    return (
      <button
        onClick={() => onVerPrazo(doc.prazo!.obrigacao_id)}
        title="Ver prazo na aba Prazos"
        className="inline-flex items-center gap-1.5 whitespace-nowrap font-mono text-[12px] tabular-nums text-success transition-colors hover:text-success/80"
      >
        <CalendarClock className="h-3.5 w-3.5" /> {isoToBr(doc.prazo.data_vencimento)}
      </button>
    );
  }
  if (doc.status === "pendente") {
    return (
      <button
        onClick={onCreatePrazo}
        className="inline-flex items-center gap-1.5 whitespace-nowrap text-[12px] font-medium text-primary transition-colors hover:text-primary/80"
      >
        <CalendarPlus className="h-3.5 w-3.5" /> Criar prazo
      </button>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[12px] text-muted-foreground">
      <CalendarIcon className="h-3.5 w-3.5" /> Sem prazo vinculado
    </span>
  );
}

// ── Asset card ────────────────────────────────────────────────────────────────
function AssetCard({
  asset,
  fundoId,
  isFundoSingleton,
  onOpenClassificacoes,
}: {
  asset: AtivoComDocumentosResponse;
  fundoId: number;
  /** The "Documentos do Fundo" card — auto-created singleton, not user-deletable. */
  isFundoSingleton?: boolean;
  onOpenClassificacoes: () => void;
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

  function invalidate() {
    return queryClient.invalidateQueries({ queryKey: documentoKeys.byFundo(fundoId) });
  }

  const updateAtivoMut = useMutation({
    mutationFn: (data: AtivoUpdateRequest) => updateAtivo(asset.ativo_id, data),
    onSuccess: async () => {
      await invalidate();
      toast({ title: "Ativo atualizado" });
      setEditAtivoOpen(false);
    },
    onError: (e: Error) => toast({ title: "Erro ao atualizar ativo", description: e.message, variant: "destructive" }),
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
    file: File | null;
  }) {
    setSaving(true);
    try {
      let docId = docState?.doc?.id;
      if (docState?.isNew) {
        const created = await createDocumento({
          ativo_id: asset.ativo_id,
          fundo_id: fundoId,
          tipo: values.tipo,
          nome_personalizado: values.tipo === "outro" ? values.nomePersonalizado : undefined,
          cadencia: values.cadencia,
          periodo_referencia: values.periodo || undefined,
        });
        docId = created.id;
      } else if (docId) {
        await updateDocumento(docId, {
          nome_personalizado: values.tipo === "outro" ? values.nomePersonalizado : undefined,
          cadencia: values.cadencia,
          periodo_referencia: values.periodo || undefined,
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
            <span className="mt-0.5 inline-flex items-center rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
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

      {docs.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <FolderX className="h-7 w-7 text-muted-foreground/60" />
          <p className="max-w-sm text-[13px] text-muted-foreground">
            Nenhum documento configurado para este ativo ainda. Clique em "Novo documento" para começar.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                <th className="pb-2 pr-3 text-left font-medium">Documento</th>
                <th className="pb-2 px-3 text-left font-medium">Cadência</th>
                <th className="pb-2 px-3 text-left font-medium">Referência</th>
                <th className="pb-2 px-3 text-left font-medium">Última atualização</th>
                <th className="pb-2 px-3 text-left font-medium">Status</th>
                <th className="pb-2 px-3 text-left font-medium">Prazo</th>
                <th className="pb-2 pl-3 text-right font-medium">
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {docs.map((d) => {
                const meta = DOC_TYPES[d.tipo];
                const st = DOC_STATUS[d.status];
                const DocIcon = meta.icon;
                const StatusIcon = st.icon;
                const label = docLabel(d.tipo, d.nome_personalizado);
                return (
                  <tr
                    key={d.id}
                    className="border-b border-border/50 transition-colors last:border-b-0 hover:bg-card/40"
                  >
                    <td className="py-2.5 pr-3">
                      <div className="flex items-center gap-2 text-[13px] text-foreground">
                        <DocIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                        {label}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        {CADENCIA_LABELS[d.cadencia]}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">{d.periodo_referencia || "—"}</td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">
                      {d.vigente_desde ? (
                        `vigente desde ${isoToBr(d.vigente_desde)}`
                      ) : (
                        <span className="italic text-muted-foreground/70">nenhum arquivo enviado</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-[3px] text-[10px] font-medium", st.chip)}>
                        <StatusIcon className="h-3 w-3" /> {st.label}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <DocPrazoCell
                        doc={d}
                        onCreatePrazo={() =>
                          goToNovaObrigacao({
                            documentoId: d.id,
                            topico: `${label} — ${asset.nome.split(" · ")[0]}`,
                            resp: meta.resp,
                          })
                        }
                        onVerPrazo={goToPrazo}
                      />
                    </td>
                    <td className="py-2.5 pl-3">
                      <div className="flex items-center justify-end gap-0.5">
                        <button
                          aria-label="Ver documento"
                          onClick={() => setViewDoc(d)}
                          disabled={!d.arquivo_nome}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          aria-label="Editar campos"
                          onClick={() => setDocState({ doc: d, isNew: false })}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                        >
                          <SquarePen className="h-4 w-4" />
                        </button>
                        <button
                          aria-label="Enviar novo"
                          onClick={() => setDocState({ doc: d, isNew: false })}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-primary transition-colors hover:bg-primary/10"
                        >
                          <Upload className="h-4 w-4" />
                        </button>
                        <button
                          aria-label="Excluir"
                          onClick={() => setDeleteTarget(d)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <DocumentDialog
        asset={asset}
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

// ── Ver documento (side panel) ───────────────────────────────────────────────
// Mirrors the chatbot's "Fontes" viewer (src/pages/Agent.tsx): a right-side
// Sheet rendering the PDF via the same pdf.js canvas component. Unlike the
// chatbot (one static, well-known CVM PDF), each Documento here is an
// arbitrary uploaded file — so non-PDF files fall back to a direct download
// instead of an in-panel preview.
type FileKind = "pdf" | "xlsx" | "other";

function fileKindOf(filename?: string | null): FileKind {
  const lower = (filename || "").toLowerCase();
  if (lower.endsWith(".pdf")) return "pdf";
  if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) return "xlsx";
  return "other";
}

function DocumentViewerSheet({
  doc,
  open,
  onOpenChange,
}: {
  doc: DocumentoResponse | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [fileData, setFileData] = useState<ArrayBuffer | null>(null);
  const [rawUrl, setRawUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileKind = fileKindOf(doc?.arquivo_nome);
  const isPdf = fileKind === "pdf";
  const isXlsx = fileKind === "xlsx";

  useEffect(() => {
    if (!open || !doc) {
      setFileData(null);
      setRawUrl(null);
      setError(null);
      setCurrentPage(1);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setFileData(null);
    setCurrentPage(1);
    setTotalPages(1);

    getDownloadUrl(doc.id)
      .then(async ({ download_url }) => {
        if (cancelled) return;
        setRawUrl(download_url);
        if (fileKindOf(doc.arquivo_nome) === "other") {
          setLoading(false);
          return;
        }
        const res = await fetch(download_url);
        if (!res.ok) throw new Error(`Erro ${res.status} ao baixar o arquivo`);
        const buf = await res.arrayBuffer();
        if (cancelled) return;
        setFileData(buf);
        setLoading(false);
      })
      .catch((e) => {
        if (!cancelled) {
          setError((e as Error).message || "Não foi possível carregar o documento");
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open, doc]);

  const title = doc
    ? `${docLabel(doc.tipo, doc.nome_personalizado)}${doc.periodo_referencia ? ` · ${doc.periodo_referencia}` : ""}`
    : "";

  return (
    <Sheet open={open} onOpenChange={onOpenChange} modal={false}>
      <SheetContent
        side="right"
        className="!w-[35%] !max-w-none p-0 flex flex-col [&>button]:hidden border-l !z-40"
        hideOverlay
      >
        <SheetHeader className="px-6 py-4 border-b flex-shrink-0 flex-row items-center justify-between">
          <SheetTitle className="truncate">{title}</SheetTitle>
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="h-6 w-6">
            <X className="h-4 w-4" />
          </Button>
        </SheetHeader>

        <div className="flex-1 overflow-hidden bg-slate-100 p-4 flex items-center justify-center">
          {loading && (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="text-sm">Carregando documento...</span>
            </div>
          )}
          {!loading && error && (
            <div className="flex flex-col items-center gap-2 text-destructive p-4 text-center">
              <span className="text-sm font-medium">Não foi possível carregar o documento</span>
              <span className="text-xs">{error}</span>
            </div>
          )}
          {!loading && !error && isPdf && (
            <div className="w-full h-full bg-white shadow-xl rounded-lg overflow-hidden flex items-center justify-center">
              <PdfViewerCanvas
                pdfData={fileData}
                currentPage={currentPage}
                onTotalPages={setTotalPages}
                className="w-full h-full min-h-[400px]"
              />
            </div>
          )}
          {!loading && !error && isXlsx && (
            <div className="w-full h-full bg-white shadow-xl rounded-lg overflow-hidden flex items-center justify-center">
              <XlsxViewerTable
                fileData={fileData}
                currentSheet={currentPage}
                onSheetNames={(names) => setTotalPages(names.length)}
                className="w-full h-full min-h-[400px]"
              />
            </div>
          )}
          {!loading && !error && !isPdf && !isXlsx && (
            <div className="flex flex-col items-center gap-3 text-center text-muted-foreground">
              <FileText className="h-8 w-8" />
              <p className="max-w-xs text-sm">
                Pré-visualização não disponível para {doc?.arquivo_nome || "este arquivo"}.
              </p>
              {rawUrl && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(rawUrl, "_blank", "noopener,noreferrer")}
                >
                  <Upload className="mr-1 h-4 w-4 rotate-180" /> Baixar arquivo
                </Button>
              )}
            </div>
          )}
        </div>

        {(isPdf || isXlsx) && !loading && !error && (
          <SheetFooter className="px-6 py-4 border-t flex items-center justify-between flex-shrink-0">
            <span className="text-sm text-muted-foreground">
              {isPdf ? "Página" : "Aba"} {currentPage} de {totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
              </Button>
              <Button
                variant="outline"
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Próxima <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
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
}: {
  asset: AtivoComDocumentosResponse;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSave: (data: AtivoUpdateRequest) => void;
  saving: boolean;
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
    onSave({ nome: nome.trim(), sub: sub.trim() || undefined, classificacao_id: classificacaoId });
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
          <div className="space-y-1.5">
            <Label>Classificação</Label>
            <ClassificacaoSelect value={classificacaoId} onChange={setClassificacaoId} />
          </div>
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

  const query = useQuery({
    queryKey: fundoId != null ? documentoKeys.byFundo(fundoId) : documentoKeys.all,
    queryFn: () => listDocumentosByFundo(fundoId as number),
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

  return (
    <div>
      {/* ── Documentos por Ativos ── */}
      <div className="mb-4 flex items-baseline justify-between">
        <h3 className="text-base font-semibold">Documentos por Ativos</h3>
        <Button size="sm" variant="outline" onClick={() => setNovoAtivoOpen(true)}>
          <Plus className="mr-1 h-4 w-4" /> Novo ativo
        </Button>
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
