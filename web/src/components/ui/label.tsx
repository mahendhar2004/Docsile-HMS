import * as React from "react"
import * as LabelPrimitive from "@radix-ui/react-label"
import { cn } from "@/lib/utils"

export interface LabelProps
  extends React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> {
  required?: boolean
}

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  LabelProps
>(({ className, required, children, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn(
      // Use the text-body token (14 px) so label text is anchored to the
      // same typographic scale as body copy rather than being an ad-hoc size.
      "text-[length:var(--text-body)] font-medium leading-none text-[var(--color-foreground)] select-none",
      "peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
      className
    )}
    {...props}
  >
    {children}
    {required && (
      <span className="ml-0.5 text-destructive" aria-hidden="true">
        *
      </span>
    )}
  </LabelPrimitive.Root>
))
Label.displayName = "Label"

export { Label }
