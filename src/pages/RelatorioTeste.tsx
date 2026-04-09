import { Suspense, lazy, useCallback, useEffect, useId, useRef, useState } from "react";
import { FileSpreadsheet, FileDown, BarChart2, Loader2, Trash2, Upload } from "lucide-react";
import type { Data, Layout } from "plotly.js";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { extractFundNamesFromPlotlyPayload } from "@/components/graficos/PlotlyFundFilterFigure";
import { cn } from "@/lib/utils";

const Plot = lazy(() => import("react-plotly.js"));

const FILE_ACCEPT =
  ".csv,.xlsx,.xls,text/csv,application/vnd.ms-excel," +
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const BASE_URL = import.meta.env.VITE_REPORT_API_URL ?? "http://localhost:8001";
const API_URL = `${BASE_URL}/report`;
const PREVIEW_URL = `${BASE_URL}/report/preview`;

/** Same source as Gráficos → Evolução diária (fund list from PL traces). */
const PL_EVOLUTION_URL = "/plotly/pl-evolution.json";

// ── Types ─────────────────────────────────────────────────────────────────────

type PlotlyFig = { data: Data[]; layout: Partial<Layout>; [key: string]: unknown };

type PreviewPayload = {
  spe_order: string[];
  historico_financeiro: PlotlyFig;
  historico_vendas: PlotlyFig;
  inadimplencia: PlotlyFig;
  vendas_estoque: PlotlyFig;
  premio: PlotlyFig | null;
};

