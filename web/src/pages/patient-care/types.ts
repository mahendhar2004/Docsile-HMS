/**
 * patient-care/types.ts
 *
 * TypeScript types mirroring the OpenAPI schema for the patient-care module.
 * All field names match the exact names in .sde/schemas/openapi.yaml.
 */

// ─── Patient ──────────────────────────────────────────────────────────────────

export type PatientGender = "Male" | "Female" | "Other"

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
 * InPatient record — mirrors the InPatient schema in openapi.yaml.
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
  hospitalId: string
  createdById?: string | null
  createdAt: string
  /** Backend may join patient fields for display purposes. */
  firstName?: string
  lastName?: string
  phone?: string
  gender?: string
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
