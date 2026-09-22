import * as React from "react"
import { ChevronUp, ChevronDown } from "lucide-react"
import { Input, type InputProps } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export type NumberInputVariant = "plain" | "stepper"
export type NumberInputSize = "sm" | "md" | "lg"

export interface NumberInputProps
  extends Omit<InputProps, "type" | "size"> {
  variant?: NumberInputVariant
  size?: NumberInputSize
  min?: number
  max?: number
  step?: number
  hasError?: boolean
}

const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  (
    {
      variant = "plain",
      size = "md",
      min,
      max,
      step = 1,
      hasError,
      value,
      onChange,
      disabled,
      className,
      ...props
    },
    ref
  ) => {
    const internalRef = React.useRef<HTMLInputElement>(null)
    const resolvedRef = (ref as React.RefObject<HTMLInputElement>) ?? internalRef

    function nudge(direction: 1 | -1) {
      const el = resolvedRef.current
      if (!el) return
      const current = parseFloat(el.value) || 0
      let next = current + direction * step
      if (min !== undefined) next = Math.max(min, next)
      if (max !== undefined) next = Math.min(max, next)
      // Fire a native input event so controlled consumers pick it up
      const nativeSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value"
      )?.set
      nativeSetter?.call(el, String(next))
      el.dispatchEvent(new Event("input", { bubbles: true }))
      el.dispatchEvent(new Event("change", { bubbles: true }))
    }

    if (variant === "stepper") {
      const numericValue = parseFloat(String(value)) || 0
      const canDecrement = min === undefined || numericValue > min
      const canIncrement = max === undefined || numericValue < max

      return (
        <div className={cn("relative flex items-stretch", className)}>
          <Input
            ref={resolvedRef}
            type="number"
            size={size}
            hasError={hasError}
            value={value}
            onChange={onChange}
            min={min}
            max={max}
            step={step}
            disabled={disabled}
            className={cn(
              "pr-7 rounded-r-none",
              "[appearance:textfield]",
              "[&::-webkit-outer-spin-button]:appearance-none",
              "[&::-webkit-inner-spin-button]:appearance-none"
            )}
            {...props}
          />
          <div
            className={cn(
              "flex flex-col border border-l-0 rounded-r-sm border-border bg-surface",
              hasError && "border-error",
              disabled && "opacity-50"
            )}
          >
            <button
              type="button"
              tabIndex={-1}
              aria-label="Increase value"
              disabled={disabled || !canIncrement}
              onClick={() => nudge(1)}
              className={cn(
                "flex flex-1 items-center justify-center px-1.5 border-b border-border",
                "text-muted-foreground hover:text-foreground hover:bg-muted",
                "disabled:opacity-40 disabled:cursor-not-allowed",
                "rounded-tr-sm motion-interactive"
              )}
            >
              <ChevronUp className="h-3 w-3" aria-hidden="true" />
            </button>
            <button
              type="button"
              tabIndex={-1}
              aria-label="Decrease value"
              disabled={disabled || !canDecrement}
              onClick={() => nudge(-1)}
              className={cn(
                "flex flex-1 items-center justify-center px-1.5",
                "text-muted-foreground hover:text-foreground hover:bg-muted",
                "disabled:opacity-40 disabled:cursor-not-allowed",
                "rounded-br-sm motion-interactive"
              )}
            >
              <ChevronDown className="h-3 w-3" aria-hidden="true" />
            </button>
          </div>
        </div>
      )
    }

    return (
      <Input
        ref={ref}
        type="number"
        size={size}
        hasError={hasError}
        value={value}
        onChange={onChange}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        className={className}
        {...props}
      />
    )
  }
)
NumberInput.displayName = "NumberInput"

export { NumberInput }
