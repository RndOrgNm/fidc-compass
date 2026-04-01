import { PlotlyWebFigure } from "@/components/plotly/PlotlyWebFigure";

const CHARTS = [
  { id: "1.0", file: "pl-evolution.json" },
  { id: "1.0b-m", file: "cota-matrix.json" },
  { id: "1.0b-l", file: "cota-lines.json" },
  { id: "1.0c-m", file: "pl-moeda-matrix.json" },
  { id: "1.0c-l", file: "pl-moeda-lines.json" },
] as const;

/** Painel de gráficos Plotly exportados a partir do pipeline `data_fidc` (Parquet → JSON estático). */
export default function Graficos() {
  return (
    <div className="space-y-10 max-w-6xl mx-auto pb-8">
      <h1 className="text-2xl font-semibold text-foreground">Gráficos</h1>

      {CHARTS.map((c) => (
        <section key={c.id} className="space-y-3">
          <div className="overflow-x-auto">
            <PlotlyWebFigure variant="full" url={`/plotly/${c.file}`} />
          </div>
        </section>
      ))}

      <section className="space-y-3">
        <div className="overflow-x-auto">
          <PlotlyWebFigure
            variant="split"
            layoutUrl="/plotly/pl-evolution.layout.json"
            dataUrl="/plotly/pl-evolution.data.json"
          />
        </div>
      </section>
    </div>
  );
}
