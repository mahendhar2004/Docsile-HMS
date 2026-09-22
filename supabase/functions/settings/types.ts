import { z } from 'zod';

export const ServiceTemplateSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  price: z.number().nonnegative(),
  category: z.string().nullable().optional(),
});

export const HospitalProfileSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  address: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  settings: z.record(z.unknown()).nullable().optional(),
});

export const PrintConfigSchema = z.record(z.unknown());

export const NavStyleSchema = z.object({
  navStyle: z.string().min(1),
});

export const PredefinedTemplateSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  content: z.record(z.unknown()).optional(),
});

export const InpatientTemplateSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  content: z.record(z.unknown()).optional(),
});

export const PredefinedPackageSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  price: z.number().nonnegative(),
  items: z.array(z.record(z.unknown())).optional(),
});

export const PredefinedSurgerySchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  price: z.number().nonnegative().optional(),
  isDeleted: z.boolean().optional(),
});

export const PredefinedDischargeSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  content: z.record(z.unknown()).optional(),
  isDeleted: z.boolean().optional(),
});

export const MedicineMasterSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  genericName: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  dosageForm: z.string().nullable().optional(),
});
