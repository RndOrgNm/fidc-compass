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
 * Single Plotly JSON figure for carousel slides: caption + optional export + chart (no card frame).
 */
export function PlotlySlideCard({ slide }: { slide: PlotlyCarouselSlide }) {
  return (
    <div className="min-w-0 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-muted-foreground">{slide.caption}</p>
        {slide.exportable && (
          <TableExportButtons
            url={`/plotly/${slide.file}`}
            filename={slide.id}
            title={slide.caption}
          />
        )}
      </div>
      <div className="min-w-0 overflow-x-auto">
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
