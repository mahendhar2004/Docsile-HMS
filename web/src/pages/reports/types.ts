/**
 * reports/types.ts
 *
 * TypeScript types for the reports module.
 * Cross-referenced against:
 *   - .sde/schemas/openapi.yaml      /reports/* paths
 *   - supabase/functions/reports/service.ts  (mapped output shapes)
 *   - supabase/functions/reports/types.ts    (query schemas)
 *   - src/app/(hospital)/reports/components/ (old Next.js app — ground truth)
 *   - src/app/(hospital)/data/components/DataExportPage.tsx (export ground truth)
 */

// ─── GET /reports/patients/search ─────────────────────────────────────────────
// Shape from service.ts searchPatients() mapped output.

export interface PatientSearchResult {
  /** Patient UUID (internal) — used for all subsequent report API calls. */
  id: string
  /** Sequential display ID, e.g. "P-0001". */
  patientId: string
  firstName: string
  lastName: string | null
  fullName: string
  phone: string
  age: number | null
  gender: string
  dateOfBirth: string | null
  patientType: string
  registeredOn: string
  lastVisitDate: string | null
}

// ─── GET /reports/patients/{patientId}/summary ────────────────────────────────
// Shape from service.ts getPatientSummary() mapped output.

export interface PatientSummary {
  /** Patient UUID — used as the route param for all /reports/patients/* calls. */
  id: string
  /** Sequential display ID, e.g. "P-0001". */
  patientId: string
  firstName: string
  lastName: string | null
  fullName: string
  phone: string
  email: string | null
  age: number | null
  gender: string
  dateOfBirth: string | null
  address: string | null
  registeredOn: string
  lastVisit: string | null
  opdVisits: number
  hasInpatient: boolean
  inpatientStatus: string | null
  totalBilled: number
  totalPaid: number
  totalDues: number
}

// ─── GET /reports/patients/{patientId}/visits ─────────────────────────────────
// Shape from repo.getPatientVisits() — selects from Prescription.

export interface PatientVisit {
  id: string
  prescriptionNumber: string | null
  prescriptionDate: string
  patientType: string
  doctorName: string | null
  department: string | null
  presentComplaint: string | null
  diagnosis: string | null
  total: number
  balanceDue: number
  status: string
  followUpDate: string | null
}

/**
 * Prescription status values — verified from VisitHistoryTab.tsx STATUS_MAP.
 */
export const VISIT_STATUS_MAP: Record<
  string,
  { label: string; variant: "default" | "secondary" | "error" | "outline" }
> = {
  DRAFT: { label: "Draft", variant: "secondary" },
  BILLED: { label: "Billed", variant: "default" },
  PAID: { label: "Paid", variant: "default" },
  PARTIAL: { label: "Partial", variant: "outline" },
  CANCELLED: { label: "Cancelled", variant: "error" },
}

// ─── GET /reports/patients/{patientId}/prescriptions ─────────────────────────
// Shape from repo.getPatientPrescriptions() + service.ts items sort.

export interface Medicine {
  name?: string
  timing?: string
  days?: string
  notes?: string
}

export interface PrescriptionInvoiceItem {
  id: string
  description: string
  amount: number
  sortOrder: number
}

export interface PatientPrescription {
  id: string
  prescriptionNumber: string | null
  prescriptionDate: string
  patientType: string
  doctorName: string | null
  medicines: string | null    // JSON-encoded Medicine[]
  investigations: string | null  // JSON-encoded string[] | { name: string }[]
  presentComplaint: string | null
  diagnosis: string | null
  additionalNotes: string | null
  followUpDate: string | null
  items: PrescriptionInvoiceItem[]
}

// ─── GET /reports/patients/{patientId}/inpatient ──────────────────────────────
// Shape from repo.getPatientInpatient() — single record or null.
// InPatient.patientId is UUID FK to Patient.id — service passes route UUID directly.

export interface IPInsuranceClaim {
  id: string
  claimNumber: string
  insuranceCompanyName: string
  status: string
  totalApprovedAmount: number
  finalSettledAmount: number
}

