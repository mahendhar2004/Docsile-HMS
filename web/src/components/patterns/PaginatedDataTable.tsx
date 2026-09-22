import React from "react"
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { EmptyState } from "./EmptyState"
import { ErrorState } from "./ErrorState"
import type { OffsetPaginationResult } from "@/hooks/usePaginatedQuery"

// ---------------------------------------------------------------------------
// Column definition
// ---------------------------------------------------------------------------

export interface ColumnDef<TRow> {
  /** Unique key for the column — also used as the table head label if `header`
   * is not provided. */
  key: string
  header?: React.ReactNode
  /** Render function for cell content. Receives the row item and row index. */
  cell: (row: TRow, index: number) => React.ReactNode
  /** Optional className for the <th> and <td> elements. */
  className?: string
  /** If true, aligns the column content to the right. */
  align?: "left" | "right" | "center"
}

// ---------------------------------------------------------------------------
// Skeleton rows
// ---------------------------------------------------------------------------

function SkeletonRows({
  columns,
  rows = 8,
}: {
  columns: number
  rows?: number
}) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRow key={i} className="hover:bg-transparent">
          {Array.from({ length: columns }).map((_, j) => (
            <TableCell key={j}>
              <Skeleton className="h-4 w-full" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  )
}

// ---------------------------------------------------------------------------
// Pagination controls
// ---------------------------------------------------------------------------

interface PaginationControlsProps {
  page: number
  totalPages: number
  pageSize: number
  total: number
  hasPrev: boolean
  hasNext: boolean
  isFetching: boolean
  onPrev: () => void
  onNext: () => void
  onPageSizeChange?: (size: number) => void
  pageSizeOptions?: number[]
}

function PaginationControls({
  page,
  totalPages,
  total,
  hasPrev,
  hasNext,
  isFetching,
  onPrev,
  onNext,
  onPageSizeChange,
  pageSizeOptions = [25, 50, 100],
  pageSize,
}: PaginationControlsProps) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  return (
    <div className="flex items-center justify-between px-4 py-2.5 border-t border-border/40 bg-muted/20">
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">
          {total === 0 ? "0 results" : `${from}–${to} of ${total}`}
        </span>
        {isFetching && (
          <Loader2
            className="h-3 w-3 animate-spin text-muted-foreground"
            aria-label="Loading"
          />
        )}
      </div>

      <div className="flex items-center gap-2">
        {onPageSizeChange && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground hidden sm:inline">
              Rows per page:
            </span>
            <select
              className="text-xs border border-border rounded-md px-1.5 py-0.5 bg-background text-foreground"
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              aria-label="Rows per page"
            >
              {pageSizeOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        )}

        <span className="text-xs text-muted-foreground hidden sm:inline">
          Page {page} of {totalPages}
        </span>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={onPrev}
            disabled={!hasPrev || isFetching}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={onNext}
            disabled={!hasNext || isFetching}
            aria-label="Next page"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// PaginatedDataTable — public API
// ---------------------------------------------------------------------------

interface PaginatedDataTableProps<TRow> {
  /** Pagination state and handlers from usePaginatedQuery. */
  pagination: OffsetPaginationResult<TRow>
  /** Column definitions. */
  columns: ColumnDef<TRow>[]
  /** Called when a row is clicked. Optional. */
  onRowClick?: (row: TRow) => void
  /** Empty state heading. Default: "No records found". */
  emptyHeading?: string
  emptyDescription?: string
  /** Optional action for the empty state (e.g. "Add your first record"). */
  emptyAction?: { label: string; onClick: () => void }
  /** Number of skeleton rows shown during initial load. Default: 8. */
  skeletonRows?: number
  /** Allow callers to override page size choices. */
  pageSizeOptions?: number[]
  /** Whether to show the page-size selector. Default: false. */
  showPageSizeSelector?: boolean
  className?: string
  /** Optional row-level className function for conditional row styling. */
  rowClassName?: (row: TRow) => string
}

/**
 * Tier 2 — PaginatedDataTable
 *
 * The canonical paginated list component. Wraps the Tier 1 Table primitives
 * with a unified loading skeleton, error state, empty state, and pagination
 * controls. Used by every module's list view.
 *
 * Paired with `usePaginatedQuery` from `@/hooks/usePaginatedQuery`.
 *
 * Example:
 * ```tsx
 * const pagination = usePaginatedQuery({
 *   queryKey: ['patients', date],
 *   queryFn: ({ page, pageSize }) => apiClient.get(`/patient-care/patients?page=${page}&pageSize=${pageSize}&date=${date}`),
 * })
 *
 * <PaginatedDataTable
 *   pagination={pagination}
 *   columns={columns}
 *   onRowClick={(p) => setSelected(p)}
 *   emptyHeading="No patients today"
 *   emptyDescription="Use Add Patient to register a new patient."
 *   emptyAction={{ label: 'Add Patient', onClick: () => setShowAdd(true) }}
 * />
 * ```
 */
export function PaginatedDataTable<TRow>({
  pagination,
  columns,
  onRowClick,
  emptyHeading = "No records found",
  emptyDescription,
  emptyAction,
  skeletonRows = 8,
  pageSizeOptions,
  showPageSizeSelector = false,
  className,
  rowClassName,
}: PaginatedDataTableProps<TRow>) {
  const {
    data,
    isLoading,
    isFetching,
    isError,
    error,
    page,
    pageSize,
    totalPages,
    total,
    hasPrev,
    hasNext,
    setPage,
    setPageSize,
    refetch,
  } = pagination

  if (isError) {
    return <ErrorState error={error} onRetry={refetch} className={className} />
  }

  const showPagination = total > 0 || isFetching

  return (
    <div
      className={cn(
        "rounded-xl border border-border/60 bg-white overflow-hidden shadow-sm",
        className,
      )}
    >
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50 border-b border-border/60">
            {columns.map((col) => (
              <TableHead
                key={col.key}
                className={cn(
                  "font-semibold text-[11px] uppercase tracking-wider text-muted-foreground",
                  col.align === "right" && "text-right",
                  col.align === "center" && "text-center",
                  col.className,
                )}
              >
                {col.header ?? col.key}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <SkeletonRows columns={columns.length} rows={skeletonRows} />
          ) : data.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={columns.length} className="p-0">
                <EmptyState
                  heading={emptyHeading}
                  description={emptyDescription}
                  action={emptyAction}
                />
              </TableCell>
            </TableRow>
          ) : (
            data.map((row, i) => (
              <TableRow
                key={i}
                className={cn(
                  onRowClick &&
                    "cursor-pointer hover:bg-primary/[0.02] transition-colors",
                  rowClassName?.(row),
                )}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((col) => (
                  <TableCell
                    key={col.key}
                    className={cn(
                      col.align === "right" && "text-right",
                      col.align === "center" && "text-center",
                      col.className,
                    )}
                  >
                    {col.cell(row, i)}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {showPagination && (
        <PaginationControls
          page={page}
          totalPages={totalPages}
          pageSize={pageSize}
          total={total}
          hasPrev={hasPrev}
          hasNext={hasNext}
          isFetching={isFetching && !isLoading}
          onPrev={() => setPage(page - 1)}
          onNext={() => setPage(page + 1)}
          onPageSizeChange={showPageSizeSelector ? setPageSize : undefined}
          pageSizeOptions={pageSizeOptions}
        />
      )}
    </div>
  )
}
