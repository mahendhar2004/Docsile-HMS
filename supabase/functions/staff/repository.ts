/**
 * Data-access layer for the staff module.
 *
 * Tables owned:
 *   - User  — staff member records; scoped by hospital_id (ADR-007)
 *   - Role  — global table; no hospital_id column (the backfill migration
 *             explicitly excluded it — confirmed in auth/repository.ts jsdoc)
 *
 * Supabase Auth user provisioning (auth.admin.createUser) is called from
 * service.ts, not here — it is an Auth API call, not a raw DB query.
 *
 * Every User query carries `.eq('hospital_id', this.hospitalId)`.
 * Role queries carry no hospital_id filter — Role is tenant-global.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { withId } from '../_shared/db-helpers.ts';

const USER_COLUMNS =
  'id, email, fullName, phone, role, department, designation, employeeId, ' +
  'qualifications, joiningDate, address, emergencyContact, bloodGroup, ' +
  'salary, salaryType, isActive, lastLogin, createdAt';

const ROLE_COLUMNS =
  'id, name, displayName, description, permissions, isSystem, isActive, createdAt, updatedAt';

export interface UserRow {
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

export interface RoleRow {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  /** JSON-encoded string[] — callers in service.ts parse this before returning it. */
  permissions: string;
  isSystem: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export class StaffRepository {
  constructor(private readonly supabase: SupabaseClient, private readonly hospitalId: string) {}

  // ──────────────────────────────────────────────────────────────────────────
  // Members (User table — hospital_id scoped)
  // ──────────────────────────────────────────────────────────────────────────

  async findMembers(): Promise<UserRow[]> {
    const { data, error } = await this.supabase
      .from('User')
      .select(USER_COLUMNS)
      .eq('hospital_id', this.hospitalId)
      .order('fullName', { ascending: true });
    if (error) throw new Error(`Failed to list staff members: ${error.message}`);
    return (data ?? []) as UserRow[];
  }

  async findMemberById(id: string): Promise<UserRow | null> {
    const { data, error } = await this.supabase
      .from('User')
      .select(USER_COLUMNS)
      .eq('id', id)
      .eq('hospital_id', this.hospitalId)
      .maybeSingle();
    if (error) throw new Error(`User lookup by id "${id}" failed: ${error.message}`);
    return data as UserRow | null;
  }

  async findMemberByEmail(email: string): Promise<{ id: string } | null> {
    const { data, error } = await this.supabase
      .from('User')
      .select('id')
      .eq('email', email)
      .eq('hospital_id', this.hospitalId)
      .maybeSingle();
    if (error) throw new Error(`Email uniqueness check failed: ${error.message}`);
    return data as { id: string } | null;
  }

  async findMemberByEmployeeId(employeeId: string): Promise<{ id: string } | null> {
    const { data, error } = await this.supabase
      .from('User')
      .select('id')
      .eq('employeeId', employeeId)
      .eq('hospital_id', this.hospitalId)
      .maybeSingle();
    if (error) throw new Error(`Employee ID uniqueness check failed: ${error.message}`);
    return data as { id: string } | null;
  }

  /**
   * Insert a new User row.
   * The auth user must already be created (its UUID is provided as `id`).
   */
  async insertMember(row: {
    id: string;
    email: string;
    passwordHash: string;
    fullName: string;
    role: string;
    employeeId: string | null;
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
  }): Promise<UserRow> {
    const now = new Date().toISOString();
    const { data, error } = await this.supabase
      .from('User')
      .insert({
        id: row.id,
        email: row.email,
        passwordHash: row.passwordHash,
        fullName: row.fullName,
        role: row.role,
        employeeId: row.employeeId,
        phone: row.phone ?? null,
        department: row.department ?? null,
        designation: row.designation ?? null,
        qualifications: row.qualifications ?? null,
        joiningDate: row.joiningDate ?? null,
        address: row.address ?? null,
        emergencyContact: row.emergencyContact ?? null,
        bloodGroup: row.bloodGroup ?? null,
        salary: row.salary ?? null,
        salaryType: row.salaryType ?? null,
        hospital_id: this.hospitalId,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      })
      .select(USER_COLUMNS)
      .single();
    if (error) throw new Error(`Failed to insert staff member "${row.email}": ${error.message}`);
    return data as UserRow;
  }

  /**
   * Apply a partial patch to a User row (updates updatedAt automatically).
   * Only keys present in `patch` are written — undefined keys are left untouched.
   */
  async updateMember(id: string, patch: Record<string, unknown>): Promise<void> {
    const { error } = await this.supabase
      .from('User')
      .update({ ...patch, updatedAt: new Date().toISOString() })
      .eq('id', id)
      .eq('hospital_id', this.hospitalId);
    if (error) throw new Error(`Failed to update staff member "${id}": ${error.message}`);
  }

  async updatePasswordHash(id: string, passwordHash: string): Promise<void> {
    const { error } = await this.supabase
      .from('User')
      .update({ passwordHash, updatedAt: new Date().toISOString() })
      .eq('id', id)
      .eq('hospital_id', this.hospitalId);
    if (error) throw new Error(`Failed to update password hash for user "${id}": ${error.message}`);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Roles (global table — no hospital_id filter)
  // ──────────────────────────────────────────────────────────────────────────

  async findRoles(): Promise<RoleRow[]> {
    const { data, error } = await this.supabase
      .from('Role')
      .select(ROLE_COLUMNS)
      .order('name', { ascending: true });
    if (error) throw new Error(`Failed to list roles: ${error.message}`);
    return (data ?? []) as RoleRow[];
  }

  async findRoleById(id: string): Promise<RoleRow | null> {
    const { data, error } = await this.supabase
      .from('Role')
      .select(ROLE_COLUMNS)
      .eq('id', id)
      .maybeSingle();
    if (error) throw new Error(`Role lookup by id "${id}" failed: ${error.message}`);
    return data as RoleRow | null;
  }

  async findRoleByName(name: string): Promise<{ id: string } | null> {
    const { data, error } = await this.supabase
      .from('Role')
      .select('id')
      .eq('name', name)
      .maybeSingle();
    if (error) throw new Error(`Role name uniqueness check for "${name}" failed: ${error.message}`);
    return data as { id: string } | null;
  }

  /**
   * Count users in this hospital that carry the given role name.
   * Used before deleting a role — prevents orphaning user records.
   */
  async countUsersByRoleName(roleName: string): Promise<number> {
    const { count, error } = await this.supabase
      .from('User')
      .select('*', { count: 'exact', head: true })
      .eq('role', roleName)
      .eq('hospital_id', this.hospitalId);
    if (error) throw new Error(`User count by role "${roleName}" failed: ${error.message}`);
    return count ?? 0;
  }

  async insertRole(row: {
    name: string;
    displayName: string;
    description: string | null;
    permissionsJson: string;
  }): Promise<RoleRow> {
    const now = new Date().toISOString();
    const { data, error } = await this.supabase
      .from('Role')
      .insert(withId({
        name: row.name,
        displayName: row.displayName,
        description: row.description,
        permissions: row.permissionsJson,
        isSystem: false,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      }))
      .select(ROLE_COLUMNS)
      .single();
    if (error) throw new Error(`Failed to create role "${row.name}": ${error.message}`);
    return data as RoleRow;
  }

  async updateRole(id: string, patch: Record<string, unknown>): Promise<void> {
    const { error } = await this.supabase
      .from('Role')
      .update({ ...patch, updatedAt: new Date().toISOString() })
      .eq('id', id);
    if (error) throw new Error(`Failed to update role "${id}": ${error.message}`);
  }

  async deleteRole(id: string): Promise<void> {
    const { error } = await this.supabase.from('Role').delete().eq('id', id);
    if (error) throw new Error(`Failed to delete role "${id}": ${error.message}`);
  }

  /**
   * Idempotent upsert for a system role.
   * If a row with the given `name` already exists → update displayName, description,
   * permissions, and isSystem (preserves id and timestamps already on the row).
   * If it does not exist → insert a new row.
   *
   * This is an explicit check-then-write rather than an ON CONFLICT upsert because
   * the unique constraint name on Role.name is not known here, and the pattern is
   * consistent with the old Next.js seedSystemRoles behaviour.
   */
  async upsertSystemRole(role: {
    name: string;
    displayName: string;
    description: string;
    permissionsJson: string;
  }): Promise<void> {
    const now = new Date().toISOString();
    const { data: existing } = await this.supabase
      .from('Role')
      .select('id')
      .eq('name', role.name)
      .maybeSingle();

    if (existing) {
      const { error } = await this.supabase
        .from('Role')
        .update({
          displayName: role.displayName,
          description: role.description,
          permissions: role.permissionsJson,
          isSystem: true,
          updatedAt: now,
        })
        .eq('id', existing.id);
      if (error) {
        throw new Error(`Failed to update system role "${role.name}": ${error.message}`);
      }
    } else {
      const { error } = await this.supabase.from('Role').insert(withId({
        name: role.name,
        displayName: role.displayName,
        description: role.description,
        permissions: role.permissionsJson,
        isSystem: true,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      }));
      if (error) {
        throw new Error(`Failed to insert system role "${role.name}": ${error.message}`);
      }
    }
  }
}
