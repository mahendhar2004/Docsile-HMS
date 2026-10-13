import { z } from 'zod';

/**
 * InsuranceCompany input schema.
 *
 * DB columns: name, tpaName, contactNumber, email, address, isActive.
 * NOTE: The openapi.yaml InsuranceCompany schema uses `contactPerson` and `phone` —
 * those do not exist as DB columns. The actual DB has `contactNumber` and `address`.
 * We use the DB field names here to prevent silent data loss on insert/update.
 */
export const InsuranceCompanySchema = z.object({
  name: z.string().min(1, 'Company name is required'),
  tpaName: z.string().nullable().optional(),
  contactNumber: z.string().nullable().optional(),
  email: z.string().email('Invalid email').nullable().optional(),
  address: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});
export type InsuranceCompany = z.infer<typeof InsuranceCompanySchema>;

/**
 * InsuranceClaim create body — matches what createInsuranceClaim (old actions.ts) expects.
 * The service fills the remaining DB columns from the InPatient row.
 */
export const InsuranceClaimSchema = z.object({
  inPatientId: z.string().min(1, 'inPatientId is required'),
  insuranceCompanyId: z.string().optional(),
  insuranceCompanyName: z.string().min(1, 'insuranceCompanyName is required'),
  tpaName: z.string().optional(),
  policyNumber: z.string().optional(),
  policyHolderName: z.string().optional(),
  insuranceCardNumber: z.string().optional(),
  relationToInsured: z.string().optional(),
  preauthAmount: z.number().min(0).default(0),
  notes: z.string().optional(),
});
export type InsuranceClaim = z.infer<typeof InsuranceClaimSchema>;

/**
 * Update claim status.
 * The API spec only requires `status`, but the service needs optional extra data for
 * certain status transitions (SETTLED → amount/settlementReference/deductions;
 * PREAUTH_APPROVED → amount; REJECTED variants → rejectionReason; etc.).
 * These optional fields are declared here so the index.ts can pass the full validated
 * body to the service (the index.ts bug fix passes `b.data` not just `b.data.status`).
 */
export const UpdateClaimStatusSchema = z.object({
  status: z.string().min(1, 'status is required'),
  notes: z.string().optional(),
  amount: z.number().optional(),
  rejectionReason: z.string().optional(),
  settlementReference: z.string().optional(),
  deductions: z.number().optional(),
});
export type UpdateClaimStatus = z.infer<typeof UpdateClaimStatusSchema>;

/**
 * Update claim policy/financial details (PATCH /claims/{id}/details).
 * openapi.yaml specifies approvedAmount and settledAmount.
 * We also expose the policy administration fields for completeness, matching
 * the old updateInsuranceClaimDetails behavior.
 */
export const UpdateClaimDetailsSchema = z.object({
  approvedAmount: z.number().nonnegative().optional(),
  settledAmount: z.number().nonnegative().optional(),
  insuranceCompanyName: z.string().optional(),
  insuranceCompanyId: z.string().optional(),
  tpaName: z.string().optional(),
  policyNumber: z.string().optional(),
  policyHolderName: z.string().optional(),
  insuranceCardNumber: z.string().optional(),
  relationToInsured: z.string().optional(),
  totalBillAmount: z.number().nonnegative().optional(),
  notes: z.string().optional(),
});
export type UpdateClaimDetails = z.infer<typeof UpdateClaimDetailsSchema>;

export const AddClaimPaymentSchema = z.object({
  amount: z.number().positive('amount must be positive'),
  paymentMode: z.string().min(1, 'paymentMode is required'),
  notes: z.string().optional(),
});
export type AddClaimPayment = z.infer<typeof AddClaimPaymentSchema>;

export const CompanyListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(50),
  paginated: z.coerce.boolean().default(true),
});
export type CompanyListQuery = z.infer<typeof CompanyListQuerySchema>;

export const ClaimListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(50),
  // Comma-separated list of statuses (e.g. "PREAUTH_SUBMITTED,PREAUTH_QUERY")
  // to support main's grouped status-filter buckets, which match several
  // raw statuses per pill (see _status-map.ts on main).
  status: z.string().optional(),
  // Matches main's `!showClosed` behavior: excludes CLOSED claims even when
  // no explicit status filter is set (the "All Active" bucket).
  excludeClosed: z.coerce.boolean().optional(),
  search: z.string().optional(),
});
export type ClaimListQuery = z.infer<typeof ClaimListQuerySchema>;
