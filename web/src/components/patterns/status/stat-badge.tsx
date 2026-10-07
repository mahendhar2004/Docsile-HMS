/**
 * patterns/status/stat-badge.tsx
 *
 * StatBadge — small header pill showing a value + label, used for the
 * at-a-glance counters main shows atop Pharmacy/Optical/Labs/Insurance/
 * In-Patients (e.g. "3 Low Stock", "12 Admitted"). Pulled forward from its
 * originally-planned task since In-Patients needs it first.
 *
 * Usage:
 *   <StatBadge value={12} label="Admitted" variant="info" />
 *   <StatBadge value={3} label="Low Stock" variant="warning" />
 */

import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const statBadgeVariants = cva(
  [
    "inline-flex items-center gap-1.5 rounded-[var(--radius-full)] px-3 py-1.5",
    "text-xs font-medium whitespace-nowrap border",
  ].join(" "),
  {
    variants: {
      variant: {
        default:     "bg-[var(--color-muted)] text-[var(--color-muted-foreground)] border-[var(--color-border)]",
        info:        "bg-[var(--color-info-soft)] text-[var(--color-info-soft-foreground)] border-[var(--color-info)]/30",
        success:     "bg-[var(--color-success-soft)] text-[var(--color-success-soft-foreground)] border-[var(--color-success)]/30",
        warning:     "bg-[var(--color-warning-soft)] text-[var(--color-warning-soft-foreground)] border-[var(--color-warning)]/30",
        destructive: "bg-[var(--color-error-soft)] text-[var(--color-error-soft-foreground)] border-[var(--color-error)]/30",
      },
    },
    defaultVariants: { variant: "default" },
  },
)

export interface StatBadgeProps extends VariantProps<typeof statBadgeVariants> {
  /** The count/value shown first, bolded. */
  value: number | string
  label: string
  className?: string
}

export function StatBadge({ value, label, variant, className }: StatBadgeProps) {
  return (
    <span className={cn(statBadgeVariants({ variant }), className)}>
      <span className="font-semibold">{value}</span>
      <span>{label}</span>
    </span>
  )
}
