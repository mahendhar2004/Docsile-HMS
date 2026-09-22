/**
 * ReportsPage — placeholder.
 *
 * Phase 7 TODO: Implement reports module UI (17 endpoints):
 * - Patient search (GET /reports/patients/search — cursor-based)
 * - Patient summary, visit history, prescriptions, inpatient records
 * - Receipt data, lab records, billing overview
 * - Bulk exports: patients, prescriptions, eye readings, inpatients,
 *   insurance claims, lab bills, pharmacy bills, optical bills, expenses
 *   (GET /reports/exports/*)
 * Permissions: reports:view, data:export
 */
export default function ReportsPage() {
  return (
    <main className="p-6">
      <h1 className="text-xl font-semibold text-foreground">Reports</h1>
      <p className="text-sm text-muted-foreground mt-1">
        Phase 7 TODO: Patient report viewer and bulk data export functionality.
      </p>
    </main>
  )
}
