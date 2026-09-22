/**
 * patterns/charts/index.ts
 *
 * Barrel export for all chart components and shared types.
 *
 * Import from this barrel:
 *   import { ThemedLineChart, ThemedBarChart, ThemedDonutChart, ThemedAreaChart } from "@/components/patterns/charts"
 *   import { ChartContainer } from "@/components/patterns/charts"
 *   import { CHART_PALETTE, CHART_STATUS_COLORS } from "@/components/patterns/charts"
 */

// Theme constants and shared types
export {
  CHART_PALETTE,
  CHART_STATUS_COLORS,
  CHART_TICK_STYLE,
  CHART_AXIS_LINE_STYLE,
  CHART_GRID_PROPS,
  CHART_TOOLTIP_STYLE,
  CHART_LEGEND_WRAPPER_STYLE,
  CHART_LINE_CURSOR,
  CHART_BAR_CURSOR,
  CHART_MARGIN,
  DEFAULT_CHART_HEIGHT,
} from "./chart-theme"

export type {
  ChartPaletteColor,
  ChartStatusKey,
  ChartSeries,
} from "./chart-theme"

// Container
export { ChartContainer } from "./chart-container"
export type { ChartContainerProps } from "./chart-container"

// Chart components
export { ThemedLineChart } from "./line-chart"
export type { ThemedLineChartProps } from "./line-chart"

export { ThemedBarChart } from "./bar-chart"
export type { ThemedBarChartProps, BarChartOrientation } from "./bar-chart"

export { ThemedDonutChart } from "./donut-chart"
export type { ThemedDonutChartProps, DonutChartSlice } from "./donut-chart"

export { ThemedAreaChart } from "./area-chart"
export type { ThemedAreaChartProps } from "./area-chart"
