/**
 * StaffPage — placeholder.
 *
 * Phase 7 TODO: Implement staff module UI:
 * - Staff members list (GET /staff/members)
 * - Create/edit/toggle-active staff (POST/PATCH /staff/members)
 * - Reset staff password (POST /staff/members/{id}/reset-password)
 * - Roles CRUD (/staff/roles)
 * - Role permissions management (PATCH /staff/roles/{id}/permissions)
 * - Seed system roles (POST /staff/roles/seed)
 * Permissions: staff:view, staff:create, staff:edit, staff:deactivate, staff:manage_roles
 */
export default function StaffPage() {
  return (
    <main className="p-6">
      <h1 className="text-xl font-semibold text-foreground">Staff</h1>
      <p className="text-sm text-muted-foreground mt-1">
        Phase 7 TODO: Staff member management, role assignment, and permission configuration.
      </p>
    </main>
  )
}
