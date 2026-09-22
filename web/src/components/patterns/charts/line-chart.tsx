/**
 * patterns/charts/line-chart.tsx
 *
 * ThemedLineChart — recharts LineChart wrapper with design-system theming.
 *
 * Supports:
 *   - Single or multi-series (pass multiple entries in `series`)
 *   - Themed axes (--color-muted-foreground labels, --color-border lines)
 *   - Horizontal-only gridlines (less visual noise)
 *   - Themed tooltip (card surface, border, shadow)
 *   - Legend when more than one series (auto) or when showLegend is forced
 *   - Responsive container — always fills its parent's width
 *
 * Usage:
 *   // Single series
 *   <ThemedLineChart
 *     data={dailyData}
 *     series={[{ dataKey: "patients", name: "Patients" }]}
 *     xAxisKey="date"
 *     xTickFormatter={(d) => format(new Date(d as string), "dd MMM")}
 *   />
 *
 *   // Multi-series
 *   <ThemedLineChart
 *     data={weeklyData}
 *     series={[
 *       { dataKey: "opd", name: "OPD" },
 *       { dataKey: "ipd", name: "IPD", color: "var(--color-warning)" },
 *     ]}
 *     xAxisKey="week"
 *   />
 */

import {
  ResponsiveContainer,
  LineChart,
  Line,
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

export interface ThemedLineChartProps {
  /** Data array — each object must contain at minimum the xAxisKey field + all series dataKey fields. */
  data: Record<string, unknown>[]
  /** One entry per series to render. */
  series: ChartSeries[]
  /** The data key used for the X axis (category / time field). */
  xAxisKey: string
  /**
   * Formatter for X axis tick labels.
   * E.g. `(v) => format(new Date(v as string), "dd MMM")`.
   * Typed as `(value: unknown)` because recharts internally passes `any`.
   */
  xTickFormatter?: (value: unknown, index: number) => string
  /**
   * Formatter for Y axis tick labels.
   * E.g. `(v) => \`₹${(v as number).toLocaleString("en-IN")}\``.
   */
  yTickFormatter?: (value: unknown, index: number) => string
  /**
   * Formatter for the tooltip label (the X axis value shown at the top of the tooltip).
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
   * Pass true to force-show even for a single series.
   */
  showLegend?: boolean
  className?: string
}

// ─── ThemedLineChart ──────────────────────────────────────────────────────────

function ThemedLineChart({
  data,
  series,
  xAxisKey,
  xTickFormatter,
  yTickFormatter,
  tooltipLabelFormatter,
  height = DEFAULT_CHART_HEIGHT,
  showLegend,
  className,
}: ThemedLineChartProps) {
  const shouldShowLegend = showLegend ?? series.length > 1

  return (
    <div
      className={cn("w-full", className)}
      style={{ height }}
      role="img"
      aria-label={`Line chart with ${series.length} series`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
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
              <Line
                key={s.dataKey}
                dataKey={s.dataKey}
                name={s.name ?? s.dataKey}
                stroke={color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: color, stroke: "var(--color-card)", strokeWidth: 2 }}
                type="monotone"
              />
            )
          })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

ThemedLineChart.displayName = "ThemedLineChart"

export { ThemedLineChart }
