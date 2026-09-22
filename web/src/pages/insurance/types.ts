/**
 * insurance/types.ts
 *
 * All TypeScript types for the Insurance module.
 *
 * Cross-referenced against:
 *   - src/lib/types.ts (old Next.js app) — InsuranceCompany, InsuranceClaim, InsuranceClaimStatus
 *   - supabase/functions/insurance/types.ts — request body schemas, DB field names
 *   - .sde/schemas/openapi.yaml — /insurance/* paths
 *   - src/app/(hospital)/insurance/components/InsuranceClaimDetail.tsx — PAYMENT_MODES
 *   - src/app/(hospital)/insurance/components/InsuranceClaimForm.tsx — RELATION_OPTIONS
 *   - src/app/(hospital)/insurance/components/InsuranceStatusBadge.tsx — status transitions
 */

// ─── InsuranceClaimStatus ─────────────────────────────────────────────────────
// Exact 13-value enum from src/lib/types.ts — do not alter.

export type InsuranceClaimStatus =
  | "PREAUTH_SUBMITTED"
  | "PREAUTH_QUERY"
  | "PREAUTH_APPROVED"
  | "PREAUTH_REJECTED"
  | "ENHANCEMENT_CLAIMED"
  | "ENHANCEMENT_QUERY"
  | "ENHANCEMENT_APPROVED"
  | "ENHANCEMENT_REJECTED"
  | "FINAL_BILL_SUBMITTED"
  | "SETTLED"
  | "PARTIALLY_SETTLED"
  | "CLAIM_REJECTED"
  | "CLOSED"

// ─── Status display labels ────────────────────────────────────────────────────
// Mirrors INS_STATUS_CONFIG from InsuranceStatusBadge.tsx.

export const INS_STATUS_LABELS: Record<InsuranceClaimStatus, string> = {
  PREAUTH_SUBMITTED: "Preauth Submitted",
  PREAUTH_QUERY: "Preauth Query",
  PREAUTH_APPROVED: "Preauth Approved",
  PREAUTH_REJECTED: "Preauth Rejected",
  ENHANCEMENT_CLAIMED: "Enhancement Claimed",
  ENHANCEMENT_QUERY: "Enhancement Query",
  ENHANCEMENT_APPROVED: "Enhancement Approved",
  ENHANCEMENT_REJECTED: "Enhancement Rejected",
  FINAL_BILL_SUBMITTED: "Final Bill Sent",
  SETTLED: "Settled",
  PARTIALLY_SETTLED: "Partially Settled",
  CLAIM_REJECTED: "Claim Rejected",
  CLOSED: "Closed",
}

// ─── Status transition map ────────────────────────────────────────────────────
// From InsuranceStatusBadge.tsx INS_STATUS_TRANSITIONS — exact values.

export const INS_STATUS_TRANSITIONS: Record<InsuranceClaimStatus, InsuranceClaimStatus[]> = {
  PREAUTH_SUBMITTED:    ["PREAUTH_QUERY", "PREAUTH_APPROVED", "PREAUTH_REJECTED"],
  PREAUTH_QUERY:        ["PREAUTH_APPROVED", "PREAUTH_REJECTED"],
  PREAUTH_APPROVED:     ["ENHANCEMENT_CLAIMED", "FINAL_BILL_SUBMITTED", "CLOSED"],
  PREAUTH_REJECTED:     ["CLOSED"],
  ENHANCEMENT_CLAIMED:  ["ENHANCEMENT_QUERY", "ENHANCEMENT_APPROVED", "ENHANCEMENT_REJECTED"],
  ENHANCEMENT_QUERY:    ["ENHANCEMENT_APPROVED", "ENHANCEMENT_REJECTED"],
  ENHANCEMENT_APPROVED: ["FINAL_BILL_SUBMITTED", "CLOSED"],
  ENHANCEMENT_REJECTED: ["FINAL_BILL_SUBMITTED", "CLOSED"],
  FINAL_BILL_SUBMITTED: ["SETTLED", "PARTIALLY_SETTLED", "CLAIM_REJECTED"],
  SETTLED:              ["CLOSED"],
  PARTIALLY_SETTLED:    ["SETTLED", "CLOSED"],
  CLAIM_REJECTED:       ["CLOSED"],
  CLOSED:               [],
}

