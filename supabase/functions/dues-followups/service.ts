/**
 * dues-followups service — business layer.
 *
 * All hospital data is scoped via DuesFollowupsRepository(supabase, session.hospitalId).
 * PII (patient names, phone numbers, email addresses) must NEVER appear in log calls.
 * getDues aggregates across four tables: Prescription (OPD), InPatient (IPD),
 * LabBill (LAB), and PharmacyBill (PHARMACY) — sanctioned cross-table read per ADR-006 §8.10.
 * sendPatientEmail uses SITHA_API_URL + SITHA_API_KEY (env vars only, never hardcoded/logged).
 */

import type { Session } from '../_shared/auth.ts';
import { getSupabaseClient } from '../_shared/supabase-client.ts';
import { ServiceUnavailableError, ValidationError } from '../_shared/errors.ts';
import { DuesFollowupsRepository } from './repository.ts';
import type {
  DueRecord,
  DuesListQuery,
  EmailTemplate,
  FollowUpRecord,
  MarkPaidInput,
  SendEmailInput,
} from './types.ts';

// ─── getDues ─────────────────────────────────────────────────────────────────

/**
 * Aggregates outstanding balances across OPD, IPD, LAB, and PHARMACY tables.
 * All four tables are queried in parallel (ADR-007: each scoped by hospital_id).
 * Results are merged in memory, sorted by date descending, then paginated.
 */
export async function getDues(
  s: Session,
  q: DuesListQuery,
): Promise<{ data: DueRecord[]; total: number }> {
  const repo = new DuesFollowupsRepository(getSupabaseClient(), s.hospitalId);

  const [opd, ipd, lab, pharmacy] = await Promise.all([
    repo.getAllOPDDues(),
    repo.getAllIPDDues(),
    repo.getAllLABDues(),
    repo.getAllPharmacyDues(),
  ]);

  const all: DueRecord[] = [...opd, ...ipd, ...lab, ...pharmacy];
  // Sort by date descending (most recent due first)
  all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const total = all.length;
  const start = (q.page - 1) * q.pageSize;
  const data = all.slice(start, start + q.pageSize);

  return { data, total };
}

// ─── getFollowups ─────────────────────────────────────────────────────────────

/**
 * Returns all OPD and IPD follow-up records (non-null followUpDate).
 * Includes both upcoming and overdue follow-ups; callers use the `isOverdue` flag
 * to distinguish. Sorted by followUpDate ascending (soonest first), then paginated.
 */
export async function getFollowups(
  s: Session,
  q: DuesListQuery,
): Promise<{ data: FollowUpRecord[]; total: number }> {
  const repo = new DuesFollowupsRepository(getSupabaseClient(), s.hospitalId);

  const [opd, ipd] = await Promise.all([
    repo.getAllOPDFollowups(),
    repo.getAllIPDFollowups(),
  ]);

  const all: FollowUpRecord[] = [...opd, ...ipd];
  // Sort by followUpDate ascending (soonest first, matching old UI expectation)
  all.sort(
    (a, b) => new Date(a.followUpDate).getTime() - new Date(b.followUpDate).getTime(),
  );

  const total = all.length;
  const start = (q.page - 1) * q.pageSize;
  const data = all.slice(start, start + q.pageSize);

  return { data, total };
}

// ─── markPaid ────────────────────────────────────────────────────────────────

/**
 * Marks the specified due as fully paid.
 *
 * Behaviour per type (matching old markDueAsPaid action exactly):
 *   prescription  — Updates amountPaid/balanceDue on Prescription; inserts Payment.
 *   labBill       — Updates amountPaid/balanceDue/status/paymentDate on LabBill; inserts LabPayment.
 *   pharmacyBill  — Updates paidAmount/balanceDue/status on PharmacyBill (no payment record).
 *   inpatient     — Appends a payment record to InPatient.paymentRecords JSON array;
 *                   sets totalReceivedAmount = netAmount and balanceAmount = 0.
 *
 * Every lookup is scoped by hospital_id (prevents cross-tenant modification).
 */
export async function markPaid(
  s: Session,
  id: string,
  b: MarkPaidInput,
): Promise<void> {
  const repo = new DuesFollowupsRepository(getSupabaseClient(), s.hospitalId);
  const paymentMode = b.paymentMode ?? 'CASH';

  switch (b.type) {
    case 'prescription': {
      const rx = await repo.findPrescriptionForPaid(id);
      await repo.markPrescriptionPaid(id, rx.total, paymentMode, s.id);
      await repo.insertPayment({
        id: crypto.randomUUID(),
        prescriptionId: id,
        amount: rx.balanceDue,
        paymentMode,
        receivedBy: s.id,
      });
      break;
    }

    case 'labBill': {
      const lb = await repo.findLabBillForPaid(id);
      const effectivePaymentMode = lb.paymentMode || paymentMode;
      await repo.markLabBillPaid(id, lb.total, effectivePaymentMode);
      await repo.insertLabPayment({
        id: crypto.randomUUID(),
        labBillId: id,
        amount: lb.balanceDue,
        paymentMode: effectivePaymentMode,
        receivedBy: s.id,
      });
      break;
    }

    case 'pharmacyBill': {
      const pb = await repo.findPharmacyBillForPaid(id);
      await repo.markPharmacyBillPaid(id, pb.billAmount);
      break;
    }

    case 'inpatient': {
      const ip = await repo.findInpatientForPaid(id);

      let existingRecords: Array<{
        date: string;
        amountType: string;
        paymentMode: string;
        amount: number;
        notes?: string;
      }> = [];
      try {
        existingRecords = JSON.parse(ip.paymentRecords ?? '[]');
      } catch {
        existingRecords = [];
      }

      existingRecords.push({
        date: new Date().toISOString(),
        amountType: 'Final',
        paymentMode: paymentMode === 'CASH' ? 'Cash' : paymentMode,
        amount: ip.balanceAmount,
        notes: 'Marked as paid from Dues module',
      });

      await repo.markInpatientPaid(
        id,
        ip.netAmount,
        JSON.stringify(existingRecords),
        s.id,
      );
      break;
    }
  }
}

