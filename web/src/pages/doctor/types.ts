/**
 * doctor/types.ts
 *
 * TypeScript types for the doctor module.
 * All field names mirror the OpenAPI spec (.sde/schemas/openapi.yaml)
 * and the backend supabase/functions/doctor/types.ts exactly.
 */

// ─── Queue ────────────────────────────────────────────────────────────────────

/**
 * Eye reading row nested in the doctor queue and consultation response.
 */
export interface QueueEyeReading {
  id: string
  readingDate: string
  createdAt: string
}

/**
 * Prescription row nested in the doctor queue (today's only, per service.ts).
 */
export interface QueuePrescription {
  id: string
  prescriptionDate: string
  status: string
  doctorName: string | null
  createdAt: string
}

/**
 * One patient entry in GET /doctor/queue.
 * Service layer merges three queries (appointment, prescription, eye-reading)
 * and computes `status` from actual data.
 */
export interface DoctorQueuePatient {
  id: string
  patientId: string
  firstName: string
  lastName: string
  phone: string
  gender: string
  patientType: string
  appointmentDate: string
  /** Computed by service layer — never read directly from DB. */
  status: string
  referredBy?: string | null
  /** Today's eye readings (0 or 1 items after filtering). */
  eyeReadings: QueueEyeReading[]
  /** Today's prescriptions (0 or 1 items after filtering). */
  prescriptions: QueuePrescription[]
}

// ─── Consultation ─────────────────────────────────────────────────────────────

/**
 * Prescription row as returned from the DB (medicines/investigations are
 * JSON-encoded strings — parse before use).
 */
export interface PrescriptionRecord {
  id: string
  patientId: string
  patientType: string
  status: string
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
  /** JSON-encoded MedicineItem[]. */
  medicines: string | null
  /** JSON-encoded InvestigationItem[]. */
  investigations: string | null
  followUpDate: string | null
  notes: string | null
  prescriptionDate: string
  createdAt: string
  updatedAt: string
}

/**
 * Eye reading row with full fields for display in the consultation panel.
 */
export interface ConsultationEyeReading {
  id: string
  readingDate: string
  /** JSON-encoded auto refractometer data. */
  autoRefractometer: string | null
  /** JSON-encoded present prescription (refraction). */
  presentPrescription: string | null
  /** JSON-encoded clinical findings (IOP, VA, remarks). */
  clinicalFindings: string | null
  createdAt: string
}

/**
 * Full consultation data returned by GET /doctor/patients/{id}/consultation.
 * The service layer spreads the Patient row and injects status + derived prescription groups.
 */
export interface ConsultationPatient {
  id: string
  patientId: string
  firstName: string
  lastName: string
  phone: string
  gender: string
  dateOfBirth?: string | null
  patientType: string
  /** Computed status from actual data. */
  status: string
  appointmentDate: string
  referredBy?: string | null
  /** Today's eye readings (sorted by createdAt DESC). */
  eyeReadings: ConsultationEyeReading[]
  /** All prescriptions sorted by createdAt DESC. */
  prescriptions: PrescriptionRecord[]
  /** Today's prescription if it exists; null otherwise. */
  todayPrescription: PrescriptionRecord | null
  /** All prescriptions except today's. */
  pastPrescriptions: PrescriptionRecord[]
}

// ─── Prescription request body ────────────────────────────────────────────────

/**
 * One medicine entry in a prescription (inner item in the medicines JSON array).
 * Field names match supabase/functions/doctor/types.ts MedicineItemSchema exactly.
 */
export interface MedicineItem {
  name: string
  days?: string
  timing?: string
  note?: string
}

/**
 * One investigation entry in a prescription.
 */
export interface InvestigationItem {
  name: string
  note?: string
}

/**
 * Request body for POST /doctor/patients/{id}/prescriptions (upsert).
 * Field names match supabase/functions/doctor/types.ts PrescriptionSchema exactly.
 */
export interface SavePrescriptionBody {
  patientId: string
  doctorName?: string
  department?: string
  temperature?: number | null
  pulseRate?: number | null
  spo2?: number | null
  heightCm?: number | null
  weightKg?: number | null
  presentComplaint?: string
  previousHistory?: string
  diagnosis?: string
  additionalNotes?: string
  medicines: MedicineItem[]
  investigations: InvestigationItem[]
  followUpDate?: string | null
  notes?: string
}

// ─── Reference data ───────────────────────────────────────────────────────────

/**
 * Medicine master record (GET /doctor/medicine-master or bundled in reference-data).
 * Fields match the MedicineMaster OpenAPI schema.
 */
export interface MedicineMasterRecord {
  id?: string
  name: string
  defaultTiming?: string | null
  defaultDays?: string | null
  category?: string | null
  note?: string | null
  hospitalId?: string
}

/**
 * Predefined prescription template (GET /doctor/prescription-templates).
 * medicines/investigations are JSON-encoded arrays.
 *
 * Field names verified against the old Next.js app's PrescriptionForm.tsx
 * Template interface and actions.ts getPrescriptionReferenceData().
 */
export interface PredefinedTemplate {
  id: string
  code: string
  name: string
  /** JSON-encoded MedicineItem[]. */
  medicines: string
  /** JSON-encoded InvestigationItem[]. */
  investigations: string
  /** Pre-fills the presentComplaint field when applied. */
  presentComplaint: string | null
  /** Pre-fills the previousHistory field when applied. */
  previousHistory: string | null
  /** Pre-fills the diagnosis field when applied. Note: called "provisionalDiagnosis" in the DB. */
  provisionalDiagnosis: string | null
  /** Pre-fills the additional notes field when applied. */
  additionalNotes: string | null
  /** Number of days from today for the follow-up date. */
  followUpDays: number | null
  hospitalId?: string
}

/**
 * Bundled reference data returned by GET /doctor/reference-data.
 * Single round-trip for everything the prescription form needs at mount.
 */
export interface ReferenceData {
  medicines: MedicineMasterRecord[]
  /** Investigation names only (not full records). */
  investigations: string[]
  complaintOptions: string[]
  previousHistoryOptions: string[]
  diagnosisOptions: string[]
  additionalNotesOptions: string[]
  templates: PredefinedTemplate[]
}

// ─── Create medicine ──────────────────────────────────────────────────────────

/**
 * Request body for POST /doctor/medicines.
 * Matches supabase/functions/doctor/types.ts MedicineMasterSchema.
 */
export interface CreateMedicineBody {
  name: string
  category?: string | null
  defaultTiming?: string | null
  defaultDays?: string | null
  note?: string | null
}

// ─── Dropdown options ─────────────────────────────────────────────────────────

/**
 * Request body for POST /doctor/dropdown-options.
 */
export interface AddDropdownOptionBody {
  fieldName: string
  value: string
}

// ─── AI assist ────────────────────────────────────────────────────────────────

/**
 * One turn in the AI conversation history.
 */
export interface SithaHistoryTurn {
  role: "user" | "model"
  text: string
}

/**
 * Request body for POST /doctor/ai/ask.
 * Matches supabase/functions/doctor/types.ts AskSithaSchema exactly.
 */
export interface AskSithaBody {
  /** Patient UUID or sequential ID — locks context to this patient. */
  patientId?: string | null
  /** The question (max 4000 chars). */
  question: string
  /** Prior turns; server caps to last 6. */
  history?: SithaHistoryTurn[]
  /** "analytics" switches to hospital-analytics mode; anything else = clinical mode. */
  module?: string
}

/**
 * Data field in the POST /doctor/ai/ask response envelope.
 */
export interface AskSithaResponse {
  answer: string
}
