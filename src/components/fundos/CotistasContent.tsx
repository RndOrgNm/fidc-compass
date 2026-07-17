import { useMemo } from "react";
import { ArrowDownLeft, ArrowUpRight, Minus, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatBrlCompact } from "@/lib/formatBr";
import { useHomeMetrics } from "@/hooks/useHomeMetrics";
import {
  getCotistasData,
  isSeededCotistas,
  type CotistaClasse,
  type MovimentacaoTipo,
} from "@/data/cotistasData";

export interface CotistasContentProps {
  fundoId: number | null;
  fundName?: string;
}

const CLASSE_CHIP: Record<CotistaClasse, string> = {
  "Sênior": "bg-primary/15 text-primary",
  "Mezanino": "bg-amber-400/15 text-amber-400",
  "Subordinada": "bg-destructive/15 text-destructive",
  "Única": "bg-muted text-muted-foreground",
  "Diversas": "bg-muted text-muted-foreground",
};

const MOV_META: Record<
  MovimentacaoTipo,
  { icon: typeof ArrowDownLeft; wrap: string; sign: string }
> = {
  "Subscrição": { icon: ArrowDownLeft, wrap: "bg-primary/15 text-primary", sign: "text-primary" },
  "Resgate": { icon: ArrowUpRight, wrap: "bg-destructive/15 text-destructive", sign: "text-destructive" },
  "Amortização": { icon: Minus, wrap: "bg-amber-400/15 text-amber-400", sign: "text-muted-foreground" },
};

function pctBr(v: number): string {
  return `${v.toFixed(2).replace(".", ",")}%`;
}
function intBr(v: number): string {
  return v.toLocaleString("pt-BR");
}
function cotasSigned(v: number | null): string {
  if (v == null) return "—";
  return `${v > 0 ? "+" : v < 0 ? "−" : ""}${intBr(Math.abs(v))}`;
}

