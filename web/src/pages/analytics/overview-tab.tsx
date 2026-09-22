/**
 * analytics/overview-tab.tsx
 *
 * Overview tab — mirrors old app's OverviewTab.tsx.
 * Endpoints: overview, gender-distribution, age-distribution, revenue-by-category, status-distribution
 *
 * Charts used (matching old app chart choices):
 *   - Revenue Mix by department → ThemedDonutChart (old app: PieChart donut)
 *   - Financial summary vertical bars → custom proportional divs (old app: custom bars)
 *   - Discount by module bars → custom proportional divs (old app: custom bars)
 *   - Age distribution bars → custom proportional divs (old app: custom bars)
 *   - Gender distribution → ThemedDonutChart (old app: PieChart donut)
 *   - Status distribution → ThemedDonutChart (additional display)
 */

import {
  IndianRupee,
  Users,
  ArrowRightLeft,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Scissors,
  Wallet,
  RefreshCw,
  Activity,
} from "lucide-react"
import {
  StatCard,
  ChartContainer,
  ThemedDonutChart,
  ErrorState,
  EmptyState,
} from "@/components/patterns"
import type { DonutChartSlice } from "@/components/patterns"
import { Card, CardContent } from "@/components/ui/card"
import {
  useAnalyticsOverview,
  useGenderDistribution,
  useAgeDistribution,
  useRevenueByCategory,
  useStatusDistribution,
} from "./hooks"
import type { TimeFilter } from "./types"

// ─── Colors (verified from analytics-shared.tsx) ──────────────────────────────

const SOURCE_COLORS: Record<string, string> = {
  Consultations: "#3b82f6",
  Labs:          "#14b8a6",
  Pharmacy:      "#10b981",
  Optical:       "#8b5cf6",
  "In-Patient":  "#f59e0b",
}

const STATUS_COLORS: Record<string, string> = {
  REGISTERED:   "#94a3b8",
  IN_WORKUP:    "#f59e0b",
  WORKUP_DONE:  "#06b6d4",
  WITH_DOCTOR:  "#8b5cf6",
  VISITED:      "#3b82f6",
  COMPLETED:    "#10b981",
  MEDICAL_ONLY: "#14b8a6",
  MOVED:        "#6366f1",
  CANCELLED:    "#ef4444",
  NO_SHOW:      "#f43f5e",
}

const CHART_COLORS = [
  "#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ef4444",
  "#06b6d4", "#ec4899", "#14b8a6", "#f97316", "#6366f1",
]

// ─── Formatters ───────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n)

const fmtShort = (n: number) => {
  if (n >= 10000000) return `${(n / 10000000).toFixed(1)}Cr`
  if (n >= 100000) return `${(n / 100000).toFixed(1)}L`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
  return n.toString()
}

const fmtCount = (n: number) => new Intl.NumberFormat("en-IN").format(n)

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  filter: TimeFilter
  customStart?: string
  customEnd?: string
}

// ─── OverviewTab ──────────────────────────────────────────────────────────────

