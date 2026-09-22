import { z } from 'zod';

// queue module reads from multiple tables; no owned writable schemas
export const QueueQuerySchema = z.object({
  date: z.string().date().optional(),
});

/**
 * OPD queue entry: a full Patient row with eyeReadings and prescriptions (including
 * InvoiceItems) and labBills filtered to today, plus a computed `status` field.
 * Uses a wide record type because the shape comes from PostgREST's nested join expansion.
 */
export type OpdQueueEntry = Record<string, unknown>;

/**
 * Workup queue entry: a full Patient row with eyeReadings and prescriptions (id, status,
 * prescriptionDate, doctorName, createdAt — no InvoiceItem expansion) filtered to today,
 * plus a computed `status` field.
 */
export type WorkupQueueEntry = Record<string, unknown>;

/**
 * Inpatient board entry: a full InPatient row. All currently admitted (non-DISCHARGED)
 * inpatients are returned, ordered by admissionDate ascending (longest-staying first).
 */
export type InpatientBoardEntry = Record<string, unknown>;
