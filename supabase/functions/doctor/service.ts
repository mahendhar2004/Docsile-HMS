/**
 * Business layer for the doctor module (12 endpoints).
 *
 * Responsibilities:
 *   - IST date-range computation (inline — no Next.js dependency)
 *   - Patient-status computation from actual data (never from the DB status field,
 *     except for manual overrides: MOVED / CANCELLED / NO_SHOW / VISITED)
 *   - savePrescription upsert: find today's existing Prescription for the patient
 *     (any status) by prescriptionDate in today's IST range, update it; if none
 *     exists, insert a new one. Status is always set to "COMPLETED".
 *   - askSithaAI (POST /doctor/ai/ask): Gemini-backed clinical/analytics assistant.
 *     Two modes: patient-clinical (builds a patient brief from the DB) and analytics
 *     (builds a hospital-level analytics brief). Calls Gemini REST via gemini-client.ts
 *     (M-5 fix: API key is sent as x-goog-api-key header, never as a URL param).
 *
 * No framework/transport concerns — no Request, no Response, no Hono imports.
 */

import type { Session } from '../_shared/auth.ts';
import type { Prescription, MedicineMaster, AskSitha } from './types.ts';
import { DoctorRepository } from './repository.ts';
import { getSupabaseClient } from '../_shared/supabase-client.ts';
import { NotFoundError } from '../_shared/errors.ts';
import { callGemini } from './gemini-client.ts';
import {
  buildAnalyticsContext,
  resolvePatientContext,
  MAX_HISTORY_TURNS,
} from './ai-context.ts';

// ── IST utilities (inline — no Next.js src/ imports allowed) ─────────────────

function toLocalDateISO(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
}

/**
 * Returns IST midnight-to-midnight boundaries for a given YYYY-MM-DD string (or
 * today if omitted), as UTC Date objects (start/end, for in-memory millisecond
 * comparisons against already-fetched records) AND as raw strings (startISO/
 * endISO, for direct use in Postgres `timestamp`-without-timezone column
 * queries — appointmentDate/prescriptionDate/readingDate are all this type).
 * Postgres ignores any offset on a literal cast to that type, so the raw
 * "+05:30" strings compare correctly against values stored the same way.
 * Do NOT use `start.toISOString()`/`end.toISOString()` for the DB query bound
 * — that performs a real UTC conversion, shifting the bound back by 5.5 hours
 * and excluding patients actually within the intended IST calendar day.
 */
