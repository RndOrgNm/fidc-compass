import { FUNDS_API_BASE_URL } from "./config";

export type FundType =
  | "multissetorial"
  | "agro"
  | "varejo"
  | "high_yield";

export type RiskProfile = "conservative" | "moderate" | "aggressive";

export type FundStatus = "active" | "inactive" | "suspended";

export type Segment =
  | "comercio"
  | "industria"
  | "servicos"
  | "agronegocio"
  | "varejo"
  | "insumos";

export interface Fund {
  id: string;
  name: string;
  code: string;
  type: FundType;
  aum: number;
  risk_profile: RiskProfile;
  eligible_segments: Segment[];
  min_ticket: number;
  max_concentration: number;
  status: FundStatus;
  created_at: string;
  updated_at: string;
}

export interface FundListResponse {
  items: Fund[];
  total: number;
}

export interface FundFilters {
  status?: FundStatus;
  type?: FundType;
  limit?: number;
  offset?: number;
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

export async function listFunds(
  filters: FundFilters = {}
): Promise<FundListResponse> {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.type) params.set("type", filters.type);
  if (filters.limit != null) params.set("limit", String(filters.limit));
  if (filters.offset != null) params.set("offset", String(filters.offset));

  const qs = params.toString();
  const url = `${FUNDS_API_BASE_URL}/funds${qs ? `?${qs}` : ""}`;

  const response = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  return handleResponse<FundListResponse>(response);
}
