import { FUNDS_API_BASE_URL } from "./config";

// ── Domain enums (mirror funds-pipeline src/api/models/enums.py) ──────────────

export type DocTipo =
  | "contrato_social"
  | "df"
  | "balancete"
  | "cronograma"
  | "matricula"
  | "planilha_vendas"
  | "outro";

export type DocStatus = "em-dia" | "vencendo" | "vencido" | "pendente";

// Livre por documento (não fixa pelo tipo) — o mesmo DocTipo pode ter
// cadências diferentes conforme o ativo/contexto.
export type Cadencia =
  | "mensal"
  | "trimestral"
  | "semestral"
  | "anual"
  | "quando_houver_alteracao"
  | "sem_cadencia";

// ── Response shapes ───────────────────────────────────────────────────────────

export interface AtivoResponse {
  id: string;
  fundo_id: number;
  nome: string;
  sub?: string | null;
  cor?: string | null;
  imovel_no_nome_do_fundo: boolean;
  ordem: number;
  ativa: boolean;
  criado_em: string;
}

export interface AtivoListResponse {
  items: AtivoResponse[];
  total: number;
}

export interface LinkedPrazoInfo {
  obrigacao_id: string;
  topico: string;
  data_vencimento: string | null;
  responsavel_nome?: string | null;
}

export interface DocumentoResponse {
  id: string;
  ativo_id: string;
  fundo_id: number;
  tipo: DocTipo;
  /** Label livre — só usado (e obrigatório) quando tipo="outro". */
  nome_personalizado?: string | null;
  cadencia: Cadencia;
  periodo_referencia?: string | null;
  versao?: string | null;
  arquivo_nome?: string | null;
  arquivo_tamanho?: number | null;
  vigente_desde?: string | null;
  proximo_vencimento?: string | null;
  status: DocStatus;
  download_url?: string | null;
  prazo?: LinkedPrazoInfo | null;
  criado_em: string;
  atualizado_em: string;
}

export interface AtivoComDocumentosResponse {
  ativo_id: string;
  nome: string;
  sub?: string | null;
  cor?: string | null;
  imovel_no_nome_do_fundo: boolean;
  documentos: DocumentoResponse[];
}

export interface FundoDocumentosResponse {
  /** "Documentos por Fundo" — singleton card, auto-created, not a real SPE. */
  fundo: AtivoComDocumentosResponse;
  /** "Documentos por Ativos" — the fund's real empreendimentos/SPEs. */
  assets: AtivoComDocumentosResponse[];
}

export interface PresignUploadResponse {
  upload_url: string;
  s3_key: string;
}

export interface DownloadUrlResponse {
  download_url: string;
}

// ── Request shapes ────────────────────────────────────────────────────────────

export interface AtivoCreateRequest {
  fundo_id: number;
  nome: string;
  sub?: string;
  cor?: string;
  imovel_no_nome_do_fundo?: boolean;
  ordem?: number;
}

export interface AtivoUpdateRequest {
  nome?: string;
  sub?: string;
  cor?: string;
  imovel_no_nome_do_fundo?: boolean;
  ordem?: number;
}

export interface DocumentoCreateRequest {
  ativo_id: string;
  fundo_id: number;
  tipo: DocTipo;
  nome_personalizado?: string; // obrigatório quando tipo="outro"
  cadencia?: Cadencia; // se omitido, o backend usa a cadência sugerida do tipo
  periodo_referencia?: string;
}

export interface DocumentoUpdateRequest {
  nome_personalizado?: string;
  cadencia?: Cadencia;
  periodo_referencia?: string;
  proximo_vencimento?: string; // "YYYY-MM-DD"
}

export interface ConfirmUploadRequest {
  s3_key: string;
  filename: string;
  content_type: string;
  tamanho: number;
  vigente_desde?: string; // "YYYY-MM-DD"; default: hoje
}

export interface CriarPrazoParaDocumentoRequest {
  topico: string;
  data_vencimento: string; // "YYYY-MM-DD"
  responsavel_id?: string;
  responsavel_nome?: string;
  responsavel_email?: string;
  criado_por?: string;
}

export interface VincularPrazoRequest {
  obrigacao_id: string;
}

// ── Fetch helper ──────────────────────────────────────────────────────────────

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

// ── Ativos ────────────────────────────────────────────────────────────────────

export async function listAtivos(fundoId: number): Promise<AtivoListResponse> {
  const url = `${FUNDS_API_BASE_URL}/fundos/${fundoId}/ativos`;
  return handleResponse<AtivoListResponse>(await fetch(url));
}

