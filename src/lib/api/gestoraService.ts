import { FUNDS_API_BASE_URL } from "./config";
import type { DocumentoResponse } from "./documentoService";

export interface GestoraResponse {
  id: string;
  nome: string;
  criado_em: string;
}

export interface GestoraListResponse {
  items: GestoraResponse[];
  total: number;
}

export interface GestoraDocumentosResponse {
  gestora: GestoraResponse;
  documentos: DocumentoResponse[];
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorMessage = "Ocorreu um erro";
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

export async function listGestoras(): Promise<GestoraListResponse> {
  return handleResponse<GestoraListResponse>(await fetch(`${FUNDS_API_BASE_URL}/gestoras`));
}

export async function listDocumentosByGestora(gestoraId: string): Promise<GestoraDocumentosResponse> {
  const url = `${FUNDS_API_BASE_URL}/gestoras/${gestoraId}/documentos`;
  return handleResponse<GestoraDocumentosResponse>(await fetch(url));
}
