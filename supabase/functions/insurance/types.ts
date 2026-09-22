import { z } from 'zod';

export const InsuranceCompanySchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  contactPerson: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  isDeleted: z.boolean().optional(),
});
export type InsuranceCompany = z.infer<typeof InsuranceCompanySchema>;

export const InsuranceClaimSchema = z.object({
  id: z.string().uuid().optional(),
  inpatientId: z.string().min(1),
  companyId: z.string().min(1),
  claimedAmount: z.number().nonnegative(),
  status: z.string().optional(),
  createdAt: z.string().datetime().optional(),
});
export type InsuranceClaim = z.infer<typeof InsuranceClaimSchema>;

export const UpdateClaimStatusSchema = z.object({
  status: z.string().min(1),
});

export const UpdateClaimDetailsSchema = z.object({
  approvedAmount: z.number().nonnegative().optional(),
  settledAmount: z.number().nonnegative().optional(),
});

export const AddClaimPaymentSchema = z.object({
  amount: z.number().positive(),
  paymentMode: z.string().min(1),
});

export const CompanyListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(50),
  paginated: z.coerce.boolean().default(true),
});

export const ClaimListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(50),
  status: z.string().optional(),
});