export function OverviewTab({ filter, customStart, customEnd }: Props) {
  const overviewQ = useAnalyticsOverview(filter, customStart, customEnd)
  const genderQ   = useGenderDistribution(filter, customStart, customEnd)
  const ageQ      = useAgeDistribution(filter, customStart, customEnd)
  const revCatQ   = useRevenueByCategory(filter, customStart, customEnd)
  const statusQ   = useStatusDistribution(filter, customStart, customEnd)

  const overview       = overviewQ.data
  const gender         = genderQ.data
  const ageGroups      = ageQ.data ?? []
  const revenueByCategory = revCatQ.data ?? []
  const statusDist     = statusQ.data ?? []

  const isLoading = overviewQ.isLoading

  if (overviewQ.error && !isLoading) {
    return (
      <ErrorState
        title="Could not load overview"
        error={overviewQ.error}
        onRetry={() => void overviewQ.refetch()}
      />
    )
  }

  // Derived values
  const netCashFlow = overview ? overview.totalCollected - overview.totalExpenses : 0

  // Revenue mix donut slices
  const revMixSlices: DonutChartSlice[] = revenueByCategory
    .filter((r) => r.amount > 0)
    .map((r) => ({
      name: r.category,
      value: r.amount,
      color: SOURCE_COLORS[r.category] ?? CHART_COLORS[0],
    }))

  // Gender donut slices
  const genderTotal = (gender?.male ?? 0) + (gender?.female ?? 0) + (gender?.other ?? 0)
  const genderSlices: DonutChartSlice[] = gender && genderTotal > 0
    ? [
        { name: "Male",   value: gender.male,   color: "#4f46e5" },
        { name: "Female", value: gender.female, color: "#a5b4fc" },
        { name: "Other",  value: gender.other,  color: "#e0e7ff" },
      ].filter((s) => s.value > 0)
    : []

  // Status distribution donut slices
  const statusSlices: DonutChartSlice[] = statusDist.map((s, i) => ({
    name: s.status,
    value: s.count,
    color: STATUS_COLORS[s.status] ?? CHART_COLORS[i % CHART_COLORS.length],
  }))

  // Financial bar heights (proportional to totalRevenue, max 120px)
  const maxFinVal = Math.max(overview?.totalRevenue ?? 0, 1)
  const fBarH = (v: number) => Math.max(v > 0 ? 4 : 0, Math.round((v / maxFinVal) * 120))

  const finBars = overview
    ? [
        { label: "Billed",    value: overview.totalRevenue,   color: "bg-indigo-500" },
        { label: "Collected", value: overview.totalCollected, color: "bg-indigo-400" },
        { label: "Expenses",  value: overview.totalExpenses,  color: "bg-slate-400"  },
        { label: "Dues",      value: overview.totalDues,      color: "bg-slate-300"  },
        { label: "Discounts", value: overview.totalDiscount,  color: "bg-indigo-200" },
      ]
    : []

  // Discount module bars (proportional to max module discount, max 100px)
  const discountModules = overview
    ? [
        { label: "Consult",    value: overview.consultationDiscount, color: "bg-indigo-500" },
        { label: "Labs",       value: overview.labDiscount,          color: "bg-indigo-400" },
        { label: "Pharmacy",   value: overview.pharmacyDiscount,     color: "bg-indigo-300" },
        { label: "Optical",    value: overview.opticalDiscount,      color: "bg-slate-300"  },
        { label: "In-Patient", value: overview.inpatientDiscount,    color: "bg-slate-200"  },
      ]
    : []
  const maxDiscount = Math.max(...discountModules.map((d) => d.value), 1)
  const dBarH = (v: number) => Math.max(v > 0 ? 4 : 0, Math.round((v / maxDiscount) * 100))

  // Age bar heights (proportional to max age group, max 100px)
  const maxAge = Math.max(...ageGroups.map((g) => g.count), 1)
  const aBarH = (v: number) => Math.max(v > 0 ? 4 : 0, Math.round((v / maxAge) * 100))

  return (
    <div className="space-y-5">

      {/* ROW 1 — 4 hero KPI stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Revenue"
          value={overview ? fmt(overview.totalRevenue) : "—"}
          icon={<IndianRupee size={20} aria-hidden="true" />}
          loading={isLoading}
          trend={
            overview && overview.revenueChange !== 0
              ? {
                  direction: overview.revenueChange >= 0 ? "up" : "down",
                  delta: `${overview.revenueChange > 0 ? "+" : ""}${overview.revenueChange}%`,
                  label: "vs prev period",
                }
              : undefined
          }
        />
        <StatCard
          label="Total Patients"
          value={overview ? fmtCount(overview.totalPatients) : "—"}
          icon={<Users size={20} aria-hidden="true" />}
          loading={isLoading}
          trend={
            overview && overview.patientChange !== 0
              ? {
                  direction: overview.patientChange >= 0 ? "up" : "down",
                  delta: `${overview.patientChange > 0 ? "+" : ""}${overview.patientChange}%`,
                  label: "vs prev period",
                }
              : undefined
          }
        />
        <StatCard
          label="Conversion Rate"
          value={overview ? `${overview.conversionRate}%` : "—"}
          icon={<ArrowRightLeft size={20} aria-hidden="true" />}
          loading={isLoading}
        />
        <StatCard
          label="Net Cash Flow"
          value={overview ? fmt(netCashFlow) : "—"}
          icon={
            netCashFlow >= 0
              ? <TrendingUp size={20} aria-hidden="true" />
              : <TrendingDown size={20} aria-hidden="true" />
          }
          loading={isLoading}
        />
      </div>

      {/* ROW 2 — Revenue Mix donut + Financial Summary bars */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Revenue Mix */}
        <ChartContainer
          title="Revenue Mix"
          description="Breakdown by department"
          loading={revCatQ.isLoading}
          empty={!revCatQ.isLoading && revMixSlices.length === 0}
          emptyMessage="No revenue data for this period."
          height={220}
        >
          <ThemedDonutChart
            data={revMixSlices}
            totalLabel="Revenue"
            height={220}
          />
        </ChartContainer>

        {/* Financial Summary — custom bar visualisation matching old app */}
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-4">
              <p className="text-sm font-semibold text-foreground">Financial Summary</p>
              {overview && (
                <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-full tabular-nums">
                  {overview.collectionRate}% collected
                </span>
              )}
            </div>

            {isLoading ? (
              <div className="flex items-end justify-center gap-6 px-4" style={{ height: 140 }}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex flex-col items-center gap-1.5">
                    <div className="w-10 h-16 bg-muted rounded-t-lg animate-pulse" />
                    <div className="w-8 h-2 bg-muted rounded animate-pulse" />
                  </div>
                ))}
              </div>
            ) : finBars.length > 0 ? (
              <div className="flex items-end justify-center gap-6 px-4" style={{ height: 140 }}>
                {finBars.map((bar) => (
                  <div key={bar.label} className="flex flex-col items-center gap-1.5">
                    <span className="text-[10px] font-bold text-foreground tabular-nums">
                      {fmtShort(bar.value)}
                    </span>
                    <div
                      className={`w-10 rounded-t-lg ${bar.color}`}
                      style={{ height: fBarH(bar.value) }}
                      aria-label={`${bar.label}: ${fmt(bar.value)}`}
                    />
                    <span className="text-[10px] text-muted-foreground font-medium">
                      {bar.label}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="No data" description="No financial data for this period." />
            )}

            {/* Bottom strip */}
            {overview && (
              <div className="mt-4 pt-4 border-t border-border/40 grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                    Rev / Patient
                  </p>
                  <p className="text-sm font-black text-foreground mt-0.5 tabular-nums">
                    {fmt(overview.revenuePerPatient)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                    Collection Rate
                  </p>
                  <p className="text-sm font-black text-foreground mt-0.5 tabular-nums">
                    {overview.collectionRate}%
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ROW 3 — 5 mini stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard
          label="Pending Dues"
          value={overview ? fmt(overview.totalDues) : "—"}
          icon={<CreditCard size={20} aria-hidden="true" />}
          loading={isLoading}
        />
        <StatCard
          label="Surgeries"
          value={overview ? fmtCount(overview.totalSurgeries) : "—"}
          icon={<Scissors size={20} aria-hidden="true" />}
          loading={isLoading}
        />
        <StatCard
          label="Total Expenses"
          value={overview ? fmt(overview.totalExpenses) : "—"}
          icon={<Wallet size={20} aria-hidden="true" />}
          loading={isLoading}
        />
        <StatCard
          label="Follow-up Visits"
          value={overview ? fmtCount(overview.followUpVisits) : "—"}
          icon={<RefreshCw size={20} aria-hidden="true" />}
          loading={isLoading}
        />
        <StatCard
          label="Avg. Daily Patients"
          value={overview ? fmtCount(overview.avgDailyPatients) : "—"}
          icon={<Activity size={20} aria-hidden="true" />}
          loading={isLoading}
        />
      </div>

      {/* ROW 4 — Discounts by module + Age distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Discounts by Module */}
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-5">
              <div>
                <p className="text-sm font-semibold text-foreground">Discounts by Module</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Concessions given this period</p>
              </div>
              {overview && (
                <div className="text-right">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Total</p>
                  <p className="text-lg font-black text-indigo-600 tabular-nums mt-0.5">
                    {fmt(overview.totalDiscount)}
                  </p>
                </div>
              )}
            </div>
            {isLoading ? (
              <div className="flex items-end justify-around gap-3 px-2" style={{ height: 130 }}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="w-10 h-20 bg-muted rounded-t-lg animate-pulse" />
                ))}
              </div>
            ) : overview && overview.totalDiscount > 0 ? (
              <div className="flex items-end justify-around gap-3 px-2" style={{ height: 130 }}>
                {discountModules.map((mod) => (
                  <div key={mod.label} className="flex flex-col items-center gap-1.5">
                    <span className="text-[10px] font-bold text-foreground tabular-nums">
                      {fmtShort(mod.value)}
                    </span>
                    <div
                      className={`w-10 rounded-t-lg ${mod.color}`}
                      style={{ height: dBarH(mod.value) }}
                      aria-label={`${mod.label}: ${fmt(mod.value)}`}
                    />
                    <span className="text-[9px] text-muted-foreground text-center leading-tight">
                      {mod.label}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="No discounts" description="No discounts recorded for this period." />
            )}
          </CardContent>
        </Card>

        {/* Age Distribution */}
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-sm font-semibold text-foreground">Age Distribution</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Patients by age band</p>
              </div>
              {overview && (
                <span className="text-[11px] text-muted-foreground bg-muted/40 px-3 py-1 rounded-full border border-border/40">
                  {fmtCount(overview.totalPatients)} total
                </span>
              )}
            </div>
            {ageQ.isLoading ? (
              <div className="flex items-end justify-around gap-2 px-1" style={{ height: 130 }}>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <div key={i} className="w-9 h-16 bg-muted rounded-t-lg animate-pulse" />
                ))}
              </div>
            ) : ageGroups.some((g) => g.count > 0) ? (
              <div className="flex items-end justify-around gap-2 px-1" style={{ height: 130 }}>
                {ageGroups.map((g) => (
                  <div key={g.label} className="flex flex-col items-center gap-1.5">
                    <span className="text-[10px] font-bold text-foreground">{g.count}</span>
                    <div
                      className="w-9 rounded-t-lg bg-indigo-400"
                      style={{ height: aBarH(g.count) }}
                      aria-label={`${g.label}: ${g.count} patients`}
                    />
                    <span className="text-[9px] text-muted-foreground">{g.label}</span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="No data" description="No age distribution data for this period." />
            )}
          </CardContent>
        </Card>
      </div>

      {/* ROW 5 — Gender + Status distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Gender Distribution */}
        <ChartContainer
          title="Gender Distribution"
          description="Patient demographics"
          loading={genderQ.isLoading}
          empty={!genderQ.isLoading && genderSlices.length === 0}
          emptyMessage="No patient data for this period."
          height={200}
        >
          <ThemedDonutChart
            data={genderSlices}
            totalLabel="Patients"
            height={200}
          />
        </ChartContainer>

        {/* Status Distribution */}
        <ChartContainer
          title="Patient Status Distribution"
          description="Queue status breakdown for the period"
          loading={statusQ.isLoading}
          empty={!statusQ.isLoading && statusSlices.length === 0}
          emptyMessage="No patient status data for this period."
          height={200}
        >
          <ThemedDonutChart
            data={statusSlices}
            totalLabel="Patients"
            height={200}
          />
        </ChartContainer>
      </div>

    </div>
  )
}
