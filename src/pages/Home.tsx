import { useEffect, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  LayoutDashboard,
  Minus,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FundTicker } from "@/components/home/FundTicker";
import { Skeleton } from "@/components/ui/skeleton";
import { formatBrl, formatPercentPoints } from "@/lib/formatBr";
import { cn } from "@/lib/utils";
import type { HomeDashboardMetrics } from "@/types/homeDashboard";

const METRICS_URL = "/dashboard/home-metrics.json";

function FlowPlaceholder() {
  return <span className="text-muted-foreground">—</span>;
}

function VariationBadge({ value }: { value: number | null }) {
  if (value == null || Number.isNaN(value)) {
    return <span className="text-muted-foreground tabular-nums">—</span>;
  }
  const up = value > 0;
  const down = value < 0;
  const Icon = up ? ArrowUpRight : down ? ArrowDownRight : Minus;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 tabular-nums font-medium",
        up && "text-primary",
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
              <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium uppercase tracking-wide">
                <Wallet className="h-3.5 w-3.5" aria-hidden />
                PL sob gestão
              </div>
              {loading ? (
                <Skeleton className="h-9 w-40 mt-2" />
              ) : (
                <p className="text-2xl font-semibold tabular-nums tracking-tight text-foreground mt-2">
                  {formatBrl(data?.plSobGestao ?? null)}
                </p>
              )}
            </CardHeader>
          </Card>

          <Card className="border-border/80 bg-card/50">
            <CardHeader className="pb-2 space-y-0">
              <div className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Fundos ativos</div>
              {loading ? (
                <Skeleton className="h-9 w-16 mt-2" />
              ) : (
                <p className="text-2xl font-semibold tabular-nums tracking-tight text-foreground mt-2">
                  {data?.fundosAtivos ?? "—"}
                </p>
              )}
            </CardHeader>
          </Card>

          <Card className="border-border/80 bg-card/50 sm:col-span-2 lg:col-span-2">
            <CardHeader className="pb-2 space-y-0">
              <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium uppercase tracking-wide">
                <TrendingUp className="h-3.5 w-3.5" aria-hidden />
                Variação 30d
              </div>
              {loading ? (
                <Skeleton className="h-9 w-32 mt-2" />
              ) : (
                <p className="text-2xl font-semibold tabular-nums tracking-tight mt-2">
                  <VariationBadge value={data?.variacaoPortfolioPct ?? null} />
                </p>
              )}
            </CardHeader>
          </Card>

          <Card className="border-border/80 bg-card/50">
            <CardHeader className="pb-2 space-y-0">
              <div className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Captação líquida</div>
              {loading ? (
                <Skeleton className="h-9 w-28 mt-2" />
              ) : data?.flowsDisponiveis && data.captacaoLiquida30d != null ? (
                <p className="text-2xl font-semibold tabular-nums text-foreground mt-2">
                  {formatBrl(data.captacaoLiquida30d)}
                </p>
              ) : (
                <p className="text-2xl font-semibold mt-2">
                  <FlowPlaceholder />
                </p>
              )}
            </CardHeader>
          </Card>

          <Card className="border-border/80 bg-card/50">
            <CardHeader className="pb-2 space-y-0">
              <div className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Aportes 30d</div>
              {loading ? (
                <Skeleton className="h-9 w-28 mt-2" />
              ) : data?.flowsDisponiveis && data.aportes30d != null ? (
                <p className="text-2xl font-semibold tabular-nums text-foreground mt-2">{formatBrl(data.aportes30d)}</p>
              ) : (
                <p className="text-2xl font-semibold mt-2">
                  <FlowPlaceholder />
                </p>
              )}
            </CardHeader>
          </Card>

          <Card className="border-border/80 bg-card/50">
            <CardHeader className="pb-2 space-y-0">
              <div className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Resgates 30d</div>
              {loading ? (
                <Skeleton className="h-9 w-28 mt-2" />
              ) : data?.flowsDisponiveis && data.resgates30d != null ? (
                <p className="text-2xl font-semibold tabular-nums text-foreground mt-2">{formatBrl(data.resgates30d)}</p>
              ) : (
                <p className="text-2xl font-semibold mt-2">
                  <FlowPlaceholder />
                </p>
              )}
            </CardHeader>
          </Card>

          <Card className="border-border/80 bg-card/50">
            <CardHeader className="pb-2 space-y-0">
              <div className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Dividendos 30d</div>
              {loading ? (
                <Skeleton className="h-9 w-28 mt-2" />
              ) : data?.flowsDisponiveis && data.dividendos30d != null ? (
                <p className="text-2xl font-semibold tabular-nums text-foreground mt-2">
                  {formatBrl(data.dividendos30d)}
                </p>
              ) : (
                <p className="text-2xl font-semibold mt-2">
                  <FlowPlaceholder />
                </p>
              )}
            </CardHeader>
          </Card>
        </div>
      </section>

      <section aria-label="Fundos em movimento" className="space-y-3">
        <FundTicker fundos={data?.fundos} loading={loading} />
      </section>
    </div>
  );
}
