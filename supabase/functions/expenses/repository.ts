/**
 * ExpensesRepository — data-access layer for the expenses module.
 *
 * Tables:
 *   ExpenseCategory  — category catalog; RESTRICT delete if expenses are linked
 *   Expense          — individual expense records
 *
 * Every query is scoped by hospital_id per ADR-007.
 * No business logic here — only reads and writes to the datastore.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ExpenseCategoryRow, ExpenseRow } from './types.ts';

export class ExpensesRepository {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly hospitalId: string,
  ) {}

  // ── ExpenseCategory ────────────────────────────────────────────────────────

  /** Count all ExpenseCategory rows for this hospital (used for seed idempotency). */
  async countCategories(): Promise<number> {
    const { count, error } = await this.supabase
      .from('ExpenseCategory')
      .select('*', { count: 'exact', head: true })
      .eq('hospital_id', this.hospitalId);
    if (error) throw error;
    return count ?? 0;
  }

  /** Bulk insert the seed categories for this hospital. */
  async bulkInsertCategories(
    categories: Array<{
      name: string;
      color: string;
      sortOrder: number;
      hospital_id: string;
      createdBy: string;
      createdAt: string;
      updatedAt: string;
    }>,
  ): Promise<void> {
    const { error } = await this.supabase.from('ExpenseCategory').insert(categories);
    if (error) throw error;
  }

  /** List all active categories for this hospital, ordered by sortOrder then name. */
  async findAllCategories(): Promise<ExpenseCategoryRow[]> {
    const { data, error } = await this.supabase
      .from('ExpenseCategory')
      .select('*')
      .eq('hospital_id', this.hospitalId)
      .eq('isActive', true)
      .order('sortOrder', { ascending: true })
      .order('name', { ascending: true });
    if (error) throw error;
    return (data ?? []) as ExpenseCategoryRow[];
  }

  /** Find a single active category by id scoped to this hospital. */
  async findCategoryById(id: string): Promise<ExpenseCategoryRow | null> {
    const { data, error } = await this.supabase
      .from('ExpenseCategory')
      .select('*')
      .eq('hospital_id', this.hospitalId)
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data as ExpenseCategoryRow | null;
  }

  /** Return the highest sortOrder value for this hospital's categories (0 if none). */
  async findMaxSortOrder(): Promise<number> {
    const { data, error } = await this.supabase
      .from('ExpenseCategory')
      .select('sortOrder')
      .eq('hospital_id', this.hospitalId)
      .order('sortOrder', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return (data as { sortOrder: number } | null)?.sortOrder ?? 0;
  }

  /** Insert a new ExpenseCategory and return the created row. */
  async insertCategory(payload: {
    name: string;
    color: string;
    sortOrder: number;
    hospital_id: string;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
  }): Promise<ExpenseCategoryRow> {
    const { data, error } = await this.supabase
      .from('ExpenseCategory')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data as ExpenseCategoryRow;
  }

  /**
   * Apply a partial update to a category. Caller is responsible for including
   * updatedAt in the payload.
   */
  async updateCategory(id: string, payload: Record<string, unknown>): Promise<void> {
    const { error } = await this.supabase
      .from('ExpenseCategory')
      .update(payload)
      .eq('hospital_id', this.hospitalId)
      .eq('id', id);
    if (error) throw error;
  }

  /** Hard-delete a category by id (FK RESTRICT — caller must verify no linked expenses). */
  async deleteCategoryById(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('ExpenseCategory')
      .delete()
      .eq('hospital_id', this.hospitalId)
      .eq('id', id);
    if (error) throw error;
  }

  /** Count Expense rows linked to a given category (for the RESTRICT delete guard). */
  async countExpensesForCategory(categoryId: string): Promise<number> {
    const { count, error } = await this.supabase
      .from('Expense')
      .select('*', { count: 'exact', head: true })
      .eq('hospital_id', this.hospitalId)
      .eq('categoryId', categoryId);
    if (error) throw error;
    return count ?? 0;
  }

  /**
   * Bulk update sortOrder for a set of categories.
   * Runs all updates concurrently; each is scoped to this hospital.
   */
  async updateCategoryOrders(updates: { id: string; sortOrder: number }[]): Promise<void> {
    const now = new Date().toISOString();
    await Promise.all(
      updates.map(({ id, sortOrder }) =>
        this.supabase
          .from('ExpenseCategory')
          .update({ sortOrder, updatedAt: now })
          .eq('hospital_id', this.hospitalId)
          .eq('id', id)
      ),
    );
  }

  // ── Expense ────────────────────────────────────────────────────────────────

  /**
   * List expenses in an optional date range, joined with their category.
   * Mirrors the old getExpensesByDateRange filter logic exactly:
   *   startDate → date >= startDate at midnight UTC
   *   endDate   → date <= endDate at 23:59:59 UTC
   */
  async findExpenses(startDate?: string, endDate?: string): Promise<ExpenseRow[]> {
    let query = this.supabase
      .from('Expense')
      .select('*, category:ExpenseCategory(*)')
      .eq('hospital_id', this.hospitalId);

    if (startDate) {
      query = query.gte('date', new Date(startDate).toISOString());
    }
    if (endDate) {
      query = query.lte('date', new Date(`${endDate}T23:59:59`).toISOString());
    }

    const { data, error } = await query.order('date', { ascending: false });
    if (error) throw error;
    return (data ?? []) as ExpenseRow[];
  }

  /** Find a single expense by id, joined with its category. */
  async findExpenseById(id: string): Promise<ExpenseRow | null> {
    const { data, error } = await this.supabase
      .from('Expense')
      .select('*, category:ExpenseCategory(*)')
      .eq('hospital_id', this.hospitalId)
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data as ExpenseRow | null;
  }

  /** Insert a new Expense and return the created row with its category. */
  async insertExpense(payload: {
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
  }): Promise<ExpenseRow> {
    const { data, error } = await this.supabase
      .from('Expense')
      .insert(payload)
      .select('*, category:ExpenseCategory(*)')
      .single();
    if (error) throw error;
    return data as ExpenseRow;
  }

  /**
   * Apply a partial update to an expense. Caller is responsible for including
   * updatedAt in the payload and converting date strings to ISO format.
   */
  async updateExpense(id: string, payload: Record<string, unknown>): Promise<void> {
    const { error } = await this.supabase
      .from('Expense')
      .update(payload)
      .eq('hospital_id', this.hospitalId)
      .eq('id', id);
    if (error) throw error;
  }

  /** Hard-delete an expense by id. */
  async deleteExpenseById(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('Expense')
      .delete()
      .eq('hospital_id', this.hospitalId)
      .eq('id', id);
    if (error) throw error;
  }
}
