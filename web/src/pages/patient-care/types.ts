/**
 * patient-care/types.ts
 *
 * TypeScript types mirroring the OpenAPI schema for the patient-care module.
 * All field names match the exact names in .sde/schemas/openapi.yaml.
 */

// ─── Patient ──────────────────────────────────────────────────────────────────

export type PatientGender = "Male" | "Female" | "Other"

/**
 * One payment against a patient's latest prescription (nested under
 * PatientLatestPrescription.payments) — not in openapi.yaml (the schema only
 * documents the bare Patient row), but genuinely returned by GET
 * /patient-care/patients: service.ts's listPatients() attaches the latest
 * prescription (with its payments/items) to every row for display purposes.
 */
export interface PatientPrescriptionPayment {
  amount: number
  paymentMode: string | null
}

/** One billed line item on a patient's latest prescription. */
export interface PatientPrescriptionItem {
  description: string
  sortOrder: number | null
}

/**
 * The patient's single latest prescription, as attached by listPatients()
 * (sliced to the most recent one; full fields documented in the Prescription
 * schema, but only these are selected for the list endpoint).
 */
export interface PatientLatestPrescription {
  id: string
  status: string
  doctorName: string | null
  createdAt: string
  prescriptionDate: string
  total: number
  balanceDue: number
  amountPaid: number
  payments: PatientPrescriptionPayment[]
  items: PatientPrescriptionItem[]
}

/** The patient's single latest eye reading, as attached by listPatients(). */
export interface PatientLatestEyeReading {
  id: string
  readingDate: string
  createdAt: string
}

/**
 * Patient record — mirrors the Patient schema in openapi.yaml.
 * Status values: REGISTERED | IN_WORKUP | WORKUP_DONE | WITH_DOCTOR |
 *   VISITED | COMPLETED | MEDICAL_ONLY | MOVED | CANCELLED | NO_SHOW
 */
export interface Patient {
  id: string
  patientId: string
  firstName: string
  lastName?: string | null
  phone: string
  email?: string | null
  gender: PatientGender
  dateOfBirth?: string | null
  age?: number | null
  /** Kept for backward-compat display reads — new writes use the structured fields below. */
  address?: string | null
  addressLine?: string | null
  area?: string | null
  city?: string | null
  state?: string | null
  pincode?: string | null
  guardianName?: string | null
  guardianRelation?: string | null
  doctorName?: string | null
  department?: string | null
  /** Open, tenant-editable "patient type" tag (e.g. "Regular") — unrelated to patientType (OPD/IPD). */
  patientCategory?: string | null
  patientType: string
  appointmentDate: string
  status?: string | null
  referredBy?: string | null
  notes?: string | null
  createdById?: string | null
  hospitalId: string
  createdAt: string
  updatedAt: string
  /**
   * Latest prescription only (0 or 1 items), attached by listPatients() for
   * the OPD table's Doctor/Services/Receipt columns — not in openapi.yaml.
   */
  prescriptions?: PatientLatestPrescription[]
  /** Latest eye reading only (0 or 1 items), attached by listPatients(). */
  eyeReadings?: PatientLatestEyeReading[]
}

/**
 * Request body for POST /patient-care/patients (patient registration).
 * Server assigns id, patientId, hospitalId, createdById, createdAt, updatedAt.
 */
export interface CreatePatientBody {
  firstName: string
  lastName?: string | null
  phone: string
  email?: string | null
  gender: PatientGender
  dateOfBirth?: string | null
  age?: number | null
  address?: string | null
  addressLine?: string | null
  area?: string | null
  city?: string | null
  state?: string | null
  pincode?: string | null
  guardianName?: string | null
  guardianRelation?: string | null
  doctorName?: string | null
  department?: string | null
  patientCategory?: string | null
  patientType: string
  appointmentDate: string
  referredBy?: string | null
  notes?: string | null
}

/**
 * Request body for PATCH /patient-care/patients/{id}.
 * All fields are optional for a partial update; at least one must be provided.
 */
