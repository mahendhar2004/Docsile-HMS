/**
 * patterns/status/status-pill.tsx
 *
 * StatusPill: renders a status string (e.g. "ADMITTED", "SETTLED") as a
 * pill badge using the soft color tokens from index.css.
 *
 * The pill does not receive color/variant directly — it accepts a raw
 * `status` string and delegates the bucket/label lookup to status-map.ts.
 * This keeps the color mapping centralised and consistent everywhere.
 *
 * Usage:
 *   <StatusPill status="REGISTERED" />
 *   <StatusPill status="CLAIM_REJECTED" />
 *   <StatusPill status={patient.status} />
 *
 * Unknown status strings fall back to a neutral bucket with a humanized label.
 */

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { resolveStatus, type SemanticBucket } from "./status-map"

/* ─── Style map ─────────────────────────────────────────────────────────────── */

const pillVariants = cva(
  // Base — all pills share this shell
  [
    "inline-flex items-center justify-center",
    "rounded-[var(--radius-full)]",
    "font-medium leading-none whitespace-nowrap",
    "select-none",
  ].join(" "),
  {
    variants: {
      bucket: {
        success: "bg-[var(--color-success-soft)] text-[var(--color-success-soft-foreground)] border border-[var(--color-success)]/30",
        warning: "bg-[var(--color-warning-soft)] text-[var(--color-warning-soft-foreground)] border border-[var(--color-warning)]/30",
        error:   "bg-[var(--color-error-soft)]   text-[var(--color-error-soft-foreground)]   border border-[var(--color-error)]/30",
        info:    "bg-[var(--color-info-soft)]    text-[var(--color-info-soft-foreground)]    border border-[var(--color-info)]/30",
        neutral: "bg-[var(--color-neutral-soft)] text-[var(--color-neutral-soft-foreground)] border border-[var(--color-neutral)]/30",
      } satisfies Record<SemanticBucket, string>,
      size: {
        sm: "h-5 px-2 text-[10px]",
        md: "h-6 px-2.5 text-xs",
        lg: "h-7 px-3 text-sm",
      },
    },
    defaultVariants: {
      bucket: "neutral",
      size: "md",
    },
  }
)

/* ─── Optional dot indicator ────────────────────────────────────────────────── */

const dotColor: Record<SemanticBucket, string> = {
  success: "bg-[var(--color-success)]",
  warning: "bg-[var(--color-warning)]",
  error:   "bg-[var(--color-error)]",
  info:    "bg-[var(--color-info)]",
  neutral: "bg-[var(--color-neutral)]",
}

/* ─── Component ─────────────────────────────────────────────────────────────── */

export interface StatusPillProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, "children">,
    Pick<VariantProps<typeof pillVariants>, "size"> {
  /** Raw entity status string — e.g. "REGISTERED", "SETTLED", "CLAIM_REJECTED" */
  status: string
  /** Show a small colored dot before the label */
  dot?: boolean
}

const StatusPill = React.forwardRef<HTMLSpanElement, StatusPillProps>(
  ({ status, size = "md", dot = false, className, ...props }, ref) => {
    const { bucket, label } = resolveStatus(status)

    return (
      <span
        ref={ref}
        role="status"
        aria-label={label}
        className={cn(pillVariants({ bucket, size }), className)}
        {...props}
      >
        {dot && (
          <span
            aria-hidden="true"
            className={cn("mr-1 h-1.5 w-1.5 shrink-0 rounded-full", dotColor[bucket])}
          />
        )}
        {label}
      </span>
    )
  }
)
StatusPill.displayName = "StatusPill"

export { StatusPill }
