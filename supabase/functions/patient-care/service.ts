/**
 * Business layer for the patient-care module — 28 endpoints.
 *
 * Implements two logical sections (Patient + InPatient) plus billing-adjacent
 * and dropdown helpers, all within a single deployable Edge Function per ADR-006.
 *
 * Rules:
 * - Every operation is scoped to session.hospitalId (ADR-007).
 * - Existence is verified before update/delete operations so errors carry the
 *   resource type + id and are never bare "not found" messages.
 * - No transport concerns: no Request/Response objects, no Hono context.
 * - No direct DB queries: all data access goes through PatientCareRepository.
 * - ID generation uses Postgres atomic-sequence RPCs (H-3 fix):
 *     next_patient_number() for Patient.patientId
 *     next_ip_number()      for InPatient.ipNumber
 *     next_prescription_number(p_year) for Prescription.prescriptionNumber
 *   Never call "SELECT MAX + 1" — that was the race-condition bug being fixed.
 * - No PII in log calls.
 */

import { getSupabaseClient } from '../_shared/supabase-client.ts';
import { NotFoundError, ValidationError } from '../_shared/errors.ts';
import type { Session } from '../_shared/auth.ts';
import { PatientCareRepository } from './repository.ts';
import type {
  Patient,
  InPatient,
  CreatePatientBody,
  UpdatePatientBody,
  CreateInPatientBody,
  UpdateInPatientBasicInfoSchema,
  UpdateInPatientDetailsSchema,
  AddInPatientPaymentSchema,
  DischargeInPatientSchema,
  CreateDropdownOptionSchema,
  AddServiceToPatientSchema,
  CreatePrescriptionWithBillingSchema,
} from './types.ts';
import type { z } from 'zod';

type UpdateInPatientBasicInfo = z.infer<typeof UpdateInPatientBasicInfoSchema>;
type UpdateInPatientDetails = z.infer<typeof UpdateInPatientDetailsSchema>;
type AddInPatientPayment = z.infer<typeof AddInPatientPaymentSchema>;
type DischargeInPatient = z.infer<typeof DischargeInPatientSchema>;
type CreateDropdownOption = z.infer<typeof CreateDropdownOptionSchema>;
type AddServiceToPatient = z.infer<typeof AddServiceToPatientSchema>;
type CreatePrescriptionWithBilling = z.infer<typeof CreatePrescriptionWithBillingSchema>;

/** Factory — one repository instance per request, scoped to the caller's hospital. */
function makeRepo(s: Session): PatientCareRepository {
  return new PatientCareRepository(getSupabaseClient(), s.hospitalId);
}

/**
 * Derive a display-ready patient status from workup + doctor-prescription state.
 *
 * In an ophthalmology clinic, the typical visit flow is:
 *   1. REGISTERED → patient registered at reception
 *   2. WITH_DOCTOR → workup (AR reading) done, waiting for ophthalmologist
 *   3. COMPLETED → doctor has examined and a prescription exists
 *
 * Terminal/override statuses (MOVED, CANCELLED, REFERRED) are preserved as-is.
 * This mirrors the old Next.js computePatientStatus() logic.
 */
function computePatientStatus(
  hasWorkup: boolean,
  hasDoctorPrescription: boolean,
  dbStatus: string,
): string {
  if (['MOVED', 'CANCELLED', 'REFERRED'].includes(dbStatus)) return dbStatus;
  if (hasDoctorPrescription) return 'COMPLETED';
  if (hasWorkup) return 'WITH_DOCTOR';
  return dbStatus ?? 'REGISTERED';
}

// ============================================================
// PATIENT ENDPOINTS
// ============================================================

/**
 * List patients for this hospital, paginated.
 * When date is provided, limits results to patients whose appointmentDate falls on
 * that IST calendar day. Each patient's status is derived from their workup +
 * doctor-prescription state (not stored as-is from DB).
 */
