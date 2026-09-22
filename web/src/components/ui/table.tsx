import * as React from "react"
import { cn } from "@/lib/utils"

// ---------------------------------------------------------------------------
// Tier 1 — Semantic table primitives
//
// Plain semantic <table> markup styled with Tailwind CSS using the design
// system tokens defined in index.css. Do not add data-fetching, pagination,
// or composite logic here — those live in patterns/tables/*.
//
// All components forward refs so they can be used in portals and with
// third-party integration libraries.
// ---------------------------------------------------------------------------

/**
 * Outermost table container. Wraps a native <table> in a bordered, rounded
 * card-like frame (--shadow-card, matching ui/card.tsx) with its own
 * overflow scroll so wide tables scroll horizontally without breaking the
 * rounded corners — the previous bare, borderless <table> read as an
 * unstyled HTML table dropped straight onto the page.
 *
 * Props:
 * - `containerClassName` — applied to the outer bordered frame, not the <table>.
 */
const Table = React.forwardRef<
  HTMLTableElement,
  React.HTMLAttributes<HTMLTableElement> & {
    /** Class name applied to the outer bordered frame, not the <table> itself. */
    containerClassName?: string
  }
>(({ className, containerClassName, ...props }, ref) => (
  <div
    className={cn(
      "relative w-full overflow-x-auto overflow-y-hidden rounded-[var(--radius-lg)] bg-[var(--color-card)] shadow-[var(--shadow-card)]",
      containerClassName,
    )}
  >
    <table
      ref={ref}
      className={cn("w-full caption-bottom text-[var(--text-body)]", className)}
      {...props}
    />
  </div>
))
Table.displayName = "Table"

/**
 * <thead> wrapper. A slightly stronger surface tint than the body plus a
 * crisp bottom rule gives the header band real separation instead of a
 * near-invisible tonal shift.
 */
const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead
    ref={ref}
    className={cn(
      "bg-[var(--color-muted)]/60 [&_tr]:border-b [&_tr]:border-[var(--color-border)]",
      className,
    )}
    {...props}
  />
))
TableHeader.displayName = "TableHeader"

/**
 * <tbody> wrapper. Rows inside are divided by a subtle hairline border;
 * the last row has no bottom border (handled by Tailwind sibling selector).
 */
const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn(
      "divide-y divide-[var(--color-border)] [&_tr:last-child]:border-b-0",
      className,
    )}
    {...props}
  />
))
TableBody.displayName = "TableBody"

/**
 * <tfoot> wrapper. Used for summary rows, aggregate totals, etc.
 */
const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn(
      "border-t border-[var(--color-border)] bg-[var(--color-muted)] font-medium",
      "[&>tr]:last:border-b-0",
      className,
    )}
    {...props}
  />
))
TableFooter.displayName = "TableFooter"

/**
 * <tr> — applies hover/selected state styling and micro-motion transition.
 *
 * Set `data-state="selected"` on the row to activate the selected background.
 */
const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      "border-b border-[var(--color-border)]",
      "transition-colors",
      "duration-[var(--duration-micro)] ease-[var(--ease-micro)]",
      "hover:bg-[var(--color-muted)] data-[state=selected]:bg-[var(--color-accent)]",
      className,
    )}
    {...props}
  />
))
TableRow.displayName = "TableRow"

/**
 * <th> — column header cell. Uses a compact all-caps label style that
 * matches the "11px semibold uppercase tracking-wider muted" pattern
 * used everywhere in the design system for column headers.
 */
const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      "px-4 py-2.5 text-left align-middle",
      "text-[11px] font-semibold uppercase tracking-wider",
      "text-[var(--color-muted-foreground)] whitespace-nowrap",
      // Checkbox column resets
      "[&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-0.5",
      className,
    )}
    {...props}
  />
))
TableHead.displayName = "TableHead"

/**
 * <td> — body cell. Default 14px body text, left-aligned.
 * Use the `align` prop or pass an `className` with Tailwind text-align
 * to override alignment per column.
 */
const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn(
      "px-4 py-3 align-middle",
      "text-sm text-[var(--color-foreground)]",
      // Checkbox column resets
      "[&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-0.5",
      className,
    )}
    {...props}
  />
))
TableCell.displayName = "TableCell"

/**
 * <caption> — table caption, rendered below the table.
 * Use for accessible table descriptions or helper text.
 */
const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn(
      "mt-3 text-xs text-[var(--color-muted-foreground)] text-left",
      className,
    )}
    {...props}
  />
))
TableCaption.displayName = "TableCaption"

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
}
