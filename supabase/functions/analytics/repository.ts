/**
 * The analytics module owns no tables — it is a read-aggregation module.
 *
 * Read-only from:
 *   - Patient, Prescription, InPatient, EyeReading — patient metrics
 *   - Expense, ExpenseCategory                      — expense breakdown
 *   - PharmacyBill, LabBill, OpticalBill            — revenue by category
 *   - HospitalProfile                               — hospital info for reports
 *
 * Rate limit: 30 req/min per user (enforced at API gateway / Supabase rate-limits).
 * Every query scoped by hospitalId (ADR-007). Phase 7 fills in implementations.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
export class AnalyticsRepository {
  constructor(private readonly supabase: SupabaseClient, private readonly hospitalId: string) {}
}
