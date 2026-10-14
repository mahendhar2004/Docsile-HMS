import { z } from 'zod';

// ─── ServiceTemplate ──────────────────────────────────────────────────────────
// DB columns: id, name, category, description, amount, discount, sortOrder, isActive,
//             createdBy, createdAt, updatedAt, hospital_id
export const ServiceTemplateSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  amount: z.number().nonnegative(),
  discount: z.number().nonnegative().optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

// ─── HospitalProfile ─────────────────────────────────────────────────────────
// DB columns: id, name, displayName, phone, email, website, registrationNo, gstin,
//             registrationFeeEnabled, registrationFeeAmount, registrationFeeDefaultChecked,
//             tone, departments, settings (JSON TEXT), hospital_id
export const HospitalProfileSchema = z.object({
  name: z.string().min(1).optional(),
  displayName: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  website: z.string().nullable().optional(),
  registrationNo: z.string().nullable().optional(),
  gstin: z.string().nullable().optional(),
  registrationFeeEnabled: z.boolean().optional(),
  registrationFeeAmount: z.number().nonnegative().nullable().optional(),
  registrationFeeDefaultChecked: z.boolean().optional(),
  tone: z.string().nullable().optional(),
  departments: z.string().nullable().optional(),
  settings: z.string().nullable().optional(),
});

// ─── PrintConfig ─────────────────────────────────────────────────────────────
// Free-form JSON blob stored inside HospitalProfile.settings — no fixed schema.
export const PrintConfigSchema = z.record(z.unknown());

// ─── NavStyle ─────────────────────────────────────────────────────────────────
export const NavStyleSchema = z.object({
  navStyle: z.string().min(1),
});

// ─── PredefinedTemplate (prescription templates) ──────────────────────────────
// DB columns: id, code (UNIQUE), name, presentComplaint, previousHistory,
//             provisionalDiagnosis, medicines (TEXT/JSON), investigations (TEXT/JSON),
//             followUpDays, additionalNotes, isActive, createdBy, createdAt, updatedAt, hospital_id
export const PredefinedTemplateSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  presentComplaint: z.string().nullable().optional(),
  previousHistory: z.string().nullable().optional(),
  provisionalDiagnosis: z.string().nullable().optional(),
  medicines: z.string().optional(),
  investigations: z.string().optional(),
  followUpDays: z.number().int().nullable().optional(),
  additionalNotes: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

// ─── InpatientTemplate ────────────────────────────────────────────────────────
// DB columns: id (uuid), code (UNIQUE), name, operationName, provisionDiagnosis,
//             medicines (TEXT/JSON), followUpDays, additionalNotes, isActive,
//             createdBy, createdAt, updatedAt, hospital_id
export const InpatientTemplateSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  operationName: z.string().nullable().optional(),
  provisionDiagnosis: z.string().nullable().optional(),
  medicines: z.string().optional(),
  followUpDays: z.number().int().nullable().optional(),
  additionalNotes: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

// ─── PredefinedPackage ────────────────────────────────────────────────────────
// DB columns: id, name, inclusions (TEXT/JSON), totalAmount, discount, isActive,
//             createdBy, createdAt, updatedAt, hospital_id
export const PredefinedPackageSchema = z.object({
  name: z.string().min(1),
  inclusions: z.string().optional(),
  totalAmount: z.number().nonnegative(),
  discount: z.number().nonnegative().optional(),
  isActive: z.boolean().optional(),
});

// ─── PredefinedSurgery (soft delete — isActive=false) ─────────────────────────
// DB columns: id, name, department, doctorNames (TEXT/JSON), onDutyDoctors (TEXT/JSON),
//             provisionDiagnosis, operationProcedure, operationDetails,
//             isActive, sortOrder, createdBy, createdAt, updatedAt, hospital_id
export const PredefinedSurgerySchema = z.object({
  name: z.string().min(1),
  department: z.string().nullable().optional(),
  doctorNames: z.array(z.string()).optional(),
  onDutyDoctors: z.array(z.unknown()).optional(),
  provisionDiagnosis: z.string().nullable().optional(),
  operationProcedure: z.string().nullable().optional(),
  operationDetails: z.string().nullable().optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

// ─── PredefinedDischarge (soft delete — isActive=false) ──────────────────────
// DB columns: id, name, dischargeDiagnosis, conditionAtDischarge, dischargeMedications,
//             followUpInstructions, isActive, sortOrder, createdBy, createdAt, updatedAt, hospital_id
export const PredefinedDischargeSchema = z.object({
  name: z.string().min(1),
  dischargeDiagnosis: z.string().nullable().optional(),
  conditionAtDischarge: z.string().nullable().optional(),
  dischargeMedications: z.string().nullable().optional(),
  followUpInstructions: z.string().nullable().optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

// ─── MedicineMaster ───────────────────────────────────────────────────────────
// DB columns: id, name (UNIQUE within hospital), category, defaultTiming, defaultDays,
//             note, sortOrder, isActive, createdBy, createdAt, updatedAt, hospital_id
export const MedicineMasterSchema = z.object({
  name: z.string().min(1),
  category: z.string().nullable().optional(),
  defaultTiming: z.string().nullable().optional(),
  defaultDays: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

// ─── Doctor (master entity — net-new, see migration 20260922070000) ──────────
// DB columns: id, name (UNIQUE within hospital), department, specialization,
//             consultationFee, phone, isActive, sortOrder, createdBy, createdAt,
//             updatedAt, hospital_id
export const DoctorSchema = z.object({
  name: z.string().min(1),
  department: z.string().nullable().optional(),
  specialization: z.string().nullable().optional(),
  consultationFee: z.number().nonnegative().nullable().optional(),
  phone: z.string().nullable().optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

// ─── Inferred input types (used by service.ts) ────────────────────────────────
export type ServiceTemplateInput = z.infer<typeof ServiceTemplateSchema>;
export type HospitalProfileInput = z.infer<typeof HospitalProfileSchema>;
export type PredefinedTemplateInput = z.infer<typeof PredefinedTemplateSchema>;
export type InpatientTemplateInput = z.infer<typeof InpatientTemplateSchema>;
export type PredefinedPackageInput = z.infer<typeof PredefinedPackageSchema>;
export type PredefinedSurgeryInput = z.infer<typeof PredefinedSurgerySchema>;
export type PredefinedDischargeInput = z.infer<typeof PredefinedDischargeSchema>;
export type MedicineMasterInput = z.infer<typeof MedicineMasterSchema>;
export type DoctorInput = z.infer<typeof DoctorSchema>;
