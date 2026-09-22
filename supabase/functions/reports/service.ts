/**
 * Reports service — business layer.
 *
 * Responsibilities:
 *   1. Validate/resolve date-range filter params to concrete Date boundaries.
 *   2. Resolve Patient UUID → display patientId where needed for FK-crossing queries
 *      (Prescription/EyeReading/LabBill FK to Patient.patientId TEXT;
 *       InPatient FK to Patient.id UUID — both facts verified against DB schema).
 *   3. Shape raw DB rows into typed response objects matching old reports/actions.ts
 *      and data/actions.ts output contracts.
 *   4. Throw NotFoundError for missing patients so callers get a 404, not null.
 *
 * No DB calls here — all access through ReportsRepository.
 * Permission guards live structurally in index.ts (reports:view / data:export).
 */

import { getSupabaseClient } from '../_shared/supabase-client.ts';
import { ReportsRepository } from './repository.ts';
import { NotFoundError } from '../_shared/errors.ts';
import type { Session } from '../_shared/auth.ts';
import type { ExportQuery, PatientSearchQuery } from './types.ts';

// ─── Private: date-range resolution ──────────────────────────────────────────

type DateRange = { start: Date; end: Date };

/**
 * Convert the shared ?filter= + ?customStart/customEnd query params to an
 * inclusive { start, end } Date pair (end is exclusive — start of next day).
 * Returns null if neither a filter nor custom dates are provided, meaning
 * the export is unfiltered (full history up to the 5000-row cap).
 *
 * Mirrors analytics/service.ts resolveDateRange exactly.
 */
function resolveDateRange(q: ExportQuery): DateRange | null {
  const filter = q.filter;
  if (!filter && !q.customStart && !q.customEnd) return null;

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 86_400_000);

  switch (filter) {
    case 'today':
      return { start: todayStart, end: todayEnd };
    case 'week': {
      const s = new Date(todayStart);
      s.setDate(s.getDate() - 7);
      return { start: s, end: todayEnd };
    }
    case 'month': {
      const s = new Date(todayStart);
      s.setDate(s.getDate() - 30);
      return { start: s, end: todayEnd };
    }
    case 'year': {
      const s = new Date(todayStart);
      s.setFullYear(s.getFullYear() - 1);
      return { start: s, end: todayEnd };
    }
    case 'custom':
    default:
      if (!q.customStart && !q.customEnd) return null;
      return {
        start: q.customStart ? new Date(q.customStart) : todayStart,
        end: q.customEnd
          ? new Date(new Date(q.customEnd).getTime() + 86_400_000)
          : todayEnd,
      };
  }
}

// ─── Patient Search ───────────────────────────────────────────────────────────

/**
 * Cursor-based search across all hospital patients.
 * Cursor is a base64-encoded offset string; client passes back nextCursor to page.
 * Short queries (< 2 chars) with an explicit q param return an empty result to
 * match old reports/actions.ts behavior. Omitting q returns paginated all-patients.
 */
export async function searchPatients(
  session: Session,
  query: PatientSearchQuery,
): Promise<{ data: unknown[]; nextCursor: string | null }> {
  // Guard: short explicit query term → empty result (matches old code behavior)
  if (query.q !== undefined && query.q.length < 2) {
    return { data: [], nextCursor: null };
  }

  const repo = new ReportsRepository(getSupabaseClient(), session.hospitalId);
  const offset = query.cursor ? parseInt(atob(query.cursor), 10) : 0;
  const limit = query.limit;

  const patients = await repo.searchPatients(query.q, offset, limit) as Array<Record<string, unknown>>;

  const mapped = patients.map((p) => {
    const rxList = ((p.prescriptions as Array<{ prescriptionDate: string }>) ?? [])
      .sort(
        (a, b) =>
          new Date(b.prescriptionDate).getTime() - new Date(a.prescriptionDate).getTime(),
      );
    return {
      id: p.id,
      patientId: p.patientId,
      firstName: p.firstName,
      lastName: p.lastName,
      fullName: [p.firstName, p.lastName].filter(Boolean).join(' '),
      phone: p.phone,
      age: p.age,
      gender: p.gender,
      dateOfBirth: p.dateOfBirth,
      patientType: p.patientType,
      registeredOn: p.createdAt,
      lastVisitDate: rxList[0]?.prescriptionDate ?? p.appointmentDate,
    };
  });

  const hasMore = patients.length === limit;
  const nextCursor = hasMore ? btoa(String(offset + limit)) : null;
  return { data: mapped, nextCursor };
}

