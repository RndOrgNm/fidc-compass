import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus, Trash2, Upload, UploadCloud, FileCheck2, Loader2, FolderX,
} from "lucide-react";

import { toast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { DOC_TYPES, docLabel } from "@/data/ativosData";
import { usePagedList } from "@/hooks/usePagedList";
import { DocumentPager } from "@/components/fundos/DocumentPager";
import { DocumentSortControl } from "@/components/fundos/DocumentSortControl";
import {
  listGestoras,
  listDocumentosByGestora,
} from "@/lib/api/gestoraService";
import {
  createDocumento,
  updateDocumento,
  deleteDocumento,
  uploadDocumentoFile,
  getDownloadUrl,
  type DocTipo,
  type DocumentoResponse,
  type DocumentoOrderBy,
  type OrderDir,
} from "@/lib/api/documentoService";

const DOCS_PAGE_SIZE = 5;

function formatBytes(n?: number | null): string {
  if (!n) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function GestoraDocumentsContent() {
  const queryClient = useQueryClient();
  const [orderBy, setOrderBy] = useState<DocumentoOrderBy | undefined>(undefined);
  const [orderDir, setOrderDir] = useState<OrderDir>("asc");

  const gestorasQuery = useQuery({ queryKey: ["gestoras"], queryFn: listGestoras });
  const gestora = gestorasQuery.data?.items[0];

  const documentosQuery = useQuery({
    queryKey: ["gestora-documentos", gestora?.id, orderBy, orderDir],
    queryFn: () => listDocumentosByGestora(gestora!.id, orderBy, orderDir),
    enabled: !!gestora,
  });

  const [docState, setDocState] = useState<{ doc: DocumentoResponse | null; isNew: boolean } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DocumentoResponse | null>(null);
  const [saving, setSaving] = useState(false);

  async function invalidate() {
    await queryClient.invalidateQueries({ queryKey: ["gestora-documentos", gestora?.id] });
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

  async function handleSaveDocument(values: {
    tipo: DocTipo;
    nomePersonalizado: string;
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
          observacao: values.observacao.trim() || undefined,
        });
        docId = created.id;
      } else if (docId) {
        await updateDocumento(docId, {
          nome_personalizado: values.tipo === "outro" ? values.nomePersonalizado : undefined,
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

  const documentos = documentosQuery.data?.documentos ?? [];
  const { page, setPage, totalPages, pageItems: pagedDocumentos } = usePagedList(documentos, DOCS_PAGE_SIZE);

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
        <div className="flex items-center gap-2">
          <DocumentSortControl
            orderBy={orderBy}
            orderDir={orderDir}
            onChange={(nextOrderBy, nextOrderDir) => {
              setOrderBy(nextOrderBy);
              setOrderDir(nextOrderDir);
            }}
          />
          <Button size="sm" onClick={() => setDocState({ doc: null, isNew: true })}>
            <Plus className="mr-1 h-4 w-4" /> Novo documento
          </Button>
        </div>
      </div>

      {documentos.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border py-10 text-center">
          <FolderX className="h-7 w-7 text-muted-foreground/60" />
          <p className="max-w-sm text-[13px] text-muted-foreground">
            Nenhum documento da Gestora ainda. Clique em "Novo documento" para começar.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border bg-card/40 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                <th className="px-3 py-2 text-left font-medium">Documento</th>
                <th className="px-3 py-2 text-left font-medium">Arquivo</th>
                <th className="px-3 py-2 text-left font-medium">Criado em</th>
                <th className="px-3 py-2 text-right font-medium">
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {pagedDocumentos.map((d) => {
                const meta = DOC_TYPES[d.tipo];
                const DocIcon = meta.icon;
                const label = docLabel(d.tipo, d.nome_personalizado);
                return (
                  <tr
                    key={d.id}
                    className="cursor-pointer border-b border-border/50 transition-colors last:border-b-0 hover:bg-card/40"
                    onClick={() => setDocState({ doc: d, isNew: false })}
                  >
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2 text-[13px] text-foreground">
                        <TooltipProvider delayDuration={200}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <DocIcon
                                className="h-4 w-4 shrink-0 cursor-help text-muted-foreground"
                                onClick={(e) => e.stopPropagation()}
                              />
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="max-w-[280px]">
                              <p className="font-medium">{meta.label}</p>
                              <p className="text-muted-foreground">
                                {d.observacao?.trim() ? d.observacao : "Sem observação registrada."}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        {label}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">
                      {d.arquivo_nome ? `${d.arquivo_nome} · ${formatBytes(d.arquivo_tamanho)}` : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">
                      {new Date(d.criado_em).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        aria-label="Excluir"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget(d);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <DocumentPager page={page} totalPages={totalPages} onChange={setPage} />
        </div>
      )}

      {docState && (
        <GestoraDocumentDialog
          doc={docState.doc}
          isNew={docState.isNew}
          open={!!docState}
          onOpenChange={(o) => !o && setDocState(null)}
          onSave={handleSaveDocument}
          saving={saving}
        />
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Excluir "{deleteTarget && docLabel(deleteTarget.tipo, deleteTarget.nome_personalizado)}"?
            </AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteMut.mutate(deleteTarget.id)}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function GestoraDocumentDialog({
  doc,
  isNew,
  open,
  onOpenChange,
  onSave,
  saving,
}: {
  doc: DocumentoResponse | null;
  isNew: boolean;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSave: (values: { tipo: DocTipo; nomePersonalizado: string; observacao: string; file: File | null }) => void;
  saving: boolean;
}) {
  const [tipo, setTipo] = useState<DocTipo>(doc?.tipo ?? "outro");
  const [nomePersonalizado, setNomePersonalizado] = useState(doc?.nome_personalizado ?? "");
  const [observacao, setObservacao] = useState(doc?.observacao ?? "");
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTipo(doc?.tipo ?? "outro");
      setNomePersonalizado(doc?.nome_personalizado ?? "");
      setObservacao(doc?.observacao ?? "");
      setFile(null);
    }
  }, [open, doc]);

  const label = docLabel(tipo, tipo === "outro" ? nomePersonalizado : undefined);
  const isOutroSemNome = tipo === "outro" && !nomePersonalizado.trim();

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
          <DialogTitle>{isNew ? "Novo documento da Gestora" : label}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {doc?.arquivo_nome && (
            <div className="flex items-center gap-3 rounded-lg border border-border bg-card/50 px-3.5 py-2.5">
              <FileCheck2 className="h-5 w-5 shrink-0 text-success" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-medium">{doc.arquivo_nome}</div>
                <div className="text-[11px] text-muted-foreground">{formatBytes(doc.arquivo_tamanho)}</div>
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
            <span className="text-[11px] text-muted-foreground">Arraste ou clique para selecionar</span>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Tipo de documento</Label>
            {isNew ? (
              <Select value={tipo} onValueChange={(v) => setTipo(v as DocTipo)}>
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
              <Input value={DOC_TYPES[tipo].label} disabled />
            )}
          </div>

          {tipo === "outro" && (
            <div className="space-y-1.5">
              <Label>Nome do documento</Label>
              <Input
                placeholder="ex.: Ata de reunião"
                value={nomePersonalizado}
                onChange={(e) => setNomePersonalizado(e.target.value)}
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="gestora-documento-observacao">
              Observação <span className="text-muted-foreground font-normal">(opcional)</span>
            </Label>
            <Textarea
              id="gestora-documento-observacao"
              placeholder="Alguma observação sobre este documento…"
              rows={3}
              className="resize-none"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button
            size="sm"
            disabled={saving || isOutroSemNome}
            onClick={() => onSave({ tipo, nomePersonalizado: nomePersonalizado.trim(), observacao, file })}
          >
            {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Upload className="mr-1 h-4 w-4" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
