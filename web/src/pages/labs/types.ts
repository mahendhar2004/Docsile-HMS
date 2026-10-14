/**
 * labs/types.ts
 *
 * TypeScript types for the labs module.
 *
 * Cross-referenced against:
 *   - supabase/functions/labs/types.ts         (field names; `total` not `totalAmount`, `amount` not `price`)
 *   - .sde/schemas/openapi.yaml                /labs/* paths
 *   - src/app/(hospital)/labs/components/LabBillCard.tsx         (PAYMENT_MODES)
 *   - src/app/(hospital)/labs/components/LabInvestigationConfig.tsx (INVESTIGATION_CATEGORIES)
 *   - src/app/(hospital)/labs/components/LabBillingTab.tsx        (bill statuses, LabBillRow shape)
 *   - src/app/(hospital)/labs/components/LabsPage.tsx             (LabWithCount fields)
 */

// ─── Lab ────────────────────────────────────────────────────────────────────

/**
 * Core lab record.
 * Fields match supabase/functions/labs/types.ts LabSchema exactly.
 */
export interface Lab {
  id: string
  name: string
  description: string | null
  location: string | null
  printHeaderKey: string | null
  isActive: boolean
  sortOrder: number
}

/**
 * Lab as returned from GET /labs/labs — GET /labs/labs (service.ts getLabs)
 * attaches an active-investigation count per lab, shaped exactly like main's
 * Prisma `_count.investigations` (see src/app/(hospital)/labs/actions.ts
 * getLabs / components/LabsPage.tsx LabWithCount).
 */
export interface LabWithCount extends Lab {
  _count: { investigations: number }
}

/**
 * Lab returned from GET /labs/labs/{id} — includes current investigation
 * mappings with amount and isDefault flags (from the lab_investigations join table).
 * Verified pattern from old app's getLabById action.
 */
export interface LabWithInvestigations extends Lab {
  investigations: LabInvestigationMapping[]
}

/** One investigation assignment row in the lab_investigations junction table. */
export interface LabInvestigationMapping {
  investigationId: string
  amount: number
  isDefault: boolean
}

// ─── InvestigationMaster ─────────────────────────────────────────────────────

/**
 * Investigation master record (GET /labs/investigations).
 * Fields match supabase/functions/labs/types.ts InvestigationMasterSchema.
 */
export interface InvestigationMaster {
  id: string
  name: string
  category: string | null
  description: string | null
}

// ─── LabBill ─────────────────────────────────────────────────────────────────

/**
 * Core lab bill record.
 *
 * IMPORTANT: The DB column is `total`, NOT `totalAmount`.
 * supabase/functions/labs/types.ts LabBillSchema explicitly notes this.
 * The OpenAPI schema incorrectly uses `totalAmount` — match the DB.
 */
export interface LabBill {
  id: string
  billNumber: string
  /** FK to Patient.patientId — sequential display ID e.g. "P-0001" */
  patientId: string
  labId: string
  prescriptionId: string | null
  /** DB column is `total`, not `totalAmount` */
  total: number
  discount: number
  discountReason: string | null
  createdAt: string
}

// ─── LabBillItem ─────────────────────────────────────────────────────────────

/**
 * One line item on a lab bill.
 *
 * IMPORTANT: The DB column is `amount`, NOT `price`.
 * supabase/functions/labs/types.ts LabBillItemSchema explicitly notes:
 * "DB column is `amount`, not `price` — scaffold had it wrong."
 */
export interface LabBillItem {
  id: string
  labBillId: string
  investigationId: string
  name: string
  /** DB column is `amount`, not `price` */
  amount: number
}

// ─── LabPayment ──────────────────────────────────────────────────────────────

export interface LabPayment {
  id: string
  labBillId: string
  paymentMode: string
  amount: number
  createdAt: string
}

// ─── LabBillRow ──────────────────────────────────────────────────────────────

/**
 * Enriched bill row returned from GET /labs/bills and GET /labs/bills/{id}.
 * Includes computed fields (subtotal, amountPaid, balanceDue, status) and
 * nested patient / lab / items data.
 * Shape verified against old app's LabBillingTab LabBillRow type.
 */
export interface LabBillRow {
  id: string
  billNumber: string
  createdAt: string
  subtotal: number
  discount: number
  total: number
  amountPaid: number
  balanceDue: number
  status: string
  paymentMode: string | null
  lab: {
    name: string
    printHeaderKey?: string | null
  }
  patient: {
    id: string
    patientId: string
    firstName: string
    lastName: string | null
    phone: string
    age?: number | null
    gender?: string | null
    address?: string | null
  }
  items: { name: string; amount: number }[]
}

