import React from "react"
import { ChevronLeft, ChevronRight, AlertCircle, RefreshCw } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { DataTable } from "./data-table"
import type { ColumnDef, DataTableVariant } from "./data-table"

// Re-export so consumers can import ColumnDef from either file
export type { ColumnDef, DataTableVariant }

// ---------------------------------------------------------------------------
// Internal: Skeleton rows
// ---------------------------------------------------------------------------

function SkeletonRows({
  columns,
  rows,
  hasActions,
}: {
  columns: number
  rows: number
  hasActions: boolean
}) {
  const totalCols = columns + (hasActions ? 1 : 0)
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        // Suppress "key" exhaustive-deps lint — index is fine for static skeleton
        // eslint-disable-next-line react/no-array-index-key
        <TableRow key={i} className="hover:bg-transparent">
          {Array.from({ length: totalCols }).map((_, j) => (
            // eslint-disable-next-line react/no-array-index-key
            <TableCell key={j} className="px-4 py-3">
              <Skeleton className="h-4 w-full" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  )
}

// ---------------------------------------------------------------------------
// Internal: Skeleton header (mirrors real columns)
// ---------------------------------------------------------------------------

function SkeletonHeader({
  columns,
  hasActions,
}: {
  columns: number
  hasActions: boolean
}) {
  const totalCols = columns + (hasActions ? 1 : 0)
  return (
    <TableHeader>
      <TableRow className="hover:bg-transparent">
        {Array.from({ length: totalCols }).map((_, i) => (
          // eslint-disable-next-line react/no-array-index-key
          <TableHead key={i} className="px-4 py-2.5">
            <Skeleton className="h-3 w-16" />
          </TableHead>
        ))}
      </TableRow>
    </TableHeader>
  )
}

// ---------------------------------------------------------------------------
// Internal: Error state (inline, for within the table container)
// ---------------------------------------------------------------------------

function InlineErrorState({
  error,
  onRetry,
  colSpan,
}: {
  error: Error | null | unknown
  onRetry?: () => void
  colSpan: number
}) {
  const message =
    error instanceof Error ? error.message : "Something went wrong loading data."

  return (
    <TableRow className="hover:bg-transparent">
      <TableCell
        colSpan={colSpan}
        className="py-10 text-center"
      >
        <div className="flex flex-col items-center gap-3 text-[var(--color-muted-foreground)]">
          <AlertCircle className="h-8 w-8 text-[var(--color-error)] opacity-70" aria-hidden />
          <p className="text-sm font-medium text-[var(--color-foreground)]">
            Failed to load data
          </p>
          <p className="text-xs max-w-xs">{message}</p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className={cn(
                "mt-1 inline-flex items-center gap-1.5 rounded-md",
                "border border-[var(--color-border)] bg-white",
                "px-3 py-1.5 text-sm font-medium text-[var(--color-foreground)]",
                "hover:bg-[var(--color-muted)] transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]",
              )}
              aria-label="Retry loading data"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Try again
            </button>
          )}
        </div>
      </TableCell>
    </TableRow>
  )
}

// ---------------------------------------------------------------------------
// Internal: Default empty state (used when emptyState prop is not provided)
// ---------------------------------------------------------------------------

function DefaultEmptyState({ colSpan }: { colSpan: number }) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={colSpan} className="py-10 text-center">
        <p className="text-sm text-[var(--color-muted-foreground)]">
          No records found
        </p>
      </TableCell>
    </TableRow>
  )
}

// ---------------------------------------------------------------------------
// Internal: Offset pagination controls
// ---------------------------------------------------------------------------

interface OffsetPaginationControlsProps {
  page: number
  pageSize: number
  total: number
  totalPages: number
  hasPrev: boolean
  hasNext: boolean
  isFetching: boolean
  onPrev: () => void
  onNext: () => void
  onPageSizeChange?: (size: number) => void
  pageSizeOptions?: number[]
}

