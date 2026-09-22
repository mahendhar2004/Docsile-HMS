/**
 * billing/types.ts
 *
 * TypeScript types for the billing module.
 * Cross-referenced against:
 *   - .sde/schemas/openapi.yaml  /billing/* paths
 *   - supabase/functions/billing/repository.ts  (field names / select clauses)
 *   - supabase/functions/billing/types.ts       (request body schemas)
 */

// ─── GET /billing/daily ───────────────────────────────────────────────────────
// Repository getDailySummary() returns these exact fields.

export interface DailySummary {
  /** IST calendar date this snapshot covers (YYYY-MM-DD). */
  date: string
  /** Unique patients billed on this date (non-cancelled prescriptions). */
  totalPatients: number
  /** Count of non-cancelled prescriptions issued on this date. */
  totalPrescriptions: number
  /** SUM(Prescription.total) — billed amount (subtotal minus discount). */
  totalBilled: number
  /** SUM(Prescription.amountPaid) — amount actually collected. */
  totalCollected: number
  /** SUM(Prescription.balanceDue) — still outstanding. */
  totalDues: number
  /** SUM(Prescription.discount) — total discount given. */
  totalDiscount: number
}

// ─── GET /billing/prescriptions ───────────────────────────────────────────────
// Repository listPrescriptions() selects these exact columns.

export interface BillingPrescription {
  id: string
  /** Sequential display ID e.g. "2026-0001". */
  prescriptionNumber: string
  /** FK to Patient.patientId (sequential display ID, e.g. P-0001). */
  patientId: string
  patientType: string | null
  doctorName: string | null
  department: string | null
  /** Total billed (subtotal minus discount). */
  total: number
  /** Amount collected so far. */
  amountPaid: number
  /** Outstanding balance (total - amountPaid). */
  balanceDue: number
  discount: number
  discountReason: string | null
  /** Prescription status (e.g. ACTIVE, CANCELLED). */
  status: string
  /** ISO datetime of prescription date. */
  prescriptionDate: string
  /** Primary payment mode recorded at prescription creation time. */
  paymentMode: string | null
  createdAt: string
}

// ─── GET /billing/prescriptions/{id} ─────────────────────────────────────────
// Repository getPrescriptionById() — full prescription + children.

export interface InvoiceItem {
  id: string
  prescriptionId: string
  description: string
  category: string | null
  quantity: number
  unitPrice: number
  amount: number
  sortOrder: number
}

export interface PaymentRecord {
  id: string
  prescriptionId: string
  amount: number
  paymentMode: string
  paymentRef: string | null
  receivedBy: string | null
  paymentDate: string
  notes: string | null
}

export interface PrescriptionDetailData {
  prescription: BillingPrescription & Record<string, unknown>
  invoiceItems: InvoiceItem[]
  payments: PaymentRecord[]
}

// ─── POST /billing/prescriptions/{id}/payments ────────────────────────────────
// Matches RecordPaymentSchema in supabase/functions/billing/types.ts.

export interface RecordPaymentBody {
  paymentMode: string
  amount: number
}

// ─── Derived / UI helpers ─────────────────────────────────────────────────────

/**
 * Payment mode options for the SingleSelect in the record-payment form.
 * Matches the PAYMENT_MODES constant used consistently across the old Next.js app:
 * patients/components/PatientActionsModal.tsx, PatientRegistrationStepper.tsx,
 * PatientDetail.tsx, AddServicesModal.tsx, labs/components/LabBillCard.tsx.
 */
export const PAYMENT_MODE_OPTIONS = [
  { value: "Cash", label: "Cash" },
  { value: "UPI", label: "UPI" },
  { value: "Card", label: "Card" },
  { value: "Cheque", label: "Cheque" },
  { value: "Online", label: "Online" },
  { value: "NEFT", label: "NEFT" },
] as const