export async function listPatients(
  s: Session,
  query: { date?: string; search?: string; page: number; pageSize: number },
): Promise<{ data: Patient[]; total: number }> {
  const repo = makeRepo(s);
  const { data: rows, total } = await repo.listPatients(
    query.date,
    query.page,
    query.pageSize,
    query.search,
  );

  const data = rows.map((p) => {
    const prescriptions = (p.prescriptions ?? []) as {
      status: string;
      doctorName: string | null;
      createdAt: string;
      prescriptionDate: string;
    }[];
    const eyeReadings = (p.eyeReadings ?? []) as { createdAt: string }[];

    // Sort prescriptions desc by createdAt, keep latest only for status computation
    prescriptions.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const latestRx = prescriptions.slice(0, 1);
    const latestEr = eyeReadings.slice(0, 1);

    const hasWorkup = latestEr.length > 0;
    const hasDoctorPrescription = latestRx.some(
      (rx) => rx.status !== 'BILLING_ONLY' && rx.doctorName !== null,
    );

    return {
      ...p,
      prescriptions: latestRx,
      eyeReadings: latestEr,
      status: computePatientStatus(hasWorkup, hasDoctorPrescription, p.status as string),
    } as unknown as Patient;
  });

  return { data, total };
}

/**
 * Cursor-based patient search.
 * Searches across patientId, phone, firstName, lastName.
 * Returns patients enriched with fullName and lastVisitDate for the new-patient lookup UI.
 */
export async function searchPatients(
  s: Session,
  query: { q: string; cursor?: string; limit: number },
): Promise<{ patients: Patient[]; nextCursor: string | null }> {
  const repo = makeRepo(s);
  const { patients: rows, nextCursor } = await repo.searchPatients(
    query.q,
    query.cursor,
    query.limit,
  );

  const patients = rows.map((p) => {
    const prescriptions = (p.prescriptions ?? []) as { prescriptionDate: string }[];
    prescriptions.sort((a, b) => b.prescriptionDate.localeCompare(a.prescriptionDate));
    return {
      ...p,
      fullName: [p.firstName, p.lastName].filter(Boolean).join(' '),
      lastVisitDate: prescriptions[0]?.prescriptionDate ?? (p.appointmentDate as string),
    } as unknown as Patient;
  });

  return { patients, nextCursor };
}

/**
 * Preview the next sequential patient ID without creating a patient.
 *
 * Calls next_patient_number() which DOES advance the Postgres sequence — gaps are
 * acceptable and expected when users open the form without completing registration.
 * The definitive ID is generated again at createPatient time.
 */
export async function getNextPatientId(s: Session): Promise<{ nextPatientId: string }> {
  const repo = makeRepo(s);
  const nextNum = await repo.getNextPatientNumber();
  return { nextPatientId: String(nextNum).padStart(4, '0') };
}

/**
 * Bundled fetch for the patient registration form.
 * Returns hospital profile, active service templates, and all dropdown options
 * in a single parallel fetch — replaces 6 separate calls the old UI made.
 * Does NOT call next_patient_number() to avoid wasting a sequence slot on form opens.
 */
export async function getPatientRegistrationFormData(s: Session): Promise<{
  hospitalProfile: Record<string, unknown> | null;
  serviceTemplates: Record<string, unknown>[];
  doctorOptions: string[];
  departmentOptions: string[];
  referralOptions: string[];
  addressOptions: string[];
  patientCategoryOptions: string[];
}> {
  const repo = makeRepo(s);
  const { hospitalProfile, serviceTemplates, dropdowns } = await repo.getRegistrationFormData();

  const grouped: Record<string, string[]> = {
    doctorName: [],
    department: [],
    referredBy: [],
    address: [],
    patientCategory: [],
  };

  for (const row of dropdowns) {
    const fn = row.fieldName as string;
    const val = row.value as string;
    if (grouped[fn] !== undefined) grouped[fn].push(val);
  }

  return {
    hospitalProfile,
    serviceTemplates,
    doctorOptions: grouped.doctorName,
    departmentOptions: grouped.department,
    referralOptions: grouped.referredBy,
    addressOptions: grouped.address,
    patientCategoryOptions: grouped.patientCategory,
  };
}

/**
 * Create a new patient.
 *
 * Calls next_patient_number() (H-3 atomic sequence) to assign the sequential patientId.
 * appointmentDate and dateOfBirth are stored as IST-anchored TIMESTAMPTZ values.
 */
export async function createPatient(s: Session, body: CreatePatientBody): Promise<Patient> {
  const repo = makeRepo(s);
  const nextNum = await repo.getNextPatientNumber();
  const patientId = String(nextNum).padStart(4, '0');

  const payload: Record<string, unknown> = {
    patientId,
    firstName: body.firstName,
    lastName: body.lastName,
    phone: body.phone,
    email: body.email ?? null,
    gender: body.gender,
    dateOfBirth: body.dateOfBirth
      ? new Date(`${body.dateOfBirth}T00:00:00+05:30`).toISOString()
      : null,
    address: body.address ?? null,
    patientType: body.patientType,
    appointmentDate: new Date(`${body.appointmentDate}T00:00:00+05:30`).toISOString(),
    status: body.status ?? 'REGISTERED',
    referredBy: body.referredBy ?? null,
    createdById: s.id,
  };

  const created = await repo.insertPatient(payload);
  return created as unknown as Patient;
}

