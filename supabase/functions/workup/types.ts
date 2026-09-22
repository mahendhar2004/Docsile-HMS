import { z } from 'zod';

export const EyeReadingSchema = z.object({
  id: z.string().uuid().optional(),
  patientId: z.string().min(1),
  prescriptionId: z.string().nullable().optional(),
  rightSphere: z.number().nullable().optional(),
  rightCylinder: z.number().nullable().optional(),
  rightAxis: z.number().nullable().optional(),
  rightVision: z.string().nullable().optional(),
  leftSphere: z.number().nullable().optional(),
  leftCylinder: z.number().nullable().optional(),
  leftAxis: z.number().nullable().optional(),
  leftVision: z.string().nullable().optional(),
  createdAt: z.string().datetime().optional(),
});
export type EyeReading = z.infer<typeof EyeReadingSchema>;
