import { useEffect, useRef, useState } from "react";
import {
  Upload,
  UploadCloud,
  FileCheck2,
  CalendarClock,
  CalendarPlus,
  Loader2,
  ExternalLink,
  Unlink,
} from "lucide-react";

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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DOC_TYPES, CADENCIA_LABELS, cadenciaSugerida, docLabel } from "@/data/ativosData";
import {
  getDownloadUrl,
  type DocTipo,
  type Cadencia,
  type DocumentoResponse,
} from "@/lib/api/documentoService";

// ── Date helper (API: "YYYY-MM-DD" → UI: "dd/mm/aaaa") ─────────────────────────

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
export interface PrazoPrefill {
  documentoId: string;
  topico: string;
  resp: string;
}

/**
 * Create/edit dialog for one Documento — cadência, período de referência e
 * vínculo com Prazo são campos de qualquer Documento (fundo, SPE ou Gestora),
 * não algo específico do domínio fundo/SPE. Compartilhado por `AtivosContent`
 * e `GestoraDocumentsContent`.
 */
export function DocumentDialog({
  contextName,
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
  /** Nome curto do dono do documento (nome do ativo/fundo, ou nome da Gestora) — usado no
   * título do diálogo e como prefixo do tópico ao criar um prazo a partir daqui. */
  contextName: string;
  doc: DocumentoResponse | null;
  isNew: boolean;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSave: (values: {
    tipo: DocTipo;
    nomePersonalizado: string;
    cadencia: Cadencia;
    periodo: string;
    observacao: string;
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
  const [observacao, setObservacao] = useState(doc?.observacao ?? "");
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
      setObservacao(doc?.observacao ?? "");
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
          <DialogTitle>{isNew ? "Novo documento" : `${label} · ${contextName}`}</DialogTitle>
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

          <div className="space-y-1.5">
            <Label htmlFor="documento-observacao">
              Observação <span className="text-muted-foreground font-normal">(opcional)</span>
            </Label>
            <Textarea
              id="documento-observacao"
              placeholder="Alguma observação sobre este documento…"
              rows={3}
              className="resize-none"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
            />
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
                      topico: `${label} — ${contextName}`,
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
            onClick={() =>
              onSave({ tipo, nomePersonalizado: nomePersonalizado.trim(), cadencia, periodo, observacao, file })
            }
          >
            {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Upload className="mr-1 h-4 w-4" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
