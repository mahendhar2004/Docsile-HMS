import { z } from 'zod';

export const CreateStaffSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.string().min(1),
  employeeId: z.string().nullable().optional(),
});

export const UpdateStaffSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  role: z.string().optional(),
  employeeId: z.string().nullable().optional(),
});

export const ToggleActiveSchema = z.object({
  isActive: z.boolean(),
});

export const ResetPasswordSchema = z.object({
  newPassword: z.string().min(8),
});

export const RoleSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  isSystem: z.boolean().optional(),
});
export type Role = z.infer<typeof RoleSchema>;

export const UpdatePermissionsSchema = z.object({
  permissions: z.array(z.string().min(1)),
});
