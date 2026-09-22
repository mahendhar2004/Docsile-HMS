/**
 * DashboardPage — placeholder.
 *
 * Phase 7 TODO: Implement real dashboard using:
 * - GET /dashboard/summary
 * - GET /dashboard/quick-stats
 * Permissions: reports:view
 */
export default function DashboardPage() {
  return (
    <main className="p-6">
      <h1 className="text-xl font-semibold text-foreground">Dashboard</h1>
      <p className="text-sm text-muted-foreground mt-1">
        Phase 7 TODO: Aggregated landing-page stats — today&apos;s patient count,
        revenue summary, active inpatients, and quick-stats tiles.
      </p>
    </main>
  )
}
