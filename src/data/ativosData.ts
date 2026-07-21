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
  FileQuestion,
  CheckCircle2,
  Clock,
  AlertTriangle,
  CircleDashed,
  type LucideIcon,
} from "lucide-react";

import type { DocTipo, DocStatus, Cadencia } from "@/lib/api/documentoService";

export interface DocTypeMeta {
  label: string;
  /** Cadência sugerida ao criar um novo documento — o usuário pode trocar livremente depois. */
  cadenciaSugerida: Cadencia;
  icon: LucideIcon;
  /** Default responsible area (used to pre-fill the linked prazo). */
  resp: string;
}

export const DOC_TYPES: Record<DocTipo, DocTypeMeta> = {
  contrato_social: { label: "Contrato Social", cadenciaSugerida: "quando_houver_alteracao", icon: FileSignature, resp: "Jurídico" },
  df: { label: "DF (Demonstrações Financeiras)", cadenciaSugerida: "anual", icon: FileBarChart2, resp: "Contábil" },
  balancete: { label: "Balancete", cadenciaSugerida: "trimestral", icon: FileSpreadsheet, resp: "Financeiro" },
  cronograma: { label: "Cronograma de Obra", cadenciaSugerida: "mensal", icon: CalendarRange, resp: "Engenharia" },
  matricula: { label: "Matrícula dos Imóveis", cadenciaSugerida: "anual", icon: FileText, resp: "Jurídico" },
  planilha_vendas: { label: "Planilha de Vendas", cadenciaSugerida: "mensal", icon: Table, resp: "Comercial" },
  outro: { label: "Outro", cadenciaSugerida: "sem_cadencia", icon: FileQuestion, resp: "Geral" },
};

export const CADENCIA_LABELS: Record<Cadencia, string> = {
  mensal: "Mensal",
  trimestral: "Trimestral",
  semestral: "Semestral",
  anual: "Anual",
  quando_houver_alteracao: "Quando há alteração",
  sem_cadencia: "Sem cadência definida",
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

/** Cadência sugerida ao criar um novo documento de `tipo` — editável depois; matrícula é condicional ao ativo. */
export function cadenciaSugerida(tipo: DocTipo, imovelNoNomeDoFundo: boolean): Cadencia {
  if (tipo === "matricula") return imovelNoNomeDoFundo ? "anual" : "semestral";
  return DOC_TYPES[tipo].cadenciaSugerida;
}

/** Explanatory note for a conditional cadence, or null. */
export function cadenciaNote(tipo: DocTipo, imovelNoNomeDoFundo: boolean): string | null {
  if (tipo !== "matricula") return null;
  return imovelNoNomeDoFundo
    ? "Imóvel já averbado em nome do fundo → atualização anual."
    : "Imóvel ainda não está em nome do fundo → atualização semestral.";
}
