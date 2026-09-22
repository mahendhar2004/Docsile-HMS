/**
 * call-logs/analytics-tab.tsx
 *
 * Analytics view for the call logs module.
 *
 * Data sources:
 *   GET /call-logs/stats     → today's call counts (CallStats)
 *   GET /call-logs/analytics → aggregated analytics for selected period (CallAnalyticsData)
 *
 * Analytics response shape verified against:
 *   - supabase/functions/call-logs/service.ts getAnalytics()
 *   - src/app/(hospital)/call-logs/actions.ts CallAnalyticsData
 *
 * Chart selection rationale:
 *   - Daily trend (dailyTrend): ThemedAreaChart — time-series with answered/missed series.
 *     Canonical area chart use case: continuous data with stacked/overlaid comparison.
 *   - Direction split (inbound vs outbound): ThemedDonutChart — two-slice proportional breakdown.
 *   - Duration histogram (durationBuckets): ThemedBarChart — discrete labeled buckets.
 *
 * Stats tiles come from /call-logs/stats (always today).
 * Charts + hourly/daily data come from /call-logs/analytics (filtered by period).
 */

import {
  Phone,
  PhoneIncoming,
  PhoneMissed,
  Timer,
  Link2,
  Clock,
  Flame,
  Moon,
  Users,
} from "lucide-react"
import {
  StatCard,
  ChartContainer,
  ThemedAreaChart,
  ThemedDonutChart,
  ThemedBarChart,
  EmptyState,
  ErrorState,
  SegmentedControl,
} from "@/components/patterns"
import type { DonutChartSlice } from "@/components/patterns"
import { Skeleton } from "@/components/ui/skeleton"
import { useCallStats, useCallAnalytics } from "./hooks"
import type { AnalyticsFilter, TopCaller } from "./types"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(seconds: number): string {
  if (seconds === 0) return "0s"
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

function formatHour(h: number): string {
  if (h === 0) return "12 AM"
  if (h === 12) return "12 PM"
  return h < 12 ? `${h} AM` : `${h - 12} PM`
}

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "")
  if (digits.length === 10) return `${digits.slice(0, 5)} ${digits.slice(5)}`
  return phone
}

// ─── Filter options ───────────────────────────────────────────────────────────

const FILTER_OPTIONS = [
  { value: "today" as AnalyticsFilter, label: "Today" },
  { value: "week" as AnalyticsFilter, label: "7 Days" },
  { value: "month" as AnalyticsFilter, label: "30 Days" },
  { value: "year" as AnalyticsFilter, label: "Year" },
]

// ─── Props ────────────────────────────────────────────────────────────────────

interface AnalyticsTabProps {
  canView: boolean
  filter: AnalyticsFilter
  onFilterChange: (f: AnalyticsFilter) => void
}

// ─── Top Callers Table ────────────────────────────────────────────────────────

