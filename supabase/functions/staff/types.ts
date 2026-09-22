import { z } from 'zod';

// ---- Input schemas (used by index.ts for validation) ----

// Optional staff-profile fields shared by create and update — these all map
// directly to real User table columns (confirmed against supabase-migration.sql)
// and were being silently dropped on write (though already read correctly by
// findMembers/findMemberById) until this fix. Matches the old StaffSchema in
// src/app/(hospital)/staff/actions.ts field-for-field.
const staffProfileFields = {
  phone: z.string().nullable().optional(),
  department: z.string().nullable().optional(),
  designation: z.string().nullable().optional(),
  qualifications: z.string().nullable().optional(),
  joiningDate: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  emergencyContact: z.string().nullable().optional(),
  bloodGroup: z.string().nullable().optional(),
  salary: z.number().min(0).nullable().optional(),
  salaryType: z.string().nullable().optional(),
};

export const CreateStaffSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  // min(6) matches the old StaffSchema exactly (src/app/(hospital)/staff/actions.ts:
  // `password: z.string().min(6, "Min 6 characters")`) — NOT the generic 8-char
  // default some other schemas in this codebase use. Do not "improve" this without
  // a deliberate decision; existing accounts and workflows assume 6.
  password: z.string().min(6),
  role: z.string().min(1),
  employeeId: z.string().nullable().optional(),
  ...staffProfileFields,
});

export const UpdateStaffSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  role: z.string().optional(),
  employeeId: z.string().nullable().optional(),
  ...staffProfileFields,
});

export const ToggleActiveSchema = z.object({
  isActive: z.boolean(),
});

export const ResetPasswordSchema = z.object({
  // min(6) — see CreateStaffSchema's comment; matches the old resetStaffPassword's
  // inline `newPassword.length < 6` check exactly.
  newPassword: z.string().min(6),
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

// ---- Response shape types (returned by service, serialized to the caller) ----

/** Staff member response — passwordHash is never included. */
export interface StaffMemberResponse {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: string;
  department: string | null;
  designation: string | null;
  employeeId: string | null;
  qualifications: string | null;
  joiningDate: string | null;
  address: string | null;
  emergencyContact: string | null;
  bloodGroup: string | null;
  salary: number | null;
  salaryType: string | null;
  isActive: boolean;
  lastLogin: string | null;
  createdAt: string;
}

/** Role response — permissions are returned as a parsed string array. */
export interface RoleResponse {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  permissions: string[];
  isSystem: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
