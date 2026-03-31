import { Suspense, lazy, useEffect, useState } from "react";
import type { Data, Layout } from "plotly.js";

const Plot = lazy(() => import("react-plotly.js"));

export type PlotlyWebFigureProps =
  | { variant: "full"; url: string }
  | { variant: "split"; layoutUrl: string; dataUrl: string };

/**
 * Renders a Plotly figure from JSON produced by `viz.export.figure_to_web_dict`
 * (full file) or from separate layout + data files (same chart, split for daily data updates).
 */
export function PlotlyWebFigure(props: PlotlyWebFigureProps) {
  const [payload, setPayload] = useState<{ data: Data[]; layout: Partial<Layout> } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const variant = props.variant;
  const fullUrl = variant === "full" ? props.url : undefined;
  const layoutUrl = variant === "split" ? props.layoutUrl : undefined;
  const dataUrl = variant === "split" ? props.dataUrl : undefined;

  useEffect(() => {
    setError(null);
    setPayload(null);

    if (variant === "full" && fullUrl) {
      fetch(fullUrl)
        .then((r) => {
          if (!r.ok) throw new Error(r.statusText);
          return r.json();
        })
        .then(setPayload)
        .catch((e: Error) => setError(e.message));
    } else if (variant === "split" && layoutUrl && dataUrl) {
      Promise.all([
        fetch(layoutUrl).then((r) => {
          if (!r.ok) throw new Error(r.statusText);
          return r.json();
        }),
        fetch(dataUrl).then((r) => {
          if (!r.ok) throw new Error(r.statusText);
          return r.json();
        }),
      ])
        .then(([layout, data]) => setPayload({ layout, data }))
        .catch((e: Error) => setError(e.message));
    }
  }, [variant, fullUrl, layoutUrl, dataUrl]);

  if (error) {
    return (
      <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        Falha ao carregar gráfico: {error}
      </div>
    );
  }

  if (!payload) {
    return <div className="h-[540px] animate-pulse rounded-md bg-muted" aria-hidden />;
  }

  return (
    <Suspense fallback={<div className="h-[540px] animate-pulse rounded-md bg-muted" />}>
      <Plot
        data={payload.data}
        layout={{
          ...payload.layout,
          autosize: true,
        }}
        style={{ width: "100%", height: 540 }}
        useResizeHandler
        config={{ responsive: true, displayModeBar: true }}
      />
    </Suspense>
  );
}
