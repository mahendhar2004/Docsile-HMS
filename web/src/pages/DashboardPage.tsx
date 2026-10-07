/**
 * DashboardPage — landing page with today's metrics and period summaries.
 *
 * Endpoints:
 *   - GET /dashboard/summary      → TodaySummary
 *   - GET /dashboard/quick-stats  → QuickStats
 * Permission: reports:view
 */

import { useQuery } from "@tanstack/react-query"
import {
  Users,
  Activity,
  IndianRupee,
  AlertCircle,
  ClipboardList,
  Clock,
  TrendingUp,
} from "lucide-react"
import {
  PageHeader,
  StatCard,
  ChartContainer,
  ThemedDonutChart,
  ThemedBarChart,
  ErrorState,
} from "@/components/patterns"
import type { DonutChartSlice } from "@/components/patterns"
import { apiClient } from "@/lib/api-client"
import { usePermissions } from "@/hooks/usePermissions"

// ─── Types (mirroring supabase/functions/dashboard/types.ts) ─────────────────

/** Today's summary snapshot. */
interface TodaySummary {
  /** IST calendar date this snapshot covers (YYYY-MM-DD). */
  date: string
  /** Patients with an appointmentDate in today's IST window. */
  newPatientsToday: number
  /** Non-cancelled Prescriptions issued today. */
  totalPrescriptions: number
  /** Aggregate revenue across all billing sources for today. */
  totalRevenue: number
  /** Aggregate collected amounts for today. */
  totalCollected: number
  /** Aggregate outstanding dues for today. */
  totalDues: number
  /** InPatients whose status is not DISCHARGED (across all admission dates). */
  activeInpatients: number
  /**
   * Approximate count of OPD patients today who have not yet had an eye reading.
   * Computed as max(0, newPatientsToday - eyeReadingsToday).
   */
  pendingWorkup: number
}

/** Revenue + collection totals for a calendar period. */
interface PeriodStats {
  totalPatients: number
  totalRevenue: number
  totalCollected: number
}

/** Quick stats for the dashboard header widgets. */
interface QuickStats {
  /** Year-to-date stats (Jan 1 of current year to now). */
  ytd: PeriodStats
  /** Month-to-date stats (1st of current month to now). */
  mtd: PeriodStats
  /** InPatients whose status is not DISCHARGED (across all admission dates). */
  activeInpatients: number
}

// ─── Formatting helpers ───────────────────────────────────────────────────────

function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatCount(n: number): string {
  return new Intl.NumberFormat("en-IN").format(n)
}

