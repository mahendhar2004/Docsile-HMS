/**
 * Tables owned by the pharmacy module:
 *   - PharmacyMedicine   — medicine catalogue (soft-delete)
 *   - PharmacySupplier   — supplier records (soft-delete)
 *   - PharmacyStock      — stock batches with expiry and quantity
 *   - PurchaseOrder      — stock purchase orders
 *   - PurchaseOrderItem  — line items on purchase orders (CASCADE)
 *   - PharmacyBill       — bills issued at the pharmacy counter
 *   - PharmacyBillItem   — items on a pharmacy bill (CASCADE)
 *
 * Every query scoped by hospitalId (ADR-007). Phase 7 fills in implementations.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
export class PharmacyRepository {
  constructor(private readonly supabase: SupabaseClient, private readonly hospitalId: string) {}
}
