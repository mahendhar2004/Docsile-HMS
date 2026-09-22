import { z } from 'zod';

export const BillingDateQuerySchema = z.object({
  date: z.string().date().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(50),
});

export const RecordPaymentSchema = z.object({
  paymentMode: z.string().min(1, 'paymentMode is required'),
  amount: z.number().positive('amount must be positive'),
});

export type RecordPaymentBody = z.infer<typeof RecordPaymentSchema>;
