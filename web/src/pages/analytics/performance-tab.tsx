/**
 * analytics/performance-tab.tsx
 *
 * Performance tab — mirrors old app's PerformanceTab.tsx.
 * Endpoints: top-services, doctor-performance, referral-stats, surgery-breakdown,
 *            top-prescribed-investigations, top-pharmacy-sales, top-lab-tests, common-medicines
 *
 * Visualisations (matching old app):
 *   - Doctor Leaderboard      → ranked list with proportional bars
 *   - Top Services by Revenue → ranked list with proportional bars
 *   - Surgery Breakdown       → ranked list with proportional bars
 *   - Referral Sources        → ThemedDonutChart (old app: PieChart donut)
 *   - Top Medicines Prescribed → ranked list with proportional bars
 *   - Top Medicines Sold (Pharmacy Sales) → ranked list with proportional bars
 *   - Top Investigations Prescribed → ranked list with proportional bars
 *   - Top Lab Tests Billed    → ranked list with proportional bars
 */

import {
  useDoctorPerformance,
  useTopServices,
  useReferralStats,
  useSurgeryBreakdown,
  useTopPrescribedInvestigations,
  useTopPharmacySales,
  useTopLabTests,
  useCommonMedicines,
  useAnalyticsOverview,
} from "./hooks"
import type { TimeFilter } from "./types"
import {
  ChartContainer,
  ThemedDonutChart,
  ErrorState,
  EmptyState,
} from "@/components/patterns"
import type { DonutChartSlice } from "@/components/patterns"
import { Card, CardContent } from "@/components/ui/card"

// ─── Colors (verified from PerformanceTab.tsx) ────────────────────────────────

const INDIGO = ["#4f46e5", "#818cf8", "#a5b4fc", "#c7d2fe", "#e0e7ff"]

const AVATAR_GRADIENTS = [
  ["#f59e0b", "#fbbf24"],
  ["#6366f1", "#818cf8"],
  ["#8b5cf6", "#a78bfa"],
  ["#14b8a6", "#2dd4bf"],
  ["#f97316", "#fb923c"],
  ["#64748b", "#94a3b8"],
  ["#ec4899", "#f9a8d4"],
  ["#10b981", "#34d399"],
]

const BAR_GRADIENTS = [
  "linear-gradient(90deg,#4f46e5,#818cf8)",
  "linear-gradient(90deg,#6366f1,#a5b4fc)",
  "linear-gradient(90deg,#8b5cf6,#c4b5fd)",
  "linear-gradient(90deg,#14b8a6,#5eead4)",
  "linear-gradient(90deg,#f97316,#fdba74)",
  "linear-gradient(90deg,#94a3b8,#cbd5e1)",
  "linear-gradient(90deg,#ec4899,#f9a8d4)",
  "linear-gradient(90deg,#10b981,#34d399)",
]

// ─── Formatters ───────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n)

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  filter: TimeFilter
  customStart?: string
  customEnd?: string
}

// ─── PerformanceTab ───────────────────────────────────────────────────────────

