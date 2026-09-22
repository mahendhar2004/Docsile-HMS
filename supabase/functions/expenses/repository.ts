/**
 * Tables owned by the expenses module:
 *   - ExpenseCategory   — category catalog (RESTRICT delete — cannot delete if expenses linked)
 *   - Expense           — expense records linked to a category
 *
 * Every query scoped by hospitalId (ADR-007). Phase 7 fills in implementations.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
export class ExpensesRepository {
  constructor(private readonly supabase: SupabaseClient, private readonly hospitalId: string) {}
}
