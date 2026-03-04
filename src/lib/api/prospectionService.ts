import { FUNDS_API_BASE_URL } from "./config";
import type { RecebivelStatus } from "@/data/recebiveisPipelineConfig";

// ── Enums ──────────────────────────────────────────────────────────────────────

/** Re-exported from recebiveisPipelineConfig (single source of truth). */
export type { RecebivelStatus };

/** @deprecated Use RecebivelStatus. Kept for backwards compatibility. */
export type ProspectionStatus = RecebivelStatus;

export type ProspectionStep =
  | "initial_contact"
  | "proposal_sent"
  | "document_collection"
  | "risk_assessment"
  | "committee_review"
  | "completed";

export type Segment =
  | "comercio"
  | "industria"
  | "servicos"
  | "agronegocio"
  | "varejo"
  | "insumos";

// ── Response types ─────────────────────────────────────────────────────────────

export interface ProspectionWorkflow {
  id: string;
  cedente_id: string;
  fund_id: string | null;
  receivable_id: string | null;
  status: RecebivelStatus;
  current_step: ProspectionStep;
  assigned_to: string | null;
  pending_items: string[];
  sla_deadline: string | null;
  estimated_volume: number;
  created_at: string;
  updated_at: string;
  cedente_name: string | null;
  cedente_cnpj: string | null;
  cedente_segment: Segment | null;
  fund_name: string | null;
  receivable_value: number;
  total_steps: number;
  completed_steps: number;
  days_in_progress: number;
}

export interface ProspectionWorkflowListResponse {
  items: ProspectionWorkflow[];
  total: number;
}

export interface NewLeadCreate {
  company_name: string;
  cnpj: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  segment: Segment;
  estimated_volume: number;
  assigned_to?: string | null;
}

export interface NewLeadResponse {
  cedente_id: string;
  workflow_id: string;
  company_name: string;
  cnpj: string;
  segment: Segment;
  status: RecebivelStatus;
  estimated_volume: number;
}

export interface TransitionRequest {
  status: RecebivelStatus;
  current_step?: ProspectionStep;
  pending_items?: string[];
}

export interface AssignRequest {
  assigned_to: string;
}

export interface RecebivelUpdateRequest {
  pending_items?: string[];
  assigned_to?: string | null;
  fund_id?: string | null;
  sla_deadline?: string | null;
  estimated_volume?: number;
  status?: RecebivelStatus;
  current_step?: ProspectionStep;
}

export interface RecebivelCreatePayload {
  cedente_id: string;
  invoice_number: string;
  nominal_value: number;
  due_date: string;
  debtor_name: string;
  debtor_cnpj: string;
  segment: Segment;
  risk_score?: number;
}

// ── Filters ────────────────────────────────────────────────────────────────────

export interface WorkflowFilters {
  status?: RecebivelStatus;
  assigned_to?: string;
  cedente_id?: string;
  segment?: Segment;
  limit?: number;
  offset?: number;
}

// ── Helper ─────────────────────────────────────────────────────────────────────

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorMessage = "An error occurred";
    try {
      const errorData = await response.json();
      errorMessage = errorData.detail || errorMessage;
    } catch {
      errorMessage = response.statusText || `HTTP ${response.status}`;
    }
    throw new Error(errorMessage);
  }
  return response.json();
}

// ── API functions ──────────────────────────────────────────────────────────────

export async function listProspectionWorkflows(
  filters: WorkflowFilters = {}
): Promise<ProspectionWorkflowListResponse> {
  const params = new URLSearchParams();

  if (filters.status) params.set("status", filters.status);
  if (filters.assigned_to) params.set("assigned_to", filters.assigned_to);
  if (filters.cedente_id) params.set("cedente_id", filters.cedente_id);
  if (filters.segment) params.set("segment", filters.segment);
  if (filters.limit) params.set("limit", String(filters.limit));
  if (filters.offset) params.set("offset", String(filters.offset));

  const qs = params.toString();
  const url = `${FUNDS_API_BASE_URL}/recebiveis${qs ? `?${qs}` : ""}`;

  const response = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  return handleResponse<ProspectionWorkflowListResponse>(response);
}

export async function createRecebivel(
  payload: RecebivelCreatePayload
): Promise<ProspectionWorkflow> {
  const body: Record<string, unknown> = {
    cedente_id: payload.cedente_id,
    invoice_number: payload.invoice_number,
    nominal_value: payload.nominal_value,
    due_date: payload.due_date,
    debtor_name: payload.debtor_name,
    debtor_cnpj: payload.debtor_cnpj,
    segment: payload.segment,
    status: "recepcao_bordero",
  };
  if (payload.risk_score != null) body.risk_score = payload.risk_score;

  const response = await fetch(`${FUNDS_API_BASE_URL}/recebiveis`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  return handleResponse<ProspectionWorkflow & { invoice_number: string; nominal_value: number }>(response);
}

export async function createNewLead(
  data: NewLeadCreate
): Promise<NewLeadResponse> {
  const response = await fetch(`${FUNDS_API_BASE_URL}/recebiveis/new-lead`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  return handleResponse<NewLeadResponse>(response);
}

export async function transitionWorkflow(
  workflowId: string,
  data: TransitionRequest
): Promise<ProspectionWorkflow> {
  const response = await fetch(
    `${FUNDS_API_BASE_URL}/recebiveis/${workflowId}/transition`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }
  );

  return handleResponse<ProspectionWorkflow>(response);
}

export async function assignWorkflow(
  workflowId: string,
  assignedTo: string
): Promise<ProspectionWorkflow> {
  const response = await fetch(
    `${FUNDS_API_BASE_URL}/recebiveis/${workflowId}/assign`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assigned_to: assignedTo } as AssignRequest),
    }
  );

  return handleResponse<ProspectionWorkflow>(response);
}

export async function updateRecebivel(
  workflowId: string,
  data: RecebivelUpdateRequest
): Promise<ProspectionWorkflow> {
  const body: Record<string, unknown> = {};
  if (data.pending_items !== undefined) body.pending_items = data.pending_items;
  if (data.assigned_to !== undefined) body.assigned_to = data.assigned_to;
  if (data.fund_id !== undefined) body.fund_id = data.fund_id;
  if (data.sla_deadline !== undefined) body.sla_deadline = data.sla_deadline;
  if (data.estimated_volume !== undefined) body.estimated_volume = data.estimated_volume;
  if (data.status !== undefined) body.status = data.status;
  if (data.current_step !== undefined) body.current_step = data.current_step;

  const response = await fetch(`${FUNDS_API_BASE_URL}/recebiveis/${workflowId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  return handleResponse<ProspectionWorkflow>(response);
}

export async function deleteRecebivel(workflowId: string): Promise<void> {
  const response = await fetch(`${FUNDS_API_BASE_URL}/recebiveis/${workflowId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
  });
  if (!response.ok) {
    let errorMessage = "An error occurred";
    try {
      const errorData = await response.json();
      errorMessage = errorData.detail || errorMessage;
    } catch {
      errorMessage = response.statusText || `HTTP ${response.status}`;
    }
    throw new Error(errorMessage);
  }
}

export async function getRecebiveisChecklist(): Promise<Record<string, string[]>> {
  const response = await fetch(`${FUNDS_API_BASE_URL}/recebiveis/checklist`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  return handleResponse<Record<string, string[]>>(response);
}
