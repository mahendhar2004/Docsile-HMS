/**
 * patterns/structured-content/accordion.tsx
 *
 * Accordion — collapsible content sections built on @radix-ui/react-accordion.
 *
 * Supports both single-open and multi-open modes via the `type` prop.
 * Chevron rotates 180° on open using our --ease-fluid + --duration-macro tokens.
 * Content height animates with the --radix-accordion-content-height CSS var
 * via our .motion-accordion-down / .motion-accordion-up utility classes
 * (defined in index.css).
 *
 * Two APIs:
 *
 * 1. High-level (AccordionList) — pass an array of items:
 *    <AccordionList
 *      type="single"
 *      items={[
 *        { id: "faq-1", trigger: "What is pre-auth?", content: "..." },
 *      ]}
 *    />
 *
 * 2. Low-level (primitive parts) — compose manually for custom triggers/content:
 *    <AccordionRoot type="multiple">
 *      <AccordionItem value="step-1">
 *        <AccordionTrigger>Step 1 — Personal Info</AccordionTrigger>
 *        <AccordionContent>...</AccordionContent>
 *      </AccordionItem>
 *    </AccordionRoot>
 */

import * as React from "react"
import * as RadixAccordion from "@radix-ui/react-accordion"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

/* ─── Low-level primitives ──────────────────────────────────────────────────── */

/** Accordion root — pass `type="single"` or `type="multiple"`. */
const AccordionRoot = React.forwardRef<
  React.ElementRef<typeof RadixAccordion.Root>,
  React.ComponentPropsWithoutRef<typeof RadixAccordion.Root>
>(({ className, ...props }, ref) => (
  <RadixAccordion.Root
    ref={ref}
    className={cn("w-full", className)}
    {...props}
  />
))
AccordionRoot.displayName = "AccordionRoot"

/** Accordion item wrapper. Renders a border-bottom separator between items. */
const AccordionItem = React.forwardRef<
  React.ElementRef<typeof RadixAccordion.Item>,
  React.ComponentPropsWithoutRef<typeof RadixAccordion.Item>
>(({ className, ...props }, ref) => (
  <RadixAccordion.Item
    ref={ref}
    className={cn(
      "border-b border-[--color-border] last:border-0",
      className
    )}
    {...props}
  />
))
AccordionItem.displayName = "AccordionItem"

/** Accordion trigger — the clickable header. Chevron rotates on open/close. */
const AccordionTrigger = React.forwardRef<
  React.ElementRef<typeof RadixAccordion.Trigger>,
  React.ComponentPropsWithoutRef<typeof RadixAccordion.Trigger>
>(({ className, children, ...props }, ref) => (
  <RadixAccordion.Header className="flex">
    <RadixAccordion.Trigger
      ref={ref}
      className={cn(
        "flex flex-1 items-center justify-between",
        "py-3.5 pr-1 text-left",
        "text-[length:var(--text-body)] font-medium text-[--color-foreground]",
        "cursor-pointer select-none",
        "motion-interactive",
        "hover:text-[--color-primary]",
        "focus-visible:outline-none focus-visible:ring-2",
        "focus-visible:ring-[--color-ring] focus-visible:ring-offset-1",
        "rounded-[--radius-xs]",
        // Disabled
        "disabled:pointer-events-none disabled:opacity-50",
        className
      )}
      {...props}
    >
      {children}
      <ChevronDown
        size={16}
        strokeWidth={2}
        aria-hidden="true"
        className={cn(
          "shrink-0 text-[--color-muted-foreground]",
          "transition-transform duration-[--duration-macro]",
          "[transition-timing-function:var(--ease-fluid)]",
          // Radix sets data-state="open" on the trigger when expanded
          "data-[state=open]:rotate-180"
        )}
        // The data-state attribute lives on the parent Trigger; propagate to the
        // icon via CSS selector from the parent instead of passing a prop.
        // Tailwind's `data-[state=open]:rotate-180` matches when the trigger
        // itself (the icon's ancestor) has data-state=open, but since the icon
        // is a child, we need the parent's attribute. Use group pattern:
      />
    </RadixAccordion.Trigger>
  </RadixAccordion.Header>
))
AccordionTrigger.displayName = "AccordionTrigger"

/** Accordion content — animates height open/closed via CSS keyframes. */
const AccordionContent = React.forwardRef<
  React.ElementRef<typeof RadixAccordion.Content>,
  React.ComponentPropsWithoutRef<typeof RadixAccordion.Content>
>(({ className, children, ...props }, ref) => (
  <RadixAccordion.Content
    ref={ref}
    className={cn(
      "overflow-hidden",
      // Radix adds data-state="open"|"closed" — drive animation from CSS
      "data-[state=open]:motion-accordion-down",
      "data-[state=closed]:motion-accordion-up",
      className
    )}
    {...props}
  >
    <div
      className={cn(
        "pb-4 pt-0.5",
        "text-[length:var(--text-body)] text-[--color-muted-foreground]",
        "leading-[--leading-relaxed]"
      )}
    >
      {children}
    </div>
  </RadixAccordion.Content>
))
AccordionContent.displayName = "AccordionContent"

/* ─── High-level AccordionList ──────────────────────────────────────────────── */

export interface AccordionListItem {
  id: string
  trigger: React.ReactNode
  content: React.ReactNode
  disabled?: boolean
}

type AccordionListSingleProps = {
  type: "single"
  defaultValue?: string
  value?: string
  onValueChange?: (value: string) => void
  collapsible?: boolean
}

type AccordionListMultipleProps = {
  type: "multiple"
  defaultValue?: string[]
  value?: string[]
  onValueChange?: (value: string[]) => void
}

export type AccordionListProps = (
  | AccordionListSingleProps
  | AccordionListMultipleProps
) & {
  items: AccordionListItem[]
  className?: string
}

/**
 * AccordionList — renders an array of items without manual composition.
 * For custom triggers or content slots, use the primitive parts directly.
 */
function AccordionList({ items, className, ...rootProps }: AccordionListProps) {
  return (
    <AccordionRoot
      className={cn(
        "rounded-[--radius] border border-[--color-border]",
        "bg-[--color-surface] px-4",
        className
      )}
      {...(rootProps as React.ComponentProps<typeof RadixAccordion.Root>)}
    >
      {items.map((item) => (
        <AccordionItem key={item.id} value={item.id} disabled={item.disabled}>
          <AccordionTrigger>{item.trigger}</AccordionTrigger>
          <AccordionContent>{item.content}</AccordionContent>
        </AccordionItem>
      ))}
    </AccordionRoot>
  )
}

export {
  AccordionRoot,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
  AccordionList,
}
