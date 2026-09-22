/**
 * MSW v2 handlers for the Staff module.
 */

import { http } from "msw"
import { ok, created } from "../envelope"
import { members, roles, uid } from "../fixtures/staff"
import { ALL_PERMISSIONS } from "@/lib/permissions"
import type {
  StaffMember,
  StaffRole,
  CreateMemberBody,
  UpdateMemberBody,
  CreateRoleBody,
  UpdateRoleBody,
} from "@/pages/staff/types"

function nowIso(): string {
  return new Date().toISOString()
}

function allPerms(): string[] {
  const keys: string[] = []
  for (const group of Object.values(ALL_PERMISSIONS)) {
    for (const p of group.permissions) keys.push(p.key)
  }
  return keys
}

export const staffHandlers = [

  // ─── Members ─────────────────────────────────────────────────────────────────

  http.get("/staff/members", () => ok(members)),

  http.post("/staff/members", async ({ request }) => {
    const body = await request.json() as CreateMemberBody
    const member: StaffMember = {
      id: uid("stf"), email: body.email, fullName: body.name,
      phone: body.phone ?? null, role: body.role,
      department: body.department ?? null, designation: body.designation ?? null,
      employeeId: body.employeeId ?? null, qualifications: body.qualifications ?? null,
      joiningDate: body.joiningDate ?? null, address: body.address ?? null,
      emergencyContact: body.emergencyContact ?? null, bloodGroup: body.bloodGroup ?? null,
      salary: body.salary ?? null, salaryType: body.salaryType ?? null,
      isActive: true, lastLogin: null, createdAt: nowIso(),
    }
    members.push(member)
    return created(member)
  }),

  http.patch("/staff/members/:id", async ({ params, request }) => {
    const id = params.id as string
    const body = await request.json() as UpdateMemberBody
    const idx = members.findIndex((m) => m.id === id)
    if (idx === -1) return ok(null)
    // API body uses `name`, response uses `fullName`
    const { name, ...rest } = body
    members[idx] = { ...members[idx], ...(name ? { fullName: name } : {}), ...rest }
    return ok(members[idx])
  }),

  http.patch("/staff/members/:id/active", async ({ params, request }) => {
    const id = params.id as string
    const body = await request.json() as { isActive: boolean }
    const idx = members.findIndex((m) => m.id === id)
    if (idx === -1) return ok(null)
    members[idx] = { ...members[idx], isActive: body.isActive }
    return ok(null)
  }),

  http.post("/staff/members/:id/reset-password", async ({ params }) => {
    // Password reset is fire-and-forget in mock — just acknowledge
    const id = params.id as string
    const exists = members.some((m) => m.id === id)
    return exists ? ok(null) : ok(null)
  }),

  // ─── Roles ───────────────────────────────────────────────────────────────────

  http.get("/staff/roles", () => ok(roles)),

  http.post("/staff/roles", async ({ request }) => {
    const body = await request.json() as CreateRoleBody
    const role: StaffRole = {
      id: uid("role"), name: body.name, displayName: body.displayName,
      description: body.description ?? null, permissions: body.permissions ?? [],
      isSystem: false, isActive: true, createdAt: nowIso(), updatedAt: nowIso(),
    }
    roles.push(role)
    return created(role)
  }),

  http.patch("/staff/roles/:id/permissions", async ({ params, request }) => {
    const id = params.id as string
    const body = await request.json() as { permissions: string[] }
    const idx = roles.findIndex((r) => r.id === id)
    if (idx === -1) return ok(null)
    roles[idx] = { ...roles[idx], permissions: body.permissions, updatedAt: nowIso() }
    return ok(roles[idx])
  }),

  http.patch("/staff/roles/:id", async ({ params, request }) => {
    const id = params.id as string
    const body = await request.json() as UpdateRoleBody
    const idx = roles.findIndex((r) => r.id === id)
    if (idx === -1) return ok(null)
    roles[idx] = { ...roles[idx], ...body, updatedAt: nowIso() }
    return ok(roles[idx])
  }),

  http.delete("/staff/roles/:id", ({ params }) => {
    const id = params.id as string
    const idx = roles.findIndex((r) => r.id === id && !r.isSystem)
    if (idx !== -1) roles.splice(idx, 1)
    return ok(null)
  }),

  // ─── Seed system roles ────────────────────────────────────────────────────────

  http.post("/staff/roles/seed", () => {
    // System roles already seeded in fixtures — return the seeded list
    const systemRoles: StaffRole[] = [
      {
        id: uid("role-sys"), name: "ADMIN", displayName: "Administrator",
        description: "Full access", permissions: allPerms(),
        isSystem: true, isActive: true, createdAt: nowIso(), updatedAt: nowIso(),
      },
    ]
    return ok(systemRoles)
  }),
]
