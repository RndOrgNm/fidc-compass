import { FUNDS_API_BASE_URL } from "./config";
import type { MonitoramentoPipelineStatus } from "@/data/pipelineData";

export type MonitoramentoStatus =
  | "alertas_deteccao"
  | "correcoes_acoes"
  | "relatorios_em_andamento"
  | "em_conformidade_auditoria"
  | "encerrado";

export interface MonitoramentoResponse {
  id: string;
  title: string;
  fund_id: string | null;
  fund_name?: string | null;
  period: string;
  status: MonitoramentoStatus;
  assigned_to: string | null;
  pending_items: string[];
  status_started_at: string;
  created_at: string;
  updated_at: string;
}

export interface MonitoramentoListResponse {
  items: MonitoramentoResponse[];
  total: number;
}

export interface MonitoramentoFilters {
  status?: MonitoramentoStatus;
  fund_id?: string;
  limit?: number;
  offset?: number;
}

export interface MonitoramentoUpdatePayload {
  status?: MonitoramentoStatus;
  assigned_to?: string | null;
  pending_items?: string[];
  status_started_at?: string;
}

export interface MonitoramentoCreatePayload {
  title: string;
  period: string;
  fund_id?: string | null;
  status?: MonitoramentoStatus;
  assigned_to?: string | null;
}

/** Pipeline item shape expected by MonitoramentoCard, MonitoramentoKanban, etc. */
export interface MonitoramentoPipelineItem {
  id: string;
  title: string;
  fundName: string | null;
  period: string;
  status: MonitoramentoPipelineStatus;
  assigned_to: string | null;
  pending_items: string[];
  days_in_status: number;
}

/** Parse ISO-like timestamp. If no timezone (Z or ±HH:MM), assume UTC (common for APIs). */
function parseTimestamp(ts: string): number {
  const s = ts.trim();
  if (s.endsWith("Z") || /[+-]\d{2}:?\d{2}$/.test(s)) return new Date(s).getTime();
  return new Date(s.replace(" ", "T") + "Z").getTime();
}

function daysBetween(start: string, end: Date = new Date()): number {
  const s = parseTimestamp(start);
  const e = end.getTime();
  return Math.max(0, Math.floor((e - s) / (1000 * 60 * 60 * 24)));
}

export function mapMonitoramentoToPipelineItem(r: MonitoramentoResponse): MonitoramentoPipelineItem {
  return {
    id: r.id,
    title: r.title,
    fundName: r.fund_name ?? null,
    period: r.period,
    status: r.status as MonitoramentoPipelineStatus,
    assigned_to: r.assigned_to,
    pending_items: r.pending_items ?? [],
    days_in_status: daysBetween(r.status_started_at),
  };
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorMessage = "An error occurred";
    try {
      const errorData = await response.json();
      errorMessage =
        typeof errorData.detail === "string"
          ? errorData.detail
          : errorData.detail?.[0]?.msg || errorMessage;
    } catch {
      errorMessage = response.statusText || `HTTP ${response.status}`;
    }
    throw new Error(errorMessage);
  }
  return response.json();
}

export async function listMonitoramentos(
  filters: MonitoramentoFilters = {}
): Promise<{ items: MonitoramentoPipelineItem[]; total: number }> {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.fund_id) params.set("fund_id", filters.fund_id);
  if (filters.limit != null) params.set("limit", String(filters.limit));
  if (filters.offset != null) params.set("offset", String(filters.offset));

  const qs = params.toString();
  const url = `${FUNDS_API_BASE_URL}/monitoramento${qs ? `?${qs}` : ""}`;

  const response = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  const data = await handleResponse<MonitoramentoListResponse>(response);
  return {
    items: data.items.map(mapMonitoramentoToPipelineItem),
    total: data.total,
  };
}

export async function getMonitoramento(id: string): Promise<MonitoramentoPipelineItem | null> {
  const response = await fetch(`${FUNDS_API_BASE_URL}/monitoramento/${id}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  if (response.status === 404) return null;
  const data = await handleResponse<MonitoramentoResponse>(response);
  return mapMonitoramentoToPipelineItem({ ...data, fund_name: null });
}

export async function createMonitoramento(
  payload: MonitoramentoCreatePayload
): Promise<MonitoramentoPipelineItem> {
  const body: Record<string, unknown> = {
    title: payload.title,
    period: payload.period,
  };
  if (payload.fund_id !== undefined) body.fund_id = payload.fund_id;
  if (payload.status != null) body.status = payload.status;
  if (payload.assigned_to !== undefined) body.assigned_to = payload.assigned_to;

  const response = await fetch(`${FUNDS_API_BASE_URL}/monitoramento`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await handleResponse<MonitoramentoResponse>(response);
  return mapMonitoramentoToPipelineItem({ ...data, fund_name: null });
}

export async function deleteMonitoramento(id: string): Promise<void> {
  const response = await fetch(`${FUNDS_API_BASE_URL}/monitoramento/${id}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
  });
  if (!response.ok) {
    let errorMessage = "An error occurred";
    try {
      const errorData = await response.json();
      errorMessage =
        typeof errorData.detail === "string"
          ? errorData.detail
          : errorData.detail?.[0]?.msg || errorMessage;
    } catch {
      errorMessage = response.statusText || `HTTP ${response.status}`;
    }
    throw new Error(errorMessage);
  }
}

export async function updateMonitoramento(
  id: string,
  payload: MonitoramentoUpdatePayload
): Promise<MonitoramentoPipelineItem> {
  const body: Record<string, unknown> = {};
  if (payload.status != null) body.status = payload.status;
  if (payload.assigned_to !== undefined) body.assigned_to = payload.assigned_to;
  if (payload.pending_items != null) body.pending_items = payload.pending_items;
  if (payload.status_started_at != null) body.status_started_at = payload.status_started_at;

  const response = await fetch(`${FUNDS_API_BASE_URL}/monitoramento/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await handleResponse<MonitoramentoResponse>(response);
  return mapMonitoramentoToPipelineItem({ ...data, fund_name: null });
}
