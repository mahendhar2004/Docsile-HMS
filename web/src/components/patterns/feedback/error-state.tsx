/**
 * patterns/feedback/error-state.tsx
 *
 * ErrorState — used when a data fetch fails or an unexpected error occurs.
 *
 * Always announces the error via `role="alert"` so screen readers pick it up
 * immediately. Provides a "Try again" button when `onRetry` is supplied.
 *
 * Props:
 *   title       — headline; defaults to "Something went wrong"
 *   description — error detail or human-readable message (auto-extracted from
 *                 Error instances; strings used as-is; fallback for unknown types)
 *   error       — raw Error/string/unknown from the catch block (alternative to
 *                 providing `description` manually — one of the two should be set)
 *   onRetry     — optional retry callback; renders a "Try again" button
 *   className   — forwarded to the root div
 *
 * Usage:
 *   <ErrorState error={queryError} onRetry={refetch} />
 *
 *   <ErrorState
 *     title="Could not load patients"
 *     description="The server returned an unexpected response."
 *     onRetry={refetch}
 *   />
 */

import * as React from "react"
import { OctagonX } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

/* ─── Helpers ───────────────────────────────────────────────────────────────── */

function extractMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === "string" && error.length > 0) return error
  return "An unexpected error occurred. Please try again."
}

/* ─── Types ─────────────────────────────────────────────────────────────────── */

export interface ErrorStateProps {
  /** Headline shown above the description. Default: "Something went wrong" */
  title?: string
  /**
   * Human-readable error message to display.
   * If omitted, `error` is used as the source and message is auto-extracted.
   */
  description?: string
  /**
   * Raw error value from a catch block or TanStack Query's `error` field.
   * Ignored when `description` is provided explicitly.
   */
  error?: unknown
  /** Renders a "Try again" button when provided */
  onRetry?: () => void
  className?: string
}

/* ─── Component ─────────────────────────────────────────────────────────────── */

const ErrorState = React.forwardRef<HTMLDivElement, ErrorStateProps>(
  (
    {
      title = "Something went wrong",
      description,
      error,
      onRetry,
      className,
    },
    ref
  ) => {
    const message = description ?? extractMessage(error)

    return (
      <div
        ref={ref}
        role="alert"
        aria-live="assertive"
        className={cn(
          "flex flex-col items-center justify-center py-16 px-6 text-center",
          "select-none",
          className
        )}
      >
        {/* Error icon badge */}
        <span
          aria-hidden="true"
          className={cn(
            "flex items-center justify-center mb-4",
            "h-14 w-14 rounded-[var(--radius-xl)]",
            "bg-[var(--color-error-soft)]"
          )}
        >
          <OctagonX
            size={24}
            className="text-[var(--color-error-soft-foreground)]"
            strokeWidth={2}
          />
        </span>

        <h3
          className={cn(
            "text-[length:var(--text-subtitle)] font-semibold",
            "text-[var(--color-foreground)] leading-[var(--leading-tight)] mb-1.5"
          )}
        >
          {title}
        </h3>

        <p
          className={cn(
            "text-[length:var(--text-body)]",
            "text-[var(--color-muted-foreground)] leading-[var(--leading-normal)]",
            "max-w-xs"
          )}
        >
          {message}
        </p>

        {onRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="mt-5"
          >
            Try again
          </Button>
        )}
      </div>
    )
  }
)
ErrorState.displayName = "ErrorState"

export { ErrorState }
