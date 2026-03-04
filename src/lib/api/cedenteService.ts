import { FUNDS_API_BASE_URL } from "./config";
import type { CedentePipelineStatus } from "@/data/pipelineData";

export type CedenteStatus =
  | "em_prospeccao"
  | "coleta_documentos"
  | "analise_credito"
  | "comite_credito"
  | "habilitado"
  | "bloqueado_desistencia";

export type Segment =
  | "comercio"
  | "industria"
  | "servicos"
  | "agronegocio"
  | "varejo"
  | "insumos";

export interface CedenteResponse {
  id: string;
  company_name: string;
  cnpj: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  segment: Segment;
  credit_score: number;
  status: CedenteStatus;
  approved_limit: number;
  proposed_limit: number;
  assigned_to: string | null;
  pending_items: string[];
  status_started_at: string;
  created_at: string;
  updated_at: string;
}

export interface CedenteListResponse {
  items: CedenteResponse[];
  total: number;
}

export interface CedenteFilters {
  status?: CedenteStatus;
  segment?: Segment;
  limit?: number;
  offset?: number;
}

export interface CedenteUpdatePayload {
  status?: CedenteStatus;
  assigned_to?: string | null;
  pending_items?: string[];
  status_started_at?: string;
}

export interface CedenteCreatePayload {
  company_name: string;
  cnpj: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  segment: Segment;
  credit_score?: number;
  approved_limit?: number;
  proposed_limit?: number;
  assigned_to?: string | null;
}

/** Pipeline item shape expected by CedenteCard, CedentesKanban, etc. */
export interface CedentePipelineItem {
  id: string;
  companyName: string;
  cnpj: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  segment: string;
  creditScore: number;
  status: CedentePipelineStatus;
  totalReceivables: number;
  approvedLimit: number;
  proposedLimit: number;
  createdAt: string;
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

export function mapCedenteToPipelineItem(r: CedenteResponse): CedentePipelineItem {
  return {
    id: r.id,
    companyName: r.company_name,
    cnpj: r.cnpj,
    contactName: r.contact_name,
    contactEmail: r.contact_email,
    contactPhone: r.contact_phone,
    segment: r.segment,
    creditScore: r.credit_score,
    status: r.status as CedentePipelineStatus,
    totalReceivables: 0,
    approvedLimit: r.approved_limit,
    proposedLimit: r.proposed_limit ?? 0,
    createdAt: r.created_at,
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

export async function listCedentes(
  filters: CedenteFilters = {}
): Promise<{ items: CedentePipelineItem[]; total: number }> {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.segment) params.set("segment", filters.segment);
  if (filters.limit != null) params.set("limit", String(filters.limit));
  if (filters.offset != null) params.set("offset", String(filters.offset));

  const qs = params.toString();
  const url = `${FUNDS_API_BASE_URL}/cedentes${qs ? `?${qs}` : ""}`;

  const response = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  const data = await handleResponse<CedenteListResponse>(response);
  return {
    items: data.items.map(mapCedenteToPipelineItem),
    total: data.total,
  };
}

export async function createCedente(payload: CedenteCreatePayload): Promise<CedentePipelineItem> {
  const body: Record<string, unknown> = {
    company_name: payload.company_name,
    cnpj: payload.cnpj,
    contact_name: payload.contact_name,
    contact_email: payload.contact_email,
    contact_phone: payload.contact_phone,
    segment: payload.segment,
  };
  if (payload.credit_score != null) body.credit_score = payload.credit_score;
  if (payload.approved_limit != null) body.approved_limit = payload.approved_limit;
  if (payload.proposed_limit != null) body.proposed_limit = payload.proposed_limit;
  if (payload.assigned_to !== undefined) body.assigned_to = payload.assigned_to;

  const response = await fetch(`${FUNDS_API_BASE_URL}/cedentes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await handleResponse<CedenteResponse>(response);
  return mapCedenteToPipelineItem(data);
}

export async function getCedente(id: string): Promise<CedentePipelineItem | null> {
  const response = await fetch(`${FUNDS_API_BASE_URL}/cedentes/${id}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  if (response.status === 404) return null;
  const data = await handleResponse<CedenteResponse>(response);
  return mapCedenteToPipelineItem(data);
}

export async function updateCedente(
  id: string,
  payload: CedenteUpdatePayload
): Promise<CedentePipelineItem> {
  const body: Record<string, unknown> = {};
  if (payload.status != null) body.status = payload.status;
  if (payload.assigned_to !== undefined) body.assigned_to = payload.assigned_to;
  if (payload.pending_items != null) body.pending_items = payload.pending_items;
  if (payload.status_started_at != null) body.status_started_at = payload.status_started_at;

  const response = await fetch(`${FUNDS_API_BASE_URL}/cedentes/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await handleResponse<CedenteResponse>(response);
  return mapCedenteToPipelineItem(data);
}

export async function deleteCedente(id: string): Promise<void> {
  const response = await fetch(`${FUNDS_API_BASE_URL}/cedentes/${id}`, {
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

export async function getCedentesChecklist(): Promise<Record<string, string[]>> {
  const response = await fetch(`${FUNDS_API_BASE_URL}/cedentes/checklist`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  return handleResponse<Record<string, string[]>>(response);
}
