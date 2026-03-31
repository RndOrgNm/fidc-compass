import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatBrl, formatCotaBrl, formatPercentPoints } from "@/lib/formatBr";
import { cn } from "@/lib/utils";
import type { HomeFundRow } from "@/types/homeDashboard";

export type FundTickerMetric = "pl" | "cota";

function DayChange({ value }: { value: number | null }) {
  if (value == null || Number.isNaN(value)) {
    return <span className="text-muted-foreground/90 tabular-nums text-xs font-medium">—</span>;
  }
  const up = value > 0;
  const down = value < 0;
  const Icon = up ? ArrowUpRight : down ? ArrowDownRight : Minus;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 tabular-nums text-xs font-semibold",
        up && "text-primary",
        down && "text-destructive",
        !up && !down && "text-muted-foreground",
      )}
    >
      <Icon className="h-3 w-3 shrink-0" aria-hidden />
      {formatPercentPoints(value)}
    </span>
  );
}

function metricValue(f: HomeFundRow, metric: FundTickerMetric): string {
  if (metric === "pl") return formatBrl(f.plAtual);
  return formatCotaBrl(f.cotaAtual ?? null, 4);
}

function metricDayChange(f: HomeFundRow, metric: FundTickerMetric): number | null {
  if (metric === "pl") return f.variacaoDiaPct ?? null;
  return f.variacaoCotaDiaPct ?? null;
}

function TickerStrip({
  fundos,
  idSuffix,
  metric,
}: {
  fundos: HomeFundRow[];
  idSuffix: string;
  metric: FundTickerMetric;
}) {
  return (
    <>
      {fundos.map((f) => {
        const label = f.apelido ?? f.nome;
        return (
          <div
            key={`${f.idCarteira}-${metric}-${idSuffix}`}
            className="flex shrink-0 items-center gap-3 border-r border-border/50 px-6 py-2.5"
          >
            <span className="max-w-[200px] truncate text-sm font-medium text-foreground sm:max-w-[240px]" title={label}>
              {label}
            </span>
            <span className="whitespace-nowrap font-mono text-sm tabular-nums text-foreground/95">
              {metricValue(f, metric)}
            </span>
            <DayChange value={metricDayChange(f, metric)} />
          </div>
        );
      })}
    </>
  );
}

export function FundTicker({
  fundos,
  loading,
  metric,
  caption,
}: {
  fundos: HomeFundRow[] | undefined;
  loading: boolean;
  metric: FundTickerMetric;
  caption: string;
}) {
  if (loading) {
    return <Skeleton className="h-12 w-full rounded-lg" />;
  }

  const list = fundos?.length ? fundos : [];
  if (!list.length) {
    return (
      <p className="rounded-lg border border-dashed border-border/80 py-8 text-center text-sm text-muted-foreground">
        Nenhum fundo no arquivo de métricas.
      </p>
    );
  }

  const durationSec = Math.min(90, Math.max(28, list.length * 5));

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{caption}</p>
      {/* Static grid for reduced motion */}
      <div className="hidden flex-wrap gap-2 motion-reduce:flex">
        {list.map((f) => {
          const label = f.apelido ?? f.nome;
          return (
            <div
              key={`${f.idCarteira}-${metric}`}
              className="flex min-w-[min(100%,280px)] flex-1 flex-col gap-1 rounded-md border border-border/70 bg-card/80 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
            >
              <span className="truncate text-sm font-medium" title={label}>
                {label}
              </span>
              <div className="flex items-center gap-3 sm:justify-end">
                <span className="font-mono text-sm tabular-nums">{metricValue(f, metric)}</span>
                <DayChange value={metricDayChange(f, metric)} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Marquee */}
      <div
        className="motion-reduce:hidden overflow-hidden rounded-lg border border-border/80 bg-gradient-to-b from-muted/30 to-muted/10 shadow-inner"
        style={{ ["--ticker-duration" as string]: `${durationSec}s` }}
      >
        <div className="group flex w-max animate-ticker hover:[animation-play-state:paused]">
          <div className="flex shrink-0 items-stretch">
            <TickerStrip fundos={list} idSuffix="a" metric={metric} />
          </div>
          <div className="flex shrink-0 items-stretch" aria-hidden>
            <TickerStrip fundos={list} idSuffix="b" metric={metric} />
          </div>
        </div>
      </div>
    </div>
  );
}
