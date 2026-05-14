import { Suspense, lazy, useCallback, useEffect, useId, useRef, useState } from "react";
import {
  FileSpreadsheet, BarChart2, Loader2, Trash2,
  CheckCircle2, Presentation,
} from "lucide-react";
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
import { cn } from "@/lib/utils";

const Plot = lazy(() => import("react-plotly.js"));

const EXCEL_ACCEPT =
  ".xlsx,.xls,application/vnd.ms-excel," +
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const BASE_URL = (import.meta.env.VITE_AGENT_SERVICES_URL as string | undefined)?.replace(/\/$/, "") ?? "";
const PRESIGN_URL = `${BASE_URL}/fund-report/presign`;
const BUILD_URL = `${BASE_URL}/fund-report/build`;
const JOB_URL = (id: string) => `${BASE_URL}/fund-report/jobs/${encodeURIComponent(id)}`;
const FUNDS_URL = `${BASE_URL}/fund-report/funds`;

function tryParseJsonRecord(text: string): Record<string, unknown> {
  try {
    const v = JSON.parse(text) as unknown;
    return typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function parseJsonText<T>(text: string, label: string, httpStatus: number): T {
  const t = text.trimStart();
  if (!t.startsWith("{") && !t.startsWith("[")) {
    const nonJson =
      /^<!doctype/i.test(t) || /^<html/i.test(t) || /^<\?xml/i.test(t);
    throw new Error(
      nonJson
        ? `${label}: o servidor devolveu ${/^<\?xml/i.test(t) ? "XML" : "HTML"} em vez de JSON (HTTP ${httpStatus}). Confira VITE_AGENT_SERVICES_URL.`
        : `${label}: resposta não é JSON (HTTP ${httpStatus}).`,
    );
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`${label}: JSON inválido (HTTP ${httpStatus}).`);
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────

type PlotlyFig = { data: Data[]; layout: Partial<Layout>; [key: string]: unknown };

type FundInfo = { fund_id: string; display_name: string };

type JobStatusPayload = {
  job_id: string;
  fund_id: string;
  fund_name: string;
  status: "pending" | "running" | "completed" | "failed";
  figures: Record<string, PlotlyFig>;
  tables: Record<string, string[][]>;
  pptx_url: string | null;
  error: string | null;
  sources: unknown[];
};

type UiStatus = "idle" | "presigning" | "uploading" | "running" | "completed" | "error";

const STATUS_LABEL: Record<UiStatus, string> = {
  idle: "",
  presigning: "Preparando upload…",
  uploading: "Enviando arquivo…",
  running: "Agente gerando os gráficos…",
  completed: "Concluído!",
  error: "",
};

const CHART_TITLES: Record<string, string> = {
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

// ── Main page ────────────────────────────────────────────────────────────────

export default function RelatorioTeste() {
  const fundSelectId = useId();
  const fileInputId = useId();
  const fileRef = useRef<HTMLInputElement>(null);

  // Funds
  const [funds, setFunds] = useState<FundInfo[]>([]);
  const [selectedFundId, setSelectedFundId] = useState("");
  const [loadingFunds, setLoadingFunds] = useState(true);
  const [fundsError, setFundsError] = useState<string | null>(null);

  // Single Excel file
  const [excelFile, setExcelFile] = useState<File | null>(null);

  // Job state
  const [uiStatus, setUiStatus] = useState<UiStatus>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [figures, setFigures] = useState<Record<string, PlotlyFig> | null>(null);
  const [pptxUrl, setPptxUrl] = useState<string | null>(null);

  // ── Load funds list ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!BASE_URL) { setLoadingFunds(false); return; }
    let cancelled = false;
    setFundsError(null);
    setLoadingFunds(true);
    fetch(FUNDS_URL)
      .then(async (r) => {
        const text = await r.text();
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return parseJsonText<FundInfo[]>(text, "Lista de fundos", r.status);
      })
      .then((list) => {
        if (cancelled) return;
        setFunds(list);
        if (list.length > 0) setSelectedFundId(list[0].fund_id);
      })
      .catch((e: Error) => { if (!cancelled) setFundsError(e.message); })
      .finally(() => { if (!cancelled) setLoadingFunds(false); });
    return () => { cancelled = true; };
  }, []);

  const clearAll = useCallback(() => {
    setExcelFile(null);
    setErrorMsg(null);
    setUiStatus("idle");
    setJobId(null);
    setFigures(null);
    setPptxUrl(null);
  }, []);

  // ── Job flow ────────────────────────────────────────────────────────────

  const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

  const POLL_INTERVAL_MS = 2000;
  const POLL_MAX_ATTEMPTS = 450; // ~15 min

  const pollJob = useCallback(async (id: string): Promise<JobStatusPayload> => {
    for (let i = 0; i < POLL_MAX_ATTEMPTS; i++) {
      await delay(POLL_INTERVAL_MS);
      const res = await fetch(JOB_URL(id));
      const text = await res.text();
      if (res.status === 404) throw new Error("Job não encontrado.");
      if (!res.ok) {
        const b = tryParseJsonRecord(text) as Record<string, string>;
        throw new Error(b.detail ?? b.error ?? `Erro ao consultar job (${res.status}).`);
      }
      const payload = parseJsonText<JobStatusPayload>(text, "Job status", res.status);
      if (payload.status === "completed") return payload;
      if (payload.status === "failed") {
        throw new Error(payload.error ?? "O processamento falhou no servidor.");
      }
    }
    throw new Error("Timeout: o processamento demorou demais.");
  }, []);

  const runJob = async () => {
    if (!excelFile || !selectedFundId || !BASE_URL) return;

    setUiStatus("presigning");
    setErrorMsg(null);
    setFigures(null);
    setPptxUrl(null);

    try {
      // 1. Presign
      const contentType =
        excelFile.type || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      const psRes = await fetch(PRESIGN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: excelFile.name, content_type: contentType }),
      });
      const psText = await psRes.text();
      if (!psRes.ok) {
        const b = tryParseJsonRecord(psText) as Record<string, string>;
        throw new Error(b.detail ?? b.error ?? `Presign falhou (${psRes.status}).`);
      }
      const ps = parseJsonText<{ job_id: string; s3_key: string; upload_url: string }>(
        psText, "Presign", psRes.status,
      );
      setJobId(ps.job_id);

      // 2. Upload to S3
      setUiStatus("uploading");
      const upRes = await fetch(ps.upload_url, {
        method: "PUT",
        headers: { "Content-Type": contentType },
        body: excelFile,
      });
      if (!upRes.ok) throw new Error(`Upload falhou (HTTP ${upRes.status}).`);

      // 3. Kick off the build
      setUiStatus("running");
      const fundDisplay = funds.find((f) => f.fund_id === selectedFundId)?.display_name ?? selectedFundId;
      const buildRes = await fetch(BUILD_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fund_id: selectedFundId,
          job_id: ps.job_id,
          fund_name: fundDisplay,
          s3_key: ps.s3_key,
        }),
      });
      const buildText = await buildRes.text();
      if (!buildRes.ok) {
        const b = tryParseJsonRecord(buildText) as Record<string, string>;
        throw new Error(b.detail ?? b.error ?? `Erro ao iniciar processamento (${buildRes.status}).`);
      }

      // 4. Poll
      const final = await pollJob(ps.job_id);
      setFigures(final.figures);
      setPptxUrl(final.pptx_url);
      setUiStatus("completed");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Erro desconhecido.");
      setUiStatus("error");
    }
  };

  const downloadPptx = async () => {
    if (!pptxUrl) return;
    setErrorMsg(null);
    try {
      const res = await fetch(pptxUrl);
      if (!res.ok) throw new Error(`Download falhou (HTTP ${res.status}).`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      try {
        const a = document.createElement("a");
        a.href = url;
        a.download = `controle-obras-${selectedFundId}.pptx`;
        a.rel = "noopener";
        document.body.appendChild(a);
        a.click();
        a.remove();
      } finally {
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Falha ao baixar o arquivo.");
    }
  };

  const isRunning = uiStatus !== "idle" && uiStatus !== "completed" && uiStatus !== "error";
  const canRun = !!excelFile && !!selectedFundId && !!BASE_URL && !isRunning;

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-3xl space-y-8">

      {/* Fundo */}
      <section
        aria-label="Fundo do controle"
        className="min-w-0 overflow-hidden rounded-xl border border-border/70 bg-card/90 px-4 py-5 shadow-sm sm:px-5 sm:py-6"
      >
        <h2 className="mb-4 text-sm font-semibold text-foreground">Fundo</h2>

        {!fundsError && funds.length > 0 && (
          <div className="space-y-1.5">
            <Label htmlFor={fundSelectId} className="text-xs text-muted-foreground">Controle para</Label>
            <Select value={selectedFundId} onValueChange={setSelectedFundId} disabled={loadingFunds}>
              <SelectTrigger id={fundSelectId} className="h-9 w-full max-w-md text-sm">
                <SelectValue placeholder={loadingFunds ? "Carregando…" : "Selecionar fundo"} />
              </SelectTrigger>
              <SelectContent>
                {funds.map((f) => (
                  <SelectItem key={f.fund_id} value={f.fund_id}>{f.display_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {loadingFunds && (
          <p className="text-sm text-muted-foreground" role="status">Carregando lista de fundos…</p>
        )}
        {fundsError && (
          <p className="text-sm text-amber-600 dark:text-amber-500" role="alert">
            Não foi possível carregar a lista de fundos ({fundsError}).
          </p>
        )}
        {!loadingFunds && !fundsError && funds.length === 0 && (
          <p className="text-sm text-muted-foreground" role="status">
            Nenhum fundo encontrado. Adicione um arquivo de instruções em{" "}
            <code>agent-services/src/fund_report/instructions/&lt;fund_id&gt;.md</code>.
          </p>
        )}
      </section>

      {/* Entrada */}
      <section
        aria-label="Upload de arquivo"
        className="min-w-0 overflow-hidden rounded-xl border border-border/70 bg-card/90 px-4 py-5 shadow-sm sm:px-5 sm:py-6"
      >
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-foreground">Entrada</h2>
          {excelFile && (
            <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={clearAll} disabled={isRunning}>
              Limpar
            </Button>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor={fileInputId} className="text-xs font-medium text-muted-foreground">
            Planilha do fundo * <span className="font-normal">(Excel com abas SPE + Fluxo Financeiro)</span>
          </Label>
          <input
            ref={fileRef}
            id={fileInputId}
            type="file"
            accept={EXCEL_ACCEPT}
            className="sr-only"
            disabled={isRunning}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) setExcelFile(f);
              e.target.value = "";
            }}
          />

          {excelFile ? (
            <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-background/50 px-3 py-2.5 text-sm">
              <FileSpreadsheet className="h-4 w-4 shrink-0 text-primary" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-foreground">{excelFile.name}</p>
                <p className="text-xs text-muted-foreground">{formatBytes(excelFile.size)}</p>
              </div>
              <Button
                type="button" variant="ghost" size="icon"
                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => setExcelFile(null)}
                disabled={isRunning}
                aria-label={`Remover ${excelFile.name}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <button
              type="button"
              className={cn(
                "flex w-full cursor-pointer items-center gap-3 rounded-lg border-2 border-dashed border-border/80 bg-muted/20 px-4 py-6 text-left transition-colors",
                "hover:border-primary/50 hover:bg-muted/30",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                isRunning && "pointer-events-none opacity-50",
              )}
              disabled={isRunning}
              onClick={() => fileRef.current?.click()}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15">
                <FileSpreadsheet className="h-4 w-4 text-primary" aria-hidden />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Clique para selecionar o arquivo Excel</p>
                <p className="text-xs text-muted-foreground">XLSX ou XLS · uma aba por SPE + aba Fluxo Financeiro</p>
              </div>
            </button>
          )}
        </div>
      </section>

      {/* Ações */}
      <section
        aria-label="Ações do controle"
        className="min-w-0 overflow-hidden rounded-xl border border-border/70 bg-card/90 px-4 py-5 shadow-sm sm:px-5 sm:py-6"
      >
        <h2 className="mb-4 text-sm font-semibold text-foreground">Ações</h2>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" disabled={!canRun} onClick={() => void runJob()} className="h-9 gap-2">
            {isRunning ? (
              <><Loader2 className="h-4 w-4 animate-spin" aria-hidden />{STATUS_LABEL[uiStatus]}</>
            ) : (
              <><BarChart2 className="h-4 w-4" aria-hidden />Gerar relatório</>
            )}
          </Button>

          {uiStatus === "completed" && pptxUrl && (
            <Button type="button" variant="outline" onClick={() => void downloadPptx()} className="h-9 gap-2">
              <Presentation className="h-4 w-4" aria-hidden />Download PPTX
            </Button>
          )}

          {uiStatus === "completed" && (
            <span className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4" aria-hidden />Concluído
            </span>
          )}
        </div>

        {isRunning && (
          <div className="mt-4 space-y-1">
            {(["presigning", "uploading", "running"] as UiStatus[]).map((step) => {
              const steps: UiStatus[] = ["presigning", "uploading", "running"];
              const done = steps.indexOf(step) < steps.indexOf(uiStatus);
              const active = step === uiStatus;
              return (
                <div
                  key={step}
                  className={cn(
                    "flex items-center gap-2 text-xs",
                    done ? "text-muted-foreground" : active ? "text-foreground font-medium" : "text-muted-foreground/50",
                  )}
                >
                  {done
                    ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-500" aria-hidden />
                    : active
                      ? <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
                      : <span className="h-3.5 w-3.5 shrink-0 rounded-full border border-current opacity-30" aria-hidden />}
                  {STATUS_LABEL[step]}
                </div>
              );
            })}
          </div>
        )}

        {errorMsg && (
          <p className="mt-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">{errorMsg}</p>
        )}

        {!BASE_URL && (
          <p className="mt-3 text-xs text-amber-600 dark:text-amber-500" role="status">
            Configure <code className="rounded bg-muted px-1 py-0.5">VITE_AGENT_SERVICES_URL</code> com a URL do serviço agent-services.
          </p>
        )}

        {jobId && (
          <p className="mt-3 text-xs text-muted-foreground">job_id: <code className="rounded bg-muted px-1 py-0.5">{jobId}</code></p>
        )}
      </section>

      {/* Pré-visualização */}
      {figures && (
        <section aria-label="Pré-visualização dos gráficos" className="space-y-6">
          <h2 className="text-lg font-semibold text-foreground">Pré-visualização</h2>
          {Object.keys(CHART_TITLES).map((key) => {
            const fig = figures[key];
            if (!fig) return null;
            return (
              <div key={key} className="min-w-0 overflow-hidden rounded-xl border border-border/70 bg-card/90 px-4 py-5 shadow-sm sm:px-5 sm:py-6">
                <h3 className="mb-1 text-sm font-semibold text-foreground">{CHART_TITLES[key]}</h3>
                <div className="mt-1 h-px w-full bg-border/60" />
                <div className="mt-4">
                  <Suspense fallback={<div className="animate-pulse rounded-md bg-muted" style={{ height: 400 }} aria-hidden />}>
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
