/**
 * The reports module owns no tables — it is a read-aggregation + export module.
 *
 * Read-only from:
 *   - Patient, Prescription, InPatient, EyeReading — patient history
 *   - LabBill, PharmacyBill, OpticalBill           — billing history
 *   - InsuranceClaim                               — insurance export
 *   - Expense                                      — expense export
 *
 * Export endpoints return up to 5000 rows; rate limit: 10 req/min per user.
 * Cursor-based search: limit defaults to 8.
 * Every query scoped by hospitalId (ADR-007). Phase 7 fills in implementations.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
export class ReportsRepository {
  constructor(private readonly supabase: SupabaseClient, private readonly hospitalId: string) {}
}
