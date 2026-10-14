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
 * One billed line item nested in a queue prescription (service name only —
 * enough for the queue table's Services column; full InvoiceItem fields are
 * only needed in the billing module itself).
 */
export interface QueueInvoiceItem {
  description: string
}

/**
 * One lab bill nested in the doctor queue (today's only, per service.ts).
 */
export interface QueueLabBill {
  id: string
  total: number
  lab: { name: string }
}

/**
 * Prescription row nested in the doctor queue (today's only, per service.ts).
 * The backend's repository.ts actually selects every Prescription column
 * (`Prescription(*, items:InvoiceItem(*))`), not just id/status/doctorName —
 * these extra fields power main's Services/Total/Balance queue columns.
 */
export interface QueuePrescription {
  id: string
  prescriptionDate: string
  status: string
  doctorName: string | null
  department: string | null
  total: number
  amountPaid: number
  balanceDue: number
  items: QueueInvoiceItem[]
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
  age?: number | null
  dateOfBirth?: string | null
  patientType: string
  appointmentDate: string
  /** Computed by service layer — never read directly from DB. */
  status: string
  referredBy?: string | null
  /** Assigned-at-registration doctor — falls back for today's prescriptions.doctorName. */
  doctorName?: string | null
  /** Today's eye readings (0 or 1 items after filtering). */
  eyeReadings: QueueEyeReading[]
  /** Today's prescriptions (0 or 1 items after filtering). */
  prescriptions: QueuePrescription[]
  /** Today's lab bills (repository selects `labBills:LabBill(*, lab:Lab(name), ...)`). */
  labBills: QueueLabBill[]
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

// Sitha AI types/hook moved to @/hooks/useAskSitha — Sitha is a global
// widget now (see components/layout/sitha-widget.tsx), not Doctor-specific.
