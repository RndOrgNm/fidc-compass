import { FUNDS_API_BASE_URL } from "./config";

// ── Domain enums (mirror funds-pipeline src/api/models/enums.py) ──────────────

export type Categoria = "REGULATORIO" | "OPERACIONAL" | "RECEBIVEL" | "COTISTA";

export type TipoPrazo =
  | "DIA_FIXO"
  | "DIA_UTIL"
  | "DIAS_ANTES_DU"
  | "DIAS_APOS_EVENTO"
  | "FINAL_DO_MES";

export type PrazoStatus =
  | "PENDENTE"
  | "ATRASADO"
  | "AGUARDANDO_GATILHO"
  | "CONCLUIDO";

// ── Response shapes ───────────────────────────────────────────────────────────

export interface ResponsavelInfo {
  id: string;
  nome: string;
  email?: string | null;
}

export interface ObrigacaoResponse {
  id: string;
  fundo_id: number;
  topico: string;
  categoria: Categoria;
  tipo_prazo: TipoPrazo;
  parametros: Record<string, number>;
  antecedencia_alerta_dias: number;
  ativa: boolean;
  recorrente: boolean;
  criado_por: string | null;
  criado_em: string;
  descricao?: string | null;
  responsaveis: ResponsavelInfo[];
  responsavel_id?: string | null;
  responsavel_nome?: string | null;
  responsavel_email?: string | null;
}

export interface ObrigacaoListResponse {
  items: ObrigacaoResponse[];
  total: number;
}

export interface InstanciaResponse {
  id: string;
  obrigacao_id: string;
  fundo_id: number;
  topico: string;
  categoria: Categoria;
  tipo_prazo: TipoPrazo;
  parametros: Record<string, number>;
  antecedencia_alerta_dias: number;
  recorrente: boolean;
  ciclo: string;
  data_vencimento: string | null;
  data_evento_gatilho: string | null;
  status: PrazoStatus;
  concluido_por: string | null;
  concluido_em: string | null;
  descricao?: string | null;
  responsaveis: ResponsavelInfo[];
  responsavel_id?: string | null;
  responsavel_nome?: string | null;
  responsavel_email?: string | null;
}

export interface InstanciaListResponse {
  items: InstanciaResponse[];
  total: number;
}

export interface AlertaResponse extends InstanciaResponse {
  lido: boolean;
}

export interface AlertasListResponse {
  items: AlertaResponse[];
  total: number;
  unread_count: number;
}

export interface ReconcileResponse {
  ciclo: string;
  criadas: number;
  existentes: number;
}

export interface AssignmentNotifResponse {
  id: string;
  obrigacao_id: string;
  fundo_id: number;
  topico: string;
  assigned_by_nome: string;
  criado_em: string;
  lido_em: string | null;
}

export interface AssignmentNotifListResponse {
  items: AssignmentNotifResponse[];
  total: number;
  unread_count: number;
}

// ── Request shapes ────────────────────────────────────────────────────────────

export interface ObrigacaoCreateRequest {
  fundo_id: number;
  topico: string;
  categoria: Categoria;
  tipo_prazo: TipoPrazo;
  parametros: Record<string, number>;
  antecedencia_alerta_dias: number;
  recorrente?: boolean;
  criado_por?: string;
  criado_por_nome?: string;
  descricao?: string;
  responsaveis: ResponsavelInfo[];
}

export interface ObrigacaoUpdateRequest {
  topico?: string;
  categoria?: Categoria;
  tipo_prazo?: TipoPrazo;
  parametros?: Record<string, number>;
  antecedencia_alerta_dias?: number;
  recorrente?: boolean;
  descricao?: string;
  responsaveis?: ResponsavelInfo[];
  atualizado_por?: string;
  atualizado_por_nome?: string;
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

// ── Obrigações ────────────────────────────────────────────────────────────────

export async function listObrigacoes(
  fundoId: number
): Promise<ObrigacaoListResponse> {
  const url = `${FUNDS_API_BASE_URL}/prazos/obrigacoes?fundo_id=${fundoId}`;
  return handleResponse<ObrigacaoListResponse>(await fetch(url));
}

export async function createObrigacao(
  data: ObrigacaoCreateRequest
): Promise<ObrigacaoResponse> {
  const response = await fetch(`${FUNDS_API_BASE_URL}/prazos/obrigacoes`, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify(data),
  });
  return handleResponse<ObrigacaoResponse>(response);
}

