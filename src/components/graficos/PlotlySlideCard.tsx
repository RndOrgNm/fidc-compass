import { PlotlyFundFilterFigure } from "./PlotlyFundFilterFigure";
import { PlotlyWebFigure } from "./PlotlyWebFigure";
import { TableExportButtons } from "./TableExportButtons";

export type PlotlyCarouselSlide = {
  id: string;
  /** File under `/plotly/*.json` */
  file: string;
  /** Short label shown above the chart */
  caption: string;
  /** When true renders a fund-selector dropdown instead of showing all traces */
  filterable?: boolean;
  /** When true renders Excel/PDF export buttons above the chart */
  exportable?: boolean;
  /** Traces always shown with the selected fund (e.g. benchmark) — requires filterable */
  pinnedTraceNames?: readonly string[];
};

/**
 * Single Plotly JSON figure in the same card chrome as carousel slides (caption + optional export).
 */
export function PlotlySlideCard({ slide }: { slide: PlotlyCarouselSlide }) {
  return (
    <div className="min-w-0 overflow-hidden rounded-xl border border-border/70 bg-card/90 px-3 py-4 shadow-sm sm:px-4 sm:py-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-muted-foreground">{slide.caption}</p>
        {slide.exportable && (
          <TableExportButtons
            url={`/plotly/${slide.file}`}
            filename={slide.id}
            title={slide.caption}
          />
        )}
      </div>
      <div className="overflow-x-auto">
        {slide.filterable ? (
          <PlotlyFundFilterFigure
            url={`/plotly/${slide.file}`}
            pinnedTraceNames={slide.pinnedTraceNames}
          />
        ) : (
          <PlotlyWebFigure variant="full" url={`/plotly/${slide.file}`} />
        )}
      </div>
    </div>
  );
}