// ─── Bill creation types ─────────────────────────────────────────────────────

/**
 * One bill entry in the POST /labs/bills multi-bill request.
 * Shape: { bill, items, payment? }
 */
export interface CreateBillEntry {
  bill: {
    patientId: string
    labId: string
    prescriptionId: string | null
    total: number
    discount: number
    discountReason: string | null
  }
  items: {
    investigationId: string
    name: string
    amount: number
  }[]
  payment?: {
    paymentMode: string
    amount: number
  }
}

/** POST /labs/bills request body — multi-bill batch. */
export interface CreateLabBillsBody {
  bills: CreateBillEntry[]
}

// ─── Bill detail types ───────────────────────────────────────────────────────

export interface LabBillDetailData {
  bill: LabBillRow
  items: { name: string; amount: number }[]
  payments: { paymentMode: string; amount: number; createdAt: string }[]
}

// ─── Patient investigation lookup ────────────────────────────────────────────

/** Verified against old app's LabBillingTab PatientInfo type. */
export interface PatientInfo {
  /** Sequential display ID, e.g. "P-0001" */
  patientId: string
  name: string
  age: number | null
  gender: string
  phone: string
  doctorName: string | null
}

/** Verified against old app's LabBillingTab PrescriptionInfo type. */
export interface PrescriptionInfo {
  id: string
  prescriptionNumber: string | null
  doctorName: string | null
  prescriptionDate: string
}

/** One lab group in the investigation response — investigations already segregated by lab. */
export interface LabGroup {
  lab: { id: string; name: string; location: string | null }
  items: { investigationId: string; name: string; amount: number }[]
}

/** An already-billed investigation warning entry. */
export interface ExistingBill {
  id: string
  billNumber: string
  labName: string
  total: number
  status: string
}

/**
 * Response from GET /labs/patients/{patientId}/investigations.
 * Verified against old app's getPatientInvestigations server action result.
 */
export interface PatientInvestigationsResponse {
  patient: PatientInfo
  prescription: PrescriptionInfo | null
  labGroups: LabGroup[]
  unassigned: { name: string; alreadyBilled: boolean }[]
  existingBills?: ExistingBill[]
}

// ─── Pending investigations ──────────────────────────────────────────────────

/**
 * One patient entry in GET /labs/pending-investigations response.
 * Shape verified against old app's LabBillingTab PendingPatient type
 * (inferred from getPendingLabInvestigations return).
 */
export interface PendingPatient {
  /** Sequential display ID e.g. "P-0001" */
  patientId: string
  patientName: string
  age: number | null
  gender: string
  doctorName: string | null
  investigationCount: number
  billCount: number
  prescriptionId: string
}

// ─── UI-only bill form state ─────────────────────────────────────────────────

/** Local bill form state for one lab group in the bills-tab. */
export interface BillFormData {
  labId: string
  items: { investigationId: string; name: string; amount: number }[]
  discount: number
  discountReason?: string
  paymentMode: string
  amountPaid: number
}

// ─── Constants (verified against old app source files) ───────────────────────

/**
 * Payment modes — verified against:
 * src/app/(hospital)/labs/components/LabBillCard.tsx
 * const PAYMENT_MODES = ["Cash", "UPI", "Card", "Cheque", "Online", "NEFT"]
 * Also confirmed in billing/types.ts PAYMENT_MODE_OPTIONS.
 */
export const PAYMENT_MODES = ["Cash", "UPI", "Card", "Cheque", "Online", "NEFT"] as const

/**
 * Investigation categories — verified against:
 * src/app/(hospital)/labs/components/LabInvestigationConfig.tsx
 * const INVESTIGATION_CATEGORIES = ["Lab Test", "Eye Test", "Imaging", "General"]
 */
export const INVESTIGATION_CATEGORIES = [
  "Lab Test",
  "Eye Test",
  "Imaging",
  "General",
] as const

/**
 * Bill status values — verified against:
 * src/app/(hospital)/labs/components/LabBillingTab.tsx STATUS_COLORS keys
 */
export const BILL_STATUSES = ["PAID", "PARTIAL", "PENDING", "CANCELLED"] as const

/**
 * Badge variants per bill status — from LabBillingTab STATUS_COLORS.
 * Maps to Badge `variant` prop in the web UI (adjusted for new Badge variants:
 * PENDING uses "muted" since old app used "secondary").
 */
export const BILL_STATUS_BADGE: Record<
  string,
  "success" | "warning" | "muted" | "secondary"
> = {
  PAID: "success",
  PARTIAL: "warning",
  PENDING: "muted",
  CANCELLED: "secondary",
}
