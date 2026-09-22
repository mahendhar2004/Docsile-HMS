import React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface EmptyStateProps {
  /** Icon or illustration to display above the heading. */
  icon?: React.ReactNode
  heading: string
  description?: string
  /** Optional primary call-to-action. */
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

/**
 * Tier 2 — EmptyState
 *
 * Canonical empty-state display component. Use this whenever a list, table,
 * or query returns no results. Never render ad hoc "no data" text inline
 * inside module components — use this component instead.
 *
 * Always includes:
 * - A heading that names what is empty
 * - An optional description that explains why and what to do
 * - An optional action button (e.g. "Add your first patient")
 */
export function EmptyState({
  icon,
  heading,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-16 px-6 text-center",
        className,
      )}
      role="status"
      aria-label={heading}
    >
      {icon && (
        <div className="mb-4 text-muted-foreground/40" aria-hidden>
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold text-foreground mb-1.5">
        {heading}
      </h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-sm">{description}</p>
      )}
      {action && (
        <Button
          onClick={action.onClick}
          size="sm"
          className="mt-5"
          aria-label={action.label}
        >
          {action.label}
        </Button>
      )}
    </div>
  )
}
