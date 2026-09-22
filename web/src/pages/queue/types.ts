/**
 * Queue module — shared TypeScript types.
 *
 * All shapes are derived from the OpenAPI schema (/.sde/schemas/openapi.yaml)
 * and cross-referenced against supabase/functions/queue/repository.ts.
 *
 * The backend's OpdQueueEntry / WorkupQueueEntry / InpatientBoardEntry are typed
 * as Record<string, unknown> because PostgREST returns wide nested joins. These
 * frontend types provide the explicit shape the repository actually returns.
 */

// ─── Nested sub-types ─────────────────────────────────────────────────────────

/** A single eye reading record (today's, filtered by the backend). */
export interface EyeReading {
  id: string
  readingDate: string
  createdAt: string
  [key: string]: unknown
}

/** Invoice line item nested inside an OPD prescription. */
export interface InvoiceItem {
  id: string
  description: string
  category: string | null
  quantity: number
  unitPrice: number
  amount: number
  sortOrder: number
}

/** Prescription as returned in the OPD queue — includes InvoiceItem expansion. */
export interface OpdPrescription {
  id: string
  prescriptionDate: string
  status: string
  doctorName: string | null
  createdAt: string
  items: InvoiceItem[]
  [key: string]: unknown
}

/** Prescription as returned in the workup queue — lighter (no billing data). */
export interface WorkupPrescription {
  id: string
  prescriptionDate: string
  status: string
  doctorName: string | null
  createdAt: string
}

/** Lab bill nested inside an OPD queue entry. */
export interface LabBill {
  id: string
  createdAt: string
  [key: string]: unknown
}

// ─── Queue entry types ─────────────────────────────────────────────────────────

/**
 * OPD doctor queue entry.
 *
 * A Patient row enriched with today's eyeReadings, prescriptions (with InvoiceItems),
 * labBills, and a computed `status` field.
 * Source: repository.getOpdQueue() → GET /queue/opd
 */
export interface OpdQueueEntry {
  id: string
  patientId: string
  firstName: string
  lastName: string
  phone: string
  gender: string
  dateOfBirth: string | null
  appointmentDate: string | null
  referredBy: string | null
  createdAt: string
  /** Today's eye readings (latest 1), filtered by backend. */
  eyeReadings: EyeReading[]
  /** Today's prescriptions (latest 1 with billing items), filtered by backend. */
  prescriptions: OpdPrescription[]
  /** Today's lab bills, filtered by backend. */
  labBills: LabBill[]
  /** Status computed in-process by backend from nested data — never stored in DB. */
  status: string
}

/**
 * Workup queue entry.
 *
 * A Patient row with today's eyeReadings and prescriptions (lighter — no billing).
 * Source: repository.getWorkupQueue() → GET /queue/workup
 */
export interface WorkupQueueEntry {
  id: string
  patientId: string
  firstName: string
  lastName: string
  phone: string
  gender: string
  dateOfBirth: string | null
  appointmentDate: string | null
  referredBy: string | null
  createdAt: string
  eyeReadings: EyeReading[]
  prescriptions: WorkupPrescription[]
  status: string
}

/**
 * Inpatient bed/status board entry.
 *
 * A full InPatient row (status != DISCHARGED), ordered admissionDate ASC.
 * Source: repository.getInpatientBoard() → GET /queue/inpatients
 */
export interface InpatientEntry {
  id: string
  /** Sequential IP number, e.g. "IP-0001". */
  ipNumber: string
  /** FK to Patient.patientId (sequential display ID). */
  patientId: string
  admissionDate: string
  dischargeDate: string | null
  status: string
  ward: string | null
  bedNumber: string | null
  /** JSON-encoded array of doctor name strings. */
  onDutyDoctors: string
  hospitalId: string
  createdAt: string
}
