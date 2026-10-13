/**
 * Business layer for the staff module.
 *
 * Orchestrates:
 *   Members   — list, create (with Supabase Auth provisioning), get, update,
 *               toggle active, reset password
 *   Roles     — list, create, update, delete, update permissions, seed system roles
 *
 * Password handling:
 *   bcrypt cost factor 10 matches the old Next.js actions.ts (bcrypt.hash(pw, 10)).
 *   passwordHash is the source of truth for our custom JWT auth flow.
 *   Supabase Auth is kept in sync as a best-effort secondary store — if the Auth
 *   API call fails, we log a warning but do NOT fail the request.
 *   Plaintext passwords are NEVER logged.
 *
 * seedSystemRoles:
 *   Upserts 5 system roles (ADMIN, DOCTOR, RECEPTIONIST, OPTOMETRIST, NURSE) with
 *   their canonical permission lists, matching DEFAULT_ROLE_PERMISSIONS from
 *   src/lib/permissions.ts (the single source of truth for the codebase). The lists
 *   include all 3 new permission groups added by migration
 *   20260922000000_add_new_permission_keys_to_roles.sql (billing:*, queue:view,
 *   call_logs:*), so seeding never regresses that migration's work.
 */

import bcrypt from 'bcryptjs';
const { hash: bcryptHash } = bcrypt;
import { getSupabaseClient } from '../_shared/supabase-client.ts';
import { logger } from '../_shared/logger.ts';
import { ConflictError, NotFoundError, ValidationError } from '../_shared/errors.ts';
import type { Session } from '../_shared/auth.ts';
import { StaffRepository } from './repository.ts';
import type { Role, StaffMemberResponse, RoleResponse } from './types.ts';

// ── bcrypt cost factor — must match old Next.js actions.ts (bcrypt.hash(pw, 10))
const BCRYPT_ROUNDS = 10;

// ── Canonical permission lists — mirrors src/lib/permissions.ts DEFAULT_ROLE_PERMISSIONS
// (cannot import across the Next.js / Deno boundary, so they are hardcoded here).
// Keep in sync with any future changes to DEFAULT_ROLE_PERMISSIONS.

const ALL_PERMISSION_KEYS: string[] = [
  'dashboard:view',
  'patients:view', 'patients:create', 'patients:edit', 'patients:delete',
  'workup:view', 'workup:create', 'workup:edit',
  'doctor:view', 'doctor:consult',
  'labs:view', 'labs:create', 'labs:edit', 'labs:config',
  'pharmacy:view', 'pharmacy:create', 'pharmacy:edit', 'pharmacy:manage_stock', 'pharmacy:purchase_orders',
  'optical:view', 'optical:create', 'optical:edit', 'optical:manage_stock',
  'inpatients:view', 'inpatients:create', 'inpatients:edit', 'inpatients:discharge', 'inpatients:delete',
  'insurance:view', 'insurance:create', 'insurance:edit',
  'dues:view', 'dues:edit',
  'expenses:view', 'expenses:create', 'expenses:edit', 'expenses:delete',
  'reports:view',
  'licenses:view', 'licenses:create', 'licenses:edit', 'licenses:delete',
  'settings:view', 'settings:edit',
  'staff:view', 'staff:create', 'staff:edit', 'staff:deactivate', 'staff:manage_roles',
  'data:export',
  'billing:view', 'billing:create', 'billing:delete',
  'queue:view',
  'call_logs:view', 'call_logs:edit', 'call_logs:sync',
];

interface SystemRoleDefinition {
  name: string;
  displayName: string;
  description: string;
  permissions: string[];
}

