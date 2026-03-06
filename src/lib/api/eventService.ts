import { FUNDS_API_BASE_URL } from "./config";

export type EntityType = "cedente" | "fund" | "recebivel";

export type EventType =
  | "created"
  | "updated"
  | "deleted"
  | "status_changed"
  | "checklist_updated";

export type EventChannel =
  | "frontend"
  | "frontend_agent"
  | "whatsapp"
  | "slack";

export interface EventResponse {
  id: string;
  entity_type: EntityType;
  entity_id: string;
  event_type: EventType;
  field_name: string | null;
  old_value: string | null;
  new_value: string | null;
  caused_by: string | null;
  event_channel: EventChannel | null;
  cause_detail: string | null;
  created_at: string;
}

export interface EventListResponse {
  items: EventResponse[];
  total: number;
}

export interface EventFilters {
  entity_type: EntityType;
  entity_id: string;
  event_type?: EventType;
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

export async function listEvents(
  filters: EventFilters
): Promise<EventListResponse> {
  const params = new URLSearchParams();
  params.set("entity_type", filters.entity_type);
  params.set("entity_id", filters.entity_id);
  if (filters.event_type) params.set("event_type", filters.event_type);
  if (filters.limit != null) params.set("limit", String(filters.limit));
  if (filters.offset != null) params.set("offset", String(filters.offset));

  const url = `${FUNDS_API_BASE_URL}/events?${params.toString()}`;
  const response = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  return handleResponse<EventListResponse>(response);
}