export interface InpatientRecord {
  id: string
  ipNumber: string
  name: string
  status: string
  admissionDate: string
  dischargeDate: string | null
  department: string | null
  wardName: string | null
  bedNumber: string | null
  /** JSON-encoded string[] of doctor names. */
  doctorNames: string | null
  provisionDiagnosis: string | null
  operationName: string | null
  operationDate: string | null
  packageAmount: number
  discount: number
  netAmount: number
  totalReceivedAmount: number
  balanceAmount: number
  admissionNotes: string | null
  /** JSON-encoded IPPrescription[]. */
  prescriptions: string | null
  /** JSON-encoded DischargeSummary. */
  dischargeNotes: string | null
  /** JSON-encoded payment records. */
  paymentRecords: string | null
  insuranceClaims: IPInsuranceClaim[]
}

/**
 * InPatient status values — verified from InpatientRecordsTab.tsx STATUS_COLORS.
 */
export const INPATIENT_STATUS_COLORS: Record<
  string,
  "default" | "secondary" | "error" | "outline"
> = {
  ADMITTED: "default",
  DISCHARGED: "secondary",
  CANCELLED: "error",
}

// ─── GET /reports/patients/{patientId}/labs ───────────────────────────────────
// Shape from service.ts getPatientLabs() mapped output.

export interface LabBillItem {
  id: string
  name: string
  amount: number
  sortOrder: number
}

export interface LabBillPayment {
  id: string
  paymentDate: string
  amount: number
  paymentMode: string
}

export interface LabRecord {
  id: string
  billNumber: string
  status: string
  subtotal: number
  discount: number
  total: number
  amountPaid: number
  balanceDue: number
  paymentMode: string | null
  createdAt: string
  lab: {
    name: string
    printHeaderKey?: string | null
  }
  items: LabBillItem[]
  payments: LabBillPayment[]
}

/**
 * Lab bill status → badge variant — verified from LabRecordsTab.tsx STATUS_VARIANT.
 */
export const LAB_STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "error" | "outline"
> = {
  PAID: "default",
  PARTIAL: "outline",
  PENDING: "secondary",
  CANCELLED: "error",
}

// ─── GET /reports/patients/{patientId}/billing ────────────────────────────────
// Shape from service.ts getPatientBilling() mapped output.

export interface BillingPrescriptionRow {
  id: string
  prescriptionNumber: string | null
  prescriptionDate: string
  total: number
  amountPaid: number
  balanceDue: number
  status: string
  payments: Array<{
    id: string
    amount: number
    paymentMode: string
    paymentDate: string
  }>
}

export interface BillingLabBillRow {
  id: string
  billNumber: string
  createdAt: string
  total: number
  amountPaid: number
  balanceDue: number
  status: string
  lab: { name: string }
  payments: Array<{
    id: string
    amount: number
    paymentMode: string
    paymentDate: string
  }>
}

export interface BillingInpatientRow {
  packageAmount: number
  discount: number
  netAmount: number
  totalReceivedAmount: number
  balanceAmount: number
  /** JSON-encoded payment records array. */
  paymentRecords: string | null
}

export interface BillingData {
  summary: {
    opdTotal: number
    opdPaid: number
    opdDue: number
    labTotal: number
    labPaid: number
    labDue: number
    ipdTotal: number
    ipdPaid: number
    ipdDue: number
    grandTotal: number
    grandPaid: number
    grandDue: number
  }
  prescriptions: BillingPrescriptionRow[]
  labBills: BillingLabBillRow[]
  inpatient: BillingInpatientRow | null
}

// ─── GET /reports/exports/* ───────────────────────────────────────────────────
// Export types — verified from DataExportPage.tsx TAB_CONFIG and service.ts maps.

/**
 * Export endpoint identifiers — map directly to the API path segment.
 * Verified against OpenAPI /reports/exports/* paths.
 */
export type ExportEndpoint =
  | "patients"
  | "prescriptions"
  | "eye-readings"
  | "inpatients"
  | "insurance-claims"
  | "lab-bills"
  | "pharmacy-bills"
  | "optical-bills"
  | "expenses"

export type ExportCellFormat =
  | "date"
  | "currency"
  | "json"
  | "eyeAR"
  | "eyeDN"
  | "eyeCF"

export interface ExportColumnDef {
  key: string
  label: string
  format?: ExportCellFormat
}

