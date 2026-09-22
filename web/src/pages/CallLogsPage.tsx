/**
 * CallLogsPage — placeholder.
 *
 * Phase 7 TODO: Implement call logs module UI:
 * - Call analytics (GET /call-logs/analytics)
 * - Call logs list with pagination (GET /call-logs)
 * - Call stats (GET /call-logs/stats)
 * - Update call notes (PATCH /call-logs/{id}/notes)
 * - Link call to patient (PATCH /call-logs/{id}/patient)
 * - Patient search for linking (GET /call-logs/patients/search)
 * - Manual Exotel sync (POST /call-logs/sync)
 * Note: Webhook (POST /call-logs/webhook/exotel) is backend-only, not a UI action.
 * Permissions: call_logs:view, call_logs:edit, call_logs:sync
 */
export default function CallLogsPage() {
  return (
    <main className="p-6">
      <h1 className="text-xl font-semibold text-foreground">Call Logs</h1>
      <p className="text-sm text-muted-foreground mt-1">
        Phase 7 TODO: Exotel call log management — search, link to patients,
        add notes, and analytics.
      </p>
    </main>
  )
}
