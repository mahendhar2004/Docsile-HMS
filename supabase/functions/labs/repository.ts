/**
 * Tables owned by the labs module:
 *   - Lab                — lab center records (soft-delete)
 *   - LabInvestigation   — many-to-many: Lab ↔ InvestigationMaster (CASCADE on both)
 *   - InvestigationMaster — investigation master data
 *   - LabBill            — bills for lab tests ordered
 *   - LabBillItem        — line items on LabBill (CASCADE)
 *   - LabPayment         — payments against LabBill (CASCADE)
 *
 * Every query scoped by hospitalId (ADR-007). Phase 7 fills in implementations.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
export class LabsRepository {
  constructor(private readonly supabase: SupabaseClient, private readonly hospitalId: string) {}
}