// ─── Patient Summary ──────────────────────────────────────────────────────────

export async function getPatientSummary(session: Session, patientId: string): Promise<unknown> {
  const repo = new ReportsRepository(getSupabaseClient(), session.hospitalId);
  const patient = await repo.getPatientSummaryData(patientId) as Record<string, unknown> | null;
  if (!patient) throw new NotFoundError('Patient', patientId);

  const prescriptions = (
    (patient.prescriptions as Array<Record<string, unknown>>) ?? []
  ).sort(
    (a, b) =>
      new Date(String(b.prescriptionDate)).getTime() -
      new Date(String(a.prescriptionDate)).getTime(),
  );

  const opdVisits = prescriptions.filter((p) => p.status !== 'DRAFT').length;
  const lastVisit = prescriptions[0]?.prescriptionDate ?? patient.appointmentDate;

  const opdBilled = prescriptions.reduce((s, p) => s + Number(p.total ?? 0), 0);
  const opdPaid = prescriptions.reduce((s, p) => s + Number(p.amountPaid ?? 0), 0);

  const labBills = (patient.labBills as Array<Record<string, unknown>>) ?? [];
  const labBilled = labBills.reduce((s, b) => s + Number(b.total ?? 0), 0);
  const labPaid = labBills.reduce((s, b) => s + Number(b.amountPaid ?? 0), 0);

  // Supabase returns single-FK relations as arrays for nested selects
  const inpatientArr = patient.inpatient as
    | Array<Record<string, unknown>>
    | Record<string, unknown>
    | null;
  const inpatientRecord: Record<string, unknown> | null = Array.isArray(inpatientArr)
    ? (inpatientArr[0] ?? null)
    : inpatientArr;

  const ipdBilled = inpatientRecord ? Number(inpatientRecord.netAmount ?? 0) : 0;
  const ipdPaid = inpatientRecord ? Number(inpatientRecord.totalReceivedAmount ?? 0) : 0;

  const totalBilled = opdBilled + labBilled + ipdBilled;
  const totalPaid = opdPaid + labPaid + ipdPaid;

  return {
    id: patient.id,
    patientId: patient.patientId,
    firstName: patient.firstName,
    lastName: patient.lastName,
    fullName: [patient.firstName, patient.lastName].filter(Boolean).join(' '),
    phone: patient.phone,
    email: patient.email,
    age: patient.age,
    gender: patient.gender,
    dateOfBirth: patient.dateOfBirth,
    address: patient.address,
    registeredOn: patient.createdAt,
    lastVisit,
    opdVisits,
    hasInpatient: !!inpatientRecord,
    inpatientStatus: inpatientRecord?.status ?? null,
    totalBilled,
    totalPaid,
    totalDues: totalBilled - totalPaid,
  };
}

// ─── Visit History ────────────────────────────────────────────────────────────

export async function getPatientVisits(session: Session, patientId: string): Promise<unknown[]> {
  const repo = new ReportsRepository(getSupabaseClient(), session.hospitalId);
  // patientId path param is the UUID; must resolve display patientId for Prescription FK
  const patient = await repo.findPatientById(patientId);
  if (!patient) throw new NotFoundError('Patient', patientId);
  return repo.getPatientVisits(patient.patientId);
}

// ─── Prescriptions with medicines ────────────────────────────────────────────

