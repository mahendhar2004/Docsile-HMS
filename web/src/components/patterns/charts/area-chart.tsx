/**
 * patterns/charts/area-chart.tsx
 *
 * ThemedAreaChart — recharts AreaChart wrapper with design-system theming.
 *
 * Best used for:
 *   - Trend visualizations where magnitude over time matters (daily patient flow,
 *     revenue accumulation, occupancy rate).
 *   - Sparkline-style overviews inside a stat card context.
 *
 * Differences from ThemedLineChart:
 *   - Uses Area instead of Line — includes a semi-transparent fill below the line.
 *   - The fill opacity is kept low (0.15) so multi-series areas don't obscure each other.
 *   - The curve type defaults to "monotone" (smooth) which reads better for continuous data.
 *
 * Usage:
 *   // Daily patient volume trend
 *   <ThemedAreaChart
 *     data={dailyStats}
 *     series={[{ dataKey: "visits", name: "Patient Visits" }]}
 *     xAxisKey="date"
 *     xTickFormatter={(d) => format(new Date(d as string), "dd MMM")}
 *   />
 *
 *   // Compare OPD vs IPD trend
 *   <ThemedAreaChart
 *     data={weeklyStats}
 *     series={[
 *       { dataKey: "opd", name: "OPD" },
 *       { dataKey: "ipd", name: "IPD" },
 *     ]}
 *     xAxisKey="week"
 *   />
 */

import {
  ResponsiveContainer,
  AreaChart,
  Area,
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
  CHART_LINE_CURSOR,
  CHART_MARGIN,
  DEFAULT_CHART_HEIGHT,
  type ChartSeries,
} from "./chart-theme"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ThemedAreaChartProps {
  /** Data array — each object must contain the xAxisKey field + all series dataKey fields. */
  data: Record<string, unknown>[]
  /** One entry per series to render. */
  series: ChartSeries[]
  /** The data key used for the X axis. */
  xAxisKey: string
  /**
   * Formatter for X axis tick labels.
   * Typed as `(value: unknown)` because recharts internally passes `any`.
   */
  xTickFormatter?: (value: unknown, index: number) => string
  /**
   * Formatter for Y axis tick labels.
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
   * Fill opacity for the area beneath the line.
   * Keep low for multi-series to avoid overlap obscuring data.
   * @default 0.15
   */
  fillOpacity?: number
  className?: string
}

// ─── ThemedAreaChart ──────────────────────────────────────────────────────────

function ThemedAreaChart({
  data,
  series,
  xAxisKey,
  xTickFormatter,
  yTickFormatter,
  tooltipLabelFormatter,
  height = DEFAULT_CHART_HEIGHT,
  showLegend,
  fillOpacity = 0.15,
  className,
}: ThemedAreaChartProps) {
  const shouldShowLegend = showLegend ?? series.length > 1
  const seriesLabel = series.map((s) => s.name ?? s.dataKey).join(", ")

  return (
    <div
      className={cn("w-full", className)}
      style={{ height }}
      role="img"
      aria-label={`Area chart: ${seriesLabel}`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={CHART_MARGIN}
        >
          <CartesianGrid {...CHART_GRID_PROPS} />

          <XAxis
            dataKey={xAxisKey}
            tick={CHART_TICK_STYLE}
            axisLine={CHART_AXIS_LINE_STYLE}
            tickLine={CHART_AXIS_LINE_STYLE}
            tickFormatter={xTickFormatter}
            dy={4}
          />

          <YAxis
            tick={CHART_TICK_STYLE}
            axisLine={false}
            tickLine={false}
            tickFormatter={yTickFormatter}
            width={48}
          />

          <Tooltip
            {...CHART_TOOLTIP_STYLE}
            cursor={CHART_LINE_CURSOR}
            labelFormatter={tooltipLabelFormatter}
          />

          {shouldShowLegend && (
            <Legend wrapperStyle={CHART_LEGEND_WRAPPER_STYLE} />
          )}

          {series.map((s, i) => {
            const color = s.color ?? CHART_PALETTE[i % CHART_PALETTE.length]
            return (
              <Area
                key={s.dataKey}
                dataKey={s.dataKey}
                name={s.name ?? s.dataKey}
                type="monotone"
                stroke={color}
                strokeWidth={2}
                fill={color}
                fillOpacity={fillOpacity}
                dot={false}
                activeDot={{ r: 4, fill: color, stroke: "var(--color-card)", strokeWidth: 2 }}
              />
            )
          })}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

ThemedAreaChart.displayName = "ThemedAreaChart"

export { ThemedAreaChart }
