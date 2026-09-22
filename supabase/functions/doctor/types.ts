import { z } from 'zod';

export const PrescriptionSchema = z.object({
  id: z.string().uuid().optional(),
  patientId: z.string().min(1),
  doctorId: z.string().optional(),
  diagnosis: z.string().nullable().optional(),
  medicines: z.array(z.record(z.unknown())).optional(),
  investigations: z.array(z.record(z.unknown())).optional(),
  advice: z.string().nullable().optional(),
  followUpDate: z.string().date().nullable().optional(),
  createdAt: z.string().datetime().optional(),
});
export type Prescription = z.infer<typeof PrescriptionSchema>;

export const MedicineMasterSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  genericName: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  dosageForm: z.string().nullable().optional(),
});
export type MedicineMaster = z.infer<typeof MedicineMasterSchema>;

export const DropdownOptionSchema = z.object({
  fieldName: z.string().min(1),
  value: z.string().min(1),
});
