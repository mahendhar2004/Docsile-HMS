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

import { useEffect, useRef, useState } from "react"
import { Sparkles } from "lucide-react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { PageHeader, ErrorState } from "@/components/patterns"
import { usePermissions } from "@/hooks/usePermissions"
import { useAiContextStore } from "@/store/ai-context"
import { DuesTab, type DuesTabHandle } from "./dues-followups/dues-tab"
import { FollowupsTab, type FollowupsTabHandle } from "./dues-followups/followups-tab"

export default function DuesFollowupsPage() {
  const { can } = usePermissions()
  const hasAccess = can("dues:view")

  const [activeTab, setActiveTab] = useState<"dues" | "followups">("dues")
  const duesRef = useRef<DuesTabHandle>(null)
  const followupsRef = useRef<FollowupsTabHandle>(null)

  const setAiContext = useAiContextStore((s) => s.setAiContext)
  const clearAiContext = useAiContextStore((s) => s.clearAiContext)
  const toggleSitha = useAiContextStore((s) => s.toggleOpen)
  const sithaOpen = useAiContextStore((s) => s.open)
  useEffect(() => {
    setAiContext({ patientId: null, module: "duesFollowups" })
    return () => clearAiContext()
  }, [setAiContext, clearAiContext])

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
  // bar, not below it). onRefresh and Ask Sitha now wired, matching main —
  // previously documented as an accepted gap; fixed via the same
  // forwardRef-per-tab pattern used by Patients' OPD/IPD tabs.
  return (
    <Tabs
      value={activeTab}
      onValueChange={(v) => setActiveTab(v as "dues" | "followups")}
    >
      <main className="space-y-6">
        <PageHeader
          title="Dues & Follow-Ups"
          description="Track payments & schedule reminders"
          onRefresh={() =>
            activeTab === "dues" ? duesRef.current?.refetch() : followupsRef.current?.refetch()
          }
          center={
            <TabsList>
              <TabsTrigger value="dues">Dues</TabsTrigger>
              <TabsTrigger value="followups">Follow-Ups</TabsTrigger>
            </TabsList>
          }
          actions={
            <Button
              variant={sithaOpen ? "primary" : "outline"}
              size="sm"
              onClick={toggleSitha}
              aria-label="Ask Sitha AI"
              className={!sithaOpen ? "bg-primary/5 border-primary/20 text-primary hover:bg-primary/10" : undefined}
            >
              <Sparkles className="h-3.5 w-3.5 mr-1.5" aria-hidden />
              {sithaOpen ? "Hide Sitha" : "Ask Sitha"}
            </Button>
          }
        />

        <TabsContent value="dues">
          <DuesTab ref={duesRef} />
        </TabsContent>

        <TabsContent value="followups">
          <FollowupsTab ref={followupsRef} />
        </TabsContent>
      </main>
    </Tabs>
  )
}