export async function updateObrigacao(
  id: string,
  data: ObrigacaoUpdateRequest
): Promise<ObrigacaoResponse> {
  const response = await fetch(`${FUNDS_API_BASE_URL}/prazos/obrigacoes/${id}`, {
    method: "PATCH",
    headers: JSON_HEADERS,
    body: JSON.stringify(data),
  });
  return handleResponse<ObrigacaoResponse>(response);
}

export async function deleteObrigacao(id: string): Promise<void> {
  const response = await fetch(`${FUNDS_API_BASE_URL}/prazos/obrigacoes/${id}`, {
    method: "DELETE",
  });
  await handleResponse<void>(response);
}

// ── Instâncias ────────────────────────────────────────────────────────────────

export async function listInstancias(
  fundoId: number,
  ciclo?: string
): Promise<InstanciaListResponse> {
  const params = new URLSearchParams({ fundo_id: String(fundoId) });
  if (ciclo) params.set("ciclo", ciclo);
  const url = `${FUNDS_API_BASE_URL}/prazos/instancias?${params.toString()}`;
  return handleResponse<InstanciaListResponse>(await fetch(url));
}

export async function concluirInstancia(
  instanciaId: string,
  usuarioId: string
): Promise<InstanciaResponse> {
  const response = await fetch(
    `${FUNDS_API_BASE_URL}/prazos/instancias/${instanciaId}/concluir`,
    { method: "POST", headers: JSON_HEADERS, body: JSON.stringify({ usuario_id: usuarioId }) }
  );
  return handleResponse<InstanciaResponse>(response);
}

export async function reabrirInstancia(
  instanciaId: string
): Promise<InstanciaResponse> {
  const response = await fetch(
    `${FUNDS_API_BASE_URL}/prazos/instancias/${instanciaId}/reabrir`,
    { method: "POST", headers: JSON_HEADERS }
  );
  return handleResponse<InstanciaResponse>(response);
}

export async function registrarGatilho(
  instanciaId: string,
  dataEvento: string
): Promise<InstanciaResponse> {
  const response = await fetch(
    `${FUNDS_API_BASE_URL}/prazos/instancias/${instanciaId}/gatilho`,
    { method: "POST", headers: JSON_HEADERS, body: JSON.stringify({ data_evento: dataEvento }) }
  );
  return handleResponse<InstanciaResponse>(response);
}

// ── Alertas ───────────────────────────────────────────────────────────────────

export async function listAlertas(
  usuarioId: string
): Promise<AlertasListResponse> {
  const url = `${FUNDS_API_BASE_URL}/prazos/alertas?usuario_id=${encodeURIComponent(usuarioId)}`;
  return handleResponse<AlertasListResponse>(await fetch(url));
}

export async function marcarAlertaLido(
  instanciaId: string,
  usuarioId: string
): Promise<void> {
  const response = await fetch(
    `${FUNDS_API_BASE_URL}/prazos/alertas/${instanciaId}/ler`,
    { method: "POST", headers: JSON_HEADERS, body: JSON.stringify({ usuario_id: usuarioId }) }
  );
  await handleResponse<void>(response);
}

export async function listAssignmentNotifs(
  usuarioId: string
): Promise<AssignmentNotifListResponse> {
  const url = `${FUNDS_API_BASE_URL}/prazos/alertas/assignments?usuario_id=${encodeURIComponent(usuarioId)}`;
  return handleResponse<AssignmentNotifListResponse>(await fetch(url));
}

export async function markAssignmentRead(notifId: string): Promise<void> {
  const response = await fetch(
    `${FUNDS_API_BASE_URL}/prazos/alertas/assignments/${notifId}/ler`,
    { method: "POST" }
  );
  await handleResponse<void>(response);
}

// ── Reconcile (manual fallback; normally fired by the orchestrator) ───────────

export async function reconcile(ciclo?: string): Promise<ReconcileResponse> {
  const qs = ciclo ? `?ciclo=${ciclo}` : "";
  const response = await fetch(`${FUNDS_API_BASE_URL}/prazos/reconcile${qs}`, {
    method: "POST",
  });
  return handleResponse<ReconcileResponse>(response);
}