// ─── getDoctors ───────────────────────────────────────────────────────────────

/** Returns unique doctor names from Prescription for the hospital (for filter dropdowns). */
export async function getDoctors(s: Session): Promise<string[]> {
  const repo = new DuesFollowupsRepository(getSupabaseClient(), s.hospitalId);
  return repo.getDistinctDoctorNames();
}

// ─── getDepartments ───────────────────────────────────────────────────────────

/** Returns unique departments from Prescription for the hospital (for filter dropdowns). */
export async function getDepartments(s: Session): Promise<string[]> {
  const repo = new DuesFollowupsRepository(getSupabaseClient(), s.hospitalId);
  return repo.getDistinctDepartments();
}

// ─── getEmailTemplates ────────────────────────────────────────────────────────

/**
 * Fetches available email templates from the Sitha AI service.
 * Returns an empty array if SITHA_API_URL or SITHA_API_KEY are not configured —
 * this matches the old Next.js getAvailableTemplates() behavior which also returned
 * [] on missing config (no throw). Sitha API key is read from env, never hardcoded.
 */
export async function getEmailTemplates(_s: Session): Promise<EmailTemplate[]> {
  const sithaUrl = Deno.env.get('SITHA_API_URL');
  const sithaKey = Deno.env.get('SITHA_API_KEY');

  if (!sithaUrl || !sithaKey) return [];

  try {
    const res = await fetch(`${sithaUrl}/api/v1/templates`, {
      headers: { Authorization: `Bearer ${sithaKey}` },
    });
    if (!res.ok) return [];
    const data = await res.json() as { templates?: EmailTemplate[] };
    return data.templates ?? [];
  } catch {
    return [];
  }
}

// ─── getHospitalName ──────────────────────────────────────────────────────────

/**
 * Returns the hospital's display name (for email footers and letterheads).
 * Queries HospitalProfile by its own `id` — this table has NO hospital_id column.
 */
export async function getHospitalName(s: Session): Promise<string> {
  const repo = new DuesFollowupsRepository(getSupabaseClient(), s.hospitalId);
  const profile = await repo.getHospitalProfile();
  return profile.displayName ?? profile.name ?? 'Hospital';
}

// ─── sendEmail ────────────────────────────────────────────────────────────────

/**
 * Sends a follow-up email to a patient via the Sitha AI email service.
 *
 * The `patientId` in the request is the patient UHID (e.g. "P-001").
 * The service looks up the patient's email and name from the Patient table
 * (hospital-scoped), then calls the Sitha API.
 *
 * If SITHA_API_URL / SITHA_API_KEY are not configured → throws ServiceUnavailableError.
 * If the patient has no email on file → throws ValidationError.
 * If the Sitha API returns a non-OK response → throws ServiceUnavailableError.
 *
 * SECURITY: SITHA_API_KEY is read from env only — never hardcoded, never logged.
 * PII (patient name, email) never appears in log calls.
 */
export async function sendEmail(s: Session, b: SendEmailInput): Promise<void> {
  const sithaUrl = Deno.env.get('SITHA_API_URL');
  const sithaKey = Deno.env.get('SITHA_API_KEY');

  if (!sithaUrl || !sithaKey) {
    throw new ServiceUnavailableError(
      'Sitha email service',
      'SITHA_API_URL and SITHA_API_KEY are not configured. Set them via Supabase secrets.',
    );
  }

  const repo = new DuesFollowupsRepository(getSupabaseClient(), s.hospitalId);

  const patient = await repo.findPatientByUhid(b.patientId);
  if (!patient) {
    throw new ValidationError(
      `Patient with UHID "${b.patientId}" not found in this hospital.`,
    );
  }
  if (!patient.email) {
    throw new ValidationError(
      `Patient with UHID "${b.patientId}" has no email address on file. ` +
      'Update the patient record with a valid email before sending.',
    );
  }

  const patientName = [patient.firstName, patient.lastName].filter(Boolean).join(' ');

  const payload = {
    templateCode: b.templateId,
    to: {
      email: patient.email,
      name: patientName,
    },
    variables: {
      patientName,
      customMessage: b.customMessage ?? '',
    },
  };

  let res: Response;
  try {
    res = await fetch(`${sithaUrl}/api/v1/email/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sithaKey}`,
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'network error';
    // Do not include patient details in error — no PII in logs
    console.error(JSON.stringify({
      level: 'error',
      message: 'Sitha email send request failed',
      error: msg,
    }));
    throw new ServiceUnavailableError('Sitha email service', 'Network error reaching the email API.');
  }

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const body = await res.json() as { error?: string };
      if (body.error) detail = body.error;
    } catch {
      // ignore parse failure
    }
    // Log status code only — no patient details
    console.error(JSON.stringify({
      level: 'error',
      message: 'Sitha email API returned error',
      status: res.status,
    }));
    throw new ServiceUnavailableError('Sitha email service', detail);
  }
}
