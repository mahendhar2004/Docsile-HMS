/**
 * StaffPage — Staff member management, role assignment, and permission configuration.
 *
 * Endpoints:
 *   GET  /staff/members                          → StaffMember[]      (staff:view)
 *   POST /staff/members                          → StaffMember        (staff:create)
 *   PATCH /staff/members/{id}                    → void               (staff:edit)
 *   PATCH /staff/members/{id}/active             → void               (staff:deactivate)
 *   POST  /staff/members/{id}/reset-password     → void               (staff:edit)
 *   GET  /staff/roles                            → StaffRole[]        (staff:view)
 *   POST /staff/roles                            → StaffRole          (staff:manage_roles)
 *   PATCH /staff/roles/{id}                      → void               (staff:manage_roles)
 *   DELETE /staff/roles/{id}                     → void               (staff:manage_roles)
 *   PATCH /staff/roles/{id}/permissions          → void               (staff:manage_roles)
 *   POST  /staff/roles/seed                      → void               (staff:manage_roles)
 *
 * Permissions: staff:view, staff:create, staff:edit, staff:deactivate, staff:manage_roles
 */

import { useState } from "react"
import { UserCog, Shield } from "lucide-react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { PageHeader } from "@/components/patterns/navigation"
import { ErrorState } from "@/components/patterns/feedback"
import { usePermissions } from "@/hooks/usePermissions"
import { useStaffRoles } from "./staff/hooks"
import { MembersTab } from "./staff/members-tab"
import { RolesTab } from "./staff/roles-tab"

// ─── StaffPage ────────────────────────────────────────────────────────────────

export default function StaffPage() {
  const { can } = usePermissions()
  const hasAccess = can("staff:view")

  // Roles are fetched here so MembersTab can consume them for the role selector
  // and role display labels without triggering a second fetch.
  const rolesQuery = useStaffRoles(hasAccess)

  const [activeTab, setActiveTab] = useState("members")

  // ── Permission gate ──────────────────────────────────────────────────────────
  if (!hasAccess) {
    return (
      <main>
        <ErrorState
          title="Access denied"
          description="You need the staff:view permission to access this page. Contact your administrator."
        />
      </main>
    )
  }

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <main className="space-y-6">
        <PageHeader
          title="Staff Management"
          actions={
            <TabsList>
              <TabsTrigger value="members" className="gap-2">
                <UserCog className="h-4 w-4" aria-hidden="true" />
                Staff Members
              </TabsTrigger>
              <TabsTrigger value="roles" className="gap-2">
                <Shield className="h-4 w-4" aria-hidden="true" />
                Roles &amp; Permissions
              </TabsTrigger>
            </TabsList>
          }
        />

        <TabsContent value="members">
          <MembersTab roles={rolesQuery.data ?? []} />
        </TabsContent>

        <TabsContent value="roles">
          <RolesTab />
        </TabsContent>
      </main>
    </Tabs>
  )
}
