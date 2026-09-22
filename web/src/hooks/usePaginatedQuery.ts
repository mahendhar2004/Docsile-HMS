import { useState, useCallback } from "react"
import {
  useQuery,
  useInfiniteQuery,
  keepPreviousData,
  type UseQueryOptions,
  type InfiniteData,
} from "@tanstack/react-query"
import type { ApiEnvelope, ApiMeta } from "@/lib/api-client"

// ---------------------------------------------------------------------------
// Offset-based pagination hook
// ---------------------------------------------------------------------------

export interface OffsetPaginationState {
  page: number
  pageSize: number
}

export interface OffsetPaginationResult<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  hasPrev: boolean
  hasNext: boolean
  isLoading: boolean
  isFetching: boolean
  isError: boolean
  error: unknown
  setPage: (page: number) => void
  setPageSize: (size: number) => void
  refetch: () => void
}

interface UsePaginatedQueryOptions<T> {
  queryKey: readonly unknown[]
  queryFn: (pagination: OffsetPaginationState) => Promise<ApiEnvelope<T[]>>
  initialPage?: number
  initialPageSize?: number
  /** Extra options forwarded to useQuery (except queryKey and queryFn). */
  queryOptions?: Omit<
    UseQueryOptions<ApiEnvelope<T[]>>,
    "queryKey" | "queryFn" | "placeholderData"
  >
}

/**
 * Offset/page-based pagination hook.
 *
 * Wraps TanStack Query's useQuery with keepPreviousData so the table never
 * goes blank while a new page is loading. Page numbers are 1-indexed in the
 * UI and passed directly to the queryFn.
 *
 * Use for: patient lists (date-scoped), inpatient lists, pharmacy stock,
 * lab orders, insurance claims, call logs, follow-ups, expenses.
 */
export function usePaginatedQuery<T>({
  queryKey,
  queryFn,
  initialPage = 1,
  initialPageSize = 50,
  queryOptions,
}: UsePaginatedQueryOptions<T>): OffsetPaginationResult<T> {
  const [page, setPage] = useState(initialPage)
  const [pageSize, setPageSize] = useState(initialPageSize)

  const paginationState: OffsetPaginationState = { page, pageSize }

  const result = useQuery<ApiEnvelope<T[]>>({
    queryKey: [...queryKey, { page, pageSize }],
    queryFn: () => queryFn(paginationState),
    placeholderData: keepPreviousData,
    ...queryOptions,
  })

  const meta: ApiMeta = result.data?.meta ?? {}
  const items: T[] = result.data?.data ?? []
  const total = meta.total ?? items.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const handleSetPage = useCallback(
    (newPage: number) => setPage(Math.max(1, Math.min(newPage, totalPages))),
    [totalPages],
  )

  const handleSetPageSize = useCallback((size: number) => {
    setPageSize(size)
    setPage(1)
  }, [])

  return {
    data: items,
    total,
    page,
    pageSize,
    totalPages,
    hasPrev: page > 1,
    hasNext: page < totalPages,
    isLoading: result.isLoading,
    isFetching: result.isFetching,
    isError: result.isError,
    error: result.error,
    setPage: handleSetPage,
    setPageSize: handleSetPageSize,
    refetch: () => void result.refetch(),
  }
}

// ---------------------------------------------------------------------------
// Cursor-based pagination hook
// ---------------------------------------------------------------------------

interface UseCursorQueryOptions<T> {
  queryKey: readonly unknown[]
  queryFn: (cursor: string | null, limit: number) => Promise<ApiEnvelope<T[]>>
  limit?: number
  /** Extra useInfiniteQuery options (queryKey, queryFn, getNextPageParam, and
   * initialPageParam are managed by this hook — do not pass them here). */
  queryOptions?: Record<string, unknown>
}

export interface CursorQueryResult<T> {
  /** All items across all loaded pages. */
  data: T[]
  hasNextPage: boolean
  fetchNextPage: () => void
  isFetchingNextPage: boolean
  isLoading: boolean
  isError: boolean
  error: unknown
  refetch: () => void
}

/**
 * Cursor-based infinite-scroll pagination hook.
 *
 * Wraps TanStack Query's useInfiniteQuery. Each page's cursor comes from
 * the API response's `meta.cursor` field. Accumulates all pages into a flat
 * `data` array.
 *
 * Use for: patient search (unbounded), reports patient search.
 */
export function useCursorQuery<T>({
  queryKey,
  queryFn,
  limit = 10,
  queryOptions,
}: UseCursorQueryOptions<T>): CursorQueryResult<T> {
  const result = useInfiniteQuery({
    queryKey: [...queryKey, { limit }],
    queryFn: ({ pageParam }: { pageParam: string | null }) =>
      queryFn(pageParam, limit),
    getNextPageParam: (lastPage: ApiEnvelope<T[]>) =>
      lastPage.meta?.cursor ?? null,
    initialPageParam: null as string | null,
    ...(queryOptions ?? {}),
  })

  const pages = (result.data as InfiniteData<ApiEnvelope<T[]>> | undefined)
    ?.pages ?? []
  const data = pages.flatMap((p) => p.data)

  return {
    data,
    hasNextPage: result.hasNextPage,
    fetchNextPage: () => void result.fetchNextPage(),
    isFetchingNextPage: result.isFetchingNextPage,
    isLoading: result.isLoading,
    isError: result.isError,
    error: result.error,
    refetch: () => void result.refetch(),
  }
}
