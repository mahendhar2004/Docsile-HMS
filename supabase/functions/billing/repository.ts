/**
 * Data-access layer for the billing module.
 *
 * Tables accessed by this module:
 *   - Prescription  — read for billing details (written by patient-care module)
 *   - InvoiceItem   — invoice line items against a Prescription (child table, no hospital_id)
 *   - Payment       — payments against a Prescription (child table, no hospital_id)
 *
 * NOTE: Billing creation flows (createPrescriptionWithBilling, addServiceToPatient) live in
 * the patient-care module. This module handles read, additional payment-recording, and void.
 *
 * Every Prescription query MUST include .eq('hospital_id', this.hospitalId) (ADR-007).
 * InvoiceItem and Payment have no hospital_id — they are accessed through their parent FK.
 * Ownership of child rows is validated by verifying the parent Prescription belongs to this
 * hospital before operating on the child row.
 *
 * Revenue definition (confirmed from analytics/repository.ts and analytics/actions.ts):
 *   totalBilled    = SUM(Prescription.total)      — the billed amount (subtotal - discount)
 *   totalCollected = SUM(Prescription.amountPaid)  — what was actually received
 *   totalDues      = SUM(Prescription.balanceDue)  — still outstanding
 *   totalDiscount  = SUM(Prescription.discount)    — discount given
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { withId } from '../_shared/db-helpers.ts';

export interface DailySummary {
  date: string;
  totalPatients: number;
  totalPrescriptions: number;
  totalBilled: number;
  totalCollected: number;
  totalDues: number;
  totalDiscount: number;
}

export interface PrescriptionDetail {
  prescription: Record<string, unknown>;
  invoiceItems: Record<string, unknown>[];
  payments: Record<string, unknown>[];
}

/**
 * Convert a YYYY-MM-DD date string (as an IST calendar date) to UTC ISO bounds for DB queries.
 * IST is UTC+5:30 — IST midnight for a given date = UTC 18:30 of the previous calendar day.
 * Example: "2024-01-15" → from: "2024-01-14T18:30:00.000Z", to: "2024-01-15T18:29:59.999Z"
 */
function istDayBounds(dateStr: string): { from: string; to: string } {
  const from = new Date(`${dateStr}T00:00:00.000+05:30`).toISOString();
  const to = new Date(`${dateStr}T23:59:59.999+05:30`).toISOString();
  return { from, to };
}

