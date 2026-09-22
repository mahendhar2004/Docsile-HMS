/**
 * ui/separator.tsx
 *
 * Separator primitive — thin rule dividing sections of content.
 * Thin wrapper over @radix-ui/react-separator, themed with design tokens.
 *
 * orientations: horizontal (default) | vertical
 * decorative defaults to true (purely visual, no role="separator" ARIA unless
 * you explicitly set decorative={false} for semantic dividers).
 *
 * Usage:
 *   <Separator />
 *   <Separator orientation="vertical" className="h-6" />
 */

import * as React from "react"
import * as SeparatorPrimitive from "@radix-ui/react-separator"
import { cn } from "@/lib/utils"

export interface SeparatorProps
  extends React.ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root> {}

const Separator = React.forwardRef<
  React.ElementRef<typeof SeparatorPrimitive.Root>,
  SeparatorProps
>(
  (
    { className, orientation = "horizontal", decorative = true, ...props },
    ref
  ) => (
    <SeparatorPrimitive.Root
      ref={ref}
      decorative={decorative}
      orientation={orientation}
      className={cn(
        "shrink-0 bg-[--color-border]",
        orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
        className
      )}
      {...props}
    />
  )
)
Separator.displayName = "Separator"

export { Separator }
