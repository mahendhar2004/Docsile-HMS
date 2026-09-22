import { z } from 'zod';

export const PatientSearchQuerySchema = z.object({
  q: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).default(8),
});

export const ExportQuerySchema = z.object({
  filter: z.string().optional(),
  customStart: z.string().date().optional(),
  customEnd: z.string().date().optional(),
});
export type ExportQuery = z.infer<typeof ExportQuerySchema>;
