import { useEffect, useState } from "react";
import {
  PlotlyChartCarousel,
  PlotlySlideCard,
  GraficosEvolutionSection,
  PlotlyWebFigure,
  type PlotlyCarouselSlide,
} from "@/components/graficos";
import { extractFundNamesFromPlotlyPayload } from "@/components/graficos/PlotlyFundFilterFigure";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AppLayout } from "@/components/layout";
import { cn } from "@/lib/utils";

const PL_EVOLUTION_URL = "/plotly/pl-evolution.json";

const PL_SLIDES = [
  {
    id: "pl-moeda-matrix",
    file: "pl-moeda-matrix.json",
    caption: "PL por fundo e dia (tabela)",
    exportable: true,
  },
] as const;

const PL_CONCENTRACAO_ATIVOS_SLIDE = {
  id: "concentracao-ativos-top10",
  file: "concentracao-ativos-top10.json",
  caption: "Concentração por ativo (top 10) — % do PL",
  filterable: true,
} as const satisfies PlotlyCarouselSlide;

const PL_COMPOSICAO_TREEMAP_SLIDE = {
  id: "composicao-pl-treemap",
  file: "composicao-pl-treemap.json",
  caption: "Composição do PL por tipo de ativo (treemap: tipo → estratégia → ativo)",
  filterable: true,
} as const satisfies PlotlyCarouselSlide;

const BENCHMARK_PINNED = ["Benchmark (CDI)"] as const;

const COTA_VS_BENCHMARK_SLIDE = {
  id: "cota-vs-benchmark",
  file: "cota-vs-benchmark.json",
  caption: "Cota acumulada vs. benchmark (índice 100)",
  filterable: true,
  pinnedTraceNames: [...BENCHMARK_PINNED],
} as const satisfies PlotlyCarouselSlide;

const COTA_MATRIX_SLIDE = {
  id: "cota-matrix",
  file: "cota-matrix.json",
  caption: "Cota por fundo e dia (tabela)",
  exportable: true,
} as const satisfies PlotlyCarouselSlide;

const CATEGORIES = [
  { id: "pl" as const, label: "Patrimônio líquido" },
  { id: "cota" as const, label: "Cota" },
] as const;

/** Painel de gráficos Plotly exportados a partir do pipeline `data_fidc` (Parquet → JSON estático). */
export default function Graficos() {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  // Fund selection — lifted so it can live in the header
  const [fundNames, setFundNames] = useState<string[]>([]);
  const [selectedFund, setSelectedFund] = useState<string>("");
  const [loadingFunds, setLoadingFunds] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(PL_EVOLUTION_URL)
      .then((r) => {
        if (!r.ok) throw new Error(r.statusText);
        return r.json();
      })
      .then((payload) => {
        if (cancelled) return;
        const names = extractFundNamesFromPlotlyPayload(payload);
        setFundNames(names);
        setSelectedFund(names[0] ?? "");
      })
      .catch(() => {/* silent — evolution section will show its own error */})
      .finally(() => { if (!cancelled) setLoadingFunds(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!api) return;
    const sync = () => setCurrent(api.selectedScrollSnap());
    sync();
    api.on("select", sync);
    api.on("reInit", sync);
    return () => {
      api.off("select", sync);
      api.off("reInit", sync);
    };
  }, [api]);

  const fundSelector = (
    <Select
      value={selectedFund}
      onValueChange={setSelectedFund}
      disabled={loadingFunds || !fundNames.length}
    >
      <SelectTrigger className="h-8 w-60 text-sm">
        <SelectValue placeholder={loadingFunds ? "Carregando…" : "Selecionar fundo"} />
      </SelectTrigger>
      <SelectContent>
        {fundNames.map((name) => (
          <SelectItem key={name} value={name}>
            {name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <AppLayout headerRight={fundSelector}>
      <div className="mx-auto max-w-6xl space-y-8 pb-8">
        <GraficosEvolutionSection
          variant="both"
          selectedFund={selectedFund}
          onFundChange={setSelectedFund}
        />

        <div className="space-y-4" aria-label="Categorias de gráficos">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div
              className="inline-flex rounded-lg border border-border/70 bg-card/50 p-1"
              role="tablist"
              aria-label="Escolher categoria"
            >
              {CATEGORIES.map((cat, i) => (
                <button
                  key={cat.id}
                  type="button"
                  role="tab"
                  aria-selected={current === i}
                  onClick={() => api?.scrollTo(i)}
                  className={cn(
                    "rounded-md px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                    current === i
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>
            <span className="text-sm tabular-nums text-muted-foreground sm:text-right">
              {current + 1}/{CATEGORIES.length}
            </span>
          </div>

          <Carousel
            setApi={setApi}
            opts={{
              align: "start",
              loop: false,
              slidesToScroll: 1,
            }}
            className="w-full"
          >
            <CarouselContent>
              <CarouselItem className="basis-full">
                <div className="space-y-10">
                  <section aria-label="PL total geral" className="space-y-3">
                    <h2 className="text-lg font-semibold text-foreground">PL — Total Geral</h2>
                    <div className="min-w-0 space-y-3">
                      <p className="text-sm font-medium text-muted-foreground">
                        Patrimônio líquido agregado (mesma lógica que PL sob gestão na Home)
                      </p>
                      <PlotlyWebFigure variant="full" url="/plotly/pl-total-geral.json" />
                    </div>
                  </section>

                  <PlotlyChartCarousel
                    sectionTitle="PL"
                    ariaLabel="Gráficos de patrimônio líquido"
                    slides={[...PL_SLIDES]}
                  />

                  <section aria-label="Concentração por ativo" className="space-y-3">
                    <h2 className="text-lg font-semibold text-foreground">Concentração</h2>
                    <div className="space-y-8">
                      <PlotlySlideCard slide={PL_COMPOSICAO_TREEMAP_SLIDE} />
                      <PlotlySlideCard slide={PL_CONCENTRACAO_ATIVOS_SLIDE} />
                    </div>
                  </section>
                </div>
              </CarouselItem>

              <CarouselItem className="basis-full">
                <div className="space-y-10">
                  <section aria-label="Gráficos de cota" className="space-y-3">
                    <h2 className="text-lg font-semibold text-foreground">Cota</h2>
                    <div className="space-y-10">
                      <PlotlySlideCard slide={COTA_VS_BENCHMARK_SLIDE} />
                      <PlotlySlideCard slide={COTA_MATRIX_SLIDE} />
                    </div>
                  </section>
                </div>
              </CarouselItem>
            </CarouselContent>
          </Carousel>

          <div
            className="flex items-center justify-center gap-3 pt-1"
            role="tablist"
            aria-label="Navegação entre páginas PL e Cota"
          >
            <div className="flex items-center gap-1.5">
              {CATEGORIES.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  role="tab"
                  aria-selected={i === current}
                  aria-label={`Página ${i + 1} de ${CATEGORIES.length}`}
                  onClick={() => api?.scrollTo(i)}
                  className={cn(
                    "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                    i === current
                      ? "h-2 w-8 shrink-0 rounded-full bg-primary"
                      : "h-2 w-2 shrink-0 rounded-full bg-muted-foreground/35 hover:bg-muted-foreground/55",
                  )}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
