/**
 * DuesFollowupsPage — outstanding dues tracking and patient follow-up email management.
 *
 * Endpoints:
 *   - GET /dues-followups/dues                    → DueRecord[] (paginated)
 *   - GET /dues-followups/followups               → FollowUpRecord[] (paginated)
 *   - PATCH /dues-followups/dues/{id}/mark-paid   → mark OPD/IPD/LAB/PHARMACY due as paid
 *   - GET /dues-followups/email-templates         → EmailTemplate[] (for send-email dialog)
 *   - GET /dues-followups/hospital-name           → string (used in send-email context)
 *   - POST /dues-followups/send-email             → send follow-up email via Sitha AI
 *   - GET /dues-followups/doctors                 → string[] (doctor filter options)
 *   - GET /dues-followups/departments             → string[] (department filter options)
 *
 * Permissions:
 *   - dues:view  — page gate + all reads
 *   - dues:edit  — mark-paid + send-email actions
 */

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { PageHeader, ErrorState } from "@/components/patterns"
import { usePermissions } from "@/hooks/usePermissions"
import { DuesTab } from "./dues-followups/dues-tab"
import { FollowupsTab } from "./dues-followups/followups-tab"

export default function DuesFollowupsPage() {
  const { can } = usePermissions()
  const hasAccess = can("dues:view")

  // ── Permission gate ──────────────────────────────────────────────────────────
  if (!hasAccess) {
    return (
      <main>
        <ErrorState
          title="Access denied"
          description="You need the dues:view permission to view this page. Contact your administrator."
        />
      </main>
    )
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <main className="space-y-6">
      <PageHeader
        title="Dues & Follow-ups"
        description="Track outstanding payments and manage patient follow-up communications."
      />

      <Tabs defaultValue="dues">
        <TabsList>
          <TabsTrigger value="dues">Dues</TabsTrigger>
          <TabsTrigger value="followups">Follow-ups</TabsTrigger>
        </TabsList>

        <TabsContent value="dues" className="mt-4">
          <DuesTab />
        </TabsContent>

        <TabsContent value="followups" className="mt-4">
          <FollowupsTab />
        </TabsContent>
      </Tabs>
    </main>
  )
}
