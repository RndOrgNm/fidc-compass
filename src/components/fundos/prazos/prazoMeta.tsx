import {
  Clock,
  CheckCheck,
  AlertTriangle,
  Bell,
  HelpCircle,
} from "lucide-react";
import type {
  Categoria,
  PrazoStatus,
  TipoPrazo,
  InstanciaResponse,
} from "@/lib/api/prazoService";

// Display status adds "ALERTA" (em janela de alerta) on top of the backend
// states — derived on the client for a PENDENTE instance inside its window.
export type DisplayStatus =
  | "PENDENTE"
  | "ALERTA"
  | "ATRASADO"
  | "AGUARDANDO_GATILHO"
  | "CONCLUIDO";

export const CAT_META: Record<Categoria, { label: string; color: string }> = {
  REGULATORIO: { label: "Regulatório", color: "#E0A23C" },
  OPERACIONAL: { label: "Operacional", color: "#10B981" },
  RECEBIVEL: { label: "Recebível", color: "#5FA8D3" },
  COTISTA: { label: "Cotista", color: "#9AA3B2" },
};

export const CAT_ORDER: Categoria[] = [
  "REGULATORIO",
  "OPERACIONAL",
  "RECEBIVEL",
  "COTISTA",
];

export const STATUS_META: Record<
  DisplayStatus,
  { label: string; icon: React.ReactNode; cls: string }
> = {
  PENDENTE: {
    label: "Pendente",
    icon: <Clock className="h-3 w-3" />,
    cls: "bg-amber-400/15 text-amber-400",
  },
  ALERTA: {
    label: "Em janela de alerta",
    icon: <Bell className="h-3 w-3" />,
    cls: "bg-amber-400/15 text-amber-400",
  },
  ATRASADO: {
    label: "Atrasado",
    icon: <AlertTriangle className="h-3 w-3" />,
    cls: "bg-destructive/15 text-destructive",
  },
  AGUARDANDO_GATILHO: {
    label: "Aguardando gatilho",
    icon: <HelpCircle className="h-3 w-3" />,
    cls: "bg-blue-400/15 text-blue-400",
  },
  CONCLUIDO: {
    label: "Concluído",
    icon: <CheckCheck className="h-3 w-3" />,
    cls: "bg-accent text-muted-foreground",
  },
};

export const TIPO_LABEL: Record<TipoPrazo, string> = {
  DIA_FIXO: "Dia fixo do mês",
  DIA_UTIL: "N-ésimo dia útil",
  DIAS_ANTES_DU: "Dias antes de dia útil",
  DIAS_APOS_EVENTO: "Dias após evento",
  FINAL_DO_MES: "Final do mês",
};

export const MES_ABBR = [
  "JAN", "FEV", "MAR", "ABR", "MAI", "JUN",
  "JUL", "AGO", "SET", "OUT", "NOV", "DEZ",
];

/** Parse a backend "YYYY-MM-DD" into a local Date (no timezone drift). */
export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Whole days from today (local) to an ISO date; negative = past. */
export function daysFromTodayISO(iso: string): number {
  const target = parseISODate(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

/** "YYYY-MM-DD" → "DD/MM/AAAA"; null → "—". */
export function formatVencBr(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function displayStatus(inst: InstanciaResponse): DisplayStatus {
  if (inst.status !== "PENDENTE") return inst.status as DisplayStatus;
  if (
    inst.data_vencimento &&
    daysFromTodayISO(inst.data_vencimento) <= inst.antecedencia_alerta_dias
  ) {
    return "ALERTA";
  }
  return "PENDENTE";
}

export function daysTxt(status: PrazoStatus, iso: string | null): string {
  if (status === "CONCLUIDO") return "Concluído";
  if (status === "AGUARDANDO_GATILHO") return "Sem data";
  if (!iso) return "—";
  const dias = daysFromTodayISO(iso);
  if (dias < 0) return `${Math.abs(dias)}d em atraso`;
  if (dias === 0) return "Hoje";
  if (dias === 1) return "Amanhã";
  return `em ${dias} dias`;
}
