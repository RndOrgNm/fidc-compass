import { Suspense, lazy, useCallback, useEffect, useId, useRef, useState } from "react";
import { useReportJob } from "@/contexts/ReportJobContext";
import {
  FileSpreadsheet, FileDown, BarChart2, History, Loader2, Trash2, X,
  CheckCircle2, Presentation, FileText,
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
import { extractFundNamesFromPlotlyPayload } from "@/components/graficos/PlotlyFundFilterFigure";
import { cn } from "@/lib/utils";

const Plot = lazy(() => import("react-plotly.js"));

const SPREADSHEET_ACCEPT =
  ".csv,.xlsx,.xls,text/csv,application/vnd.ms-excel," +
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const PPTX_ACCEPT =
  ".pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation";

const BASE_URL = (import.meta.env.VITE_REPORT_API_URL as string | undefined)?.replace(/\/$/, "") ?? "";
const PRESIGN_URL = `${BASE_URL}/presign`;
const WORKER_URL = `${BASE_URL}/report`;
const REPORT_RUNS_URL = `${BASE_URL}/report-runs`;

const PL_EVOLUTION_URL = "/plotly/pl-evolution.json";

/** HTML/XML error pages make `response.json()` throw "Unexpected token '<'". */
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
        ? `${label}: o servidor devolveu ${/^<\?xml/i.test(t) ? "XML" : "HTML"} em vez de JSON (HTTP ${httpStatus}). Confira VITE_REPORT_API_URL e se o endpoint/API Gateway está correto.`
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

type ConfigPayload = {
  spe_order: string[];
  historico_financeiro: PlotlyFig;
  historico_vendas: PlotlyFig;
  inadimplencia: PlotlyFig;
  vendas_estoque: PlotlyFig;
  premio: PlotlyFig | null;
};

type ReportRun = {
  id: string;
  fundName: string;
  jobId: string;
  configKey: string;
  pdfKey: string;
  pptxKey?: string;
  status: string;
  createdAt: string | null;
};

type JobStatus = "idle" | "presigning" | "uploading" | "processing" | "rendering" | "completed" | "error";

const JOB_STATUS_LABEL: Record<JobStatus, string> = {
  idle: "",
  presigning: "Preparando upload…",
  uploading: "Enviando arquivos para o servidor…",
  processing: "Processando dados e gráficos…",
  rendering: "Gerando relatório…",
  completed: "Controle concluído!",
  error: "",
};

const CHART_TITLES: Record<keyof Omit<ConfigPayload, "spe_order">, string> = {
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

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    // If the backend omits a timezone suffix the string is ambiguous; force UTC.
    const utc = /Z|[+-]\d{2}:\d{2}$/.test(iso) ? iso : iso + "Z";
    return new Date(utc).toLocaleString("pt-BR", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
      timeZone: "America/Sao_Paulo",
    });
  } catch {
    return iso;
  }
}

// ── Single-file picker component ──────────────────────────────────────────────

