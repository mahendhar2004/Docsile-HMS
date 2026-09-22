/**
 * Expense module — query and mutation hooks.
 *
 * All hooks use the shared apiClient (cookie-based auth, auto-refresh on 401).
 * TanStack Query manages caching and invalidation — no manual refetch needed.
 *
 * Permissions consumed (cross-checked against openapi.yaml x-permission):
 *   expenses:view   — GET /expenses/categories, GET /expenses
 *   expenses:edit   — POST/PATCH/DELETE /expenses/categories, PATCH reorder, POST seed
 *   expenses:create — POST /expenses
 *   expenses:delete — DELETE /expenses/{id}
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type {
  ExpenseCategory,
  ExpenseWithCategory,
  CategoryInput,
  ExpenseInput,
  ReorderInput,
  TimeFilter,
} from "./types"

// ─── Query keys ───────────────────────────────────────────────────────────────

export const EXPENSE_QUERY_KEYS = {
  categories: ["expenses", "categories"] as const,
  /** Expenses keyed by date range so each range is cached independently. */
  expenses: (startDate: string, endDate: string) =>
    ["expenses", "list", startDate, endDate] as const,
} as const

// ─── Date range helper ────────────────────────────────────────────────────────

/** Convert TimeFilter + optional custom dates to ISO date strings. */
export function getDateRange(
  filter: TimeFilter,
  customStart: string,
  customEnd: string,
): { startDate: string; endDate: string } {
  const today = new Date()
  const pad = (n: number) => String(n).padStart(2, "0")
  const toISO = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  const todayStr = toISO(today)

  switch (filter) {
    case "today":
      return { startDate: todayStr, endDate: todayStr }
    case "week": {
      const d = new Date(today)
      d.setDate(d.getDate() - 7)
      return { startDate: toISO(d), endDate: todayStr }
    }
    case "month": {
      const d = new Date(today)
      d.setMonth(d.getMonth() - 1)
      return { startDate: toISO(d), endDate: todayStr }
    }
    case "custom":
      return {
        startDate: customStart || todayStr,
        endDate: customEnd || todayStr,
      }
  }
}

// ─── Categories ───────────────────────────────────────────────────────────────

/** GET /expenses/categories — ordered by sortOrder (x-permission: expenses:view) */
export function useCategories() {
  return useQuery({
    queryKey: EXPENSE_QUERY_KEYS.categories,
    queryFn: () =>
      apiClient
        .get<ExpenseCategory[]>("/expenses/categories")
        .then((e) => e.data),
    staleTime: 5 * 60 * 1000,
  })
}

/** POST /expenses/categories (x-permission: expenses:edit) */
export function useCreateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CategoryInput) =>
      apiClient.post("/expenses/categories", input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: EXPENSE_QUERY_KEYS.categories })
    },
  })
}

/** PATCH /expenses/categories/{id} (x-permission: expenses:edit) */
export function useUpdateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: CategoryInput }) =>
      apiClient.patch(`/expenses/categories/${id}`, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: EXPENSE_QUERY_KEYS.categories })
    },
  })
}

/** DELETE /expenses/categories/{id} (x-permission: expenses:edit) */
export function useDeleteCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/expenses/categories/${id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: EXPENSE_QUERY_KEYS.categories })
    },
  })
}

/**
 * PATCH /expenses/categories/reorder (x-permission: expenses:edit)
 * Body: { order: [{ id, sortOrder }] } — sortOrder is derived from array index at call site.
 */
export function useReorderCategories() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: ReorderInput) =>
      apiClient.patch("/expenses/categories/reorder", input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: EXPENSE_QUERY_KEYS.categories })
    },
  })
}

/** POST /expenses/categories/seed (x-permission: expenses:edit) — idempotent */
export function useSeedCategories() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => apiClient.post("/expenses/categories/seed"),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: EXPENSE_QUERY_KEYS.categories })
    },
  })
}

// ─── Expenses ─────────────────────────────────────────────────────────────────

/**
 * GET /expenses?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 * Returns expenses in the date range with category join.
 * x-permission: expenses:view
 */
export function useExpenses(startDate: string, endDate: string, enabled = true) {
  return useQuery({
    queryKey: EXPENSE_QUERY_KEYS.expenses(startDate, endDate),
    queryFn: () =>
      apiClient
        .get<ExpenseWithCategory[]>(
          `/expenses?startDate=${startDate}&endDate=${endDate}`,
        )
        .then((e) => e.data),
    enabled,
  })
}

/** POST /expenses (x-permission: expenses:create) */
export function useCreateExpense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: ExpenseInput) => apiClient.post("/expenses", input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["expenses", "list"] })
    },
  })
}

/** PATCH /expenses/{id} (x-permission: expenses:edit) */
export function useUpdateExpense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ExpenseInput }) =>
      apiClient.patch(`/expenses/${id}`, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["expenses", "list"] })
    },
  })
}

/** DELETE /expenses/{id} (x-permission: expenses:delete) */
export function useDeleteExpense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/expenses/${id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["expenses", "list"] })
    },
  })
}
