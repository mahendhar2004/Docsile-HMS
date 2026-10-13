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
  lastName: z.string().min(1, 'lastName is required'),
  phone: z.string().min(1, 'phone is required'),
  email: z.string().email().nullable().optional(),
  gender: z.enum(['Male', 'Female', 'Other']),
  dateOfBirth: z.string().date().nullable().optional(),
  address: z.string().nullable().optional(),
  patientType: z.string().min(1, 'patientType is required'),
  appointmentDate: z.string().date(),
  status: z.string().nullable().optional(),
  referredBy: z.string().nullable().optional(),
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
  address: true,
  patientType: true,
  appointmentDate: true,
  status: true,
  referredBy: true,
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

export const InPatientSchema = z.object({
  id: z.string().uuid().optional(),
  ipNumber: z.string().optional(), // readonly — set by server via next_ip_number()
  patientId: z.string().min(1, 'patientId is required'),
  admissionDate: z.string().date(),
  dischargeDate: z.string().date().nullable().optional(),
  status: z.enum(['admitted', 'discharged']),
  ward: z.string().nullable().optional(),
  bedNumber: z.string().nullable().optional(),
  onDutyDoctors: z.string().optional(), // JSON-encoded array
  paymentRecords: z.string().optional(), // JSON-encoded array
  prescriptions: z.string().optional(), // JSON-encoded array
  createdById: z.string().nullable().optional(),
  createdAt: z.string().datetime().optional(),
});

export type InPatient = z.infer<typeof InPatientSchema>;

export const CreateInPatientSchema = InPatientSchema.omit({ id: true, ipNumber: true });
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

// ---- Prescription + Billing (created within patient-care) ----

export const InvoiceItemSchema = z.object({
  id: z.string().uuid().optional(),
  prescriptionId: z.string().optional(),
  name: z.string().min(1),
  quantity: z.number().int().positive(),
  unitPrice: z.number().nonnegative(),
  total: z.number().nonnegative(),
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
  createdAt: z.string().datetime().optional(),
});

export const AddServiceToPatientSchema = z.object({
  serviceTemplateId: z.string().min(1),
  paymentMode: z.string().min(1),
  amount: z.number().nonnegative().optional(),
});

export const CreatePrescriptionWithBillingSchema = z.object({
  prescription: PrescriptionSchema.optional(),
  invoiceItems: z.array(InvoiceItemSchema).optional(),
  payment: PaymentSchema.optional(),
});

// ---- Pagination / Search query params ----

export const PatientListQuerySchema = z.object({
  date: z.string().date().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(50),
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
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(50),
});

export const DropdownOptionQuerySchema = z.object({
  fieldName: z.string().optional(),
});
