import * as React from "react"
import { cn } from "@/lib/utils"

export type CurrencyInputSize = "sm" | "md" | "lg"

export interface CurrencyInputProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    "value" | "onChange" | "size" | "type"
  > {
  size?: CurrencyInputSize
  /** Controlled numeric value */
  value?: number
  /** Called with the new numeric value on every valid change */
  onChange?: (value: number) => void
  hasError?: boolean
}

const sizeClasses: Record<CurrencyInputSize, { wrapper: string; prefix: string }> = {
  sm: { wrapper: "h-8 text-xs", prefix: "h-8 text-xs" },
  md: { wrapper: "h-9 text-sm", prefix: "h-9 text-sm" },
  lg: { wrapper: "h-11 text-base", prefix: "h-11 text-base" },
}

function toINR(n: number): string {
  return n.toLocaleString("en-IN")
}

const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  (
    {
      size = "md",
      value,
      onChange,
      hasError,
      disabled,
      placeholder = "0",
      className,
      onFocus,
      onBlur,
      id,
      ...props
    },
    ref
  ) => {
    const [focused, setFocused] = React.useState(false)
    // Raw text while editing — needed so the user can type freely (e.g. delete digits)
    const [draft, setDraft] = React.useState("")

    // When focus enters: expose raw number string for editing
    function handleFocus(e: React.FocusEvent<HTMLInputElement>) {
      setDraft(value !== undefined && value !== 0 ? String(value) : "")
      setFocused(true)
      onFocus?.(e)
    }

    // When focus leaves: commit and format
    function handleBlur(e: React.FocusEvent<HTMLInputElement>) {
      setFocused(false)
      onBlur?.(e)
    }

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
      // Strip anything that's not a digit or decimal point
      const raw = e.target.value.replace(/[^0-9.]/g, "")
      setDraft(raw)
      const parsed = parseFloat(raw)
      if (!isNaN(parsed)) onChange?.(parsed)
      else if (raw === "") onChange?.(0)
    }

    // Display: raw draft while focused, formatted while blurred
    const displayValue = focused
      ? draft
      : value !== undefined && value !== 0
      ? toINR(value)
      : ""

    const { wrapper, prefix } = sizeClasses[size]

    return (
      <div
        className={cn(
          "flex items-center w-full border rounded-[--radius-sm] bg-surface",
          hasError
            ? "border-error focus-within:ring-2 focus-within:ring-error"
            : "border-border focus-within:ring-2 focus-within:ring-ring focus-within:border-ring",
          disabled && "opacity-50 cursor-not-allowed bg-muted",
          wrapper,
          className
        )}
      >
        {/* ₹ prefix */}
        <span
          className={cn(
            "flex items-center justify-center px-3 border-r border-border",
            "text-muted-foreground font-medium shrink-0 self-stretch",
            prefix
          )}
          aria-hidden="true"
        >
          ₹
        </span>

        <input
          ref={ref}
          id={id}
          type="text"
          inputMode="decimal"
          value={displayValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          disabled={disabled}
          placeholder={placeholder}
          aria-invalid={hasError ? true : undefined}
          className={cn(
            "flex-1 bg-transparent outline-none px-3 min-w-0 h-full",
            "text-foreground placeholder:text-muted-foreground",
            "disabled:cursor-not-allowed"
          )}
          {...props}
        />
      </div>
    )
  }
)
CurrencyInput.displayName = "CurrencyInput"

export { CurrencyInput }
