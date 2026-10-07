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
  // Tabs embedded in the header's center slot, matching main's placement
  // (main puts the Dues/Follow-Ups switch directly in the sticky header
  // bar, not below it). No onRefresh: main wires it to whichever tab is
  // active via refs into each tab's own refresh function — DuesTab/
  // FollowupsTab don't currently expose one, so left unwired rather than
  // forced; a real gap, not silently matched.
  return (
    <Tabs defaultValue="dues">
      <main className="space-y-6">
        <PageHeader
          title="Dues & Follow-Ups"
          description="Track payments & schedule reminders"
          center={
            <TabsList>
              <TabsTrigger value="dues">Dues</TabsTrigger>
              <TabsTrigger value="followups">Follow-Ups</TabsTrigger>
            </TabsList>
          }
        />

        <TabsContent value="dues">
          <DuesTab />
        </TabsContent>

        <TabsContent value="followups">
          <FollowupsTab />
        </TabsContent>
      </main>
    </Tabs>
  )
}
