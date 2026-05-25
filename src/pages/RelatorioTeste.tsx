import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useReportJob, type ConfigPayload } from "@/contexts/ReportJobContext";
import {
  FileSpreadsheet, FileDown, BarChart2, History, Loader2, Trash2, X,
  CheckCircle2, Presentation, ChevronLeft, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PdfViewerCanvas } from "@/components/PdfViewerCanvas";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { extractFundNamesFromPlotlyPayload } from "@/components/graficos/PlotlyFundFilterFigure";
import { AppLayout } from "@/components/layout";
import { loadIpca, type IpcaRow } from "@/lib/ibge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const SPREADSHEET_ACCEPT =
  ".csv,.xlsx,.xls,text/csv,application/vnd.ms-excel," +
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";


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

type ReportRun = {
  id: string;
  fundName: string;
  jobId: string;
  configKey: string;
  pdfKey: string;
  pptxKey?: string;
  status: string;
  version: number;
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

const PT_MONTHS = [
  "JAN", "FEV", "MAR", "ABR", "MAI", "JUN",
  "JUL", "AGO", "SET", "OUT", "NOV", "DEZ",
];

/**
 * Base report filename: `Relatório {fundo} - {MES} {Dia}`.
 * MES/Dia come from the run's creation date (São Paulo timezone); when no
 * date is given (a freshly generated report) the current date is used.
 */
function reportFileBase(fundName: string, iso: string | null): string {
  const utc = iso
    ? (/Z|[+-]\d{2}:\d{2}$/.test(iso) ? iso : iso + "Z")
    : new Date().toISOString();
  const parts = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo", month: "numeric", day: "numeric",
  }).formatToParts(new Date(utc));
  const month = Number(parts.find((p) => p.type === "month")?.value ?? "1");
  const dia = Number(parts.find((p) => p.type === "day")?.value ?? "1");
  return `Relatório ${fundName} - ${PT_MONTHS[month - 1]} ${dia}`;
}

// ── File role helpers ──────────────────────────────────────────────────────────

type FileRole = "fluxo" | "base_outros" | "unidades";

const FILE_ROLE_LABELS: Record<FileRole, string> = {
  fluxo: "Fluxo Financeiro",
  base_outros: "Quadro Geral & DRE",
  unidades: "Unidades / SPE",
};

