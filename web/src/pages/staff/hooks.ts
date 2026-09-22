/**
 * staff/hooks.ts
 *
 * All data-fetching and mutation hooks for the Staff module.
 *
 * Query hooks:
 *   - useStaffMembers       — GET /staff/members
 *   - useStaffRoles         — GET /staff/roles
 *
 * Mutation hooks:
 *   - useCreateMember       — POST /staff/members
 *   - useUpdateMember       — PATCH /staff/members/{id}
 *   - useToggleActive       — PATCH /staff/members/{id}/active
 *   - useResetPassword      — POST /staff/members/{id}/reset-password
 *   - useCreateRole         — POST /staff/roles
 *   - useUpdateRole         — PATCH /staff/roles/{id}
 *   - useDeleteRole         — DELETE /staff/roles/{id}
 *   - useUpdateRolePerms    — PATCH /staff/roles/{id}/permissions
 *   - useSeedSystemRoles    — POST /staff/roles/seed
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "@/components/ui/sonner"
import { apiClient } from "@/lib/api-client"
import type {
  StaffMember,
  StaffRole,
  CreateMemberBody,
  UpdateMemberBody,
  ToggleActiveBody,
  ResetPasswordBody,
  CreateRoleBody,
  UpdateRoleBody,
  UpdateRolePermissionsBody,
} from "./types"

// ─── Query key factory ────────────────────────────────────────────────────────

export const staffKeys = {
  all: ["staff"] as const,
  members: () => [...staffKeys.all, "members"] as const,
  roles: () => [...staffKeys.all, "roles"] as const,
} as const

// ─── Query hooks ──────────────────────────────────────────────────────────────

/**
 * Fetch all staff members.
 * Endpoint: GET /staff/members
 * Permission: staff:view
 */
export function useStaffMembers(enabled = true) {
  return useQuery({
    queryKey: staffKeys.members(),
    queryFn: () =>
      apiClient.get<StaffMember[]>("/staff/members").then((e) => e.data),
    enabled,
    staleTime: 30 * 1000,
  })
}

/**
 * Fetch all roles with their permissions.
 * Endpoint: GET /staff/roles
 * Permission: staff:view
 */
export function useStaffRoles(enabled = true) {
  return useQuery({
    queryKey: staffKeys.roles(),
    queryFn: () =>
      apiClient.get<StaffRole[]>("/staff/roles").then((e) => e.data),
    enabled,
    staleTime: 30 * 1000,
  })
}

// ─── Mutation hooks ───────────────────────────────────────────────────────────

/**
 * Create a new staff member.
 * Endpoint: POST /staff/members
 * Permission: staff:create
 */
export function useCreateMember(onSuccess?: () => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateMemberBody) =>
      apiClient.post<StaffMember>("/staff/members", body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: staffKeys.members() })
      toast.success("Staff member added successfully.")
      onSuccess?.()
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Failed to add staff member."
      toast.error(msg)
    },
  })
}

/**
 * Update an existing staff member's profile.
 * Endpoint: PATCH /staff/members/{id}
 * Permission: staff:edit
 */
export function useUpdateMember(id: string, onSuccess?: () => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: UpdateMemberBody) =>
      apiClient.patch(`/staff/members/${id}`, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: staffKeys.members() })
      toast.success("Staff member updated.")
      onSuccess?.()
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Failed to update staff member."
      toast.error(msg)
    },
  })
}

/**
 * Toggle a staff member's active/inactive status.
 * Endpoint: PATCH /staff/members/{id}/active
 * Permission: staff:deactivate
 */
export function useToggleActive(onSuccess?: () => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiClient.patch<void>(`/staff/members/${id}/active`, {
        isActive,
      } satisfies ToggleActiveBody),
    onSuccess: (_data, { isActive }) => {
      void qc.invalidateQueries({ queryKey: staffKeys.members() })
      toast.success(isActive ? "Staff member activated." : "Staff member deactivated.")
      onSuccess?.()
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Failed to update status."
      toast.error(msg)
    },
  })
}

/**
 * Reset a staff member's password (admin action).
 * Endpoint: POST /staff/members/{id}/reset-password
 * Permission: staff:edit
 */
export function useResetPassword(onSuccess?: () => void) {
  return useMutation({
    mutationFn: ({ id, newPassword }: { id: string; newPassword: string }) =>
      apiClient.post<void>(`/staff/members/${id}/reset-password`, {
        newPassword,
      } satisfies ResetPasswordBody),
    onSuccess: () => {
      toast.success("Password reset successfully.")
      onSuccess?.()
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Failed to reset password."
      toast.error(msg)
    },
  })
}

/**
 * Create a new role.
 * Endpoint: POST /staff/roles
 * Permission: staff:manage_roles
 */
export function useCreateRole(onSuccess?: () => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateRoleBody) =>
      apiClient.post<StaffRole>("/staff/roles", body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: staffKeys.roles() })
      toast.success("Role created.")
      onSuccess?.()
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Failed to create role."
      toast.error(msg)
    },
  })
}

/**
 * Update a role's metadata (displayName, description).
 * Endpoint: PATCH /staff/roles/{id}
 * Permission: staff:manage_roles
 */
export function useUpdateRole(id: string, onSuccess?: () => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: UpdateRoleBody) =>
      apiClient.patch(`/staff/roles/${id}`, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: staffKeys.roles() })
      toast.success("Role updated.")
      onSuccess?.()
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Failed to update role."
      toast.error(msg)
    },
  })
}

/**
 * Delete a non-system role.
 * Endpoint: DELETE /staff/roles/{id}
 * Permission: staff:manage_roles
 */
export function useDeleteRole(onSuccess?: () => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/staff/roles/${id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: staffKeys.roles() })
      toast.success("Role deleted.")
      onSuccess?.()
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Failed to delete role."
      toast.error(msg)
    },
  })
}

/**
 * Update a role's permission set (full replacement).
 * Endpoint: PATCH /staff/roles/{id}/permissions
 * Permission: staff:manage_roles
 */
export function useUpdateRolePerms() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, permissions }: { id: string; permissions: string[] }) =>
      apiClient.patch(`/staff/roles/${id}/permissions`, {
        permissions,
      } satisfies UpdateRolePermissionsBody),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: staffKeys.roles() })
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Failed to update permissions."
      toast.error(msg)
    },
  })
}

/**
 * Seed default system roles (Admin, Doctor, Receptionist, Optometrist, Nurse).
 * Endpoint: POST /staff/roles/seed
 * Permission: staff:manage_roles
 */
export function useSeedSystemRoles(onSuccess?: () => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => apiClient.post("/staff/roles/seed"),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: staffKeys.roles() })
      toast.success("System roles initialized successfully.")
      onSuccess?.()
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Failed to seed system roles."
      toast.error(msg)
    },
  })
}
