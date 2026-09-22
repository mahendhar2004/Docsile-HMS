import { z } from 'zod';

// ── Medicine item within a prescription ──────────────────────────────────────

const MedicineItemSchema = z.object({
  name: z.string().min(1),
  days: z.string().default(''),
  timing: z.string().default(''),
  note: z.string().optional(),
});

// ── Investigation item within a prescription ─────────────────────────────────

const InvestigationItemSchema = z.object({
  name: z.string().min(1),
  note: z.string().optional(),
});

// ── Prescription body (POST /doctor/patients/:id/prescriptions) ──────────────
// Matches the real savePrescription payload from the old actions.ts exactly.

export const PrescriptionSchema = z.object({
  patientId: z.string().min(1),
  doctorName: z.string().optional(),
  department: z.string().optional(),
  temperature: z.number().nullable().optional(),
  pulseRate: z.number().int().nullable().optional(),
  spo2: z.number().int().nullable().optional(),
  heightCm: z.number().nullable().optional(),
  weightKg: z.number().nullable().optional(),
  presentComplaint: z.string().optional(),
  previousHistory: z.string().optional(),
  diagnosis: z.string().optional(),
  additionalNotes: z.string().optional(),
  medicines: z.array(MedicineItemSchema).default([]),
  investigations: z.array(InvestigationItemSchema).default([]),
  followUpDate: z.string().date().nullable().optional(),
  notes: z.string().optional(),
});
export type Prescription = z.infer<typeof PrescriptionSchema>;

// ── MedicineMaster body (POST /doctor/medicines) ─────────────────────────────
// Matches the real DB columns: name, category, defaultTiming, defaultDays, note.

export const MedicineMasterSchema = z.object({
  name: z.string().min(1),
  category: z.string().nullable().optional(),
  defaultTiming: z.string().nullable().optional(),
  defaultDays: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
});
export type MedicineMaster = z.infer<typeof MedicineMasterSchema>;

// ── DropdownOption body (POST /doctor/dropdown-options) ──────────────────────

export const DropdownOptionSchema = z.object({
  fieldName: z.string().min(1),
  value: z.string().min(1),
});
export type DropdownOption = z.infer<typeof DropdownOptionSchema>;
