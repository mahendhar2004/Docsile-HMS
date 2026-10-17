/**
 * ui/command.tsx
 *
 * cmdk-based command/search palette primitive. Used by combobox.tsx and
 * the pattern-level SingleSelect / MultiSelect components.
 *
 * Re-exports every cmdk surface as a named, themed wrapper so the rest of
 * the app never imports from "cmdk" directly.
 */

import * as React from "react"
import { Command as CommandPrimitive } from "cmdk"
import { Search } from "lucide-react"
import { cn } from "@/lib/utils"

/* ─── Root ─────────────────────────────────────────────────────────────────── */

const Command = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive>
>(({ className, ...props }, ref) => (
  <CommandPrimitive
    ref={ref}
    className={cn(
      "flex h-full w-full flex-col overflow-hidden bg-[var(--color-popover)] text-[var(--color-popover-foreground)]",
      className
    )}
    {...props}
  />
))
Command.displayName = "Command"

/* ─── Input ─────────────────────────────────────────────────────────────────── */

const CommandInput = React.forwardRef<
  HTMLInputElement,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Input>
>(({ className, ...props }, ref) => (
  <div
    className="flex items-center gap-2 border-b border-[var(--color-divider)] px-3"
    // cmdk uses this attr to wire up keyboard nav
    data-cmdk-input-wrapper=""
  >
    <Search className="h-4 w-4 shrink-0 text-[var(--color-muted-foreground)]" aria-hidden="true" />
    <CommandPrimitive.Input
      ref={ref}
      className={cn(
        "flex h-9 w-full bg-transparent text-sm outline-none",
        "placeholder:text-[var(--color-muted-foreground)]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  </div>
))
CommandInput.displayName = "CommandInput"

/* ─── List ──────────────────────────────────────────────────────────────────── */

const CommandList = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.List>
>(({ className, onScroll, onWheel, ...props }, ref) => {
  // cmdk tracks a keyboard-nav "active" item via pointermove over cmdk-items,
  // and auto-scrolls that item into view whenever it changes. When content
  // scrolls under a stationary cursor, the browser re-evaluates :hover and
  // fires a synthetic pointermove on whatever item is now under the cursor —
  // cmdk sees that as a new active item and immediately scrolls back to it,
  // fighting (and effectively cancelling) the user's own wheel/trackpad
  // scroll. A well-documented cmdk behavior (pacocoursey/cmdk), not specific
  // to any one dropdown here. Fix: disable pointer events on items for the
  // duration of a scroll gesture (+ a short settle delay), so hovering
  // caused purely by content moving under the cursor can't retrigger it.
  const [isScrolling, setIsScrolling] = React.useState(false)
  const scrollEndTimeout = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const handleScroll = React.useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      setIsScrolling(true)
      if (scrollEndTimeout.current) clearTimeout(scrollEndTimeout.current)
      scrollEndTimeout.current = setTimeout(() => setIsScrolling(false), 150)
      onScroll?.(e)
    },
    [onScroll]
  )

  // This component is almost always used inside a Radix Popover that is
  // itself nested inside a Radix Dialog (e.g. SingleSelect inside a
  // registration wizard dialog) — that nested-modal combination silently
  // swallows the wheel event's native scroll-the-nearest-ancestor behavior
  // before it ever reaches this list (confirmed: scrollTop never changes on
  // a real wheel gesture, even though setting scrollTop directly works
  // fine). preventDefault() upstream doesn't stop the event from bubbling
  // here, so we scroll the list ourselves from the wheel delta instead of
  // relying on the browser's default action.
  const handleWheel = React.useCallback(
    (e: React.WheelEvent<HTMLDivElement>) => {
      e.currentTarget.scrollTop += e.deltaY
      onWheel?.(e)
    },
    [onWheel]
  )

  React.useEffect(() => {
    return () => {
      if (scrollEndTimeout.current) clearTimeout(scrollEndTimeout.current)
    }
  }, [])

  return (
    <CommandPrimitive.List
      ref={ref}
      onScroll={handleScroll}
      onWheel={handleWheel}
      className={cn(
        "max-h-[300px] overflow-y-auto overflow-x-hidden",
        isScrolling && "[&_[cmdk-item]]:pointer-events-none",
        className
      )}
      {...props}
    />
  )
})
CommandList.displayName = "CommandList"

/* ─── Empty ─────────────────────────────────────────────────────────────────── */

const CommandEmpty = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Empty>
>((props, ref) => (
  <CommandPrimitive.Empty
    ref={ref}
    className="py-8 text-center text-sm text-[var(--color-muted-foreground)]"
    {...props}
  />
))
CommandEmpty.displayName = "CommandEmpty"

/* ─── Group ─────────────────────────────────────────────────────────────────── */

const CommandGroup = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Group>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Group
    ref={ref}
    className={cn(
      "overflow-hidden p-1",
      // Group heading (injected by cmdk as [cmdk-group-heading])
      "[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5",
      "[&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium",
      "[&_[cmdk-group-heading]]:text-[var(--color-muted-foreground)]",
      className
    )}
    {...props}
  />
))
CommandGroup.displayName = "CommandGroup"

/* ─── Separator ─────────────────────────────────────────────────────────────── */

const CommandSeparator = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 h-px bg-[var(--color-divider)]", className)}
    {...props}
  />
))
CommandSeparator.displayName = "CommandSeparator"

/* ─── Item ──────────────────────────────────────────────────────────────────── */

const CommandItem = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Item>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Item
    ref={ref}
    className={cn(
      // Base
      "relative flex cursor-pointer select-none items-center gap-2",
      "rounded-[var(--radius-sm)] px-2 py-1.5 text-sm outline-none",
      // Micro-feedback on hover/active
      "motion-interactive",
      // cmdk data attributes
      "data-[selected=true]:bg-[var(--color-accent)] data-[selected=true]:text-[var(--color-accent-foreground)]",
      "data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50",
      className
    )}
    {...props}
  />
))
CommandItem.displayName = "CommandItem"

export {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
}