/**
 * Export tab configuration — columns verified from DataExportPage.tsx TAB_CONFIG.
 * Each entry maps directly to a GET /reports/exports/{endpoint} call.
 */
export const EXPORT_TAB_CONFIG: Record<
  ExportEndpoint,
  { label: string; columns: ExportColumnDef[] }
> = {
  patients: {
    label: "Patients",
    columns: [
      { key: "patientId", label: "Patient ID" },
      { key: "firstName", label: "First Name" },
      { key: "lastName", label: "Last Name" },
      { key: "age", label: "Age" },
      { key: "gender", label: "Gender" },
      { key: "phone", label: "Phone" },
      { key: "email", label: "Email" },
      { key: "address", label: "Address" },
      { key: "guardianName", label: "Guardian" },
      { key: "referredBy", label: "Referred By" },
      { key: "doctorName", label: "Doctor" },
      { key: "department", label: "Department" },
      { key: "patientType", label: "Type" },
      { key: "status", label: "Status" },
      { key: "appointmentDate", label: "Appointment Date", format: "date" },
      { key: "createdAt", label: "Created At", format: "date" },
    ],
  },
  prescriptions: {
    label: "Prescriptions",
    columns: [
      { key: "prescriptionNumber", label: "Rx No." },
      { key: "patientId", label: "Patient ID" },
      { key: "patientType", label: "Type" },
      { key: "doctorName", label: "Doctor" },
      { key: "department", label: "Department" },
      { key: "diagnosis", label: "Diagnosis" },
      { key: "presentComplaint", label: "Complaint" },
      { key: "medicines", label: "Medicines", format: "json" },
      { key: "investigations", label: "Investigations", format: "json" },
      { key: "subtotal", label: "Subtotal", format: "currency" },
      { key: "discount", label: "Discount", format: "currency" },
      { key: "total", label: "Total", format: "currency" },
      { key: "amountPaid", label: "Paid", format: "currency" },
      { key: "balanceDue", label: "Balance", format: "currency" },
      { key: "paymentMode", label: "Payment Mode" },
      { key: "status", label: "Status" },
      { key: "prescriptionDate", label: "Date", format: "date" },
      { key: "followUpDate", label: "Follow-Up", format: "date" },
    ],
  },
  "eye-readings": {
    label: "Eye Readings",
    columns: [
      { key: "patientId", label: "Patient ID" },
      { key: "autoRefractometer", label: "Auto Refractometer", format: "eyeAR" },
      { key: "glassesReading", label: "Glasses Reading", format: "eyeDN" },
      { key: "previousPrescription", label: "Previous Rx", format: "eyeDN" },
      { key: "presentPrescription", label: "Present Rx", format: "eyeDN" },
      { key: "clinicalFindings", label: "Clinical Findings", format: "eyeCF" },
      { key: "status", label: "Status" },
      { key: "readingDate", label: "Reading Date", format: "date" },
    ],
  },
  inpatients: {
    label: "In-Patients",
    columns: [
      { key: "ipNumber", label: "IP Number" },
      { key: "patientId", label: "Patient ID" },
      { key: "name", label: "Name" },
      { key: "age", label: "Age" },
      { key: "gender", label: "Gender" },
      { key: "phone", label: "Phone" },
      { key: "department", label: "Department" },
      { key: "doctorNames", label: "Doctors" },
      { key: "operationName", label: "Operation" },
      { key: "operationDate", label: "Op. Date", format: "date" },
      { key: "packageAmount", label: "Package", format: "currency" },
      { key: "discount", label: "Discount", format: "currency" },
      { key: "netAmount", label: "Net Amount", format: "currency" },
      { key: "totalReceivedAmount", label: "Received", format: "currency" },
      { key: "balanceAmount", label: "Balance", format: "currency" },
      { key: "status", label: "Status" },
      { key: "bedNumber", label: "Bed" },
      { key: "wardName", label: "Ward" },
      { key: "admissionDate", label: "Admission", format: "date" },
      { key: "dischargeDate", label: "Discharge", format: "date" },
    ],
  },
  "insurance-claims": {
    label: "Insurance",
    columns: [
      { key: "claimNumber", label: "Claim No." },
      { key: "patientName", label: "Patient" },
      { key: "ipNumber", label: "IP Number" },
      { key: "insuranceCompanyName", label: "Insurance Co." },
      { key: "tpaName", label: "TPA" },
      { key: "policyNumber", label: "Policy No." },
      { key: "packageAmount", label: "Package", format: "currency" },
      { key: "totalBillAmount", label: "Bill Amount", format: "currency" },
      { key: "preauthAmount", label: "Preauth", format: "currency" },
      { key: "totalApprovedAmount", label: "Approved", format: "currency" },
      { key: "finalSettledAmount", label: "Settled", format: "currency" },
      { key: "patientPayableAmount", label: "Patient Pay", format: "currency" },
      { key: "patientBalance", label: "Patient Bal.", format: "currency" },
      { key: "status", label: "Status" },
      { key: "admissionDate", label: "Admission", format: "date" },
      { key: "dischargeDate", label: "Discharge", format: "date" },
    ],
  },
  "lab-bills": {
    label: "Lab Bills",
    columns: [
      { key: "billNumber", label: "Bill No." },
      { key: "labName", label: "Lab" },
      { key: "patientId", label: "Patient ID" },
      { key: "subtotal", label: "Subtotal", format: "currency" },
      { key: "discount", label: "Discount", format: "currency" },
      { key: "total", label: "Total", format: "currency" },
      { key: "amountPaid", label: "Paid", format: "currency" },
      { key: "balanceDue", label: "Balance", format: "currency" },
      { key: "paymentMode", label: "Payment Mode" },
      { key: "status", label: "Status" },
      { key: "createdAt", label: "Date", format: "date" },
    ],
  },
  "pharmacy-bills": {
    label: "Pharmacy Bills",
    columns: [
      { key: "billNumber", label: "Bill No." },
      { key: "patientName", label: "Patient" },
      { key: "patientPhone", label: "Phone" },
      { key: "referredDoctor", label: "Doctor" },
      { key: "subtotal", label: "Subtotal", format: "currency" },
      { key: "discountAmount", label: "Discount", format: "currency" },
      { key: "gstAmount", label: "GST", format: "currency" },
      { key: "billAmount", label: "Bill Amount", format: "currency" },
      { key: "paidAmount", label: "Paid", format: "currency" },
      { key: "balanceDue", label: "Balance", format: "currency" },
      { key: "paymentMode", label: "Payment Mode" },
      { key: "status", label: "Status" },
      { key: "billDate", label: "Date", format: "date" },
    ],
  },
  "optical-bills": {
    label: "Optical Bills",
    columns: [
      { key: "billNumber", label: "Bill No." },
      { key: "patientName", label: "Patient" },
      { key: "patientPhone", label: "Phone" },
      { key: "referredDoctor", label: "Doctor" },
      { key: "subtotal", label: "Subtotal", format: "currency" },
      { key: "discountAmount", label: "Discount", format: "currency" },
      { key: "gstAmount", label: "GST", format: "currency" },
      { key: "billAmount", label: "Bill Amount", format: "currency" },
      { key: "paidAmount", label: "Paid", format: "currency" },
      { key: "balanceDue", label: "Balance", format: "currency" },
      { key: "paymentMode", label: "Payment Mode" },
      { key: "status", label: "Status" },
      { key: "billDate", label: "Date", format: "date" },
    ],
  },
  expenses: {
    label: "Expenses",
    columns: [
      { key: "title", label: "Title" },
      { key: "category", label: "Category" },
      { key: "amount", label: "Amount", format: "currency" },
      { key: "date", label: "Date", format: "date" },
      { key: "reason", label: "Reason" },
      { key: "paymentMode", label: "Payment Mode" },
      { key: "createdAt", label: "Created At", format: "date" },
    ],
  },
}

export const ALL_EXPORT_ENDPOINTS: ExportEndpoint[] = [
  "patients",
  "prescriptions",
  "eye-readings",
  "inpatients",
  "insurance-claims",
  "lab-bills",
  "pharmacy-bills",
  "optical-bills",
  "expenses",
]

/** Generic export row — all export endpoints return Record<string, unknown>[]. */
export type ExportRow = Record<string, unknown>
