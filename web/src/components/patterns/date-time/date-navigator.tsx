/**
 * date-time/date-navigator.tsx
 *
 * DateNavigator — prev/today/next date flipper used in main's queue-style
 * toolbars (Patients OPD, Labs pending, etc.).
 *
 * Main's own implementation stacks a native <input type="date"> invisibly
 * over the trigger button and calls showPicker() on click — faithfully
 * copied here originally, but that native-popup trick turned out unreliable
 * in practice (clicking the pill silently did nothing instead of opening a
 * picker). Replaced with the same Popover+DayPicker calendar this app's
 * DatePicker component uses elsewhere — fully custom-rendered, no native
 * platform widget involved, so it opens reliably and looks consistent with
 * every other date control in the app.
 */

import { useState } from "react"
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react"
import { DayPicker } from "react-day-picker"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { calendarClassNames } from "./date-picker"
import { toLocalDateISO } from "@/lib/utils"

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

function parseISODate(s: string): Date | undefined {
  const [y, m, d] = s.split("-").map(Number)
  if (!y || !m || !d) return undefined
  return new Date(y, m - 1, d)
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
  const [open, setOpen] = useState(false)

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

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label="Choose date"
            className="h-8 px-3 flex items-center gap-2 rounded-lg border border-border/60 bg-white hover:bg-muted/40 transition-colors text-sm font-medium text-foreground"
          >
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
            <span>{formatted}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start" sideOffset={6}>
          <DayPicker
            mode="single"
            selected={parseISODate(date)}
            onSelect={(d) => {
              if (!d) return
              onDateChange(toLocalDateISO(d))
              setOpen(false)
            }}
            classNames={calendarClassNames}
            showOutsideDays
          />
        </PopoverContent>
      </Popover>

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