// Status transitions that require an amount field.
export const STATUS_NEEDS_AMOUNT: InsuranceClaimStatus[] = [
  "PREAUTH_APPROVED",
  "ENHANCEMENT_CLAIMED",
  "ENHANCEMENT_APPROVED",
  "SETTLED",
  "PARTIALLY_SETTLED",
]

// Status transitions that require a rejection reason.
export const STATUS_NEEDS_REJECTION: InsuranceClaimStatus[] = [
  "PREAUTH_REJECTED",
  "ENHANCEMENT_REJECTED",
  "CLAIM_REJECTED",
]

// Status transitions that also need settlement reference + deductions.
export const STATUS_NEEDS_SETTLEMENT: InsuranceClaimStatus[] = ["SETTLED", "PARTIALLY_SETTLED"]

// ─── Payment modes ────────────────────────────────────────────────────────────
// From InsuranceClaimDetail.tsx line 28: const PAYMENT_MODES = [...]
// NOTE: Insurance uses "Bank Transfer" — different from billing's "NEFT"/"Online".

export const INSURANCE_PAYMENT_MODES = [
  "Cash",
  "UPI",
  "Card",
  "Bank Transfer",
  "Cheque",
] as const
export type InsurancePaymentMode = typeof INSURANCE_PAYMENT_MODES[number]

export const INSURANCE_PAYMENT_MODE_OPTIONS = INSURANCE_PAYMENT_MODES.map((m) => ({
  value: m,
  label: m,
}))

// ─── Relation to insured ──────────────────────────────────────────────────────
// From InsuranceClaimForm.tsx: const RELATION_OPTIONS = [...]

export const RELATION_OPTIONS = ["Self", "Spouse", "Child", "Parent", "Other"] as const

export const RELATION_SELECT_OPTIONS = RELATION_OPTIONS.map((r) => ({
  value: r,
  label: r,
}))

// ─── API response types ───────────────────────────────────────────────────────
// Field names verified against src/lib/types.ts and supabase/functions/insurance/types.ts.

/**
 * GET /insurance/companies — insurance company master record.
 * DB columns: name, tpaName, contactNumber, email, address, isActive.
 * (Note: openapi.yaml mentions contactPerson/phone — those are NOT real DB columns;
 *  the actual fields are contactNumber and address per supabase functions/insurance/types.ts.)
 */
export interface InsuranceCompany {
  id: string
  name: string
  tpaName: string | null
  contactNumber: string | null
  email: string | null
  address: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

/**
 * GET /insurance/companies — paginated response also includes unpaginated mode.
 * When `?paginated=false`, returns all companies in `data` (no meta).
 */
export interface InsuranceCompanyListItem {
  id: string
  name: string
  tpaName: string | null
  contactNumber: string | null
  email: string | null
  address: string | null
  isActive: boolean
}

/**
 * POST/PATCH /insurance/companies — request body.
 * Matches InsuranceCompanySchema from supabase/functions/insurance/types.ts.
 */
export interface InsuranceCompanyBody {
  name: string
  tpaName?: string | null
  contactNumber?: string | null
  email?: string | null
  address?: string | null
  isActive?: boolean
}

/**
 * InsuranceClaim — full record returned by GET /insurance/claims/{id} and GET /insurance/claims.
 * Field names verified against src/lib/types.ts InsuranceClaim type.
 */
export interface InsuranceClaim {
  id: string
  claimNumber: string
  inPatientId: string
  insuranceCompanyId: string | null

  // Patient info (denormalized from InPatient at claim creation time)
  patientName: string
  ipNumber: string
  age: number
  gender: string
  phone: string
  guardianName: string | null
  department: string | null
  doctorNames: string          // JSON-stringified string[]
  operationName: string | null
  provisionDiagnosis: string | null
  admissionDate: string | null
  dischargeDate: string | null

  // Insurance policy
  insuranceCompanyName: string
  tpaName: string | null
  policyNumber: string | null
  policyHolderName: string | null
  insuranceCardNumber: string | null
  relationToInsured: string | null

  // Financial summary
  packageAmount: number
  totalBillAmount: number
  preauthAmount: number
  enhancementAmount: number
  enhancementApproved: number
  totalApprovedAmount: number
  finalSettledAmount: number
  deductions: number
  discount: number
  patientPayableAmount: number
  patientPaidAmount: number
  patientBalance: number

  status: InsuranceClaimStatus

