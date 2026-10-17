/**
 * patterns/feedback/alert-banner.tsx
 *
 * AlertBanner — inline banner for page-level or section-level messages.
 *
 * Use for contextual messages that belong to a specific page or section,
 * not for ephemeral toasts (use the Toaster for those). Examples:
 * - "Insurance company has not been set for this claim"
 * - "Pre-auth approved — you may now submit the final bill"
 * - "This patient has an outstanding balance of ₹12,000"
 *
 * Variants map to our soft status-color tokens: info/success/warning/error.
 *
 * Props:
 *   variant     — color intent: "info" | "success" | "warning" | "error"
 *   title       — optional bold label before the description
 *   description — required message body
 *   icon        — optional override icon; a sensible default is provided per variant
 *   showIcon    — whether to show the icon at all (default: true)
 *   onDismiss   — optional dismiss handler; renders an × button when provided
 *   className   — forwarded to the root element
 *
 * Usage:
 *   <AlertBanner
 *     variant="warning"
 *     title="Incomplete claim"
 *     description="Insurance company has not been set. Set it before submitting pre-auth."
 *     onDismiss={() => setDismissed(true)}
 *   />
 */

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import {
  Info,
  CircleCheck,
  TriangleAlert,
  OctagonX,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"

/* ─── Variants ──────────────────────────────────────────────────────────────── */

const bannerVariants = cva(
  [
    "flex items-start gap-3 rounded-[var(--radius)] border px-4 py-3",
    "text-[length:var(--text-body)] leading-[var(--leading-normal)]",
  ].join(" "),
  {
    variants: {
      variant: {
        info: [
          "bg-[var(--color-info-soft)] border-[var(--color-info)]/40",
          "text-[var(--color-info-soft-foreground)]",
        ].join(" "),
        success: [
          "bg-[var(--color-success-soft)] border-[var(--color-success)]/40",
          "text-[var(--color-success-soft-foreground)]",
        ].join(" "),
        warning: [
          "bg-[var(--color-warning-soft)] border-[var(--color-warning)]/40",
          "text-[var(--color-warning-soft-foreground)]",
        ].join(" "),
        error: [
          "bg-[var(--color-error-soft)] border-[var(--color-error)]/40",
          "text-[var(--color-error-soft-foreground)]",
        ].join(" "),
      },
    },
    defaultVariants: {
      variant: "info",
    },
  }
)

/* ─── Default icons per variant ─────────────────────────────────────────────── */

const defaultIcons: Record<
  NonNullable<VariantProps<typeof bannerVariants>["variant"]>,
  React.ReactElement
> = {
  info: <Info size={16} strokeWidth={2} aria-hidden="true" />,
  success: <CircleCheck size={16} strokeWidth={2} aria-hidden="true" />,
  warning: <TriangleAlert size={16} strokeWidth={2} aria-hidden="true" />,
  error: <OctagonX size={16} strokeWidth={2} aria-hidden="true" />,
}

/* ─── Types ─────────────────────────────────────────────────────────────────── */

export interface AlertBannerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof bannerVariants> {
  /** Optional bold label before the description */
  title?: string
  /** Required message body */
  description: React.ReactNode
  /** Override the default variant icon */
  icon?: React.ReactNode
  /** Show the leading icon (default: true) */
  showIcon?: boolean
  /**
   * Dismiss callback — renders an × button when provided.
   * The caller is responsible for hiding the banner after dismiss.
   */
  onDismiss?: () => void
}

/* ─── Component ─────────────────────────────────────────────────────────────── */

const AlertBanner = React.forwardRef<HTMLDivElement, AlertBannerProps>(
  (
    {
      variant = "info",
      title,
      description,
      icon,
      showIcon = true,
      onDismiss,
      className,
      ...props
    },
    ref
  ) => {
    const resolvedIcon = icon ?? defaultIcons[variant ?? "info"]

    return (
      <div
        ref={ref}
        role="alert"
        aria-live="polite"
        className={cn(bannerVariants({ variant }), className)}
        {...props}
      >
        {/* Leading icon */}
        {showIcon && (
          <span
            aria-hidden="true"
            className="shrink-0 mt-0.5"
          >
            {resolvedIcon}
          </span>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          {title && (
            <span className="font-semibold mr-1.5">{title}</span>
          )}
          <span>{description}</span>
        </div>

        {/* Dismiss button */}
        {onDismiss && (
          <button
            type="button"
            aria-label="Dismiss"
            onClick={onDismiss}
            className={cn(
              "shrink-0 -mr-1 mt-0.5",
              "flex items-center justify-center",
              "h-5 w-5 rounded-[var(--radius-xs)]",
              "opacity-60 hover:opacity-100",
              "motion-interactive focus-visible:outline-none",
              "focus-visible:shadow-[0_0_0_3px_rgba(37,99,235,0.35)]"
            )}
          >
            <X size={14} strokeWidth={2} aria-hidden="true" />
          </button>
        )}
      </div>
    )
  }
)
AlertBanner.displayName = "AlertBanner"

export { AlertBanner }
