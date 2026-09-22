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
      "flex h-full w-full flex-col overflow-hidden bg-[--color-popover] text-[--color-popover-foreground]",
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
    className="flex items-center gap-2 border-b border-[--color-border] px-3"
    // cmdk uses this attr to wire up keyboard nav
    data-cmdk-input-wrapper=""
  >
    <Search className="h-4 w-4 shrink-0 text-[--color-muted-foreground]" aria-hidden="true" />
    <CommandPrimitive.Input
      ref={ref}
      className={cn(
        "flex h-9 w-full bg-transparent text-sm outline-none",
        "placeholder:text-[--color-muted-foreground]",
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
>(({ className, ...props }, ref) => (
  <CommandPrimitive.List
    ref={ref}
    className={cn("max-h-[300px] overflow-y-auto overflow-x-hidden", className)}
    {...props}
  />
))
CommandList.displayName = "CommandList"

/* ─── Empty ─────────────────────────────────────────────────────────────────── */

const CommandEmpty = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Empty>
>((props, ref) => (
  <CommandPrimitive.Empty
    ref={ref}
    className="py-8 text-center text-sm text-[--color-muted-foreground]"
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
      "[&_[cmdk-group-heading]]:text-[--color-muted-foreground]",
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
    className={cn("-mx-1 h-px bg-[--color-border]", className)}
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
      "rounded-[--radius-sm] px-2 py-1.5 text-sm outline-none",
      // Micro-feedback on hover/active
      "motion-interactive",
      // cmdk data attributes
      "data-[selected=true]:bg-[--color-accent] data-[selected=true]:text-[--color-accent-foreground]",
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