function OffsetPaginationControls({
  page,
  pageSize,
  total,
  totalPages,
  hasPrev,
  hasNext,
  isFetching,
  onPrev,
  onNext,
  onPageSizeChange,
  pageSizeOptions = [25, 50, 100],
}: OffsetPaginationControlsProps) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  return (
    <div
      className={cn(
        "flex items-center justify-between",
        "px-4 py-2.5 border-t border-[var(--color-border)]",
        "bg-[var(--color-muted)]/30",
      )}
      role="navigation"
      aria-label="Table pagination"
    >
      {/* Left: results summary */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-[var(--color-muted-foreground)]">
          {total === 0
            ? "No results"
            : `${from}–${to} of ${total.toLocaleString()}`}
        </span>
        {isFetching && (
          <span
            className="inline-block h-3 w-3 rounded-full border-2 border-[var(--color-primary)] border-t-transparent animate-spin"
            aria-label="Loading"
            role="status"
          />
        )}
      </div>

      {/* Right: page size selector + page nav */}
      <div className="flex items-center gap-3">
        {onPageSizeChange && (
          <div className="flex items-center gap-1.5">
            <span className="hidden sm:inline text-xs text-[var(--color-muted-foreground)]">
              Rows per page
            </span>
            <select
              className={cn(
                "text-xs border border-[var(--color-border)] rounded-[var(--radius-sm)]",
                "px-2 py-1 bg-white text-[var(--color-foreground)]",
                "focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]",
              )}
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

        <span className="hidden sm:inline text-xs text-[var(--color-muted-foreground)]">
          Page {page} of {totalPages}
        </span>

        <div className="flex items-center gap-1" role="group" aria-label="Page navigation">
          <PaginationButton
            onClick={onPrev}
            disabled={!hasPrev || isFetching}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
          </PaginationButton>
          <PaginationButton
            onClick={onNext}
            disabled={!hasNext || isFetching}
            aria-label="Next page"
          >
            <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          </PaginationButton>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Internal: Cursor pagination controls
// ---------------------------------------------------------------------------

interface CursorPaginationControlsProps {
  hasNextPage: boolean
  hasPreviousPage: boolean
  isFetching: boolean
  onLoadMore: () => void
  onLoadPrevious?: () => void
  itemCount?: number
  limit?: number
  /** When true, renders "Load more" instead of prev/next buttons */
  loadMoreMode?: boolean
}

function CursorPaginationControls({
  hasNextPage,
  hasPreviousPage,
  isFetching,
  onLoadMore,
  onLoadPrevious,
  itemCount,
  limit,
  loadMoreMode = false,
}: CursorPaginationControlsProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between",
        "px-4 py-2.5 border-t border-[var(--color-border)]",
        "bg-[var(--color-muted)]/30",
      )}
      role="navigation"
      aria-label="Table cursor navigation"
    >
      {/* Left: item count summary (no "of N" since cursor pagination doesn't know total) */}
      <div className="flex items-center gap-2">
        {typeof itemCount === "number" && (
          <span className="text-xs text-[var(--color-muted-foreground)]">
            {itemCount.toLocaleString()} item{itemCount !== 1 ? "s" : ""}
            {limit != null && ` (${limit} per page)`}
          </span>
        )}
        {isFetching && (
          <span
            className="inline-block h-3 w-3 rounded-full border-2 border-[var(--color-primary)] border-t-transparent animate-spin"
            aria-label="Loading"
            role="status"
          />
        )}
      </div>

      {/* Right: navigation controls */}
      <div className="flex items-center gap-2" role="group" aria-label="Cursor navigation">
        {loadMoreMode ? (
          // "Load more" pattern — no previous, just append more below
          <button
            type="button"
            onClick={onLoadMore}
            disabled={!hasNextPage || isFetching}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-[var(--radius-sm)]",
              "border border-[var(--color-border)] bg-white",
              "px-3 py-1.5 text-xs font-medium text-[var(--color-foreground)]",
              "hover:bg-[var(--color-muted)] transition-colors",
              "disabled:opacity-40 disabled:cursor-not-allowed",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]",
            )}
            aria-label="Load more results"
          >
            {isFetching ? "Loading…" : "Load more"}
          </button>
        ) : (
          // Prev / Next pattern — navigates by cursor but without page numbers
          <>
            {onLoadPrevious && (
              <PaginationButton
                onClick={onLoadPrevious}
                disabled={!hasPreviousPage || isFetching}
                aria-label="Previous results"
              >
                <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
              </PaginationButton>
            )}
            <PaginationButton
              onClick={onLoadMore}
              disabled={!hasNextPage || isFetching}
              aria-label="Next results"
            >
              <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            </PaginationButton>
          </>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Shared: small icon-button used by both pagination controls
// ---------------------------------------------------------------------------

function PaginationButton({
  children,
  onClick,
  disabled,
  "aria-label": ariaLabel,
}: {
  children: React.ReactNode
  onClick: () => void
  disabled: boolean
  "aria-label": string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={cn(
        "inline-flex items-center justify-center",
        "h-7 w-7 rounded-[var(--radius-sm)]",
        "border border-[var(--color-border)] bg-white",
        "text-[var(--color-foreground)]",
        "hover:bg-[var(--color-muted)] transition-colors",
        "disabled:opacity-40 disabled:cursor-not-allowed",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]",
      )}
    >
      {children}
    </button>
  )
}

// ---------------------------------------------------------------------------
// PaginatedDataTable — public props (discriminated union on `mode`)
// ---------------------------------------------------------------------------

/**
 * Props shared by both offset and cursor pagination modes.
 */
interface PaginatedDataTableBaseProps<TRow> {
  /** Row data. When `isLoading` is true this can be an empty array. */
  data: TRow[]
  /** Column definitions. See `ColumnDef<TRow>`. */
  columns: ColumnDef<TRow>[]
  /** Visual variant forwarded to the inner `DataTable`. Defaults to "standard". */
  variant?: DataTableVariant
  /**
   * Row actions render-prop (forwarded to `DataTable` when
   * `variant="with-row-actions"`).
   */
  rowActions?: (row: TRow, index: number) => React.ReactNode
  /** Row click handler. Forwarded to `DataTable`. */
  onRowClick?: (row: TRow, index: number) => void
  /** Per-row className override. Forwarded to `DataTable`. */
  rowClassName?: (row: TRow, index: number) => string | undefined

  // ---- Loading / error state ----
  /** True during the initial fetch (no data yet). Shows skeleton rows. */
  isLoading?: boolean
  /** True during background refetches (data visible, spinner shown). */
  isFetching?: boolean
  /** True when the query is in an error state. Shows an inline error message. */
  isError?: boolean
  /** Error object. Surfaced in the inline error message. */
  error?: Error | null | unknown
  /** Called when the user clicks "Try again" in the error state. */
  onRetry?: () => void

  // ---- Skeleton ----
  /** Number of skeleton rows shown during initial load. Defaults to 8. */
  skeletonRows?: number

  // ---- Empty state ----
  /**
   * Content to render when `data` is empty and not loading.
   * If not provided, a default "No records found" message is shown.
   * Wire in your feature's `<EmptyState>` component here once built.
   *
   * @example
   * emptyState={
   *   <EmptyState
   *     heading="No patients today"
   *     description="Register a new patient to get started."
   *     action={{ label: "Add Patient", onClick: () => setShowAdd(true) }}
   *   />
   * }
   */
  emptyState?: React.ReactNode

  // ---- Container ----
  /** Applied to the outermost container div. */
  className?: string
  /** Accessible label for the table element. */
  "aria-label"?: string
}

/**
 * **Offset pagination mode.**
 *
 * Use when the data set is date-scoped / bounded (e.g. today's patient list,
 * pharmacy stock, lab orders). Provides prev/next controls, a page-number
 * label, and an optional page-size selector.
 *
 * The caller owns the page state; pass `page`, `pageSize`, `total`, and
 * the `onPageChange` / `onPageSizeChange` callbacks directly. Typically
 * these come from a `usePaginatedQuery` hook result.
 *
 * @example
 * ```tsx
 * // With usePaginatedQuery:
 * const { data, isLoading, isFetching, isError, error, refetch,
 *         page, pageSize, total, hasPrev, hasNext, setPage, setPageSize } =
 *   usePaginatedQuery({ queryKey: ['patients', date], queryFn: fetchPatients })
 *
 * <PaginatedDataTable
 *   mode="offset"
 *   data={data}
 *   columns={columns}
 *   isLoading={isLoading}
 *   isFetching={isFetching}
 *   isError={isError}
 *   error={error}
 *   onRetry={refetch}
 *   page={page}
 *   pageSize={pageSize}
 *   total={total}
 *   onPageChange={setPage}
 *   onPageSizeChange={setPageSize}
 *   showPageSizeSelector
 *   emptyState={<MyEmptyState />}
 * />
 * ```
 */
interface OffsetPaginationMode {
  mode: "offset"
  /** Current page number (1-based). */
  page: number
  /** Rows per page. */
  pageSize: number
  /** Total number of rows across all pages (from the API response). */
  total: number
  /** Callback fired when the user navigates to a new page. */
  onPageChange: (page: number) => void
  /** Callback fired when the user changes the page size. */
  onPageSizeChange?: (pageSize: number) => void
  /** Page size choices shown in the selector. Defaults to [25, 50, 100]. */
  pageSizeOptions?: number[]
  /**
   * When true, renders the rows-per-page selector in the footer.
   * Defaults to false.
   */
  showPageSizeSelector?: boolean
}

/**
 * **Cursor pagination mode.**
 *
 * Use for unbounded / ever-growing data sets where the total count is
 * unknown or jumping to an arbitrary page is meaningless (e.g. patient
 * search across all history, audit logs). Exposes two sub-patterns:
 *
 * - **Load-more** (`loadMoreMode={true}`, default): appends more results
 *   below as the user scrolls / clicks "Load more". No previous button.
 *   Pairs with TanStack Query's `useInfiniteQuery`.
 *
 * - **Cursor prev/next** (`loadMoreMode={false}`): replaces the visible
 *   page on each navigation step (prev/next by cursor, no page numbers).
 *   Pairs with a `useCursorQuery` hook that tracks cursor state.
 *
 * In both sub-patterns there is intentionally NO page-number display,
 * because cursor-based pagination cannot jump to an arbitrary page.
 *
 * @example Load-more (infinite scroll-style):
 * ```tsx
 * const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError } =
 *   useInfiniteQuery({ ... })
 * const allRows = data?.pages.flatMap((p) => p.items) ?? []
 *
 * <PaginatedDataTable
 *   mode="cursor"
 *   loadMoreMode
 *   data={allRows}
 *   columns={columns}
 *   isLoading={isLoading}
 *   isFetching={isFetchingNextPage}
 *   isError={isError}
 *   hasNextPage={hasNextPage ?? false}
 *   hasPreviousPage={false}
 *   onLoadMore={fetchNextPage}
 *   itemCount={allRows.length}
 * />
 * ```
 *
 * @example Cursor prev/next:
 * ```tsx
 * const { data, cursor, hasNext, hasPrev, goNext, goPrev } = useCursorQuery({ ... })
 *
 * <PaginatedDataTable
 *   mode="cursor"
 *   data={data}
 *   columns={columns}
 *   hasNextPage={hasNext}
 *   hasPreviousPage={hasPrev}
 *   onLoadMore={goNext}
 *   onLoadPrevious={goPrev}
 *   itemCount={data.length}
 *   limit={50}
 * />
 * ```
 */
interface CursorPaginationMode {
  mode: "cursor"
  /** Whether more results are available after the current set. */
  hasNextPage: boolean
  /** Whether results are available before the current set. Defaults to false. */
  hasPreviousPage?: boolean
  /**
   * Called to fetch the next page / load more results.
   * In load-more mode this appends; in prev/next mode this replaces.
   */
  onLoadMore: () => void
  /**
   * Called to fetch the previous page (cursor prev/next mode only).
   * Not used in load-more mode.
   */
  onLoadPrevious?: () => void
  /** Number of items currently displayed. Shown in the footer summary. */
  itemCount?: number
  /** Items-per-page limit. Shown in the footer summary when provided. */
  limit?: number
  /**
   * When true (default), renders a "Load more" button and hides the previous
   * button. Set to false for a prev/next cursor navigation style.
   */
  loadMoreMode?: boolean
}

export type PaginatedDataTableProps<TRow> = PaginatedDataTableBaseProps<TRow> &
  (OffsetPaginationMode | CursorPaginationMode)

// ---------------------------------------------------------------------------
// PaginatedDataTable — component
// ---------------------------------------------------------------------------

/**
 * Tier 2 — PaginatedDataTable
 *
 * The canonical paginated list component. Wraps `DataTable` with:
 * - Skeleton loading (row-shaped, matching column count)
 * - Inline error state with retry
 * - Empty state (accepts a `emptyState` slot — pass your `<EmptyState />`
 *   component; falls back to a default "No records found" message)
 * - Pagination controls for BOTH offset mode and cursor mode
 *
 * See `OffsetPaginationMode` and `CursorPaginationMode` JSDoc above for
 * the full API and usage examples for each mode.
 */
export function PaginatedDataTable<TRow>(props: PaginatedDataTableProps<TRow>) {
  const {
    data,
    columns,
    variant = "standard",
    rowActions,
    onRowClick,
    rowClassName,
    isLoading = false,
    isFetching = false,
    isError = false,
    error,
    onRetry,
    skeletonRows = 8,
    emptyState,
    className,
    "aria-label": ariaLabel,
  } = props

  const hasActionsCol = variant === "with-row-actions" && rowActions != null
  const colCount = columns.length + (hasActionsCol ? 1 : 0)

  // ── Render: error state ─────────────────────────────────────────────────
  if (isError && !isLoading) {
    return (
      <div
        className={cn(
          "rounded-[var(--radius-lg)] border border-[var(--color-border)]",
          "bg-[var(--color-surface)] overflow-hidden shadow-[var(--shadow-xs)]",
          className,
        )}
      >
        <Table aria-label={ariaLabel} containerClassName="rounded-none">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {columns.map((col) => (
                <TableHead key={col.key}>{col.header ?? col.key}</TableHead>
              ))}
              {hasActionsCol && (
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            <InlineErrorState error={error} onRetry={onRetry} colSpan={colCount} />
          </TableBody>
        </Table>
      </div>
    )
  }

  // ── Render: main (loading / data / empty) ───────────────────────────────
  // Pagination mode-specific state
  const offsetMode = props.mode === "offset" ? props : null
  const cursorMode = props.mode === "cursor" ? props : null

  // Offset pagination derived values
  const totalPages = offsetMode
    ? Math.max(1, Math.ceil(offsetMode.total / offsetMode.pageSize))
    : 0
  const hasPrev = offsetMode ? offsetMode.page > 1 : false
  const hasNext = offsetMode ? offsetMode.page < totalPages : false

  const showPaginationFooter =
    isLoading ||
    (offsetMode != null && offsetMode.total > 0) ||
    (cursorMode != null && (data.length > 0 || cursorMode.hasNextPage))

  return (
    <div
      className={cn(
        "rounded-[var(--radius-lg)] border border-[var(--color-border)]",
        "bg-[var(--color-surface)] overflow-hidden shadow-[var(--shadow-xs)]",
        className,
      )}
    >
      {/* ── Loading skeleton ──────────────────────────────────────────── */}
      {isLoading ? (
        <Table aria-label={ariaLabel} containerClassName="rounded-none" aria-busy="true">
          <SkeletonHeader columns={columns.length} hasActions={hasActionsCol} />
          <TableBody>
            <SkeletonRows columns={columns.length} rows={skeletonRows} hasActions={hasActionsCol} />
          </TableBody>
        </Table>
      ) : data.length === 0 ? (
        /* ── Empty state ───────────────────────────────────────────────── */
        <Table aria-label={ariaLabel} containerClassName="rounded-none">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {columns.map((col) => (
                <TableHead key={col.key}>{col.header ?? col.key}</TableHead>
              ))}
              {hasActionsCol && (
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {emptyState ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={colCount} className="p-0">
                  {emptyState}
                </TableCell>
              </TableRow>
            ) : (
              <DefaultEmptyState colSpan={colCount} />
            )}
          </TableBody>
        </Table>
      ) : (
        /* ── Data rows ─────────────────────────────────────────────────── */
        <DataTable
          data={data}
          columns={columns}
          variant={variant}
          rowActions={rowActions}
          onRowClick={onRowClick}
          rowClassName={rowClassName}
          aria-label={ariaLabel}
        />
      )}

      {/* ── Pagination footer ────────────────────────────────────────── */}
      {showPaginationFooter && offsetMode != null && (
        <OffsetPaginationControls
          page={offsetMode.page}
          pageSize={offsetMode.pageSize}
          total={offsetMode.total}
          totalPages={totalPages}
          hasPrev={hasPrev}
          hasNext={hasNext}
          isFetching={isFetching && !isLoading}
          onPrev={() => offsetMode.onPageChange(offsetMode.page - 1)}
          onNext={() => offsetMode.onPageChange(offsetMode.page + 1)}
          onPageSizeChange={
            offsetMode.showPageSizeSelector ? offsetMode.onPageSizeChange : undefined
          }
          pageSizeOptions={offsetMode.pageSizeOptions}
        />
      )}

      {showPaginationFooter && cursorMode != null && (
        <CursorPaginationControls
          hasNextPage={cursorMode.hasNextPage}
          hasPreviousPage={cursorMode.hasPreviousPage ?? false}
          isFetching={isFetching && !isLoading}
          onLoadMore={cursorMode.onLoadMore}
          onLoadPrevious={cursorMode.onLoadPrevious}
          itemCount={cursorMode.itemCount}
          limit={cursorMode.limit}
          loadMoreMode={cursorMode.loadMoreMode ?? true}
        />
      )}
    </div>
  )
}
