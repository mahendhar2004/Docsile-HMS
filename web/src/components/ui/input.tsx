import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const inputVariants = cva(
  [
    "flex w-full border bg-surface text-foreground",
    "placeholder:text-muted-foreground",
    // Focus is a border-color change + a 15%-opacity glow (not Tailwind's
    // default ring-2) — deliberately softer than the 35%-opacity glow on
    // buttons/dialogs/etc., since a field's own border already visibly
    // changes color on focus. Both are the Docsile HMS design system's
    // "Input · focused" / general focus-ring specs respectively.
    "focus:outline-none focus:border-[var(--color-ring)] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.15)]",
    // Disabled inputs dim to 60% opacity (not 50% — distinct from the 50%
    // used for checkbox/radio/switch, per the design system's own spec).
    "disabled:cursor-not-allowed disabled:opacity-60 disabled:bg-muted",
    "read-only:bg-muted read-only:cursor-default",
    "aria-[invalid=true]:border-error aria-[invalid=true]:focus:shadow-[0_0_0_3px_rgba(255,59,48,0.15)]",
    "file:border-0 file:bg-transparent file:font-medium",
    // radius uses --radius (8px, "buttons, inputs" per Shape), not the
    // smaller --radius-sm (6px, reserved for kbd/tooltip).
    "motion-interactive rounded-[var(--radius)] border-border",
  ],
  {
    variants: {
      size: {
        sm: "h-8 px-3 text-xs file:text-xs",
        md: "h-9 px-3 text-sm file:text-sm",
        lg: "h-11 px-4 text-base file:text-base",
      },
    },
    defaultVariants: {
      size: "md",
    },
  }
)

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size">,
    VariantProps<typeof inputVariants> {
  /** Pass true when the parent field is in an error state */
  hasError?: boolean
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, size, hasError, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(inputVariants({ size }), className)}
      aria-invalid={hasError ? true : undefined}
      {...props}
    />
  )
)
Input.displayName = "Input"

export { Input, inputVariants }
