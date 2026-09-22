/**
 * LabsPage — thin root page for the labs module.
 *
 * Tabs (sub-sections):
 *   - Labs          → lab CRUD + investigation configuration
 *   - Investigations → investigation master management
 *   - Bills         → bill generation (patient search + bill cards) + history
 *   - Pending       → pending lab investigations queue
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

import { usePermissions } from "@/hooks/usePermissions"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { PageHeader, ErrorState } from "@/components/patterns"
import { LabsTab } from "./labs/labs-tab"
import { InvestigationsTab } from "./labs/investigations-tab"
import { BillsTab } from "./labs/bills-tab"
import { PendingTab } from "./labs/pending-tab"

export default function LabsPage() {
  const { can } = usePermissions()
  const hasAccess = can("labs:view")

  // ── Permission gate ────────────────────────────────────────────────────────────
  if (!hasAccess) {
    return (
      <main className="p-6">
        <ErrorState
          title="Access denied"
          description="You need the labs:view permission to access this module. Contact your administrator."
        />
      </main>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <main className="p-6 space-y-4">
      <PageHeader
        title="Labs"
        description="Lab billing, investigations, and configuration"
      />

      <Tabs defaultValue="bills" className="w-full">
        <TabsList
          className="w-full justify-start border-b border-border rounded-none bg-transparent h-auto p-0 gap-1"
          aria-label="Labs navigation"
        >
          <TabsTrigger
            value="bills"
            className="rounded-none px-3 py-2.5 text-sm font-medium border-b-2 border-transparent text-muted-foreground hover:text-foreground transition-colors data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
          >
            Bills
          </TabsTrigger>
          <TabsTrigger
            value="pending"
            className="rounded-none px-3 py-2.5 text-sm font-medium border-b-2 border-transparent text-muted-foreground hover:text-foreground transition-colors data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
          >
            Pending
          </TabsTrigger>
          <TabsTrigger
            value="labs"
            className="rounded-none px-3 py-2.5 text-sm font-medium border-b-2 border-transparent text-muted-foreground hover:text-foreground transition-colors data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
          >
            Lab Config
          </TabsTrigger>
          <TabsTrigger
            value="investigations"
            className="rounded-none px-3 py-2.5 text-sm font-medium border-b-2 border-transparent text-muted-foreground hover:text-foreground transition-colors data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
          >
            Investigations
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bills" className="mt-0 pt-5 space-y-5">
          <BillsTab />
        </TabsContent>

        <TabsContent value="pending" className="mt-0 pt-5 space-y-5">
          <PendingTab />
        </TabsContent>

        <TabsContent value="labs" className="mt-0 pt-5 space-y-4">
          <LabsTab />
        </TabsContent>

        <TabsContent value="investigations" className="mt-0 pt-5 space-y-4">
          <InvestigationsTab />
        </TabsContent>
      </Tabs>
    </main>
  )
}