export async function getPatientPrescriptions(
  session: Session,
  patientId: string,
): Promise<unknown[]> {
  const repo = new ReportsRepository(getSupabaseClient(), session.hospitalId);
  const patient = await repo.findPatientById(patientId);
  if (!patient) throw new NotFoundError('Patient', patientId);
  const prescriptions = await repo.getPatientPrescriptions(patient.patientId) as Array<
    Record<string, unknown>
  >;
  // Sort InvoiceItems by sortOrder client-side (matches old getPrescriptions behavior)
  return prescriptions.map((p) => ({
    ...p,
    items: ((p.items as Array<Record<string, unknown>>) ?? []).sort(
      (a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0),
    ),
  }));
}

// ─── InPatient Records ────────────────────────────────────────────────────────

/**
 * InPatient.patientId is a UUID FK to Patient.id — pass the route UUID directly.
 * Returns null (not 404) when the patient has no inpatient admission (valid state).
 */
export async function getPatientInpatient(session: Session, patientId: string): Promise<unknown> {
  const repo = new ReportsRepository(getSupabaseClient(), session.hospitalId);
  return repo.getPatientInpatient(patientId);
}

// ─── Receipt data ─────────────────────────────────────────────────────────────

export async function getPatientReceipt(session: Session, patientId: string): Promise<unknown> {
  const repo = new ReportsRepository(getSupabaseClient(), session.hospitalId);
  const { patient, hospital } = await repo.getPatientReceiptData(patientId);
  if (!patient) throw new NotFoundError('Patient', patientId);

  const patientOut = { ...patient } as Record<string, unknown>;

  // Sort prescriptions descending (most recent first)
  patientOut.prescriptions = (
    (patientOut.prescriptions as Array<Record<string, unknown>>) ?? []
  ).sort(
    (a, b) =>
      new Date(String(b.prescriptionDate)).getTime() -
      new Date(String(a.prescriptionDate)).getTime(),
  );

  // Sort eye readings descending
  patientOut.eyeReadings = (
    (patientOut.eyeReadings as Array<Record<string, unknown>>) ?? []
  ).sort(
    (a, b) =>
      new Date(String(b.createdAt)).getTime() - new Date(String(a.createdAt)).getTime(),
  );

  return { patient: patientOut, hospital };
}

// ─── Lab Records ──────────────────────────────────────────────────────────────

export async function getPatientLabs(session: Session, patientId: string): Promise<unknown[]> {
  const repo = new ReportsRepository(getSupabaseClient(), session.hospitalId);
  const patient = await repo.findPatientById(patientId);
  if (!patient) throw new NotFoundError('Patient', patientId);

  const labBills = await repo.getPatientLabRecords(patient.patientId) as Array<
    Record<string, unknown>
  >;

  return labBills.map((b) => ({
    ...b,
    items: ((b.items as Array<Record<string, unknown>>) ?? []).sort(
      (a, c) => Number(a.sortOrder ?? 0) - Number(c.sortOrder ?? 0),
    ),
    payments: ((b.payments as Array<Record<string, unknown>>) ?? []).sort(
      (a, c) =>
        new Date(String(c.paymentDate)).getTime() - new Date(String(a.paymentDate)).getTime(),
    ),
  }));
}

// ─── Billing Overview ─────────────────────────────────────────────────────────

