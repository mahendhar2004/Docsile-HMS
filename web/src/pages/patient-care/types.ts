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
  lastName: string
  phone: string
  email?: string | null
  gender: PatientGender
  dateOfBirth?: string | null
  address?: string | null
  patientType: string
  appointmentDate: string
  status?: string | null
  referredBy?: string | null
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
  lastName: string
  phone: string
  email?: string | null
  gender: PatientGender
  dateOfBirth?: string | null
  address?: string | null
  patientType: string
  appointmentDate: string
  referredBy?: string | null
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

/**
 * InPatient record — mirrors the InPatient schema in openapi.yaml, plus real
 * DB columns openapi.yaml under-documents (confirmed in
 * db/create-hospital-db.sql's InPatient table DDL): `operationName` (TEXT)
 * and `balanceAmount` (DOUBLE PRECISION), both already returned by
 * `.select('*')` in repository.ts, just never declared here before.
 * `onDutyDoctors`, `paymentRecords`, `prescriptions` are JSON-encoded arrays.
 */
export interface InPatient {
  id: string
  ipNumber: string
  patientId: string
  admissionDate: string
  dischargeDate?: string | null
  status: InPatientStatus
  ward?: string | null
  bedNumber?: string | null
  onDutyDoctors: string
  paymentRecords: string
  prescriptions: string
  operationName?: string | null
  balanceAmount?: number
  hospitalId: string
  createdById?: string | null
  createdAt: string
  /**
   * Joined from Patient (InPatient.patientId -> Patient.id) by
   * listInPatients/getInPatientById in the backend — previously undeclared
   * here even though the comment said "backend may join," and in fact the
   * backend never did, so every row fell back to a truncated UUID.
   */
  firstName?: string
  lastName?: string
  phone?: string
  gender?: string
  dateOfBirth?: string | null
}

/**
 * Request body for POST /patient-care/inpatients (admission).
 * Server assigns id, ipNumber, hospitalId, createdById, createdAt.
 */
export interface CreateInPatientBody {
  patientId: string
  admissionDate: string
  status?: InPatientStatus
  ward?: string | null
  bedNumber?: string | null
  onDutyDoctors?: string
  paymentRecords?: string
  prescriptions?: string
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
 * (GET /patient-care/patients/registration-form).
 * Shape is not detailed in the spec — using a loose type.
 */
export interface RegistrationFormData {
  serviceTemplates?: ServiceTemplate[]
  patientTypes?: string[]
  referralSources?: string[]
  [key: string]: unknown
}

export interface ServiceTemplate {
  id: string
  name: string
  amount: number
  category?: string
}

/**
 * Reference data for the inpatient admission form
 * (GET /patient-care/inpatients/admission-form).
 */
export interface AdmissionFormData {
  wards?: string[]
  surgeryTypes?: string[]
  doctors?: string[]
  [key: string]: unknown
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
