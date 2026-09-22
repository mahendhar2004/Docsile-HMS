import { z } from 'zod';

// ── ExpenseCategory ──────────────────────────────────────────────────────────

/**
 * Input schema for creating/updating an ExpenseCategory.
 *
 * DB columns verified against supabase-migration.sql §23:
 *   name TEXT NOT NULL UNIQUE
 *   color TEXT NOT NULL DEFAULT '#6B7280'
 *   icon TEXT (nullable, not exposed via API)
 *   sortOrder INTEGER NOT NULL DEFAULT 0
 *   isActive BOOLEAN NOT NULL DEFAULT true
 */
export const ExpenseCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required'),
  color: z.string().nullable().optional(),
});
export type ExpenseCategoryInput = z.infer<typeof ExpenseCategorySchema>;

/** Full DB row shape returned to callers. */
export interface ExpenseCategoryRow {
  id: string;
  name: string;
  color: string;
  icon: string | null;
  sortOrder: number;
  isActive: boolean;
  hospital_id: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// ── Reorder ──────────────────────────────────────────────────────────────────

/**
 * Bulk reorder request body (openapi.yaml §/expenses/categories/reorder).
 * Each element supplies the new sortOrder for a category id — the server
 * writes each {id, sortOrder} pair directly rather than deriving position
 * from array index.
 */
export const ReorderCategoriesSchema = z.object({
  order: z.array(z.object({
    id: z.string().min(1, 'Category id is required'),
    sortOrder: z.number().int().nonnegative('sortOrder must be a non-negative integer'),
  })).min(1, 'At least one category entry is required'),
});
export type ReorderCategoriesInput = z.infer<typeof ReorderCategoriesSchema>;

// ── Expense ──────────────────────────────────────────────────────────────────

/**
 * Input schema for creating/updating an Expense.
 *
 * DB columns verified against supabase-migration.sql §24:
 *   title TEXT NOT NULL        (NOTE: openapi.yaml schema named it "description"
 *                               but the real DB column is "title" — using DB name)
 *   categoryId TEXT NOT NULL
 *   amount DOUBLE PRECISION NOT NULL
 *   date TIMESTAMPTZ NOT NULL
 *   reason TEXT (nullable)     (NOTE: scaffold had this as "notes" — incorrect)
 *   paymentMode TEXT (nullable)
 */
export const ExpenseSchema = z.object({
  title: z.string().min(1, 'Expense title is required'),
  categoryId: z.string().min(1, 'Category id is required'),
  amount: z.number().positive('Amount must be a positive number'),
  date: z.string().date('date must be a valid date (YYYY-MM-DD)'),
  reason: z.string().nullable().optional(),
  paymentMode: z.string().nullable().optional(),
});
export type ExpenseInput = z.infer<typeof ExpenseSchema>;

/** Full DB row shape returned to callers, with optional category join. */
export interface ExpenseRow {
  id: string;
  title: string;
  categoryId: string;
  amount: number;
  date: string;
  reason: string | null;
  paymentMode: string | null;
  hospital_id: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  category?: ExpenseCategoryRow;
}

// ── Query params ─────────────────────────────────────────────────────────────

export const ExpenseListQuerySchema = z.object({
  startDate: z.string().date('startDate must be a valid date (YYYY-MM-DD)').optional(),
  endDate: z.string().date('endDate must be a valid date (YYYY-MM-DD)').optional(),
});
export type ExpenseListQuery = z.infer<typeof ExpenseListQuerySchema>;
