import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const inputVariants = cva(
  [
    "flex w-full border bg-surface text-foreground",
    "placeholder:text-muted-foreground",
    "focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring",
    "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted",
    "read-only:bg-muted read-only:cursor-default",
    "aria-[invalid=true]:border-error aria-[invalid=true]:focus:ring-error",
    "file:border-0 file:bg-transparent file:font-medium",
    "motion-interactive rounded-sm border-border",
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
