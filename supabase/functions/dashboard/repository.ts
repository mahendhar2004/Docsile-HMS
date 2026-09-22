/**
 * The dashboard module owns no tables — it is a read-aggregation module.
 *
 * Read-only from (for today's summary):
 *   - Patient, Prescription, InPatient, EyeReading, Appointment — today's stats
 *   - Expense, PharmacyBill, LabBill, OpticalBill               — today's revenue
 *
 * Read-only from (for quick stats):
 *   - Above tables — YTD and MTD aggregations
 *
 * Every query scoped by hospitalId (ADR-007). Phase 7 fills in implementations.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
export class DashboardRepository {
  constructor(private readonly supabase: SupabaseClient, private readonly hospitalId: string) {}
}
