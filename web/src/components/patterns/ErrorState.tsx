import { AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface ErrorStateProps {
  /** Error to display. Extracts `message` from Error instances. */
  error: unknown
  /** Retry handler — renders a "Try again" button when provided. */
  onRetry?: () => void
  className?: string
}

function extractMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === "string") return error
  return "An unexpected error occurred. Please try again."
}

/**
 * Tier 2 — ErrorState
 *
 * Canonical error display component. Use this for query errors,
 * load failures, and any caught error that needs visible feedback.
 * Never show raw error text or a spinner on error — always use this.
 *
 * Accessibility: role="alert" ensures screen readers announce the error.
 */
export function ErrorState({ error, onRetry, className }: ErrorStateProps) {
  const message = extractMessage(error)

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        "flex flex-col items-center justify-center py-16 px-6 text-center",
        className,
      )}
    >
      <div className="flex items-center justify-center h-12 w-12 rounded-full bg-destructive/10 mb-4">
        <AlertTriangle
          className="h-6 w-6 text-destructive"
          aria-hidden
        />
      </div>
      <h3 className="text-base font-semibold text-foreground mb-1.5">
        Something went wrong
      </h3>
      <p className="text-sm text-muted-foreground max-w-sm">{message}</p>
      {onRetry && (
        <Button
          onClick={onRetry}
          variant="outline"
          size="sm"
          className="mt-5"
          aria-label="Retry"
        >
          Try again
        </Button>
      )}
    </div>
  )
}
