/**
 * patterns/feedback/empty-state.tsx
 *
 * EmptyState — used when a list, table, or query returns zero results.
 *
 * Always shows a heading and optional description that explain what is empty
 * and why. The optional action button gives the user a next step (e.g.
 * "Register first patient").
 *
 * Props:
 *   icon        — optional icon or illustration node; rendered at 48px above the heading
 *   title       — required; names what is empty ("No patients found")
 *   description — optional; explains why / what to do next
 *   action      — optional; { label, onClick } — renders a primary Button
 *   className   — forwarded to the root div
 *
 * Usage:
 *   <EmptyState
 *     icon={<Users size={48} />}
 *     title="No patients today"
 *     description="New patients registered today will appear here."
 *     action={{ label: "Register patient", onClick: openRegistration }}
 *   />
 */

import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

/* ─── Types ─────────────────────────────────────────────────────────────────── */

export interface EmptyStateAction {
  label: string
  onClick: () => void
  /** Defaults to "primary" */
  variant?: "primary" | "outline" | "secondary"
}

export interface EmptyStateProps {
  /** Icon or illustration rendered above the title. Lucide icons recommended at size={48}. */
  icon?: React.ReactNode
  /** Short, specific name of what is empty. E.g. "No patients found" */
  title: string
  /** Additional context — explains why it's empty or what the user can do. */
  description?: string
  /** Optional primary call-to-action. */
  action?: EmptyStateAction
  className?: string
}

/* ─── Component ─────────────────────────────────────────────────────────────── */

const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ icon, title, description, action, className }, ref) => {
    const variantMap: Record<
      NonNullable<EmptyStateAction["variant"]>,
      React.ComponentProps<typeof Button>["variant"]
    > = {
      primary: "primary",
      outline: "outline",
      secondary: "secondary",
    }

    return (
      <div
        ref={ref}
        role="status"
        aria-label={title}
        className={cn(
          "flex flex-col items-center justify-center py-16 px-6 text-center",
          "select-none",
          className
        )}
      >
        {icon && (
          <span
            aria-hidden="true"
            className={cn(
              "mb-4 flex items-center justify-center",
              "h-16 w-16 rounded-[--radius-xl]",
              "bg-[--color-muted] text-[--color-muted-foreground]"
            )}
          >
            {icon}
          </span>
        )}

        <h3
          className={cn(
            "text-[length:var(--text-subtitle)] font-semibold",
            "text-[--color-foreground] leading-[--leading-tight] mb-1.5"
          )}
        >
          {title}
        </h3>

        {description && (
          <p
            className={cn(
              "text-[length:var(--text-body)]",
              "text-[--color-muted-foreground] leading-[--leading-normal]",
              "max-w-xs"
            )}
          >
            {description}
          </p>
        )}

        {action && (
          <Button
            variant={variantMap[action.variant ?? "primary"]}
            size="sm"
            onClick={action.onClick}
            className="mt-5"
          >
            {action.label}
          </Button>
        )}
      </div>
    )
  }
)
EmptyState.displayName = "EmptyState"

export { EmptyState }
