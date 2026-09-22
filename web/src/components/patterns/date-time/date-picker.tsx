"use client";

import * as React from "react";
import { DayPicker } from "react-day-picker";
import { format } from "date-fns";
import { CalendarIcon, X } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export type DatePickerSize = "sm" | "md" | "lg";

export interface DatePickerProps {
  /** The currently selected date. */
  value?: Date;
  /** Called when the user selects or clears a date. */
  onChange?: (date: Date | undefined) => void;
  /** Placeholder shown when no date is selected. */
  placeholder?: string;
  /** Size variant — matches the sizing of other form inputs. */
  size?: DatePickerSize;
  /** Puts the trigger into an error state. */
  error?: boolean;
  /** Disables the entire control. */
  disabled?: boolean;
  /** Earliest selectable date. */
  fromDate?: Date;
  /** Latest selectable date. */
  toDate?: Date;
  /** Additional className for the trigger wrapper. */
  className?: string;
  /** Accessible label for the trigger button. */
  "aria-label"?: string;
  /** ID of an element that describes this picker (for aria-describedby). */
  "aria-describedby"?: string;
  /** ID attribute forwarded to the trigger button. */
  id?: string;
}

// ─── Size map ─────────────────────────────────────────────────────────────────

const triggerSizeClasses: Record<DatePickerSize, string> = {
  sm: "h-8 px-2.5 text-xs gap-1.5",
  md: "h-10 px-3 text-sm gap-2",
  lg: "h-11 px-3.5 text-base gap-2",
};

const iconSizeClasses: Record<DatePickerSize, string> = {
  sm: "size-3.5",
  md: "size-4",
  lg: "size-4",
};

// ─── Calendar classNames — maps react-day-picker v10 UI keys to Tailwind ─────

const calendarClassNames = {
  root: "p-3 select-none",
  months: "flex gap-4",
  month: "space-y-3",
  month_caption: "flex items-center justify-between px-1 pb-1",
  caption_label: "text-sm font-semibold text-[var(--color-foreground)]",
  nav: "flex items-center gap-1",
  button_previous: [
    "inline-flex items-center justify-center",
    "size-7 rounded-[var(--radius-sm)]",
    "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]",
    "hover:bg-[var(--color-muted)]",
    "transition-colors duration-[var(--duration-micro)]",
    "disabled:opacity-40 disabled:pointer-events-none",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]",
  ].join(" "),
  button_next: [
    "inline-flex items-center justify-center",
    "size-7 rounded-[var(--radius-sm)]",
    "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]",
    "hover:bg-[var(--color-muted)]",
    "transition-colors duration-[var(--duration-micro)]",
    "disabled:opacity-40 disabled:pointer-events-none",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]",
  ].join(" "),
  month_grid: "w-full border-collapse",
  weekdays: "flex",
  weekday:
    "w-9 text-center text-[0.7rem] font-medium text-[var(--color-muted-foreground)] pb-1",
  weeks: "space-y-0.5",
  week: "flex",
  day: [
    "relative w-9 h-9 text-center",
    // range states
    "data-[selected=true]:bg-transparent",
  ].join(" "),
  day_button: [
    "inline-flex items-center justify-center",
    "w-9 h-9 rounded-[var(--radius-sm)] text-sm",
    "font-normal text-[var(--color-foreground)]",
    "transition-colors duration-[var(--duration-micro)]",
    "hover:bg-[var(--color-accent)] hover:text-[var(--color-accent-foreground)]",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]",
    "disabled:opacity-40 disabled:pointer-events-none disabled:cursor-not-allowed",
  ].join(" "),
  today: "font-semibold text-[var(--color-primary)]",
  selected:
    "bg-[var(--color-primary)] text-[var(--color-primary-foreground)] rounded-[var(--radius-sm)] hover:bg-[var(--color-primary)]",
  outside: "opacity-30 pointer-events-none",
  disabled: "opacity-30 pointer-events-none",
  hidden: "invisible",
  focused: "ring-2 ring-[var(--color-ring)]",
};

// ─── Component ────────────────────────────────────────────────────────────────

export function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  size = "md",
  error = false,
  disabled = false,
  fromDate,
  toDate,
  className,
  "aria-label": ariaLabel,
  "aria-describedby": ariaDescribedBy,
  id,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);

  const formatted = value ? format(value, "dd MMM yyyy") : null;

  function handleSelect(date: Date | undefined) {
    onChange?.(date);
    if (date) setOpen(false);
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange?.(undefined);
  }

  return (
    <Popover open={open} onOpenChange={disabled ? undefined : setOpen}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-label={ariaLabel ?? (formatted ?? placeholder)}
          aria-describedby={ariaDescribedBy}
          aria-invalid={error || undefined}
          disabled={disabled}
          className={cn(
            // Base layout
            "relative inline-flex w-full items-center justify-between",
            "rounded-[var(--radius)] border bg-[var(--color-surface)]",
            "font-[var(--font-sans)] leading-none",
            "transition-colors duration-[var(--duration-micro)]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]",
            "disabled:cursor-not-allowed disabled:opacity-50",
            // Border color
            error
              ? "border-[var(--color-error)] focus-visible:ring-[var(--color-error)]"
              : "border-[var(--color-border)] hover:border-[var(--color-ring)]/40",
            // Open state ring
            open && !error && "ring-2 ring-[var(--color-ring)] border-[var(--color-ring)]",
            // Size
            triggerSizeClasses[size],
            className
          )}
        >
          <span className="flex items-center gap-[inherit] truncate">
            <CalendarIcon
              className={cn(
                iconSizeClasses[size],
                "shrink-0",
                formatted
                  ? "text-[var(--color-foreground)]"
                  : "text-[var(--color-muted-foreground)]"
              )}
              aria-hidden="true"
            />
            <span
              className={cn(
                "truncate",
                !formatted && "text-[var(--color-muted-foreground)]"
              )}
            >
              {formatted ?? placeholder}
            </span>
          </span>

          {formatted && !disabled && (
            <span
              role="button"
              aria-label="Clear date"
              tabIndex={0}
              onClick={handleClear}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onChange?.(undefined);
                }
              }}
              className={cn(
                "ml-1 shrink-0 rounded-sm p-0.5",
                "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]",
                "hover:bg-[var(--color-muted)]",
                "transition-colors duration-[var(--duration-micro)]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
              )}
            >
              <X className={cn(iconSizeClasses[size])} aria-hidden="true" />
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        className={cn(
          "w-auto p-0",
          "motion-dialog-in",
          "shadow-[--shadow-popover]",
          "rounded-[--radius-lg]",
          "overflow-hidden"
        )}
        align="start"
        sideOffset={6}
      >
        <DayPicker
          mode="single"
          selected={value}
          onSelect={handleSelect}
          disabled={[
            ...(fromDate ? [{ before: fromDate }] : []),
            ...(toDate ? [{ after: toDate }] : []),
          ]}
          classNames={calendarClassNames}
          showOutsideDays
        />
      </PopoverContent>
    </Popover>
  );
}
