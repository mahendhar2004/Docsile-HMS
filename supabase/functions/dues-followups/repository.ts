/**
 * The dues-followups module owns no tables — it is a read-aggregation module.
 *
 * Read-only from (for dues compilation):
 *   - Prescription   — outstanding OPD balances
 *   - InPatient      — outstanding inpatient balances
 *   - LabBill        — outstanding lab bills
 *   - PharmacyBill   — outstanding pharmacy bills
 *
 * Write to (for mark-paid):
 *   - Updates the appropriate balance field on Prescription / InPatient /
 *     LabBill / PharmacyBill based on the `type` discriminant.
 *
 * Read-only from (for lookups):
 *   - User (doctor list), HospitalProfile (hospital name)
 *
 * Every query scoped by hospitalId (ADR-007). Phase 7 fills in implementations.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
export class DuesFollowupsRepository {
  constructor(private readonly supabase: SupabaseClient, private readonly hospitalId: string) {}
}