export type UpdatePatientBody = Partial<CreatePatientBody>

/**
 * Request body for PATCH /patient-care/patients/{id}/status.
 */
export interface UpdatePatientStatusBody {
  status: string
}

/**
 * Request body for PATCH /patient-care/patients/{id}/date.
 */
export interface MovePatientDateBody {
  appointmentDate: string
}

// ─── InPatient ────────────────────────────────────────────────────────────────

export type InPatientStatus = "admitted" | "discharged"

export interface PackageInclusion {
  name: string
  amount: number
}

export interface PaymentRecord {
  date: string
  amountType: string
  paymentMode: string
  amount: number
  notes?: string
}

/**
 * InPatient record — a self-contained demographic + admission + operation +
 * billing record in main (not a thin link to Patient); `patientId` is only
 * an optional reference to an existing OPD patient found via lookup, never
 * a required FK. Note the DB stores doctorNames/onDutyDoctors/
 * packageInclusions/paymentRecords as JSON-encoded strings — parse before
 * display, stringify before sending.
 */
export interface InPatient {
  id: string
  ipNumber: string
  patientId?: string | null
  name: string
  age: number
  gender: "MALE" | "FEMALE" | "OTHER"
  phone: string
  /** Kept for backward-compat display reads — new writes use the structured fields below. */
  address?: string | null
  addressLine?: string | null
  area?: string | null
  city?: string | null
  state?: string | null
  pincode?: string | null
  dateOfBirth?: string | null
  guardianName?: string | null
  admissionDate: string
  admissionNotes?: string | null
  referredBy?: string | null
  department?: string | null
  doctorNames: string
  onDutyDoctors: string
  operationName?: string | null
  operationDate?: string | null
  operationProcedure?: string | null
  operationDetails?: string | null
  provisionDiagnosis?: string | null
  dischargeDate?: string | null
  dischargeNotes?: string | null
  packageAmount: number
  packageInclusions?: string | null
  discount: number
  netAmount: number
  totalReceivedAmount: number
  balanceAmount: number
  paymentRecords?: string | null
  prescriptions?: string | null
  status: string
  hospitalId: string
  createdById?: string | null
  createdAt: string
  /**
   * Legacy fields the quick-glance IPD tab list (`ipd-tab.tsx`) still reads —
   * `ward`/`bedNumber` don't match the real DB column (`wardName`) and have
   * likely always been undefined there (a separate, pre-existing issue, not
   * introduced by the admission wizard rebuild); `firstName`/`lastName` come
   * from the backend's Patient join. Kept optional for backward compat with
   * that list view, which is out of scope for this change.
   */
  ward?: string | null
  bedNumber?: string | null
  firstName?: string
  lastName?: string
}

/**
 * Request body for POST /patient-care/inpatients (admission).
 * Server assigns id, ipNumber, hospitalId, createdById, createdAt, status,
 * and computes netAmount/totalReceivedAmount/balanceAmount from
 * packageAmount/discount/paymentRecords.
 */
export interface CreateInPatientBody {
  patientId?: string | null
  name: string
  age: number
  gender: "MALE" | "FEMALE" | "OTHER"
  phone: string
  address?: string | null
  addressLine?: string | null
  area?: string | null
  city?: string | null
  state?: string | null
  pincode?: string | null
  dateOfBirth?: string | null
  guardianName?: string | null
  admissionDate: string
  admissionNotes?: string | null
  referredBy?: string | null
  department?: string | null
  doctorNames: string[]
  onDutyDoctors: string[]
  operationName?: string | null
  operationDate?: string | null
  operationProcedure?: string | null
  operationDetails?: string | null
  provisionDiagnosis?: string | null
  dischargeDate?: string | null
  packageAmount: number
  packageInclusions?: PackageInclusion[]
  discount?: number
  paymentRecords?: PaymentRecord[]
}

/**
 * Request body for PATCH /patient-care/inpatients/{id}/status.
 */
