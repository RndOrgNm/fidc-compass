import type { CedentePipelineStatus } from "@/data/pipelineData";

/** Single source for Cedentes pipeline status display titles. Change here to update labels across the app. */
export const CEDENTES_STATUS_LABELS: Record<CedentePipelineStatus, string> = {
  em_prospeccao: "Em Prospecção",
  coleta_documentos: "Coleta de Documentos",
  analise_credito: "Análise de Crédito",
  comite_credito: "Comitê de Crédito",
  habilitado: "Habilitado",
  bloqueado_desistencia: "Bloqueado/Desistência",
};

/** Statuses where the card can be deleted (terminal/rejected states). */
export const CEDENTES_TERMINAL_STATUSES: CedentePipelineStatus[] = ["bloqueado_desistencia"];

export function isCedenteTerminal(status: CedentePipelineStatus): boolean {
  return CEDENTES_TERMINAL_STATUSES.includes(status);
}

/** Kanban columns with id, title (from labels), and color. STATUS_ORDER derived from id order. */
export const CEDENTES_COLUMNS: { id: CedentePipelineStatus; title: string; color: string }[] = [
  { id: "em_prospeccao", title: CEDENTES_STATUS_LABELS.em_prospeccao, color: "border-slate-500" },
  { id: "coleta_documentos", title: CEDENTES_STATUS_LABELS.coleta_documentos, color: "border-amber-500" },
  { id: "analise_credito", title: CEDENTES_STATUS_LABELS.analise_credito, color: "border-blue-500" },
  { id: "comite_credito", title: CEDENTES_STATUS_LABELS.comite_credito, color: "border-purple-500" },
  { id: "habilitado", title: CEDENTES_STATUS_LABELS.habilitado, color: "border-green-500" },
  { id: "bloqueado_desistencia", title: CEDENTES_STATUS_LABELS.bloqueado_desistencia, color: "border-red-500" },
];

/** Badge config for list views. Label from CEDENTES_STATUS_LABELS. */
export const CEDENTES_STATUS_BADGES: Record<CedentePipelineStatus, { label: string; className: string }> = {
  em_prospeccao: { label: CEDENTES_STATUS_LABELS.em_prospeccao, className: "bg-slate-100 text-slate-800" },
  coleta_documentos: { label: CEDENTES_STATUS_LABELS.coleta_documentos, className: "bg-amber-100 text-amber-800" },
  analise_credito: { label: CEDENTES_STATUS_LABELS.analise_credito, className: "bg-blue-100 text-blue-800" },
  comite_credito: { label: CEDENTES_STATUS_LABELS.comite_credito, className: "bg-purple-100 text-purple-800" },
  habilitado: { label: CEDENTES_STATUS_LABELS.habilitado, className: "bg-green-100 text-green-800" },
  bloqueado_desistencia: { label: CEDENTES_STATUS_LABELS.bloqueado_desistencia, className: "bg-red-100 text-red-800" },
};
