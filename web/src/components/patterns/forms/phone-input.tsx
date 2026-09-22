import * as React from "react"
import { cn } from "@/lib/utils"

export type PhoneInputSize = "sm" | "md" | "lg"

export interface PhoneInputProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    "value" | "onChange" | "size" | "type"
  > {
  size?: PhoneInputSize
  /** 10-digit string (no country code) */
  value?: string
  /** Called with the clean 10-digit string on every change */
  onChange?: (value: string) => void
  hasError?: boolean
}

const sizeClasses: Record<PhoneInputSize, { wrapper: string; prefix: string }> = {
  sm: { wrapper: "h-8 text-xs", prefix: "h-8 text-xs" },
  md: { wrapper: "h-9 text-sm", prefix: "h-9 text-sm" },
  lg: { wrapper: "h-11 text-base", prefix: "h-11 text-base" },
}

/** Strip non-digits and cap at 10 characters */
function sanitize(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, 10)
}

const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  (
    {
      size = "md",
      value = "",
      onChange,
      hasError,
      disabled,
      className,
      id,
      ...props
    },
    ref
  ) => {
    const digits = sanitize(value)

    // Show invalid-length state when user has started typing but hasn't reached 10 digits
    const lengthInvalid = digits.length > 0 && digits.length < 10
    const showError = hasError || lengthInvalid

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
      onChange?.(sanitize(e.target.value))
    }

    const { wrapper, prefix } = sizeClasses[size]
    const errId = id ? `${id}-length-err` : undefined

    return (
      <div className="flex flex-col gap-1">
        <div
          className={cn(
            "flex items-center w-full border rounded-[var(--radius-sm)] bg-surface",
            showError
              ? "border-error focus-within:ring-2 focus-within:ring-error"
              : "border-border focus-within:ring-2 focus-within:ring-ring focus-within:border-ring",
            disabled && "opacity-50 cursor-not-allowed bg-muted",
            wrapper,
            className
          )}
        >
          {/* +91 prefix */}
          <span
            className={cn(
              "flex items-center justify-center px-3 border-r border-border",
              "text-muted-foreground font-medium shrink-0 self-stretch tracking-wide",
              prefix
            )}
            aria-hidden="true"
          >
            +91
          </span>

          <input
            ref={ref}
            id={id}
            type="tel"
            inputMode="numeric"
            value={digits}
            onChange={handleChange}
            disabled={disabled}
            maxLength={10}
            placeholder="10-digit number"
            aria-invalid={showError ? true : undefined}
            aria-describedby={lengthInvalid ? errId : undefined}
            className={cn(
              "flex-1 bg-transparent outline-none px-3 min-w-0 h-full tracking-wider",
              "text-foreground placeholder:text-muted-foreground",
              "disabled:cursor-not-allowed"
            )}
            {...props}
          />
        </div>

        {/* Inline length validation — shown below the wrapper, not via FormField,
            because it's always about digit count, not a form-level error */}
        {lengthInvalid && (
          <p id={errId} role="alert" className="text-xs text-error">
            Enter a 10-digit mobile number
          </p>
        )}
      </div>
    )
  }
)
PhoneInput.displayName = "PhoneInput"

export { PhoneInput }