/**
 * Fetch a patient by UUID id, with prescriptions and eye readings.
 * Computes and overrides the stored status with the derived status.
 */
export async function getPatientById(s: Session, id: string): Promise<Patient> {
  const repo = makeRepo(s);
  const patient = await repo.findPatientById(id);
  if (!patient) throw new NotFoundError('Patient', id);

  const prescriptions = (patient.prescriptions ?? []) as {
    status: string;
    doctorName: string | null;
    createdAt: string;
  }[];
  const eyeReadings = (patient.eyeReadings ?? []) as { createdAt: string }[];

  prescriptions.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const latestEr = eyeReadings
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 1);

  const hasWorkup = latestEr.length > 0;
  const hasDoctorPrescription = prescriptions.some(
    (rx) => rx.status !== 'BILLING_ONLY' && rx.doctorName !== null,
  );

  return {
    ...patient,
    eyeReadings: latestEr,
    status: computePatientStatus(hasWorkup, hasDoctorPrescription, patient.status as string),
  } as unknown as Patient;
}

/**
 * Apply a partial update to a patient by UUID id.
 * appointmentDate and dateOfBirth are converted to IST-anchored TIMESTAMPTZ if provided.
 */
export async function updatePatient(
  s: Session,
  id: string,
  body: UpdatePatientBody,
): Promise<Patient> {
  const repo = makeRepo(s);
  const existing = await repo.findPatientRowById(id);
  if (!existing) throw new NotFoundError('Patient', id);

  const patch: Record<string, unknown> = { ...body };
  // Strip immutable system fields the client must not overwrite
  delete patch.id;
  delete patch.patientId;
  delete patch.hospital_id;

  if (body.appointmentDate) {
    patch.appointmentDate = new Date(`${body.appointmentDate}T00:00:00+05:30`).toISOString();
  }
  if (body.dateOfBirth) {
    patch.dateOfBirth = new Date(`${body.dateOfBirth}T00:00:00+05:30`).toISOString();
  }

  const updated = await repo.updatePatientById(id, patch);
  return updated as unknown as Patient;
}

/**
 * Hard-delete a patient and all their dependent records.
 * Cascade order: payments → invoice items → eye readings → prescriptions
 * → insurance claims → inpatient → patient.
 */
export async function deletePatient(s: Session, id: string): Promise<void> {
  const repo = makeRepo(s);
  const existing = await repo.findPatientRowById(id);
  if (!existing) throw new NotFoundError('Patient', id);
  await repo.deletePatientById(id);
}

/**
 * Update the stored status of a patient.
 * Note: the list and detail endpoints derive a computed status — this updates the
 * underlying DB value that acts as the fallback when the derived logic doesn't apply.
 */
export async function updatePatientStatus(
  s: Session,
  id: string,
  status: string,
): Promise<void> {
  const repo = makeRepo(s);
  const existing = await repo.findPatientRowById(id);
  if (!existing) throw new NotFoundError('Patient', id);
  await repo.updatePatientById(id, { status });
}

/**
 * Move a patient's appointment to a different date.
 * Sets status to "MOVED" and records the original appointmentDate in movedFromDate.
 */
export async function movePatientToDate(
  s: Session,
  id: string,
  appointmentDate: string,
): Promise<void> {
  const repo = makeRepo(s);
  const existing = await repo.findPatientRowById(id);
  if (!existing) throw new NotFoundError('Patient', id);

  // We need the current appointmentDate to record as movedFromDate
  const patient = await repo.findPatientById(id);
  const newDate = new Date(`${appointmentDate}T00:00:00+05:30`).toISOString();

  await repo.updatePatientById(id, {
    appointmentDate: newDate,
    movedFromDate: patient?.appointmentDate ?? null,
    movedToDate: newDate,
    status: 'MOVED',
  });
}

/**
 * Fetch a patient with their last visit date derived from prescriptions.
 * Returns fullName, lastVisitDate, and daysSinceLastVisit.
 */
