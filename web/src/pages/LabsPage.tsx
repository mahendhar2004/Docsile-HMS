/**
 * LabsPage — thin root page for the labs module, matching main's exact
 * 2-tab structure (src/app/(hospital)/labs/components/LabsPage.tsx):
 * "Lab Billing & History" and "Lab Configuration" — default Billing.
 * Main's single LabBillingTab combines bill generation + the pending
 * queue; LabConfigTab combines lab CRUD + investigation master
 * management (see labs/billing-tab.tsx, labs/config-tab.tsx).
 *
 * Permission gate: labs:view (all read access)
 * Individual action gates are enforced per-component:
 *   labs:config  → create/edit/delete labs, configure investigation assignments
 *   labs:create  → create lab bills
 *
 * x-permission cross-reference (openapi.yaml):
 *   GET /labs/*                            → labs:view
 *   POST/PATCH/DELETE /labs/labs/*         → labs:config
 *   POST /labs/investigations              → labs:config
 *   PUT  /labs/labs/{labId}/investigations → labs:config
 *   POST /labs/bills                       → labs:create
 */

import { Sparkles } from "lucide-react"
import { usePermissions } from "@/hooks/usePermissions"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { PageHeader, StatBadge, ErrorState } from "@/components/patterns"
import { useAiContextStore } from "@/store/ai-context"
import { BillingTab } from "./labs/billing-tab"
import { ConfigTab } from "./labs/config-tab"
import { useLabsList } from "./labs/hooks"

export default function LabsPage() {
  const { can } = usePermissions()
  const hasAccess = can("labs:view")
  const toggleSitha = useAiContextStore((s) => s.toggleOpen)

  const { data: labs, refetch: refetchLabs } = useLabsList(hasAccess)
  const activeLabsCount = (labs ?? []).filter((l) => l.isActive).length

  // ── Permission gate ────────────────────────────────────────────────────────────
  if (!hasAccess) {
    return (
      <main>
        <ErrorState
          title="Access denied"
          description="You need the labs:view permission to access this module. Contact your administrator."
        />
      </main>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <main className="space-y-4">
      <PageHeader
        title="Labs"
        description="Billing, history & configuration"
        onRefresh={refetchLabs}
        actions={
          <>
            {labs && <StatBadge value={activeLabsCount} label="Active Labs" variant="info" />}
            <Button variant="outline" size="sm" onClick={toggleSitha} aria-label="Ask Sitha AI">
              <Sparkles className="h-3.5 w-3.5 mr-1.5" aria-hidden />
              Ask Sitha
            </Button>
          </>
        }
      />

      <Tabs defaultValue="billing" className="w-full">
        <TabsList aria-label="Labs navigation">
          <TabsTrigger value="billing">Lab Billing &amp; History</TabsTrigger>
          <TabsTrigger value="config">Lab Configuration</TabsTrigger>
        </TabsList>

        <TabsContent value="billing">
          <BillingTab />
        </TabsContent>

        <TabsContent value="config">
          <ConfigTab />
        </TabsContent>
      </Tabs>
    </main>
  )
}