export interface UpdateInPatientStatusBody {
  status: InPatientStatus
}

/**
 * Request body for PATCH /patient-care/inpatients/{id}/basic-info.
 */
export interface UpdateInPatientBasicInfoBody {
  ward?: string
  bedNumber?: string
  onDutyDoctors?: string
}

// ─── Services ─────────────────────────────────────────────────────────────────

/**
 * Request body for POST /patient-care/patients/{id}/services.
 */
export interface AddServiceBody {
  serviceTemplateId: string
  paymentMode: string
  amount?: number
}

/** One line item in CreatePrescriptionWithBillingBody.invoiceItems. */
export interface InvoiceItemBody {
  description: string
  category?: string | null
  quantity: number
  unitPrice: number
  amount: number
}

/**
 * Request body for POST /patient-care/patients/{id}/prescriptions — the
 * generic multi-item billing endpoint the registration wizard's Services &
 * Payment step uses (as opposed to /services, which only takes one
 * ServiceTemplate at a time). Reuses the service-layer's "roll into today's
 * existing Prescription" behavior.
 */
export interface CreatePrescriptionWithBillingBody {
  prescription?: {
    prescriptionDate?: string
    discount?: number
    discountReason?: string
    diagnosis?: string
  }
  invoiceItems?: InvoiceItemBody[]
  payment?: {
    paymentMode: string
    amount: number
  }
}

export interface CreatePrescriptionWithBillingResponse {
  prescriptionId: string
  prescriptionNumber: string
}

// ─── Dropdown options ─────────────────────────────────────────────────────────

export interface DropdownOption {
  id: string
  fieldName: string
  value: string
  hospitalId: string
}

// ─── Search ───────────────────────────────────────────────────────────────────

/**
 * Response data shape for GET /patient-care/patients/search.
 * Note: cursor is embedded in `data`, NOT in `meta` — use regular useQuery,
 * not useCursorQuery, for the autocomplete search.
 */
export interface PatientSearchData {
  patients: Patient[]
  nextCursor: string | null
}

// ─── Next-ID previews ─────────────────────────────────────────────────────────

export interface NextPatientIdData {
  nextPatientId: string
}

export interface NextIpNumberData {
  nextIpNumber: string
}

// ─── Registration / admission form reference data ────────────────────────────

/**
 * Reference data for the patient registration form
 * (GET /patient-care/patients/registration-form) — matches
 * service.ts's getPatientRegistrationFormData() return shape exactly.
 */
export interface RegistrationFormData {
  hospitalProfile: HospitalProfileSummary | null
  serviceTemplates: ServiceTemplate[]
  doctorOptions: string[]
  departmentOptions: string[]
  referralOptions: string[]
  addressOptions: string[]
  patientCategoryOptions: string[]
  cityOptions: string[]
}

/** Just the fields the registration wizard's receipt step and registration-fee toggle need. */
export interface HospitalProfileSummary {
  name: string
  displayName?: string | null
  address?: string | null
  phone?: string | null
  email?: string | null
  website?: string | null
  registrationNo?: string | null
  logoUrl?: string | null
  registrationFeeEnabled?: boolean
  registrationFeeAmount?: number | null
  registrationFeeDefaultChecked?: boolean
}

export interface ServiceTemplate {
  id: string
  name: string
  amount: number
  category: string
  discount: number
  isActive: boolean
  sortOrder: number
}

export interface PredefinedSurgery {
  id: string
  name: string
  department?: string | null
  doctorNames: string
  onDutyDoctors: string
  provisionDiagnosis?: string | null
  operationProcedure?: string | null
  operationDetails?: string | null
}

export interface PredefinedPackage {
  id: string
  name: string
  totalAmount: number
  inclusions: string
  discount?: number | null
}

/**
 * Reference data for the inpatient admission form, bundled in one call
 * (GET /patient-care/inpatients/admission-form) — mirrors main's
 * getInPatientAdmissionFormData exactly.
 */
