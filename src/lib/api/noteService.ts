import { FUNDS_API_BASE_URL } from "./config";

export type EntityType = "cedente" | "fund" | "recebivel";

export interface NoteResponse {
  id: string;
  entity_type: EntityType;
  entity_id: string;
  content: string;
  created_by: string | null;
  created_at: string;
}

export interface NoteListResponse {
  items: NoteResponse[];
  total: number;
}

export interface NoteCreateRequest {
  entity_type: EntityType;
  entity_id: string;
  content: string;
  created_by?: string;
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

export async function listNotes(
  entityType: EntityType,
  entityId: string
): Promise<NoteListResponse> {
  const params = new URLSearchParams();
  params.set("entity_type", entityType);
  params.set("entity_id", entityId);

  const url = `${FUNDS_API_BASE_URL}/notes?${params.toString()}`;
  const response = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  return handleResponse<NoteListResponse>(response);
}

export async function createNote(
  data: NoteCreateRequest
): Promise<NoteResponse> {
  const url = `${FUNDS_API_BASE_URL}/notes`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleResponse<NoteResponse>(response);
}
