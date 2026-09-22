/**
 * Business layer for the doctor module (11 endpoints).
 *
 * Responsibilities:
 *   - IST date-range computation (inline — no Next.js dependency)
 *   - Patient-status computation from actual data (never from the DB status field,
 *     except for manual overrides: MOVED / CANCELLED / NO_SHOW / VISITED)
 *   - savePrescription upsert: find today's existing Prescription for the patient
 *     (any status) by prescriptionDate in today's IST range, update it; if none
 *     exists, insert a new one. Status is always set to "COMPLETED".
 *   - AI-assist (askSithaAI): exists in the OLD src/app/(hospital)/doctor/ai-actions.ts
 *     and is a Gemini-backed feature that builds patient and analytics context briefs
 *     for a conversational AI assistant. It is NOT in scope for this module — no
 *     endpoint in the openapi.yaml doctor tag covers it. It is deferred; when the
 *     doctor module's frontend is built, the AI-assist feature will need its own
 *     dedicated endpoint (e.g. POST /doctor/ai/ask) and a separate evaluation of
 *     whether the Gemini integration can run in a Deno/Edge Function context.
 *
 * No framework/transport concerns — no Request, no Response, no Hono imports.
 */

import type { Session } from '../_shared/auth.ts';
import type { Prescription, MedicineMaster } from './types.ts';
import { DoctorRepository } from './repository.ts';
import { getSupabaseClient } from '../_shared/supabase-client.ts';
import { NotFoundError } from '../_shared/errors.ts';

// ── IST utilities (inline — no Next.js src/ imports allowed) ─────────────────

function toLocalDateISO(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
}

/**
 * Returns IST midnight-to-midnight boundaries for a given YYYY-MM-DD string (or
 * today if omitted), as UTC Date objects. Safe on any server timezone.
 */
function getISTDayBounds(dateStr?: string): { start: Date; end: Date } {
  const d = dateStr ?? toLocalDateISO();
  return {
    start: new Date(d + 'T00:00:00+05:30'),
    end: new Date(d + 'T23:59:59.999+05:30'),
  };
}

/**
 * Compute patient queue status from actual data — never stored in DB.
 *
 * Rules (from src/lib/utils.ts computePatientStatus, kept in sync):
 *   - Manual overrides: MOVED / CANCELLED / NO_SHOW / VISITED → return as-is
 *   - Workup + doctor prescription → COMPLETED
 *   - Workup only → WORKUP_DONE
 *   - Doctor prescription only → MEDICAL_ONLY
 *   - Neither → REGISTERED
 */
function computePatientStatus(
  hasWorkup: boolean,
  hasDoctorPrescription: boolean,
  dbStatus?: string,
): string {
  if (dbStatus && ['MOVED', 'CANCELLED', 'NO_SHOW', 'VISITED'].includes(dbStatus)) {
    return dbStatus;
  }
  if (hasWorkup && hasDoctorPrescription) return 'COMPLETED';
  if (hasWorkup) return 'WORKUP_DONE';
  if (hasDoctorPrescription) return 'MEDICAL_ONLY';
  return 'REGISTERED';
}

// ── Factory ───────────────────────────────────────────────────────────────────

function makeRepo(session: Session): DoctorRepository {
  return new DoctorRepository(getSupabaseClient(), session.hospitalId);
}

// ── 1. GET /doctor/queue ──────────────────────────────────────────────────────

export async function getDoctorQueue(session: Session): Promise<unknown[]> {
  const repo = makeRepo(session);
  const { start, end } = getISTDayBounds();
  const startMs = start.getTime();
  const endMs = end.getTime();
  const startISO = start.toISOString();
  const endISO = end.toISOString();

  const patients = (await repo.getQueue(startISO, endISO)) as Array<Record<string, unknown>>;

  function isInDay(dateStr: string): boolean {
    const t = new Date(dateStr).getTime();
    return t >= startMs && t <= endMs;
  }

  return patients.map((p) => {
    const eyeReadings = (p.eyeReadings as Array<Record<string, unknown>>) ?? [];
    const prescriptions = (p.prescriptions as Array<Record<string, unknown>>) ?? [];
    const labBills = (p.labBills as Array<Record<string, unknown>>) ?? [];

    const todayEyeReadings = eyeReadings
      .filter((er) => isInDay(er.readingDate as string))
      .sort((a, b) => new Date(b.createdAt as string).getTime() - new Date(a.createdAt as string).getTime())
      .slice(0, 1);

    const todayPrescriptions = prescriptions
      .filter((rx) => isInDay(rx.prescriptionDate as string))
      .sort((a, b) => new Date(b.createdAt as string).getTime() - new Date(a.createdAt as string).getTime())
      .slice(0, 1);

    const todayLabBills = labBills.filter((lb) => isInDay(lb.createdAt as string));

    const hasWorkup = todayEyeReadings.length > 0;
    const hasDoctorPrescription = todayPrescriptions.some(
      (rx) => rx.status !== 'BILLING_ONLY' && rx.doctorName !== null,
    );

    return {
      ...p,
      eyeReadings: todayEyeReadings,
      prescriptions: todayPrescriptions,
      labBills: todayLabBills,
      status: computePatientStatus(hasWorkup, hasDoctorPrescription, p.status as string | undefined),
    };
  });
}

