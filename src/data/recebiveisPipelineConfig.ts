/** Single source for Mesa de Operações pipeline status display titles. Change here to update labels across the app. */
export const RECEBIVEIS_STATUS_LABELS = {
  recepcao_bordero: "Recepção de Borderô",
  checagem_lastro: "Checagem de Lastro",
  enquadramento_alocacao: "Enquadramento & Alocação",
  formalizacao_cessao: "Formalização da Cessão",
  aguardando_liquidacao: "Aguardando Liquidação",
  liquidado: "Liquidado (Carteira)",
  reprovado_cancelado: "Reprovado / Cancelado",
} as const;

/** Status type derived from config — add/remove status here to update across the app. */
export type RecebivelStatus = keyof typeof RECEBIVEIS_STATUS_LABELS;

/** Kanban columns with id, title (from labels), and color. STATUS_ORDER derived from id order. */
export const RECEBIVEIS_COLUMNS: { id: RecebivelStatus; title: string; color: string }[] = [
  { id: "recepcao_bordero", title: RECEBIVEIS_STATUS_LABELS.recepcao_bordero, color: "border-slate-500" },
  { id: "checagem_lastro", title: RECEBIVEIS_STATUS_LABELS.checagem_lastro, color: "border-blue-500" },
  { id: "enquadramento_alocacao", title: RECEBIVEIS_STATUS_LABELS.enquadramento_alocacao, color: "border-purple-500" },
  { id: "formalizacao_cessao", title: RECEBIVEIS_STATUS_LABELS.formalizacao_cessao, color: "border-yellow-500" },
  { id: "aguardando_liquidacao", title: RECEBIVEIS_STATUS_LABELS.aguardando_liquidacao, color: "border-orange-500" },
  { id: "liquidado", title: RECEBIVEIS_STATUS_LABELS.liquidado, color: "border-green-500" },
  { id: "reprovado_cancelado", title: RECEBIVEIS_STATUS_LABELS.reprovado_cancelado, color: "border-red-500" },
];

/** Statuses where the card can be deleted (terminal/rejected states). */
export const RECEBIVEIS_TERMINAL_STATUSES: RecebivelStatus[] = ["liquidado", "reprovado_cancelado"];

export function isRecebivelTerminal(status: RecebivelStatus): boolean {
  return RECEBIVEIS_TERMINAL_STATUSES.includes(status);
}

/** Badge config for list views. Label from RECEBIVEIS_STATUS_LABELS. */
export const RECEBIVEIS_STATUS_BADGES: Record<RecebivelStatus, { label: string; className: string }> = {
  recepcao_bordero: { label: RECEBIVEIS_STATUS_LABELS.recepcao_bordero, className: "bg-slate-100 text-slate-800" },
  checagem_lastro: { label: RECEBIVEIS_STATUS_LABELS.checagem_lastro, className: "bg-blue-100 text-blue-800" },
  enquadramento_alocacao: { label: RECEBIVEIS_STATUS_LABELS.enquadramento_alocacao, className: "bg-purple-100 text-purple-800" },
  formalizacao_cessao: { label: RECEBIVEIS_STATUS_LABELS.formalizacao_cessao, className: "bg-yellow-100 text-yellow-800" },
  aguardando_liquidacao: { label: RECEBIVEIS_STATUS_LABELS.aguardando_liquidacao, className: "bg-orange-100 text-orange-800" },
  liquidado: { label: RECEBIVEIS_STATUS_LABELS.liquidado, className: "bg-green-100 text-green-800" },
  reprovado_cancelado: { label: RECEBIVEIS_STATUS_LABELS.reprovado_cancelado, className: "bg-red-100 text-red-800" },
};
