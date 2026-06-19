import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { TrendingDown, TrendingUp } from "lucide-react";
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";
import { Skeleton } from "@/components/ui/skeleton";
import { formatBrlCompact, formatCotaBrl, formatPercentPoints, isNeutralPercent } from "@/lib/formatBr";
import { cn } from "@/lib/utils";
import type { HomeFundRow } from "@/types/homeDashboard";

const AUTO_ADVANCE_MS = 10_000;

function SummarySlide({
  fund,
  asOfLabel,
  onClick,
}: {
  fund: HomeFundRow;
  asOfLabel: string;
  onClick: () => void;
}) {
  const name = fund.apelido ?? fund.nome;
  const badgePct = fund.variacaoDiaPct ?? null;
  const badgeNeutral = badgePct != null && !Number.isNaN(badgePct) && isNeutralPercent(badgePct, 1);
  const up = badgePct != null && !Number.isNaN(badgePct) && !badgeNeutral && badgePct > 0;
  const down = badgePct != null && !Number.isNaN(badgePct) && !badgeNeutral && badgePct < 0;

  const pl30dPct = fund.variacaoPct;
  const pl30dNeutral =
    pl30dPct != null && !Number.isNaN(pl30dPct) && isNeutralPercent(pl30dPct, 2);

  const cotaPct = fund.variacaoCotaDiaPct;
  const cotaNeutral = cotaPct != null && !Number.isNaN(cotaPct) && isNeutralPercent(cotaPct, 2);

  return (
    <div
      className="h-full min-w-0 overflow-hidden rounded-xl border border-border/70 bg-card/90 px-4 py-4 shadow-sm sm:px-5 sm:py-5 lg:px-5 lg:py-5 cursor-pointer transition-colors hover:border-primary/50 hover:bg-card"
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
    >
      <div className="flex min-w-0 flex-col gap-1 lg:flex-row lg:items-start lg:justify-between lg:gap-2">
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

      <div className="mt-4 grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:gap-4">
        <div className="min-w-0 space-y-1.5">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground lg:text-[11px]">Patrimônio líquido</p>
          <p className="text-lg font-semibold tabular-nums tracking-tight leading-snug text-foreground lg:text-xl xl:text-2xl">
            {formatBrlCompact(fund.plAtual)}
          </p>
          <div className="space-y-0.5">
            <p className="text-xs text-muted-foreground">PL 30D</p>
            {pl30dPct != null && !Number.isNaN(pl30dPct) ? (
              <span
                className={cn(
                  "inline-flex text-sm font-semibold tabular-nums",
                  !pl30dNeutral && pl30dPct > 0 && "text-primary",
                  !pl30dNeutral && pl30dPct < 0 && "text-destructive",
                  pl30dNeutral && "text-muted-foreground",
                )}
              >
                {formatPercentPoints(pl30dPct, 2)}
              </span>
            ) : (
              <span className="text-sm text-muted-foreground">—</span>
            )}
          </div>
        </div>
        <div className="min-w-0 space-y-1.5">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground lg:text-[11px]">Valor da cota</p>
          <p className="text-lg font-semibold tabular-nums tracking-tight leading-snug text-foreground lg:text-xl xl:text-2xl">
            {fund.cotaAtual != null && !Number.isNaN(fund.cotaAtual) ? formatCotaBrl(fund.cotaAtual, 2) : "—"}
          </p>
          <div className="space-y-0.5">
            <p className="text-xs text-muted-foreground">Cota 30D</p>
            {cotaPct != null && !Number.isNaN(cotaPct) ? (
              <span
                className={cn(
                  "inline-flex text-sm font-semibold tabular-nums",
                  !cotaNeutral && cotaPct > 0 && "text-primary",
                  !cotaNeutral && cotaPct < 0 && "text-destructive",
                  cotaNeutral && "text-muted-foreground",
                )}
              >
                {formatPercentPoints(cotaPct, 2)}
              </span>
            ) : (
              <span className="text-sm text-muted-foreground">—</span>
            )}
          </div>
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

  const navigate = useNavigate();

  const goToPage = (index: number) => {
    api?.scrollTo(index);
    startAutoAdvance();
  };

  if (loading) {
    return (
      <section aria-label="Resumo por fundo" className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Resumo por Fundo</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Skeleton className="h-[200px] w-full rounded-xl" />
          <Skeleton className="h-[200px] w-full rounded-xl hidden md:block" />
          <Skeleton className="h-[200px] w-full rounded-xl hidden md:block" />
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
              <SummarySlide
                fund={f}
                asOfLabel={asOfLabel}
                onClick={() => navigate(`/fundos?fundo=${f.idCarteira}`)}
              />
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
