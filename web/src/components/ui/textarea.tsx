import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const textareaVariants = cva(
  [
    "flex w-full min-h-[80px] border bg-surface text-foreground",
    "placeholder:text-muted-foreground",
    "focus:outline-none focus:border-[var(--color-ring)] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.15)]",
    "disabled:cursor-not-allowed disabled:opacity-60 disabled:bg-muted",
    "read-only:bg-muted read-only:cursor-default",
    "aria-[invalid=true]:border-error aria-[invalid=true]:focus:shadow-[0_0_0_3px_rgba(255,59,48,0.15)]",
    "motion-interactive rounded-[var(--radius)] border-border resize-y",
  ],
  {
    variants: {
      size: {
        sm: "px-3 py-1.5 text-xs",
        md: "px-3 py-2 text-sm",
        lg: "px-4 py-2.5 text-base",
      },
    },
    defaultVariants: {
      size: "md",
    },
  }
)

export interface TextareaProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "size">,
    VariantProps<typeof textareaVariants> {
  hasError?: boolean
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, size, hasError, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(textareaVariants({ size }), className)}
      aria-invalid={hasError ? true : undefined}
      {...props}
    />
  )
)
Textarea.displayName = "Textarea"

export { Textarea }
