/**
 * Data-access layer for the billing module.
 *
 * Tables owned by this module:
 *   - Prescription  — read for billing details (written by patient-care module)
 *   - InvoiceItem   — invoice line items against a Prescription
 *   - Payment       — payments against a Prescription
 *
 * NOTE: Billing creation flows live in patient-care (createPrescriptionWithBilling,
 * addServiceToPatient). This module handles read, payment-recording, and payment-void.
 *
 * Every query MUST include .eq('hospital_id', hospitalId) (ADR-007).
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export class BillingRepository {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly hospitalId: string,
  ) {}

  // Phase 7: implement getDailySummary(date), listPrescriptions(date, page, pageSize),
  // getPrescriptionById(id), recordPayment(prescriptionId, data), voidPayment(prescriptionId, payId)
}