export function CotistasContent({ fundoId, fundName }: CotistasContentProps) {
  const { data: metrics, loading } = useHomeMetrics();

  const plAtual = useMemo(() => {
    if (fundoId == null || !metrics?.fundos) return null;
    return metrics.fundos.find((f) => f.idCarteira === fundoId)?.plAtual ?? null;
  }, [fundoId, metrics]);

  if (fundoId == null) {
    return (
      <p className="py-16 text-center text-sm text-muted-foreground">
        Selecione um fundo para ver seus cotistas.
      </p>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando cotistas…
      </div>
    );
  }

  const data = getCotistasData(fundoId);
  const pl = plAtual ?? 0;
  const multi = data.classes.length > 1;
  const valorDe = (pct: number) => (pl > 0 ? formatBrlCompact((pl * pct) / 100) : "—");

  return (
    <div>
      {/* ── KPIs ── */}
      <div className="mb-7 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-border bg-card/50 px-[17px] py-[15px]">
          <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Total de cotistas</div>
          <div className="mt-2 text-[22px] font-semibold tabular-nums tracking-tight">{intBr(data.totalCotistas)}</div>
          <div className="mt-1.5 text-[11px] text-muted-foreground">Base ativa</div>
        </div>
        <div className="rounded-lg border border-border bg-card/50 px-[17px] py-[15px]">
          <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Cotas emitidas</div>
          <div className="mt-2 text-[22px] font-semibold tabular-nums tracking-tight">{intBr(data.cotasEmitidas)}</div>
          <div className="mt-1.5 text-[11px] text-muted-foreground">Em circulação</div>
        </div>
        <div className="rounded-lg border border-border bg-card/50 px-[17px] py-[15px]">
          <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Concentração top 5</div>
          <div className="mt-2 text-[22px] font-semibold tabular-nums tracking-tight">
            {data.concentracaoTop5.toFixed(1).replace(".", ",")}<small className="ml-0.5 text-[13px] font-normal text-muted-foreground">%</small>
          </div>
          <div className="mt-1.5 text-[11px] text-muted-foreground">do patrimônio líquido</div>
        </div>
        <div className="rounded-lg border border-border bg-card/50 px-[17px] py-[15px]">
          <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Classes de cota</div>
          <div className="mt-2 text-[22px] font-semibold tabular-nums tracking-tight">
            {data.classes.length}<small className="ml-1 text-[13px] font-normal text-muted-foreground">{data.classes.length > 1 ? "classes" : "classe"}</small>
          </div>
          <div className="mt-1.5 truncate text-[11px] text-muted-foreground">{data.classes.map((c) => c.nome).join(" · ")}</div>
        </div>
      </div>

      {/* ── Composição por classe ── */}
      <div className="mb-7">
        <div className="mb-4 flex items-baseline justify-between">
          <h3 className="text-base font-semibold">Composição por classe</h3>
          <span className="text-xs text-muted-foreground">% do patrimônio líquido</span>
        </div>
        <div className="flex h-[30px] overflow-hidden rounded-md border border-border">
          {data.classes.map((c, i) => (
            <div
              key={i}
              className="flex items-center justify-center text-[11px] font-semibold text-[#06281f]"
              style={{ width: `${c.pct}%`, background: c.cor }}
            >
              {c.pct >= 8 ? `${c.pct}%` : ""}
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-5">
          {data.classes.map((c, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <i className="h-2.5 w-2.5 rounded-sm" style={{ background: c.cor }} />
              {c.nome} <span className="font-mono tabular-nums text-muted-foreground">{c.pct}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Registro de cotistas ── */}
      <div className="mb-4 flex items-baseline justify-between">
        <h3 className="text-base font-semibold">Registro de cotistas</h3>
        <span className="text-xs text-muted-foreground">Posição em {metrics?.asOf ?? "—"}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-border text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              <th className="pb-2.5 pr-3.5 text-left font-medium">Cotista</th>
              <th className="pb-2.5 px-3.5 text-left font-medium">Perfil</th>
              {multi && <th className="pb-2.5 px-3.5 text-left font-medium">Classe</th>}
              <th className="pb-2.5 px-3.5 text-right font-medium">Cotas</th>
              <th className="pb-2.5 px-3.5 text-right font-medium">% do PL</th>
              <th className="pb-2.5 px-3.5 text-right font-medium">Valor</th>
              <th className="pb-2.5 pl-3.5 text-right font-medium">Posição desde</th>
            </tr>
          </thead>
          <tbody>
            {data.registro.map((r, i) => (
              <tr
                key={i}
                className={cn(
                  "border-b border-border/50 transition-colors hover:bg-card/40",
                  i === data.registro.length - 1 && "border-b-0",
                )}
              >
                <td className="py-3 pr-3.5">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[13.5px] text-foreground">{r.nome}</span>
                    {r.doc !== "—" && <span className="font-mono text-[11px] text-muted-foreground">{r.doc}</span>}
                  </div>
                </td>
                <td className="px-3.5 py-3 text-left text-xs text-muted-foreground">{r.perfil}</td>
                {multi && (
                  <td className="px-3.5 py-3 text-left">
                    <span className={cn("inline-block rounded-full px-2.5 py-[3px] text-[10px] font-medium tracking-wide", CLASSE_CHIP[r.classe])}>
                      {r.classe}
                    </span>
                  </td>
                )}
                <td className="px-3.5 py-3 text-right font-mono text-[13px] tabular-nums text-foreground/85">{intBr(r.cotas)}</td>
                <td className="px-3.5 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <span className="h-[5px] w-[54px] overflow-hidden rounded-full bg-muted">
                      <i className="block h-full rounded-full bg-primary" style={{ width: `${Math.min(100, r.pctPl)}%` }} />
                    </span>
                    <span className="font-mono text-[13px] tabular-nums text-foreground/85">{pctBr(r.pctPl)}</span>
                  </div>
                </td>
                <td className="px-3.5 py-3 text-right font-mono text-[13px] tabular-nums text-foreground/85">{valorDe(r.pctPl)}</td>
                <td className="py-3 pl-3.5 text-right font-mono text-[13px] tabular-nums text-muted-foreground">{r.desde}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Movimentação recente ── */}
      <div className="mb-4 mt-9 flex items-baseline justify-between">
        <h3 className="text-base font-semibold">Movimentação recente</h3>
        <span className="text-xs text-muted-foreground">Subscrições, resgates e amortizações</span>
      </div>
      <div className="overflow-hidden rounded-lg border border-border">
        {data.movimentacao.map((m, i) => {
          const meta = MOV_META[m.tipo];
          const MovIcon = meta.icon;
          return (
            <div
              key={i}
              className={cn(
                "flex items-center gap-3 border-b border-border/50 px-4 py-3",
                i === data.movimentacao.length - 1 && "border-b-0",
              )}
            >
              <div className={cn("flex h-[30px] w-[30px] flex-none items-center justify-center rounded-lg", meta.wrap)}>
                <MovIcon className="h-[15px] w-[15px]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-medium">{m.tipo} · {m.cotista}</div>
                <div className="mt-0.5 text-[11px] text-muted-foreground">{m.data}</div>
              </div>
              <div className="text-right">
                <div className={cn("font-mono text-[13px] tabular-nums", meta.sign)}>{cotasSigned(m.cotas)}</div>
                <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">{formatBrlCompact(m.valor)}</div>
              </div>
            </div>
          );
        })}
      </div>

      {!isSeededCotistas(fundoId) && (
        <p className="mt-6 text-[11px] text-muted-foreground/70">
          Dados ilustrativos — integração com a base de cotistas pendente.
        </p>
      )}
    </div>
  );
}