const SYSTEM_ROLES: SystemRoleDefinition[] = [
  {
    name: 'ADMIN',
    displayName: 'Administrator',
    description: 'Full system access',
    permissions: ALL_PERMISSION_KEYS,
  },
  {
    name: 'DOCTOR',
    displayName: 'Doctor',
    description: 'Clinical access for consultations and prescriptions',
    permissions: [
      'dashboard:view',
      'patients:view', 'patients:edit',
      'workup:view',
      'doctor:view', 'doctor:consult',
      'labs:view',
      'pharmacy:view',
      'inpatients:view', 'inpatients:edit',
      'insurance:view',
      'dues:view',
      'reports:view',
      'billing:view',
      'queue:view',
    ],
  },
  {
    name: 'RECEPTIONIST',
    displayName: 'Receptionist',
    description: 'Front desk operations and patient registration',
    permissions: [
      'dashboard:view',
      'patients:view', 'patients:create', 'patients:edit',
      'workup:view', 'workup:create',
      'doctor:view',
      'labs:view', 'labs:create',
      'pharmacy:view', 'pharmacy:create',
      'optical:view', 'optical:create',
      'inpatients:view', 'inpatients:create',
      'insurance:view', 'insurance:create',
      'dues:view', 'dues:edit',
      'expenses:view', 'expenses:create',
      'billing:view', 'billing:create',
      'queue:view',
      'call_logs:view', 'call_logs:edit', 'call_logs:sync',
    ],
  },
  {
    name: 'OPTOMETRIST',
    displayName: 'Optometrist',
    description: 'Eye workup and optical operations',
    permissions: [
      'dashboard:view',
      'patients:view',
      'workup:view', 'workup:create', 'workup:edit',
      'doctor:view',
      'optical:view', 'optical:create', 'optical:edit',
    ],
  },
  {
    name: 'NURSE',
    displayName: 'Nurse',
    description: 'Patient care and clinical support',
    permissions: [
      'dashboard:view',
      'patients:view', 'patients:edit',
      'workup:view', 'workup:create',
      'doctor:view',
      'inpatients:view', 'inpatients:edit',
      'dues:view',
      'queue:view',
    ],
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeRepo(session: Session): StaffRepository {
  return new StaffRepository(getSupabaseClient(), session.hospitalId);
}

function parsePermissions(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

// ── Members ──────────────────────────────────────────────────────────────────

export async function listMembers(session: Session): Promise<StaffMemberResponse[]> {
  const repo = makeRepo(session);
  return await repo.findMembers();
}

export interface StaffProfileFields {
  phone?: string | null;
  department?: string | null;
  designation?: string | null;
  qualifications?: string | null;
  joiningDate?: string | null;
  address?: string | null;
  emergencyContact?: string | null;
  bloodGroup?: string | null;
  salary?: number | null;
  salaryType?: string | null;
}

export async function createMember(
  session: Session,
  data: { name: string; email: string; password: string; role: string; employeeId?: string | null } & StaffProfileFields,
): Promise<StaffMemberResponse> {
  const repo = makeRepo(session);

  // Email uniqueness check
  const existingByEmail = await repo.findMemberByEmail(data.email);
  if (existingByEmail) {
    throw new ConflictError(
      `Email "${data.email}" is already registered. If this is an existing account, log in directly.`,
    );
  }

  // Employee ID uniqueness check (when provided)
  if (data.employeeId) {
    const existingByEmpId = await repo.findMemberByEmployeeId(data.employeeId);
    if (existingByEmpId) {
      throw new ConflictError(
        `Employee ID "${data.employeeId}" is already in use by another staff member.`,
      );
    }
  }

  // Hash the password — NEVER log the plaintext
  const passwordHash = await bcryptHash(data.password, BCRYPT_ROUNDS);

  // Provision the Supabase Auth identity (service_role client has auth.admin access).
  // The auth user's UUID becomes the User table primary key.
  const supabase = getSupabaseClient();
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: data.email,
    password: data.password,
    email_confirm: true,
  });
  if (authError) {
    throw new Error(`Failed to provision Supabase Auth user for "${data.email}": ${authError.message}`);
  }

  const member = await repo.insertMember({
    id: authData.user.id,
    email: data.email,
    passwordHash,
    fullName: data.name,
    role: data.role,
    employeeId: data.employeeId ?? null,
    phone: data.phone ?? null,
    department: data.department ?? null,
    designation: data.designation ?? null,
    qualifications: data.qualifications ?? null,
    joiningDate: data.joiningDate ?? null,
    address: data.address ?? null,
    emergencyContact: data.emergencyContact ?? null,
    bloodGroup: data.bloodGroup ?? null,
    salary: data.salary ?? null,
    salaryType: data.salaryType ?? null,
  });

  return member;
}

export async function getMemberById(session: Session, id: string): Promise<StaffMemberResponse> {
  const repo = makeRepo(session);
  const member = await repo.findMemberById(id);
  if (!member) {
    throw new NotFoundError('Staff member', id);
  }
  return member;
}

export async function updateMember(
  session: Session,
  id: string,
  data: { name?: string; email?: string; role?: string; employeeId?: string | null } & StaffProfileFields,
): Promise<void> {
  const repo = makeRepo(session);

  // Confirm the member exists in this hospital before attempting update
  const existing = await repo.findMemberById(id);
  if (!existing) {
    throw new NotFoundError('Staff member', id);
  }

  const patch: Record<string, unknown> = {};
  if (data.name !== undefined) patch.fullName = data.name;
  if (data.email !== undefined) patch.email = data.email;
  if (data.role !== undefined) patch.role = data.role;
  if (data.employeeId !== undefined) patch.employeeId = data.employeeId ?? null;
  if (data.phone !== undefined) patch.phone = data.phone;
  if (data.department !== undefined) patch.department = data.department;
  if (data.designation !== undefined) patch.designation = data.designation;
  if (data.qualifications !== undefined) patch.qualifications = data.qualifications;
  if (data.joiningDate !== undefined) patch.joiningDate = data.joiningDate;
  if (data.address !== undefined) patch.address = data.address;
  if (data.emergencyContact !== undefined) patch.emergencyContact = data.emergencyContact;
  if (data.bloodGroup !== undefined) patch.bloodGroup = data.bloodGroup;
  if (data.salary !== undefined) patch.salary = data.salary;
  if (data.salaryType !== undefined) patch.salaryType = data.salaryType;

  if (Object.keys(patch).length === 0) return; // nothing to update
  await repo.updateMember(id, patch);
}

export async function toggleActive(
  session: Session,
  id: string,
  isActive: boolean,
): Promise<void> {
  // Prevent a user from deactivating (or modifying the active flag of) their own account
  if (session.id === id) {
    throw new ValidationError('You cannot change the active status of your own account.');
  }

  const repo = makeRepo(session);
  const existing = await repo.findMemberById(id);
  if (!existing) {
    throw new NotFoundError('Staff member', id);
  }

  await repo.updateMember(id, { isActive });
}

export async function resetPassword(
  session: Session,
  id: string,
  newPassword: string,
): Promise<void> {
  const repo = makeRepo(session);

  const existing = await repo.findMemberById(id);
  if (!existing) {
    throw new NotFoundError('Staff member', id);
  }

  // Hash new password — NEVER log the plaintext
  const passwordHash = await bcryptHash(newPassword, BCRYPT_ROUNDS);
  await repo.updatePasswordHash(id, passwordHash);

  // Best-effort sync to Supabase Auth — failure is logged but does not fail the request.
  // Our JWT auth flow uses passwordHash as the source of truth.
  try {
    const supabase = getSupabaseClient();
    await supabase.auth.admin.updateUserById(id, { password: newPassword });
  } catch (err) {
    logger.warn('Supabase Auth password sync failed (non-fatal)', {
      correlationId: 'staff.resetPassword',
      hospitalId: session.hospitalId,
      userId: session.id,
      module: 'staff',
      action: 'resetPassword',
    }, { targetUserId: id, error: (err as Error).message });
  }
}

// ── Roles ─────────────────────────────────────────────────────────────────────

export async function listRoles(session: Session): Promise<RoleResponse[]> {
  const repo = makeRepo(session);
  const rows = await repo.findRoles();
  return rows.map((r) => ({
    ...r,
    permissions: parsePermissions(r.permissions),
  }));
}

export async function createRole(session: Session, data: Role): Promise<RoleResponse> {
  const repo = makeRepo(session);
  const name = data.name.trim().toUpperCase();

  const existing = await repo.findRoleByName(name);
  if (existing) {
    throw new ConflictError(`Role name "${name}" already exists. Choose a different name.`);
  }

  const row = await repo.insertRole({
    name,
    displayName: data.name.trim(), // use the original casing as display name
    description: data.description ?? null,
    permissionsJson: JSON.stringify([]), // permissions set separately via PATCH /roles/:id/permissions
  });

  return { ...row, permissions: [] };
}

export async function updateRole(
  session: Session,
  id: string,
  data: Partial<Role>,
): Promise<void> {
  const repo = makeRepo(session);

  const existing = await repo.findRoleById(id);
  if (!existing) {
    throw new NotFoundError('Role', id);
  }

  const patch: Record<string, unknown> = {};
  if (data.name !== undefined) {
    const name = data.name.trim().toUpperCase();
    // If renaming, ensure the new name is not already taken
    const conflict = await repo.findRoleByName(name);
    if (conflict && conflict.id !== id) {
      throw new ConflictError(`Role name "${name}" already exists.`);
    }
    patch.name = name;
  }
  if (data.description !== undefined) patch.description = data.description ?? null;
  if (data.isSystem !== undefined) patch.isSystem = data.isSystem;

  if (Object.keys(patch).length === 0) return;
  await repo.updateRole(id, patch);
}

export async function deleteRole(session: Session, id: string): Promise<void> {
  const repo = makeRepo(session);

  const role = await repo.findRoleById(id);
  if (!role) {
    throw new NotFoundError('Role', id);
  }
  if (role.isSystem) {
    throw new ValidationError(
      `Role "${role.name}" is a system role and cannot be deleted.`,
    );
  }

  const userCount = await repo.countUsersByRoleName(role.name);
  if (userCount > 0) {
    throw new ValidationError(
      `Cannot delete role "${role.name}": ${userCount} staff member(s) currently use this role. Reassign them first.`,
    );
  }

  await repo.deleteRole(id);
}

export async function updateRolePermissions(
  session: Session,
  id: string,
  permissions: string[],
): Promise<void> {
  const repo = makeRepo(session);

  // Confirm the role exists before overwriting permissions
  const existing = await repo.findRoleById(id);
  if (!existing) {
    throw new NotFoundError('Role', id);
  }

  // The old Next.js updateRolePermissions performed NO validation of individual
  // permission keys — it wrote the submitted array verbatim. We match that
  // behaviour: any array of strings is accepted and stored. Validation of
  // which keys are "real" is enforced by the UI, not this endpoint.
  await repo.updateRole(id, { permissions: JSON.stringify(permissions) });
}

export async function seedSystemRoles(session: Session): Promise<void> {
  const repo = makeRepo(session);

  for (const def of SYSTEM_ROLES) {
    await repo.upsertSystemRole({
      name: def.name,
      displayName: def.displayName,
      description: def.description,
      permissionsJson: JSON.stringify(def.permissions),
    });
  }
}
