import { z } from 'zod';

export const DuesListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(50),
});

export const MarkPaidSchema = z.object({
  type: z.enum(['prescription', 'inpatient', 'labBill', 'pharmacyBill']),
  paymentMode: z.string().optional(),
  amount: z.number().positive().optional(),
});

export const SendEmailSchema = z.object({
  patientId: z.string().min(1),
  templateId: z.string().min(1),
  customMessage: z.string().nullable().optional(),
});
