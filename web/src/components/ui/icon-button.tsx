import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

const iconButtonVariants = cva(
  [
    "inline-flex items-center justify-center shrink-0 select-none cursor-pointer",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-50",
    "motion-interactive",
  ],
  {
    variants: {
      variant: {
        // Solid variants get --shadow-card (hairline ring + resting shadow) for
        // real depth — mirrors the treatment in button.tsx.
        primary:
          "bg-primary text-primary-foreground hover:bg-primary/90 shadow-[var(--shadow-card)] rounded-sm",
        // Secondary/outline get the hairline ring only (--shadow-border) so they
        // read as defined surfaces rather than flat colour blobs.
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-[var(--shadow-border)] rounded-sm",
        // outline moves off bg-transparent onto a card surface so it doesn't
        // vanish against tinted page backgrounds — matches Button's treatment.
        outline:
          "bg-[var(--color-card)] text-foreground hover:bg-muted shadow-[var(--shadow-border)] rounded-sm",
        ghost:
          "bg-transparent text-foreground hover:bg-muted rounded-sm",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-[var(--shadow-card)] rounded-sm",
        link:
          "bg-transparent text-primary hover:text-primary/80 rounded-sm",
      },
      size: {
        sm: "h-8 w-8",
        md: "h-9 w-9",
        lg: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "ghost",
      size: "md",
    },
  }
)

export interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof iconButtonVariants> {
  /** Accessible label — required for icon-only buttons */
  "aria-label": string
  asChild?: boolean
  loading?: boolean
}

const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
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
        className={cn(iconButtonVariants({ variant, size }), className)}
        disabled={isDisabled}
        aria-busy={loading ? true : undefined}
        aria-disabled={isDisabled ? true : undefined}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          children
        )}
      </Comp>
    )
  }
)
IconButton.displayName = "IconButton"

export { IconButton, iconButtonVariants }
