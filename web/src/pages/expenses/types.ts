/**
 * Expense module types.
 *
 * Verified against:
 *   - OpenAPI /expenses/* schemas (ExpenseCategory, Expense)
 *   - supabase/functions/expenses/types.ts (ExpenseCategoryRow, ExpenseRow)
 *   - src/app/(hospital)/expenses/components/ExpensesPage.tsx (ExpenseWithCategory, TimeFilter)
 *   - src/app/(hospital)/expenses/components/ExpenseForm.tsx (form field names)
 */

// ─── Category ─────────────────────────────────────────────────────────────────

export interface ExpenseCategory {
  id: string
  name: string
  /** Hex color string — defaults to "#6B7280" on the server. */
  color: string
  sortOrder: number
  hospitalId: string
}

// ─── Expense ──────────────────────────────────────────────────────────────────

export interface Expense {
  id: string
  /** Expense description/title — DB column: title */
  title: string
  categoryId: string
  amount: number
  /** ISO date string YYYY-MM-DD */
  date: string
  reason: string | null
  paymentMode: string | null
  hospitalId: string
  createdAt: string
}

/** GET /expenses returns expenses with the category join populated. */
export interface ExpenseWithCategory extends Expense {
  category: ExpenseCategory
}

// ─── Time filter ──────────────────────────────────────────────────────────────

export type TimeFilter = "today" | "week" | "month" | "custom"

export const TIME_FILTER_OPTIONS: { value: TimeFilter; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "custom", label: "Custom Range" },
]

// ─── API input shapes ─────────────────────────────────────────────────────────

/** POST /expenses/categories  and  PATCH /expenses/categories/{id} */
export interface CategoryInput {
  name: string
  color: string
}

/**
 * POST /expenses  and  PATCH /expenses/{id}
 *
 * Fields verified against old ExpenseForm.tsx — paymentMode is NOT in the
 * create/edit form (matches old app exactly).
 */
export interface ExpenseInput {
  title: string
  categoryId: string
  amount: number
  date: string
  reason?: string
}

/**
 * PATCH /expenses/categories/reorder
 * Each element carries the new sortOrder (derived from array index at call site).
 */
export interface ReorderInput {
  order: { id: string; sortOrder: number }[]
}