export async function getPatientWithLastVisit(
  s: Session,
  id: string,
): Promise<Record<string, unknown>> {
  const repo = makeRepo(s);
  const patient = await repo.findPatientWithPrescriptions(id);
  if (!patient) throw new NotFoundError('Patient', id);

  const prescriptions = (patient.prescriptions ?? []) as {
    prescriptionDate: string;
    createdAt: string;
  }[];
  prescriptions.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const latestPrescription = prescriptions[0];

  const lastVisitDate =
    latestPrescription?.prescriptionDate ?? (patient.appointmentDate as string);
  const daysSinceLastVisit = Math.floor(
    (new Date().getTime() - new Date(lastVisitDate).getTime()) / (1000 * 60 * 60 * 24),
  );

  return {
    ...patient,
    fullName: [patient.firstName, patient.lastName].filter(Boolean).join(' '),
    lastVisitDate,
    daysSinceLastVisit,
  };
}

/**
 * Receipt data for a patient: full patient row + hospital profile.
 * Eye readings are sorted desc by createdAt, latest taken.
 * Prescriptions are sorted desc by createdAt (most recent first).
 * Used to render the print receipt modal.
 */
export async function getPatientReceiptData(
  s: Session,
  id: string,
): Promise<Record<string, unknown>> {
  const repo = makeRepo(s);
  const { patient, hospital } = await repo.getPatientReceiptData(id);
  if (!patient) throw new NotFoundError('Patient', id);

  const eyeReadings = ((patient.eyeReadings ?? []) as Record<string, unknown>[])
    .sort(
      (a, b) =>
        new Date(b.createdAt as string).getTime() - new Date(a.createdAt as string).getTime(),
    )
    .slice(0, 1);

  const prescriptions = ((patient.prescriptions ?? []) as Record<string, unknown>[]).sort(
    (a, b) =>
      new Date(b.createdAt as string).getTime() - new Date(a.createdAt as string).getTime(),
  );

  return {
    patient: { ...patient, eyeReadings, prescriptions },
    hospital,
    prescription: prescriptions[0] ?? null,
    eyeReading: eyeReadings[0] ?? null,
  };
}

/**
 * Add a single service to a patient's billing for today.
 *
 * Looks up the service template and creates (or appends to) today's prescription:
 * - If a prescription already exists today for this patient, adds an InvoiceItem to it
 *   and updates the running totals.
 * - Otherwise, creates a new BILLING_ONLY prescription using next_prescription_number().
 *
 * The body.amount is the payment amount collected now; the service amount (from the
 * template) becomes the invoice line-item total.
 */
export async function addServiceToPatient(
  s: Session,
  patientId: string,
  body: AddServiceToPatient,
): Promise<Record<string, unknown>> {
  const repo = makeRepo(s);

  // 1. Resolve patient (need sequential patientId for prescription lookup)
  const patientRow = await repo.findPatientRowById(patientId);
  if (!patientRow) throw new NotFoundError('Patient', patientId);
  const sequentialPatientId = patientRow.patientId as string;

  // 2. Resolve service template
  const template = await repo.getServiceTemplateById(body.serviceTemplateId);
  if (!template) {
    throw new NotFoundError('ServiceTemplate', body.serviceTemplateId);
  }

  const templateAmount = (template.amount as number) ?? 0;
  const paymentAmount = body.amount ?? templateAmount;
  const now = new Date().toISOString();

  // 3. Check for existing prescription today
  const existingRx = await repo.getTodaysPrescriptionForPatient(sequentialPatientId);

  let prescription: Record<string, unknown>;

  if (existingRx) {
    // Append item and update totals on the existing prescription
    const existingItems = (existingRx.items ?? []) as unknown[];
    const updatedSubtotal = ((existingRx.subtotal as number) ?? 0) + templateAmount;
    const updatedTotal = updatedSubtotal - ((existingRx.discount as number) ?? 0);
    const updatedAmountPaid = ((existingRx.amountPaid as number) ?? 0) + paymentAmount;
    const updatedBalanceDue = updatedTotal - updatedAmountPaid;

    prescription = await repo.updatePrescriptionById(existingRx.id as string, {
      subtotal: updatedSubtotal,
      total: updatedTotal,
      amountPaid: updatedAmountPaid,
      balanceDue: updatedBalanceDue,
    });

    await repo.insertInvoiceItems([
      {
        prescriptionId: existingRx.id as string,
        description: template.name as string,
        category: (template.category as string) ?? null,
        quantity: 1,
        unitPrice: templateAmount,
        amount: templateAmount,
        sortOrder: existingItems.length,
      },
    ]);

    if (paymentAmount > 0) {
      await repo.insertPayment({
        prescriptionId: existingRx.id as string,
        amount: paymentAmount,
        paymentMode: body.paymentMode,
        receivedBy: s.id,
      });
    }
  } else {
    // No prescription today — create a new BILLING_ONLY prescription
    const prescriptionNumber = await repo.getNextPrescriptionNumber();
    const total = templateAmount;
    const balanceDue = total - paymentAmount;

    const newRx = await repo.insertPrescription({
      prescriptionNumber,
      patientId: sequentialPatientId,
      doctorName: null,
      medicines: '[]',
      investigations: '[]',
      subtotal: templateAmount,
      discount: 0,
      total,
      amountPaid: paymentAmount,
      balanceDue,
      paymentMode: body.paymentMode,
      paymentDate: now,
      status: 'BILLING_ONLY',
      prescriptionDate: now,
      createdBy: s.id,
    });

    await repo.insertInvoiceItems([
      {
        prescriptionId: newRx.id as string,
        description: template.name as string,
        category: (template.category as string) ?? null,
        quantity: 1,
        unitPrice: templateAmount,
        amount: templateAmount,
        sortOrder: 0,
      },
    ]);

    if (paymentAmount > 0) {
      await repo.insertPayment({
        prescriptionId: newRx.id as string,
        amount: paymentAmount,
        paymentMode: body.paymentMode,
        receivedBy: s.id,
      });
    }

    prescription = newRx;
  }

  return { prescriptionId: prescription.id, prescriptionNumber: prescription.prescriptionNumber };
}

