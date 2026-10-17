/**
 * ui/kbd.tsx
 *
 * Keyboard-shortcut chip — new component matching the "Kbd" base component
 * in the Docsile HMS design system reference (docs/design-system/): the
 * `mono-kbd` typography role (600 weight, --text-overline size, mono font)
 * in a small bordered chip, radius-sm (6px — "kbd, tooltip" per the design
 * system's Shape spec) on a muted surface.
 */

import * as React from "react"
import { cn } from "@/lib/utils"

export interface KbdProps extends React.HTMLAttributes<HTMLElement> {}

const Kbd = React.forwardRef<HTMLElement, KbdProps>(
  ({ className, ...props }, ref) => (
    <kbd
      ref={ref}
      className={cn(
        "type-mono-kbd inline-flex items-center justify-center",
        "min-w-[1.5rem] h-6 px-1.5",
        "rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-muted)]",
        "text-[var(--color-muted-foreground)]",
        className
      )}
      {...props}
    />
  )
)
Kbd.displayName = "Kbd"

export { Kbd }
