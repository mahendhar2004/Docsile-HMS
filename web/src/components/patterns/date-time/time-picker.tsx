"use client";

import * as React from "react";
import { Clock, ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export type TimePickerSize = "sm" | "md" | "lg";

/**
 * A time value in 24-hour format.
 * Both fields are 0-based integers: hour 0–23, minute 0–59.
 */
export interface TimeValue {
  hour: number;
  minute: number;
}

export interface TimePickerProps {
  /** The current time value. */
  value?: TimeValue;
  /** Called when the user changes the time. */
  onChange?: (time: TimeValue) => void;
  /** Size variant — matches the sizing of other form inputs. */
  size?: TimePickerSize;
  /** Puts the control into an error state. */
  error?: boolean;
  /** Disables the control. */
  disabled?: boolean;
  /**
   * Minute step.
   * Defaults to 15 (hospital appointment scheduling standard).
   * Pass 1 for free-form minute selection.
   */
  minuteStep?: number;
  /** Additional className applied to the root element. */
  className?: string;
  /** Accessible label for the control group. */
  "aria-label"?: string;
  /** ID attribute on the root element. */
  id?: string;
}

// ─── Size map ─────────────────────────────────────────────────────────────────

interface SizeTokens {
  root: string;
  segment: string;
  colon: string;
  chevron: string;
  icon: string;
}

const sizeTokens: Record<TimePickerSize, SizeTokens> = {
  sm: {
    root: "h-8 gap-0.5 px-2 text-xs",
    segment: "w-7",
    colon: "text-xs",
    chevron: "size-2.5",
    icon: "size-3",
  },
  md: {
    root: "h-10 gap-1 px-3 text-sm",
    segment: "w-8",
    colon: "text-sm",
    chevron: "size-3",
    icon: "size-3.5",
  },
  lg: {
    root: "h-11 gap-1.5 px-3.5 text-base",
    segment: "w-9",
    colon: "text-base",
    chevron: "size-3.5",
    icon: "size-4",
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function clampHour(h: number): number {
  return ((h % 24) + 24) % 24;
}

function clampMinute(m: number, step: number): number {
  const total = 60 / step;
  return ((Math.round(m / step) % total) + total) % total * step;
}

// ─── Stepper Segment ─────────────────────────────────────────────────────────

interface StepperSegmentProps {
  value: number;
  displayValue: string;
  onIncrement: () => void;
  onDecrement: () => void;
  onDirectInput: (raw: string) => void;
  label: string;
  min: number;
  max: number;
  disabled: boolean;
  size: TimePickerSize;
  "aria-label": string;
}

function StepperSegment({
  displayValue,
  onIncrement,
  onDecrement,
  onDirectInput,
  label,
  min,
  max,
  disabled,
  size,
  "aria-label": ariaLabel,
}: StepperSegmentProps) {
  const tokens = sizeTokens[size];
  const inputRef = React.useRef<HTMLInputElement>(null);
  // Buffer accumulates digits typed rapidly, e.g. "1" then "4" → "14"
  const bufferRef = React.useRef<string>("");
  const bufferTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  function flushBuffer() {
    const parsed = parseInt(bufferRef.current, 10);
    if (!isNaN(parsed)) onDirectInput(bufferRef.current);
    bufferRef.current = "";
    bufferTimerRef.current = null;
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowUp") { e.preventDefault(); onIncrement(); }
    else if (e.key === "ArrowDown") { e.preventDefault(); onDecrement(); }
    else if (/^\d$/.test(e.key)) {
      e.preventDefault();
      bufferRef.current += e.key;
      if (bufferTimerRef.current) clearTimeout(bufferTimerRef.current);
      // Flush on two digits or after 800ms of idle
      if (bufferRef.current.length >= 2) {
        flushBuffer();
      } else {
        bufferTimerRef.current = setTimeout(flushBuffer, 800);
      }
    }
  }

  React.useEffect(() => {
    return () => {
      if (bufferTimerRef.current) clearTimeout(bufferTimerRef.current);
    };
  }, []);

  return (
    <div className="flex flex-col items-center" role="group" aria-label={label}>
      {/* Up chevron */}
      <button
        type="button"
        tabIndex={-1}
        aria-label={`Increment ${label}`}
        disabled={disabled}
        onClick={onIncrement}
        className={cn(
          "flex items-center justify-center rounded-sm",
          "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]",
          "hover:bg-[var(--color-muted)]",
          "transition-colors duration-[var(--duration-micro)]",
          "disabled:opacity-40 disabled:pointer-events-none",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-ring)]"
        )}
      >
        <ChevronUp className={tokens.chevron} aria-hidden="true" />
      </button>

      {/* Numeric input — read-only display but supports keyboard entry */}
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        aria-label={ariaLabel}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={parseInt(displayValue, 10)}
        aria-valuetext={displayValue}
        readOnly
        value={displayValue}
        disabled={disabled}
        onKeyDown={handleKeyDown}
        className={cn(
          tokens.segment,
          "text-center font-mono font-medium bg-transparent border-0 outline-none",
          "caret-transparent cursor-default select-none",
          "text-[var(--color-foreground)]",
          "focus:bg-[var(--color-accent)] focus:rounded-sm",
          "disabled:opacity-40 disabled:cursor-not-allowed"
        )}
      />

      {/* Down chevron */}
      <button
        type="button"
        tabIndex={-1}
        aria-label={`Decrement ${label}`}
        disabled={disabled}
        onClick={onDecrement}
        className={cn(
          "flex items-center justify-center rounded-sm",
          "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]",
          "hover:bg-[var(--color-muted)]",
          "transition-colors duration-[var(--duration-micro)]",
          "disabled:opacity-40 disabled:pointer-events-none",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-ring)]"
        )}
      >
        <ChevronDown className={tokens.chevron} aria-hidden="true" />
      </button>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * TimePicker
 *
 * Inline time selection control optimised for hospital appointment scheduling.
 * Shows hour (00–23) and minute steppers with configurable step (default 15 min).
 * Up/down arrows and keyboard arrow keys navigate; typing digits also works.
 *
 * Does NOT use react-day-picker (date-only library) — this is a pure time control.
 */
export function TimePicker({
  value,
  onChange,
  size = "md",
  error = false,
  disabled = false,
  minuteStep = 15,
  className,
  "aria-label": ariaLabel = "Time picker",
  id,
}: TimePickerProps) {
  const tokens = sizeTokens[size];

  // Uncontrolled default: 08:00
  const hour = value?.hour ?? 8;
  const minute = value?.minute ?? 0;

  function emit(h: number, m: number) {
    onChange?.({ hour: h, minute: m });
  }

  // Hour handlers
  function incrementHour() { emit(clampHour(hour + 1), minute); }
  function decrementHour() { emit(clampHour(hour - 1), minute); }
  function handleHourInput(raw: string) {
    const parsed = parseInt(raw, 10);
    if (!isNaN(parsed) && parsed >= 0 && parsed <= 23) emit(parsed, minute);
  }

  // Minute handlers
  function incrementMinute() {
    emit(hour, clampMinute(minute + minuteStep, minuteStep));
  }
  function decrementMinute() {
    emit(hour, clampMinute(minute - minuteStep, minuteStep));
  }
  function handleMinuteInput(raw: string) {
    const parsed = parseInt(raw, 10);
    if (!isNaN(parsed) && parsed >= 0 && parsed <= 59) {
      // Snap to nearest step
      const snapped = Math.round(parsed / minuteStep) * minuteStep;
      emit(hour, Math.min(snapped, 59));
    }
  }

  return (
    <div
      id={id}
      role="group"
      aria-label={ariaLabel}
      aria-disabled={disabled || undefined}
      className={cn(
        "inline-flex items-center",
        "rounded-[var(--radius)] border bg-[var(--color-surface)]",
        "transition-colors duration-[var(--duration-micro)]",
        "focus-within:ring-2 focus-within:ring-[var(--color-ring)]",
        error
          ? "border-[var(--color-error)] focus-within:ring-[var(--color-error)]"
          : "border-[var(--color-border)]",
        disabled && "opacity-50 cursor-not-allowed",
        tokens.root,
        className
      )}
    >
      {/* Clock icon */}
      <Clock
        className={cn(
          tokens.icon,
          "shrink-0 mr-1",
          "text-[var(--color-muted-foreground)]"
        )}
        aria-hidden="true"
      />

      {/* Hour stepper */}
      <StepperSegment
        value={hour}
        displayValue={pad(hour)}
        onIncrement={incrementHour}
        onDecrement={decrementHour}
        onDirectInput={handleHourInput}
        label="Hour"
        min={0}
        max={23}
        disabled={disabled}
        size={size}
        aria-label="Hour (0–23)"
      />

      {/* Colon separator */}
      <span
        className={cn(
          tokens.colon,
          "font-mono font-medium leading-none select-none",
          "text-[var(--color-muted-foreground)] px-0.5"
        )}
        aria-hidden="true"
      >
        :
      </span>

      {/* Minute stepper */}
      <StepperSegment
        value={minute}
        displayValue={pad(minute)}
        onIncrement={incrementMinute}
        onDecrement={decrementMinute}
        onDirectInput={handleMinuteInput}
        label="Minute"
        min={0}
        max={59}
        disabled={disabled}
        size={size}
        aria-label="Minute (00–59)"
      />

      {/* 24 h label — clinic/hospital convention */}
      <span
        className={cn(
          "ml-1.5 text-[0.625rem] font-medium leading-none",
          "text-[var(--color-muted-foreground)] select-none self-end mb-1"
        )}
        aria-hidden="true"
      >
        24 h
      </span>
    </div>
  );
}