/**
 * Create a prescription with invoice items and an optional payment.
 *
 * Implements the same today-upsert logic as addServiceToPatient:
 * - If a prescription already exists today for this patient, adds items to it.
 * - Otherwise creates a new prescription using next_prescription_number().
 *
 * The body.prescription fields (medicines, investigations, diagnosis, etc.) are merged
 * into the prescription row. The invoice items and payment are inserted separately.
 */
export async function createPrescriptionWithBilling(
  s: Session,
  patientId: string,
  body: CreatePrescriptionWithBilling,
): Promise<Record<string, unknown>> {
  const repo = makeRepo(s);

  // 1. Resolve patient to get sequential patientId
  const patientRow = await repo.findPatientRowById(patientId);
  if (!patientRow) throw new NotFoundError('Patient', patientId);
  const sequentialPatientId = patientRow.patientId as string;

  const invoiceItems = body.invoiceItems ?? [];
  const paymentRecord = body.payment;
  const rxFields = body.prescription ?? {};

  const newSubtotal = invoiceItems.reduce((sum, item) => sum + (item.total ?? 0), 0);
  const paymentAmount = paymentRecord?.amount ?? 0;
  const now = new Date().toISOString();

  // 2. Check for existing prescription today
  const existingRx = await repo.getTodaysPrescriptionForPatient(sequentialPatientId);

  let prescription: Record<string, unknown>;
  let prescriptionNumber: string;

  if (existingRx) {
    // Append to existing prescription
    const existingItems = (existingRx.items ?? []) as unknown[];
    const updatedSubtotal = ((existingRx.subtotal as number) ?? 0) + newSubtotal;
    const updatedDiscount = (existingRx.discount as number) ?? 0;
    const updatedTotal = updatedSubtotal - updatedDiscount;
    const updatedAmountPaid = ((existingRx.amountPaid as number) ?? 0) + paymentAmount;
    const updatedBalanceDue = updatedTotal - updatedAmountPaid;

    const mergedNotes =
      rxFields.diagnosis && existingRx.notes
        ? [existingRx.notes, rxFields.diagnosis].filter(Boolean).join('; ')
        : rxFields.diagnosis ?? existingRx.notes ?? null;

    prescription = await repo.updatePrescriptionById(existingRx.id as string, {
      subtotal: updatedSubtotal,
      total: updatedTotal,
      amountPaid: updatedAmountPaid,
      balanceDue: updatedBalanceDue,
      notes: mergedNotes,
      ...(rxFields.medicines !== undefined ? { medicines: rxFields.medicines } : {}),
      ...(rxFields.investigations !== undefined ? { investigations: rxFields.investigations } : {}),
      ...(rxFields.heightCm !== undefined ? { heightCm: rxFields.heightCm } : {}),
      ...(rxFields.weightKg !== undefined ? { weightKg: rxFields.weightKg } : {}),
    });

    prescriptionNumber = existingRx.prescriptionNumber as string;

    if (invoiceItems.length > 0) {
      await repo.insertInvoiceItems(
        invoiceItems.map((item, i) => ({
          prescriptionId: existingRx.id as string,
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.total,
          sortOrder: existingItems.length + i,
        })),
      );
    }

    if (paymentRecord && paymentAmount > 0) {
      await repo.insertPayment({
        prescriptionId: existingRx.id as string,
        amount: paymentAmount,
        paymentMode: paymentRecord.paymentMode,
        receivedBy: s.id,
      });
    }
  } else {
    // Create a new prescription
    prescriptionNumber = await repo.getNextPrescriptionNumber();
    const total = newSubtotal;
    const balanceDue = total - paymentAmount;

    prescription = await repo.insertPrescription({
      prescriptionNumber,
      patientId: sequentialPatientId,
      doctorId: rxFields.doctorId ?? null,
      medicines: rxFields.medicines ?? '[]',
      investigations: rxFields.investigations ?? '[]',
      diagnosis: rxFields.diagnosis ?? null,
      heightCm: rxFields.heightCm ?? null,
      weightKg: rxFields.weightKg ?? null,
      subtotal: newSubtotal,
      discount: 0,
      total,
      amountPaid: paymentAmount,
      balanceDue,
      paymentMode: paymentRecord?.paymentMode ?? null,
      paymentDate: paymentAmount > 0 ? now : null,
      status: 'BILLING_ONLY',
      prescriptionDate: rxFields.prescriptionDate
        ? new Date(`${rxFields.prescriptionDate}T00:00:00+05:30`).toISOString()
        : now,
      createdBy: s.id,
    });

    if (invoiceItems.length > 0) {
      await repo.insertInvoiceItems(
        invoiceItems.map((item, i) => ({
          prescriptionId: prescription.id as string,
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.total,
          sortOrder: i,
        })),
      );
    }

    if (paymentRecord && paymentAmount > 0) {
      await repo.insertPayment({
        prescriptionId: prescription.id as string,
        amount: paymentAmount,
        paymentMode: paymentRecord.paymentMode,
        receivedBy: s.id,
      });
    }
  }

  return { prescriptionId: prescription.id, prescriptionNumber };
}

