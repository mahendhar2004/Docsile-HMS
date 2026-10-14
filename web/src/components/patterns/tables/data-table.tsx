import React from "react"
import { ChevronUp, ChevronDown } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

// ---------------------------------------------------------------------------
// Column definition
// ---------------------------------------------------------------------------

/**
 * Describes one column in a DataTable.
 *
 * @template TRow — the row data type. Inferred from the `data` prop.
 */
export interface ColumnDef<TRow> {
  /**
   * Unique identifier for the column. Used as the React key.
   * Also used as the header label when `header` is not supplied.
   */
  key: string
  /** Column header content. Falls back to `key` if omitted. */
  header?: React.ReactNode
  /**
   * Cell renderer. Return any React node — text, badges, status pills, etc.
   * @param row   — the row data object
   * @param index — zero-based row index within `data`
   */
  cell: (row: TRow, index: number) => React.ReactNode
  /** Tailwind class applied to both <th> and <td> for this column. */
  className?: string
  /** Additional class applied to the <th> only. */
  headerClassName?: string
  /** Text alignment for the column. Defaults to "left". */
  align?: "left" | "center" | "right"
  /** CSS min-width for the column, e.g. "120px". Applied inline. */
  minWidth?: string
  /**
   * When present, the column header becomes clickable and the table can be
   * sorted by this column (client-side, over whatever `data` currently
   * holds — matches main's own click-to-sort behavior, e.g. the OPD patient
   * list's Time/Patient ID/Name/Status columns). Return the comparable
   * value for a row; string values sort case-sensitively ascending/descending,
   * numbers sort numerically.
   */
  sortValue?: (row: TRow) => string | number
}

// ---------------------------------------------------------------------------
// Variant types
// ---------------------------------------------------------------------------

/**
 * - `standard`        — default row padding (py-3 px-4), comfortable reading
 * - `dense`           — tighter row padding (py-1.5 px-3), for compact lists
 * - `with-row-actions`— standard padding + a trailing actions column rendered
 *                       via the `rowActions` render-prop; clicks on the actions
 *                       cell do not bubble to the row's `onRowClick` handler
 */
export type DataTableVariant = "standard" | "dense" | "with-row-actions"

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface DataTableProps<TRow> {
  /** Rows to display. */
  data: TRow[]
  /** Column definitions. */
  columns: ColumnDef<TRow>[]
  /**
   * Visual variant. Defaults to `"standard"`.
   * Pass `"with-row-actions"` and supply a `rowActions` render-prop to add
   * a trailing actions column (edit/delete buttons, kebab menu, etc.).
   */
  variant?: DataTableVariant
  /**
   * Render row-level actions (only used when `variant="with-row-actions"`).
   * Return icon-buttons, a DropdownMenu trigger, or any other action node.
   * Clicks on this cell are isolated — they do not trigger `onRowClick`.
   *
   * @param row   — the row data object
   * @param index — zero-based row index
   */
  rowActions?: (row: TRow, index: number) => React.ReactNode
  /**
   * Row click handler. When supplied, rows become keyboard-focusable and
   * get cursor-pointer styling.
   */
  onRowClick?: (row: TRow, index: number) => void
  /** Per-row className override, e.g. for conditional highlight. */
  rowClassName?: (row: TRow, index: number) => string | undefined
  /** Applied to the outermost wrapper div. */
  className?: string
  /** Accessible label for the <table> element. */
  "aria-label"?: string
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const ALIGN_CLASS: Record<string, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
}

// Padding by variant
const CELL_PAD: Record<DataTableVariant, string> = {
  standard: "px-4 py-3",
  dense: "px-3 py-1.5",
  "with-row-actions": "px-4 py-3",
}