// ── 2. GET /doctor/patients/:patientId/consultation ───────────────────────────

export async function getPatientConsultation(session: Session, patientId: string): Promise<unknown> {
  const repo = makeRepo(session);
  const { start, end } = getISTDayBounds();
  const startMs = start.getTime();
  const endMs = end.getTime();

  function isInDay(dateStr: string): boolean {
    const t = new Date(dateStr).getTime();
    return t >= startMs && t <= endMs;
  }

  const patient = (await repo.findPatient(patientId)) as Record<string, unknown> | null;
  if (!patient) throw new NotFoundError('Patient', patientId);

  const eyeReadings = (patient.eyeReadings as Array<Record<string, unknown>>) ?? [];
  const prescriptions = (patient.prescriptions as Array<Record<string, unknown>>) ?? [];

  const todayEyeReadings = eyeReadings
    .filter((er) => isInDay(er.readingDate as string))
    .sort((a, b) => new Date(b.createdAt as string).getTime() - new Date(a.createdAt as string).getTime());

  const hasWorkup = todayEyeReadings.length > 0;
  const hasDoctorPrescription = prescriptions.some(
    (rx) => rx.status !== 'BILLING_ONLY' && rx.doctorName !== null,
  );
  const computedStatus = computePatientStatus(
    hasWorkup,
    hasDoctorPrescription,
    patient.status as string | undefined,
  );

  const sortedPrescriptions = prescriptions
    .slice()
    .sort((a, b) => new Date(b.createdAt as string).getTime() - new Date(a.createdAt as string).getTime());

  const todayPrescription =
    sortedPrescriptions.find((rx) => isInDay(rx.prescriptionDate as string)) ?? null;

  const pastPrescriptions = sortedPrescriptions.filter(
    (rx) => !todayPrescription || rx.id !== todayPrescription.id,
  );

  return {
    ...patient,
    eyeReadings: todayEyeReadings,
    prescriptions: sortedPrescriptions,
    status: computedStatus,
    todayPrescription,
    pastPrescriptions,
  };
}

// ── 3. POST /doctor/patients/:patientId/prescriptions (upsert) ────────────────
//
// Upsert key: (patientId, today's IST date range on prescriptionDate).
//
// Logic (ported exactly from old savePrescription in actions.ts):
//   1. Find any existing Prescription for this patient whose prescriptionDate
//      falls within today's IST start..end, ordered by createdAt DESC LIMIT 1.
//   2. If found → UPDATE it with the medical data (captures a billing-only
//      prescription that was created when the receptionist registered the visit).
//   3. If not found → INSERT a new prescription.
//   In both cases, status is set to "COMPLETED" and medicines/investigations are
//   JSON-stringified. followUpDate is converted to IST midnight UTC.

export async function savePrescription(
  session: Session,
  patientId: string,
  body: Prescription,
): Promise<unknown> {
  const repo = makeRepo(session);
  const { start, end } = getISTDayBounds();
  const now = new Date().toISOString();

  const medicalData = {
    doctorId: session.role === 'DOCTOR' ? session.id : null,
    doctorName: body.doctorName ?? null,
    department: body.department ?? null,
    temperature: body.temperature ?? null,
    pulseRate: body.pulseRate ?? null,
    spo2: body.spo2 ?? null,
    heightCm: body.heightCm ?? null,
    weightKg: body.weightKg ?? null,
    presentComplaint: body.presentComplaint ?? null,
    previousHistory: body.previousHistory ?? null,
    diagnosis: body.diagnosis ?? null,
    additionalNotes: body.additionalNotes ?? null,
    medicines: JSON.stringify(body.medicines ?? []),
    investigations: JSON.stringify(body.investigations ?? []),
    followUpDate: body.followUpDate
      ? new Date(body.followUpDate + 'T00:00:00+05:30').toISOString()
      : null,
    notes: body.notes ?? null,
    status: 'COMPLETED',
  };

  const existing = await repo.findTodayPrescription(
    patientId,
    start.toISOString(),
    end.toISOString(),
  );

  if (existing) {
    return repo.updatePrescription(existing.id, {
      ...medicalData,
      updatedBy: session.id,
      updatedAt: now,
    });
  }

  return repo.insertPrescription({
    patientId,
    patientType: 'OPD',
    hospital_id: session.hospitalId,
    ...medicalData,
    prescriptionDate: now,
    createdBy: session.id,
    createdAt: now,
    updatedAt: now,
  });
}

// ── 4. GET /doctor/reference-data ────────────────────────────────────────────
//
// Single round-trip that bundles all reference data the PrescriptionForm needs
// at mount time — ported from getPrescriptionReferenceData in old actions.ts.