// ============================================================
// INPATIENT ENDPOINTS
// ============================================================

/**
 * Paginated list of inpatients.
 * Optional date filter targets admissionDate; optional status filter applies the
 * DB enum value (mapped from API's 'admitted'/'discharged' to 'ADMITTED'/'DISCHARGED').
 */
export async function listInPatients(
  s: Session,
  query: { date?: string; status?: string; page: number; pageSize: number },
): Promise<{ data: InPatient[]; total: number }> {
  const repo = makeRepo(s);
  const { data, total } = await repo.listInPatients(
    query.date,
    query.status,
    query.page,
    query.pageSize,
  );
  return { data: data.map(flattenInPatientPatient) as unknown as InPatient[], total };
}

/**
 * Flattens the `patient:Patient(...)` embed (added by repository.listInPatients /
 * findInPatientById) onto the row's own firstName/lastName/phone/gender/dateOfBirth
 * fields, matching what the frontend's InPatient type already expects. Without this,
 * every inpatient row displayed a truncated UUID instead of the patient's name —
 * InPatient itself stores no demographic fields of its own.
 */
function flattenInPatientPatient(row: Record<string, unknown>): Record<string, unknown> {
  const { patient, ...rest } = row as {
    patient?: {
      firstName?: string;
      lastName?: string;
      phone?: string;
      gender?: string;
      dateOfBirth?: string;
    } | null;
    [key: string]: unknown;
  };
  if (!patient) return rest;
  return {
    ...rest,
    firstName: patient.firstName,
    lastName: patient.lastName,
    phone: patient.phone,
    gender: patient.gender,
    dateOfBirth: patient.dateOfBirth,
  };
}

/**
 * Preview the next IP number without creating an inpatient record.
 * Advances ip_number_seq — gaps are acceptable (H-3 design).
 */
export async function getNextInPatientId(s: Session): Promise<{ nextIpNumber: string }> {
  const repo = makeRepo(s);
  const nextNum = await repo.getNextIpNumber();
  return { nextIpNumber: `IP-${String(nextNum).padStart(4, '0')}` };
}

/**
 * Bundled fetch for the IPD admission wizard.
 * Returns hospital profile, dropdown options, predefined surgeries, and predefined packages.
 * Does NOT advance ip_number_seq — that happens at createInPatient time (or getNextInPatientId).
 */