function detectRole(filename: string): FileRole {
  const n = filename.toLowerCase();
  if (n.includes("fluxo")) return "fluxo";
  if (n.includes("outros") || n.includes("dre") || n.includes("quadro")) return "base_outros";
  return "unidades";
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function RelatorioTeste() {
  const fundSelectId = useId();
  const filesInputId = useId();
  const filesRef = useRef<HTMLInputElement>(null);

  // Fundo selection
  const [fundNames, setFundNames] = useState<string[]>([]);
  const [selectedFund, setSelectedFund] = useState("");
  const [loadingFunds, setLoadingFunds] = useState(true);
  const [namesError, setNamesError] = useState<string | null>(null);

  // Unified file list
  const [allFiles, setAllFiles] = useState<Array<{ file: File; role: FileRole }>>([]);
  const [fileRejectNote, setFileRejectNote] = useState<string | null>(null);

  // Job state lives in ReportJobContext so polling survives page navigation.
  const {
    jobStatus, setJobStatus, errorMsg, setErrorMsg,
    pdfUrl, pptxUrl,
    startPolling, setLoadedArtifacts, clearJob,
  } = useReportJob();
  const [pdfDownloading, setPdfDownloading] = useState(false);
  const [pptxDownloading, setPptxDownloading] = useState(false);

  // Fund + date of the report currently in the preview — drives download filenames.
  const [currentReport, setCurrentReport] =
    useState<{ fundName: string; createdAt: string | null } | null>(null);

  // PDF viewer state
  const [pdfBinaryData, setPdfBinaryData] = useState<ArrayBuffer | null>(null);
  const [pdfCurrentPage, setPdfCurrentPage] = useState(1);
  const [pdfTotalPages, setPdfTotalPages] = useState(1);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfFetchError, setPdfFetchError] = useState<string | null>(null);

  // Parâmetros do Fundo
  const [premio, setPremio] = useState<string>("");
  const [ipcaRows, setIpcaRows] = useState<IpcaRow[]>([]);
  const [loadingIpca, setLoadingIpca] = useState(true);
  const [ipcaError, setIpcaError] = useState<string | null>(null);
  const [ipcaExpanded, setIpcaExpanded] = useState(false);
  const [ipcaVisible, setIpcaVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoadingIpca(true);
    setIpcaError(null);
    loadIpca()
      .then((rows) => { if (!cancelled) setIpcaRows(rows); })
      .catch((e: Error) => { if (!cancelled) setIpcaError(e.message); })
      .finally(() => { if (!cancelled) setLoadingIpca(false); });
    return () => { cancelled = true; };
  }, []);

  // Fetch PDF binary whenever a new pdfUrl becomes available
  useEffect(() => {
    if (!pdfUrl) {
      setPdfBinaryData(null);
      setPdfCurrentPage(1);
      return;
    }
    let cancelled = false;
    setPdfLoading(true);
    setPdfFetchError(null);
    fetch(pdfUrl)
      .then((r) => {
        if (!r.ok) throw new Error(`Falha ao carregar PDF (${r.status})`);
        return r.arrayBuffer();
      })
      .then((buf) => {
        if (!cancelled) {
          setPdfBinaryData(buf);
          setPdfCurrentPage(1);
        }
      })
      .catch((e: Error) => { if (!cancelled) setPdfFetchError(e.message); })
      .finally(() => { if (!cancelled) setPdfLoading(false); });
    return () => { cancelled = true; };
  }, [pdfUrl]);

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

  // ── File management ───────────────────────────────────────────────────────

  const addFiles = useCallback((list: FileList | File[]) => {
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
    setFileRejectNote(
      rejected > 0 ? `${rejected} arquivo(s) ignorado(s) — use CSV ou Excel (.xlsx / .xls).` : null,
    );
    if (!valid.length) return;
    setAllFiles((prev) => {
      const seen = new Set(prev.map((p) => `${p.file.name}-${p.file.size}`));
      const merged = [...prev];
      for (const f of valid) {
        const key = `${f.name}-${f.size}`;
        if (!seen.has(key)) { seen.add(key); merged.push({ file: f, role: detectRole(f.name) }); }
      }
      return merged;
    });
  }, []);

  const clearAll = () => {
    clearJob();
    setAllFiles([]);
    setFileRejectNote(null);
    setPdfBinaryData(null);
    setPdfCurrentPage(1);
  };

  // ── Job flow ──────────────────────────────────────────────────────────────

  const runJob = async () => {
    const hasFluxo = allFiles.some((f) => f.role === "fluxo");
    const hasUnidades = allFiles.some((f) => f.role === "unidades");
    if (!hasFluxo || !hasUnidades || !fundReady || !BASE_URL) return;

    clearJob();
    setJobStatus("presigning");

    try {
      const fileList = allFiles;

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
      const fluxoKey = uploads.find((u) => u.role === "fluxo")?.key ?? null;
      const baseOutrosKey = uploads.find((u) => u.role === "base_outros")?.key ?? null;
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
      if (baseOutrosKey) workerBody.baseOutrosKey = baseOutrosKey;
      const premioTrimmed = premio.trim().replace(",", ".");
      if (premioTrimmed) workerBody.taxaPremio = premioTrimmed;
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
      setCurrentReport({ fundName: selectedFund.trim(), createdAt: new Date().toISOString() });
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
      setCurrentReport({ fundName: run.fundName, createdAt: run.createdAt });
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
  const reportBaseName = reportFileBase(
    currentReport?.fundName ?? selectedFund.trim(),
    currentReport?.createdAt ?? null,
  );
  const hasFluxo = allFiles.some((f) => f.role === "fluxo");
  const hasUnidades = allFiles.some((f) => f.role === "unidades");
  const canRun = hasFluxo && hasUnidades && fundReady && !!BASE_URL && !isRunning;

  // ── Render ────────────────────────────────────────────────────────────────

  const fundSelector = (
    <Select value={selectedFund} onValueChange={setSelectedFund} disabled={loadingFunds}>
      <SelectTrigger id={fundSelectId} className="h-8 w-60 text-sm">
        <SelectValue placeholder={loadingFunds ? "Carregando…" : "Selecionar fundo"} />
      </SelectTrigger>
      <SelectContent>
        {fundNames.map((name) => (
          <SelectItem key={name} value={name}>{name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  const currentYear = new Date().getFullYear();
  const visibleIpcaRows = ipcaExpanded ? ipcaRows : ipcaRows.filter((r) => r.ano === currentYear);

  return (
    <AppLayout headerRight={fundSelector}>
    <div className="space-y-10">

      {namesError && (
        <p className="text-sm text-amber-600 dark:text-amber-500" role="alert">
          Não foi possível carregar a lista de fundos ({namesError}).
        </p>
      )}

      {/* ── Parâmetros do Fundo ────────────────────────────────────────── */}
      <section
        aria-label="Parâmetros do fundo"
        className="min-w-0"
      >
        <h2 className="mb-4 text-sm font-semibold text-foreground">Parâmetros do Fundo</h2>

        {/* Prêmio */}
        <div className="mb-6 max-w-xs space-y-1.5">
          <Label htmlFor="premio-input" className="text-xs text-muted-foreground">
            Prêmio (% a.a.)
          </Label>
          <div className="relative">
            <Input
              id="premio-input"
              type="text"
              inputMode="decimal"
              placeholder="ex: 13,00"
              value={premio}
              onChange={(e) => setPremio(e.target.value)}
              className="h-9 pr-8 text-sm"
            />
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
              %
            </span>
          </div>
        </div>

        {/* IPCA table — hidden by default, shown on demand */}
        <div>
          <button
            type="button"
            onClick={() => setIpcaVisible((v) => !v)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", ipcaVisible && "rotate-90")} aria-hidden />
            IPCA — Número-índice e variação mensal (IBGE)
          </button>

          {ipcaVisible && (
            <div className="mt-3">
              {loadingIpca && (
                <p className="text-sm text-muted-foreground" role="status">Carregando IPCA…</p>
              )}
              {ipcaError && (
                <p className="text-sm text-amber-600 dark:text-amber-500" role="alert">
                  Não foi possível carregar o IPCA: {ipcaError}
                </p>
              )}
              {!loadingIpca && !ipcaError && ipcaRows.length > 0 && (
                <div className="w-fit">
                  <table className="border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-border/60 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        <th className="py-2 pr-8 text-left">Período</th>
                        <th className="py-2 pr-8 text-right">
                          Número Índice
                          <span className="block font-normal normal-case tracking-normal">(Dez 1993 = 100)</span>
                        </th>
                        <th className="py-2 text-right">
                          No mês
                          <span className="block font-normal normal-case tracking-normal">(%)</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      {visibleIpcaRows.map((row) => (
                        <tr key={row.period} className="hover:bg-muted/30">
                          <td className="py-2 pr-8 font-medium text-foreground">
                            {row.mes}/{row.ano}
                          </td>
                          <td className="py-2 pr-8 text-right tabular-nums text-foreground">
                            {row.numeroIndice == null || isNaN(row.numeroIndice)
                              ? "—"
                              : row.numeroIndice.toLocaleString("pt-BR", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                          </td>
                          <td className={cn(
                            "py-2 text-right tabular-nums",
                            row.variacaoMes == null || isNaN(row.variacaoMes)
                              ? "text-muted-foreground"
                              : row.variacaoMes < 0
                                ? "text-red-400"
                                : "text-foreground",
                          )}>
                            {row.variacaoMes == null || isNaN(row.variacaoMes)
                              ? "—"
                              : row.variacaoMes.toLocaleString("pt-BR", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {ipcaRows.some((r) => r.ano !== currentYear) && (
                    <button
                      type="button"
                      onClick={() => setIpcaExpanded((v) => !v)}
                      className="mt-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {ipcaExpanded
                        ? "Mostrar apenas 2026"
                        : `Ver histórico completo (${ipcaRows.length} meses)`}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ── Entrada + Histórico side by side ──────────────────────────── */}
      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">

      {/* Entrada */}
      <section
        aria-label="Upload de arquivos"
        className="min-w-0 flex-1"
      >
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-foreground">Entrada</h2>
          {allFiles.length > 0 && (
            <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={clearAll} disabled={isRunning}>
              Limpar tudo
            </Button>
          )}
        </div>

        {/* Guide */}
        <div className="mb-4 space-y-1 text-xs text-muted-foreground">
          <p><span className="font-medium text-foreground">Fluxo Financeiro</span> (obrigatório) — BASE_FLUXO (.csv, .xlsx)</p>
          <p><span className="font-medium text-foreground">Quadro Geral &amp; DRE</span> (opcional) — BASE_OUTROS (.xlsx). Gera slides 6.x e 8.</p>
          <p><span className="font-medium text-foreground">Unidades / Vendas SPE</span> (obrigatório, vários) — BASE_VENDAS (.csv, .xlsx).</p>
        </div>

        <input
          ref={filesRef}
          id={filesInputId}
          type="file"
          accept={SPREADSHEET_ACCEPT}
          multiple
          className="sr-only"
          disabled={isRunning}
          aria-label="Selecionar arquivos"
          onChange={(e) => {
            if (e.target.files?.length) addFiles(e.target.files);
            e.target.value = "";
          }}
        />

        <div
          role="button"
          tabIndex={isRunning ? -1 : 0}
          aria-label="Abrir seletor de arquivos ou arrastar aqui"
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              filesRef.current?.click();
            }
          }}
          onClick={() => !isRunning && filesRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!isRunning && e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
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
            Arraste ou clique para adicionar arquivos
            <span className="mt-0.5 block text-xs">.csv · .xlsx · .xls · vários de uma vez</span>
          </p>
        </div>

        {fileRejectNote && (
          <p className="mt-2 text-sm text-amber-600 dark:text-amber-500" role="status">
            {fileRejectNote}
          </p>
        )}

        {allFiles.length > 0 && (
          <ul className="mt-3 divide-y divide-border/60 rounded-lg border border-border/60 bg-background/50">
            {allFiles.map((item, index) => (
              <li
                key={`${item.file.name}-${item.file.size}-${index}`}
                className="flex items-center gap-3 px-3 py-2.5 text-sm first:rounded-t-lg last:rounded-b-lg"
              >
                <FileSpreadsheet className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-foreground">{item.file.name}</p>
                  <p className="text-xs text-muted-foreground">{formatBytes(item.file.size)}</p>
                </div>
                <span className="shrink-0 rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  {FILE_ROLE_LABELS[item.role]}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => setAllFiles((prev) => prev.filter((_, i) => i !== index))}
                  disabled={isRunning}
                  aria-label={`Remover ${item.file.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button
            type="button"
            disabled={!canRun}
            onClick={() => void runJob()}
            className="h-9 gap-2"
          >
            {isRunning ? (
              <><Loader2 className="h-4 w-4 animate-spin" aria-hidden />{JOB_STATUS_LABEL[jobStatus]}</>
            ) : (
              <><BarChart2 className="h-4 w-4" aria-hidden />Gerar Relatório</>
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

      </section>

      {/* Histórico recente */}
      {BASE_URL && fundReady && (
        <section
          aria-label="Histórico de controles"
          className="min-w-0 lg:w-80 lg:shrink-0"
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
                    <th className="pb-2 pr-4 text-left text-xs font-medium text-muted-foreground">Versão</th>
                    <th className="pb-2 pr-4 text-left text-xs font-medium text-muted-foreground">Data</th>
                    <th className="pb-2 text-left text-xs font-medium text-muted-foreground">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {runs.map((run) => (
                    <tr key={run.id} className="group">
                      <td className="py-2.5 pr-4 font-medium text-foreground">
                        {`${reportFileBase(run.fundName, run.createdAt)} v${run.version}`}
                      </td>
                      <td className="py-2.5 pr-4 text-muted-foreground">{formatDate(run.createdAt)}</td>
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
                            Ver Relatório
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

      </div>{/* end side-by-side row */}

      {/* ── Pré-Visualização ───────────────────────────────────────────── */}
      {pdfUrl && (
        <section aria-label="Pré-visualização do relatório" className="min-w-0 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-foreground">Pré-Visualização</h2>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={pdfDownloading}
                onClick={() => void downloadFile(pdfUrl, `${reportBaseName}.pdf`, setPdfDownloading)}
                className="h-9 gap-2"
              >
                {pdfDownloading
                  ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden />Baixando…</>
                  : <><FileDown className="h-4 w-4" aria-hidden />Download PDF</>}
              </Button>
              {pptxUrl && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={pptxDownloading}
                  onClick={() => void downloadFile(pptxUrl, `${reportBaseName}.pptx`, setPptxDownloading)}
                  className="h-9 gap-2"
                >
                  {pptxDownloading
                    ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden />Baixando…</>
                    : <><Presentation className="h-4 w-4" aria-hidden />Download PPTX</>}
                </Button>
              )}
            </div>
          </div>

          <div className="rounded-lg bg-slate-100 dark:bg-slate-800 p-3" style={{ height: "80vh" }}>
            <div className="w-full h-full bg-white shadow-xl rounded-lg overflow-auto">
              {pdfLoading && (
                <div className="flex h-full items-center justify-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
                    <span className="text-sm">Carregando PDF…</span>
                  </div>
                </div>
              )}
              {pdfFetchError && !pdfLoading && (
                <p className="p-4 text-sm text-destructive">{pdfFetchError}</p>
              )}
              {!pdfLoading && !pdfFetchError && (
                <PdfViewerCanvas
                  pdfData={pdfBinaryData}
                  currentPage={pdfCurrentPage}
                  onTotalPages={setPdfTotalPages}
                  className="w-full"
                />
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Página {pdfCurrentPage} de {pdfTotalPages}
            </span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pdfCurrentPage === 1}
                onClick={() => setPdfCurrentPage((p) => p - 1)}
                className="gap-1"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden />
                Anterior
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pdfCurrentPage === pdfTotalPages}
                onClick={() => setPdfCurrentPage((p) => Math.min(p + 1, pdfTotalPages))}
                className="gap-1"
              >
                Próxima
                <ChevronRight className="h-4 w-4" aria-hidden />
              </Button>
            </div>
          </div>
        </section>
      )}

    </div>
    </AppLayout>
  );
}