export interface AdmissionFormData {
  hospitalProfile: HospitalProfileSummary | null
  doctorOptions: string[]
  departmentOptions: string[]
  referralOptions: string[]
  cityOptions: string[]
  predefinedSurgeries: PredefinedSurgery[]
  predefinedPackages: PredefinedPackage[]
}

// ─── Receipt data (GET /patient-care/patients/{id}/receipt) ───────────────────
//
// Backend returns full raw DB rows (.select('*', ...)) — field names verified
// against db/create-hospital-db.sql's Prescription/InvoiceItem/Payment/
// HospitalProfile table DDL, which is more complete than this endpoint's
// under-documented OpenAPI schemas (same documentation gap as the Patient
// list endpoint's nested prescriptions/eyeReadings — see listPatients in
// supabase/functions/patient-care/service.ts).

/** One InvoiceItem row, as nested under a receipt prescription. */
export interface ReceiptInvoiceItem {
  id: string
  prescriptionId: string
  description: string
  category?: string | null
  quantity: number
  unitPrice: number
  amount: number
  sortOrder: number
}

/** One Payment row, as nested under a receipt prescription. */
export interface ReceiptPayment {
  id: string
  prescriptionId: string
  paymentMode: string
  amount: number
  createdAt: string
}

/**
 * Full Prescription row (all DB columns), as returned nested under
 * GET /patient-care/patients/{id}/receipt — richer than PrescriptionRecord
 * in doctor/types.ts, which only covers the doctor consultation's own needs.
 */
export interface ReceiptPrescription {
  id: string
  prescriptionNumber: string | null
  patientId: string
  patientType: string
  doctorId: string | null
  doctorName: string | null
  department: string | null
  temperature: number | null
  pulseRate: number | null
  spo2: number | null
  heightCm: number | null
  weightKg: number | null
  presentComplaint: string | null
  previousHistory: string | null
  diagnosis: string | null
  additionalNotes: string | null
  /** JSON-encoded MedicineItem[] */
  medicines: string
  /** JSON-encoded InvestigationItem[] */
  investigations: string
  followUpDate: string | null
  notes: string | null
  subtotal: number
  discount: number
  discountReason: string | null
  total: number
  amountPaid: number
  balanceDue: number
  paymentMode: string | null
  paymentDate: string | null
  status: string
  prescriptionDate: string
  createdAt: string
  updatedAt: string
  items?: ReceiptInvoiceItem[]
  payments?: ReceiptPayment[]
}

/**
 * Full Patient row plus nested eyeReadings/prescriptions — richer than the
 * list endpoint's Patient.prescriptions/eyeReadings (which are a trimmed,
 * latest-only summary for the OPD table columns), since the receipt
 * endpoint returns full Prescription/EyeReading rows.
 */
export interface ReceiptPatient extends Omit<Patient, "eyeReadings" | "prescriptions"> {
  eyeReadings: import("../workup/types").EyeReadingRecord[]
  prescriptions: ReceiptPrescription[]
}

/** Full HospitalProfile row — verified against db/create-hospital-db.sql. */
export interface ReceiptHospitalProfile {
  id: string
  name: string
  displayName: string | null
  address: string | null
  phone: string | null
  email: string | null
  website: string | null
  logoUrl: string | null
  registrationNo: string | null
  gstin: string | null
  /** JSON-encoded settings blob (navStyle, defaultPrint, etc). */
  settings: string
}

/**
 * Response shape of GET /patient-care/patients/{id}/receipt — matches
 * getPatientReceiptData in supabase/functions/patient-care/service.ts
 * exactly: `{ patient: {...with eyeReadings, prescriptions}, hospital,
 * prescription: prescriptions[0] ?? null, eyeReading: eyeReadings[0] ?? null }`.
 */
export interface PatientReceiptData {
  patient: ReceiptPatient | null
  hospital: ReceiptHospitalProfile | null
  prescription: ReceiptPrescription | null
  eyeReading: import("../workup/types").EyeReadingRecord | null
}
