import { FUNDS_API_BASE_URL } from "./config";

// ── Enums ──────────────────────────────────────────────────────────────────────

export type AllocationStatus =
  | "pending_match"
  | "fund_selection"
  | "compliance_check"
  | "allocated"
  | "rejected"
  | "withdrawn"
  | "superseded";

export type AllocationStep =
  | "awaiting_selection"
  | "fund_evaluation"
  | "compliance_verification"
  | "final_approval"
  | "completed";

export type Segment =
  | "comercio"
  | "industria"
  | "servicos"
  | "agronegocio"
  | "varejo"
  | "insumos";

// ── Response types ─────────────────────────────────────────────────────────────

export interface AllocationWorkflow {
  id: string;
  receivable_id: string;
  fund_id: string | null;
  status: AllocationStatus;
  current_step: AllocationStep;
  assigned_to: string | null;
  pending_items: string[];
  sla_deadline: string | null;
  allocation_date: string | null;
  created_at: string;
  updated_at: string;
  receivable_number: string | null;
  debtor_name: string | null;
  nominal_value: number;
  due_date: string | null;
  risk_score: number;
  segment: Segment | null;
  cedente_name: string | null;
  cedente_cnpj: string | null;
  fund_name: string | null;
  total_steps: number;
  completed_steps: number;
  days_in_progress: number;
}

export interface AllocationWorkflowListResponse {
  items: AllocationWorkflow[];
  total: number;
}

export interface TransitionAllocationRequest {
  status: AllocationStatus;
  current_step?: AllocationStep;
  pending_items?: string[];
}

/** Payload for creating a new allocation (matching) workflow. */
export interface AllocationWorkflowCreate {
  receivable_id: string;
  fund_id?: string | null;
  assigned_to?: string | null;
  sla_deadline?: string | null;
  pending_items?: string[];
}

export interface AllocationUpdateRequest {
  pending_items?: string[];
  assigned_to?: string | null;
  fund_id?: string | null;
  sla_deadline?: string | null;
  status?: AllocationStatus;
  current_step?: AllocationStep;
}

// ── Filters ────────────────────────────────────────────────────────────────────

export interface AllocationWorkflowFilters {
  status?: AllocationStatus;
  fund_id?: string;
  assigned_to?: string;
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

// ── API functions ──────────────────────────────────────────────────────────────

export async function listAllocationWorkflows(
  filters: AllocationWorkflowFilters = {}
): Promise<AllocationWorkflowListResponse> {
  const params = new URLSearchParams();

  if (filters.status) params.set("status", filters.status);
  if (filters.fund_id) params.set("fund_id", filters.fund_id);
  if (filters.assigned_to) params.set("assigned_to", filters.assigned_to);
  if (filters.segment) params.set("segment", filters.segment);
  if (filters.limit != null) params.set("limit", String(filters.limit));
  if (filters.offset != null) params.set("offset", String(filters.offset));

  const qs = params.toString();
  const url = `${FUNDS_API_BASE_URL}/alocacao${qs ? `?${qs}` : ""}`;

  const response = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  return handleResponse<AllocationWorkflowListResponse>(response);
}

export async function transitionAllocationWorkflow(
  workflowId: string,
  data: TransitionAllocationRequest
): Promise<AllocationWorkflow> {
  const response = await fetch(
    `${FUNDS_API_BASE_URL}/alocacao/${workflowId}/transition`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }
  );

  return handleResponse<AllocationWorkflow>(response);
}

export async function createAllocationWorkflow(
  data: AllocationWorkflowCreate
): Promise<AllocationWorkflow> {
  const body: Record<string, unknown> = {
    receivable_id: data.receivable_id,
  };
  if (data.fund_id != null && data.fund_id !== "") body.fund_id = data.fund_id;
  if (data.assigned_to != null && data.assigned_to !== "") body.assigned_to = data.assigned_to;
  if (data.sla_deadline != null && data.sla_deadline !== "") body.sla_deadline = data.sla_deadline;
  if (data.pending_items?.length) body.pending_items = data.pending_items;

  const response = await fetch(`${FUNDS_API_BASE_URL}/alocacao`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  return handleResponse<AllocationWorkflow>(response);
}

export async function updateAllocationWorkflow(
  workflowId: string,
  data: AllocationUpdateRequest
): Promise<AllocationWorkflow> {
  const body: Record<string, unknown> = {};
  if (data.pending_items !== undefined) body.pending_items = data.pending_items;
  if (data.assigned_to !== undefined) body.assigned_to = data.assigned_to;
  if (data.fund_id !== undefined) body.fund_id = data.fund_id;
  if (data.sla_deadline !== undefined) body.sla_deadline = data.sla_deadline;
  if (data.status !== undefined) body.status = data.status;
  if (data.current_step !== undefined) body.current_step = data.current_step;

  const response = await fetch(`${FUNDS_API_BASE_URL}/alocacao/${workflowId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  return handleResponse<AllocationWorkflow>(response);
}

export async function deleteAllocation(workflowId: string): Promise<void> {
  const response = await fetch(`${FUNDS_API_BASE_URL}/alocacao/${workflowId}`, {
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
