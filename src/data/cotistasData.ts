/**
 * Mock cotista (quotaholder) register for the Fundos › Cotistas tab.
 *
 * There is no cotista backend yet, so — following the repo's existing
 * `src/data/` mock convention (see pipelineData.ts) — this module provides a
 * small seeded dataset plus a deterministic fallback so ANY fund renders.
 * Monetary values are derived from each fund's real `plAtual` at call time, so
 * the split stays consistent with the live dashboard PL.
 *
 * When the real register API lands, replace `getCotistasData` with a service
 * call (mirror `prazoService.ts`) — the component only depends on this shape.
 */

export type CotistaPerfil = "Profissional" | "Qualificado" | "Varejo" | "Diversos";
export type CotistaClasse =
  | "Única"
  | "Sênior"
  | "Mezanino"
  | "Subordinada"
  | "Diversas";

export interface ClasseComposicao {
  nome: CotistaClasse;
  /** Share of PL (%) — the segments should sum to ~100. */
  pct: number;
  /** CSS color for the composition bar / legend swatch. */
  cor: string;
}

export interface CotistaRegistro {
  nome: string;
  /** Masked document (CNPJ/CPF) or "—" for aggregated rows. */
  doc: string;
  perfil: CotistaPerfil;
  classe: CotistaClasse;
  cotas: number;
  /** Share of the fund's PL (%). */
  pctPl: number;
  desde: string; // dd/MM/yyyy or "—"
  /** True for the "Outros N cotistas" summary row. */
  agregado?: boolean;
}

export type MovimentacaoTipo = "Subscrição" | "Resgate" | "Amortização";

export interface CotistaMovimentacao {
  tipo: MovimentacaoTipo;
  cotista: string;
  /** Signed cota delta; null when not applicable (amortização). */
  cotas: number | null;
  /** Absolute financial amount (R$). */
  valor: number;
  data: string; // dd/MM/yyyy
}

export interface CotistaRegistroFundo {
  totalCotistas: number;
  cotasEmitidas: number;
  /** % of PL held by the five largest holders. */
  concentracaoTop5: number;
  classes: ClasseComposicao[];
  registro: CotistaRegistro[];
  movimentacao: CotistaMovimentacao[];
}

// Color tokens (resolve against the theme in globals) ------------------------
const COR_EMERALD = "hsl(var(--primary))";
const COR_AMBER = "#E0A23C";
const COR_CORAL = "hsl(var(--destructive))";

// ── Seeded funds ────────────────────────────────────────────────────────────
const SEEDED: Record<number, CotistaRegistroFundo> = {
  // FII OMEGA — single-class real-estate fund
  58268583: {
    totalCotistas: 1284,
    cotasEmitidas: 1_238_642,
    concentracaoTop5: 38.4,
    classes: [{ nome: "Única", pct: 100, cor: COR_EMERALD }],
    registro: [
      { nome: "Previdência Itaú Master FII", doc: "CNPJ ••.•••.•••/0001-22", perfil: "Profissional", classe: "Única", cotas: 142_380, pctPl: 11.49, desde: "12/03/2021" },
      { nome: "XP Alocação Multimercado FIC", doc: "CNPJ ••.•••.•••/0001-08", perfil: "Profissional", classe: "Única", cotas: 118_204, pctPl: 9.54, desde: "30/06/2021" },
      { nome: "Fundação Vale Seguridade", doc: "CNPJ ••.•••.•••/0001-71", perfil: "Profissional", classe: "Única", cotas: 96_512, pctPl: 7.79, desde: "05/11/2020" },
      { nome: "Bradesco RPPS Renda Imob.", doc: "CNPJ ••.•••.•••/0001-46", perfil: "Qualificado", classe: "Única", cotas: 62_840, pctPl: 5.07, desde: "18/02/2022" },
      { nome: "Eduardo M. Salgado", doc: "CPF •••.•••.•••-04", perfil: "Qualificado", classe: "Única", cotas: 41_220, pctPl: 3.33, desde: "22/09/2022" },
      { nome: "Helena R. Tavares", doc: "CPF •••.•••.•••-55", perfil: "Qualificado", classe: "Única", cotas: 28_910, pctPl: 2.33, desde: "14/01/2023" },
      { nome: "Outros 1.278 cotistas", doc: "—", perfil: "Diversos", classe: "Única", cotas: 748_576, pctPl: 60.45, desde: "—", agregado: true },
    ],
    movimentacao: [
      { tipo: "Subscrição", cotista: "Previdência Itaú Master FII", cotas: 8_400, valor: 2_250_000, data: "06/05/2026" },
      { tipo: "Resgate", cotista: "Helena R. Tavares", cotas: -3_100, valor: 830_000, data: "29/04/2026" },
      { tipo: "Subscrição", cotista: "Novo cotista (varejo qualif.)", cotas: 1_250, valor: 330_000, data: "27/04/2026" },
    ],
  },

  // FIDC ORIGIN RL — multi-class credit fund (senior/mezz/sub structure)
  61872284: {
    totalCotistas: 47,
    cotasEmitidas: 7_780,
    concentracaoTop5: 72.1,
    classes: [
      { nome: "Sênior", pct: 78, cor: COR_EMERALD },
      { nome: "Mezanino", pct: 14, cor: COR_AMBER },
      { nome: "Subordinada", pct: 8, cor: COR_CORAL },
    ],
    registro: [
      { nome: "Sul América Crédito Estr. FIC", doc: "CNPJ ••.•••.•••/0001-33", perfil: "Profissional", classe: "Sênior", cotas: 2_180, pctPl: 28.02, desde: "01/08/2024" },
      { nome: "Vinci Crédito High Yield FIC", doc: "CNPJ ••.•••.•••/0001-12", perfil: "Profissional", classe: "Sênior", cotas: 1_560, pctPl: 20.05, desde: "14/09/2024" },
      { nome: "Kinea Crédito Privado FIC", doc: "CNPJ ••.•••.•••/0001-77", perfil: "Profissional", classe: "Mezanino", cotas: 1_089, pctPl: 14.00, desde: "02/10/2024" },
      { nome: "Banco Origin S.A. (Cedente)", doc: "CNPJ ••.•••.•••/0001-90", perfil: "Profissional", classe: "Subordinada", cotas: 624, pctPl: 8.02, desde: "01/08/2024" },
      { nome: "Outros 43 cotistas", doc: "—", perfil: "Diversos", classe: "Diversas", cotas: 2_327, pctPl: 29.91, desde: "—", agregado: true },
    ],
    movimentacao: [
      { tipo: "Amortização", cotista: "Classe Sênior (todos)", cotas: null, valor: 420_000, data: "30/04/2026" },
      { tipo: "Subscrição", cotista: "Vinci Crédito High Yield FIC", cotas: 260, valor: 310_000, data: "21/04/2026" },
    ],
  },
};

