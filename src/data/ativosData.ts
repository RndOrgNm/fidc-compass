/**
 * Mock document repository for the Fundos › Ativos tab.
 *
 * Each Ativo (SPE/empreendimento) of a fund keeps a set of tracked documents
 * (contrato social, DF, balancete, cronograma, matrículas, planilha de vendas),
 * each with a cadence, a reference period, the stored file, a status, and an
 * optional linked Prazo. Following the repo's `src/data/` mock convention
 * (see cotistasData.ts) this seeds the real-estate funds; other funds return
 * null and the tab shows an empty state.
 *
 * When a backend exists, replace `getAtivosData` with a service call — the
 * component only depends on the `AtivosFundo` shape.
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

export type DocTipo =
  | "contrato_social"
  | "df"
  | "balancete"
  | "cronograma"
  | "matricula"
  | "planilha_vendas";

export type DocStatus = "em-dia" | "vencendo" | "vencido" | "pendente";

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

export interface DocArquivo {
  nome: string;
  tamanho: string;
}

/** Summary of a Prazo linked to a document (mock — real link is by id later). */
export interface LinkedPrazo {
  titulo: string;
  data: string; // dd/MM/yyyy
  resp: string;
}

export interface Documento {
  tipo: DocTipo;
  periodo: string | null;
  versao?: string | null;
  vigente?: string | null; // dd/MM/yyyy the current file is valid from
  status: DocStatus;
  arquivo?: DocArquivo | null;
  prazo?: LinkedPrazo | null;
}

export interface AtivoAsset {
  nome: string;
  sub: string;
  /** CSS color for the card's left accent border. */
  cor: string;
  /** Drives the conditional matrícula cadence (semestral vs anual). */
  imovelNoNomeDoFundo: boolean;
  documentos: Documento[];
}

export interface AtivosFundo {
  asOf: string;
  assets: AtivoAsset[];
}

const COR_OK = "hsl(var(--success))";
const COR_ALERTA = "#E0A23C";
const COR_ATRASO = "hsl(var(--destructive))";
const COR_NEUTRO = "hsl(var(--muted-foreground))";

/** Cadence label for a document type on a given asset (matrícula is conditional). */
export function cadenciaLabel(tipo: DocTipo, asset: AtivoAsset): string {
  if (tipo === "matricula") return asset.imovelNoNomeDoFundo ? "Anual" : "Semestral";
  return DOC_TYPES[tipo].cadencia;
}

/** Explanatory note for a conditional cadence, or null. */
export function cadenciaNote(tipo: DocTipo, asset: AtivoAsset): string | null {
  if (tipo !== "matricula") return null;
  return asset.imovelNoNomeDoFundo
    ? "Imóvel já averbado em nome do fundo → atualização anual."
    : "Imóvel ainda não está em nome do fundo → atualização semestral.";
}

