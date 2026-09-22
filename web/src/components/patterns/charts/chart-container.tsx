/**
 * patterns/charts/chart-container.tsx
 *
 * ChartContainer — titled, optionally described wrapper for any chart.
 *
 * Handles:
 *   - Title / description header
 *   - Loading skeleton (three blocks: title stub + chart area)
 *   - Empty state when data is absent (icon + message)
 *   - Consistent card surface and padding
 *
 * All individual chart components (LineChart, BarChart, etc.) work standalone,
 * but in real usage they should be wrapped in ChartContainer so they have a
 * consistent title/loading/empty contract.
 *
 * Usage:
 *   <ChartContainer title="Patient Visits" loading={isLoading} empty={data.length === 0}>
 *     <ThemedLineChart data={data} series={[{ dataKey: "visits" }]} xAxisKey="date" />
 *   </ChartContainer>
 */

import * as React from "react"
import { BarChart2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import { DEFAULT_CHART_HEIGHT } from "./chart-theme"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ChartContainerProps {
  /** Chart title displayed in the card header. */
  title?: string
  /** Optional subtitle / description below the title. */
  description?: string
  /** When true, renders loading skeletons instead of children. */
  loading?: boolean
  /** When true, renders the empty state instead of children. */
  empty?: boolean
  /** Message shown in the empty state. Defaults to "No data available". */
  emptyMessage?: string
  /**
   * Height of the chart area in pixels — forwarded as a CSS height on the
   * chart slot div so the skeleton matches the real chart dimensions.
   * @default 240
   */
  height?: number
  /** The chart component (or any React content) to render inside the card. */
  children: React.ReactNode
  className?: string
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function ChartSkeleton({ height }: { height: number }) {
  return (
    <div aria-busy="true" aria-label="Loading chart" className="space-y-3">
      {/* Title stub */}
      <Skeleton className="h-4 w-40" />
      {/* Description stub */}
      <Skeleton className="h-3 w-60" />
      {/* Chart area */}
      <Skeleton
        className="w-full rounded-[--radius-lg] mt-4"
        style={{ height }}
      />
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function ChartEmpty({
  message,
  height,
}: {
  message: string
  height: number
}) {
  return (
    <div
      role="status"
      aria-label={message}
      className="flex flex-col items-center justify-center gap-3 text-center"
      style={{ height }}
    >
      <span
        aria-hidden="true"
        className={cn(
          "flex items-center justify-center h-12 w-12 rounded-[--radius-lg]",
          "bg-[--color-muted] text-[--color-muted-foreground]"
        )}
      >
        <BarChart2 size={22} strokeWidth={1.5} />
      </span>
      <p className="text-[length:var(--text-body)] text-[--color-muted-foreground] max-w-[200px] leading-[--leading-normal]">
        {message}
      </p>
    </div>
  )
}

// ─── ChartContainer ───────────────────────────────────────────────────────────

const ChartContainer = React.forwardRef<HTMLDivElement, ChartContainerProps>(
  (
    {
      title,
      description,
      loading = false,
      empty = false,
      emptyMessage = "No data available",
      height = DEFAULT_CHART_HEIGHT,
      children,
      className,
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-[--radius-lg] bg-[--color-card]",
          "shadow-[--shadow-card] p-5 flex flex-col gap-4",
          className
        )}
      >
        {/* Header — only rendered when title or description are provided */}
        {(title || description) && !loading && (
          <div className="flex flex-col gap-0.5">
            {title && (
              <h3
                className={cn(
                  "text-[length:var(--text-subtitle)] font-semibold",
                  "text-[--color-foreground] leading-[--leading-tight]"
                )}
              >
                {title}
              </h3>
            )}
            {description && (
              <p
                className={cn(
                  "text-[length:var(--text-caption)]",
                  "text-[--color-muted-foreground] leading-[--leading-normal]"
                )}
              >
                {description}
              </p>
            )}
          </div>
        )}

        {/* Content area */}
        {loading ? (
          <ChartSkeleton height={height} />
        ) : empty ? (
          <ChartEmpty message={emptyMessage} height={height} />
        ) : (
          <div style={{ height }}>{children}</div>
        )}
      </div>
    )
  }
)
ChartContainer.displayName = "ChartContainer"

export { ChartContainer }
