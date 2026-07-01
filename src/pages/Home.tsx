import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Landmark,
  LayoutDashboard,
  LineChart,
  Minus,
  Wallet,
} from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { FundSummaryCarousel } from "@/components/home/FundSummaryCarousel";
import { FundTicker } from "@/components/home/FundTicker";
import { Skeleton } from "@/components/ui/skeleton";
import { formatBrlCompact, formatPercentPoints, isNeutralPercent } from "@/lib/formatBr";
import { cn } from "@/lib/utils";
import type { HomeDashboardMetrics, HomeFundRow } from "@/types/homeDashboard";

const METRICS_URL = "/dashboard/home-metrics.json";

function fundDisplayName(f: HomeFundRow): string {
  const s = (f.apelido?.trim() || f.nome).trim();
  return s || "—";
}

function KpiHoverIcon({
  icon: Icon,
  ariaLabel,
  heading,
  disabled,
  children,
}: {
  icon: LucideIcon;
  ariaLabel: string;
  heading: string;
  disabled?: boolean;
  children: ReactNode;
}) {
  const chipClass =
    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary ring-1 ring-primary/20";

  if (disabled) {
    return (
      <div className={cn(chipClass, "opacity-60")} aria-hidden title={ariaLabel}>
        <Icon className="h-4 w-4" strokeWidth={2} />
      </div>
    );
  }

  return (
    <HoverCard openDelay={0} closeDelay={150}>
      <HoverCardTrigger asChild>
        <button
          type="button"
          className={cn(
            chipClass,
            "cursor-default transition-colors hover:bg-primary/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          )}
          aria-label={ariaLabel}
        >
          <Icon className="h-4 w-4" strokeWidth={2} />
        </button>
      </HoverCardTrigger>
      <HoverCardContent
        align="end"
        side="bottom"
        sideOffset={8}
        className="w-80 max-w-[min(20rem,calc(100vw-2rem))] max-h-[min(340px,50vh)] overflow-hidden p-0"
      >
        <div className="border-b border-border/60 px-3 py-2">
          <p className="text-sm font-semibold leading-tight">{heading}</p>
        </div>
        <div className="max-h-[min(280px,calc(50vh-3rem))] overflow-y-auto overscroll-contain px-3 py-3 text-sm">
          {children}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

function VariationBadge({ value }: { value: number | null }) {
  if (value == null || Number.isNaN(value)) {
    return <span className="text-muted-foreground tabular-nums">—</span>;
  }
  const neutral = isNeutralPercent(value, 2);
  const up = !neutral && value > 0;
  const down = !neutral && value < 0;
  const Icon = up ? ArrowUpRight : down ? ArrowDownRight : Minus;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 tabular-nums font-medium",
        up && "text-success",
        down && "text-destructive",
        !up && !down && "text-muted-foreground",
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
      {formatPercentPoints(value)}
    </span>
  );
}

export default function Home() {
  const [data, setData] = useState<HomeDashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const kpiHoverReady = !loading && Boolean(data);

  const fundosSortedByPl = useMemo(() => {
    if (!data?.fundos?.length) return [];
    return [...data.fundos].sort((a, b) => b.plAtual - a.plAtual);
  }, [data?.fundos]);

  const fundosAtivosList = useMemo(() => {
    if (!data?.fundos?.length) return [];
    return data.fundos
      .filter((f) => f.plAtual > 0)
      .sort((a, b) => fundDisplayName(a).localeCompare(fundDisplayName(b), "pt-BR"));
  }, [data?.fundos]);

  const fundosSortedByName = useMemo(() => {
    if (!data?.fundos?.length) return [];
    return [...data.fundos].sort((a, b) =>
      fundDisplayName(a).localeCompare(fundDisplayName(b), "pt-BR"),
    );
  }, [data?.fundos]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(METRICS_URL);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as HomeDashboardMetrics;
        if (!cancelled) setData(json);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Falha ao carregar métricas");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-10 max-w-6xl mx-auto pb-10">
      <header>
        <div className="flex items-center gap-2 text-primary">
          <LayoutDashboard className="h-6 w-6" aria-hidden />
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Painel</h1>
        </div>
      </header>

      {error ? (
        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle className="text-base">Não foi possível carregar o painel</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <section aria-label="Indicadores principais">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-border/80 bg-card/50">
            <CardHeader className="pb-2 space-y-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-0">
                  <div className="text-muted-foreground text-xs font-medium uppercase tracking-wide">PL sob gestão</div>
                  {loading ? (
                    <Skeleton className="h-9 w-40 mt-2" />
                  ) : (
                    <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-foreground">
                      {formatBrlCompact(data?.plSobGestao ?? null)}
                    </p>
                  )}
                </div>
                <KpiHoverIcon
                  icon={Landmark}
                  ariaLabel="Ver PL por fundo ao passar o ponteiro"
                  heading="PL por fundo"
                  disabled={!kpiHoverReady}
                >
                  {fundosSortedByPl.length === 0 ? (
                    <p className="text-muted-foreground">Nenhum fundo disponível.</p>
                  ) : (
                    <ul className="space-y-2">
                      {fundosSortedByPl.map((f) => (
                        <li
                          key={f.idCarteira}
                          className="flex items-baseline justify-between gap-3 border-b border-border/40 pb-2 last:border-b-0 last:pb-0"
                        >
                          <span className="min-w-0 font-medium text-foreground">{fundDisplayName(f)}</span>
                          <span className="shrink-0 tabular-nums text-muted-foreground">
                            {formatBrlCompact(f.plAtual)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </KpiHoverIcon>
              </div>
            </CardHeader>
          </Card>

          <Card className="border-border/80 bg-card/50">
            <CardHeader className="pb-2 space-y-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-0">
                  <div className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Fundos ativos</div>
                  {loading ? (
                    <Skeleton className="h-9 w-16 mt-2" />
                  ) : (
                    <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-foreground">
                      {data?.fundosAtivos ?? "—"}
                    </p>
                  )}
                </div>
                <KpiHoverIcon
                  icon={Wallet}
                  ariaLabel="Ver apelidos dos fundos ativos ao passar o ponteiro"
                  heading="Fundos ativos"
                  disabled={!kpiHoverReady}
                >
                  {fundosAtivosList.length === 0 ? (
                    <p className="text-muted-foreground">Nenhum fundo ativo.</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {fundosAtivosList.map((f) => (
                        <li key={f.idCarteira} className="text-foreground">
                          {fundDisplayName(f)}
                        </li>
                      ))}
                    </ul>
                  )}
                </KpiHoverIcon>
              </div>
            </CardHeader>
          </Card>

          <Card className="border-border/80 bg-card/50">
            <CardHeader className="pb-2 space-y-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-0">
                  <div className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Variação de PL 30D</div>
                  {loading ? (
                    <Skeleton className="h-9 w-32 mt-2" />
                  ) : (
                    <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight">
                      <VariationBadge value={data?.variacaoPortfolioPct ?? null} />
                    </p>
                  )}
                </div>
                <KpiHoverIcon
                  icon={LineChart}
                  ariaLabel="Ver variação de PL 30 dias ao passar o ponteiro"
                  heading="Variação de PL 30 dias"
                  disabled={!kpiHoverReady}
                >
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Carteira (consolidado)
                      </p>
                      <p className="mt-1 text-lg font-semibold tabular-nums">
                        <VariationBadge value={data?.variacaoPortfolioPct ?? null} />
                      </p>
                    </div>
                    {fundosSortedByName.length === 0 ? (
                      <p className="text-muted-foreground">Nenhum fundo disponível.</p>
                    ) : (
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Por fundo
                        </p>
                        <ul className="mt-2 space-y-2">
                          {fundosSortedByName.map((f) => (
                            <li
                              key={f.idCarteira}
                              className="flex items-baseline justify-between gap-3 border-b border-border/40 pb-2 last:border-b-0 last:pb-0"
                            >
                              <span className="min-w-0 font-medium text-foreground">{fundDisplayName(f)}</span>
                              <span className="shrink-0 tabular-nums">
                                <VariationBadge value={f.variacaoPct} />
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </KpiHoverIcon>
              </div>
            </CardHeader>
          </Card>

          <Card className="border-border/80 bg-card/50">
            <CardHeader className="pb-2 space-y-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-0">
                  <div className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Variação de Cota 30D</div>
                  {loading ? (
                    <Skeleton className="h-9 w-32 mt-2" />
                  ) : (
                    <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight">
                      <VariationBadge value={data?.variacaoCotaPortfolioPct ?? null} />
                    </p>
                  )}
                </div>
                <KpiHoverIcon
                  icon={LineChart}
                  ariaLabel="Ver variação de cota 30 dias ao passar o ponteiro"
                  heading="Variação de Cota 30 dias"
                  disabled={!kpiHoverReady}
                >
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Carteira (ponderado por PL)
                      </p>
                      <p className="mt-1 text-lg font-semibold tabular-nums">
                        <VariationBadge value={data?.variacaoCotaPortfolioPct ?? null} />
                      </p>
                    </div>
                    {fundosSortedByName.length === 0 ? (
                      <p className="text-muted-foreground">Nenhum fundo disponível.</p>
                    ) : (
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Por fundo
                        </p>
                        <ul className="mt-2 space-y-2">
                          {fundosSortedByName.map((f) => (
                            <li
                              key={f.idCarteira}
                              className="flex items-baseline justify-between gap-3 border-b border-border/40 pb-2 last:border-b-0 last:pb-0"
                            >
                              <span className="min-w-0 font-medium text-foreground">{fundDisplayName(f)}</span>
                              <span className="shrink-0 tabular-nums">
                                <VariationBadge value={f.variacaoCotaPct ?? null} />
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </KpiHoverIcon>
              </div>
            </CardHeader>
          </Card>
        </div>
      </section>

      <section aria-label="Cotações PL e cota" className="space-y-6">
        <FundTicker fundos={data?.fundos} loading={loading} metric="pl" caption="PL" />
        <FundTicker fundos={data?.fundos} loading={loading} metric="cota" caption="Cota" />
      </section>

      <FundSummaryCarousel fundos={data?.fundos} asOf={data?.asOf} loading={loading} />
    </div>
  );
}
