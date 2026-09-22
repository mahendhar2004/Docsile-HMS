import { z } from 'zod';

export const PatientSearchQuerySchema = z.object({
  q: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).default(8),
});
export type PatientSearchQuery = z.infer<typeof PatientSearchQuerySchema>;

export const ExportQuerySchema = z.object({
  filter: z.string().optional(),
  customStart: z.string().date().optional(),
  customEnd: z.string().date().optional(),
  /**
   * Full-text search across key fields.
   * Not defined in openapi.yaml's parameters list, but matches the original
   * data/actions.ts export contract that the frontend sends.
   */
  search: z.string().optional(),
  /**
   * Filter patients by type (OPD/IPD/ALL).
   * Applies to the /exports/patients endpoint only.
   */
  patientType: z.enum(['OPD', 'IPD', 'ALL']).optional(),
  /**
   * Filter by entity status (e.g. PENDING, COMPLETED, ALL).
   * Applies to prescriptions, inpatients, insurance-claims, and lab-bills exports.
   */
  status: z.string().optional(),
});
export type ExportQuery = z.infer<typeof ExportQuerySchema>;