export async function getReferenceData(session: Session): Promise<unknown> {
  const repo = makeRepo(session);

  const [medicines, investigationsRaw, dropdownOptions, templates] = await Promise.all([
    repo.getMedicineMaster(),
    repo.getInvestigationMaster(),
    repo.getDropdownOptions(),
    repo.getPredefinedTemplates(),
  ]);

  // Old code returned investigation names only (not full records) for the form.
  const investigations = (investigationsRaw as Array<{ name: string }>).map((x) => x.name);

  return {
    medicines,
    investigations,
    complaintOptions: dropdownOptions.presentComplaint,
    previousHistoryOptions: dropdownOptions.previousHistory,
    diagnosisOptions: dropdownOptions.diagnosis,
    additionalNotesOptions: dropdownOptions.additionalNotes,
    templates,
  };
}

// ── 5. GET /doctor/medicine-master ───────────────────────────────────────────

export async function getMedicineMaster(session: Session): Promise<unknown[]> {
  return makeRepo(session).getMedicineMaster();
}

// ── 6. GET /doctor/investigation-master ──────────────────────────────────────

export async function getInvestigationMaster(session: Session): Promise<unknown[]> {
  return makeRepo(session).getInvestigationMaster();
}

// ── 7. GET /doctor/prescription-templates ────────────────────────────────────

export async function getPrescriptionTemplates(session: Session): Promise<unknown[]> {
  return makeRepo(session).getPredefinedTemplates();
}

// ── 8. GET /doctor/dropdown-options ──────────────────────────────────────────
//
// Returns all doctor dropdown options grouped by fieldName:
//   { presentComplaint: string[], previousHistory: string[], diagnosis: string[], additionalNotes: string[] }

export async function getDropdownOptions(session: Session): Promise<Record<string, string[]>> {
  return makeRepo(session).getDropdownOptions();
}

// ── 9. POST /doctor/dropdown-options ─────────────────────────────────────────
//
// Idempotent: if the (fieldName, value, hospital_id) triple already exists, the
// operation is a no-op (not an error). This matches the old addDropdownOption
// behavior which checked before inserting.

export async function addDropdownOption(
  session: Session,
  body: { fieldName: string; value: string },
): Promise<void> {
  const repo = makeRepo(session);
  const exists = await repo.dropdownOptionExists(body.fieldName, body.value);
  if (exists) return;

  await repo.insertDropdownOption({
    fieldName: body.fieldName,
    value: body.value,
    hospital_id: session.hospitalId,
    createdBy: session.id,
    createdAt: new Date().toISOString(),
  });
}

// ── 10. POST /doctor/medicines ────────────────────────────────────────────────

export async function createMedicine(session: Session, body: MedicineMaster): Promise<unknown> {
  const now = new Date().toISOString();
  return makeRepo(session).insertMedicine({
    name: body.name,
    category: body.category ?? null,
    defaultTiming: body.defaultTiming ?? null,
    defaultDays: body.defaultDays ?? null,
    note: body.note ?? null,
    hospital_id: session.hospitalId,
    createdBy: session.id,
    createdAt: now,
    updatedAt: now,
  });
}

// ── 11. GET /doctor/patients/:patientId/receipt (billing:view) ────────────────
//
// Doctor view of a patient receipt (during consultation). Filters to TODAY's
// prescription and eye reading only — the doctor view is for the active visit.
//
// Permission is billing:view because this crosses the billing boundary; it is
// implemented here (not in the billing module) because it's called from the
// doctor consultation context. No cross-module import required — the query is
// self-contained.

export async function getPatientReceipt(session: Session, patientId: string): Promise<unknown> {
  const repo = makeRepo(session);
  const { start, end } = getISTDayBounds();
  const startMs = start.getTime();
  const endMs = end.getTime();

  function isInDay(dateStr: string): boolean {
    const t = new Date(dateStr).getTime();
    return t >= startMs && t <= endMs;
  }

  const [patientRaw, hospital] = await Promise.all([
    repo.findPatientWithReceipt(patientId),
    repo.getHospitalProfile(),
  ]);

  const patient = patientRaw as Record<string, unknown> | null;
  if (!patient) throw new NotFoundError('Patient', patientId);

  const sortByCreatedDesc = (
    a: Record<string, unknown>,
    b: Record<string, unknown>,
  ): number =>
    new Date(b.createdAt as string).getTime() - new Date(a.createdAt as string).getTime();

  const eyeReadings = ((patient.eyeReadings as Array<Record<string, unknown>>) ?? [])
    .filter((er) => isInDay(er.readingDate as string))
    .sort(sortByCreatedDesc)
    .slice(0, 1);

  const prescriptions = ((patient.prescriptions as Array<Record<string, unknown>>) ?? [])
    .filter((rx) => isInDay(rx.prescriptionDate as string))
    .sort(sortByCreatedDesc)
    .slice(0, 1);

  return {
    patient: { ...patient, eyeReadings, prescriptions },
    hospital,
    prescription: prescriptions[0] ?? null,
    eyeReading: eyeReadings[0] ?? null,
  };
}