function getISTDayBounds(
  dateStr?: string,
): { start: Date; end: Date; startISO: string; endISO: string } {
  const d = dateStr ?? toLocalDateISO();
  return {
    start: new Date(d + 'T00:00:00+05:30'),
    end: new Date(d + 'T23:59:59.999+05:30'),
    startISO: `${d}T00:00:00+05:30`,
    endISO: `${d}T23:59:59.999+05:30`,
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
  const { start, end, startISO, endISO } = getISTDayBounds();
  const startMs = start.getTime();
  const endMs = end.getTime();

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
  const { startISO, endISO } = getISTDayBounds();
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
    // Prescription.followUpDate is a TIMESTAMP column with no timezone — raw
    // string, not toISOString(), for the same reason as appointmentDate above.
    followUpDate: body.followUpDate
      ? `${body.followUpDate}T00:00:00+05:30`
      : null,
    notes: body.notes ?? null,
    status: 'COMPLETED',
  };

  const existing = await repo.findTodayPrescription(
    patientId,
    startISO,
    endISO,
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

// ── 12. POST /doctor/ai/ask ───────────────────────────────────────────────────

// System prompt — patient-clinical mode.
const SYSTEM_PROMPT = `You are Sitha, an AI assistant for ophthalmology clinicians at this hospital.

The first user message in this conversation contains a "PATIENT BRIEF". One of three things will be true:
1. A patient is locked in — the brief begins with "=== PATIENT ===" and contains real data. Use it.
2. No patient identifier was provided yet — the brief is a short note starting with "(NO PATIENT)". In this case, ask the user politely for the patient's UID (e.g. P-0005) or 10-digit phone number, then they can re-send the question.
3. The user's identifier matched no record — the brief starts with "(NOT FOUND)". Tell the user no patient matches and ask them to recheck the ID or phone.

Output format (IMPORTANT — your reply is rendered as markdown):
- Default to short paragraphs or compact bullet lists ("- item"). Avoid walls of text.
- For multi-fact answers, use bullets — one fact per line.
- For grouped answers (e.g. "dues by source"), use a short bold label then the value: "**Cash:** ₹2,500".
- Use "## Section" headings only when the answer naturally splits into two or more topics.
- Quote numbers, dates, names and IDs EXACTLY as they appear in the brief.
- Currency is ₹ (Indian Rupees). Dates are YYYY-MM-DD.
- Keep replies tight — 3–6 bullets or 2–3 short paragraphs is usually right. No filler.

Accuracy rules:
- Answer from the brief whenever the data is there. Be specific (amounts, dates, doctor names).
- If the brief does NOT contain the answer, say so plainly. Do NOT invent visits, bills, surgeries, medications or amounts.
- For clinical advice (dosing, differentials, drug interactions), be cautious and recommend the clinician verify. You are decision support, not authority.
- Skip filler disclaimers; one short caveat per session is enough.`;

// System prompt — analytics mode.
const ANALYTICS_SYSTEM_PROMPT = `You are Sitha, an AI analytics advisor for a hospital's management team.

The first user message contains a "HOSPITAL ANALYTICS BRIEF" with real, live data pulled from the hospital's database — patients, revenue, collections, dues, expenses, doctor performance, services, and more.

Your role:
- Answer any question about hospital performance, revenue, operations, or patient trends using ONLY the data in the brief.
- Calculate rates, ratios, and comparisons on-the-fly (e.g. "collection rate = collected / billed × 100").
- Give concrete, data-driven recommendations when asked how to improve (e.g. "your collection rate is 61% — here are three ways to close the gap").
- Flag anomalies you notice even if not asked — high dues, low-performing days, expense spikes.

When asked for a FINANCIAL HEALTH REPORT or FINANCIAL SUMMARY, always cover ALL of the following in order, using the exact section structure the user requested:
1. Revenue & Collections — total billed, collected, collection rate %, net cash flow; category breakdown (Consultations/Labs/Pharmacy/Optical/IPD) with ₹ and % of total.
2. Outstanding Dues — by module (OPD/IPD/Lab/Optical/Pharmacy) and grand total; flag the module with highest outstanding.
3. Expense Health — total expenses, top categories, expense-to-revenue ratio (expenses ÷ billed × 100); assess if healthy (<30% is good, 30–50% needs attention, >50% is concerning).
4. Performance Highlights — top doctor (patients + revenue), top service (revenue + count), weakest category.
5. Financial Health Score & Improvement Plan — score the overall health as Good / Needs Attention / Critical based on: collection rate (>85% = good, 70–85% = attention, <70% = critical), expense ratio, and dues-to-revenue ratio. Then give 4–6 specific, actionable improvement steps tied directly to the numbers — name exact figures, exact modules, exact gaps.

Output format (your reply is rendered as markdown):
- Use **bold labels** for financial figures: "**Consultations:** ₹1,20,000 (45%)"
- Use "## Heading" for each major section of a financial report.
- Use compact bullet lists inside sections; avoid walls of text.
- Quote numbers EXACTLY from the brief. Currency is ₹. Dates are YYYY-MM-DD.
- For improvement advice, anchor every point to actual data — never give generic advice.
- If a metric is not in the brief, say so plainly. Never invent numbers.`;

/**
 * POST /doctor/ai/ask — Sitha AI assistant (Gemini-backed).
 *
 * Two modes:
 *   - Patient-clinical (default): builds a structured brief for the patient
 *     identified by patientId or inferred from the question/history text.
 *   - Analytics (module === "analytics"): builds a hospital-level analytics brief.
 *
 * Permission: doctor:consult unconditionally (matches old code exactly — see
 * openapi.yaml description for the intentional-parity note).
 *
 * Logging: only metadata is logged (action, questionLength, module, isAnalytics).
 * The question text, answer text, and patient identifiers are NEVER logged.
 */
export async function askSithaAI(
  session: Session,
  input: AskSitha,
): Promise<{ answer: string }> {
  const supabase = getSupabaseClient();
  const isAnalytics = input.module === 'analytics';

  // Log metadata only — never the question text or patient identifiers.
  console.log(JSON.stringify({
    level: 'info',
    action: 'doctor.ai.ask',
    hospitalId: session.hospitalId,
    userId: session.id,
    isAnalytics,
    questionLength: input.question.length,
    hasPatientId: !!input.patientId,
    historyTurns: (input.history ?? []).length,
  }));

  // Cap history to the most recent MAX_HISTORY_TURNS turns.
  const trimmedHistory = (input.history ?? []).slice(-MAX_HISTORY_TURNS);

  if (isAnalytics) {
    const brief = await buildAnalyticsContext(supabase, session.hospitalId);

    const messages = [
      { role: 'user' as const,  text: `HOSPITAL ANALYTICS BRIEF (do not echo verbatim):\n${brief}` },
      { role: 'model' as const, text: 'Analytics brief loaded. Ask anything about hospital performance.' },
      ...trimmedHistory,
      { role: 'user' as const,  text: input.question },
    ];

    const result = await callGemini({
      system: ANALYTICS_SYSTEM_PROMPT,
      messages,
      maxOutputTokens: 2500,
      temperature: 0.3,
    });

    if (!result.ok) {
      // Return error as a structured 200 response matching the openapi.yaml contract
      // (the spec says 200 with answer OR a structured error — errors are not 4xx here
      // because the client needs to distinguish "Gemini not configured" from auth errors).
      return { answer: `Sorry, I couldn't get a response: ${result.error}` };
    }

    return { answer: result.text };
  }

  // Patient-clinical mode.
  const context = await resolvePatientContext(supabase, session.hospitalId, {
    patientId: input.patientId ?? null,
    question:  input.question,
    history:   trimmedHistory,
  });

  const messages = [
    { role: 'user' as const,  text: `PATIENT BRIEF (do not echo verbatim):\n${context}` },
    { role: 'model' as const, text: 'Patient brief read. Ask anything about this patient.' },
    ...trimmedHistory,
    { role: 'user' as const,  text: input.question },
  ];

  const result = await callGemini({
    system: SYSTEM_PROMPT,
    messages,
    maxOutputTokens: 1024,
    temperature: 0.4,
  });

  if (!result.ok) {
    return { answer: `Sorry, I couldn't get a response: ${result.error}` };
  }

  return { answer: result.text };
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