export class BillingRepository {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly hospitalId: string,
  ) {}

  /**
   * Aggregate Prescription billing totals for a single IST calendar day.
   * Excludes CANCELLED prescriptions (matching the analytics module convention).
   */
  async getDailySummary(dateStr: string): Promise<DailySummary> {
    const { from, to } = istDayBounds(dateStr);

    const { data, error } = await this.supabase
      .from('Prescription')
      .select('patientId, total, amountPaid, balanceDue, discount')
      .eq('hospital_id', this.hospitalId)
      .gte('prescriptionDate', from)
      .lte('prescriptionDate', to)
      .neq('status', 'CANCELLED');

    if (error) {
      throw new Error(`getDailySummary query failed: ${error.message}`);
    }

    const rows = data ?? [];
    const uniquePatients = new Set(rows.map((r) => r.patientId)).size;

    return {
      date: dateStr,
      totalPatients: uniquePatients,
      totalPrescriptions: rows.length,
      totalBilled: rows.reduce((s, r) => s + (r.total ?? 0), 0),
      totalCollected: rows.reduce((s, r) => s + (r.amountPaid ?? 0), 0),
      totalDues: rows.reduce((s, r) => s + (r.balanceDue ?? 0), 0),
      totalDiscount: rows.reduce((s, r) => s + (r.discount ?? 0), 0),
    };
  }

  /**
   * Paginated list of Prescriptions with billing summary fields.
   * When dateStr is provided, filters to that IST calendar day.
   * Ordered by prescriptionDate DESC (most recent first).
   */
  async listPrescriptions(opts: {
    dateStr?: string;
    offset: number;
    limit: number;
  }): Promise<{ rows: Record<string, unknown>[]; count: number }> {
    let q = this.supabase
      .from('Prescription')
      .select(
        'id, prescriptionNumber, patientId, patientType, doctorName, department,' +
          ' total, amountPaid, balanceDue, discount, discountReason, status,' +
          ' prescriptionDate, paymentMode, createdAt',
        { count: 'exact' },
      )
      .eq('hospital_id', this.hospitalId)
      .order('prescriptionDate', { ascending: false })
      .range(opts.offset, opts.offset + opts.limit - 1);

    if (opts.dateStr) {
      const { from, to } = istDayBounds(opts.dateStr);
      q = q.gte('prescriptionDate', from).lte('prescriptionDate', to);
    }

    const { data, count, error } = await q;
    if (error) {
      throw new Error(`listPrescriptions query failed: ${error.message}`);
    }
    return { rows: (data ?? []) as Record<string, unknown>[], count: count ?? 0 };
  }

  /**
   * Fetch a single Prescription with its InvoiceItems and Payments.
   * Returns null if not found or if the prescription belongs to a different hospital.
   */
  async getPrescriptionById(id: string): Promise<PrescriptionDetail | null> {
    const [prescriptionRes, itemsRes, paymentsRes] = await Promise.all([
      this.supabase
        .from('Prescription')
        .select('*')
        .eq('id', id)
        .eq('hospital_id', this.hospitalId)
        .maybeSingle(),
      this.supabase
        .from('InvoiceItem')
        .select('id, prescriptionId, description, category, quantity, unitPrice, amount, sortOrder')
        .eq('prescriptionId', id)
        .order('sortOrder', { ascending: true }),
      this.supabase
        .from('Payment')
        .select('id, prescriptionId, amount, paymentMode, paymentRef, receivedBy, paymentDate, notes')
        .eq('prescriptionId', id)
        .order('paymentDate', { ascending: true }),
    ]);

    if (prescriptionRes.error) {
      throw new Error(`getPrescriptionById query failed: ${prescriptionRes.error.message}`);
    }
    if (!prescriptionRes.data) return null;

    return {
      prescription: prescriptionRes.data as Record<string, unknown>,
      invoiceItems: (itemsRes.data ?? []) as Record<string, unknown>[],
      payments: (paymentsRes.data ?? []) as Record<string, unknown>[],
    };
  }

  /**
   * Find a Prescription by id, scoped to this hospital.
   * Returns a minimal row with the billing amount fields needed for payment math.
   * Returns null if not found or belongs to a different hospital.
   */
  async findPrescription(id: string): Promise<{
    id: string;
    amountPaid: number;
    total: number;
    balanceDue: number;
  } | null> {
    const { data, error } = await this.supabase
      .from('Prescription')
      .select('id, amountPaid, total, balanceDue')
      .eq('id', id)
      .eq('hospital_id', this.hospitalId)
      .maybeSingle();

    if (error) throw new Error(`findPrescription query failed: ${error.message}`);
    return data;
  }

  /**
   * Insert a Payment row against a Prescription.
   * The caller is responsible for verifying prescription ownership and updating totals.
   */
  async insertPayment(
    prescriptionId: string,
    paymentMode: string,
    amount: number,
    receivedBy: string,
  ): Promise<Record<string, unknown>> {
    const { data, error } = await this.supabase
      .from('Payment')
      .insert(withId({
        prescriptionId,
        amount,
        paymentMode,
        receivedBy,
        paymentDate: new Date().toISOString(),
      }))
      .select('id, prescriptionId, amount, paymentMode, paymentRef, receivedBy, paymentDate, notes')
      .single();

    if (error) throw new Error(`insertPayment failed: ${error.message}`);
    return data as Record<string, unknown>;
  }

  /**
   * Update Prescription.amountPaid and balanceDue after a payment change (add or void).
   * Scoped by hospital_id per ADR-007.
   */
  async updatePrescriptionAmounts(
    id: string,
    amountPaid: number,
    balanceDue: number,
  ): Promise<void> {
    const { error } = await this.supabase
      .from('Prescription')
      .update({
        amountPaid,
        balanceDue,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('hospital_id', this.hospitalId);

    if (error) throw new Error(`updatePrescriptionAmounts failed: ${error.message}`);
  }

  /**
   * Find a Payment by id.
   * Payment has no hospital_id column (it is a child of Prescription).
   * The caller must verify that payment.prescriptionId matches the requested prescriptionId,
   * and then separately verify that the parent Prescription belongs to this hospital via
   * findPrescription() before deleting.
   */
  async findPayment(payId: string): Promise<{
    id: string;
    amount: number;
    prescriptionId: string;
  } | null> {
    const { data, error } = await this.supabase
      .from('Payment')
      .select('id, amount, prescriptionId')
      .eq('id', payId)
      .maybeSingle();

    if (error) throw new Error(`findPayment query failed: ${error.message}`);
    return data;
  }

  /** Hard-delete a Payment row by id. */
  async deletePayment(payId: string): Promise<void> {
    const { error } = await this.supabase
      .from('Payment')
      .delete()
      .eq('id', payId);

    if (error) throw new Error(`deletePayment failed: ${error.message}`);
  }
}