// ─── DashboardPage ────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { can } = usePermissions()
  const hasAccess = can("reports:view")

  // All hooks called unconditionally — early return comes after.
  const summaryQuery = useQuery({
    queryKey: ["dashboard", "summary"] as const,
    queryFn: () =>
      apiClient.get<TodaySummary>("/dashboard/summary").then((e) => e.data),
    enabled: hasAccess,
  })

  const quickStatsQuery = useQuery({
    queryKey: ["dashboard", "quick-stats"] as const,
    queryFn: () =>
      apiClient.get<QuickStats>("/dashboard/quick-stats").then((e) => e.data),
    enabled: hasAccess,
  })

  // ── Permission gate ──────────────────────────────────────────────────────────
  if (!hasAccess) {
    return (
      <main>
        <ErrorState
          title="Access denied"
          description="You need the reports:view permission to view the dashboard. Contact your administrator."
        />
      </main>
    )
  }

  // Destructure after all hooks and the permission gate.
  const {
    data: summary,
    isLoading: summaryLoading,
    error: summaryError,
    refetch: refetchSummary,
  } = summaryQuery

  const {
    data: quickStats,
    isLoading: quickStatsLoading,
    error: quickStatsError,
    refetch: refetchQuickStats,
  } = quickStatsQuery

  // ── Derived chart data ───────────────────────────────────────────────────────

  // Donut: today's revenue split into collected vs outstanding dues.
  const revenueDonutData: DonutChartSlice[] = summary
    ? [
        {
          name: "Collected",
          value: summary.totalCollected,
          color: "var(--color-success)",
        },
        {
          name: "Outstanding",
          value: summary.totalDues,
          color: "var(--color-error)",
        },
      ]
    : []

  const revenueDonutIsEmpty =
    !summaryLoading &&
    summary != null &&
    summary.totalCollected === 0 &&
    summary.totalDues === 0

  // Bar chart: month-to-date vs year-to-date patient counts.
  // Typed as Record<string, unknown>[] to match ThemedBarChart's data prop signature.
  const periodBarData: Record<string, unknown>[] = quickStats
    ? [
        { period: "MTD", Patients: quickStats.mtd.totalPatients },
        { period: "YTD", Patients: quickStats.ytd.totalPatients },
      ]
    : []

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <main className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Today's patient activity, revenue snapshot, and period summaries."
      />

      {/* Error states — shown inline so working sections remain visible */}
      {summaryError && !summaryLoading && (
        <ErrorState
          title="Could not load today's summary"
          error={summaryError}
          onRetry={() => void refetchSummary()}
        />
      )}
      {quickStatsError && !quickStatsLoading && (
        <ErrorState
          title="Could not load period stats"
          error={quickStatsError}
          onRetry={() => void refetchQuickStats()}
        />
      )}

      {/* ── Stat tiles ────────────────────────────────────────────────────────── */}
      {!summaryError && (
        <section aria-label="Today's metrics">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            <StatCard
              label="New Patients Today"
              value={summary ? formatCount(summary.newPatientsToday) : "—"}
              icon={<Users size={20} aria-hidden="true" />}
              loading={summaryLoading}
            />
            <StatCard
              label="Active Inpatients"
              value={summary ? formatCount(summary.activeInpatients) : "—"}
              icon={<Activity size={20} aria-hidden="true" />}
              loading={summaryLoading}
            />
            <StatCard
              label="Total Revenue"
              value={summary ? formatINR(summary.totalRevenue) : "—"}
              icon={<IndianRupee size={20} aria-hidden="true" />}
              loading={summaryLoading}
            />
            <StatCard
              label="Amount Collected"
              value={summary ? formatINR(summary.totalCollected) : "—"}
              icon={<TrendingUp size={20} aria-hidden="true" />}
              loading={summaryLoading}
            />
            <StatCard
              label="Outstanding Dues"
              value={summary ? formatINR(summary.totalDues) : "—"}
              icon={<AlertCircle size={20} aria-hidden="true" />}
              loading={summaryLoading}
            />
            <StatCard
              label="Prescriptions Issued"
              value={summary ? formatCount(summary.totalPrescriptions) : "—"}
              icon={<ClipboardList size={20} aria-hidden="true" />}
              loading={summaryLoading}
            />
            <StatCard
              label="Pending Workup"
              value={summary ? formatCount(summary.pendingWorkup) : "—"}
              icon={<Clock size={20} aria-hidden="true" />}
              loading={summaryLoading}
            />
          </div>
        </section>
      )}

      {/* ── Charts ────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/*
         * Revenue breakdown donut — chosen because the data is a two-slice split
         * (collected vs dues) which is the canonical donut use case. A line/area
         * chart would require time-series data that this endpoint does not return.
         */}
        {!summaryError && (
          <ChartContainer
            title="Today's Revenue Breakdown"
            description="Collected vs outstanding dues"
            loading={summaryLoading}
            empty={revenueDonutIsEmpty}
            emptyMessage="No revenue recorded today."
            height={260}
          >
            <ThemedDonutChart data={revenueDonutData} height={260} />
          </ChartContainer>
        )}

        {/*
         * Patient volume bar chart — MTD and YTD are two discrete periods, so
         * a bar chart is the most natural comparison (not a line/area which implies
         * a continuous time axis).
         */}
        {!quickStatsError && (
          <ChartContainer
            title="Patient Volume"
            description="Month-to-date vs year-to-date"
            loading={quickStatsLoading}
            empty={!quickStatsLoading && quickStats == null}
            emptyMessage="No period data available."
            height={260}
          >
            <ThemedBarChart
              data={periodBarData}
              series={[{ dataKey: "Patients", name: "Patients" }]}
              xAxisKey="period"
              height={260}
              yTickFormatter={(v) => formatCount(Number(v))}
            />
          </ChartContainer>
        )}
      </div>
    </main>
  )
}
