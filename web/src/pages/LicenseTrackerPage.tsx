/**
 * LicenseTrackerPage — placeholder.
 *
 * Phase 7 TODO: Implement license tracker module UI:
 * - Licenses list (GET /license-tracker)
 * - Create license (POST /license-tracker)
 * - Edit license (PATCH /license-tracker/{id})
 * - Delete license (DELETE /license-tracker/{id})
 * - Attach/remove document URL (PATCH/DELETE /license-tracker/{id}/document)
 * Permissions: licenses:view, licenses:create, licenses:edit, licenses:delete
 */
export default function LicenseTrackerPage() {
  return (
    <main className="p-6">
      <h1 className="text-xl font-semibold text-foreground">License Tracker</h1>
      <p className="text-sm text-muted-foreground mt-1">
        Phase 7 TODO: Hospital license expiry tracking with document management.
      </p>
    </main>
  )
}