export async function getPatientBilling(session: Session, patientId: string): Promise<unknown> {
  const repo = new ReportsRepository(getSupabaseClient(), session.hospitalId);
  const patient = await repo.findPatientById(patientId);
  if (!patient) throw new NotFoundError('Patient', patientId);

  const { prescriptions: rawRx, labBills: rawLab, inpatient } = await repo.getPatientBillingData(
    patient.patientId, // display patientId for Prescription/LabBill FK
    patient.id,        // UUID for InPatient FK
  );

  const prescriptions = (rawRx as Array<Record<string, unknown>>).map((p) => ({
    ...p,
    payments: ((p.payments as Array<Record<string, unknown>>) ?? []).sort(
      (a, b) =>
        new Date(String(b.paymentDate)).getTime() - new Date(String(a.paymentDate)).getTime(),
    ),
  }));

  const labBills = (rawLab as Array<Record<string, unknown>>).map((b) => ({
    ...b,
    payments: ((b.payments as Array<Record<string, unknown>>) ?? []).sort(
      (a, c) =>
        new Date(String(c.paymentDate)).getTime() - new Date(String(a.paymentDate)).getTime(),
    ),
  }));

  const ip = inpatient as Record<string, unknown> | null;
  const opdTotal = prescriptions.reduce((s, p) => s + Number(p.total ?? 0), 0);
  const opdPaid = prescriptions.reduce((s, p) => s + Number(p.amountPaid ?? 0), 0);
  const labTotal = labBills.reduce((s, b) => s + Number(b.total ?? 0), 0);
  const labPaid = labBills.reduce((s, b) => s + Number(b.amountPaid ?? 0), 0);
  const ipdTotal = ip ? Number(ip.netAmount ?? 0) : 0;
  const ipdPaid = ip ? Number(ip.totalReceivedAmount ?? 0) : 0;

  return {
    summary: {
      opdTotal,
      opdPaid,
      opdDue: opdTotal - opdPaid,
      labTotal,
      labPaid,
      labDue: labTotal - labPaid,
      ipdTotal,
      ipdPaid,
      ipdDue: ipdTotal - ipdPaid,
      grandTotal: opdTotal + labTotal + ipdTotal,
      grandPaid: opdPaid + labPaid + ipdPaid,
      grandDue: (opdTotal - opdPaid) + (labTotal - labPaid) + (ipdTotal - ipdPaid),
    },
    prescriptions,
    labBills,
    inpatient: ip,
  };
}

// ─── Export: Patients ─────────────────────────────────────────────────────────

export async function exportPatients(session: Session, q: ExportQuery): Promise<unknown[]> {
  const repo = new ReportsRepository(getSupabaseClient(), session.hospitalId);
  const range = resolveDateRange(q);
  const data = await repo.exportPatients(range, q.search, q.patientType) as Array<
    Record<string, unknown>
  >;
  return data.map((p) => ({
    id: p.id,
    patientId: p.patientId,
    firstName: p.firstName,
    lastName: p.lastName ?? '',
    age: p.age,
    gender: p.gender,
    phone: p.phone,
    email: p.email ?? '',
    address: p.address ?? '',
    guardianName: p.guardianName ?? '',
    referredBy: p.referredBy ?? '',
    doctorName: p.doctorName ?? '',
    department: p.department ?? '',
    patientType: p.patientType,
    status: p.status,
    appointmentDate: p.appointmentDate
      ? new Date(String(p.appointmentDate)).toISOString()
      : '',
    createdAt: p.createdAt ? new Date(String(p.createdAt)).toISOString() : '',
  }));
}

// ─── Export: Prescriptions ────────────────────────────────────────────────────

export async function exportPrescriptions(session: Session, q: ExportQuery): Promise<unknown[]> {
  const repo = new ReportsRepository(getSupabaseClient(), session.hospitalId);
  const range = resolveDateRange(q);
  const data = await repo.exportPrescriptions(range, q.search, q.status) as Array<
    Record<string, unknown>
  >;
  return data.map((p) => ({
    id: p.id,
    prescriptionNumber: p.prescriptionNumber ?? '',
    patientId: p.patientId,
    patientType: p.patientType,
    doctorName: p.doctorName ?? '',
    department: p.department ?? '',
    diagnosis: p.diagnosis ?? '',
    presentComplaint: p.presentComplaint ?? '',
    medicines: p.medicines,
    investigations: p.investigations,
    subtotal: p.subtotal,
    discount: p.discount,
    total: p.total,
    amountPaid: p.amountPaid,
    balanceDue: p.balanceDue,
    paymentMode: p.paymentMode ?? '',
    status: p.status,
    prescriptionDate: p.prescriptionDate
      ? new Date(String(p.prescriptionDate)).toISOString()
      : '',
    followUpDate: p.followUpDate ? new Date(String(p.followUpDate)).toISOString() : '',
    createdAt: p.createdAt ? new Date(String(p.createdAt)).toISOString() : '',
  }));
}

