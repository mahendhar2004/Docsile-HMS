/**
 * patterns/charts/bar-chart.tsx
 *
 * ThemedBarChart — recharts BarChart wrapper with design-system theming.
 *
 * Supports:
 *   - Vertical orientation (default): bars go upward, X is categories, Y is values.
 *   - Horizontal orientation: bars go sideways, Y is categories, X is values.
 *   - Single or multi-series, grouped (default) or stacked.
 *   - Themed axes, gridlines, tooltip, and legend.
 *   - Responsive container — always fills its parent's width.
 *
 * Orientation naming (to match user intuition, not recharts' own naming):
 *   orientation="vertical"   → recharts layout="horizontal" (standard upward bars)
 *   orientation="horizontal" → recharts layout="vertical"   (sideways bars)
 *
 * Usage:
 *   // Standard grouped bar chart
 *   <ThemedBarChart
 *     data={monthlyData}
 *     series={[{ dataKey: "opd", name: "OPD" }, { dataKey: "ipd", name: "IPD" }]}
 *     xAxisKey="month"
 *   />
 *
 *   // Stacked bar chart
 *   <ThemedBarChart
 *     data={monthlyData}
 *     series={[{ dataKey: "settled" }, { dataKey: "pending" }]}
 *     xAxisKey="month"
 *     stacked
 *   />
 *
 *   // Horizontal (sideways) bars
 *   <ThemedBarChart
 *     data={departmentData}
 *     series={[{ dataKey: "count", name: "Patients" }]}
 *     xAxisKey="department"
 *     orientation="horizontal"
 *   />
 */

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts"
import { cn } from "@/lib/utils"
import {
  CHART_PALETTE,
  CHART_TICK_STYLE,
  CHART_AXIS_LINE_STYLE,
  CHART_GRID_PROPS,
  CHART_TOOLTIP_STYLE,
  CHART_LEGEND_WRAPPER_STYLE,
  CHART_BAR_CURSOR,
  CHART_MARGIN,
  DEFAULT_CHART_HEIGHT,
  type ChartSeries,
} from "./chart-theme"

// ─── Types ────────────────────────────────────────────────────────────────────

export type BarChartOrientation = "vertical" | "horizontal"

export interface ThemedBarChartProps {
  /** Data array — each object must have at minimum the xAxisKey field + all series dataKey fields. */
  data: Record<string, unknown>[]
  /** One entry per series to render. */
  series: ChartSeries[]
  /** The data key used for the category axis (X when vertical, Y when horizontal). */
  xAxisKey: string
  /**
   * "vertical" = standard upward bars (default).
   * "horizontal" = sideways bars (good for long category names).
   */
  orientation?: BarChartOrientation
  /**
   * When true, bars are stacked instead of grouped.
   * @default false
   */
  stacked?: boolean
  /**
   * Formatter for the category axis (X when vertical, Y when horizontal).
   * Typed as `(value: unknown)` because recharts internally passes `any`.
   */
  xTickFormatter?: (value: unknown, index: number) => string
  /**
   * Formatter for the value axis (Y when vertical, X when horizontal).
   */
  yTickFormatter?: (value: unknown, index: number) => string
  /**
   * Formatter for the tooltip label.
   * The `label` argument is typed as `unknown` to match recharts' internal `ReactNode`
   * label parameter — in practice recharts always passes a string or number here.
   */
  tooltipLabelFormatter?: (label: unknown) => string
  /**
   * Height of the chart area in pixels.
   * @default 240
   */
  height?: number
  /**
   * Show the legend. Defaults to true when series.length > 1.
   */
  showLegend?: boolean
  /**
   * Corner radius on the top of each bar (in pixels).
   * @default 4
   */
  barRadius?: number
  className?: string
}

// ─── Bar radius helper ────────────────────────────────────────────────────────

function makeBarRadius(radius: number): [number, number, number, number] {
  // recharts bar radius: [top-left, top-right, bottom-right, bottom-left]
  return [radius, radius, 0, 0]
}

// ─── ThemedBarChart ───────────────────────────────────────────────────────────

function ThemedBarChart({
  data,
  series,
  xAxisKey,
  orientation = "vertical",
  stacked = false,
  xTickFormatter,
  yTickFormatter,
  tooltipLabelFormatter,
  height = DEFAULT_CHART_HEIGHT,
  showLegend,
  barRadius = 4,
  className,
}: ThemedBarChartProps) {
  const shouldShowLegend = showLegend ?? series.length > 1

  // recharts layout:
  //  "horizontal" = categories on X, values on Y (standard upward bars)
  //  "vertical"   = categories on Y, values on X (sideways bars)
  const rechartsLayout = orientation === "horizontal" ? "vertical" : "horizontal"
  const isHorizontal = orientation === "horizontal"

  // Grid lines: horizontal grid = horizontal lines visible for vertical bars,
  // show vertical lines (which are horizontal from data direction) for horizontal bars.
  const gridProps = isHorizontal
    ? { ...CHART_GRID_PROPS, vertical: true, horizontal: false }
    : CHART_GRID_PROPS

  const barLabel = series.map((s) => s.name ?? s.dataKey).join(", ")

  return (
    <div
      className={cn("w-full", className)}
      style={{ height }}
      role="img"
      aria-label={`Bar chart: ${barLabel}`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout={rechartsLayout}
          margin={CHART_MARGIN}
          barCategoryGap="30%"
          barGap={2}
        >
          <CartesianGrid {...gridProps} />

          {/* Category axis */}
          {isHorizontal ? (
            <YAxis
              dataKey={xAxisKey}
              type="category"
              tick={CHART_TICK_STYLE}
              axisLine={CHART_AXIS_LINE_STYLE}
              tickLine={false}
              tickFormatter={xTickFormatter}
              width={80}
            />
          ) : (
            <XAxis
              dataKey={xAxisKey}
              type="category"
              tick={CHART_TICK_STYLE}
              axisLine={CHART_AXIS_LINE_STYLE}
              tickLine={CHART_AXIS_LINE_STYLE}
              tickFormatter={xTickFormatter}
              dy={4}
            />
          )}

          {/* Value axis */}
          {isHorizontal ? (
            <XAxis
              type="number"
              tick={CHART_TICK_STYLE}
              axisLine={false}
              tickLine={false}
              tickFormatter={yTickFormatter}
            />
          ) : (
            <YAxis
              type="number"
              tick={CHART_TICK_STYLE}
              axisLine={false}
              tickLine={false}
              tickFormatter={yTickFormatter}
              width={48}
            />
          )}

          <Tooltip
            {...CHART_TOOLTIP_STYLE}
            cursor={CHART_BAR_CURSOR}
            labelFormatter={tooltipLabelFormatter}
          />

          {shouldShowLegend && (
            <Legend wrapperStyle={CHART_LEGEND_WRAPPER_STYLE} />
          )}

          {series.map((s, i) => {
            const color = s.color ?? CHART_PALETTE[i % CHART_PALETTE.length]
            // For stacked, apply radius only to the last bar in the stack
            const isLastSeries = i === series.length - 1
            const radius = stacked && !isLastSeries ? undefined : makeBarRadius(barRadius)
            return (
              <Bar
                key={s.dataKey}
                dataKey={s.dataKey}
                name={s.name ?? s.dataKey}
                fill={color}
                stackId={stacked ? "stack" : undefined}
                radius={radius}
                maxBarSize={48}
              />
            )
          })}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

ThemedBarChart.displayName = "ThemedBarChart"

export { ThemedBarChart }
