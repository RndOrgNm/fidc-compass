import { FUNDS_API_BASE_URL } from "./config";

// ── Response shapes ───────────────────────────────────────────────────────────
//
// Catálogo livre — não o DocTipo fechado usado pelos documentos "normais".
// Ao ser aplicado a um Ativo, um default vira um Documento real com
// tipo="outro" e nome_personalizado=label (ver documento_service.py).

export interface ClassificacaoDocumentoDefaultResponse {
  id: string;
  classificacao_id: string;
  label: string;
  /** Nome de um ícone Lucide, ex.: "file-signature". */
  icone?: string | null;
  /** Texto livre — ex.: "Mensal", "Por operação", "Único". */
  cadencia_label?: string | null;
  /** Explica uma regra de cadência condicional. */
  nota?: string | null;
  /** Placeholder do campo "período de referência" ao criar o documento. */
  ref_hint?: string | null;
  /** Área responsável, texto livre. */
  resp?: string | null;
  ordem: number;
  criado_em: string;
}

export interface ClassificacaoResponse {
  id: string;
  nome: string;
  ordem: number;
  ativa: boolean;
  criado_em: string;
  defaults: ClassificacaoDocumentoDefaultResponse[];
}

export interface ClassificacaoListResponse {
  items: ClassificacaoResponse[];
  total: number;
}

// ── Request shapes ────────────────────────────────────────────────────────────

export interface ClassificacaoCreateRequest {
  nome: string;
  ordem?: number;
}

export interface ClassificacaoUpdateRequest {
  nome?: string;
  ordem?: number;
}

export interface ClassificacaoDocumentoDefaultCreateRequest {
  label: string;
  icone?: string;
  cadencia_label?: string;
  nota?: string;
  ref_hint?: string;
  resp?: string;
  ordem?: number;
}

export interface ClassificacaoDocumentoDefaultUpdateRequest {
  label?: string;
  icone?: string;
  cadencia_label?: string;
  nota?: string;
  ref_hint?: string;
  resp?: string;
  ordem?: number;
}

// ── Fetch helper (mesma forma de documentoService.ts) ──────────────────────────

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
  if (response.status === 204) return undefined as T;
  return response.json();
}

const JSON_HEADERS = { "Content-Type": "application/json" };
const BASE = `${FUNDS_API_BASE_URL}/classificacoes`;

// ── Classificação ─────────────────────────────────────────────────────────────

export async function listClassificacoes(
  includeInactive = false
): Promise<ClassificacaoListResponse> {
  const url = `${BASE}?include_inactive=${includeInactive}`;
  return handleResponse<ClassificacaoListResponse>(await fetch(url));
}

export async function createClassificacao(
  data: ClassificacaoCreateRequest
): Promise<ClassificacaoResponse> {
  const response = await fetch(BASE, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify(data),
  });
  return handleResponse<ClassificacaoResponse>(response);
}

export async function updateClassificacao(
  id: string,
  data: ClassificacaoUpdateRequest
): Promise<ClassificacaoResponse> {
  const response = await fetch(`${BASE}/${id}`, {
    method: "PATCH",
    headers: JSON_HEADERS,
    body: JSON.stringify(data),
  });
  return handleResponse<ClassificacaoResponse>(response);
}

export async function deleteClassificacao(id: string): Promise<void> {
  const response = await fetch(`${BASE}/${id}`, { method: "DELETE" });
  await handleResponse<void>(response);
}

// ── Documentos padrão ────────────────────────────────────────────────────────

export async function createClassificacaoDefault(
  classificacaoId: string,
  data: ClassificacaoDocumentoDefaultCreateRequest
): Promise<ClassificacaoDocumentoDefaultResponse> {
  const response = await fetch(`${BASE}/${classificacaoId}/defaults`, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify(data),
  });
  return handleResponse<ClassificacaoDocumentoDefaultResponse>(response);
}

export async function updateClassificacaoDefault(
  defaultId: string,
  data: ClassificacaoDocumentoDefaultUpdateRequest
): Promise<ClassificacaoDocumentoDefaultResponse> {
  const response = await fetch(`${BASE}/defaults/${defaultId}`, {
    method: "PATCH",
    headers: JSON_HEADERS,
    body: JSON.stringify(data),
  });
  return handleResponse<ClassificacaoDocumentoDefaultResponse>(response);
}

export async function deleteClassificacaoDefault(defaultId: string): Promise<void> {
  const response = await fetch(`${BASE}/defaults/${defaultId}`, { method: "DELETE" });
  await handleResponse<void>(response);
}
