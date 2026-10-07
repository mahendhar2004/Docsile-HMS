/**
 * patterns/status/stat-badge.tsx
 *
 * StatBadge — small header pill showing a value + label, matching main's
 * StatBadge exactly (src/components/layout/header.tsx) — used for the
 * at-a-glance counters atop Pharmacy/Optical/Labs/Insurance/In-Patients/
 * Doctor/Workup (e.g. "3 Low Stock", "12 Admitted").
 *
 * Usage:
 *   <StatBadge value={12} label="Admitted" variant="info" />
 *   <StatBadge value={3} label="Low Stock" variant="warning" />
 */

import { cn } from "@/lib/utils"

const VARIANT_CLASSES = {
  default: "bg-muted/60 text-foreground border-border/40",
  info: "bg-primary/5 text-primary border-primary/15",
  success: "bg-success/5 text-green-700 border-success/15",
  warning: "bg-warning/5 text-amber-700 border-warning/15",
  destructive: "bg-destructive/5 text-red-700 border-destructive/15",
} as const

export type StatBadgeVariant = keyof typeof VARIANT_CLASSES

export interface StatBadgeProps {
  /** The count/value shown first, bolded. */
  value: number | string
  label: string
  variant?: StatBadgeVariant
  className?: string
}

export function StatBadge({ value, label, variant = "default", className }: StatBadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm",
        VARIANT_CLASSES[variant],
        className,
      )}
    >
      <span className="font-bold tabular-nums">{value}</span>
      <span className="font-normal opacity-80">{label}</span>
    </div>
  )
}