// ─── Export: Eye Readings ─────────────────────────────────────────────────────

export async function exportEyeReadings(session: Session, q: ExportQuery): Promise<unknown[]> {
  const repo = new ReportsRepository(getSupabaseClient(), session.hospitalId);
  const range = resolveDateRange(q);
  const data = await repo.exportEyeReadings(range, q.search) as Array<Record<string, unknown>>;
  return data.map((e) => ({
    id: e.id,
    patientId: e.patientId,
    autoRefractometer: e.autoRefractometer ?? '',
    glassesReading: e.glassesReading ?? '',
    previousPrescription: e.previousPrescription ?? '',
    presentPrescription: e.presentPrescription ?? '',
    clinicalFindings: e.clinicalFindings ?? '',
    status: e.status,
    readingDate: e.readingDate ? new Date(String(e.readingDate)).toISOString() : '',
    createdAt: e.createdAt ? new Date(String(e.createdAt)).toISOString() : '',
  }));
}

// ─── Export: InPatients ───────────────────────────────────────────────────────

export async function exportInpatients(session: Session, q: ExportQuery): Promise<unknown[]> {
  const repo = new ReportsRepository(getSupabaseClient(), session.hospitalId);
  const range = resolveDateRange(q);
  const data = await repo.exportInpatients(range, q.search, q.status) as Array<
    Record<string, unknown>
  >;
  return data.map((ip) => ({
    id: ip.id,
    ipNumber: ip.ipNumber,
    patientId: ip.patientId,
    name: ip.name,
    age: ip.age,
    gender: ip.gender,
    phone: ip.phone,
    address: ip.address ?? '',
    department: ip.department ?? '',
    doctorNames: ip.doctorNames,
    operationName: ip.operationName ?? '',
    operationDate: ip.operationDate ? new Date(String(ip.operationDate)).toISOString() : '',
    packageAmount: ip.packageAmount,
    discount: ip.discount,
    netAmount: ip.netAmount,
    totalReceivedAmount: ip.totalReceivedAmount,
    balanceAmount: ip.balanceAmount,
    status: ip.status,
    bedNumber: ip.bedNumber ?? '',
    wardName: ip.wardName ?? '',
    admissionDate: ip.admissionDate ? new Date(String(ip.admissionDate)).toISOString() : '',
    dischargeDate: ip.dischargeDate ? new Date(String(ip.dischargeDate)).toISOString() : '',
    createdAt: ip.createdAt ? new Date(String(ip.createdAt)).toISOString() : '',
  }));
}

// ─── Export: Insurance Claims ─────────────────────────────────────────────────

export async function exportInsuranceClaims(session: Session, q: ExportQuery): Promise<unknown[]> {
  const repo = new ReportsRepository(getSupabaseClient(), session.hospitalId);
  const range = resolveDateRange(q);
  const data = await repo.exportInsuranceClaims(range, q.search, q.status) as Array<
    Record<string, unknown>
  >;
  return data.map((c) => ({
    id: c.id,
    claimNumber: c.claimNumber,
    patientName: c.patientName,
    ipNumber: c.ipNumber,
    age: c.age,
    gender: c.gender,
    phone: c.phone,
    insuranceCompanyName: c.insuranceCompanyName,
    tpaName: c.tpaName ?? '',
    policyNumber: c.policyNumber ?? '',
    packageAmount: c.packageAmount,
    totalBillAmount: c.totalBillAmount,
    preauthAmount: c.preauthAmount,
    totalApprovedAmount: c.totalApprovedAmount,
    finalSettledAmount: c.finalSettledAmount,
    patientPayableAmount: c.patientPayableAmount,
    patientPaidAmount: c.patientPaidAmount,
    patientBalance: c.patientBalance,
    status: c.status,
    admissionDate: c.admissionDate ? new Date(String(c.admissionDate)).toISOString() : '',
    dischargeDate: c.dischargeDate ? new Date(String(c.dischargeDate)).toISOString() : '',
    createdAt: c.createdAt ? new Date(String(c.createdAt)).toISOString() : '',
  }));
}