export async function createAtivo(data: AtivoCreateRequest): Promise<AtivoResponse> {
  const response = await fetch(`${FUNDS_API_BASE_URL}/ativos`, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify(data),
  });
  return handleResponse<AtivoResponse>(response);
}

export async function updateAtivo(
  id: string,
  data: AtivoUpdateRequest
): Promise<AtivoResponse> {
  const response = await fetch(`${FUNDS_API_BASE_URL}/ativos/${id}`, {
    method: "PATCH",
    headers: JSON_HEADERS,
    body: JSON.stringify(data),
  });
  return handleResponse<AtivoResponse>(response);
}

export async function deleteAtivo(id: string): Promise<void> {
  const response = await fetch(`${FUNDS_API_BASE_URL}/ativos/${id}`, { method: "DELETE" });
  await handleResponse<void>(response);
}

// ── Documentos — leitura agrupada + CRUD ───────────────────────────────────────

export async function listDocumentosByFundo(fundoId: number): Promise<FundoDocumentosResponse> {
  const url = `${FUNDS_API_BASE_URL}/fundos/${fundoId}/documentos`;
  return handleResponse<FundoDocumentosResponse>(await fetch(url));
}

export async function createDocumento(
  data: DocumentoCreateRequest
): Promise<DocumentoResponse> {
  const response = await fetch(`${FUNDS_API_BASE_URL}/documentos`, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify(data),
  });
  return handleResponse<DocumentoResponse>(response);
}

export async function updateDocumento(
  id: string,
  data: DocumentoUpdateRequest
): Promise<DocumentoResponse> {
  const response = await fetch(`${FUNDS_API_BASE_URL}/documentos/${id}`, {
    method: "PATCH",
    headers: JSON_HEADERS,
    body: JSON.stringify(data),
  });
  return handleResponse<DocumentoResponse>(response);
}

export async function deleteDocumento(id: string): Promise<void> {
  const response = await fetch(`${FUNDS_API_BASE_URL}/documentos/${id}`, { method: "DELETE" });
  await handleResponse<void>(response);
}

// ── Upload ────────────────────────────────────────────────────────────────────

export async function presignUpload(
  documentoId: string,
  filename: string,
  contentType: string
): Promise<PresignUploadResponse> {
  const response = await fetch(`${FUNDS_API_BASE_URL}/documentos/${documentoId}/presign`, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ filename, content_type: contentType }),
  });
  return handleResponse<PresignUploadResponse>(response);
}

export async function confirmUpload(
  documentoId: string,
  data: ConfirmUploadRequest
): Promise<DocumentoResponse> {
  const response = await fetch(`${FUNDS_API_BASE_URL}/documentos/${documentoId}/confirm`, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify(data),
  });
  return handleResponse<DocumentoResponse>(response);
}

export async function getDownloadUrl(documentoId: string): Promise<DownloadUrlResponse> {
  const url = `${FUNDS_API_BASE_URL}/documentos/${documentoId}/download`;
  return handleResponse<DownloadUrlResponse>(await fetch(url));
}

/** Uploads the file straight to S3 via a presigned PUT URL — no funds-pipeline round trip. */
export async function uploadToPresignedUrl(uploadUrl: string, file: File): Promise<void> {
  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type || "application/octet-stream" },
    body: file,
  });
  if (!response.ok) {
    throw new Error(`Upload de '${file.name}' falhou (HTTP ${response.status})`);
  }
}

/** Presign → PUT → confirm, as one call. */
export async function uploadDocumentoFile(
  documentoId: string,
  file: File
): Promise<DocumentoResponse> {
  const contentType = file.type || "application/octet-stream";
  const { upload_url, s3_key } = await presignUpload(documentoId, file.name, contentType);
  await uploadToPresignedUrl(upload_url, file);
  return confirmUpload(documentoId, {
    s3_key,
    filename: file.name,
    content_type: contentType,
    tamanho: file.size,
  });
}

// ── Link com Prazos ─────────────────────────────────────────────────────────────

export async function criarPrazoParaDocumento(
  documentoId: string,
  data: CriarPrazoParaDocumentoRequest
): Promise<DocumentoResponse> {
  const response = await fetch(`${FUNDS_API_BASE_URL}/documentos/${documentoId}/prazo`, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify(data),
  });
  return handleResponse<DocumentoResponse>(response);
}

export async function vincularPrazo(
  documentoId: string,
  obrigacaoId: string
): Promise<DocumentoResponse> {
  const response = await fetch(`${FUNDS_API_BASE_URL}/documentos/${documentoId}/prazo/vincular`, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ obrigacao_id: obrigacaoId } as VincularPrazoRequest),
  });
  return handleResponse<DocumentoResponse>(response);
}
