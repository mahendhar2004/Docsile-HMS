/**
 * Tables owned by the optical module:
 *   - OpticalProduct      — product catalog (soft-delete)
 *   - OpticalStock        — stock entries per product/batch/power (upsert)
 *   - OpticalBill         — bills for optical purchases
 *   - OpticalBillItem     — line items on OpticalBill (CASCADE)
 *
 * Read-only from:
 *   - HospitalProfile     — for print headers and optical settings
 *
 * Every query scoped by hospitalId (ADR-007). Phase 7 fills in implementations.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
export class OpticalRepository {
  constructor(private readonly supabase: SupabaseClient, private readonly hospitalId: string) {}
}
