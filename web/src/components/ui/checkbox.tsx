import * as React from "react"
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { Check, Minus } from "lucide-react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const checkboxVariants = cva(
  [
    "shrink-0 border-2 rounded-xs bg-surface text-primary-foreground",
    "focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_rgba(37,99,235,0.35)]",
    // Disabled unchecked fills with --color-muted (not just a dimmed white)
    // per the Docsile HMS design system's "Checkbox disabled" spec.
    "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted",
    "data-[state=checked]:bg-primary data-[state=checked]:border-primary",
    "data-[state=indeterminate]:bg-primary data-[state=indeterminate]:border-primary",
    "border-border motion-interactive",
  ],
  {
    variants: {
      size: {
        sm: "h-4 w-4",
        md: "h-5 w-5",
      },
    },
    defaultVariants: {
      size: "md",
    },
  }
)

export interface CheckboxProps
  extends React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>,
    VariantProps<typeof checkboxVariants> {}

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  CheckboxProps
>(({ className, size, ...props }, ref) => {
  const iconSize = size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3"
  return (
    <CheckboxPrimitive.Root
      ref={ref}
      className={cn(checkboxVariants({ size }), className)}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
        {props.checked === "indeterminate" ? (
          <Minus className={iconSize} strokeWidth={3} aria-hidden="true" />
        ) : (
          <Check className={iconSize} strokeWidth={3} aria-hidden="true" />
        )}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
})
Checkbox.displayName = "Checkbox"

export { Checkbox }