export function PerformanceTab({ filter, customStart, customEnd }: Props) {
  const overviewQ    = useAnalyticsOverview(filter, customStart, customEnd)
  const doctorQ      = useDoctorPerformance(filter, customStart, customEnd)
  const servicesQ    = useTopServices(filter, customStart, customEnd)
  const referralQ    = useReferralStats(filter, customStart, customEnd)
  const surgeryQ     = useSurgeryBreakdown(filter, customStart, customEnd)
  const invQ         = useTopPrescribedInvestigations(filter, customStart, customEnd)
  const pharmacySaleQ= useTopPharmacySales(filter, customStart, customEnd)
  const labTestQ     = useTopLabTests(filter, customStart, customEnd)
  const medsQ        = useCommonMedicines(filter, customStart, customEnd)

  const doctors      = doctorQ.data ?? []
  const services     = servicesQ.data ?? []
  const referrals    = referralQ.data ?? []
  const surgeries    = surgeryQ.data ?? []
  const invs         = invQ.data ?? []
  const pharmacySales= pharmacySaleQ.data ?? []
  const labTests     = labTestQ.data ?? []
  const meds         = medsQ.data ?? []

  if (doctorQ.error && !doctorQ.isLoading) {
    return (
      <ErrorState
        title="Could not load performance data"
        error={doctorQ.error}
        onRetry={() => void doctorQ.refetch()}
      />
    )
  }

  // Derived
  const maxPatients = doctors[0]?.patients ?? 1
  const maxService  = services[0]?.revenue ?? 1
  const maxSurgery  = surgeries[0]?.count ?? 1
  const maxInvCount = invs[0]?.count ?? 1
  const maxPharmQty = pharmacySales[0]?.quantity ?? 1
  const maxLabRev   = labTests[0]?.revenue ?? 1

  const referralTotal = referrals.reduce((s, r) => s + r.count, 0)
  const referralSlices: DonutChartSlice[] = referrals.slice(0, 5).map((r, i) => ({
    name: r.name,
    value: r.count,
    color: INDIGO[i % INDIGO.length],
  }))

  const prescribedMeds = meds.filter((m) => m.name !== "Others")

  return (
    <div className="space-y-5">

      {/* ROW 1 — Doctor Leaderboard + Top Services */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Doctor Leaderboard */}
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-5">
            <p className="text-sm font-semibold text-foreground">Doctor Leaderboard</p>
            <p className="text-[11px] text-muted-foreground mt-0.5 mb-4">
              Ranked by patients seen · revenue alongside
            </p>
            {doctorQ.isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-10 bg-muted rounded animate-pulse" />
                ))}
              </div>
            ) : doctors.length > 0 ? (
              <div>
                {doctors.map((doc, i) => {
                  const [from, to] = AVATAR_GRADIENTS[i % AVATAR_GRADIENTS.length]
                  const rankLabel = i === 0 ? "1st" : i === 1 ? "2nd" : i === 2 ? "3rd" : `${i + 1}`
                  const pct = Math.round((doc.patients / maxPatients) * 100)
                  return (
                    <div
                      key={doc.name}
                      className="flex items-center gap-3 py-2.5 border-b border-border/30 last:border-0"
                    >
                      <span className="text-xs font-bold text-muted-foreground w-6 text-center shrink-0">
                        {rankLabel}
                      </span>
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0"
                        style={{ background: `linear-gradient(135deg,${from},${to})` }}
                        aria-hidden="true"
                      >
                        {initials(doc.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">{doc.name}</p>
                        <div className="h-1.5 bg-muted/40 rounded-full overflow-hidden mt-1.5">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${pct}%`,
                              background: BAR_GRADIENTS[i % BAR_GRADIENTS.length],
                            }}
                            aria-label={`${doc.patients} patients`}
                          />
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-bold text-foreground tabular-nums">
                          {doc.patients} pts
                        </p>
                        <p className="text-[10px] text-muted-foreground tabular-nums">
                          {fmt(doc.revenue)}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <EmptyState title="No data" description="No doctor performance data for this period." />
            )}
          </CardContent>
        </Card>

        {/* Top Services by Revenue */}
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-5">
            <p className="text-sm font-semibold text-foreground">Top Services by Revenue</p>
            <p className="text-[11px] text-muted-foreground mt-0.5 mb-4">
              Most billed services this period
            </p>
            {servicesQ.isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-8 bg-muted rounded animate-pulse" />
                ))}
              </div>
            ) : services.length > 0 ? (
              <div>
                {services.slice(0, 8).map((s, i) => (
                  <div
                    key={s.name}
                    className="flex items-center gap-3 py-2 border-b border-border/30 last:border-0"
                  >
                    <span className="text-[11px] font-bold text-muted-foreground w-4 shrink-0">
                      {i + 1}
                    </span>
                    <span className="text-xs font-medium text-foreground flex-1 min-w-0 truncate">
                      {s.name}
                    </span>
                    <div className="w-28 shrink-0">
                      <div className="h-2 bg-indigo-50 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-400"
                          style={{ width: `${Math.round((s.revenue / maxService) * 100)}%` }}
                          aria-label={`${s.revenue} revenue`}
                        />
                      </div>
                    </div>
                    <span className="text-[11px] text-muted-foreground tabular-nums w-7 text-right shrink-0">
                      {s.count}
                    </span>
                    <span className="text-xs font-semibold text-foreground tabular-nums w-14 text-right shrink-0">
                      {fmt(s.revenue)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="No data" description="No service data for this period." />
            )}
          </CardContent>
        </Card>
      </div>

      {/* ROW 2 — Surgery Breakdown + Referral Sources */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Surgery Breakdown */}
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-5">
            <p className="text-sm font-semibold text-foreground">Surgery Breakdown</p>
            <p className="text-[11px] text-muted-foreground mt-0.5 mb-4">
              By procedure type this period
            </p>
            {surgeryQ.isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-8 bg-muted rounded animate-pulse" />
                ))}
              </div>
            ) : (overviewQ.data?.totalSurgeries ?? 0) > 0 ? (
              <>
                <div className="flex items-center gap-4 mb-4 p-3.5 bg-pink-50 border border-pink-100 rounded-xl">
                  <p className="text-4xl font-black text-pink-700 tabular-nums">
                    {overviewQ.data?.totalSurgeries}
                  </p>
                  <div>
                    <p className="text-xs font-semibold text-pink-800">Total Surgeries</p>
                    <p className="text-[11px] text-pink-600 mt-0.5">
                      Conversion rate:{" "}
                      <strong>{overviewQ.data?.conversionRate}%</strong>
                    </p>
                  </div>
                </div>
                {surgeries.length > 0 ? (
                  <div>
                    {surgeries.map((s) => (
                      <div
                        key={s.name}
                        className="flex items-center gap-3 py-2 border-b border-border/30 last:border-0"
                      >
                        <span className="text-xs font-semibold text-foreground flex-1 min-w-0 truncate">
                          {s.name}
                        </span>
                        <div className="w-28 shrink-0">
                          <div className="h-2 bg-pink-50 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-pink-600 to-pink-400"
                              style={{ width: `${Math.round((s.count / maxSurgery) * 100)}%` }}
                              aria-label={`${s.count} surgeries`}
                            />
                          </div>
                        </div>
                        <span className="text-xs font-bold text-pink-700 tabular-nums w-6 text-right shrink-0">
                          {s.count}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState title="No breakdown" description="No procedure breakdown available." />
                )}
              </>
            ) : (
              <EmptyState title="No surgeries" description="No surgeries recorded for this period." />
            )}
          </CardContent>
        </Card>

        {/* Referral Sources donut */}
        <ChartContainer
          title="Referral Sources"
          description="Where patients are referred from"
          loading={referralQ.isLoading}
          empty={!referralQ.isLoading && referralSlices.length === 0}
          emptyMessage="No referral data for this period."
          height={240}
        >
          <ThemedDonutChart
            data={referralSlices}
            totalLabel={referralTotal > 0 ? "Referrals" : undefined}
            totalValue={referralTotal > 0 ? String(referralTotal) : undefined}
            height={240}
          />
        </ChartContainer>
      </div>

      {/* ROW 3 — Top Medicines Prescribed + Top Medicines Sold */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Top Medicines Prescribed */}
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-5">
            <p className="text-sm font-semibold text-foreground">Top Medicines Prescribed</p>
            <p className="text-[11px] text-muted-foreground mt-0.5 mb-4">
              Most frequently prescribed drugs this period
            </p>
            {medsQ.isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-8 bg-muted rounded animate-pulse" />
                ))}
              </div>
            ) : prescribedMeds.length > 0 ? (
              <div>
                {prescribedMeds.map((m, i) => (
                  <div
                    key={m.name}
                    className="flex items-center gap-3 py-2 border-b border-border/30 last:border-0"
                  >
                    <span className="text-[11px] font-bold text-muted-foreground w-4 shrink-0">
                      {i + 1}
                    </span>
                    <span className="text-xs font-medium text-foreground flex-1 min-w-0 truncate">
                      {m.name}
                    </span>
                    <div className="w-24 shrink-0">
                      <div className="h-2 bg-violet-50 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-violet-400"
                          style={{ width: `${m.percentage}%` }}
                          aria-label={`${m.count} prescriptions`}
                        />
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-foreground tabular-nums w-10 text-right shrink-0">
                      {m.count}x
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="No data" description="No prescription medicine data for this period." />
            )}
          </CardContent>
        </Card>

        {/* Top Medicines Sold (Pharmacy Sales) */}
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-5">
            <p className="text-sm font-semibold text-foreground">Top Medicines Sold</p>
            <p className="text-[11px] text-muted-foreground mt-0.5 mb-4">
              Best-selling medicines from pharmacy billing
            </p>
            {pharmacySaleQ.isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-8 bg-muted rounded animate-pulse" />
                ))}
              </div>
            ) : pharmacySales.length > 0 ? (
              <div>
                {pharmacySales.map((m, i) => (
                  <div
                    key={m.name}
                    className="flex items-center gap-3 py-2 border-b border-border/30 last:border-0"
                  >
                    <span className="text-[11px] font-bold text-muted-foreground w-4 shrink-0">
                      {i + 1}
                    </span>
                    <span className="text-xs font-medium text-foreground flex-1 min-w-0 truncate">
                      {m.name}
                    </span>
                    <div className="w-24 shrink-0">
                      <div className="h-2 bg-teal-50 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-teal-500 to-teal-400"
                          style={{ width: `${Math.round((m.quantity / maxPharmQty) * 100)}%` }}
                          aria-label={`${m.quantity} qty sold`}
                        />
                      </div>
                    </div>
                    <span className="text-[11px] text-muted-foreground tabular-nums w-12 text-right shrink-0">
                      {m.quantity} qty
                    </span>
                    <span className="text-xs font-semibold text-foreground tabular-nums w-14 text-right shrink-0">
                      {fmt(m.revenue)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="No data" description="No pharmacy sales data for this period." />
            )}
          </CardContent>
        </Card>
      </div>

      {/* ROW 4 — Top Investigations Prescribed + Top Lab Tests Billed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Top Investigations Prescribed */}
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-5">
            <p className="text-sm font-semibold text-foreground">Top Investigations Prescribed</p>
            <p className="text-[11px] text-muted-foreground mt-0.5 mb-4">
              Most ordered investigations from prescriptions
            </p>
            {invQ.isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-8 bg-muted rounded animate-pulse" />
                ))}
              </div>
            ) : invs.length > 0 ? (
              <div>
                {invs.map((inv, i) => (
                  <div
                    key={inv.name}
                    className="flex items-center gap-3 py-2 border-b border-border/30 last:border-0"
                  >
                    <span className="text-[11px] font-bold text-muted-foreground w-4 shrink-0">
                      {i + 1}
                    </span>
                    <span className="text-xs font-medium text-foreground flex-1 min-w-0 truncate">
                      {inv.name}
                    </span>
                    <div className="w-24 shrink-0">
                      <div className="h-2 bg-amber-50 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-400"
                          style={{ width: `${Math.round((inv.count / maxInvCount) * 100)}%` }}
                          aria-label={`${inv.count} prescribed`}
                        />
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-foreground tabular-nums w-10 text-right shrink-0">
                      {inv.count}x
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="No data" description="No investigation data for this period." />
            )}
          </CardContent>
        </Card>

        {/* Top Lab Tests Billed */}
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-5">
            <p className="text-sm font-semibold text-foreground">Top Lab Tests Billed</p>
            <p className="text-[11px] text-muted-foreground mt-0.5 mb-4">
              Most billed lab investigations this period
            </p>
            {labTestQ.isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-8 bg-muted rounded animate-pulse" />
                ))}
              </div>
            ) : labTests.length > 0 ? (
              <div>
                {labTests.map((t, i) => (
                  <div
                    key={t.name}
                    className="flex items-center gap-3 py-2 border-b border-border/30 last:border-0"
                  >
                    <span className="text-[11px] font-bold text-muted-foreground w-4 shrink-0">
                      {i + 1}
                    </span>
                    <span className="text-xs font-medium text-foreground flex-1 min-w-0 truncate">
                      {t.name}
                    </span>
                    <div className="w-24 shrink-0">
                      <div className="h-2 bg-sky-50 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-sky-500 to-sky-400"
                          style={{ width: `${Math.round((t.revenue / maxLabRev) * 100)}%` }}
                          aria-label={`${fmt(t.revenue)} billed`}
                        />
                      </div>
                    </div>
                    <span className="text-[11px] text-muted-foreground tabular-nums w-7 text-right shrink-0">
                      {t.count}x
                    </span>
                    <span className="text-xs font-semibold text-foreground tabular-nums w-14 text-right shrink-0">
                      {fmt(t.revenue)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="No data" description="No lab test data for this period." />
            )}
          </CardContent>
        </Card>
      </div>

    </div>
  )
}
