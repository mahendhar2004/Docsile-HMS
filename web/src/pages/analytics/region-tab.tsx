/**
 * analytics/region-tab.tsx
 *
 * Region tab — mirrors old app's RegionTab.tsx.
 * Endpoint: region-stats
 *
 * Visualisations (matching old app):
 *   - Patients by Region leaderboard → ranked list with proportional bars
 *   - Regional Distribution → ThemedDonutChart (old app: PieChart donut)
 *   - New vs Returning by Region → ThemedBarChart stacked (old app: custom stacked divs)
 *   - Concentration Insights → badge-annotated list
 */

import {
  useRegionStats,
} from "./hooks"
import type { TimeFilter, RegionStat } from "./types"
import {
  ChartContainer,
  ThemedDonutChart,
  ThemedBarChart,
  ErrorState,
  EmptyState,
} from "@/components/patterns"
import type { DonutChartSlice } from "@/components/patterns"
import { Card, CardContent } from "@/components/ui/card"

// ─── Colors (verified from RegionTab.tsx) ─────────────────────────────────────

const INDIGO = ["#4f46e5", "#818cf8", "#a5b4fc", "#c7d2fe", "#e0e7ff"]

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

// ─── Insight badge helper (matching RegionTab.tsx getInsightBadge exactly) ────

function getInsightBadge(stat: RegionStat, maxTotal: number) {
  const pct = maxTotal > 0 ? stat.total / maxTotal : 0
  const returnRate = stat.total > 0 ? stat.returning / stat.total : 0

  if (pct >= 0.6 && returnRate >= 0.4) return { label: "Strong",       color: "bg-emerald-100 text-emerald-700" }
  if (pct >= 0.3 && returnRate >= 0.3) return { label: "Stable",       color: "bg-blue-100 text-blue-700" }
  if (pct >= 0.15)                      return { label: "Opportunity",  color: "bg-amber-100 text-amber-700" }
  return                                       { label: "Focus Needed", color: "bg-rose-100 text-rose-700" }
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  filter: TimeFilter
  customStart?: string
  customEnd?: string
}

// ─── RegionTab ────────────────────────────────────────────────────────────────

export function RegionTab({ filter, customStart, customEnd }: Props) {
  const regionQ = useRegionStats(filter, customStart, customEnd)
  const stats   = regionQ.data ?? []

  if (regionQ.error && !regionQ.isLoading) {
    return (
      <ErrorState
        title="Could not load region data"
        error={regionQ.error}
        onRetry={() => void regionQ.refetch()}
      />
    )
  }

  if (!regionQ.isLoading && stats.length === 0) {
    return (
      <Card className="border-border/50 shadow-sm">
        <CardContent className="p-10">
          <EmptyState
            title="No region data"
            description="Add addresses to patient records to see regional statistics."
          />
        </CardContent>
      </Card>
    )
  }

  // Derived
  const maxTotal   = stats[0]?.total ?? 1
  const grandTotal = stats.reduce((s, r) => s + r.total, 0)
  const topRegion  = stats[0]

  // Donut slices — top 5 regions
  const donutSlices: DonutChartSlice[] = stats.slice(0, 5).map((r, i) => ({
    name: r.region,
    value: r.total,
    color: INDIGO[i % INDIGO.length],
  }))

  // Stacked bar data for new vs returning
  const stackedBarData = stats.map((r) => ({
    region:    r.region,
    New:       r.newPatients,
    Returning: r.returning,
  }))

  return (
    <div className="space-y-5">

      {/* ROW 1 — Region Leaderboard + Regional Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Region Leaderboard */}
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-5">
            <p className="text-sm font-semibold text-foreground">Patients by Region</p>
            <p className="text-[11px] text-muted-foreground mt-0.5 mb-4">
              Ranked by patient volume this period
            </p>
            {regionQ.isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-10 bg-muted rounded animate-pulse" />
                ))}
              </div>
            ) : (
              <div>
                {stats.map((r, i) => {
                  const rankLabel = i === 0 ? "1st" : i === 1 ? "2nd" : i === 2 ? "3rd" : `${i + 1}`
                  const pct = Math.round((r.total / maxTotal) * 100)
                  return (
                    <div
                      key={r.region}
                      className="flex items-center gap-3 py-2.5 border-b border-border/30 last:border-0"
                    >
                      <span className="text-xs font-bold text-muted-foreground w-6 text-center shrink-0">
                        {rankLabel}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">{r.region}</p>
                        <div className="h-1.5 bg-muted/40 rounded-full overflow-hidden mt-1.5">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${pct}%`,
                              background: BAR_GRADIENTS[i % BAR_GRADIENTS.length],
                            }}
                            aria-label={`${r.total} patients`}
                          />
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-bold text-foreground tabular-nums">
                          {r.total} pts
                        </p>
                        <p className="text-[10px] text-muted-foreground tabular-nums">
                          {r.percentage}%
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Regional Distribution Donut */}
        <ChartContainer
          title="Regional Distribution"
          description="Share of total patients by region"
          loading={regionQ.isLoading}
          empty={!regionQ.isLoading && donutSlices.length === 0}
          emptyMessage="No region data for this period."
          height={260}
        >
          <ThemedDonutChart
            data={donutSlices}
            totalLabel={grandTotal > 0 ? "Patients" : undefined}
            totalValue={grandTotal > 0 ? String(grandTotal) : undefined}
            height={260}
          />
        </ChartContainer>
      </div>

      {/* ROW 2 — New vs Returning stacked bar + Concentration Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* New vs Returning stacked bar chart */}
        <ChartContainer
          title="New vs Returning by Region"
          description="Patient loyalty breakdown per region"
          loading={regionQ.isLoading}
          empty={!regionQ.isLoading && stackedBarData.length === 0}
          emptyMessage="No region data for this period."
          height={260}
        >
          <ThemedBarChart
            data={stackedBarData}
            series={[
              { dataKey: "New",       name: "New",       color: "#4f46e5" },
              { dataKey: "Returning", name: "Returning", color: "#10b981" },
            ]}
            xAxisKey="region"
            stacked
            orientation="horizontal"
            height={260}
          />
        </ChartContainer>

        {/* Concentration Insights */}
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-5">
            <p className="text-sm font-semibold text-foreground">Concentration Insights</p>
            <p className="text-[11px] text-muted-foreground mt-0.5 mb-4">
              Where to focus outreach and resources
            </p>

            {regionQ.isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-8 bg-muted rounded animate-pulse" />
                ))}
              </div>
            ) : (
              <>
                {topRegion && (
                  <div className="mb-4 p-3.5 bg-indigo-50 border border-indigo-100 rounded-xl">
                    <p className="text-xs font-semibold text-indigo-800">
                      Top region: {topRegion.region}
                    </p>
                    <p className="text-[11px] text-indigo-600 mt-1">
                      {topRegion.total} patients ({topRegion.percentage}% of total) —{" "}
                      {topRegion.total > 0
                        ? Math.round((topRegion.returning / topRegion.total) * 100)
                        : 0}
                      % returning
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  {stats.map((r, i) => {
                    const badge = getInsightBadge(r, maxTotal)
                    const returnRate =
                      r.total > 0 ? Math.round((r.returning / r.total) * 100) : 0
                    return (
                      <div
                        key={r.region}
                        className="flex items-center gap-3 py-2 border-b border-border/30 last:border-0"
                      >
                        <div
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: INDIGO[i % INDIGO.length] }}
                          aria-hidden="true"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">
                            {r.region}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {returnRate}% return rate
                          </p>
                        </div>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${badge.color}`}
                        >
                          {badge.label}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

    </div>
  )
}
