import { useEffect, useState } from "react";
import {
  Plus,
  SquarePen,
  Download,
  Upload,
  UploadCloud,
  FileCheck2,
  CalendarClock,
  CalendarPlus,
  Calendar as CalendarIcon,
  Info,
  FolderX,
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
import {
  getAtivosData,
  cadenciaLabel,
  cadenciaNote,
  DOC_TYPES,
  DOC_STATUS,
  type AtivoAsset,
  type Documento,
  type DocTipo,
} from "@/data/ativosData";

export interface AtivosContentProps {
  fundoId: number | null;
  fundName?: string;
}

const RESP_OPCOES = ["Jurídico", "Contábil", "Financeiro", "Engenharia", "Comercial", "Compliance", "SPE"];

// ── Criar prazo dialog ────────────────────────────────────────────────────────
interface PrazoPrefill {
  topico: string;
  resp: string;
}

function CriarPrazoDialog({
  prefill,
  open,
  onOpenChange,
}: {
  prefill: PrazoPrefill | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const [topico, setTopico] = useState("");
  const [vencimento, setVencimento] = useState("");
  const [resp, setResp] = useState("");

  // Seed fields when the dialog opens with a fresh prefill.
  useEffect(() => {
    if (open) {
      setTopico(prefill?.topico ?? "");
      setVencimento("");
      setResp(prefill?.resp ?? "");
    }
  }, [open, prefill]);

  function salvar() {
    toast({ title: "Prazo criado", description: "Prazo criado e vinculado ao documento." });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Criar prazo</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label>Tópico</Label>
            <Input value={topico} onChange={(e) => setTopico(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Vencimento</Label>
            <Input placeholder="dd/mm/aaaa" value={vencimento} onChange={(e) => setVencimento(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Responsável</Label>
            <Select value={resp} onValueChange={setResp}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {RESP_OPCOES.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button size="sm" onClick={salvar}>
            <CalendarPlus className="mr-1 h-4 w-4" /> Criar prazo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Document (upload / edit fields) dialog ────────────────────────────────────
function DocumentDialog({
  asset,
  doc,
  isNew,
  open,
  onOpenChange,
  onCriarPrazo,
}: {
  asset: AtivoAsset;
  doc: Documento | null;
  isNew: boolean;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCriarPrazo: (prefill: PrazoPrefill) => void;
}) {
  const [tipo, setTipo] = useState<DocTipo>(doc?.tipo ?? "balancete");
  const [periodo, setPeriodo] = useState(doc?.periodo ?? "");

  // Re-seed local state whenever a different document opens the dialog.
  useEffect(() => {
    if (open) {
      setTipo(doc?.tipo ?? "balancete");
      setPeriodo(doc?.periodo ?? "");
    }
  }, [open, doc, isNew]);

  const meta = DOC_TYPES[tipo];
  const note = cadenciaNote(tipo, asset);

  function salvar() {
    toast({ title: "Documento salvo", description: "Documento enviado e versão atualizada." });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isNew ? "Novo documento" : `${meta.label} · ${asset.nome.split(" · ")[0]}`}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {doc?.arquivo && (
            <div className="flex items-center gap-3 rounded-lg border border-border bg-card/50 px-3.5 py-2.5">
              <FileCheck2 className="h-5 w-5 shrink-0 text-success" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-medium">{doc.arquivo.nome}</div>
                <div className="text-[11px] text-muted-foreground">{doc.arquivo.tamanho} · vigente desde {doc.vigente}</div>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Baixar">
                <Download className="h-4 w-4" />
              </Button>
            </div>
          )}

          <div className="flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border py-7 text-center">
            <UploadCloud className="h-6 w-6 text-muted-foreground" />
            <p className="text-[13px] font-medium">{doc?.arquivo ? "Enviar nova versão" : "Enviar arquivo"}</p>
            <span className="text-[11px] text-muted-foreground">Arraste ou clique para selecionar · PDF, XLSX, DOCX</span>
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
              <Input value={meta.label} disabled />
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Cadência</Label>
            <Input value={cadenciaLabel(tipo, asset)} disabled />
          </div>
          {note && (
            <div className="flex items-start gap-2 rounded-md bg-muted/50 px-3 py-2 text-[11px] text-muted-foreground">
              <Info className="mt-px h-3.5 w-3.5 shrink-0" /> {note}
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Período de referência</Label>
            <Input placeholder="ex.: 2º tri/2026" value={periodo} onChange={(e) => setPeriodo(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Vincular a um prazo</Label>
            {doc?.prazo ? (
              <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                <span className="flex items-center gap-1.5 text-[13px]">
                  <CalendarClock className="h-4 w-4 text-muted-foreground" />
                  {doc.prazo.titulo} · vence {doc.prazo.data}
                </span>
                <span className="text-[11px] text-muted-foreground">{doc.prazo.resp}</span>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="w-fit"
                onClick={() => onCriarPrazo({ topico: `${meta.label} — ${asset.nome.split(" · ")[0]}`, resp: meta.resp })}
              >
                <CalendarPlus className="mr-1 h-4 w-4" /> Criar prazo
              </Button>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button size="sm" onClick={salvar}>
            <Upload className="mr-1 h-4 w-4" /> Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Prazo cell ────────────────────────────────────────────────────────────────
function DocPrazoCell({ doc, onCreatePrazo }: { doc: Documento; onCreatePrazo: () => void }) {
  if (doc.prazo) {
    return (
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap font-mono text-[12px] tabular-nums text-success">
        <CalendarClock className="h-3.5 w-3.5" /> {doc.prazo.data}
      </span>
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
function AssetCard({ asset }: { asset: AtivoAsset }) {
  const [docState, setDocState] = useState<{ doc: Documento | null; isNew: boolean } | null>(null);
  const [prazoPrefill, setPrazoPrefill] = useState<PrazoPrefill | null>(null);
  const docs = asset.documentos;

  return (
    <div
      className="mb-4 rounded-lg border border-l-[3px] border-border bg-card/50 px-5 py-4"
      style={{ borderLeftColor: asset.cor }}
    >
      <div className="mb-3">
        <div className="text-sm font-semibold text-foreground">{asset.nome}</div>
        <div className="mt-0.5 text-[11px] text-muted-foreground">{asset.sub}</div>
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
            Nenhum documento configurado para este ativo ainda. Defina quais documentos acompanhar e as respectivas cadências.
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
              {docs.map((d, i) => {
                const meta = DOC_TYPES[d.tipo];
                const st = DOC_STATUS[d.status];
                const DocIcon = meta.icon;
                const StatusIcon = st.icon;
                const note = cadenciaNote(d.tipo, asset);
                return (
                  <tr
                    key={i}
                    className={cn(
                      "border-b border-border/50 transition-colors hover:bg-card/40",
                      i === docs.length - 1 && "border-b-0",
                    )}
                  >
                    <td className="py-2.5 pr-3">
                      <div className="flex items-center gap-2 text-[13px] text-foreground">
                        <DocIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                        {meta.label}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground" title={note ?? undefined}>
                        {cadenciaLabel(d.tipo, asset)}
                        {d.tipo === "matricula" && <Info className="h-3 w-3" />}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">{d.periodo || "—"}</td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">
                      {d.vigente ? `vigente desde ${d.vigente}` : <span className="italic text-muted-foreground/70">nenhum arquivo enviado</span>}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-[3px] text-[10px] font-medium", st.chip)}>
                        <StatusIcon className="h-3 w-3" /> {st.label}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <DocPrazoCell
                        doc={d}
                        onCreatePrazo={() => setPrazoPrefill({ topico: `${meta.label} — ${asset.nome.split(" · ")[0]}`, resp: meta.resp })}
                      />
                    </td>
                    <td className="py-2.5 pl-3">
                      <div className="flex items-center justify-end gap-0.5">
                        <button
                          aria-label="Editar campos"
                          onClick={() => setDocState({ doc: d, isNew: false })}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                        >
                          <SquarePen className="h-4 w-4" />
                        </button>
                        {d.arquivo && (
                          <button
                            aria-label="Baixar"
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          aria-label="Enviar novo"
                          onClick={() => setDocState({ doc: d, isNew: false })}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-primary transition-colors hover:bg-primary/10"
                        >
                          <Upload className="h-4 w-4" />
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
        onCriarPrazo={(prefill) => {
          setDocState(null);
          setPrazoPrefill(prefill);
        }}
      />
      <CriarPrazoDialog
        prefill={prazoPrefill}
        open={prazoPrefill != null}
        onOpenChange={(o) => !o && setPrazoPrefill(null)}
      />
    </div>
  );
}

// ── Content ───────────────────────────────────────────────────────────────────
export function AtivosContent({ fundoId }: AtivosContentProps) {
  if (fundoId == null) {
    return (
      <p className="py-16 text-center text-sm text-muted-foreground">
        Selecione um fundo para ver seus ativos.
      </p>
    );
  }

  const data = getAtivosData(fundoId);

  if (!data) {
    return (
      <p className="py-16 text-center text-sm text-muted-foreground">
        Sem dados de ativos disponíveis para este fundo.
      </p>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-baseline justify-between">
        <h3 className="text-base font-semibold">Documentos por Empreendimento</h3>
        <span className="text-xs text-muted-foreground">Posição em {data.asOf}</span>
      </div>

      {data.assets.map((a, idx) => (
        <AssetCard key={idx} asset={a} />
      ))}
    </div>
  );
}
