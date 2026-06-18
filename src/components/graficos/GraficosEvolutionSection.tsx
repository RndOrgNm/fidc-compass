import {
  PlotlyFundFilterFigure,
} from "./PlotlyFundFilterFigure";

const PL_EVOLUTION_URL = "/plotly/pl-evolution.json";
const COTA_LINES_URL = "/plotly/cota-lines.json";

export type GraficosEvolutionVariant = "pl" | "cota" | "both";

export type GraficosEvolutionSectionProps = {
  variant: GraficosEvolutionVariant;
  selectedFund: string;
  onFundChange?: (value: string) => void;
};

/**
 * Daily evolution chart(s). Fund selection is controlled externally (header selector).
 * - `both`: PL and Cota side by side.
 * - `pl` / `cota`: single chart only.
 */
export function GraficosEvolutionSection({
  variant,
  selectedFund,
  onFundChange = () => {},
}: GraficosEvolutionSectionProps) {
  const ariaLabel =
    variant === "both"
      ? "Evolução diária PL e cota"
      : variant === "pl"
        ? "Evolução diária do PL"
        : "Evolução diária da cota";

  const chartBlock = (caption: string, url: string) => (
    <div className="min-w-0 space-y-3">
      <p className="text-sm font-medium text-muted-foreground">{caption}</p>
      <PlotlyFundFilterFigure
        url={url}
        hideFundSelector
        selectedValue={selectedFund}
        onSelectedValueChange={onFundChange}
      />
    </div>
  );

  return (
    <section aria-label={ariaLabel} className="space-y-3">
      <h2 className="text-lg font-semibold text-foreground">Evolução diária</h2>

      {variant === "both" ? (
        <div className="grid gap-6 md:grid-cols-2">
          {chartBlock("Evolução do PL por dia", PL_EVOLUTION_URL)}
          {chartBlock("Evolução da cota por dia", COTA_LINES_URL)}
        </div>
      ) : variant === "pl" ? (
        chartBlock("Evolução do PL por dia", PL_EVOLUTION_URL)
      ) : (
        chartBlock("Evolução da cota por dia", COTA_LINES_URL)
      )}
    </section>
  );
}