function TopCallersTable({ callers }: { callers: TopCaller[] }) {
  if (callers.length === 0) return null

  return (
    <div className="rounded-lg border border-border bg-surface overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground">Top Callers</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Most frequent contacts in this period
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm" role="table">
          <thead>
            <tr className="bg-muted/30">
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                #
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Contact
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Total
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Answered
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Talk Time
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {callers.map((caller, i) => (
              <tr key={caller.phone} className="hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center justify-center h-6 w-6 rounded-full text-xs font-bold ${
                      i === 0
                        ? "bg-amber-100 text-amber-700"
                        : i === 1
                          ? "bg-gray-100 text-gray-600"
                          : i === 2
                            ? "bg-orange-50 text-orange-600"
                            : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {i + 1}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div>
                    <p className="font-semibold text-foreground text-xs">
                      {caller.name ?? "Unknown"}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatPhone(caller.phone)}</p>
                  </div>
                </td>
                <td className="px-4 py-3 text-right font-bold text-foreground">
                  {caller.calls}
                </td>
                <td className="px-4 py-3 text-right text-green-600 font-semibold">
                  {caller.answered}
                </td>
                <td className="px-4 py-3 text-right text-xs text-muted-foreground font-medium">
                  {formatDuration(caller.totalDuration)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── AnalyticsTab ─────────────────────────────────────────────────────────────

export function AnalyticsTab({ canView, filter, onFilterChange }: AnalyticsTabProps) {
  // Stats: always today's data regardless of analytics filter
  const statsQuery = useCallStats(canView)
  // Analytics: filtered by period
  const analyticsQuery = useCallAnalytics(filter, canView)

  const stats = statsQuery.data
  const analytics = analyticsQuery.data

  // ── Derived chart data ─────────────────────────────────────────────────────

  // Direction donut: inbound vs outbound two-slice split
  const directionDonutData: DonutChartSlice[] = analytics
    ? [
        { name: "Inbound", value: analytics.inboundCalls, color: "var(--chart-1, #3b82f6)" },
        { name: "Outbound", value: analytics.outboundCalls, color: "var(--chart-2, #f97316)" },
      ].filter((d) => d.value > 0)
    : []

  // Daily trend area chart: answered and missed series over time
  const dailyTrendData = (analytics?.dailyTrend ?? []).map((d) => ({
    date: d.date,
    Answered: d.answered,
    Missed: d.missed,
  }))

  // Duration histogram bar chart
  const durationData: Record<string, unknown>[] = (analytics?.durationBuckets ?? []).map(
    (b) => ({ label: b.label, Calls: b.count }),
  )

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* ── Filter selector ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Analytics Period</h2>
        <SegmentedControl
          options={FILTER_OPTIONS}
          value={filter}
          onValueChange={(v) => onFilterChange(v as AnalyticsFilter)}
          aria-label="Analytics time period"
        />
      </div>

      {/* ── Today's stats tiles (always from /call-logs/stats) ──────────────── */}
      <section aria-label="Today's call statistics">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Today at a Glance
        </h3>
        {statsQuery.isError && (
          <ErrorState
            title="Could not load stats"
            error={statsQuery.error}
            onRetry={() => void statsQuery.refetch()}
          />
        )}
        {!statsQuery.isError && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <StatCard
              label="Total Calls"
              value={stats ? String(stats.total) : "—"}
              icon={<Phone size={18} aria-hidden="true" />}
              loading={statsQuery.isLoading}
            />
            <StatCard
              label="Answered"
              value={stats ? String(stats.completed) : "—"}
              icon={<Phone size={18} aria-hidden="true" />}
              loading={statsQuery.isLoading}
            />
            <StatCard
              label="Missed"
              value={stats ? String(stats.missed) : "—"}
              icon={<PhoneMissed size={18} aria-hidden="true" />}
              loading={statsQuery.isLoading}
            />
            <StatCard
              label="Inbound"
              value={stats ? String(stats.inbound) : "—"}
              icon={<PhoneIncoming size={18} aria-hidden="true" />}
              loading={statsQuery.isLoading}
            />
            <StatCard
              label="Avg Duration"
              value={stats ? formatDuration(stats.avgDuration) : "—"}
              icon={<Timer size={18} aria-hidden="true" />}
              loading={statsQuery.isLoading}
            />
          </div>
        )}
      </section>

      {/* ── Analytics charts (filtered by period) ───────────────────────────── */}
      <section aria-label={`Analytics for selected period`}>
        {analyticsQuery.isError && (
          <ErrorState
            title="Could not load analytics"
            error={analyticsQuery.error}
            onRetry={() => void analyticsQuery.refetch()}
          />
        )}

        {analyticsQuery.isLoading && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-72 w-full rounded-lg" />
            <Skeleton className="h-72 w-full rounded-lg" />
          </div>
        )}

        {!analyticsQuery.isLoading && !analyticsQuery.isError && analytics != null && (
          <>
            {/* ── Period KPI summary ──────────────────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
              <StatCard
                label="Total Calls"
                value={String(analytics.totalCalls)}
                icon={<Phone size={18} aria-hidden="true" />}
              />
              <StatCard
                label="Answered"
                value={`${analytics.answeredCalls} (${analytics.answerRate}%)`}
                icon={<Phone size={18} aria-hidden="true" />}
              />
              <StatCard
                label="Missed"
                value={`${analytics.missedCalls} (${analytics.missedRate}%)`}
                icon={<PhoneMissed size={18} aria-hidden="true" />}
              />
              <StatCard
                label="Linked to Patient"
                value={String(analytics.linkedCalls)}
                icon={<Link2 size={18} aria-hidden="true" />}
              />
              <StatCard
                label="Avg Duration"
                value={formatDuration(analytics.avgDuration)}
                icon={<Timer size={18} aria-hidden="true" />}
              />
            </div>

            {/* ── Daily trend + Direction split ────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              {/*
               * Daily trend area chart — chosen because dailyTrend is a continuous
               * time-series with two overlapping series (answered vs missed). Area
               * charts are the canonical choice for magnitude comparison over time.
               * Only shown when there are at least 2 data points (a line needs two points).
               */}
              <ChartContainer
                title="Daily Call Volume"
                description="Answered vs missed over the period"
                loading={analyticsQuery.isLoading}
                empty={dailyTrendData.length < 2}
                emptyMessage="Not enough days in range to show a trend. Select a wider period."
                height={260}
                className="lg:col-span-2"
              >
                <ThemedAreaChart
                  data={dailyTrendData}
                  series={[
                    { dataKey: "Answered", name: "Answered", color: "#10b981" },
                    { dataKey: "Missed", name: "Missed", color: "#ef4444" },
                  ]}
                  xAxisKey="date"
                  xTickFormatter={(v) => {
                    try {
                      const d = new Date(v as string)
                      return `${d.getDate()}/${d.getMonth() + 1}`
                    } catch {
                      return String(v)
                    }
                  }}
                  height={260}
                />
              </ChartContainer>

              {/*
               * Direction donut — chosen because inbound vs outbound is a two-slice
               * proportional split. Canonical donut chart use case.
               */}
              <ChartContainer
                title="Call Direction"
                description="Inbound vs outbound split"
                loading={analyticsQuery.isLoading}
                empty={directionDonutData.length === 0}
                emptyMessage="No calls recorded for this period."
                height={260}
              >
                <ThemedDonutChart data={directionDonutData} height={260} />
              </ChartContainer>
            </div>

            {/* ── Duration histogram + Quick insights ─────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              {/*
               * Duration distribution bar chart — chosen because duration buckets
               * are discrete labeled categories (not a time series). Bar chart is
               * the correct primitive for comparing discrete categorical counts.
               */}
              <ChartContainer
                title="Call Duration Distribution"
                description="How long answered calls last"
                loading={analyticsQuery.isLoading}
                empty={analytics.answeredCalls === 0}
                emptyMessage="No answered calls to show duration distribution."
                height={240}
                className="lg:col-span-2"
              >
                <ThemedBarChart
                  data={durationData}
                  series={[{ dataKey: "Calls", name: "Calls" }]}
                  xAxisKey="label"
                  height={240}
                />
              </ChartContainer>

              {/* Quick insights */}
              <div className="rounded-lg border border-border bg-surface p-5">
                <h3 className="text-sm font-semibold text-foreground mb-1">Quick Insights</h3>
                <p className="text-xs text-muted-foreground mb-4">Key performance indicators</p>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50/80 border border-amber-100/60">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-lg bg-amber-100 flex items-center justify-center">
                        <Flame className="h-4 w-4 text-amber-600" aria-hidden="true" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-foreground">Peak Hour</p>
                        <p className="text-xs text-muted-foreground">Busiest time</p>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-amber-700">
                      {formatHour(analytics.peakHour)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-indigo-50/80 border border-indigo-100/60">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                        <Moon className="h-4 w-4 text-indigo-600" aria-hidden="true" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-foreground">Quiet Hour</p>
                        <p className="text-xs text-muted-foreground">Least active</p>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-indigo-700">
                      {formatHour(analytics.quietHour)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50/80 border border-emerald-100/60">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                        <Clock className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-foreground">Total Talk Time</p>
                        <p className="text-xs text-muted-foreground">Answered calls</p>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-emerald-700">
                      {formatDuration(analytics.totalTalkTime)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50/80 border border-blue-100/60">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
                        <Users className="h-4 w-4 text-blue-600" aria-hidden="true" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-foreground">Unique Callers</p>
                        <p className="text-xs text-muted-foreground">Distinct numbers</p>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-blue-700">
                      {analytics.topCallers.length}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Top callers table ────────────────────────────────────────── */}
            <TopCallersTable callers={analytics.topCallers} />
          </>
        )}

        {/* Empty state when analytics loaded but no calls */}
        {!analyticsQuery.isLoading &&
          !analyticsQuery.isError &&
          analytics != null &&
          analytics.totalCalls === 0 && (
            <EmptyState
              title="No calls in this period"
              description="No call data recorded for the selected time range. Use Sync to pull calls from Exotel."
            />
          )}
      </section>
    </div>
  )
}