const CHART_TITLES: Record<keyof Omit<PreviewPayload, "spe_order">, string> = {
  historico_financeiro: "1. Histórico Financeiro",
  historico_vendas: "2. Histórico Vendas",
  inadimplencia: "3. Relação de Inadimplência",
  vendas_estoque: "4. Vendas e Estoque",
  premio: "5. Prêmio",
};

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function isAllowedFile(file: File): boolean {
  const lower = file.name.toLowerCase();
  if (lower.endsWith(".csv") || lower.endsWith(".xlsx") || lower.endsWith(".xls")) return true;
  const t = file.type;
  return (
    t === "text/csv" ||
    t === "application/vnd.ms-excel" ||
    t === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
}

type ActionState = "idle" | "loading" | "error";

export default function RelatorioTeste() {
  const inputId = useId();
  const fundSelectId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [files, setFiles] = useState<File[]>([]);
  const [rejectNote, setRejectNote] = useState<string | null>(null);
  const [genState, setGenState] = useState<ActionState>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [previewState, setPreviewState] = useState<ActionState>("idle");
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<PreviewPayload | null>(null);

  const [fundNames, setFundNames] = useState<string[]>([]);
  const [selectedFund, setSelectedFund] = useState("");
  const [loadingFunds, setLoadingFunds] = useState(true);
  const [namesError, setNamesError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setNamesError(null);
    setLoadingFunds(true);
    fetch(PL_EVOLUTION_URL)
      .then((r) => {
        if (!r.ok) throw new Error(r.statusText);
        return r.json();
      })
      .then((payload) => {
        if (cancelled) return;
        const names = extractFundNamesFromPlotlyPayload(payload);
        setFundNames(names);
        if (names.length > 0) {
          setSelectedFund(names[0]);
        }
      })
      .catch((e: Error) => {
        if (!cancelled) setNamesError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoadingFunds(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // ── File management ──────────────────────────────────────────────────────

  const openFilePicker = () => fileInputRef.current?.click();

  const addFiles = useCallback((list: FileList | File[]) => {
    const incoming = Array.from(list);
    const valid: File[] = [];
    let rejected = 0;
    for (const f of incoming) {
      if (isAllowedFile(f)) valid.push(f);
      else rejected += 1;
    }
    setRejectNote(
      rejected > 0
        ? `${rejected} arquivo(s) ignorado(s) — use apenas CSV ou Excel (.xlsx / .xls).`
        : null,
    );
    if (valid.length === 0) return;
    setFiles((prev) => {
      const seen = new Set(prev.map((p) => `${p.name}-${p.size}`));
      const merged = [...prev];
      for (const f of valid) {
        const key = `${f.name}-${f.size}`;
        if (!seen.has(key)) {
          seen.add(key);
          merged.push(f);
        }
      }
      return merged;
    });
  }, []);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) addFiles(e.target.files);
    e.target.value = "";
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  };

  const removeAt = (index: number) =>
    setFiles((prev) => prev.filter((_, i) => i !== index));

  const clearAll = () => {
    setFiles([]);
    setRejectNote(null);
    setErrorMsg(null);
    setGenState("idle");
  };

  // ── Build shared FormData ─────────────────────────────────────────────────

  const buildForm = () => {
    const form = new FormData();
    for (const f of files) form.append("files", f, f.name);
    form.append("fii_fund_name", selectedFund.trim());
    return form;
  };

  // ── PDF generation ───────────────────────────────────────────────────────

  const generatePdf = async () => {
    if (files.length === 0) return;

    setGenState("loading");
    setErrorMsg(null);

    try {
      const res = await fetch(API_URL, { method: "POST", body: buildForm() });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(body.detail ?? `Erro ${res.status}`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "relatorio-fidc.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      setGenState("idle");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Erro desconhecido.");
      setGenState("error");
    }
  };

  // ── Chart preview ────────────────────────────────────────────────────────

  const loadPreview = async () => {
    if (files.length === 0) return;

    setPreviewState("loading");
    setPreviewError(null);
    setPreviewData(null);

    try {
      const res = await fetch(PREVIEW_URL, { method: "POST", body: buildForm() });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(body.detail ?? `Erro ${res.status}`);
      }

      setPreviewData(await res.json() as PreviewPayload);
      setPreviewState("idle");
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : "Erro desconhecido.");
      setPreviewState("error");
    }
  };

  const fundReady =
    !loadingFunds &&
    !namesError &&
    fundNames.length > 0 &&
    selectedFund.trim().length >= 2;

  const canAct = files.length > 0 && fundReady;
  const canGenerate = canAct && genState !== "loading";
  const canPreview = canAct && previewState !== "loading";

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <p className="text-sm text-muted-foreground">
        Selecione o fundo (mesma lista que em Gráficos), depois envie os CSVs de vendas. Unidades em estoque
        (FII) são identificadas quando o nome do fundo aparece no cliente. O rótulo de cada carteira no PDF vem
        do nome do arquivo. Opcional: CSV de Fluxo Financeiro com &quot;fluxo&quot; no nome. Cronogramas são
        ignorados.
      </p>

      {/* ── Fundo (first) ───────────────────────────────────────────────── */}
      <section
        aria-label="Fundo do relatório"
        className="min-w-0 overflow-hidden rounded-xl border border-border/70 bg-card/90 px-4 py-5 shadow-sm sm:px-5 sm:py-6"
      >
        <h2 className="mb-4 text-sm font-semibold text-foreground">Fundo</h2>

        {!namesError && fundNames.length > 0 && (
          <div className="space-y-1.5">
            <Label htmlFor={fundSelectId} className="text-xs text-muted-foreground">
              Relatório para
            </Label>
            <Select
              value={selectedFund}
              onValueChange={setSelectedFund}
              disabled={loadingFunds}
            >
              <SelectTrigger id={fundSelectId} className="h-9 w-full max-w-md text-sm">
                <SelectValue placeholder={loadingFunds ? "Carregando…" : "Selecionar fundo"} />
              </SelectTrigger>
              <SelectContent>
                {fundNames.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {loadingFunds && (
          <p className="text-sm text-muted-foreground" role="status">
            Carregando lista de fundos…
          </p>
        )}

        {namesError && (
          <p className="text-sm text-amber-600 dark:text-amber-500" role="alert">
            Não foi possível carregar a lista de fundos ({namesError}). Verifique se{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">/plotly/pl-evolution.json</code> está
            disponível e recarregue a página.
          </p>
        )}

        {!loadingFunds && !namesError && fundNames.length === 0 && (
          <p className="text-sm text-muted-foreground" role="status">
            Nenhum fundo encontrado no PL. Gere o export de gráficos ou atualize os dados.
          </p>
        )}
      </section>

      {/* ── Entrada (arquivos) ──────────────────────────────────────────── */}
      <section
        aria-label="Upload de arquivos"
        className="min-w-0 overflow-hidden rounded-xl border border-border/70 bg-card/90 px-4 py-5 shadow-sm sm:px-5 sm:py-6"
      >
        <h2 className="mb-4 text-sm font-semibold text-foreground">Entrada</h2>

        <input
          ref={fileInputRef}
          id={inputId}
          type="file"
          accept={FILE_ACCEPT}
          multiple
          className="sr-only"
          aria-label="Selecionar arquivos CSV ou Excel"
          onChange={onInputChange}
        />

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Formatos aceitos:{" "}
            <span className="text-foreground">.csv</span>,{" "}
            <span className="text-foreground">.xlsx</span>,{" "}
            <span className="text-foreground">.xls</span>
          </p>
          <Button type="button" onClick={openFilePicker} className="shrink-0 gap-2">
            <Upload className="h-4 w-4" aria-hidden />
            Selecionar arquivos
          </Button>
        </div>

        <div
          role="button"
          tabIndex={0}
          aria-label="Abrir seletor de arquivos ou arraste arquivos para esta área"
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              openFilePicker();
            }
          }}
          onClick={openFilePicker}
          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onDrop={onDrop}
          className={cn(
            "mt-4 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border/80 bg-muted/20 px-4 py-8 transition-colors",
            "hover:border-primary/50 hover:bg-muted/30",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          )}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15">
            <FileSpreadsheet className="h-5 w-5 text-primary" aria-hidden />
          </div>
          <p className="text-center text-sm text-muted-foreground">
            Ou arraste os arquivos para esta área
            <span className="mt-1 block text-xs">Vários arquivos de uma vez</span>
          </p>
        </div>

        {rejectNote && (
          <p className="mt-3 text-sm text-amber-600 dark:text-amber-500" role="status">
            {rejectNote}
          </p>
        )}

        {files.length > 0 && (
          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-muted-foreground">
                Arquivos selecionados ({files.length})
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                onClick={clearAll}
              >
                Limpar tudo
              </Button>
            </div>
            <ul className="divide-y divide-border/60 rounded-lg border border-border/60 bg-background/50">
              {files.map((file, index) => (
                <li
                  key={`${file.name}-${file.size}-${index}`}
                  className="flex items-center gap-3 px-3 py-2.5 text-sm first:rounded-t-lg last:rounded-b-lg"
                >
                  <FileSpreadsheet className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-foreground">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => removeAt(index)}
                    aria-label={`Remover ${file.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* ── Geração ─────────────────────────────────────────────────────── */}
      <section
        aria-label="Geração do relatório"
        className="min-w-0 overflow-hidden rounded-xl border border-border/70 bg-card/90 px-4 py-5 shadow-sm sm:px-5 sm:py-6"
      >
        <h2 className="mb-4 text-sm font-semibold text-foreground">Ações</h2>

        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={!canPreview}
            onClick={loadPreview}
            className="h-9 gap-2"
          >
            {previewState === "loading" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Carregando gráficos…
              </>
            ) : (
              <>
                <BarChart2 className="h-4 w-4" aria-hidden />
                Visualizar gráficos
              </>
            )}
          </Button>

          <Button
            type="button"
            disabled={!canGenerate}
            onClick={generatePdf}
            className="h-9 gap-2"
          >
            {genState === "loading" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Gerando…
              </>
            ) : (
              <>
                <FileDown className="h-4 w-4" aria-hidden />
                Gerar PDF
              </>
            )}
          </Button>
        </div>

        {errorMsg && (
          <p className="mt-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
            {errorMsg}
          </p>
        )}

        {previewError && (
          <p className="mt-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
            {previewError}
          </p>
        )}

        {!canAct && (
          <p className="mt-3 text-xs text-muted-foreground">
            {!fundReady
              ? "Aguarde o fundo estar disponível e selecionado."
              : "Selecione os arquivos acima para habilitar as ações."}
          </p>
        )}
      </section>

      {/* ── Chart preview ────────────────────────────────────────────────── */}
      {previewData && (
        <section aria-label="Pré-visualização dos gráficos" className="space-y-6">
          <h2 className="text-lg font-semibold text-foreground">Pré-visualização</h2>
          {(Object.keys(CHART_TITLES) as Array<keyof typeof CHART_TITLES>).map((key) => {
            const fig = previewData[key];
            if (!fig) return null;
            return (
              <div
                key={key}
                className="min-w-0 overflow-hidden rounded-xl border border-border/70 bg-card/90 px-4 py-5 shadow-sm sm:px-5 sm:py-6"
              >
                <h3 className="mb-1 text-sm font-semibold text-foreground">{CHART_TITLES[key]}</h3>
                <div className="mt-1 h-px w-full bg-border/60" />
                <div className="mt-4">
                  <Suspense
                    fallback={
                      <div className="animate-pulse rounded-md bg-muted" style={{ height: 400 }} aria-hidden />
                    }
                  >
                    <Plot
                      data={fig.data}
                      layout={{ ...fig.layout, autosize: true }}
                      style={{ width: "100%", minHeight: 400 }}
                      useResizeHandler
                      config={{ responsive: true, displayModeBar: true }}
                    />
                  </Suspense>
                </div>
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}
