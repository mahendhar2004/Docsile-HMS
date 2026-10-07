/**
 * date-time/date-navigator.tsx
 *
 * DateNavigator — prev/today/next date flipper used in main's queue-style
 * toolbars (Patients OPD, Labs pending, etc.), matching main's DateNavigator
 * exactly (src/components/layout/header.tsx). Distinct from DatePicker (a
 * calendar-popover for arbitrary single-date selection elsewhere in this
 * app) — main itself uses two different controls for these two different
 * jobs, and this app should too.
 *
 * The native <input type="date"> is stacked invisibly over the trigger
 * button (main's own trick) so clicking anywhere on the button opens the
 * platform's native date picker via showPicker(), while the visible label
 * stays fully custom-styled.
 */

import { useId } from "react"
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react"

export interface DateNavigatorProps {
  /** ISO date string (YYYY-MM-DD). */
  date: string
  onDateChange: (date: string) => void
  onPrev: () => void
  onNext: () => void
  onToday?: () => void
  isToday?: boolean
  className?: string
}

export function DateNavigator({
  date,
  onDateChange,
  onPrev,
  onNext,
  onToday,
  isToday,
  className = "",
}: DateNavigatorProps) {
  const inputId = useId()

  let formatted = date
  try {
    const d = new Date(date + "T00:00:00")
    formatted = d.toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  } catch {
    // Keep the raw string on parse failure.
  }

  return (
    <div className={["flex items-center gap-1.5", className].join(" ")}>
      <button
        type="button"
        onClick={onPrev}
        aria-label="Previous day"
        className="h-8 w-8 flex items-center justify-center rounded-lg border border-border/60 bg-white hover:bg-muted/60 transition-colors text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
      </button>

      <div className="relative">
        <button
          type="button"
          aria-label="Choose date"
          className="h-8 px-3 flex items-center gap-2 rounded-lg border border-border/60 bg-white hover:bg-muted/40 transition-colors text-sm font-medium text-foreground"
          onClick={() => {
            const input = document.getElementById(inputId) as HTMLInputElement | null
            input?.showPicker?.()
          }}
        >
          <Calendar className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
          <span>{formatted}</span>
        </button>
        <input
          id={inputId}
          type="date"
          value={date}
          onChange={(e) => onDateChange(e.target.value)}
          className="absolute inset-0 opacity-0 cursor-pointer"
          tabIndex={-1}
          aria-hidden="true"
        />
      </div>

      <button
        type="button"
        onClick={onNext}
        aria-label="Next day"
        className="h-8 w-8 flex items-center justify-center rounded-lg border border-border/60 bg-white hover:bg-muted/60 transition-colors text-muted-foreground hover:text-foreground"
      >
        <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
      </button>

      {onToday && !isToday && (
        <button
          type="button"
          onClick={onToday}
          className="h-8 px-2.5 rounded-lg text-xs font-semibold text-primary hover:bg-primary/5 transition-colors"
        >
          Today
        </button>
      )}
    </div>
  )
}
