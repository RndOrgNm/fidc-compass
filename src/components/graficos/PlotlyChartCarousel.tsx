import { useEffect, useState } from "react";
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";
import { cn } from "@/lib/utils";
import { PlotlySlideCard, type PlotlyCarouselSlide } from "./PlotlySlideCard";

export type { PlotlyCarouselSlide };

function CarouselPagination({
  pageCount,
  current,
  onGoTo,
}: {
  pageCount: number;
  current: number;
  onGoTo: (index: number) => void;
}) {
  if (pageCount < 2) return null;

  return (
    <div className="flex items-center justify-center gap-3 pt-2">
      <div className="flex items-center gap-1.5" role="tablist" aria-label="Gráficos do carrossel">
        {Array.from({ length: pageCount }).map((_, i) => (
          <button
            key={i}
            type="button"
            role="tab"
            aria-selected={i === current}
            aria-label={`Gráfico ${i + 1} de ${pageCount}`}
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

/**
 * Section title + Embla carousel of static Plotly JSON figures (same UX pattern as Home «Resumo por Fundo»).
 */
export function PlotlyChartCarousel({
  sectionTitle,
  ariaLabel,
  slides,
}: {
  sectionTitle: string;
  ariaLabel: string;
  slides: PlotlyCarouselSlide[];
}) {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [snapCount, setSnapCount] = useState(1);

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
  }, [api, slides.length]);

  const goToPage = (index: number) => {
    api?.scrollTo(index);
  };

  if (slides.length === 0) return null;

  return (
    <section aria-label={ariaLabel} className="space-y-3">
      <h2 className="text-lg font-semibold text-foreground">{sectionTitle}</h2>
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
          {slides.map((s) => (
            <CarouselItem key={s.id} className="basis-full">
              <PlotlySlideCard slide={s} />
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