// ── Seeded funds ────────────────────────────────────────────────────────────
const SEEDED: Record<number, AtivosFundo> = {
  // FII BRASIL INCORPORAÇÃO RL
  64089566: {
    asOf: "fev/2026",
    assets: [
      {
        nome: "The Sun · Luxury Style",
        sub: "SPE 127 · entregue 25/10/2023 · sem dívida",
        cor: COR_OK,
        imovelNoNomeDoFundo: true,
        documentos: [
          { tipo: "contrato_social", periodo: "5ª alteração", versao: "v5", vigente: "14/11/2023", status: "em-dia", arquivo: { nome: "ContratoSocial_TheSun_v5.pdf", tamanho: "1,2 MB" } },
          { tipo: "df", periodo: "Exercício 2025", versao: "v1", vigente: "20/03/2026", status: "em-dia", arquivo: { nome: "DF_TheSun_2025.pdf", tamanho: "3,4 MB" }, prazo: { titulo: "DF anual — The Sun · SPE 127", data: "20/03/2027", resp: "Contábil" } },
          { tipo: "balancete", periodo: "4º tri/2025", versao: "v1", vigente: "18/01/2026", status: "vencendo", arquivo: { nome: "Balancete_TheSun_4T25.xlsx", tamanho: "640 KB" }, prazo: { titulo: "Balancete 2º tri/2026 — The Sun", data: "20/06/2026", resp: "Financeiro" } },
          { tipo: "cronograma", periodo: "out/2023 (obra concluída)", versao: "final", vigente: "25/10/2023", status: "em-dia", arquivo: { nome: "Cronograma_TheSun_final.pdf", tamanho: "2,1 MB" } },
          { tipo: "matricula", periodo: "2025", versao: "v3", vigente: "05/02/2026", status: "em-dia", arquivo: { nome: "Matriculas_TheSun_2025.pdf", tamanho: "4,8 MB" }, prazo: { titulo: "Matrícula dos imóveis — The Sun", data: "05/02/2027", resp: "Jurídico" } },
          { tipo: "planilha_vendas", periodo: "fev/2026", versao: "v1", vigente: "03/03/2026", status: "em-dia", arquivo: { nome: "PlanilhaVendas_TheSun_fev26.xlsx", tamanho: "310 KB" } },
        ],
      },
      {
        nome: "Wish 37 (M.Bueno)",
        sub: "SPE 154 · Goiânia/GO · entrega 30/06/2026",
        cor: COR_ALERTA,
        imovelNoNomeDoFundo: false,
        documentos: [
          { tipo: "contrato_social", periodo: "3ª alteração", versao: "v3", vigente: "02/10/2024", status: "em-dia", arquivo: { nome: "ContratoSocial_Wish37_v3.pdf", tamanho: "980 KB" } },
          { tipo: "df", periodo: "Exercício 2025", versao: null, vigente: null, status: "vencido", arquivo: null, prazo: { titulo: "DF anual — Wish 37 · SPE 154", data: "31/03/2026", resp: "Contábil" } },
          { tipo: "balancete", periodo: "4º tri/2025", versao: "v1", vigente: "22/01/2026", status: "vencendo", arquivo: { nome: "Balancete_Wish37_4T25.xlsx", tamanho: "712 KB" }, prazo: { titulo: "Balancete 1º tri/2026 — Wish 37", data: "20/06/2026", resp: "Financeiro" } },
          { tipo: "cronograma", periodo: "mai/2026", versao: "v1", vigente: "02/06/2026", status: "em-dia", arquivo: { nome: "Cronograma_Wish37_mai26.pdf", tamanho: "1,8 MB" }, prazo: { titulo: "Cronograma de obra — Wish 37", data: "10/07/2026", resp: "Engenharia" } },
          { tipo: "matricula", periodo: "1º sem/2026", versao: null, vigente: null, status: "pendente", arquivo: null },
          { tipo: "planilha_vendas", periodo: "mai/2026", versao: "v1", vigente: "03/06/2026", status: "em-dia", arquivo: { nome: "PlanilhaVendas_Wish37_mai26.xlsx", tamanho: "455 KB" } },
        ],
      },
      {
        nome: "Wish Park / Gran Park",
        sub: "SPE 164 · Jundiaí + Gran Park · entrega abr–mai/2026",
        cor: COR_ATRASO,
        imovelNoNomeDoFundo: false,
        documentos: [
          { tipo: "contrato_social", periodo: "2ª alteração", versao: "v2", vigente: "10/06/2023", status: "em-dia", arquivo: { nome: "ContratoSocial_WishPark_v2.pdf", tamanho: "1,0 MB" } },
          { tipo: "df", periodo: "Exercício 2025", versao: "v1", vigente: "28/03/2026", status: "em-dia", arquivo: { nome: "DF_WishPark_2025.pdf", tamanho: "2,9 MB" } },
          { tipo: "balancete", periodo: "4º tri/2025", versao: null, vigente: null, status: "vencido", arquivo: null, prazo: { titulo: "Balancete 4º tri/2025 — Wish Park/Gran Park", data: "20/01/2026", resp: "Financeiro" } },
          { tipo: "cronograma", periodo: "mai/2026", versao: "v1", vigente: "01/06/2026", status: "em-dia", arquivo: { nome: "Cronograma_WishPark_mai26.pdf", tamanho: "2,0 MB" } },
          { tipo: "matricula", periodo: "2º sem/2025", versao: "v1", vigente: "15/12/2025", status: "vencendo", arquivo: { nome: "Matriculas_WishPark_2S25.pdf", tamanho: "3,6 MB" }, prazo: { titulo: "Matrícula dos imóveis — Wish Park/Gran Park", data: "15/06/2026", resp: "Jurídico" } },
          { tipo: "planilha_vendas", periodo: null, versao: null, vigente: null, status: "pendente", arquivo: null },
        ],
      },
      {
        nome: "Wish Down Town",
        sub: "SPE 171 · incorporação em 22/04/2026 · em estruturação",
        cor: COR_NEUTRO,
        imovelNoNomeDoFundo: false,
        documentos: [],
      },
    ],
  },
};

/** Returns the document repository for a fund, or null when it has none. */
export function getAtivosData(fundoId: number): AtivosFundo | null {
  return SEEDED[fundoId] ?? null;
}
