/** Payload from `public/dashboard/home-metrics.json` (exported from `data_fidc`). */

export interface HomeFundRow {
  idCarteira: number;
  nome: string;
  /** Display label (apelido / nome) — same source as `nome` in export. */
  apelido?: string;
  plAtual: number;
  plReferencia: number | null;
  /** True when reference PL is the last observation on or before (asOf − 30d). */
  referencia30dCompleta: boolean;
  variacaoPct: number | null;
  /** Previous observation PL (prior business day in history). */
  plDiaAnterior?: number | null;
  /** % change vs previous observation (day-on-day). */
  variacaoDiaPct?: number | null;
  /** CotaFechamentoMoedaCarteira (última data). */
  cotaAtual?: number | null;
  cotaDiaAnterior?: number | null;
  /** % change cota vs dia anterior. */
  variacaoCotaDiaPct?: number | null;
}

export interface HomeDashboardMetrics {
  asOf: string | null;
  lookbackDays: number;
  plSobGestao: number | null;
  fundosAtivos: number;
  variacaoPortfolioPct: number | null;
  /** Aggregate PL change vs previous day (funds with ≥2 observations). */
  variacaoPortfolioDiaPct?: number | null;
  captacaoLiquida30d: number | null;
  aportes30d: number | null;
  resgates30d: number | null;
  dividendos30d: number | null;
  flowsDisponiveis: boolean;
  fundos: HomeFundRow[];
}
