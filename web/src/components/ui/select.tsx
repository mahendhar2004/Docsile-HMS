/**
 * ui/select.tsx
 *
 * Radix Select primitive — a non-searchable single-choice dropdown.
 * Use this for short, known-length option lists (e.g. "Gender", "Department").
 * For searchable or longer option lists, use patterns/selection/SingleSelect.
 *
 * Sizes: sm | md (default) | lg
 * States: default | focus | error | disabled
 */

import * as React from "react"
import * as SelectPrimitive from "@radix-ui/react-select"
import { cva, type VariantProps } from "class-variance-authority"
import { Check, ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"

/* ─── Root / Value / Group / Label ─────────────────────────────────────────── */

const Select = SelectPrimitive.Root
const SelectGroup = SelectPrimitive.Group
const SelectValue = SelectPrimitive.Value

/* ─── Trigger ───────────────────────────────────────────────────────────────── */

const selectTriggerVariants = cva(
  [
    // Layout
    "flex w-full items-center justify-between gap-2 whitespace-nowrap",
    // Border & surface
    "border border-[var(--color-border)] bg-[var(--color-surface)]",
    "rounded-[var(--radius)]",
    // Typography
    "text-[var(--color-foreground)]",
    // Placeholder
    "[&[data-placeholder]>span]:text-[var(--color-muted-foreground)]",
    // Focus
    "focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)] focus:ring-offset-1",
    // Disabled
    "disabled:cursor-not-allowed disabled:opacity-50",
    // Motion
    "motion-interactive",
  ].join(" "),
  {
    variants: {
      size: {
        sm: "h-8 px-2.5 text-xs",
        md: "h-10 px-3 text-sm",
        lg: "h-12 px-4 text-base",
      },
      error: {
        true: "border-[var(--color-error)] focus:ring-[var(--color-error)]",
        false: "",
      },
    },
    defaultVariants: {
      size: "md",
      error: false,
    },
  }
)

export interface SelectTriggerProps
  extends React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>,
    VariantProps<typeof selectTriggerVariants> {
  /** Renders the trigger with an error border + error ring */
  error?: boolean
}

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  SelectTriggerProps
>(({ className, size, error = false, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(selectTriggerVariants({ size, error }), className)}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="h-4 w-4 shrink-0 text-[var(--color-muted-foreground)]" aria-hidden="true" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
))
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName

/* ─── Scroll buttons ────────────────────────────────────────────────────────── */

const SelectScrollUpButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollUpButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className={cn("flex cursor-default items-center justify-center py-1", className)}
    {...props}
  >
    <ChevronUp className="h-4 w-4" aria-hidden="true" />
  </SelectPrimitive.ScrollUpButton>
))
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName

const SelectScrollDownButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollDownButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    className={cn("flex cursor-default items-center justify-center py-1", className)}
    {...props}
  >
    <ChevronDown className="h-4 w-4" aria-hidden="true" />
  </SelectPrimitive.ScrollDownButton>
))
SelectScrollDownButton.displayName = SelectPrimitive.ScrollDownButton.displayName

/* ─── Content ───────────────────────────────────────────────────────────────── */

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = "popper", ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      className={cn(
        // Surface — --shadow-popover bundles the hairline ring + a strong
        // blur shadow, making the dropdown read as clearly elevated above
        // the page (no separate border property needed).
        "relative z-50 overflow-hidden",
        "rounded-[var(--radius)]",
        "bg-[var(--color-popover)] text-[var(--color-popover-foreground)]",
        "shadow-[var(--shadow-popover)]",
        // Entrance
        "animate-zoom-in",
        // Width matches trigger when popper
        position === "popper" && [
          "min-w-[var(--radix-select-trigger-width)]",
          "max-h-[var(--radix-select-content-available-height)]",
        ],
        className
      )}
      position={position}
      {...props}
    >
      <SelectScrollUpButton />
      <SelectPrimitive.Viewport
        className={cn(
          "p-1",
          position === "popper" && "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]"
        )}
      >
        {children}
      </SelectPrimitive.Viewport>
      <SelectScrollDownButton />
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
))
SelectContent.displayName = SelectPrimitive.Content.displayName

/* ─── Label ─────────────────────────────────────────────────────────────────── */

const SelectLabel = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn("px-2 py-1.5 text-xs font-medium text-[var(--color-muted-foreground)]", className)}
    {...props}
  />
))
SelectLabel.displayName = SelectPrimitive.Label.displayName

/* ─── Item ──────────────────────────────────────────────────────────────────── */

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      // Layout
      "relative flex w-full cursor-pointer select-none items-center",
      "rounded-[var(--radius-sm)] py-1.5 pl-2 pr-8 text-sm outline-none",
      // States
      "focus:bg-[var(--color-accent)] focus:text-[var(--color-accent-foreground)]",
      "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      // Motion
      "motion-interactive",
      className
    )}
    {...props}
  >
    <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="h-4 w-4" aria-hidden="true" />
      </SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
))
SelectItem.displayName = SelectPrimitive.Item.displayName

/* ─── Separator ─────────────────────────────────────────────────────────────── */

const SelectSeparator = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-[var(--color-border)]", className)}
    {...props}
  />
))
SelectSeparator.displayName = SelectPrimitive.Separator.displayName

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
}