// ── Fallback (any non-seeded fund) ───────────────────────────────────────────
function buildFallback(fundoId: number): CotistaRegistroFundo {
  // Deterministic-ish spread so different funds look distinct but stable.
  const seed = fundoId % 7;
  const totalCotistas = 180 + seed * 47;
  const cotasEmitidas = 250_000 + seed * 38_500;
  const dist = [12.4, 8.7, 6.1, 4.3, 3.2];
  const top5 = dist.reduce((a, b) => a + b, 0);
  const registro: CotistaRegistro[] = [
    { nome: "Investidor institucional A", doc: "CNPJ ••.•••.•••/0001-10", perfil: "Profissional", classe: "Única", cotas: Math.round(cotasEmitidas * dist[0] / 100), pctPl: dist[0], desde: "10/04/2023" },
    { nome: "Investidor institucional B", doc: "CNPJ ••.•••.•••/0001-55", perfil: "Profissional", classe: "Única", cotas: Math.round(cotasEmitidas * dist[1] / 100), pctPl: dist[1], desde: "22/07/2023" },
    { nome: "Family office C", doc: "CNPJ ••.•••.•••/0001-24", perfil: "Qualificado", classe: "Única", cotas: Math.round(cotasEmitidas * dist[2] / 100), pctPl: dist[2], desde: "03/11/2023" },
    { nome: "Investidor qualificado D", doc: "CPF •••.•••.•••-30", perfil: "Qualificado", classe: "Única", cotas: Math.round(cotasEmitidas * dist[3] / 100), pctPl: dist[3], desde: "15/02/2024" },
    { nome: "Investidor qualificado E", doc: "CPF •••.•••.•••-88", perfil: "Qualificado", classe: "Única", cotas: Math.round(cotasEmitidas * dist[4] / 100), pctPl: dist[4], desde: "28/05/2024" },
    { nome: `Outros ${totalCotistas - 5} cotistas`, doc: "—", perfil: "Diversos", classe: "Única", cotas: Math.round(cotasEmitidas * (100 - top5) / 100), pctPl: Number((100 - top5).toFixed(2)), desde: "—", agregado: true },
  ];
  return {
    totalCotistas,
    cotasEmitidas,
    concentracaoTop5: Number(top5.toFixed(1)),
    classes: [{ nome: "Única", pct: 100, cor: COR_EMERALD }],
    registro,
    movimentacao: [
      { tipo: "Subscrição", cotista: "Investidor institucional A", cotas: 2_100, valor: 560_000, data: "05/05/2026" },
      { tipo: "Resgate", cotista: "Investidor qualificado D", cotas: -900, valor: 240_000, data: "28/04/2026" },
    ],
  };
}

/** Returns the cotista register for a fund (seeded when available, else generated). */
export function getCotistasData(fundoId: number): CotistaRegistroFundo {
  return SEEDED[fundoId] ?? buildFallback(fundoId);
}

/** True when the fund has hand-curated (vs. generated) data — used for the disclaimer. */
export function isSeededCotistas(fundoId: number): boolean {
  return fundoId in SEEDED;
}
