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

const TOTAL_ID = "__total__";

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
 *
 * - When *enableTotalGeral* is true (PL charts): default = "Total Geral", built with the same logic
 *   as Home **PL sob gestão**: for each date `t`, sum each fund’s **last** PL on or before `t`
 *   (carry-forward / as-of). On the latest date this matches `plSobGestao` (values in R$ M in JSON).
 * - Otherwise (Cota charts): defaults to the first fund alphabetically. "Todos os fundos" is also
 *   available but shows all traces on one axis (same as original).
 */

/** Sorted (x,y) points for one trace. */
function buildSortedPairs(tr: RawTrace): { x: string; y: number }[] {
  const pairs: { x: string; y: number }[] = [];
  const xs = tr.x ?? [];
  const ys = tr.y ?? [];
  for (let i = 0; i < xs.length; i++) {
    const x = xs[i];
    const y = ys[i];
    if (x != null && y != null && !Number.isNaN(y)) {
      pairs.push({ x, y: y as number });
    }
  }
  pairs.sort((a, b) => (a.x < b.x ? -1 : a.x > b.x ? 1 : 0));
  return pairs;
}

/** Last fund PL at or before date `t` (same idea as “último PL conhecido” até a data). */
function lastYOnOrBefore(pairs: { x: string; y: number }[], t: string): number | null {
  let last: number | null = null;
  for (const p of pairs) {
    if (p.x <= t) last = p.y;
    else break;
  }
  return last;
}

/**
 * Total Geral series aligned with `compute_home_dashboard_payload` **plSobGestao** on the last day:
 * at each date, sum over funds of last PL ≤ that date (R$ M in exported JSON).
 */
function totalGeralLikePlSobGestao(traces: RawTrace[]): { x: string[]; y: (number | null)[] } {
  const perFund = traces.map(buildSortedPairs);
  const dateSet = new Set<string>();
  for (const pairs of perFund) {
    for (const p of pairs) {
      dateSet.add(p.x);
    }
  }
  const sortedDates = Array.from(dateSet).sort();
  const y = sortedDates.map((t) => {
    let sum = 0;
    let any = false;
    for (const pairs of perFund) {
      const v = lastYOnOrBefore(pairs, t);
      if (v != null) {
        sum += v;
        any = true;
      }
    }
    return any ? sum : null;
  });
  return { x: sortedDates, y };
}

export function PlotlyFundFilterFigure({
  url,
  enableTotalGeral = false,
}: {
  url: string;
  enableTotalGeral?: boolean;
}) {
  const [payload, setPayload] = useState<{ data: Data[]; layout: Partial<Layout> } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string>("");

  useEffect(() => {
    setPayload(null);
    setError(null);
    setSelected("");
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(r.statusText);
        return r.json();
      })
      .then(setPayload)
      .catch((e: Error) => setError(e.message));
  }, [url]);

  // Fund names extracted from traces (sorted alphabetically)
  const fundNames = useMemo<string[]>(() => {
    if (!payload?.data) return [];
    return (payload.data as RawTrace[])
      .map((t) => t.name ?? "")
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [payload?.data]);

  // Set initial selection once funds are known
  useEffect(() => {
    if (!fundNames.length || selected) return;
    setSelected(enableTotalGeral ? TOTAL_ID : fundNames[0]);
  }, [fundNames, selected, enableTotalGeral]);

  // Build the display trace(s) based on selection
  const filteredData = useMemo((): Data[] => {
    if (!payload?.data?.length || !selected) return [];
    const traces = payload.data as RawTrace[];

    // Show a single fund
    if (selected !== TOTAL_ID) {
      const tr = traces.find((t) => t.name === selected);
      if (!tr) return [];
      return [
        {
          ...tr,
          // Show a legend entry so the fund name appears inside the chart
          showlegend: true,
        } as Data,
      ];
    }

    // Total Geral: same logic as Home plSobGestao (as-of sum per fund, then sum funds)
    const { x: sortedDates, y: sumY } = totalGeralLikePlSobGestao(traces);

    // Clone the first trace's shape for consistent styling
    const base = traces[0];
    return [
      {
        ...base,
        name: "Total Geral",
        x: sortedDates,
        y: sumY,
        line: { ...(base.line ?? {}), color: "#10B981" },
        marker: { ...(base.marker ?? {}), color: "#10B981" },
        hovertemplate:
          "<b>Total Geral</b><br>Data: %{x|%d/%m/%Y}<br>R$ %{y:.2f}M<extra></extra>",
        showlegend: true,
      } as Data,
    ];
  }, [payload?.data, selected]);

  // Build adjusted layout: hide the bottom-legend space when showing only one trace
  const adjustedLayout = useMemo((): Partial<Layout> => {
    if (!payload?.layout) return {};
    const base = { ...payload.layout, autosize: true } as Partial<Layout> & Record<string, unknown>;
    const isSingle = selected !== "" && selected !== TOTAL_ID;

    // When showing a single fund shrink the bottom margin (no multi-item legend needed)
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

  return (
    <div className="space-y-3">
      {/* Fund selector */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="shrink-0 text-sm font-medium text-muted-foreground">Fundo</span>
        <Select value={selected} onValueChange={setSelected}>
          <SelectTrigger className="h-8 w-72 text-sm">
            <SelectValue placeholder="Selecionar…" />
          </SelectTrigger>
          <SelectContent>
            {enableTotalGeral && (
              <SelectItem value={TOTAL_ID}>Total Geral</SelectItem>
            )}
            {fundNames.map((name) => (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Chart */}
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
