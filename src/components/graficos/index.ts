/**
 * Gráficos page: static Plotly JSON from `public/plotly/`, carousel sections, optional fund filter.
 */
export { PlotlyChartCarousel, type PlotlyCarouselSlide } from "./PlotlyChartCarousel";
export {
  PlotlyFundFilterFigure,
  extractFundNamesFromPlotlyPayload,
  type PlotlyFundFilterFigureProps,
} from "./PlotlyFundFilterFigure";
export { GraficosEvolutionSection } from "./GraficosEvolutionSection";
export { TableExportButtons, type TableExportButtonsProps } from "./TableExportButtons";
export { PlotlyWebFigure, type PlotlyWebFigureProps } from "./PlotlyWebFigure";