function SingleFilePicker({
  label,
  description,
  accept,
  file,
  icon: Icon,
  onFile,
  onClear,
  disabled,
}: {
  label: string;
  description: string;
  accept: string;
  file: File | null;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  onFile: (f: File) => void;
  onClear: () => void;
  disabled?: boolean;
}) {
  const id = useId();
  const ref = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {label}
      </Label>
      <input
        ref={ref}
        id={id}
        type="file"
        accept={accept}
        className="sr-only"
        disabled={disabled}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />
      {file ? (
        <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-background/50 px-3 py-2.5 text-sm">
          <Icon className="h-4 w-4 shrink-0 text-primary" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-foreground">{file.name}</p>
            <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
            onClick={onClear}
            disabled={disabled}
            aria-label={`Remover ${file.name}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <button
          type="button"
          className={cn(
            "flex w-full cursor-pointer items-center gap-3 rounded-lg border-2 border-dashed border-border/80 bg-muted/20 px-4 py-4 text-left transition-colors",
            "hover:border-primary/50 hover:bg-muted/30",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            disabled && "pointer-events-none opacity-50",
          )}
          disabled={disabled}
          onClick={() => ref.current?.click()}
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15">
            <Icon className="h-4 w-4 text-primary" aria-hidden />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{description}</p>
            <p className="text-xs text-muted-foreground">Clique para selecionar</p>
          </div>
        </button>
      )}
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function RelatorioTeste() {
  const fundSelectId = useId();
  const unidadesInputId = useId();
  const unidadesRef = useRef<HTMLInputElement>(null);

  // Fundo selection
  const [fundNames, setFundNames] = useState<string[]>([]);
  const [selectedFund, setSelectedFund] = useState("");
  const [loadingFunds, setLoadingFunds] = useState(true);
  const [namesError, setNamesError] = useState<string | null>(null);

  // File inputs (three separate)
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [fluxoFile, setFluxoFile] = useState<File | null>(null);
  const [unidadesFiles, setUnidadesFiles] = useState<File[]>([]);
  const [unidadesRejectNote, setUnidadesRejectNote] = useState<string | null>(null);

  // Job state lives in ReportJobContext so polling survives page navigation.
  const {
    jobStatus, setJobStatus, errorMsg, setErrorMsg,
    configData: rawConfigData, pdfUrl, pptxUrl,
    startPolling, setLoadedArtifacts, clearJob,
  } = useReportJob();
  // Cast to the locally-typed ConfigPayload (PlotlyFig fields) for rendering.
  const configData = rawConfigData as ConfigPayload | null;
  const [pdfDownloading, setPdfDownloading] = useState(false);
  const [pptxDownloading, setPptxDownloading] = useState(false);

  // History
  const [runs, setRuns] = useState<ReportRun[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  // Load fund names from PL evolution JSON
  useEffect(() => {
    let cancelled = false;
    setNamesError(null);
    setLoadingFunds(true);
    fetch(PL_EVOLUTION_URL)
      .then(async (r) => {
        if (!r.ok) throw new Error(r.statusText);
        const text = await r.text();
        return parseJsonText<unknown>(text, "Lista de fundos (plotly)", r.status);
      })
      .then((payload) => {
        if (cancelled) return;
        const names = extractFundNamesFromPlotlyPayload(payload);
        setFundNames(names);
        if (names.length > 0) setSelectedFund(names[0]);
      })
      .catch((e: Error) => { if (!cancelled) setNamesError(e.message); })
      .finally(() => { if (!cancelled) setLoadingFunds(false); });
    return () => { cancelled = true; };
  }, []);

  // Load history when fund is ready
  const fundReady =
    !loadingFunds && !namesError && fundNames.length > 0 && selectedFund.trim().length >= 2;

  const loadHistory = useCallback(async (fund: string) => {
    if (!BASE_URL || !fund) return;
    setLoadingHistory(true);
    setHistoryError(null);
    try {
      const res = await fetch(`${REPORT_RUNS_URL}?fund_name=${encodeURIComponent(fund.trim())}&limit=5`);
      const histText = await res.text();
      if (!res.ok) {
        const b = tryParseJsonRecord(histText) as Record<string, string>;
        throw new Error(b.error ?? `Erro ao carregar histórico (${res.status})`);
      }
      setRuns(parseJsonText<ReportRun[]>(histText, "Histórico", res.status));
    } catch (err) {
      setHistoryError(err instanceof Error ? err.message : "Erro ao carregar histórico.");
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    if (fundReady && BASE_URL) void loadHistory(selectedFund);
  }, [fundReady, selectedFund, loadHistory]);

  // ── Unidades multi-file management ───────────────────────────────────────

  const addUnidadesFiles = useCallback((list: FileList | File[]) => {
    const incoming = Array.from(list);
    const valid: File[] = [];
    let rejected = 0;
    for (const f of incoming) {
      const lower = f.name.toLowerCase();
      const ok =
        lower.endsWith(".csv") || lower.endsWith(".xlsx") || lower.endsWith(".xls") ||
        f.type === "text/csv" ||
        f.type === "application/vnd.ms-excel" ||
        f.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      if (ok) valid.push(f);
      else rejected += 1;
    }
    setUnidadesRejectNote(
      rejected > 0 ? `${rejected} arquivo(s) ignorado(s) — use CSV ou Excel (.xlsx / .xls).` : null,
    );
    if (!valid.length) return;
    setUnidadesFiles((prev) => {
      const seen = new Set(prev.map((p) => `${p.name}-${p.size}`));
      const merged = [...prev];
      for (const f of valid) {
        const key = `${f.name}-${f.size}`;
        if (!seen.has(key)) { seen.add(key); merged.push(f); }
      }
      return merged;
    });
  }, []);

  const clearAll = () => {
    clearJob();
    setTemplateFile(null);
    setFluxoFile(null);
    setUnidadesFiles([]);
    setUnidadesRejectNote(null);
  };

  // ── Job flow ──────────────────────────────────────────────────────────────

  const runJob = async () => {
    if (!fluxoFile || unidadesFiles.length === 0 || !fundReady || !BASE_URL) return;

    clearJob();
    setJobStatus("presigning");

    try {
      // Build ordered list of files with roles
      type FileWithRole = { file: File; role: "template" | "fluxo" | "unidades" };
      const fileList: FileWithRole[] = [];
      if (templateFile) fileList.push({ file: templateFile, role: "template" });
      fileList.push({ file: fluxoFile, role: "fluxo" });
      unidadesFiles.forEach((f) => fileList.push({ file: f, role: "unidades" }));

      // 1. Request presigned PUT URLs
      const presignRes = await fetch(PRESIGN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          files: fileList.map(({ file, role }) => ({
            name: file.name,
            contentType: file.type || "application/octet-stream",
            role,
          })),
        }),
      });
      const presignText = await presignRes.text();
      if (!presignRes.ok) {
        const b = tryParseJsonRecord(presignText) as Record<string, string>;
        throw new Error(b.error ?? `Erro ao preparar upload (${presignRes.status})`);
      }
      const { jobId, bucket, uploads } = parseJsonText<{
        jobId: string;
        bucket: string;
        uploads: Array<{ key: string; role: string; url: string; headers: Record<string, string> }>;
      }>(presignText, "Presign", presignRes.status);

      // 2. Upload files directly to S3
      setJobStatus("uploading");
      await Promise.all(
        uploads.map((upload, i) =>
          fetch(upload.url, {
            method: "PUT",
            headers: upload.headers,
            body: fileList[i].file,
          }).then((r) => {
            if (!r.ok) throw new Error(`Upload de '${fileList[i].file.name}' falhou (HTTP ${r.status})`);
          }),
        ),
      );

      // Separate keys by role
      const templateKey = uploads.find((u) => u.role === "template")?.key ?? null;
      const fluxoKey = uploads.find((u) => u.role === "fluxo")?.key ?? null;
      const unidadesKeys = uploads.filter((u) => u.role === "unidades").map((u) => u.key);

      // 3. Trigger the worker
      setJobStatus("processing");
      const workerBody: Record<string, unknown> = {
        bucket,
        jobId,
        fluxoKey,
        unidadesKeys,
        fiiFundName: selectedFund.trim(),
      };
      if (templateKey) workerBody.templateKey = templateKey;

      const workerRes = await fetch(WORKER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(workerBody),
      });
      const workerText = await workerRes.text();
      if (workerRes.status !== 202 && workerRes.status !== 200) {
        const b = tryParseJsonRecord(workerText) as Record<string, string>;
        throw new Error(b.error ?? `Erro ao iniciar processamento (${workerRes.status})`);
      }

      // 4. Hand off to context — polling survives page navigation.
      startPolling(jobId);
      void loadHistory(selectedFund);

    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Erro desconhecido.");
      setJobStatus("error");
    }
  };

  const loadRunArtifacts = async (run: ReportRun) => {
    if (!BASE_URL) return;
    setErrorMsg(null);
    try {
      const res = await fetch(`${REPORT_RUNS_URL}/${run.id}/presign`);
      const presignRunText = await res.text();
      if (!res.ok) {
        const b = tryParseJsonRecord(presignRunText) as Record<string, string>;
        throw new Error(b.error ?? `Erro ao obter URLs (${res.status})`);
      }
      const artifact = parseJsonText<{ configUrl: string; pdfUrl: string; pptxUrl?: string }>(
        presignRunText,
        "URLs do relatório",
        res.status,
      );
      const configRes = await fetch(artifact.configUrl);
      const cfgHistText = await configRes.text();
      if (!configRes.ok) throw new Error("Falha ao carregar dados dos gráficos.");
      setLoadedArtifacts(
        parseJsonText<ConfigPayload>(cfgHistText, "config.json", configRes.status),
        artifact.pdfUrl,
        artifact.pptxUrl,
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Erro ao carregar controle.");
    }
  };

  const downloadFile = async (
    url: string,
    filename: string,
    setLoading: (b: boolean) => void,
  ) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Download falhou (HTTP ${res.status})`);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      try {
        const a = document.createElement("a");
        a.href = objectUrl;
        a.download = filename;
        a.rel = "noopener";
        document.body.appendChild(a);
        a.click();
        a.remove();
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Falha ao baixar o arquivo.");
    } finally {
      setLoading(false);
    }
  };

  const isRunning = jobStatus !== "idle" && jobStatus !== "completed" && jobStatus !== "error";
  const canRun = !!fluxoFile && unidadesFiles.length > 0 && fundReady && !!BASE_URL && !isRunning;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-3xl space-y-8">

      {/* ── Fundo ──────────────────────────────────────────────────────── */}
      <section
        aria-label="Fundo do controle"
        className="min-w-0 overflow-hidden rounded-xl border border-border/70 bg-card/90 px-4 py-5 shadow-sm sm:px-5 sm:py-6"
      >
        <h2 className="mb-4 text-sm font-semibold text-foreground">Fundo</h2>

        {!namesError && fundNames.length > 0 && (
          <div className="space-y-1.5">
            <Label htmlFor={fundSelectId} className="text-xs text-muted-foreground">
              Controle para
            </Label>
            <Select value={selectedFund} onValueChange={setSelectedFund} disabled={loadingFunds}>
              <SelectTrigger id={fundSelectId} className="h-9 w-full max-w-md text-sm">
                <SelectValue placeholder={loadingFunds ? "Carregando…" : "Selecionar fundo"} />
              </SelectTrigger>
              <SelectContent>
                {fundNames.map((name) => (
                  <SelectItem key={name} value={name}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {loadingFunds && (
          <p className="text-sm text-muted-foreground" role="status">Carregando lista de fundos…</p>
        )}
        {namesError && (
          <p className="text-sm text-amber-600 dark:text-amber-500" role="alert">
            Não foi possível carregar a lista de fundos ({namesError}).
          </p>
        )}
        {!loadingFunds && !namesError && fundNames.length === 0 && (
          <p className="text-sm text-muted-foreground" role="status">
            Nenhum fundo encontrado. Gere o export de gráficos ou atualize os dados.
          </p>
        )}
      </section>

      {/* ── Entrada ────────────────────────────────────────────────────── */}
      <section
        aria-label="Upload de arquivos"
        className="min-w-0 overflow-hidden rounded-xl border border-border/70 bg-card/90 px-4 py-5 shadow-sm sm:px-5 sm:py-6"
      >
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-foreground">Entrada</h2>
          {(templateFile || fluxoFile || unidadesFiles.length > 0) && (
            <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={clearAll} disabled={isRunning}>
              Limpar tudo
            </Button>
          )}
        </div>

        <div className="space-y-5">
          {/* Modelo PPTX */}
          <SingleFilePicker
            label="Modelo PPTX (opcional)"
            description="Template PowerPoint para geração do PPTX"
            accept={PPTX_ACCEPT}
            file={templateFile}
            icon={Presentation}
            onFile={setTemplateFile}
            onClear={() => setTemplateFile(null)}
            disabled={isRunning}
          />

          {/* Fluxo Financeiro */}
          <SingleFilePicker
            label="Fluxo Financeiro *"
            description="BASE_FLUXO.csv"
            accept={SPREADSHEET_ACCEPT}
            file={fluxoFile}
            icon={FileText}
            onFile={setFluxoFile}
            onClear={() => setFluxoFile(null)}
            disabled={isRunning}
          />

          {/* Unidades / Vendas SPE */}
          <div className="space-y-2">
            <Label htmlFor={unidadesInputId} className="text-xs font-medium text-muted-foreground">
              Unidades / Vendas SPE * (vários arquivos)
            </Label>
            <input
              ref={unidadesRef}
              id={unidadesInputId}
              type="file"
              accept={SPREADSHEET_ACCEPT}
              multiple
              className="sr-only"
              disabled={isRunning}
              aria-label="Selecionar arquivos de unidades"
              onChange={(e) => {
                if (e.target.files?.length) addUnidadesFiles(e.target.files);
                e.target.value = "";
              }}
            />

            <div
              role="button"
              tabIndex={isRunning ? -1 : 0}
              aria-label="Abrir seletor de arquivos SPE ou arrastar aqui"
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  unidadesRef.current?.click();
                }
              }}
              onClick={() => !isRunning && unidadesRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!isRunning && e.dataTransfer.files?.length) addUnidadesFiles(e.dataTransfer.files);
              }}
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border/80 bg-muted/20 px-4 py-6 transition-colors",
                "hover:border-primary/50 hover:bg-muted/30",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                isRunning && "pointer-events-none opacity-50",
              )}
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15">
                <FileSpreadsheet className="h-4 w-4 text-primary" aria-hidden />
              </div>
              <p className="text-center text-sm text-muted-foreground">
                Arraste ou clique para adicionar arquivos SPE
                <span className="mt-0.5 block text-xs">BASE_VENDAS.csv · .xlsx · .xls · vários de uma vez</span>
              </p>
            </div>

            {unidadesRejectNote && (
              <p className="text-sm text-amber-600 dark:text-amber-500" role="status">
                {unidadesRejectNote}
              </p>
            )}

            {unidadesFiles.length > 0 && (
              <ul className="divide-y divide-border/60 rounded-lg border border-border/60 bg-background/50">
                {unidadesFiles.map((file, index) => (
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
                      onClick={() => setUnidadesFiles((prev) => prev.filter((_, i) => i !== index))}
                      disabled={isRunning}
                      aria-label={`Remover ${file.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      {/* ── Ações ──────────────────────────────────────────────────────── */}
      <section
        aria-label="Ações do controle de obras"
        className="min-w-0 overflow-hidden rounded-xl border border-border/70 bg-card/90 px-4 py-5 shadow-sm sm:px-5 sm:py-6"
      >
        <h2 className="mb-4 text-sm font-semibold text-foreground">Ações</h2>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            disabled={!canRun}
            onClick={() => void runJob()}
            className="h-9 gap-2"
          >
            {isRunning ? (
              <><Loader2 className="h-4 w-4 animate-spin" aria-hidden />{JOB_STATUS_LABEL[jobStatus]}</>
            ) : (
              <><BarChart2 className="h-4 w-4" aria-hidden />Gerar exportação</>
            )}
          </Button>

          {isRunning && (
            <Button
              type="button"
              variant="ghost"
              className="h-9 gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={clearJob}
            >
              <X className="h-4 w-4" aria-hidden />
              Cancelar
            </Button>
          )}

          {jobStatus === "completed" && pdfUrl && (
            <Button
              type="button"
              variant="outline"
              disabled={pdfDownloading}
              onClick={() => void downloadFile(pdfUrl, "controle-obras-fidc.pdf", setPdfDownloading)}
              className="h-9 gap-2"
            >
              {pdfDownloading
                ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden />Baixando…</>
                : <><FileDown className="h-4 w-4" aria-hidden />Download PDF</>}
            </Button>
          )}

          {jobStatus === "completed" && pptxUrl && (
            <Button
              type="button"
              variant="outline"
              disabled={pptxDownloading}
              onClick={() => void downloadFile(pptxUrl, "controle-obras-fidc.pptx", setPptxDownloading)}
              className="h-9 gap-2"
            >
              {pptxDownloading
                ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden />Baixando…</>
                : <><Presentation className="h-4 w-4" aria-hidden />Download PPTX</>}
            </Button>
          )}

          {jobStatus === "completed" && (
            <span className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4" aria-hidden />Concluído
            </span>
          )}
        </div>

        {/* Progress steps */}
        {isRunning && (
          <div className="mt-4 space-y-1">
            {(["presigning", "uploading", "processing", "rendering"] as JobStatus[]).map((step) => {
              const steps = ["presigning", "uploading", "processing", "rendering"];
              const done = steps.indexOf(step) < steps.indexOf(jobStatus as string);
              const active = step === jobStatus;
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
                  {JOB_STATUS_LABEL[step]}
                </div>
              );
            })}
          </div>
        )}

        {errorMsg && (
          <p className="mt-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
            {errorMsg}
          </p>
        )}

        {!BASE_URL && (
          <p className="mt-3 text-xs text-amber-600 dark:text-amber-500" role="status">
            Configure <code className="rounded bg-muted px-1 py-0.5">VITE_REPORT_API_URL</code> com a URL do API Gateway.
          </p>
        )}

        {BASE_URL && !canRun && !isRunning && (
          <p className="mt-3 text-xs text-muted-foreground">
            {!fundReady
              ? "Aguarde o fundo estar disponível e selecionado."
              : !fluxoFile
                ? "Selecione o arquivo de Fluxo Financeiro."
                : unidadesFiles.length === 0
                  ? "Adicione ao menos um arquivo de Unidades/Vendas SPE."
                  : ""}
          </p>
        )}
      </section>

      {/* ── Histórico ──────────────────────────────────────────────────── */}
      {BASE_URL && fundReady && (
        <section
          aria-label="Histórico de controles"
          className="min-w-0 overflow-hidden rounded-xl border border-border/70 bg-card/90 px-4 py-5 shadow-sm sm:px-5 sm:py-6"
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-foreground">Histórico recente</h2>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 text-xs"
              disabled={loadingHistory}
              onClick={() => void loadHistory(selectedFund)}
            >
              {loadingHistory
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                : <History className="h-3.5 w-3.5" aria-hidden />}
              Atualizar
            </Button>
          </div>

          {historyError && (
            <p className="text-sm text-amber-600 dark:text-amber-500" role="alert">{historyError}</p>
          )}

          {!loadingHistory && !historyError && runs.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum controle salvo para este fundo.</p>
          )}

          {runs.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60">
                    <th className="pb-2 pr-4 text-left text-xs font-medium text-muted-foreground">Fundo</th>
                    <th className="pb-2 pr-4 text-left text-xs font-medium text-muted-foreground">Data</th>
                    <th className="pb-2 pr-4 text-left text-xs font-medium text-muted-foreground">Status</th>
                    <th className="pb-2 text-left text-xs font-medium text-muted-foreground">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {runs.map((run) => (
                    <tr key={run.id} className="group">
                      <td className="py-2.5 pr-4 font-medium text-foreground">{run.fundName}</td>
                      <td className="py-2.5 pr-4 text-muted-foreground">{formatDate(run.createdAt)}</td>
                      <td className="py-2.5 pr-4">
                        <span className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                          run.status === "completed"
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                        )}>
                          {run.status === "completed" ? "Concluído" : run.status}
                        </span>
                      </td>
                      <td className="py-2.5">
                        <div className="flex items-center gap-1.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 gap-1.5 text-xs"
                            onClick={() => void loadRunArtifacts(run)}
                          >
                            <BarChart2 className="h-3.5 w-3.5" aria-hidden />
                            Ver gráficos
                          </Button>
                          {run.pptxKey && (
                            <span className="text-xs text-muted-foreground">
                              <Presentation className="inline h-3.5 w-3.5" aria-hidden /> PPTX
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* ── Chart preview ──────────────────────────────────────────────── */}
      {configData && (
        <section aria-label="Pré-visualização dos gráficos" className="space-y-6">
          <h2 className="text-lg font-semibold text-foreground">Pré-visualização</h2>
          {(Object.keys(CHART_TITLES) as Array<keyof typeof CHART_TITLES>).map((key) => {
            const fig = configData[key];
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
