/**
 * patterns/structured-content/timeline.tsx
 *
 * Timeline — vertical activity log with timestamped events, a connecting line,
 * and color-coded dot markers.
 *
 * Real-world uses in this app:
 * - Insurance claim status history (PREAUTH_SUBMITTED → PREAUTH_APPROVED →
 *   FINAL_BILL_SUBMITTED → SETTLED)
 * - Patient visit history / IP episode status changes
 *
 * Props:
 *   events      — ordered array of timeline events (newest-first or oldest-first
 *                 — caller decides the order; no automatic sorting)
 *   emptyText   — message when events is empty (default: "No activity yet")
 *   className   — forwarded to the root ol element
 *
 * Usage:
 *   <Timeline
 *     events={[
 *       {
 *         id: "evt-1",
 *         timestamp: "2026-09-22T10:30:00Z",
 *         title: "Pre-auth approved",
 *         description: "Approved by TPA for ₹85,000",
 *         variant: "success",
 *       },
 *       {
 *         id: "evt-2",
 *         timestamp: "2026-09-21T14:15:00Z",
 *         title: "Pre-auth submitted",
 *         variant: "info",
 *       },
 *     ]}
 *   />
 */

import * as React from "react"
import { cn } from "@/lib/utils"

/* ─── Types ─────────────────────────────────────────────────────────────────── */

export type TimelineVariant = "default" | "success" | "warning" | "error" | "info"

export interface TimelineEvent {
  id: string
  /** ISO 8601 date-time string — formatted for display internally */
  timestamp: string
  title: string
  description?: string
  /** Color of the dot marker. Default: "default" (muted/neutral) */
  variant?: TimelineVariant
}

export interface TimelineProps {
  events: TimelineEvent[]
  /** Shown when events array is empty */
  emptyText?: string
  className?: string
}

/* ─── Dot color map ─────────────────────────────────────────────────────────── */

const dotColors: Record<TimelineVariant, string> = {
  default: "bg-[var(--color-muted-foreground)]",
  success: "bg-[var(--color-success)]",
  warning: "bg-[var(--color-warning)]",
  error: "bg-[var(--color-error)]",
  info: "bg-[var(--color-info)]",
}

/* ─── Timestamp formatter ───────────────────────────────────────────────────── */

function formatTimestamp(iso: string): string {
  try {
    const date = new Date(iso)
    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
  } catch {
    return iso
  }
}

/* ─── Timeline ──────────────────────────────────────────────────────────────── */

const Timeline = React.forwardRef<HTMLOListElement, TimelineProps>(
  ({ events, emptyText = "No activity yet", className }, ref) => {
    if (events.length === 0) {
      return (
        <p
          className={cn(
            "py-8 text-center",
            "text-[length:var(--text-body)] text-[var(--color-muted-foreground)]",
            className
          )}
        >
          {emptyText}
        </p>
      )
    }

    return (
      <ol
        ref={ref}
        aria-label="Activity timeline"
        className={cn("relative flex flex-col", className)}
      >
        {events.map((event, index) => {
          const isLast = index === events.length - 1
          const variant = event.variant ?? "default"

          return (
            <li key={event.id} className="relative flex gap-4 pb-6 last:pb-0">
              {/* Dot + vertical connecting line */}
              <div className="flex flex-col items-center">
                {/* Dot marker */}
                <span
                  aria-hidden="true"
                  className={cn(
                    "relative z-10 mt-1 h-2.5 w-2.5 shrink-0 rounded-full",
                    "ring-2 ring-[var(--color-surface)]",
                    dotColors[variant]
                  )}
                />
                {/* Connecting line — hidden for last item */}
                {!isLast && (
                  <div
                    aria-hidden="true"
                    className="mt-1 w-px flex-1 bg-[var(--color-border)]"
                  />
                )}
              </div>

              {/* Event content */}
              <div className="flex-1 min-w-0 pb-0.5">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 mb-0.5">
                  <p
                    className={cn(
                      "text-[length:var(--text-body)] font-medium",
                      "text-[var(--color-foreground)] leading-[var(--leading-tight)]"
                    )}
                  >
                    {event.title}
                  </p>
                  <time
                    dateTime={event.timestamp}
                    className={cn(
                      "text-[length:var(--text-caption)]",
                      "text-[var(--color-muted-foreground)]"
                    )}
                  >
                    {formatTimestamp(event.timestamp)}
                  </time>
                </div>

                {event.description && (
                  <p
                    className={cn(
                      "text-[length:var(--text-body)]",
                      "text-[var(--color-muted-foreground)]",
                      "leading-[var(--leading-normal)]"
                    )}
                  >
                    {event.description}
                  </p>
                )}
              </div>
            </li>
          )
        })}
      </ol>
    )
  }
)
Timeline.displayName = "Timeline"

export { Timeline }
