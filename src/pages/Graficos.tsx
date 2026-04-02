import { PlotlyChartCarousel } from "@/components/plotly/PlotlyChartCarousel";

const PL_SLIDES = [
  {
    id: "evolution",
    file: "pl-evolution.json",
    caption: "Evolução do PL por dia",
  },
  {
    id: "matrix",
    file: "pl-moeda-matrix.json",
    caption: "PL por fundo e dia (tabela)",
  },
] as const;

const COTA_SLIDES = [
  {
    id: "matrix",
    file: "cota-matrix.json",
    caption: "Cota por fundo e dia (tabela)",
  },
  {
    id: "lines",
    file: "cota-lines.json",
    caption: "Evolução da cota por dia",
  },
] as const;

/** Painel de gráficos Plotly exportados a partir do pipeline `data_fidc` (Parquet → JSON estático). */
export default function Graficos() {
  return (
    <div className="mx-auto max-w-6xl space-y-10 pb-8">
      <h1 className="text-2xl font-semibold text-foreground">Gráficos</h1>

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
