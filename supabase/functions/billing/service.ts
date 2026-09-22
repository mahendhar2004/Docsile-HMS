/**
 * Billing service — business layer.
 *
 * Responsibilities:
 *   1. Resolve the optional ?date= param to today in IST when absent.
 *   2. Enforce ownership: every Prescription operation is scoped to session.hospitalId via
 *      the repository's mandatory .eq('hospital_id', ...) — ADR-007.
 *   3. Orchestrate multi-step mutations (insert payment + update prescription totals).
 *   4. Throw typed errors (NotFoundError) so the global handleError filter responds correctly.
 *
 * No DB calls live here — all data access goes through BillingRepository.
 * No permission logic lives here — requirePermission() is wired structurally in index.ts (ADR-002).
 * No PII in log calls — payment amounts are not logged alongside patient identifiers.
 */

import { getSupabaseClient } from '../_shared/supabase-client.ts';
import { BillingRepository } from './repository.ts';
import { NotFoundError } from '../_shared/errors.ts';
import type { Session } from '../_shared/auth.ts';
import type { RecordPaymentBody } from './types.ts';

// ─── Private helpers ──────────────────────────────────────────────────────────

/**
 * Return today's calendar date (YYYY-MM-DD) in IST (UTC+5:30).
 * IST offset = 5.5 hours ahead of UTC.
 */
function todayIST(): string {
  const now = new Date();
  const istNow = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  return istNow.toISOString().slice(0, 10);
}

// ─── Service functions ────────────────────────────────────────────────────────

/**
 * GET /billing/daily
 * Aggregates Prescription revenue totals for one IST calendar day.
 * Excludes CANCELLED prescriptions. "Revenue" = Prescription.total (subtotal minus discount).
 */
export async function getDailySummary(
  session: Session,
  date?: string,
): Promise<unknown> {
  const dateStr = date ?? todayIST();
  const repo = new BillingRepository(getSupabaseClient(), session.hospitalId);
  return repo.getDailySummary(dateStr);
}

/**
 * GET /billing/prescriptions
 * Paginated list of Prescriptions with billing summary fields.
 * Optionally filtered to a single IST calendar day via ?date=.
 */
export async function listPrescriptions(
  session: Session,
  query: { date?: string; page: number; pageSize: number },
): Promise<{ data: unknown[]; total: number }> {
  const repo = new BillingRepository(getSupabaseClient(), session.hospitalId);
  const offset = (query.page - 1) * query.pageSize;
  const { rows, count } = await repo.listPrescriptions({
    dateStr: query.date,
    offset,
    limit: query.pageSize,
  });
  return { data: rows, total: count };
}

/**
 * GET /billing/prescriptions/:id
 * Returns the Prescription with its InvoiceItems and Payments.
 * Throws 404 if the prescription does not exist or belongs to a different hospital.
 */
export async function getPrescriptionById(
  session: Session,
  id: string,
): Promise<unknown> {
  const repo = new BillingRepository(getSupabaseClient(), session.hospitalId);
  const result = await repo.getPrescriptionById(id);
  if (!result) {
    throw new NotFoundError('Prescription', id);
  }
  return result;
}

/**
 * POST /billing/prescriptions/:id/payments
 * Record an additional payment against a Prescription.
 * Updates Prescription.amountPaid and Prescription.balanceDue atomically
 * (select → insert → update — not a DB transaction, but failure at either step
 * is safe: a failed insert leaves no orphan, a failed amountPaid update will cause
 * drift which the admin can correct by voiding; acceptable for DOUBLE PRECISION
 * fields that are already a pre-existing antipattern per 4-datamodel.md §3.4).
 */
export async function recordPayment(
  session: Session,
  prescriptionId: string,
  body: RecordPaymentBody,
): Promise<unknown> {
  const repo = new BillingRepository(getSupabaseClient(), session.hospitalId);

  const prescription = await repo.findPrescription(prescriptionId);
  if (!prescription) {
    throw new NotFoundError('Prescription', prescriptionId);
  }

  const payment = await repo.insertPayment(
    prescriptionId,
    body.paymentMode,
    body.amount,
    session.id,
  );

  const newAmountPaid = (prescription.amountPaid ?? 0) + body.amount;
  const newBalanceDue = Math.max(0, (prescription.total ?? 0) - newAmountPaid);
  await repo.updatePrescriptionAmounts(prescriptionId, newAmountPaid, newBalanceDue);

  return payment;
}

/**
 * DELETE /billing/prescriptions/:id/payments/:payId
 * Void (hard-delete) a recorded payment and revert the Prescription totals.
 * Gated by billing:delete permission in index.ts (admin-only per openapi.yaml).
 *
 * Ownership chain enforced:
 *   1. Payment must exist.
 *   2. Payment.prescriptionId must match the :id path param.
 *   3. Prescription must exist and belong to session.hospitalId (ADR-007).
 */
export async function voidPayment(
  session: Session,
  prescriptionId: string,
  payId: string,
): Promise<void> {
  const repo = new BillingRepository(getSupabaseClient(), session.hospitalId);

  // Step 1: Locate the payment.
  const payment = await repo.findPayment(payId);
  if (!payment) {
    throw new NotFoundError('Payment', payId);
  }

  // Step 2: Confirm payment belongs to the prescription named in the path.
  if (payment.prescriptionId !== prescriptionId) {
    throw new NotFoundError('Payment', payId);
  }

  // Step 3: Confirm prescription belongs to this hospital (ADR-007 ownership guard).
  const prescription = await repo.findPrescription(prescriptionId);
  if (!prescription) {
    throw new NotFoundError('Prescription', prescriptionId);
  }

  // Step 4: Delete the payment row.
  await repo.deletePayment(payId);

  // Step 5: Revert Prescription totals.
  const newAmountPaid = Math.max(0, (prescription.amountPaid ?? 0) - payment.amount);
  const newBalanceDue = (prescription.total ?? 0) - newAmountPaid;
  await repo.updatePrescriptionAmounts(prescriptionId, newAmountPaid, newBalanceDue);
}
