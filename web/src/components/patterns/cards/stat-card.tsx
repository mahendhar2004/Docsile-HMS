/**
 * patterns/cards/stat-card.tsx
 *
 * StatCard — standard dashboard metric tile.
 *
 * Shows: icon (optional) · label · large value · trend indicator (optional)
 *
 * Props:
 *   label       — metric name (e.g. "Total Patients Today")
 *   value       — formatted metric value (e.g. "128" or "₹45,000")
 *   icon        — optional React node (Lucide icon recommended, rendered at 20px)
 *   trend       — optional { direction, delta, label? }
 *                   direction "up"      → success green (count/revenue increased)
 *                   direction "down"    → error red    (count/revenue decreased)
 *                   direction "neutral" → neutral gray (unchanged / N/A)
 *                   delta  — the change value to display (e.g. "+12" or "-3%")
 *                   label  — optional context text after delta (e.g. "vs yesterday")
 *   loading     — show skeleton placeholder while data is fetching
 *   onClick     — makes the card interactive (dashboard nav tiles)
 *   className   — forwarded to the root Card
 *
 * Usage:
 *   <StatCard
 *     label="Total Patients Today"
 *     value="128"
 *     icon={<Users size={20} />}
 *     trend={{ direction: "up", delta: "+12", label: "vs yesterday" }}
 *   />
 *
 *   <StatCard label="Revenue" value="₹45,000" loading />
 */

import * as React from "react"
import { TrendingDown, TrendingUp, Minus } from "lucide-react"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

/* ─── Types ─────────────────────────────────────────────────────────────────── */

export type TrendDirection = "up" | "down" | "neutral"

export interface StatCardTrend {
  direction: TrendDirection
  /** Change value to display — e.g. "+12", "-3%", "0" */
  delta: string | number
  /** Optional context after the delta — e.g. "vs yesterday" */
  label?: string
}

export interface StatCardProps {
  /** Metric name */
  label: string
  /** Formatted metric value (string allows pre-formatted currency/percentage) */
  value: string | number
  /** Optional icon rendered at the top-right of the tile */
  icon?: React.ReactNode
  /** Optional trend indicator */
  trend?: StatCardTrend
  /** Show loading skeleton — renders placeholder, hides real content */
  loading?: boolean
  /** Makes the card interactive (adds hover/click feedback) */
  onClick?: React.MouseEventHandler<HTMLDivElement>
  className?: string
}

/* ─── Trend color map ───────────────────────────────────────────────────────── */
// Colors come from the CSS token set — no hardcoded hex values.

const trendConfig: Record<
  TrendDirection,
  {
    icon: React.ElementType
    colorClass: string
    ariaLabel: string
  }
> = {
  up: {
    icon: TrendingUp,
    colorClass: "text-[var(--color-success-soft-foreground)]",
    ariaLabel: "trending up",
  },
  down: {
    icon: TrendingDown,
    colorClass: "text-[var(--color-error-soft-foreground)]",
    ariaLabel: "trending down",
  },
  neutral: {
    icon: Minus,
    colorClass: "text-[var(--color-neutral-soft-foreground)]",
    ariaLabel: "no change",
  },
}

/* ─── Loading skeleton ──────────────────────────────────────────────────────── */

function StatCardSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading metric">
      <div className="flex items-start justify-between mb-3">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-8 w-8 rounded-[var(--radius-sm)]" />
      </div>
      <Skeleton className="h-8 w-20 mb-2" />
      <Skeleton className="h-3 w-24 rounded-full" />
    </div>
  )
}

/* ─── StatCard ──────────────────────────────────────────────────────────────── */

const StatCard = React.forwardRef<HTMLDivElement, StatCardProps>(
  (
    { label, value, icon, trend, loading = false, onClick, className },
    ref
  ) => {
    const isInteractive = !!onClick

    return (
      <Card
        ref={ref}
        variant="elevated"
        interactive={isInteractive}
        onClick={onClick}
        className={cn("min-w-0", className)}
        // Override role/tabIndex set by Card's interactive prop so the caller
        // controls keyboard handling (they may wrap in a router link, etc.)
        {...(isInteractive ? { role: "button", tabIndex: 0 } : {})}
      >
        <CardContent className="px-5 py-4">
          {loading ? (
            <StatCardSkeleton />
          ) : (
            <>
              {/* Header row: label + icon */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <p
                  className={cn(
                    "text-[length:var(--text-body)] font-medium",
                    "text-[var(--color-muted-foreground)] leading-[var(--leading-tight)]"
                  )}
                >
                  {label}
                </p>

                {icon && (
                  <span
                    aria-hidden="true"
                    className={cn(
                      "shrink-0 flex items-center justify-center",
                      "h-9 w-9 rounded-[var(--radius-sm)]",
                      "bg-[var(--color-accent)] text-[var(--color-accent-foreground)]"
                    )}
                  >
                    {icon}
                  </span>
                )}
              </div>

              {/* Value */}
              <p
                className={cn(
                  "text-[length:var(--text-display)] font-semibold tabular-nums",
                  "text-[var(--color-foreground)] leading-none mb-2"
                )}
              >
                {value}
              </p>

              {/* Trend */}
              {trend && (
                <TrendBadge trend={trend} />
              )}
            </>
          )}
        </CardContent>
      </Card>
    )
  }
)
StatCard.displayName = "StatCard"

/* ─── TrendBadge (internal) ─────────────────────────────────────────────────── */

function TrendBadge({ trend }: { trend: StatCardTrend }) {
  const config = trendConfig[trend.direction]
  const TrendIcon = config.icon

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1",
        "text-[length:var(--text-caption)] font-medium",
        config.colorClass
      )}
      aria-label={`${config.ariaLabel}: ${trend.delta}${trend.label ? ` ${trend.label}` : ""}`}
    >
      <TrendIcon size={13} aria-hidden="true" strokeWidth={2.5} />
      <span>{trend.delta}</span>
      {trend.label && (
        <span className="text-[var(--color-muted-foreground)] font-normal">
          {trend.label}
        </span>
      )}
    </div>
  )
}

export { StatCard }
