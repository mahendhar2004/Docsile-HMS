/**
 * patterns/status/filter-chip.tsx
 *
 * FilterChip: a toggleable pill for horizontal filter bars. Renders two
 * visual states — default (unselected) and selected (primary-tinted) — and
 * emits an `onToggle` callback when clicked.
 *
 * This is a controlled component: the parent owns `selected` state.
 *
 * Usage:
 *   <FilterChip label="OPD" selected={filter === "OPD"} onToggle={() => setFilter("OPD")} />
 *
 * For a row of chips with a divider between them, just lay them out in a flex
 * container with a gap — the `.filter-divider` CSS class from index.css can
 * be used as a separator span between groups.
 */

import * as React from "react"
import { cn } from "@/lib/utils"

export interface FilterChipProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children" | "onClick"> {
  /** The label rendered inside the chip */
  label: string
  /** Whether the chip is currently selected / active */
  selected?: boolean
  /** Called when the chip is clicked — parent flips selected state */
  onToggle: () => void
  /** Show a count badge alongside the label */
  count?: number
}

const FilterChip = React.forwardRef<HTMLButtonElement, FilterChipProps>(
  ({ label, selected = false, onToggle, count, className, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        role="checkbox"
        aria-checked={selected}
        aria-label={count !== undefined ? `${label} (${count})` : label}
        disabled={disabled}
        onClick={onToggle}
        className={cn(
          // Layout
          "inline-flex items-center gap-1.5 rounded-[--radius-full]",
          // Size & typography
          "h-7 px-3 text-xs font-medium leading-none whitespace-nowrap",
          // Motion
          "motion-interactive",
          // Focus
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-[--color-ring] focus-visible:ring-offset-1",
          // Disabled
          "disabled:pointer-events-none disabled:opacity-50",
          // Default (unselected) state
          !selected && [
            "border border-[--color-border] bg-[--color-surface]",
            "text-[--color-muted-foreground]",
            "hover:border-[--color-primary] hover:text-[--color-foreground]",
          ],
          // Selected state — primary-tinted
          selected && [
            "border border-transparent",
            "bg-[--color-accent] text-[--color-accent-foreground]",
            "font-semibold",
          ],
          className
        )}
        {...props}
      >
        {label}
        {count !== undefined && (
          <span
            aria-hidden="true"
            className={cn(
              "inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 tabular-nums text-[10px] font-semibold leading-none",
              selected
                ? "bg-[--color-primary] text-[--color-primary-foreground]"
                : "bg-[--color-muted] text-[--color-muted-foreground]"
            )}
          >
            {count}
          </span>
        )}
      </button>
    )
  }
)
FilterChip.displayName = "FilterChip"

export { FilterChip }