export async function getAdmissionFormData(s: Session): Promise<{
  hospitalProfile: Record<string, unknown> | null;
  doctorOptions: string[];
  departmentOptions: string[];
  referralOptions: string[];
  predefinedSurgeries: Record<string, unknown>[];
  predefinedPackages: Record<string, unknown>[];
}> {
  const repo = makeRepo(s);
  const { hospitalProfile, dropdowns, predefinedSurgeries, predefinedPackages } =
    await repo.getAdmissionFormData();

  const grouped: Record<string, string[]> = {
    doctorName: [],
    department: [],
    referredBy: [],
  };

  for (const row of dropdowns) {
    const fn = row.fieldName as string;
    const val = row.value as string;
    if (grouped[fn] !== undefined) grouped[fn].push(val);
  }

  return {
    hospitalProfile,
    doctorOptions: grouped.doctorName,
    departmentOptions: grouped.department,
    referralOptions: grouped.referredBy,
    predefinedSurgeries,
    predefinedPackages,
  };
}

/**
 * Create a new inpatient record.
 * Calls next_ip_number() (H-3 atomic sequence) to assign the sequential ipNumber.
 * admissionDate is stored as an IST-anchored TIMESTAMPTZ.
 */
export async function createInPatient(
  s: Session,
  body: CreateInPatientBody,
): Promise<InPatient> {
  const repo = makeRepo(s);
  const nextNum = await repo.getNextIpNumber();
  const ipNumber = `IP-${String(nextNum).padStart(4, '0')}`;

  const parseDate = (val: string): string =>
    new Date(val.includes('T') ? val : `${val}T00:00:00+05:30`).toISOString();

  const now = new Date().toISOString();
  const payload: Record<string, unknown> = {
    ipNumber,
    patientId: body.patientId,
    admissionDate: parseDate(body.admissionDate),
    dischargeDate: body.dischargeDate ? parseDate(body.dischargeDate) : null,
    status: 'ADMITTED',
    ward: body.ward ?? null,
    bedNumber: body.bedNumber ?? null,
    onDutyDoctors: body.onDutyDoctors ?? '[]',
    paymentRecords: body.paymentRecords ?? null,
    prescriptions: body.prescriptions ?? null,
    createdById: body.createdById ?? s.id,
    createdAt: now,
    updatedAt: now,
  };

  const created = await repo.insertInPatient(payload);
  return created as unknown as InPatient;
}

/**
 * Fetch an inpatient record by UUID id.
 */
export async function getInPatientById(s: Session, id: string): Promise<InPatient> {
  const repo = makeRepo(s);
  const ip = await repo.findInPatientById(id);
  if (!ip) throw new NotFoundError('InPatient', id);
  return flattenInPatientPatient(ip) as unknown as InPatient;
}

/**
 * Full replacement update of an inpatient record (accepts raw body from index.ts,
 * which skips Zod validation for this broad-update endpoint).
 * System fields (id, hospital_id) are stripped before writing.
 */
export async function updateInPatient(
  s: Session,
  id: string,
  body: Partial<InPatient>,
): Promise<void> {
  const repo = makeRepo(s);
  const existing = await repo.findInPatientById(id);
  if (!existing) throw new NotFoundError('InPatient', id);

  const patch = { ...(body as Record<string, unknown>) };
  delete patch.id;
  delete patch.hospital_id;
  delete patch.ipNumber; // immutable after creation

  const now = new Date().toISOString();
  await repo.updateInPatientById(id, { ...patch, updatedAt: now });
}

/**
 * Update basic demographic info on an inpatient (name, ward, bed, on-duty doctors, etc.).
 */
export async function updateInPatientBasicInfo(
  s: Session,
  id: string,
  body: UpdateInPatientBasicInfo,
): Promise<void> {
  const repo = makeRepo(s);
  const existing = await repo.findInPatientById(id);
  if (!existing) throw new NotFoundError('InPatient', id);

  const patch: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  if (body.ward !== undefined) patch.ward = body.ward;
  if (body.bedNumber !== undefined) patch.bedNumber = body.bedNumber;
  if (body.onDutyDoctors !== undefined) patch.onDutyDoctors = body.onDutyDoctors;

  await repo.updateInPatientById(id, patch);
}

/**
 * Update clinical details on an inpatient (prescriptions JSON, paymentRecords JSON).
 * These are JSON string columns that the client manages directly.
 */
