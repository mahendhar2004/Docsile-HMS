/**
 * ui/badge.tsx
 *
 * Badge primitive — small inline label for categorization, status indication,
 * or numeric counts. Two shape variants: pill (default) and square.
 *
 * For entity-level status display (patient/bill/claim status strings mapped
 * to semantic colors), use patterns/status/StatusPill instead — it wraps
 * Badge with the status-map lookup.
 */

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

/* ─── Variants ──────────────────────────────────────────────────────────────── */

const badgeVariants = cva(
  // Base
  [
    "inline-flex items-center justify-center gap-1",
    "font-medium leading-none whitespace-nowrap",
    "border border-transparent",
    "select-none",
  ].join(" "),
  {
    variants: {
      /** Color intent */
      variant: {
        // Solid fill — border stays transparent (fill provides definition).
        default:
          "bg-[--color-primary] text-[--color-primary-foreground] border-transparent",
        // Neutral surfaces — use the standard border token for definition.
        secondary:
          "bg-[--color-secondary] text-[--color-secondary-foreground] border-[--color-border]",
        outline:
          "border-[--color-border] bg-transparent text-[--color-foreground]",
        muted:
          "bg-[--color-muted] text-[--color-muted-foreground] border-[--color-border]",
        // Soft-colour badges: 20% alpha tonal border so the pill reads as a
        // deliberate coloured surface rather than a flat washed-out fill.
        // Same var-based opacity pattern as patterns/status/status-pill.tsx
        // (a sibling component) — tracks the base token if it's ever retuned.
        success:
          "bg-[--color-success-soft] text-[--color-success-soft-foreground] border-[--color-success]/20",
        warning:
          "bg-[--color-warning-soft] text-[--color-warning-soft-foreground] border-[--color-warning]/20",
        error:
          "bg-[--color-error-soft] text-[--color-error-soft-foreground] border-[--color-error]/20",
        info:
          "bg-[--color-info-soft] text-[--color-info-soft-foreground] border-[--color-info]/20",
        neutral:
          "bg-[--color-neutral-soft] text-[--color-neutral-soft-foreground] border-[--color-neutral]/20",
      },
      /** Shape */
      shape: {
        pill: "rounded-[--radius-full]",
        square: "rounded-[--radius-xs]",
      },
      /** Size */
      size: {
        sm: "h-5 px-1.5 text-[10px]",
        md: "h-6 px-2 text-xs",
        lg: "h-7 px-2.5 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      shape: "pill",
      size: "md",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, shape, size, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(badgeVariants({ variant, shape, size }), className)}
      {...props}
    />
  )
)
Badge.displayName = "Badge"

/* ─── CountBadge ────────────────────────────────────────────────────────────── */
// Numeric badge — fixed circular dimensions so single and double digit
// counts look consistent. Used for notification counts and row totals.

export interface CountBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  count: number
  /** When count exceeds this, display "{max}+" instead of the raw number */
  max?: number
  variant?: VariantProps<typeof badgeVariants>["variant"]
}

const CountBadge = React.forwardRef<HTMLSpanElement, CountBadgeProps>(
  ({ count, max = 99, variant = "default", className, ...props }, ref) => {
    const display = count > max ? `${max}+` : String(count)
    return (
      <span
        ref={ref}
        aria-label={`${count} items`}
        className={cn(
          badgeVariants({ variant, shape: "pill", size: "sm" }),
          // Fixed minimum width so "1" and "99+" are the same height
          "min-w-[1.25rem] tabular-nums",
          className
        )}
        {...props}
      >
        {display}
      </span>
    )
  }
)
CountBadge.displayName = "CountBadge"

export { Badge, CountBadge, badgeVariants }
