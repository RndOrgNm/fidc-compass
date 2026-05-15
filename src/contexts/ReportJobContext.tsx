/**
 * ReportJobContext
 *
 * Holds the report-generation job state (status, results) and runs the artifact
 * polling loop at the app level — above the router — so it survives page
 * navigation.  The component only handles presign / upload / POST /report (fast,
 * seconds) and then hands off to startPolling(), which keeps running even when
 * the user switches pages.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

// ── Shared types ──────────────────────────────────────────────────────────────

export type JobStatus =
  | "idle"
  | "presigning"
  | "uploading"
  | "processing"
  | "rendering"
  | "completed"
  | "error";

export type ConfigPayload = {
  spe_order: string[];
  [key: string]: unknown;   // chart figures — cast to PlotlyFig in consumers
};

// ── API constants ─────────────────────────────────────────────────────────────

const BASE_URL =
  (import.meta.env.VITE_REPORT_API_URL as string | undefined)?.replace(/\/$/, "") ?? "";
const ARTIFACTS_URL = `${BASE_URL}/artifacts`;

const POLL_MAX_ATTEMPTS = 450;   // 450 × 2 s ≈ 15 min (matches Lambda timeout)
const POLL_INTERVAL_MS  = 2000;

// ── localStorage helpers ──────────────────────────────────────────────────────

const JOB_STORAGE_KEY = "report_active_job";

function saveActiveJob(jobId: string) {
  try {
    localStorage.setItem(JOB_STORAGE_KEY, JSON.stringify({ jobId, startedAt: Date.now() }));
  } catch { /* ignore */ }
}

function clearActiveJob() {
  try { localStorage.removeItem(JOB_STORAGE_KEY); } catch { /* ignore */ }
}

function loadActiveJob(): string | null {
  try {
    const raw = localStorage.getItem(JOB_STORAGE_KEY);
    if (!raw) return null;
    const { jobId, startedAt } = JSON.parse(raw) as { jobId?: string; startedAt?: number };
    // Discard entries older than 30 min (Lambda max runtime is 15 min).
    if (!jobId || Date.now() - (startedAt ?? 0) > 30 * 60 * 1000) {
      clearActiveJob();
      return null;
    }
    return jobId;
  } catch { return null; }
}

// ── Parsing utilities (duplicated here to keep context self-contained) ────────

function tryParseJsonRecord(text: string): Record<string, unknown> {
  try {
    const v = JSON.parse(text) as unknown;
    return typeof v === "object" && v !== null && !Array.isArray(v)
      ? (v as Record<string, unknown>)
      : {};
  } catch { return {}; }
}

function parseJsonText<T>(text: string, label: string, httpStatus: number): T {
  const t = text.trimStart();
  if (!t.startsWith("{") && !t.startsWith("[")) {
    const isHtml = /^<!doctype/i.test(t) || /^<html/i.test(t) || /^<\?xml/i.test(t);
    throw new Error(
      isHtml
        ? `${label}: servidor devolveu ${/^<\?xml/i.test(t) ? "XML" : "HTML"} em vez de JSON (HTTP ${httpStatus}).`
        : `${label}: resposta não é JSON (HTTP ${httpStatus}).`,
    );
  }
  try { return JSON.parse(text) as T; }
  catch { throw new Error(`${label}: JSON inválido (HTTP ${httpStatus}).`); }
}

// ── Context definition ────────────────────────────────────────────────────────

type ReportJobContextValue = {
  jobStatus: JobStatus;
  errorMsg: string | null;
  configData: ConfigPayload | null;
  pdfUrl: string | null;
  pptxUrl: string | null;

  /** Called by the component during the quick presign / upload / POST steps. */
  setJobStatus: (s: JobStatus) => void;
  setErrorMsg:  (m: string | null) => void;

  /**
   * Called after POST /report returns 202.  Saves the jobId to localStorage
   * and starts the artifact poll loop inside this Provider (which survives
   * page navigation).
   */
  startPolling: (jobId: string) => void;

  /** Used by the history panel to display a previously generated report. */
  setLoadedArtifacts: (config: ConfigPayload, pdf: string, pptx?: string) => void;

  /** Resets all job state and cancels any in-progress poll. */
  clearJob: () => void;
};

const ReportJobContext = createContext<ReportJobContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────

