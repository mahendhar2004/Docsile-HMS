/**
 * AnalyticsPage — placeholder.
 *
 * Phase 7 TODO: Implement analytics module UI (19 endpoints):
 * - Overview, gender distribution, age distribution
 * - Revenue by category, time series, top services
 * - Expense breakdown, financial summary, payment mode breakdown
 * - Doctor performance, status distribution, common diagnoses/medicines
 * - Top prescribed investigations, top pharmacy sales, top lab tests
 * - Referral stats, surgery breakdown, region stats
 * All endpoints: GET /analytics/* with ?filter=today|week|month|year|custom
 * Permissions: reports:view
 */
export default function AnalyticsPage() {
  return (
    <main className="p-6">
      <h1 className="text-xl font-semibold text-foreground">Analytics</h1>
      <p className="text-sm text-muted-foreground mt-1">
        Phase 7 TODO: Hospital analytics dashboard — revenue, patient trends,
        doctor performance, and operational insights.
      </p>
    </main>
  )
}
