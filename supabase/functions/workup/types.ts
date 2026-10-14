import { z } from 'zod';

/**
 * EyeReading request body schema.
 *
 * Matches actual DB columns in the EyeReading table (verified against
 * supabase-migration.sql). The scaffold's rightSphere / leftSphere etc. fields
 * do NOT exist in the database — those were invented field names. The real
 * optical-reading data is stored as JSON-encoded TEXT in:
 *   autoRefractometer, glassesReading, previousPrescription,
 *   presentPrescription, clinicalFindings.
 *
 * readingDate is sent as a YYYY-MM-DD string (IST) and serves as the
 * upsert key: at most one EyeReading per patient per IST calendar day.
 */
export const EyeReadingSchema = z.object({
  /** Patient.patientId (sequential text ID, e.g. "P001") */
  patientId: z.string().min(1),
  /** IST date string YYYY-MM-DD (or ISO timestamp) for the upsert day key */
  readingDate: z.string().min(1),
  /** JSON-encoded auto-refractometer readings */
  autoRefractometer: z.string().nullable().optional(),
  /** JSON-encoded glasses prescription readings */
  glassesReading: z.string().nullable().optional(),
  /** JSON-encoded previous prescription data */
  previousPrescription: z.string().nullable().optional(),
  /** JSON-encoded present prescription data */
  presentPrescription: z.string().nullable().optional(),
  /** JSON-encoded clinical findings */
  clinicalFindings: z.string().nullable().optional(),
});

export type EyeReading = z.infer<typeof EyeReadingSchema>;

/**
 * Query params for GET /workup/queue and GET /workup/patients/:patientId.
 * Matches the `date` convention used by patient-care's PatientListQuerySchema/
 * InPatientListQuerySchema — defaults to today (IST) when omitted.
 */
export const WorkupDateQuerySchema = z.object({
  date: z.string().date().optional(),
});
