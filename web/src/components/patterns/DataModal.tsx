import React from "react"
import { type UseQueryResult } from "@tanstack/react-query"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { ErrorState } from "./ErrorState"
import { EmptyState } from "./EmptyState"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ModalVariant = "sheet" | "dialog"

interface DataModalBaseProps<TData> {
  /** Whether the modal is open. */
  open: boolean
  /** Called when the modal requests to close. */
  onOpenChange: (open: boolean) => void
  /** Modal title shown in the header. */
  title: string
  /** "sheet" (slides from right) or "dialog" (centered). Default: "sheet". */
  variant?: ModalVariant
  /**
   * TanStack Query result object. DataModal drives its own loading/error/empty
   * states from this — callers do NOT need to handle loading or error.
   */
  query: UseQueryResult<TData | null | undefined>
  /**
   * Render prop that receives the resolved, non-null data.
   * Only called when data is defined and non-null.
   */
  children: (data: NonNullable<TData>) => React.ReactNode
  /**
   * Optional custom loading skeleton. If not provided, DataModal renders
   * a generic vertical skeleton.
   */
  loadingSkeleton?: React.ReactNode
  /**
   * Optional empty state heading. Shown when query succeeds but data is
   * null or undefined. Default: "No data available".
   */
  emptyHeading?: string
  emptyDescription?: string
  /** Width of the sheet side panel. Default: "md" (480px). */
  sheetSize?: "sm" | "md" | "lg" | "xl"
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SHEET_WIDTH: Record<NonNullable<DataModalBaseProps<unknown>["sheetSize"]>, string> = {
  sm: "w-full sm:max-w-sm",
  md: "w-full sm:max-w-[480px]",
  lg: "w-full sm:max-w-[640px]",
  xl: "w-full sm:max-w-[800px]",
}

function DefaultSkeleton() {
  return (
    <div className="space-y-4 p-1" aria-busy aria-label="Loading">
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-5/6" />
      <div className="pt-4 space-y-3">
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Internal body — shared between Sheet and Dialog variants
// ---------------------------------------------------------------------------

function ModalBody<TData>({
  query,
  children,
  loadingSkeleton,
  emptyHeading = "No data available",
  emptyDescription,
}: Pick<
  DataModalBaseProps<TData>,
  "query" | "children" | "loadingSkeleton" | "emptyHeading" | "emptyDescription"
>) {
  if (query.isLoading || query.isFetching) {
    return loadingSkeleton ? <>{loadingSkeleton}</> : <DefaultSkeleton />
  }

  if (query.isError) {
    return (
      <ErrorState
        error={query.error}
        onRetry={() => void query.refetch()}
      />
    )
  }

  const data = query.data
  if (data == null) {
    return (
      <EmptyState
        heading={emptyHeading}
        description={emptyDescription}
      />
    )
  }

  return <>{children(data as NonNullable<TData>)}</>
}

// ---------------------------------------------------------------------------
// DataModal — public API
// ---------------------------------------------------------------------------

/**
 * Tier 2 — DataModal
 *
 * The canonical modal component for all data-driven modals in this app.
 *
 * - Owns loading skeleton, error state, and empty state — callers never
 *   need to handle these inline.
 * - Accepts a TanStack Query result via `query` prop.
 * - Renders content via render prop `children(data)` — only called when
 *   data is available and non-null.
 * - Variant "sheet" (default): slides from the right, good for detail panels
 *   and edit forms.
 * - Variant "dialog": centered modal, good for confirmations and compact forms.
 *
 * Example:
 * ```tsx
 * <DataModal
 *   open={open}
 *   onOpenChange={setOpen}
 *   title="Patient Details"
 *   query={useQuery({ queryKey: [...], queryFn: ... })}
 * >
 *   {(patient) => <PatientDetailForm patient={patient} />}
 * </DataModal>
 * ```
 */
export function DataModal<TData>({
  open,
  onOpenChange,
  title,
  variant = "sheet",
  query,
  children,
  loadingSkeleton,
  emptyHeading,
  emptyDescription,
  sheetSize = "md",
}: DataModalBaseProps<TData>) {
  const body = (
    <ModalBody
      query={query}
      children={children}
      loadingSkeleton={loadingSkeleton}
      emptyHeading={emptyHeading}
      emptyDescription={emptyDescription}
    />
  )

  if (variant === "dialog") {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          {body}
        </DialogContent>
      </Dialog>
    )
  }

  // Default: sheet
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className={SHEET_WIDTH[sheetSize]}
        aria-label={title}
      >
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        <div className="mt-4 overflow-y-auto">{body}</div>
      </SheetContent>
    </Sheet>
  )
}