export function ReportJobProvider({ children }: { children: ReactNode }) {
  const [jobStatus,  setJobStatus]  = useState<JobStatus>(() =>
    loadActiveJob() ? "rendering" : "idle",
  );
  const [errorMsg,   setErrorMsg]   = useState<string | null>(null);
  const [configData, setConfigData] = useState<ConfigPayload | null>(null);
  const [pdfUrl,     setPdfUrl]     = useState<string | null>(null);
  const [pptxUrl,    setPptxUrl]    = useState<string | null>(null);

  // Tracks which jobId is currently being polled.  Setting to null cancels.
  const activeJobIdRef = useRef<string | null>(null);

  const _runPoll = useCallback(async (jobId: string) => {
    const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

    for (let i = 0; i < POLL_MAX_ATTEMPTS; i++) {
      // Cancelled (clearJob was called or a new job started).
      if (activeJobIdRef.current !== jobId) return;

      await delay(POLL_INTERVAL_MS);

      if (activeJobIdRef.current !== jobId) return;

      let res: Response;
      let raw: string;
      try {
        res = await fetch(ARTIFACTS_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jobId }),
        });
        raw = await res.text();
      } catch {
        // Network error — keep polling.
        continue;
      }

      if (activeJobIdRef.current !== jobId) return;

      if (res.status === 404) {
        setErrorMsg("Job não encontrado no servidor.");
        setJobStatus("error");
        clearActiveJob();
        return;
      }

      // Legacy artifact Lambda: 409 while processing.
      if (res.status === 409) {
        const b = tryParseJsonRecord(raw) as { status?: string; detail?: string; error?: string };
        if (b.status === "failed") {
          setErrorMsg(b.detail ?? b.error ?? "O processamento falhou no servidor.");
          setJobStatus("error");
          clearActiveJob();
          return;
        }
        continue;
      }

      if (res.status === 500) {
        const b = tryParseJsonRecord(raw) as Record<string, string>;
        setErrorMsg(b.error ?? "Erro interno ao verificar o processamento.");
        setJobStatus("error");
        clearActiveJob();
        return;
      }

      if (res.status !== 200) {
        const trimmed = raw.trimStart();
        const isHtml = /^<!doctype/i.test(trimmed) || /^<html/i.test(trimmed);
        setErrorMsg(
          isHtml
            ? `Artefatos: servidor devolveu HTML (HTTP ${res.status}).`
            : `Resposta inesperada ao verificar artefatos (${res.status}).`,
        );
        setJobStatus("error");
        clearActiveJob();
        return;
      }

      const data = parseJsonText<{
        ready?: boolean;
        jobId?: string;
        status?: string;
        detail?: string;
        configUrl?: string;
        pdfUrl?: string;
        pptxUrl?: string;
      }>(raw, "Artefatos", res.status);

      if (data.ready === false) {
        if (data.status === "failed") {
          setErrorMsg(data.detail ?? "O processamento falhou no servidor.");
          setJobStatus("error");
          clearActiveJob();
          return;
        }
        continue;
      }

      if (!data.configUrl || !data.pdfUrl || !data.jobId) {
        setErrorMsg("Resposta inválida ao verificar artefatos.");
        setJobStatus("error");
        clearActiveJob();
        return;
      }

      // Artifacts ready — fetch config.json and store everything.
      try {
        const configRes  = await fetch(data.configUrl);
        const configText = await configRes.text();
        if (!configRes.ok) throw new Error("Falha ao carregar os dados dos gráficos.");
        if (activeJobIdRef.current !== jobId) return;

        setConfigData(parseJsonText<ConfigPayload>(configText, "config.json", configRes.status));
        setPdfUrl(data.pdfUrl);
        setPptxUrl(data.pptxUrl ?? null);
        setJobStatus("completed");
        clearActiveJob();
      } catch (err) {
        if (activeJobIdRef.current !== jobId) return;
        setErrorMsg(err instanceof Error ? err.message : "Erro ao carregar artefatos.");
        setJobStatus("error");
        clearActiveJob();
      }
      return;
    }

    // Exhausted all attempts.
    if (activeJobIdRef.current !== jobId) return;
    setErrorMsg(
      "Timeout: o processamento não foi concluído a tempo (~15 min). " +
      "Tente novamente ou verifique os logs do Lambda.",
    );
    setJobStatus("error");
    clearActiveJob();
  }, []);

  const startPolling = useCallback((jobId: string) => {
    activeJobIdRef.current = jobId;
    saveActiveJob(jobId);
    setJobStatus("rendering");
    setErrorMsg(null);
    void _runPoll(jobId);
  }, [_runPoll]);

  const setLoadedArtifacts = useCallback(
    (config: ConfigPayload, pdf: string, pptx?: string) => {
      activeJobIdRef.current = null;
      setConfigData(config);
      setPdfUrl(pdf);
      setPptxUrl(pptx ?? null);
      setJobStatus("completed");
    },
    [],
  );

  const clearJob = useCallback(() => {
    activeJobIdRef.current = null;
    clearActiveJob();
    setJobStatus("idle");
    setErrorMsg(null);
    setConfigData(null);
    setPdfUrl(null);
    setPptxUrl(null);
  }, []);

  // On mount: resume polling if a job was in progress when the page was loaded/refreshed.
  useEffect(() => {
    const savedJobId = loadActiveJob();
    if (savedJobId) startPolling(savedJobId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ReportJobContext.Provider
      value={{
        jobStatus, errorMsg, configData, pdfUrl, pptxUrl,
        setJobStatus, setErrorMsg,
        startPolling, setLoadedArtifacts, clearJob,
      }}
    >
      {children}
    </ReportJobContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useReportJob(): ReportJobContextValue {
  const ctx = useContext(ReportJobContext);
  if (!ctx) throw new Error("useReportJob must be used inside <ReportJobProvider>");
  return ctx;
}