const HEAD_PAD: Record<DataTableVariant, string> = {
  standard: "px-4 py-2.5",
  dense: "px-3 py-2",
  "with-row-actions": "px-4 py-2.5",
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Tier 2 — DataTable
 *
 * Generic, type-safe data table built on the Tier 1 Table primitives.
 * Handles three variants (standard / dense / with-row-actions) and provides
 * accessible row interaction (keyboard + click).
 *
 * Does NOT manage loading, error, empty, or pagination state — those are the
 * responsibility of the caller or `PaginatedDataTable`.
 *
 * ### Standard usage
 * ```tsx
 * const columns: ColumnDef<Patient>[] = [
 *   { key: "name", header: "Patient Name", cell: (p) => p.name },
 *   { key: "age",  header: "Age",          cell: (p) => p.age, align: "right" },
 * ]
 *
 * <DataTable
 *   data={patients}
 *   columns={columns}
 *   onRowClick={(p) => navigate(`/patients/${p.id}`)}
 * />
 * ```
 *
 * ### Dense variant
 * ```tsx
 * <DataTable data={items} columns={columns} variant="dense" />
 * ```
 *
 * ### With row actions
 * ```tsx
 * <DataTable
 *   data={items}
 *   columns={columns}
 *   variant="with-row-actions"
 *   rowActions={(item) => (
 *     <div className="flex items-center justify-end gap-1">
 *       <button onClick={() => handleEdit(item)} aria-label={`Edit ${item.name}`}>
 *         <Pencil className="h-4 w-4" />
 *       </button>
 *       <button onClick={() => handleDelete(item)} aria-label={`Delete ${item.name}`}>
 *         <Trash2 className="h-4 w-4 text-destructive" />
 *       </button>
 *     </div>
 *   )}
 * />
 * ```
 */
export function DataTable<TRow>({
  data,
  columns,
  variant = "standard",
  rowActions,
  onRowClick,
  rowClassName,
  className,
  "aria-label": ariaLabel,
}: DataTableProps<TRow>) {
  const showActionsCol = variant === "with-row-actions" && rowActions != null
  const isClickable = onRowClick != null

  const [sort, setSort] = React.useState<{ key: string; dir: "asc" | "desc" } | null>(null)

  function toggleSort(key: string) {
    setSort((prev) =>
      prev?.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" },
    )
  }

  const sortColumn = sort ? columns.find((c) => c.key === sort.key) : undefined
  const sortedData = React.useMemo(() => {
    if (!sort || !sortColumn?.sortValue) return data
    const { sortValue } = sortColumn
    const dir = sort.dir === "asc" ? 1 : -1
    return [...data].sort((a, b) => {
      const av = sortValue(a)
      const bv = sortValue(b)
      if (av < bv) return -dir
      if (av > bv) return dir
      return 0
    })
  }, [data, sort, sortColumn])

  return (
    <div className={cn("w-full", className)}>
      <Table aria-label={ariaLabel} containerClassName="rounded-none">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {columns.map((col) => {
              const isSortable = col.sortValue != null
              const isActive = sort?.key === col.key
              return (
                <TableHead
                  key={col.key}
                  className={cn(
                    HEAD_PAD[variant],
                    ALIGN_CLASS[col.align ?? "left"],
                    isSortable && "cursor-pointer select-none hover:text-foreground transition-colors",
                    col.headerClassName,
                  )}
                  style={col.minWidth ? { minWidth: col.minWidth } : undefined}
                  onClick={isSortable ? () => toggleSort(col.key) : undefined}
                  aria-sort={isSortable ? (isActive ? (sort!.dir === "asc" ? "ascending" : "descending") : "none") : undefined}
                >
                  {col.header ?? col.key}
                  {isSortable &&
                    (isActive ? (
                      sort!.dir === "asc" ? (
                        <ChevronUp className="h-3 w-3 ml-0.5 inline text-primary" aria-hidden="true" />
                      ) : (
                        <ChevronDown className="h-3 w-3 ml-0.5 inline text-primary" aria-hidden="true" />
                      )
                    ) : (
                      <span className="opacity-30 ml-1 text-[10px]">↕</span>
                    ))}
                </TableHead>
              )
            })}
            {showActionsCol && (
              <TableHead className={cn(HEAD_PAD[variant], "w-12 text-right")}>
                <span className="sr-only">Actions</span>
              </TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedData.map((row, index) => (
            <TableRow
              key={index}
              className={cn(
                isClickable && "cursor-pointer hover:bg-[var(--color-accent)]/40",
                rowClassName?.(row, index),
              )}
              onClick={isClickable ? () => onRowClick(row, index) : undefined}
              tabIndex={isClickable ? 0 : undefined}
              onKeyDown={
                isClickable
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        onRowClick(row, index)
                      }
                    }
                  : undefined
              }
              role={isClickable ? "button" : undefined}
            >
              {columns.map((col) => (
                <TableCell
                  key={col.key}
                  className={cn(
                    CELL_PAD[variant],
                    ALIGN_CLASS[col.align ?? "left"],
                    col.className,
                  )}
                >
                  {col.cell(row, index)}
                </TableCell>
              ))}
              {showActionsCol && (
                // Stop propagation so row-click doesn't fire when user clicks an action
                <TableCell
                  className={cn(CELL_PAD[variant], "text-right")}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                >
                  {rowActions!(row, index)}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
