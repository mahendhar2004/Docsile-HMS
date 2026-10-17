import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

const iconButtonVariants = cva(
  [
    "inline-flex items-center justify-center shrink-0 select-none cursor-pointer",
    "focus-visible:outline-none",
    "disabled:pointer-events-none disabled:opacity-45",
    "motion-interactive",
  ],
  {
    variants: {
      // radius uses --radius (8px, "buttons, inputs" per the Docsile HMS
      // design system's Shape spec), hover/pressed use the same named
      // interaction tokens as button.tsx. Variants with a resting shadow
      // (primary/secondary/outline) compose it with the focus glow in one
      // shadow-[...] utility — two separate shadow-[...] classes would just
      // have one override the other, not stack (see button.tsx's note).
      variant: {
        // Solid variants get --shadow-card (hairline ring + resting shadow) for
        // real depth — mirrors the treatment in button.tsx.
        primary:
          "bg-primary text-primary-foreground hover:bg-[var(--color-primary-hover)] active:bg-[var(--color-primary-pressed)] shadow-[var(--shadow-card)] rounded-[var(--radius)] focus-visible:shadow-[0_0_0_3px_rgba(37,99,235,0.35),var(--shadow-card)]",
        // Secondary/outline get the hairline ring only (--shadow-border) so they
        // read as defined surfaces rather than flat colour blobs.
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-[var(--shadow-border)] rounded-[var(--radius)] focus-visible:shadow-[0_0_0_3px_rgba(37,99,235,0.35),var(--shadow-border)]",
        // outline moves off bg-transparent onto a card surface so it doesn't
        // vanish against tinted page backgrounds — matches Button's treatment.
        outline:
          "bg-[var(--color-card)] text-foreground hover:bg-muted shadow-[var(--shadow-border)] rounded-[var(--radius)] focus-visible:shadow-[0_0_0_3px_rgba(37,99,235,0.35),var(--shadow-border)]",
        ghost:
          "bg-transparent text-foreground hover:bg-muted active:bg-[var(--color-divider)] rounded-[var(--radius)] focus-visible:shadow-[0_0_0_3px_rgba(37,99,235,0.35)]",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-[var(--color-error-hover)] active:bg-[var(--color-error-pressed)] shadow-[var(--shadow-card)] rounded-[var(--radius)] focus-visible:shadow-[0_0_0_3px_rgba(37,99,235,0.35),var(--shadow-card)]",
        link:
          "bg-transparent text-primary hover:text-primary/80 rounded-[var(--radius)] focus-visible:shadow-[0_0_0_3px_rgba(37,99,235,0.35)]",
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