export async function updateInPatientDetails(
  s: Session,
  id: string,
  body: UpdateInPatientDetails,
): Promise<void> {
  const repo = makeRepo(s);
  const existing = await repo.findInPatientById(id);
  if (!existing) throw new NotFoundError('InPatient', id);

  const patch: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  if (body.prescriptions !== undefined) patch.prescriptions = body.prescriptions;
  if (body.paymentRecords !== undefined) patch.paymentRecords = body.paymentRecords;

  await repo.updateInPatientById(id, patch);
}

/**
 * Update the admission status of an inpatient.
 * Maps the simplified API value ('admitted'/'discharged') to the DB enum value.
 */
export async function updateInPatientStatus(
  s: Session,
  id: string,
  status: 'admitted' | 'discharged',
): Promise<void> {
  const repo = makeRepo(s);
  const existing = await repo.findInPatientById(id);
  if (!existing) throw new NotFoundError('InPatient', id);

  const dbStatus = status === 'admitted' ? 'ADMITTED' : 'DISCHARGED';
  await repo.updateInPatientById(id, {
    status: dbStatus,
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Record an additional payment against an inpatient.
 *
 * Appends the new payment to the paymentRecords JSON array stored on the row,
 * then recalculates totalReceivedAmount and balanceAmount.
 * Matches the old addInPatientPayment behavior.
 */
export async function addInPatientPayment(
  s: Session,
  id: string,
  body: AddInPatientPayment,
): Promise<void> {
  const repo = makeRepo(s);
  const ip = await repo.findInPatientById(id);
  if (!ip) throw new NotFoundError('InPatient', id);

  const existing: Record<string, unknown>[] = ip.paymentRecords
    ? JSON.parse(ip.paymentRecords as string)
    : [];

  const newRecord: Record<string, unknown> = {
    date: new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date()),
    paymentMode: body.paymentMode,
    amount: body.amount,
    notes: body.notes ?? null,
  };

  const updated = [...existing, newRecord];
  const totalReceived = updated.reduce((sum, r) => sum + (r.amount as number), 0);
  const netAmount = (ip.netAmount as number) ?? 0;
  const balanceAmount = Math.max(0, netAmount - totalReceived);

  await repo.updateInPatientById(id, {
    paymentRecords: JSON.stringify(updated),
    totalReceivedAmount: totalReceived,
    balanceAmount,
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Discharge an inpatient.
 * Sets status to "DISCHARGED", records the discharge date and summary.
 */
export async function dischargeInPatient(
  s: Session,
  id: string,
  body: DischargeInPatient,
): Promise<void> {
  const repo = makeRepo(s);
  const existing = await repo.findInPatientById(id);
  if (!existing) throw new NotFoundError('InPatient', id);

  const summaryJson = JSON.stringify({
    summary: body.dischargeSummary ?? '',
    finalAmount: body.finalAmount ?? null,
  });

  await repo.updateInPatientById(id, {
    status: 'DISCHARGED',
    dischargeDate: new Date(body.dischargeDate).toISOString(),
    dischargeNotes: summaryJson,
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Hard-delete an inpatient record.
 * Insurance claims are deleted first to satisfy the RESTRICT FK constraint.
 */
export async function deleteInPatient(s: Session, id: string): Promise<void> {
  const repo = makeRepo(s);
  const existing = await repo.findInPatientById(id);
  if (!existing) throw new NotFoundError('InPatient', id);
  await repo.deleteInPatientById(id);
}

// ============================================================
// DROPDOWN OPTIONS
// ============================================================

/**
 * List dropdown options for this hospital, optionally filtered by fieldName.
 * Returns the full option objects (id + fieldName + value).
 */
export async function getDropdownOptions(
  s: Session,
  fieldName?: string,
): Promise<Record<string, unknown>[]> {
  const repo = makeRepo(s);
  return repo.listDropdownOptions(fieldName);
}

/**
 * Add a dropdown option for a given fieldName.
 * Implements upsert semantics: if the (fieldName, value) pair already exists for
 * this hospital, it is returned as-is without inserting a duplicate.
 */
export async function addDropdownOption(
  s: Session,
  body: CreateDropdownOption,
): Promise<Record<string, unknown>> {
  const repo = makeRepo(s);
  const exists = await repo.dropdownOptionExists(body.fieldName, body.value);
  if (exists) {
    // Return a synthetic record — the caller just needs confirmation it exists.
    // A real lookup would be a second DB round-trip for data that the UI discards.
    return { fieldName: body.fieldName, value: body.value, existed: true };
  }
  return repo.insertDropdownOption(body.fieldName, body.value, s.id);
}
