import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium select-none cursor-pointer",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-50",
    "motion-interactive",
  ],
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs rounded-sm",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-sm",
        outline:
          "border border-border bg-transparent text-foreground hover:bg-muted rounded-sm",
        ghost:
          "bg-transparent text-foreground hover:bg-muted rounded-sm",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-xs rounded-sm",
        link:
          "bg-transparent text-primary underline-offset-4 hover:underline h-auto p-0",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-9 px-4 text-sm",
        lg: "h-11 px-6 text-base",
      },
    },
    compoundVariants: [
      // link variant should not apply size height/padding
      {
        variant: "link",
        size: "sm",
        className: "h-auto px-0 text-xs",
      },
      {
        variant: "link",
        size: "md",
        className: "h-auto px-0 text-sm",
      },
      {
        variant: "link",
        size: "lg",
        className: "h-auto px-0 text-base",
      },
    ],
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Render the button's child as the slot root (useful for router Link wrappers) */
  asChild?: boolean
  /** Shows a spinner and disables interaction; also sets aria-busy */
  loading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      loading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button"
    const isDisabled = disabled || loading

    return (
      <Comp
        {...props}
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={isDisabled}
        aria-busy={loading ? true : undefined}
        aria-disabled={isDisabled ? true : undefined}
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden="true" />
            {children}
          </>
        ) : (
          children
        )}
      </Comp>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
