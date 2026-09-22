/**
 * WorkupPage — placeholder.
 *
 * Phase 7 TODO: Implement workup module UI:
 * - Workup queue (GET /workup/queue)
 * - Patient workup view (GET /workup/patients/{id})
 * - Save eye reading / upsert (POST /workup/patients/{id}/eye-readings)
 * - Start workup (POST /workup/patients/{id}/start — deprecated no-op)
 * Permissions: workup:view, workup:create
 */
export default function WorkupPage() {
  return (
    <main className="p-6">
      <h1 className="text-xl font-semibold text-foreground">Workup</h1>
      <p className="text-sm text-muted-foreground mt-1">
        Phase 7 TODO: Clinical workup queue and eye reading entry.
      </p>
    </main>
  )
}
