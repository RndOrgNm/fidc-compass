/**
 * Mock "Ativos" register for the Fundos › Ativos tab — contractual obligations
 * grouped by empreendimento/SPE, for real-estate development funds.
 *
 * There is no empreendimento dimension in the obrigações backend yet
 * (obligations are typed by `categoria`, not tied to an SPE), so — following
 * the repo's `src/data/` mock convention (see cotistasData.ts / pipelineData.ts)
 * — this module seeds the real-estate funds that have this structure. Funds
 * without a seed return `null`, which the component renders as an empty state
 * (matching the design: "other fund types show an empty state").
 *
 * When the register gains a backend, replace `getAtivosData` with a service
 * call — the component only depends on the `AtivosFundo` shape.
 */

export type AtivoStatus = "Em dia" | "Atrasado" | "Não iniciado";

export interface AtivoObrigacao {
  /** Contract reference, e.g. "CVC 2.1" or "Instr. Recompra 6.1". */
  item: string;
  obrigacao: string;
  responsavel: string;
  /** Free-form due date: "30/06/2026", "dia 10 de cada mês", or "—". */
  vencimento: string;
  status: AtivoStatus;
}

export interface AtivoAsset {
  nome: string;
  /** Sub-line: SPE, location, delivery, debt note. */
  sub: string;
  /** CSS color for the card's left accent border (overall health). */
  cor: string;
  obrigacoes: AtivoObrigacao[];
}

export interface AtivosFundo {
  /** Reference period, e.g. "fev/2026". */
  asOf: string;
  assets: AtivoAsset[];
}

const COR_OK = "hsl(var(--success))";
const COR_ALERTA = "#E0A23C";
const COR_ATRASO = "hsl(var(--destructive))";

// ── Seeded funds ────────────────────────────────────────────────────────────
const SEEDED: Record<number, AtivosFundo> = {
  // FII BRASIL INCORPORAÇÃO RL — real-estate development fund (SPEs 127/154/164)
  64089566: {
    asOf: "fev/2026",
    assets: [
      {
        nome: "The Sun · Luxury Style",
        sub: "SPE 127 · entregue 25/10/2023 · sem dívida",
        cor: COR_OK,
        obrigacoes: [
          { item: "CVC 2.1", obrigacao: "Averbação de construção", responsavel: "SPE", vencimento: "—", status: "Em dia" },
          { item: "CVC 2.4", obrigacao: "Quitação do financiamento à produção", responsavel: "SPE", vencimento: "—", status: "Em dia" },
          { item: "Instr. Recompra 6.1", obrigacao: "Espelho de vendas mensal", responsavel: "SPE", vencimento: "dia 10 de cada mês", status: "Em dia" },
        ],
      },
      {
        nome: "Wish 37 (M.Bueno)",
        sub: "SPE 154 · Goiânia/GO · entrega 30/06/2026",
        cor: COR_ALERTA,
        obrigacoes: [
          { item: "CVC 1.3", obrigacao: "Quitar débitos de IPTU", responsavel: "SPE", vencimento: "31/08/2026", status: "Não iniciado" },
          { item: "CVC 1.5.2", obrigacao: "Habite-se (tolerância 180 dias)", responsavel: "SPE", vencimento: "30/06/2026", status: "Não iniciado" },
          { item: "Instr. Recompra 1.1", obrigacao: "Recomprar unidades — Prazo Inicial 24 meses", responsavel: "SPE", vencimento: "13/12/2027", status: "Não iniciado" },
          { item: "Instr. Recompra 1.2.2", obrigacao: "Registro/averbação e cancelamento do ônus", responsavel: "SPE", vencimento: "30/03/2027", status: "Não iniciado" },
          { item: "Instr. Recompra 1.6", obrigacao: "Espelho de Vendas mensal", responsavel: "SPE", vencimento: "dia 10 de cada mês", status: "Em dia" },
          { item: "Instr. Recompra 5.1", obrigacao: "Prêmio mensal (13% + IPCA)", responsavel: "SPE", vencimento: "10º dia útil", status: "Em dia" },
        ],
      },
      {
        nome: "Wish Park / Gran Park",
        sub: "SPE 164 · Jundiaí + Gran Park · entrega abr–mai/2026",
        cor: COR_ATRASO,
        obrigacoes: [
          { item: "CVC 3.2", obrigacao: "Habite-se — torre Gran Park", responsavel: "SPE", vencimento: "15/09/2026", status: "Atrasado" },
          { item: "Instr. Recompra 3.1", obrigacao: "Recomprar unidades inadimplentes", responsavel: "SPE", vencimento: "20/05/2026", status: "Atrasado" },
          { item: "Instr. Recompra 3.6", obrigacao: "Espelho de Vendas mensal", responsavel: "SPE", vencimento: "dia 10 de cada mês", status: "Em dia" },
        ],
      },
    ],
  },
};

/** Returns the ativos register for a fund, or null when the fund has none. */
export function getAtivosData(fundoId: number): AtivosFundo | null {
  return SEEDED[fundoId] ?? null;
}
