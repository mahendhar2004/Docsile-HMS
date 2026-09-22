/**
 * QueuePage — placeholder.
 *
 * Phase 7 TODO: Implement queue module UI:
 * - OPD doctor queue (GET /queue/opd) with Supabase Realtime
 * - Workup queue (GET /queue/workup) with Supabase Realtime
 * - Inpatient bed/status board (GET /queue/inpatients) with Supabase Realtime
 * - Supabase Realtime subscription: hospital:{id}:queue channel
 * - Fallback polling on Realtime disconnect (GET with ?since= param)
 * Permissions: queue:view
 *
 * Note: queue:view permission does not yet exist in permissions.ts —
 * it is a new permission required by the migration (see Phase 5 §8.11).
 */
export default function QueuePage() {
  return (
    <main className="p-6">
      <h1 className="text-xl font-semibold text-foreground">Queue</h1>
      <p className="text-sm text-muted-foreground mt-1">
        Phase 7 TODO: OPD queue, workup queue, and inpatient board — all
        real-time via Supabase Realtime with polling fallback.
      </p>
    </main>
  )
}
