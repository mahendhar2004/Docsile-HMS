/**
 * QueuePage — real-time OPD/workup/inpatient board module.
 *
 * Endpoints:
 *   - GET /queue/opd        → OPD doctor queue (OpdQueueEntry[])
 *   - GET /queue/workup     → Workup queue (WorkupQueueEntry[])
 *   - GET /queue/inpatients → Inpatient bed/status board (InpatientEntry[])
 *
 * Realtime:
 *   - hospital:{hospitalId}:queue → OPD + workup live updates
 *   - hospital:{hospitalId}:beds  → Inpatient board live updates
 *   - Fallback: 10 s polling when Realtime disconnects (full refetch — the
 *     `?since=` param noted in the stub is not yet implemented server-side;
 *     QueueQuerySchema accepts only `date`, not `since`)
 *
 * Permission: queue:view
 */

import { useSessionStore } from "@/store/session"
import { usePermissions } from "@/hooks/usePermissions"
import { PageHeader, ErrorState } from "@/components/patterns"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { OpdQueueTab } from "./queue/opd-queue-tab"
import { WorkupQueueTab } from "./queue/workup-queue-tab"
import { InpatientBoardTab } from "./queue/inpatient-board-tab"

export default function QueuePage() {
  const { can } = usePermissions()
  const hasAccess = can("queue:view")

  // hospitalId is needed by all three tab components for Realtime channel names.
  // Read unconditionally (before early return) to keep hook call order stable.
  const hospitalId = useSessionStore((s) => s.user?.hospitalId ?? "")

  // ── Permission gate ──────────────────────────────────────────────────────────
  if (!hasAccess) {
    return (
      <main className="p-6">
        <ErrorState
          title="Access denied"
          description="You need the queue:view permission to view the queue board. Contact your administrator."
        />
      </main>
    )
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <main className="p-6 space-y-6">
      <PageHeader
        title="Queue"
        description="Real-time OPD doctor queue, workup queue, and inpatient bed/status board."
      />

      <Tabs defaultValue="opd">
        <TabsList aria-label="Queue views">
          <TabsTrigger value="opd">OPD Queue</TabsTrigger>
          <TabsTrigger value="workup">Workup Queue</TabsTrigger>
          <TabsTrigger value="inpatients">Inpatient Board</TabsTrigger>
        </TabsList>

        <TabsContent value="opd">
          <OpdQueueTab hospitalId={hospitalId} />
        </TabsContent>

        <TabsContent value="workup">
          <WorkupQueueTab hospitalId={hospitalId} />
        </TabsContent>

        <TabsContent value="inpatients">
          <InpatientBoardTab hospitalId={hospitalId} />
        </TabsContent>
      </Tabs>
    </main>
  )
}
