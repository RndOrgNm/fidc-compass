import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PlotlyFundFilterFigure,
  extractFundNamesFromPlotlyPayload,
} from "./PlotlyFundFilterFigure";

const PL_EVOLUTION_URL = "/plotly/pl-evolution.json";
const COTA_LINES_URL = "/plotly/cota-lines.json";

/**
 * Shared fund filter + PL and Cota daily evolution charts side by side.
 * Fund list is taken from the PL JSON (same universe as the pipeline export).
 */
export function GraficosEvolutionSection() {
  const [fundNames, setFundNames] = useState<string[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [loadingNames, setLoadingNames] = useState(true);
  const [namesError, setNamesError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setNamesError(null);
    fetch(PL_EVOLUTION_URL)
      .then((r) => {
        if (!r.ok) throw new Error(r.statusText);
        return r.json();
      })
      .then((payload) => {
        if (cancelled) return;
        const names = extractFundNamesFromPlotlyPayload(payload);
        setFundNames(names);
        setSelected(names[0] ?? "");
      })
      .catch((e: Error) => {
        if (!cancelled) setNamesError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoadingNames(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section aria-label="Evolução diária PL e cota" className="space-y-3">
      <h2 className="text-lg font-semibold text-foreground">Evolução diária</h2>

      <div className="flex flex-wrap items-center gap-2">
        <span className="shrink-0 text-sm font-medium text-muted-foreground">Fundo</span>
        <Select
          value={selected}
          onValueChange={setSelected}
          disabled={loadingNames || !fundNames.length}
        >
          <SelectTrigger className="h-8 w-72 text-sm">
            <SelectValue
              placeholder={loadingNames ? "Carregando…" : "Selecionar fundo"}
            />
          </SelectTrigger>
          <SelectContent>
            {fundNames.map((name) => (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {namesError && (
        <p className="text-sm text-destructive" role="alert">
          Não foi possível carregar a lista de fundos: {namesError}
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="min-w-0 overflow-hidden rounded-xl border border-border/70 bg-card/90 px-3 py-4 shadow-sm sm:px-4 sm:py-5">
          <p className="mb-3 text-sm font-medium text-muted-foreground">
            Evolução do PL por dia
          </p>
          <PlotlyFundFilterFigure
            url={PL_EVOLUTION_URL}
            hideFundSelector
            selectedValue={selected}
            onSelectedValueChange={setSelected}
          />
        </div>
        <div className="min-w-0 overflow-hidden rounded-xl border border-border/70 bg-card/90 px-3 py-4 shadow-sm sm:px-4 sm:py-5">
          <p className="mb-3 text-sm font-medium text-muted-foreground">
            Evolução da cota por dia
          </p>
          <PlotlyFundFilterFigure
            url={COTA_LINES_URL}
            hideFundSelector
            selectedValue={selected}
            onSelectedValueChange={setSelected}
          />
        </div>
      </div>
    </section>
  );
}
