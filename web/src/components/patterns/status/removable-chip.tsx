/**
 * patterns/status/removable-chip.tsx
 *
 * RemovableChip: a small pill with a dismiss ("×") button. Used inside
 * MultiSelect to show currently-selected values. Can also be used standalone
 * in tag inputs or active-filter summaries.
 *
 * Usage:
 *   <RemovableChip label="Admitted" onRemove={() => remove("ADMITTED")} />
 */

import * as React from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

export interface RemovableChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** The text shown inside the chip */
  label: string
  /** Called when the × button is clicked (or keyboard-activated) */
  onRemove: () => void
  /** Disable interaction — chip is shown but cannot be removed */
  disabled?: boolean
  size?: "sm" | "md"
}

const RemovableChip = React.forwardRef<HTMLSpanElement, RemovableChipProps>(
  ({ label, onRemove, disabled = false, size = "md", className, ...props }, ref) => {
    const sizeClasses = {
      sm: {
        chip: "h-5 gap-0.5 pl-2 pr-1 text-[10px]",
        icon: "h-3 w-3",
        btn: "h-4 w-4",
      },
      md: {
        chip: "h-6 gap-1 pl-2.5 pr-1 text-xs",
        icon: "h-3.5 w-3.5",
        btn: "h-5 w-5",
      },
    }[size]

    return (
      <span
        ref={ref}
        className={cn(
          // Layout & shape
          "inline-flex items-center rounded-[var(--radius-full)]",
          // Surface — uses secondary/muted palette so chips don't compete
          // with primary content; the × button is the only interaction affordance
          "bg-[var(--color-secondary)] text-[var(--color-secondary-foreground)]",
          "shadow-[var(--shadow-border)]",
          // Typography
          "font-medium leading-none whitespace-nowrap select-none",
          // Disabled
          disabled && "pointer-events-none opacity-50",
          sizeClasses.chip,
          className
        )}
        {...props}
      >
        <span className="truncate max-w-[120px]">{label}</span>
        <button
          type="button"
          onClick={disabled ? undefined : onRemove}
          onKeyDown={(e) => {
            if (!disabled && (e.key === "Enter" || e.key === " ")) {
              e.preventDefault()
              onRemove()
            }
          }}
          disabled={disabled}
          aria-label={`Remove ${label}`}
          className={cn(
            // Layout
            "inline-flex items-center justify-center shrink-0 rounded-full",
            // Color
            "text-[var(--color-muted-foreground)]",
            // Hover
            "hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]",
            // Motion
            "motion-interactive",
            // Focus
            "focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-ring)]",
            sizeClasses.btn
          )}
        >
          <X className={sizeClasses.icon} aria-hidden="true" />
        </button>
      </span>
    )
  }
)
RemovableChip.displayName = "RemovableChip"

export { RemovableChip }
