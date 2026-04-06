import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import type { Data, Layout } from "plotly.js";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const Plot = lazy(() => import("react-plotly.js"));

/** Compact trace type covering what our Plotly JSON exports emit. */
type RawTrace = {
  name?: string;
  x?: (string | null)[];
  y?: (number | null)[];
  line?: Record<string, unknown>;
  marker?: Record<string, unknown>;
  [key: string]: unknown;
};

/**
 * Plotly line chart with a fund-selector dropdown.
 * «Total Geral» PL is a separate static file (`pl-total-geral.json`) computed in the Python pipeline.
 */

/** Fund names from static Plotly JSON (e.g. to drive a shared filter for PL + Cota). */
export function extractFundNamesFromPlotlyPayload(
  payload: { data?: Data[] } | null
): string[] {
  if (!payload?.data) return [];
  return (payload.data as RawTrace[])
    .map((t) => t.name ?? "")
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "pt-BR"));
}

export type PlotlyFundFilterFigureProps = {
  url: string;
  /** Hide the built-in fund row — use with `selectedValue` + `onSelectedValueChange` from a parent. */
  hideFundSelector?: boolean;
  /** Sync selection across charts (requires `hideFundSelector`). */
  selectedValue?: string;
  onSelectedValueChange?: (value: string) => void;
};

export function PlotlyFundFilterFigure({
  url,
  hideFundSelector = false,
  selectedValue,
  onSelectedValueChange,
}: PlotlyFundFilterFigureProps) {
  const [payload, setPayload] = useState<{ data: Data[]; layout: Partial<Layout> } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [internalSelected, setInternalSelected] = useState<string>("");

  const isControlled =
    hideFundSelector &&
    typeof onSelectedValueChange === "function" &&
    selectedValue !== undefined;

  const selected = isControlled ? selectedValue! : internalSelected;

  const setSelected = (value: string) => {
    if (isControlled) {
      onSelectedValueChange!(value);
    } else {
      setInternalSelected(value);
    }
  };

  useEffect(() => {
    setPayload(null);
    setError(null);
    setInternalSelected("");
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(r.statusText);
        return r.json();
      })
      .then(setPayload)
      .catch((e: Error) => setError(e.message));
  }, [url]);

  const fundNames = useMemo<string[]>(() => {
    if (!payload?.data) return [];
    return (payload.data as RawTrace[])
      .map((t) => t.name ?? "")
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [payload?.data]);

  useEffect(() => {
    if (isControlled) return;
    if (!fundNames.length || internalSelected) return;
    setInternalSelected(fundNames[0]);
  }, [fundNames, internalSelected, isControlled]);

  const filteredData = useMemo((): Data[] => {
    if (!payload?.data?.length || !selected) return [];
    const traces = payload.data as RawTrace[];
    const tr = traces.find((t) => t.name === selected);
    if (!tr) return [];
    return [
      {
        ...tr,
        showlegend: true,
      } as Data,
    ];
  }, [payload?.data, selected]);

  const adjustedLayout = useMemo((): Partial<Layout> => {
    if (!payload?.layout) return {};
    const base = { ...payload.layout, autosize: true } as Partial<Layout> & Record<string, unknown>;
    const isSingle = Boolean(selected);

    if (isSingle) {
      base.legend = {
        ...(typeof base.legend === "object" && base.legend !== null ? base.legend : {}),
        orientation: "h" as const,
        y: -0.12,
      };
      base.margin = {
        ...(typeof base.margin === "object" && base.margin !== null ? base.margin : {}),
        b: 80,
      };
    }

    return base as Partial<Layout>;
  }, [payload?.layout, selected]);

  const layoutHeight =
    typeof payload?.layout?.height === "number" && payload.layout.height > 0
      ? payload.layout.height
      : 540;

  if (error) {
    return (
      <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        Falha ao carregar gráfico: {error}
      </div>
    );
  }

  if (!payload) {
    return <div className="animate-pulse rounded-md bg-muted" style={{ height: layoutHeight }} aria-hidden />;
  }

  const showFundPicker = !hideFundSelector;

  return (
    <div className={showFundPicker ? "space-y-3" : undefined}>
      {showFundPicker && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="shrink-0 text-sm font-medium text-muted-foreground">Fundo</span>
          <Select value={selected} onValueChange={setSelected}>
            <SelectTrigger className="h-8 w-72 text-sm">
              <SelectValue placeholder="Selecionar…" />
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
      )}

      <Suspense
        fallback={
          <div className="animate-pulse rounded-md bg-muted" style={{ height: layoutHeight }} aria-hidden />
        }
      >
        <Plot
          data={filteredData}
          layout={adjustedLayout}
          style={{ width: "100%", height: layoutHeight }}
          useResizeHandler
          config={{ responsive: true, displayModeBar: true }}
        />
      </Suspense>
    </div>
  );
}
