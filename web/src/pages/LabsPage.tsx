/**
 * LabsPage — placeholder.
 *
 * Phase 7 TODO: Implement labs module UI:
 * - Lab CRUD (/labs/labs)
 * - Investigation master (/labs/investigations)
 * - Lab investigations per lab (/labs/labs/{id}/investigations)
 * - Patient investigations (GET /labs/patients/{id}/investigations)
 * - Pending lab investigations (GET /labs/pending-investigations)
 * - Lab bills (GET/POST /labs/bills)
 * Permissions: labs:view, labs:manage, labs:create
 */
export default function LabsPage() {
  return (
    <main className="p-6">
      <h1 className="text-xl font-semibold text-foreground">Labs</h1>
      <p className="text-sm text-muted-foreground mt-1">
        Phase 7 TODO: Lab management, investigations, and billing.
      </p>
    </main>
  )
}
