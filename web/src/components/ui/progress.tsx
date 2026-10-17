/**
 * ui/progress.tsx
 *
 * Linear progress bar — new shared component matching the "Progress" entry
 * in the Docsile HMS design system reference's "Banner · Progress · Stepper"
 * grouping (docs/design-system/). Extracted from the ad hoc
 * `role="progressbar"` + manually-styled track/fill divs already hand-built
 * at a couple of call sites (e.g. pages/staff/roles-tab.tsx) so future ones
 * reuse this instead of recomposing the same markup.
 */

import * as React from "react"
import { cn } from "@/lib/utils"

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 0–100 */
  value: number
  /** Accessible label, e.g. "65% permissions enabled" */
  "aria-label": string
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ value, className, ...props }, ref) => {
    const clamped = Math.max(0, Math.min(100, value))
    return (
      <div
        ref={ref}
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        className={cn(
          "h-1.5 w-full rounded-[var(--radius-full)] bg-[var(--color-muted)] overflow-hidden",
          className
        )}
        {...props}
      >
        <div
          className="h-full rounded-[var(--radius-full)] bg-[var(--color-primary)] transition-all duration-300"
          style={{ width: `${clamped}%` }}
        />
      </div>
    )
  }
)
Progress.displayName = "Progress"

export { Progress }
