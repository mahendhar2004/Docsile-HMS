/**
 * staff/types.ts
 *
 * TypeScript types for the Staff module.
 * Cross-referenced against:
 *   - .sde/schemas/openapi.yaml  /staff/* paths
 *   - supabase/functions/staff/types.ts  (StaffMemberResponse, RoleResponse, schemas)
 *   - src/app/(hospital)/staff/components/StaffPage.tsx  (enum constants)
 */

// ─── GET /staff/members ───────────────────────────────────────────────────────

/**
 * Staff member response from GET /staff/members or GET /staff/members/{id}.
 * Field names match supabase/functions/staff/types.ts StaffMemberResponse exactly.
 */
export interface StaffMember {
  id: string
  email: string
  /** Display name. The create/update API body uses the field key `name`. */
  fullName: string
  phone: string | null
  role: string
  department: string | null
  designation: string | null
  employeeId: string | null
  qualifications: string | null
  /** ISO date string (YYYY-MM-DD) or null */
  joiningDate: string | null
  address: string | null
  emergencyContact: string | null
  bloodGroup: string | null
  salary: number | null
  salaryType: string | null
  isActive: boolean
  lastLogin: string | null
  createdAt: string
}

// ─── GET /staff/roles ─────────────────────────────────────────────────────────

/**
 * Role response from GET /staff/roles.
 * Field names match supabase/functions/staff/types.ts RoleResponse exactly.
 * NOTE: `permissions` is returned as a PARSED string array by the Edge Function —
 * NOT a JSON-encoded string as the OpenAPI spec's Role schema description implies.
 */
export interface StaffRole {
  id: string
  name: string
  displayName: string
  description: string | null
  /** Parsed array of permission scope strings, e.g. ["staff:view", "billing:view"] */
  permissions: string[]
  isSystem: boolean
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// ─── POST /staff/members request body ─────────────────────────────────────────

/**
 * All 15 fields from CreateStaffSchema (supabase/functions/staff/types.ts).
 * Required: name, email, password, role.
 * Optional profile fields: employeeId, phone, department, designation,
 * qualifications, joiningDate, address, emergencyContact, bloodGroup,
 * salary, salaryType.
 * Password min length is 6 (matches old app and backend schema).
 */
export interface CreateMemberBody {
  name: string
  email: string
  password: string
  role: string
  employeeId?: string | null
  phone?: string | null
  department?: string | null
  designation?: string | null
  qualifications?: string | null
  joiningDate?: string | null
  address?: string | null
  emergencyContact?: string | null
  bloodGroup?: string | null
  salary?: number | null
  salaryType?: string | null
}

// ─── PATCH /staff/members/{id} request body ───────────────────────────────────

/**
 * All fields from UpdateStaffSchema — all optional.
 * Note: uses `name` (not `fullName`) for the backend schema key.
 */
export interface UpdateMemberBody {
  name?: string
  email?: string
  role?: string
  employeeId?: string | null
  phone?: string | null
  department?: string | null
  designation?: string | null
  qualifications?: string | null
  joiningDate?: string | null
  address?: string | null
  emergencyContact?: string | null
  bloodGroup?: string | null
  salary?: number | null
  salaryType?: string | null
}

// ─── PATCH /staff/members/{id}/active ────────────────────────────────────────

export interface ToggleActiveBody {
  isActive: boolean
}

// ─── POST /staff/members/{id}/reset-password ─────────────────────────────────

export interface ResetPasswordBody {
  /** Minimum 6 characters — matches backend ResetPasswordSchema. */
  newPassword: string
}

// ─── POST /staff/roles ────────────────────────────────────────────────────────

export interface CreateRoleBody {
  name: string
  displayName: string
  description?: string | null
  permissions?: string[]
}

// ─── PATCH /staff/roles/{id} ─────────────────────────────────────────────────

export interface UpdateRoleBody {
  displayName?: string
  description?: string | null
}

// ─── PATCH /staff/roles/{id}/permissions ─────────────────────────────────────

export interface UpdateRolePermissionsBody {
  /** Full replacement list of permission scope strings. */
  permissions: string[]
}

// ─── Enum constants ───────────────────────────────────────────────────────────
// All values verified verbatim against:
// src/app/(hospital)/staff/components/StaffPage.tsx lines 84–85, 745–748

/**
 * Blood groups — copied verbatim from old StaffPage.tsx line 84.
 */
export const BLOOD_GROUPS = [
  "A+",
  "A-",
  "B+",
  "B-",
  "AB+",
  "AB-",
  "O+",
  "O-",
] as const

/**
 * Hospital departments — copied verbatim from old StaffPage.tsx line 85.
 */
export const DEPARTMENTS = [
  "General",
  "Ophthalmology",
  "Optometry",
  "Pharmacy",
  "Lab",
  "Nursing",
  "Administration",
  "Front Desk",
  "Accounts",
] as const

/**
 * Salary types — copied verbatim from old StaffPage.tsx lines 745–748.
 */
export const SALARY_TYPES = [
  { value: "MONTHLY", label: "Monthly" },
  { value: "DAILY", label: "Daily" },
  { value: "PER_VISIT", label: "Per Visit" },
] as const

// ─── SelectOption arrays for SingleSelect ─────────────────────────────────────

export const BLOOD_GROUP_OPTIONS = BLOOD_GROUPS.map((bg) => ({ value: bg, label: bg }))

export const DEPARTMENT_OPTIONS = DEPARTMENTS.map((d) => ({ value: d, label: d }))

export const SALARY_TYPE_OPTIONS = SALARY_TYPES.map((st) => ({
  value: st.value,
  label: st.label,
}))
