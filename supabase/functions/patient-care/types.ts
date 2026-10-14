/**
 * Zod schemas for the patient-care module.
 * Derived from openapi.yaml component schemas: Patient, InPatient, DropdownOption, Prescription, InvoiceItem, Payment.
 */

import { z } from 'zod';

// ---- Patient ----

export const PatientSchema = z.object({
  id: z.string().uuid().optional(),
  patientId: z.string().optional(), // readonly — set by server via next_patient_number()
  firstName: z.string().min(1, 'firstName is required'),
  // Optional — main's registration wizard takes one free-text "Name" field
  // and splits it on whitespace at submit time; a single-word name produces
  // no lastName at all.
  lastName: z.string().nullable().optional(),
  phone: z.string().min(1, 'phone is required'),
  email: z.string().email().nullable().optional(),
  gender: z.enum(['Male', 'Female', 'Other']),
  dateOfBirth: z.string().date().nullable().optional(),
  age: z.number().int().min(0).max(150).nullable().optional(),
  // Kept for backward-compat display reads (receipts, reports, exports) —
  // new writes go through the structured fields below instead.
  address: z.string().nullable().optional(),
  addressLine: z.string().nullable().optional(),
  area: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  pincode: z.string().nullable().optional(),
  guardianName: z.string().nullable().optional(),
  guardianRelation: z.string().nullable().optional(),
  doctorName: z.string().nullable().optional(),
  department: z.string().nullable().optional(),
  // Open, tenant-editable "patient type" tag (e.g. "Regular") backed by the
  // DropdownOption table — unrelated to patientType (OPD/IPD).
  patientCategory: z.string().nullable().optional(),
  patientType: z.string().min(1, 'patientType is required'),
  appointmentDate: z.string().date(),
  status: z.string().nullable().optional(),
  referredBy: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  createdById: z.string().nullable().optional(),
  // hospitalId is readOnly — never accepted from client input
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

export type Patient = z.infer<typeof PatientSchema>;

export const CreatePatientSchema = PatientSchema.pick({
  firstName: true,
  lastName: true,
  phone: true,
  email: true,
  gender: true,
  dateOfBirth: true,
  age: true,
  address: true,
  addressLine: true,
  area: true,
  city: true,
  state: true,
  pincode: true,
  guardianName: true,
  guardianRelation: true,
  doctorName: true,
  department: true,
  patientCategory: true,
  patientType: true,
  appointmentDate: true,
  status: true,
  referredBy: true,
  notes: true,
});

export type CreatePatientBody = z.infer<typeof CreatePatientSchema>;

export const UpdatePatientSchema = PatientSchema.partial().omit({ id: true, patientId: true });
export type UpdatePatientBody = z.infer<typeof UpdatePatientSchema>;

export const UpdatePatientStatusSchema = z.object({
  status: z.string().min(1, 'status is required'),
});

export const UpdatePatientDateSchema = z.object({
  appointmentDate: z.string().date(),
});

// ---- InPatient ----

// InPatient is its own self-contained demographic + admission + operation +
// billing record in main (not a thin link to Patient) — patientId is an
// OPTIONAL reference to an existing OPD patient found via lookup, never a
// required FK. Note main's InPatient.gender uses MALE/FEMALE/OTHER, a
// different casing convention than Patient's Male/Female/Other — preserved
// faithfully rather than harmonized.
export const PackageInclusionSchema = z.object({
  name: z.string(),
  amount: z.number(),
});

export const PaymentRecordSchema = z.object({
  date: z.string(),
  amountType: z.string(),
  paymentMode: z.string(),
  amount: z.number(),
  notes: z.string().optional(),
});

export const InPatientSchema = z.object({
  id: z.string().uuid().optional(),
  ipNumber: z.string().optional(), // readonly — set by server via next_ip_number()
  patientId: z.string().nullable().optional(), // optional link to an existing OPD patient
  name: z.string().min(1, 'name is required'),
  age: z.number().int().min(0),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
  phone: z.string().min(1, 'phone is required'),
  // Kept for backward-compat display reads — new writes use the structured
  // fields below instead.
  address: z.string().nullable().optional(),
  addressLine: z.string().nullable().optional(),
  area: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  pincode: z.string().nullable().optional(),
  dateOfBirth: z.string().nullable().optional(),
  guardianName: z.string().nullable().optional(),
  admissionDate: z.string().min(1, 'admissionDate is required'), // datetime-local string
  admissionNotes: z.string().nullable().optional(),
  referredBy: z.string().nullable().optional(),
  department: z.string().nullable().optional(),
  doctorNames: z.array(z.string()).default([]),
  onDutyDoctors: z.array(z.string()).default([]),
  operationName: z.string().nullable().optional(),
  operationDate: z.string().nullable().optional(),
  operationProcedure: z.string().nullable().optional(),
  operationDetails: z.string().nullable().optional(),
  provisionDiagnosis: z.string().nullable().optional(),
  dischargeDate: z.string().nullable().optional(),
  packageAmount: z.number().nonnegative(),
  packageInclusions: z.array(PackageInclusionSchema).optional(),
  discount: z.number().nonnegative().default(0),
  paymentRecords: z.array(PaymentRecordSchema).optional(),
  status: z.string().optional(),
  createdById: z.string().nullable().optional(),
  createdAt: z.string().datetime().optional(),
});

export type InPatient = z.infer<typeof InPatientSchema>;

export const CreateInPatientSchema = InPatientSchema.omit({ id: true, ipNumber: true, status: true });
export type CreateInPatientBody = z.infer<typeof CreateInPatientSchema>;

export const UpdateInPatientBasicInfoSchema = z.object({
  ward: z.string().optional(),
  bedNumber: z.string().optional(),
  onDutyDoctors: z.string().optional(),
});

export const UpdateInPatientDetailsSchema = z.object({
  prescriptions: z.string().optional(),
  paymentRecords: z.string().optional(),
});

export const UpdateInPatientStatusSchema = z.object({
  status: z.enum(['admitted', 'discharged']),
});

export const AddInPatientPaymentSchema = z.object({
  paymentMode: z.string().min(1),
  amount: z.number().positive(),
  notes: z.string().optional(),
});

export const DischargeInPatientSchema = z.object({
  dischargeDate: z.string().date(),
  dischargeSummary: z.string().optional(),
  finalAmount: z.number().nonnegative().optional(),
});

// ---- Dropdown ----

export const DropdownOptionSchema = z.object({
  id: z.string().uuid().optional(),
  fieldName: z.string().min(1, 'fieldName is required'),
  value: z.string().min(1, 'value is required'),
  // hospitalId is readOnly
});

export const CreateDropdownOptionSchema = z.object({
  fieldName: z.string().min(1),
  value: z.string().min(1),
});

// ---- Doctor (quick-add only — full CRUD lives in the settings function) ----
// Reception/registration staff can type a brand-new doctor name on the fly
// while registering a patient or admission, same convenience the old
// addDropdownOption({fieldName:"doctorName"}) gave them — see POST /doctors.
export const QuickCreateDoctorSchema = z.object({
  name: z.string().min(1),
});

// ---- Prescription + Billing (created within patient-care) ----

export const InvoiceItemSchema = z.object({
  id: z.string().uuid().optional(),
  prescriptionId: z.string().optional(),
  description: z.string().min(1),
  category: z.string().nullable().optional(),
  quantity: z.number().int().positive(),
  unitPrice: z.number().nonnegative(),
  amount: z.number().nonnegative(),
});

export const PaymentSchema = z.object({
  id: z.string().uuid().optional(),
  prescriptionId: z.string().optional(),
  paymentMode: z.string().min(1),
  amount: z.number().positive(),
  createdAt: z.string().datetime().optional(),
});

export const PrescriptionSchema = z.object({
  id: z.string().uuid().optional(),
  prescriptionNumber: z.string().optional(),
  patientId: z.string().min(1),
  doctorId: z.string().nullable().optional(),
  prescriptionDate: z.string().date(),
  medicines: z.string().optional(),
  investigations: z.string().optional(),
  diagnosis: z.string().nullable().optional(),
  heightCm: z.number().nullable().optional(),
  weightKg: z.number().nullable().optional(),
  discount: z.number().nonnegative().optional(),
  discountReason: z.string().nullable().optional(),
  createdAt: z.string().datetime().optional(),
});

export const AddServiceToPatientSchema = z.object({
  serviceTemplateId: z.string().min(1),
  paymentMode: z.string().min(1),
  amount: z.number().nonnegative().optional(),
});

// Fields createPrescriptionWithBilling actually reads off `prescription` —
// unlike PrescriptionSchema, patientId/prescriptionDate aren't required here:
// patientId comes from the URL param, and prescriptionDate falls back to now.
export const PrescriptionBillingFieldsSchema = z.object({
  doctorId: z.string().nullable().optional(),
  prescriptionDate: z.string().date().optional(),
  medicines: z.string().optional(),
  investigations: z.string().optional(),
  diagnosis: z.string().nullable().optional(),
  heightCm: z.number().nullable().optional(),
  weightKg: z.number().nullable().optional(),
  discount: z.number().nonnegative().optional(),
  discountReason: z.string().nullable().optional(),
});

export const CreatePrescriptionWithBillingSchema = z.object({
  prescription: PrescriptionBillingFieldsSchema.optional(),
  invoiceItems: z.array(InvoiceItemSchema).optional(),
  payment: PaymentSchema.optional(),
});

// ---- Pagination / Search query params ----

export const PatientListQuerySchema = z.object({
  date: z.string().date().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  // 1000 (not 100) — the Stats modal's useOpdPatientsStats hook bulk-fetches
  // an entire day's patients in one request (pageSize=1000) to compute
  // counts/revenue client-side, matching main's own behavior of keeping the
  // whole day in state. A 100 cap rejected that request outright (400), so
  // the Stats modal silently showed zeros for every hospital regardless of
  // how many patients were actually registered that day.
  pageSize: z.coerce.number().int().positive().max(1000).default(50),
});

export const PatientSearchQuerySchema = z.object({
  q: z.string().min(1, 'Search query q is required'),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).default(10),
});

export const InPatientListQuerySchema = z.object({
  date: z.string().date().optional(),
  status: z.enum(['admitted', 'discharged']).optional(),
  recentDischargesOnly: z.coerce.boolean().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(50),
});

export const DropdownOptionQuerySchema = z.object({
  fieldName: z.string().optional(),
});
