import type { AllocationStatus } from "@/lib/api/allocationService";

/** Single source for Alocação pipeline status display titles. Change here to update labels across the app. */
export const ALLOCATION_STATUS_LABELS: Record<AllocationStatus, string> = {
  pending_match: "Aguardando Match",
  fund_selection: "Seleção de Fundo",
  compliance_check: "Verificação Compliance",
  allocated: "Alocado",
  rejected: "Rejeitado",
  withdrawn: "Desistência",
  superseded: "Substituído",
};

/** Statuses where the card can be deleted (terminal/rejected states). */
export const ALLOCATION_TERMINAL_STATUSES: AllocationStatus[] = ["rejected", "withdrawn", "superseded"];

export function isAllocationTerminal(status: AllocationStatus): boolean {
  return ALLOCATION_TERMINAL_STATUSES.includes(status);
}

/** Kanban columns (main flow). STATUS_ORDER derived from id order. */
export const ALLOCATION_COLUMNS: { id: AllocationStatus; title: string; color: string }[] = [
  { id: "pending_match", title: ALLOCATION_STATUS_LABELS.pending_match, color: "border-slate-500" },
  { id: "fund_selection", title: ALLOCATION_STATUS_LABELS.fund_selection, color: "border-blue-500" },
  { id: "compliance_check", title: ALLOCATION_STATUS_LABELS.compliance_check, color: "border-yellow-500" },
  { id: "allocated", title: ALLOCATION_STATUS_LABELS.allocated, color: "border-green-500" },
  { id: "rejected", title: ALLOCATION_STATUS_LABELS.rejected, color: "border-red-500" },
  { id: "withdrawn", title: ALLOCATION_STATUS_LABELS.withdrawn, color: "border-orange-500" },
  { id: "superseded", title: ALLOCATION_STATUS_LABELS.superseded, color: "border-gray-500" },
];

/** Badge config for list views. Label from ALLOCATION_STATUS_LABELS. */
export const ALLOCATION_STATUS_BADGES: Record<string, { label: string; className: string }> = {
  pending_match: { label: ALLOCATION_STATUS_LABELS.pending_match, className: "bg-slate-100 text-slate-800" },
  fund_selection: { label: ALLOCATION_STATUS_LABELS.fund_selection, className: "bg-blue-100 text-blue-800" },
  compliance_check: { label: ALLOCATION_STATUS_LABELS.compliance_check, className: "bg-yellow-100 text-yellow-800" },
  allocated: { label: ALLOCATION_STATUS_LABELS.allocated, className: "bg-green-100 text-green-800" },
  rejected: { label: ALLOCATION_STATUS_LABELS.rejected, className: "bg-red-100 text-red-800" },
  withdrawn: { label: ALLOCATION_STATUS_LABELS.withdrawn, className: "bg-orange-100 text-orange-800" },
  superseded: { label: ALLOCATION_STATUS_LABELS.superseded, className: "bg-gray-100 text-gray-800" },
};