  // Lifecycle dates
  preauthSubmittedDate: string | null
  preauthApprovedDate: string | null
  preauthRejectionReason: string | null
  preauthQueryNotes: string | null
  enhancementClaimedDate: string | null
  enhancementApprovedDate: string | null
  enhancementRejectionReason: string | null
  enhancementQueryNotes: string | null
  finalBillSubmittedDate: string | null
  settlementDate: string | null
  settlementReference: string | null

  // JSON-encoded blobs
  statusHistory: string | null    // JSON InsuranceStatusHistoryEntry[]
  notes: string | null
  packageInclusions: string | null // JSON PackageInclusion[]

  createdById: string | null
  updatedBy: string | null
  createdAt: string
  updatedAt: string
}

/**
 * Status history entry parsed from InsuranceClaim.statusHistory.
 * From src/lib/types.ts InsuranceStatusHistoryEntry.
 */
export interface InsuranceStatusHistoryEntry {
  status: InsuranceClaimStatus
  date: string
  notes?: string
  updatedBy?: string
}

/**
 * Package inclusion item parsed from InsuranceClaim.packageInclusions.
 */
export interface PackageInclusion {
  name: string
  amount: number
  subItems?: { itemName: string; quantity: number; amount: number }[]
}

/**
 * POST /insurance/claims — request body.
 * Matches InsuranceClaimSchema from supabase/functions/insurance/types.ts.
 */
export interface CreateInsuranceClaimBody {
  inPatientId: string
  insuranceCompanyId?: string
  insuranceCompanyName: string
  tpaName?: string
  policyNumber?: string
  policyHolderName?: string
  insuranceCardNumber?: string
  relationToInsured?: string
  preauthAmount: number
  notes?: string
}

/**
 * PATCH /insurance/claims/{id}/status — request body.
 * Matches UpdateClaimStatusSchema from supabase/functions/insurance/types.ts.
 * The FULL field set is sent (not just status) per the task requirement.
 */
export interface UpdateClaimStatusBody {
  status: InsuranceClaimStatus
  notes?: string
  amount?: number
  rejectionReason?: string
  settlementReference?: string
  deductions?: number
}

/**
 * PATCH /insurance/claims/{id}/details — request body.
 * Matches UpdateClaimDetailsSchema from supabase/functions/insurance/types.ts.
 */
export interface UpdateClaimDetailsBody {
  approvedAmount?: number
  settledAmount?: number
  insuranceCompanyName?: string
  insuranceCompanyId?: string
  tpaName?: string
  policyNumber?: string
  policyHolderName?: string
  insuranceCardNumber?: string
  relationToInsured?: string
  totalBillAmount?: number
  notes?: string
}

/**
 * POST /insurance/claims/{id}/payments — request body.
 * Matches AddClaimPaymentSchema from supabase/functions/insurance/types.ts.
 */
export interface AddClaimPaymentBody {
  amount: number
  paymentMode: string
  notes?: string
}

/**
 * GET /insurance/inpatients/search — response item.
 * Returns InPatient rows matching q (name/phone/ipNumber).
 * Field names match the InPatient shape from old app InsuranceClaimForm.tsx SearchResult type.
 */
export interface InpatientSearchResult {
  id: string
  ipNumber: string
  name: string
  age: number
  gender: string
  phone: string
  department: string | null
  packageAmount: number
  netAmount: number
  admissionDate: string
  operationName: string | null
}

// ─── Status filter select options ─────────────────────────────────────────────

export const CLAIM_STATUS_FILTER_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "PREAUTH_SUBMITTED", label: "Preauth Submitted" },
  { value: "PREAUTH_QUERY", label: "Preauth Query" },
  { value: "PREAUTH_APPROVED", label: "Preauth Approved" },
  { value: "PREAUTH_REJECTED", label: "Preauth Rejected" },
  { value: "ENHANCEMENT_CLAIMED", label: "Enhancement Claimed" },
  { value: "ENHANCEMENT_QUERY", label: "Enhancement Query" },
  { value: "ENHANCEMENT_APPROVED", label: "Enhancement Approved" },
  { value: "ENHANCEMENT_REJECTED", label: "Enhancement Rejected" },
  { value: "FINAL_BILL_SUBMITTED", label: "Final Bill Sent" },
  { value: "SETTLED", label: "Settled" },
  { value: "PARTIALLY_SETTLED", label: "Partially Settled" },
  { value: "CLAIM_REJECTED", label: "Claim Rejected" },
  { value: "CLOSED", label: "Closed" },
]
