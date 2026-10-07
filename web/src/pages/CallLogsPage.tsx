/**
 * CallLogsPage — Exotel call log management.
 *
 * Endpoints consumed:
 *   GET  /call-logs                    → CallLog[] (offset-paginated) — call_logs:view
 *   GET  /call-logs/stats              → CallStats (today) — call_logs:view
 *   GET  /call-logs/analytics          → CallAnalyticsData — call_logs:view
 *   PATCH /call-logs/{id}/notes        → update notes — call_logs:edit
 *   PATCH /call-logs/{id}/patient      → link to patient — call_logs:edit
 *   GET  /call-logs/patients/search    → patient search — call_logs:view
 *   POST /call-logs/sync               → manual Exotel sync — call_logs:sync
 *
 * Note: POST /call-logs/webhook/exotel is backend-only — no UI action.
 *
 * Permission keys (verified against OpenAPI x-permission fields):
 *   call_logs:view — page gate + all reads
 *   call_logs:edit — notes update, patient link
 *   call_logs:sync — manual sync button
 */

import { useState } from "react"
import { RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { PageHeader, ErrorState } from "@/components/patterns"
import { usePermissions } from "@/hooks/usePermissions"
import { LogsTab } from "./call-logs/logs-tab"
import { AnalyticsTab } from "./call-logs/analytics-tab"
import { useSyncExotel } from "./call-logs/hooks"
import type { AnalyticsFilter } from "./call-logs/types"

// ─── CallLogsPage ─────────────────────────────────────────────────────────────

export default function CallLogsPage() {
  const { can } = usePermissions()

  // All permission checks called unconditionally before any early return
  const canView = can("call_logs:view")
  const canEdit = can("call_logs:edit")
  const canSync = can("call_logs:sync")

  // Analytics filter state — owned here so it persists across tab switches
  const [analyticsFilter, setAnalyticsFilter] = useState<AnalyticsFilter>("today")

  // Manual sync — hits the Exotel external API, may be slow
  const syncMutation = useSyncExotel()

  // ── Permission gate ──────────────────────────────────────────────────────────
  if (!canView) {
    return (
      <main>
        <ErrorState
          title="Access denied"
          description="You need the call_logs:view permission to access this page. Contact your administrator."
        />
      </main>
    )
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <main className="space-y-6">
      <PageHeader
        title="Call Logs"
        description="Reception call management"
        actions={
          /* Manual sync button — gated on call_logs:sync. Shows pending state
             because this hits an external Exotel API and may take several seconds. */
          canSync ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending}
              aria-label={
                syncMutation.isPending
                  ? "Syncing calls from Exotel..."
                  : "Sync calls from Exotel"
              }
            >
              <RefreshCw
                className={`h-4 w-4 mr-1.5 ${syncMutation.isPending ? "animate-spin" : ""}`}
                aria-hidden="true"
              />
              {syncMutation.isPending ? "Syncing..." : "Sync Calls"}
            </Button>
          ) : undefined
        }
      />

      {/* ── Tabs: Logs | Analytics ────────────────────────────────────────────── */}
      <Tabs defaultValue="logs" variant="underline">
        <TabsList>
          <TabsTrigger value="logs">Calls</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* ── Calls tab ──────────────────────────────────────────────────────── */}
        <TabsContent value="logs">
          <LogsTab canView={canView} canEdit={canEdit} />
        </TabsContent>

        {/* ── Analytics tab ──────────────────────────────────────────────────── */}
        <TabsContent value="analytics">
          <AnalyticsTab
            canView={canView}
            filter={analyticsFilter}
            onFilterChange={setAnalyticsFilter}
          />
        </TabsContent>
      </Tabs>
    </main>
  )
}
