import { z } from 'zod';

export const LicenseSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  licenseNumber: z.string().nullable().optional(),
  issuedBy: z.string().nullable().optional(),
  issuedDate: z.string().date().nullable().optional(),
  expiryDate: z.string().date().nullable().optional(),
  documentUrl: z.string().url().nullable().optional(),
  notes: z.string().nullable().optional(),
});
export type License = z.infer<typeof LicenseSchema>;

export const SaveDocumentUrlSchema = z.object({
  documentUrl: z.string().url(),
});
