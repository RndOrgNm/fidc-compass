import {
  PlotlyChartCarousel,
  GraficosEvolutionSection,
  PlotlyWebFigure,
} from "@/components/graficos";

const PL_SLIDES = [
  {
    id: "pl-moeda-matrix",
    file: "pl-moeda-matrix.json",
    caption: "PL por fundo e dia (tabela)",
    exportable: true,
  },
] as const;

const COTA_SLIDES = [
  {
    id: "cota-matrix",
    file: "cota-matrix.json",
    caption: "Cota por fundo e dia (tabela)",
    exportable: true,
  },
] as const;

/** Painel de gráficos Plotly exportados a partir do pipeline `data_fidc` (Parquet → JSON estático). */
export default function Graficos() {
  return (
    <div className="mx-auto max-w-6xl space-y-10 pb-8">
      <h1 className="text-2xl font-semibold text-foreground">Gráficos</h1>

      <GraficosEvolutionSection />

      <section aria-label="PL total geral" className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">PL — Total Geral</h2>
        <div className="min-w-0 overflow-hidden rounded-xl border border-border/70 bg-card/90 px-3 py-4 shadow-sm sm:px-4 sm:py-5">
          <p className="mb-3 text-sm font-medium text-muted-foreground">
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

      <PlotlyChartCarousel
        sectionTitle="Cota"
        ariaLabel="Gráficos de cota"
        slides={[...COTA_SLIDES]}
      />
    </div>
  );
}
