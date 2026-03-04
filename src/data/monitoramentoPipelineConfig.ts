import type { MonitoramentoPipelineStatus } from "@/data/pipelineData";

/** Single source for Monitoramento pipeline status display titles. Change here to update labels across the app. */
export const MONITORAMENTO_STATUS_LABELS: Record<MonitoramentoPipelineStatus, string> = {
  alertas_deteccao: "Alertas Detecção",
  correcoes_acoes: "Correções/Ações",
  relatorios_em_andamento: "Relatórios em Andamento",
  em_conformidade_auditoria: "Em conformidade/Auditoria",
  encerrado: "Encerrado",
};

/** Statuses where the card can be deleted (terminal states). */
export const MONITORAMENTO_TERMINAL_STATUSES: MonitoramentoPipelineStatus[] = ["encerrado"];

export function isMonitoramentoTerminal(status: MonitoramentoPipelineStatus): boolean {
  return MONITORAMENTO_TERMINAL_STATUSES.includes(status);
}

/** Kanban columns with id, title (from labels), and color. STATUS_ORDER derived from id order. */
export const MONITORAMENTO_COLUMNS: {
  id: MonitoramentoPipelineStatus;
  title: string;
  color: string;
}[] = [
  { id: "alertas_deteccao", title: MONITORAMENTO_STATUS_LABELS.alertas_deteccao, color: "border-amber-500" },
  { id: "correcoes_acoes", title: MONITORAMENTO_STATUS_LABELS.correcoes_acoes, color: "border-orange-500" },
  {
    id: "relatorios_em_andamento",
    title: MONITORAMENTO_STATUS_LABELS.relatorios_em_andamento,
    color: "border-blue-500",
  },
  {
    id: "em_conformidade_auditoria",
    title: MONITORAMENTO_STATUS_LABELS.em_conformidade_auditoria,
    color: "border-purple-500",
  },
  { id: "encerrado", title: MONITORAMENTO_STATUS_LABELS.encerrado, color: "border-green-500" },
];

/** Badge config for list views. Label from MONITORAMENTO_STATUS_LABELS. */
export const MONITORAMENTO_STATUS_BADGES: Record<
  MonitoramentoPipelineStatus,
  { label: string; className: string }
> = {
  alertas_deteccao: {
    label: MONITORAMENTO_STATUS_LABELS.alertas_deteccao,
    className: "bg-amber-100 text-amber-800",
  },
  correcoes_acoes: { label: MONITORAMENTO_STATUS_LABELS.correcoes_acoes, className: "bg-orange-100 text-orange-800" },
  relatorios_em_andamento: {
    label: MONITORAMENTO_STATUS_LABELS.relatorios_em_andamento,
    className: "bg-blue-100 text-blue-800",
  },
  em_conformidade_auditoria: {
    label: MONITORAMENTO_STATUS_LABELS.em_conformidade_auditoria,
    className: "bg-purple-100 text-purple-800",
  },
  encerrado: { label: MONITORAMENTO_STATUS_LABELS.encerrado, className: "bg-green-100 text-green-800" },
};