// ─── Export: Lab Bills ────────────────────────────────────────────────────────

export async function exportLabBills(session: Session, q: ExportQuery): Promise<unknown[]> {
  const repo = new ReportsRepository(getSupabaseClient(), session.hospitalId);
  const range = resolveDateRange(q);
  const data = await repo.exportLabBills(range, q.search, q.status) as Array<
    Record<string, unknown>
  >;
  return data.map((b) => ({
    id: b.id,
    billNumber: b.billNumber,
    labName: (b.lab as Record<string, unknown> | null)?.name ?? '',
    patientId: b.patientId,
    subtotal: b.subtotal,
    discount: b.discount,
    total: b.total,
    amountPaid: b.amountPaid,
    balanceDue: b.balanceDue,
    paymentMode: b.paymentMode ?? '',
    status: b.status,
    createdAt: b.createdAt ? new Date(String(b.createdAt)).toISOString() : '',
  }));
}

// ─── Export: Pharmacy Bills ───────────────────────────────────────────────────

export async function exportPharmacyBills(session: Session, q: ExportQuery): Promise<unknown[]> {
  const repo = new ReportsRepository(getSupabaseClient(), session.hospitalId);
  const range = resolveDateRange(q);
  const data = await repo.exportPharmacyBills(range, q.search) as Array<Record<string, unknown>>;
  return data.map((b) => ({
    id: b.id,
    billNumber: b.billNumber,
    patientName: b.patientName,
    patientPhone: b.patientPhone ?? '',
    referredDoctor: b.referredDoctor ?? '',
    subtotal: b.subtotal,
    discountAmount: b.discountAmount,
    gstAmount: b.gstAmount,
    billAmount: b.billAmount,
    paidAmount: b.paidAmount,
    balanceDue: b.balanceDue,
    paymentMode: b.paymentMode,
    status: b.status,
    billDate: b.billDate ? new Date(String(b.billDate)).toISOString() : '',
    createdAt: b.createdAt ? new Date(String(b.createdAt)).toISOString() : '',
  }));
}

// ─── Export: Optical Bills ────────────────────────────────────────────────────

export async function exportOpticalBills(session: Session, q: ExportQuery): Promise<unknown[]> {
  const repo = new ReportsRepository(getSupabaseClient(), session.hospitalId);
  const range = resolveDateRange(q);
  const data = await repo.exportOpticalBills(range, q.search) as Array<Record<string, unknown>>;
  return data.map((b) => ({
    id: b.id,
    billNumber: b.billNumber,
    patientName: b.patientName,
    patientPhone: b.patientPhone ?? '',
    referredDoctor: b.referredDoctor ?? '',
    subtotal: b.subtotal,
    discountAmount: b.discountAmount,
    gstAmount: b.gstAmount,
    billAmount: b.billAmount,
    paidAmount: b.paidAmount,
    balanceDue: b.balanceDue,
    paymentMode: b.paymentMode,
    status: b.status,
    billDate: b.billDate ? new Date(String(b.billDate)).toISOString() : '',
    createdAt: b.createdAt ? new Date(String(b.createdAt)).toISOString() : '',
  }));
}

// ─── Export: Expenses ─────────────────────────────────────────────────────────

export async function exportExpenses(session: Session, q: ExportQuery): Promise<unknown[]> {
  const repo = new ReportsRepository(getSupabaseClient(), session.hospitalId);
  const range = resolveDateRange(q);
  const data = await repo.exportExpenses(range, q.search) as Array<Record<string, unknown>>;
  return data.map((e) => ({
    id: e.id,
    title: e.title,
    category: (e.category as Record<string, unknown> | null)?.name ?? '',
    amount: e.amount,
    date: e.date ? new Date(String(e.date)).toISOString() : '',
    reason: e.reason ?? '',
    paymentMode: e.paymentMode ?? '',
    createdAt: e.createdAt ? new Date(String(e.createdAt)).toISOString() : '',
  }));
}
