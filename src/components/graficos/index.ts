/**
 * Gráficos page: static Plotly JSON from `public/plotly/`, carousel sections, optional fund filter.
 */
export { PlotlyChartCarousel } from "./PlotlyChartCarousel";
export { PlotlySlideCard, type PlotlyCarouselSlide } from "./PlotlySlideCard";
export {
  PlotlyFundFilterFigure,
  extractFundNamesFromPlotlyPayload,
  type PlotlyFundFilterFigureProps,
} from "./PlotlyFundFilterFigure";
export {
  GraficosEvolutionSection,
  type GraficosEvolutionVariant,
} from "./GraficosEvolutionSection";
export { TableExportButtons, type TableExportButtonsProps } from "./TableExportButtons";
export { PlotlyWebFigure, type PlotlyWebFigureProps } from "./PlotlyWebFigure";
