import { z } from 'zod';

// dateFrom/dateTo match main's real Calls List filter (startDate/endDate range —
// src/app/(hospital)/call-logs/components/CallLogsPage.tsx fetchData/getCallLogs).
// `date` (single day) is kept for back-compat; dateFrom/dateTo take precedence
// when present.
export const CallLogListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(50),
  date: z.string().date().optional(),
  dateFrom: z.string().date().optional(),
  dateTo: z.string().date().optional(),
  status: z.string().optional(),
  direction: z.string().optional(),
  search: z.string().optional(),
});

export const AnalyticsQuerySchema = z.object({
  filter: z.string().optional(),
  customStart: z.string().date().optional(),
  customEnd: z.string().date().optional(),
});

export const UpdateNotesSchema = z.object({
  notes: z.string().min(1),
});

export const LinkPatientSchema = z.object({
  patientId: z.string().min(1),
});

export const PatientSearchQuerySchema = z.object({
  q: z.string().optional(),
});
