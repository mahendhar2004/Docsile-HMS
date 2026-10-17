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
 * Outermost table container. Matches main's plain unstyled wrapper
 * (src/components/ui/table.tsx on main) — no border, no rounded frame,
 * just an overflow scroller.
 *
 * Props:
 * - `containerClassName` — applied to the outer frame, not the <table>.
 */
const Table = React.forwardRef<
  HTMLTableElement,
  React.HTMLAttributes<HTMLTableElement> & {
    /** Class name applied to the outer frame, not the <table> itself. */
    containerClassName?: string
  }
>(({ className, containerClassName, ...props }, ref) => (
  <div className={cn("relative w-full overflow-auto", containerClassName)}>
    <table
      ref={ref}
      className={cn("w-full caption-bottom text-sm", className)}
      {...props}
    />
  </div>
))
Table.displayName = "Table"

/**
 * <thead> wrapper — bottom rule on its rows. Uses --color-divider (not
 * --color-border) per the Docsile HMS design system's token split: --border
 * is for a surface's own outer edge (the card/table container's shadow-card
 * ring), --divider is for internal row/section rules within that surface.
 */
const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead
    ref={ref}
    className={cn("[&_tr]:border-b [&_tr]:border-[var(--color-divider)]", className)}
    {...props}
  />
))
TableHeader.displayName = "TableHeader"

/**
 * <tbody> wrapper — matches main's zebra striping (even rows tinted) with
 * no bottom border on the last row.
 */
const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn(
      "[&_tr:last-child]:border-0 [&_tr:nth-child(even)]:bg-[var(--color-muted)]/40",
      className,
    )}
    {...props}
  />
))
TableBody.displayName = "TableBody"

/** <tfoot> wrapper — used for summary rows, aggregate totals, etc. */
const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn(
      "border-t border-[var(--color-divider)] bg-[var(--color-muted)]/50 font-medium",
      "[&>tr]:last:border-b-0",
      className,
    )}
    {...props}
  />
))
TableFooter.displayName = "TableFooter"

/**
 * <tr> — applies hover/selected state styling, matching main's plain
 * hover/selected tints (no micro-motion transition tokens).
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
      "border-b border-[var(--color-divider)] transition-colors",
      "hover:bg-[var(--color-muted)]/50 data-[state=selected]:bg-[var(--color-accent)]",
      className,
    )}
    {...props}
  />
))
TableRow.displayName = "TableRow"

/**
 * <th> — column header cell, matching main's bold uppercase label style.
 */
const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      "h-9 px-3 text-left align-middle font-bold text-xs uppercase tracking-wide",
      "text-[var(--color-foreground)]/80",
      "[&:has([role=checkbox])]:pr-0",
      className,
    )}
    {...props}
  />
))
TableHead.displayName = "TableHead"

/**
 * <td> — body cell, matching main's plain padding (no forced text color/size
 * beyond the table's own text-sm).
 */
const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn("px-3 py-3 align-middle [&:has([role=checkbox])]:pr-0", className)}
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
