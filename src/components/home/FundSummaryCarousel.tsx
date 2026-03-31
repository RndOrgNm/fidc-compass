import { useCallback, useEffect, useRef, useState } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";
import { Skeleton } from "@/components/ui/skeleton";
import { formatBrlCompact, formatCotaBrl, formatPercentPoints } from "@/lib/formatBr";
import { cn } from "@/lib/utils";
import type { HomeFundRow } from "@/types/homeDashboard";

const AUTO_ADVANCE_MS = 10_000;

function MiniSparkline({ values, className }: { values: number[]; className?: string }) {
  const clean = values.filter((v) => v != null && !Number.isNaN(v));
  if (clean.length < 2) {
    return <div className={cn("h-12 w-full rounded-md bg-muted/40", className)} aria-hidden />;
  }
  const min = Math.min(...clean);
  const max = Math.max(...clean);
  const range = max - min || 1;
  const w = 200;
  const h = 44;
  const pad = 4;
  const points = clean
    .map((v, i) => {
      const x = pad + (i / (clean.length - 1)) * (w - 2 * pad);
      const y = pad + (1 - (v - min) / range) * (h - 2 * pad);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className={cn("w-full h-12 text-primary", className)}
      preserveAspectRatio="none"
      aria-hidden
    >
      <polyline fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" points={points} />
    </svg>
  );
}

function plSparklineValues(f: HomeFundRow): number[] {
  const now = f.plAtual;
  const prev = f.plDiaAnterior;
  if (prev != null && !Number.isNaN(prev)) return [prev, now];
  if (f.plReferencia != null && !Number.isNaN(f.plReferencia)) return [f.plReferencia, now];
  return [now, now];
}

function cotaSparklineValues(f: HomeFundRow): number[] {
  const now = f.cotaAtual;
  const prev = f.cotaDiaAnterior;
  if (now == null || Number.isNaN(now)) return [];
  if (prev != null && !Number.isNaN(prev)) return [prev, now];
  return [now, now];
}

function SummarySlide({
  fund,
  asOfLabel,
}: {
  fund: HomeFundRow;
  asOfLabel: string;
}) {
  const name = fund.apelido ?? fund.nome;
  const badgePct = fund.variacaoPct ?? fund.variacaoDiaPct ?? null;
  const up = badgePct != null && badgePct > 0;
  const down = badgePct != null && badgePct < 0;

  const cotaPct = fund.variacaoCotaDiaPct;

  return (
    <div className="h-full rounded-xl border border-border/70 bg-card/90 px-4 py-4 shadow-sm sm:px-5 sm:py-5 lg:px-5 lg:py-5">
      <div className="flex flex-col gap-1 lg:flex-row lg:items-start lg:justify-between lg:gap-2">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-semibold tracking-tight text-foreground lg:text-[15px] xl:text-lg" title={name}>
              {name}
            </h3>
            <span className="shrink-0 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              {asOfLabel}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">Fundo {fund.idCarteira}</p>
        </div>
        {badgePct != null && !Number.isNaN(badgePct) ? (
          <span
            className={cn(
              "inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-sm font-semibold tabular-nums",
              up && "bg-primary/15 text-primary",
              down && "bg-destructive/15 text-destructive",
              !up && !down && "bg-muted text-muted-foreground",
            )}
          >
            {up ? <TrendingUp className="h-3.5 w-3.5" aria-hidden /> : down ? <TrendingDown className="h-3.5 w-3.5" aria-hidden /> : null}
            {formatPercentPoints(badgePct, 1)}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        )}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:gap-4">
        <div className="space-y-1.5">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground lg:text-[11px]">Patrimônio líquido</p>
          <p className="text-xl font-semibold tabular-nums tracking-tight text-foreground lg:text-2xl xl:text-3xl">
            {formatBrlCompact(fund.plAtual)}
          </p>
          <p className="text-xs text-muted-foreground">PL 30D</p>
          <MiniSparkline values={plSparklineValues(fund)} />
        </div>
        <div className="space-y-1.5">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground lg:text-[11px]">Valor da cota</p>
          <div className="flex flex-wrap items-baseline gap-1.5">
            <span className="text-xl font-semibold tabular-nums tracking-tight text-foreground lg:text-2xl xl:text-3xl">
              {fund.cotaAtual != null && !Number.isNaN(fund.cotaAtual) ? formatCotaBrl(fund.cotaAtual, 2) : "—"}
            </span>
            {cotaPct != null && !Number.isNaN(cotaPct) ? (
              <span
                className={cn(
                  "text-sm font-semibold tabular-nums",
                  cotaPct > 0 && "text-primary",
                  cotaPct < 0 && "text-destructive",
                  cotaPct === 0 && "text-muted-foreground",
                )}
              >
                {formatPercentPoints(cotaPct, 2)}
              </span>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">Cota 30D</p>
          <MiniSparkline values={cotaSparklineValues(fund)} />
        </div>
      </div>
    </div>
  );
}

function CarouselPagination({
  pageCount,
  current,
  onGoTo,
}: {
  pageCount: number;
  current: number;
  onGoTo: (index: number) => void;
}) {
  if (pageCount < 1) return null;

  return (
    <div className="flex items-center justify-center gap-3 pt-2">
      <div className="flex items-center gap-1.5" role="tablist" aria-label="Páginas do resumo">
        {Array.from({ length: pageCount }).map((_, i) => (
          <button
            key={i}
            type="button"
            role="tab"
            aria-selected={i === current}
            aria-label={`Página ${i + 1} de ${pageCount}`}
            onClick={() => onGoTo(i)}
            className={cn(
              "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              i === current
                ? "h-2 w-8 shrink-0 rounded-full bg-primary"
                : "h-2 w-2 shrink-0 rounded-full bg-muted-foreground/35 hover:bg-muted-foreground/55",
            )}
          />
        ))}
      </div>
      <span className="text-sm tabular-nums text-muted-foreground">
        {current + 1}/{pageCount}
      </span>
    </div>
  );
}

export function FundSummaryCarousel({
  fundos,
  asOf,
  loading,
}: {
  fundos: HomeFundRow[] | undefined;
  asOf: string | null | undefined;
  loading: boolean;
}) {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [snapCount, setSnapCount] = useState(1);
  const autoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const list = fundos?.length ? fundos : [];

  const asOfLabel = asOf
    ? new Date(asOf + "T12:00:00").toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "—";

  useEffect(() => {
    if (!api) return;
    const sync = () => {
      setCurrent(api.selectedScrollSnap());
      setSnapCount(Math.max(1, api.scrollSnapList().length));
    };
    sync();
    api.on("select", sync);
    api.on("reInit", sync);
    return () => {
      api.off("select", sync);
      api.off("reInit", sync);
    };
  }, [api]);

  useEffect(() => {
    if (!api) return;
    api.scrollTo(0);
  }, [api, fundos?.length]);

  const clearAutoAdvance = useCallback(() => {
    if (autoTimerRef.current) {
      clearInterval(autoTimerRef.current);
      autoTimerRef.current = null;
    }
  }, []);

  const startAutoAdvance = useCallback(() => {
    clearAutoAdvance();
    if (!api || snapCount <= 1) return;

    autoTimerRef.current = setInterval(() => {
      if (api.canScrollNext()) {
        api.scrollNext();
      } else {
        api.scrollTo(0);
      }
    }, AUTO_ADVANCE_MS);
  }, [api, snapCount, clearAutoAdvance]);

  useEffect(() => {
    startAutoAdvance();
    return clearAutoAdvance;
  }, [startAutoAdvance, list.length]);

  const goToPage = (index: number) => {
    api?.scrollTo(index);
    startAutoAdvance();
  };

  if (loading) {
    return (
      <section aria-label="Resumo por fundo" className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Resumo por Fundo</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Skeleton className="h-[260px] w-full rounded-xl" />
          <Skeleton className="h-[260px] w-full rounded-xl hidden md:block" />
          <Skeleton className="h-[260px] w-full rounded-xl hidden md:block" />
        </div>
      </section>
    );
  }

  if (!list.length) {
    return null;
  }

  return (
    <section aria-label="Resumo por fundo" className="space-y-3">
      <h2 className="text-lg font-semibold text-foreground">Resumo por Fundo</h2>
      <Carousel
        setApi={setApi}
        opts={{
          align: "start",
          loop: false,
          slidesToScroll: 1,
        }}
        className="relative w-full"
      >
        <CarouselContent>
          {list.map((f) => (
            <CarouselItem key={f.idCarteira} className="basis-full md:basis-1/3">
              <SummarySlide fund={f} asOfLabel={asOfLabel} />
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
      {snapCount >= 1 ? (
        <CarouselPagination pageCount={snapCount} current={current} onGoTo={goToPage} />
      ) : null}
    </section>
  );
}
