import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium select-none cursor-pointer",
    "focus-visible:outline-none",
    "disabled:pointer-events-none disabled:opacity-45",
    "motion-interactive",
  ],
  {
    variants: {
      // Matches the "Button" section of the Docsile HMS design system
      // reference (docs/design-system/) — radius uses --radius (8px, "buttons,
      // inputs" per its Shape spec), each variant has an explicit hover +
      // pressed (active:) color rather than an opacity tint, and focus is a
      // 3px/35%-opacity glow (no offset ring), not Tailwind's default ring-2
      // + ring-offset-2. Every variant's focus-visible:shadow-[...] is
      // written out in full (not composed from a shared constant) because
      // Tailwind's build-time class scanner needs the complete literal
      // utility string in source to generate it — a JS template-interpolated
      // class name is invisible to it and silently produces no CSS.
      // "secondary" composes two shadow layers (the glow + its own resting
      // shadow-card) in one utility, since two separate shadow-[...] classes
      // would just have one override the other, not stack.
      variant: {
        primary:
          "bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] active:bg-[var(--color-primary-pressed)] rounded-[var(--radius)] focus-visible:shadow-[0_0_0_3px_rgba(37,99,235,0.35)]",
        secondary:
          "bg-card text-foreground shadow-[var(--shadow-card)] hover:bg-muted active:bg-[var(--color-divider)] rounded-[var(--radius)] focus-visible:shadow-[0_0_0_3px_rgba(37,99,235,0.35),var(--shadow-card)]",
        // New variant — a tinted/"soft" action, between primary and ghost
        // (e.g. "Add note"-style secondary actions that shouldn't compete
        // with the page's one primary action).
        soft:
          "bg-accent text-accent-foreground hover:bg-[var(--color-accent-hover)] active:bg-[var(--color-accent-pressed)] rounded-[var(--radius)] focus-visible:shadow-[0_0_0_3px_rgba(37,99,235,0.35)]",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-[var(--radius)] focus-visible:shadow-[0_0_0_3px_rgba(37,99,235,0.35)]",
        ghost:
          "bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground active:bg-[var(--color-divider)] rounded-[var(--radius)] focus-visible:shadow-[0_0_0_3px_rgba(37,99,235,0.35)]",
        destructive:
          "bg-[var(--color-error)] text-white hover:bg-[var(--color-error-hover)] active:bg-[var(--color-error-pressed)] rounded-[var(--radius)] focus-visible:shadow-[0_0_0_3px_rgba(37,99,235,0.35)]",
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
