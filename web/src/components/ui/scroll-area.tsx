/**
 * ui/scroll-area.tsx
 *
 * ScrollArea primitive — overflow container with a themed custom scrollbar.
 * Thin wrapper over @radix-ui/react-scroll-area.
 *
 * The scrollbar uses design tokens:
 *   thumb → --color-muted-foreground at 40% opacity (subtle but visible)
 *   track → transparent (only the thumb shows)
 *
 * Usage:
 *   <ScrollArea className="h-64">
 *     {longContent}
 *   </ScrollArea>
 *
 *   // With horizontal scrolling
 *   <ScrollArea orientation="horizontal">
 *     <div className="flex gap-4">{items}</div>
 *   </ScrollArea>
 */

import * as React from "react"
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area"
import { cn } from "@/lib/utils"

/* ─── ScrollBar ─────────────────────────────────────────────────────────────── */

export interface ScrollBarProps
  extends React.ComponentPropsWithoutRef<
    typeof ScrollAreaPrimitive.ScrollAreaScrollbar
  > {}

const ScrollBar = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>,
  ScrollBarProps
>(({ className, orientation = "vertical", ...props }, ref) => (
  <ScrollAreaPrimitive.ScrollAreaScrollbar
    ref={ref}
    orientation={orientation}
    className={cn(
      "flex touch-none select-none",
      "transition-opacity duration-[var(--duration-micro)] ease-[var(--ease-micro)]",
      orientation === "vertical" && "h-full w-2 py-0.5 px-px",
      orientation === "horizontal" && "h-2 w-full px-0.5 py-px flex-col",
      className
    )}
    {...props}
  >
    <ScrollAreaPrimitive.ScrollAreaThumb
      className={cn(
        "relative flex-1 rounded-full",
        "bg-[var(--color-muted-foreground)] opacity-40",
        "hover:opacity-60 transition-opacity duration-[var(--duration-micro)]"
      )}
    />
  </ScrollAreaPrimitive.ScrollAreaScrollbar>
))
ScrollBar.displayName = "ScrollBar"

/* ─── ScrollArea ────────────────────────────────────────────────────────────── */

export interface ScrollAreaProps
  extends React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root> {
  /** Scroll axis to show the bar for — defaults to vertical */
  orientation?: "vertical" | "horizontal" | "both"
}

const ScrollArea = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.Root>,
  ScrollAreaProps
>(({ className, children, orientation = "vertical", ...props }, ref) => (
  <ScrollAreaPrimitive.Root
    ref={ref}
    className={cn("relative overflow-hidden", className)}
    {...props}
  >
    <ScrollAreaPrimitive.Viewport className="h-full w-full rounded-[inherit]">
      {children}
    </ScrollAreaPrimitive.Viewport>

    {(orientation === "vertical" || orientation === "both") && (
      <ScrollBar orientation="vertical" />
    )}
    {(orientation === "horizontal" || orientation === "both") && (
      <ScrollBar orientation="horizontal" />
    )}

    <ScrollAreaPrimitive.Corner />
  </ScrollAreaPrimitive.Root>
))
ScrollArea.displayName = "ScrollArea"

export { ScrollArea, ScrollBar }
