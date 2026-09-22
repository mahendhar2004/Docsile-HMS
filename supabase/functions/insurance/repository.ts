/**
 * Tables owned by the insurance module:
 *   - InsuranceCompany   — provider directory (soft-delete)
 *   - InsuranceClaim     — claims linked to InPatient admissions
 *   - InsurancePayment   — patient co-payments on a claim (CASCADE)
 *
 * Read-only from:
 *   - InPatient          — for inpatient search during claim creation
 *
 * Every query scoped by hospitalId (ADR-007). Phase 7 fills in implementations.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
export class InsuranceRepository {
  constructor(private readonly supabase: SupabaseClient, private readonly hospitalId: string) {}
}
