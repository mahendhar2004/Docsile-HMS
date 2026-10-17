import * as React from "react"
import * as SwitchPrimitive from "@radix-ui/react-switch"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const switchTrackVariants = cva(
  [
    "relative inline-flex shrink-0 cursor-pointer items-center rounded-full",
    // Off-track uses --color-border (not --color-muted) per the Docsile HMS
    // design system's "Switch off" spec — a muted-bg track barely read as
    // "off" against the page; the border token gives it real definition.
    "border-2 border-transparent bg-[var(--color-border)]",
    "focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_rgba(37,99,235,0.35)]",
    "disabled:cursor-not-allowed disabled:opacity-50",
    "data-[state=checked]:bg-primary",
    "motion-interactive",
  ],
  {
    variants: {
      size: {
        sm: "h-5 w-9",
        md: "h-6 w-11",
      },
    },
    defaultVariants: {
      size: "md",
    },
  }
)

const switchThumbVariants = cva(
  [
    "pointer-events-none block rounded-full bg-white shadow-xs",
    "transition-transform",
    "duration-[var(--duration-micro)]",
  ],
  {
    variants: {
      size: {
        sm: "h-4 w-4 data-[state=checked]:translate-x-4",
        md: "h-5 w-5 data-[state=checked]:translate-x-5",
      },
    },
    defaultVariants: {
      size: "md",
    },
  }
)

export interface SwitchProps
  extends React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>,
    VariantProps<typeof switchTrackVariants> {}

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitive.Root>,
  SwitchProps
>(({ className, size, ...props }, ref) => (
  <SwitchPrimitive.Root
    ref={ref}
    className={cn(switchTrackVariants({ size }), className)}
    {...props}
  >
    <SwitchPrimitive.Thumb className={cn(switchThumbVariants({ size }))} />
  </SwitchPrimitive.Root>
))
Switch.displayName = "Switch"

export { Switch }
