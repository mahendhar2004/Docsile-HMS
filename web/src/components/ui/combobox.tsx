/**
 * ui/combobox.tsx
 *
 * Combobox primitive: a styled Popover panel sized and shadowed for
 * dropdown search-selects. Used by patterns/selection/single-select.tsx
 * and patterns/selection/multi-select.tsx.
 *
 * Selection logic (single vs multi, controlled value, onChange) lives
 * entirely in the pattern components — this file is intentionally
 * "dumb" and just handles the panel presentation.
 */

import * as React from "react"
import * as PopoverPrimitive from "@radix-ui/react-popover"
import { cn } from "@/lib/utils"

/* ─── Re-export roots unchanged ─────────────────────────────────────────────── */

const ComboboxRoot = PopoverPrimitive.Root
const ComboboxTrigger = PopoverPrimitive.Trigger
const ComboboxAnchor = PopoverPrimitive.Anchor

/* ─── Styled panel ──────────────────────────────────────────────────────────── */

const ComboboxContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = "start", sideOffset = 4, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        // Layout
        "z-50 min-w-[8rem] overflow-hidden p-0",
        // Surface
        "rounded-[--radius] border border-[--color-border]",
        "bg-[--color-popover] text-[--color-popover-foreground]",
        "shadow-[--shadow-md]",
        // Entrance — uses keyframe defined in index.css
        "animate-zoom-in",
        className
      )}
      {...props}
    />
  </PopoverPrimitive.Portal>
))
ComboboxContent.displayName = "ComboboxContent"

export { ComboboxAnchor, ComboboxContent, ComboboxRoot, ComboboxTrigger }
