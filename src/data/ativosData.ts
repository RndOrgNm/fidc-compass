/**
 * Presentation metadata for the Fundos › Ativos tab (document repository).
 *
 * Domain data (Ativo, Documento, status) is live now — fetched via
 * `@/lib/api/documentoService`, which mirrors funds-pipeline's
 * `src/api/models/enums.py` DOC_TYPES catalog. This file only keeps what the
 * backend has no business knowing about: icons and Tailwind chip classes.
 */
import {
  FileSignature,
  FileBarChart2,
  FileSpreadsheet,
  CalendarRange,
  FileText,
  Table,
  CheckCircle2,
  Clock,
  AlertTriangle,
  CircleDashed,
  type LucideIcon,
} from "lucide-react";

import type { DocTipo, DocStatus } from "@/lib/api/documentoService";

export interface DocTypeMeta {
  label: string;
  /** Human cadence, or "condicional" when it depends on the asset. */
  cadencia: string;
  icon: LucideIcon;
  /** Default responsible area (used to pre-fill the linked prazo). */
  resp: string;
}

export const DOC_TYPES: Record<DocTipo, DocTypeMeta> = {
  contrato_social: { label: "Contrato Social", cadencia: "Quando há alteração", icon: FileSignature, resp: "Jurídico" },
  df: { label: "DF (Demonstrações Financeiras)", cadencia: "Anual", icon: FileBarChart2, resp: "Contábil" },
  balancete: { label: "Balancete", cadencia: "Trimestral", icon: FileSpreadsheet, resp: "Financeiro" },
  cronograma: { label: "Cronograma de Obra", cadencia: "Mensal", icon: CalendarRange, resp: "Engenharia" },
  matricula: { label: "Matrícula dos Imóveis", cadencia: "condicional", icon: FileText, resp: "Jurídico" },
  planilha_vendas: { label: "Planilha de Vendas", cadencia: "Mensal", icon: Table, resp: "Comercial" },
};

export interface DocStatusMeta {
  label: string;
  icon: LucideIcon;
  /** Tailwind chip classes (repo semantic tokens). */
  chip: string;
}

export const DOC_STATUS: Record<DocStatus, DocStatusMeta> = {
  "em-dia": { label: "Em dia", icon: CheckCircle2, chip: "bg-success/15 text-success" },
  vencendo: { label: "Vencendo", icon: Clock, chip: "bg-amber-400/15 text-amber-400" },
  vencido: { label: "Vencido", icon: AlertTriangle, chip: "bg-destructive/15 text-destructive" },
  pendente: { label: "Pendente", icon: CircleDashed, chip: "bg-muted text-muted-foreground" },
};

/** Cadence label for a document type on a given asset (matrícula is conditional). */
export function cadenciaLabel(tipo: DocTipo, imovelNoNomeDoFundo: boolean): string {
  if (tipo === "matricula") return imovelNoNomeDoFundo ? "Anual" : "Semestral";
  return DOC_TYPES[tipo].cadencia;
}

/** Explanatory note for a conditional cadence, or null. */
export function cadenciaNote(tipo: DocTipo, imovelNoNomeDoFundo: boolean): string | null {
  if (tipo !== "matricula") return null;
  return imovelNoNomeDoFundo
    ? "Imóvel já averbado em nome do fundo → atualização anual."
    : "Imóvel ainda não está em nome do fundo → atualização semestral.";
}
