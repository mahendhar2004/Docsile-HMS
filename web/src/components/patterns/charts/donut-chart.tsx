/**
 * patterns/charts/donut-chart.tsx
 *
 * ThemedDonutChart — recharts PieChart (donut variant) wrapper with design-system theming.
 *
 * Donut over pie: the center hole provides a natural place to show the total
 * count or a key summary number, which is a common pattern in HMS dashboards
 * (e.g. "48 Total Claims" in the center of a claim-status breakdown).
 *
 * Supports:
 *   - Slices colored via CHART_PALETTE (index-based) or caller-supplied colors.
 *   - Optional center total (auto-summed from data, or manually overridden).
 *   - Themed tooltip and legend.
 *   - PaddingAngle for gap between slices (cleaner read).
 *   - Responsive container — fills its parent's width.
 *
 * Usage:
 *   // Claim status breakdown
 *   <ThemedDonutChart
 *     data={[
 *       { name: "Settled",  value: 24, color: "var(--color-success)" },
 *       { name: "Pending",  value: 12, color: "var(--color-warning)" },
 *       { name: "Rejected", value:  4, color: "var(--color-error)"   },
 *     ]}
 *     totalLabel="Claims"
 *   />
 *
 *   // Simple distribution chart
 *   <ThemedDonutChart
 *     data={[
 *       { name: "OPD", value: 128 },
 *       { name: "IPD", value:  34 },
 *     ]}
 *     totalLabel="Patients"
 *   />
 */

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts"
import { cn } from "@/lib/utils"
import {
  CHART_PALETTE,
  CHART_TOOLTIP_STYLE,
  CHART_LEGEND_WRAPPER_STYLE,
  DEFAULT_CHART_HEIGHT,
} from "./chart-theme"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DonutSlice {
  /** Display name for the slice (shown in legend and tooltip). */
  name: string
  /** Numeric value (used for proportional sizing). */
  value: number
  /**
   * CSS color string. If omitted, CHART_PALETTE[sliceIndex] is used.
   * Use CHART_STATUS_COLORS for claim/patient status breakdowns.
   */
  color?: string
}

export interface ThemedDonutChartProps {
  /** Slice data for the donut. */
  data: DonutSlice[]
  /**
   * Label shown below the total value in the center hole.
   * E.g. "Claims", "Patients".
   */
  totalLabel?: string
  /**
   * Total value shown in the center hole.
   * If not provided, the sum of all slice values is used.
   */
  totalValue?: string | number
  /**
   * Inner radius of the donut. Controls hole size.
   * @default "55%"
   */
  innerRadius?: number | string
  /**
   * Outer radius of the donut.
   * @default "75%"
   */
  outerRadius?: number | string
  /**
   * Height of the chart area in pixels.
   * @default 240
   */
  height?: number
  /**
   * Show the legend.
   * @default true
   */
  showLegend?: boolean
  className?: string
}

// ─── Slice color helper ───────────────────────────────────────────────────────

function sliceColor(slice: DonutSlice, index: number): string {
  return slice.color ?? CHART_PALETTE[index % CHART_PALETTE.length]
}

// ─── ThemedDonutChart ─────────────────────────────────────────────────────────

function ThemedDonutChart({
  data,
  totalLabel,
  totalValue: totalValueProp,
  innerRadius = "55%",
  outerRadius = "75%",
  height = DEFAULT_CHART_HEIGHT,
  showLegend = true,
  className,
}: ThemedDonutChartProps) {
  const totalValue = totalValueProp ?? data.reduce((sum, s) => sum + s.value, 0)
  const names = data.map((d) => d.name).join(", ")

  return (
    <div
      className={cn("relative w-full", className)}
      style={{ height }}
      role="img"
      aria-label={`Donut chart: ${names}`}
    >
      {/* Center total — absolutely positioned over the chart's center */}
      {(totalLabel != null || totalValueProp != null) && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10"
          aria-hidden="true"
        >
          <span
            className={cn(
              "text-[length:var(--text-title)] font-semibold tabular-nums",
              "text-[--color-foreground] leading-none"
            )}
          >
            {totalValue}
          </span>
          {totalLabel && (
            <span
              className={cn(
                "text-[length:var(--text-caption)] mt-0.5",
                "text-[--color-muted-foreground]"
              )}
            >
              {totalLabel}
            </span>
          )}
        </div>
      )}

      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            paddingAngle={data.length > 1 ? 3 : 0}
            strokeWidth={0}
            startAngle={90}
            endAngle={-270}
          >
            {data.map((slice, i) => (
              <Cell
                key={`${slice.name}-${i}`}
                fill={sliceColor(slice, i)}
              />
            ))}
          </Pie>

          <Tooltip
            {...CHART_TOOLTIP_STYLE}
          />

          {showLegend && (
            <Legend wrapperStyle={CHART_LEGEND_WRAPPER_STYLE} />
          )}
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

ThemedDonutChart.displayName = "ThemedDonutChart"

/** Alias used in the barrel export (`DonutChartSlice`) for naming consistency. */
export type DonutChartSlice = DonutSlice

export { ThemedDonutChart }
