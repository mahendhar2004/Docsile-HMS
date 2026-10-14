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
  DuesSummary,
  EmailTemplate,
  FollowUpRecord,
  FollowupsListQuery,
  FollowUpsSummary,
  MarkPaidInput,
  SendEmailInput,
} from './types.ts';

// ─── getDues ─────────────────────────────────────────────────────────────────

/**
 * Aggregates outstanding balances across OPD, IPD, LAB, and PHARMACY tables.
 * Queried tables are scoped by `type` (ALL or one of OPD/IPD/LAB/PHARMACY —
 * skips the others entirely, matching main's getDues()), each filtered by
 * search/dateFrom/dateTo at the DB level. Results are merged in memory and
 * sorted per `sortBy` (date/amount, asc/desc — main's exact 4 options), then
 * paginated.
 */
export async function getDues(
  s: Session,
  q: DuesListQuery,
): Promise<{ data: DueRecord[]; total: number }> {
  const repo = new DuesFollowupsRepository(getSupabaseClient(), s.hospitalId);
  const filters = { search: q.search, dateFrom: q.dateFrom, dateTo: q.dateTo };

  const [opd, ipd, lab, pharmacy] = await Promise.all([
    q.type === 'ALL' || q.type === 'OPD' ? repo.getAllOPDDues(filters) : [],
    q.type === 'ALL' || q.type === 'IPD' ? repo.getAllIPDDues(filters) : [],
    q.type === 'ALL' || q.type === 'LAB' ? repo.getAllLABDues(filters) : [],
    q.type === 'ALL' || q.type === 'PHARMACY' ? repo.getAllPharmacyDues(filters) : [],
  ]);

  const all: DueRecord[] = [...opd, ...ipd, ...lab, ...pharmacy];
  all.sort((a, b) => {
    switch (q.sortBy) {
      case 'amount_desc': return b.balanceDue - a.balanceDue;
      case 'amount_asc': return a.balanceDue - b.balanceDue;
      case 'date_asc': return new Date(a.date).getTime() - new Date(b.date).getTime();
      case 'date_desc':
      default: return new Date(b.date).getTime() - new Date(a.date).getTime();
    }
  });

  const total = all.length;
  const start = (q.page - 1) * q.pageSize;
  const data = all.slice(start, start + q.pageSize);

  return { data, total };
}

// ─── getFollowups ─────────────────────────────────────────────────────────────

/**
 * Returns OPD and/or IPD follow-up records (non-null followUpDate) within a
 * date window, filtered by notes/doctor/department. Default window (no
 * explicit dateFrom/dateTo) matches main exactly: today through the next 5
 * days, or from 2000-01-01 (i.e. "everything up to now") when includeOverdue
 * is set and no explicit dateFrom was given — src/app/(hospital)/
 * dues-followups/actions.ts getFollowUps(). Sorted by followUpDate ascending
 * (soonest first), then paginated.
 */
export async function getFollowups(
  s: Session,
  q: FollowupsListQuery,
): Promise<{ data: FollowUpRecord[]; total: number }> {
  const repo = new DuesFollowupsRepository(getSupabaseClient(), s.hospitalId);

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const dateFromDate = q.dateFrom
    ? new Date(`${q.dateFrom}T00:00:00`)
    : (q.includeOverdue ? new Date('2000-01-01') : today);
  const dateToDate = q.dateTo
    ? new Date(`${q.dateTo}T23:59:59`)
    : new Date(today.getTime() + 4 * 24 * 60 * 60 * 1000 + 23 * 60 * 60 * 1000 + 59 * 60 * 1000 + 59 * 1000);

  const followupFilters = {
    notesSearch: q.notesSearch,
    doctor: q.doctor,
    department: q.department,
    dateFromISO: dateFromDate.toISOString(),
    dateToISO: dateToDate.toISOString(),
  };

  const [opd, ipd] = await Promise.all([
    q.type === 'ALL' || q.type === 'OPD' ? repo.getAllOPDFollowups(followupFilters) : [],
    q.type === 'ALL' || q.type === 'IPD' ? repo.getAllIPDFollowups(followupFilters) : [],
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

/**
 * Summary tile totals (Total Outstanding + per-type OPD/IPD/LAB/PHARMACY
 * count+total) over every outstanding due, independent of pagination —
 * matches main's DuesTab summary.
 */
export async function getDuesSummary(s: Session): Promise<DuesSummary> {
  const repo = new DuesFollowupsRepository(getSupabaseClient(), s.hospitalId);

  const [opd, ipd, lab, pharmacy] = await Promise.all([
    repo.getAllOPDDues(),
    repo.getAllIPDDues(),
    repo.getAllLABDues(),
    repo.getAllPharmacyDues(),
  ]);

  const sum = (rows: DueRecord[]) => rows.reduce((s2, d) => s2 + d.balanceDue, 0);

  return {
    totalOutstanding: sum(opd) + sum(ipd) + sum(lab) + sum(pharmacy),
    opdCount: opd.length,
    opdTotal: sum(opd),
    ipdCount: ipd.length,
    ipdTotal: sum(ipd),
    labCount: lab.length,
    labTotal: sum(lab),
    pharmacyCount: pharmacy.length,
    pharmacyTotal: sum(pharmacy),
  };
}

/**
 * Summary tile counts (Today/Tomorrow/Total/Overdue) over every follow-up
 * record, independent of pagination — matches main's FollowUpsTab summary,
 * whose counts are computed over the whole filtered set, not one page.
 */
export async function getFollowupsSummary(s: Session): Promise<FollowUpsSummary> {
  const repo = new DuesFollowupsRepository(getSupabaseClient(), s.hospitalId);

  // Unfiltered, all-time window — this summary is intentionally global (not
  // reactive to the list's current filters), same pre-existing design as
  // getDuesSummary() above.
  const allTimeFilters = {
    dateFromISO: new Date('2000-01-01').toISOString(),
    dateToISO: new Date('2100-01-01').toISOString(),
  };
  const [opd, ipd] = await Promise.all([
    repo.getAllOPDFollowups(allTimeFilters),
    repo.getAllIPDFollowups(allTimeFilters),
  ]);
  const all: FollowUpRecord[] = [...opd, ...ipd];

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowEnd = new Date(tomorrow);
  tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);

  return {
    todayCount: all.filter((f) => {
      const d = new Date(f.followUpDate);
      return d >= today && d < tomorrow;
    }).length,
    tomorrowCount: all.filter((f) => {
      const d = new Date(f.followUpDate);
      return d >= tomorrow && d < tomorrowEnd;
    }).length,
    totalCount: all.length,
    overdueCount: all.filter((f) => f.isOverdue).length,
  };
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
  const hospitalName = await getHospitalName(s);

  const formatLongDate = (d: Date) =>
    d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

  // Variables match main's SendEmailModal.tsx exactly (patientName,
  // hospitalName, followUpDate, date) — customMessage is an extra field this
  // port's schema allows but main never sends; kept for forward-compat.
  const payload = {
    templateCode: b.templateId,
    to: {
      email: patient.email,
      name: patientName,
    },
    variables: {
      patientName,
      hospitalName,
      followUpDate: b.followUpDate ? formatLongDate(new Date(b.followUpDate)) : '',
      date: formatLongDate(new Date()),
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
