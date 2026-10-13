import { NotFoundError } from '../_shared/errors.ts';
import { getSupabaseClient } from '../_shared/supabase-client.ts';
import type { Session } from '../_shared/auth.ts';
import type { EyeReading } from './types.ts';
import { WorkupRepository } from './repository.ts';

// ─── Private helpers ───────────────────────────────────────────────────────────

/**
 * Returns today's date as YYYY-MM-DD string in IST (Asia/Kolkata).
 */
function toISTDateISO(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
}

/**
 * Get IST day boundaries for a YYYY-MM-DD date string (or today if omitted),
 * as raw strings for direct use in Postgres `timestamp` (no timezone) column
 * comparisons. Postgres ignores any offset on a literal cast to that type, so
 * these raw "+05:30" strings compare correctly against values stored the same
 * way. Do NOT convert these through `new Date(...).toISOString()` — that
 * performs a real UTC conversion, shifting the bound back by 5.5 hours and
 * excluding records actually within the intended IST calendar day.
 */
function getISTDayBounds(dateStr?: string): { start: string; end: string } {
  const d = dateStr ?? toISTDateISO();
  return {
    start: `${d}T00:00:00+05:30`,
    end: `${d}T23:59:59.999+05:30`,
  };
}

// ─── Service functions ─────────────────────────────────────────────────────────

/**
 * GET /workup/queue
 *
 * Returns today's workup queue — OPD patients who have an appointment, prescription,
 * or eye reading today. Status is computed in-process from nested relation data.
 * Ports `getWorkupQueue` from src/app/(hospital)/workup/actions.ts.
 */
export async function getWorkupQueue(session: Session): Promise<unknown[]> {
  const repo = new WorkupRepository(getSupabaseClient(), session.hospitalId);
  return repo.getWorkupQueue();
}

/**
 * GET /workup/patients/:patientId
 *
 * Returns a single patient's full record with today's eye readings and prescriptions
 * nested and filtered to the current IST day. Returns 404 if patient is not found
 * or does not belong to the requesting hospital.
 * Ports `getPatientForWorkup` from src/app/(hospital)/workup/actions.ts.
 */
export async function getPatientForWorkup(
  session: Session,
  patientId: string,
): Promise<unknown> {
  const repo = new WorkupRepository(getSupabaseClient(), session.hospitalId);
  const patient = await repo.getPatientForWorkup(patientId);
  if (!patient) {
    throw new NotFoundError('Patient', patientId);
  }
  return patient;
}

/**
 * POST /workup/patients/:patientId/eye-readings  (upsert)
 *
 * Creates or updates the eye reading for the patient on the given readingDate.
 * At most one EyeReading per patient per IST calendar day.
 *
 * UPDATE path (existing eye reading today):
 *   Updates the reading fields and records updatedBy = session.id.
 *
 * INSERT path (no eye reading today yet):
 *   Inserts a new EyeReading with status = 'COMPLETED'. Also links the reading to
 *   today's first unlinked Prescription (if one exists) by setting prescriptionId.
 *
 * Eye-reading-to-prescription linking logic:
 *   EyeReading.prescriptionId is a UNIQUE FK to Prescription.id. The link is set on
 *   INSERT only (not on UPDATE). We find the most recent today's Prescription whose id
 *   does not yet appear in any EyeReading.prescriptionId — using two queries: one to
 *   get today's prescriptions for the patient, and one to find which of those ids are
 *   already claimed by an existing EyeReading. The first unclaimed prescription id is
 *   set as prescriptionId on the new EyeReading row.
 *
 *   Note: the old Next.js code queried `.is("eyeReadingId", null)` on the Prescription
 *   table, which referenced a non-existent column and silently failed (always returned
 *   null), effectively disabling the link. The new implementation uses the correct two-
 *   query approach above, which will actually link prescriptions that were previously
 *   left unlinked. This is an intentional fix over the old code's silent failure.
 *
 * Ports `saveEyeReading` from src/app/(hospital)/workup/actions.ts.
 */
export async function saveEyeReading(
  session: Session,
  patientId: string,
  body: EyeReading,
): Promise<unknown> {
  const repo = new WorkupRepository(getSupabaseClient(), session.hospitalId);

  // Normalise readingDate to a YYYY-MM-DD string in IST.
  // body.readingDate may be an ISO timestamp (e.g. "2026-09-22T00:00:00Z") or
  // a plain date string ("2026-09-22"). Both are handled by parsing through Intl.
  const readingDateStr = body.readingDate.includes('T')
    ? new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(
        new Date(body.readingDate),
      )
    : body.readingDate;

  const { start: startISO, end: endISO } = getISTDayBounds(readingDateStr);

  // Check for an existing EyeReading today to determine upsert direction
  const existing = await repo.findTodayEyeReading(patientId, startISO, endISO);

  const eyeFields = {
    autoRefractometer: body.autoRefractometer ?? null,
    glassesReading: body.glassesReading ?? null,
    previousPrescription: body.previousPrescription ?? null,
    presentPrescription: body.presentPrescription ?? null,
    clinicalFindings: body.clinicalFindings ?? null,
  };

  if (existing) {
    // UPDATE path — existing reading found today; update fields only
    return repo.updateEyeReading(existing.id, {
      ...eyeFields,
      updatedBy: session.id,
    });
  }

  // INSERT path — no reading today yet; attempt to link today's prescription
  const unlinkedPrescription = await repo.findUnlinkedPrescription(patientId, startISO, endISO);

  return repo.insertEyeReading({
    patientId,
    // EyeReading.readingDate is a TIMESTAMP column with no timezone. Postgres
    // ignores any offset on a literal cast to that type, so the raw string
    // below stores exactly the intended IST calendar date. The old code's
    // `new Date(...).toISOString()` instead performed a real UTC conversion,
    // shifting the stored value back by 5.5 hours and filing every reading
    // under the previous calendar day — invisible in any same-day query
    // (findUnlinkedPrescription above, the workup queue) that uses the raw
    // string convention, as this repository's own queries already do.
    readingDate: `${readingDateStr}T00:00:00+05:30`,
    ...eyeFields,
    createdById: session.id,
    hospital_id: session.hospitalId,
    ...(unlinkedPrescription ? { prescriptionId: unlinkedPrescription.id } : {}),
  });
}

/**
 * POST /workup/patients/:patientId/start   (deprecated no-op)
 *
 * Patient workup status is computed from data (eye reading existence), not stored in
 * a status field. This function is kept for backward compatibility during the migration
 * and performs no database write.
 */
export async function startWorkup(_session: Session, _patientId: string): Promise<void> {
  // intentional no-op — kept for migration compatibility
}
