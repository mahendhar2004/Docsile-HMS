/**
 * analytics/patients-tab.tsx
 *
 * Patients tab — mirrors old app's PatientsTab.tsx.
 * Endpoints: time-series, gender-distribution, referral-stats, common-diagnoses, common-medicines
 *
 * Charts used (matching old app):
 *   - Daily patient volume → ThemedAreaChart (old app: recharts AreaChart)
 *   - Referral sources → ThemedDonutChart (old app: PieChart donut)
 *   - Gender distribution → ThemedDonutChart (old app: PieChart donut)
 *   - Most common diagnoses → ThemedDonutChart (old app: PieChart donut)
 *   - Most common medicines → ThemedDonutChart (old app: PieChart donut)
 */

import {
  Users,
  UserPlus,
  BedDouble,
  Activity,
  Scissors,
} from "lucide-react"
import {
  StatCard,
  ChartContainer,
  ThemedAreaChart,
  ThemedDonutChart,
  ErrorState,
} from "@/components/patterns"
import type { DonutChartSlice } from "@/components/patterns"
import {
  useTimeSeries,
  useGenderDistribution,
  useReferralStats,
  useCommonDiagnoses,
  useCommonMedicines,
  useAnalyticsOverview,
} from "./hooks"
import type { TimeFilter } from "./types"

// ─── Colors ───────────────────────────────────────────────────────────────────

const INDIGO = ["#4f46e5", "#6366f1", "#818cf8", "#a5b4fc", "#c7d2fe", "#e0e7ff", "#ddd6fe"]

// ─── Formatters ───────────────────────────────────────────────────────────────

const fmtCount = (n: number) => new Intl.NumberFormat("en-IN").format(n)

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  filter: TimeFilter
  customStart?: string
  customEnd?: string
}

// ─── PatientsTab ──────────────────────────────────────────────────────────────

export function PatientsTab({ filter, customStart, customEnd }: Props) {
  const overviewQ   = useAnalyticsOverview(filter, customStart, customEnd)
  const timeSeriesQ = useTimeSeries(filter, customStart, customEnd)
  const genderQ     = useGenderDistribution(filter, customStart, customEnd)
  const referralQ   = useReferralStats(filter, customStart, customEnd)
  const diagnosesQ  = useCommonDiagnoses(filter, customStart, customEnd)
  const medicinesQ  = useCommonMedicines(filter, customStart, customEnd)

  const overview    = overviewQ.data
  const timeSeries  = timeSeriesQ.data ?? []
  const gender      = genderQ.data
  const referrals   = referralQ.data ?? []
  const diagnoses   = diagnosesQ.data ?? []
  const medicines   = medicinesQ.data ?? []

  if (overviewQ.error && !overviewQ.isLoading) {
    return (
      <ErrorState
        title="Could not load patient data"
        error={overviewQ.error}
        onRetry={() => void overviewQ.refetch()}
      />
    )
  }

  // Derived data
  const genderTotal = (gender?.male ?? 0) + (gender?.female ?? 0) + (gender?.other ?? 0)

  const genderSlices: DonutChartSlice[] = gender && genderTotal > 0
    ? [
        { name: "Male",   value: gender.male,   color: "#4f46e5" },
        { name: "Female", value: gender.female, color: "#a5b4fc" },
        { name: "Other",  value: gender.other,  color: "#e0e7ff" },
      ].filter((s) => s.value > 0)
    : []

  const referralTotal = referrals.reduce((s, r) => s + r.count, 0)
  const referralSlices: DonutChartSlice[] = referrals.slice(0, 5).map((r, i) => ({
    name: r.name,
    value: r.count,
    color: INDIGO[i % INDIGO.length],
  }))

  const diagnosisSlices: DonutChartSlice[] = diagnoses.map((d, i) => ({
    name: d.diagnosis,
    value: d.count,
    color: INDIGO[i % INDIGO.length],
  }))

  const medicineSlices: DonutChartSlice[] = medicines.map((m, i) => ({
    name: m.name,
    value: m.count,
    color: INDIGO[i % INDIGO.length],
  }))

  // Time series data for ThemedAreaChart
  const areaData = timeSeries.map((p) => ({
    date: p.date,
    Patients: p.patients,
  }))

  return (
    <div className="space-y-5">

      {/* ROW 1 — 5 KPI stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard
          label="Total Patients"
          value={overview ? fmtCount(overview.totalPatients) : "—"}
          icon={<Users size={20} aria-hidden="true" />}
          loading={overviewQ.isLoading}
          trend={
            overview && overview.patientChange !== 0
              ? {
                  direction: overview.patientChange >= 0 ? "up" : "down",
                  delta: `${overview.patientChange > 0 ? "+" : ""}${overview.patientChange}%`,
                  label: "vs last period",
                }
              : undefined
          }
          // Main shows "vs last period" inline with the change % when a trend
          // exists, and as a standalone line only when there's no change —
          // never both at once. The trend's own `label` already covers the
          // first case.
          subtitle={!overview || overview.patientChange === 0 ? "vs last period" : undefined}
        />
        <StatCard
          label="New Today"
          value={overview ? fmtCount(overview.newPatientsToday) : "—"}
          icon={<UserPlus size={20} aria-hidden="true" />}
          loading={overviewQ.isLoading}
          subtitle="Registered today"
        />
        <StatCard
          label="Active Inpatients"
          value={overview ? fmtCount(overview.activeInpatients) : "—"}
          icon={<BedDouble size={20} aria-hidden="true" />}
          loading={overviewQ.isLoading}
          subtitle="Currently admitted"
        />
        <StatCard
          label="Avg / Day"
          value={overview ? fmtCount(overview.avgDailyPatients) : "—"}
          icon={<Activity size={20} aria-hidden="true" />}
          loading={overviewQ.isLoading}
          subtitle="Patients per day"
        />
        <StatCard
          label="Surgeries"
          value={overview ? fmtCount(overview.totalSurgeries) : "—"}
          icon={<Scissors size={20} aria-hidden="true" />}
          loading={overviewQ.isLoading}
          subtitle="This period"
        />
      </div>

      {/* ROW 2 — Daily Patient Volume area chart */}
      <ChartContainer
        title="Daily Patient Volume"
        description="Number of patients registered per day"
        loading={timeSeriesQ.isLoading}
        empty={!timeSeriesQ.isLoading && timeSeries.length === 0}
        emptyMessage="No patient volume data for this period."
        height={220}
      >
        <ThemedAreaChart
          data={areaData}
          series={[{ dataKey: "Patients", name: "Patients", color: "#6366f1" }]}
          xAxisKey="date"
          xTickFormatter={(v) => String(v).slice(5)}
          height={220}
          fillOpacity={0.12}
        />
      </ChartContainer>

      {/* ROW 3 — Referral Sources + Gender Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        <ChartContainer
          title="Top Referral Sources"
          description="Where patients come from"
          loading={referralQ.isLoading}
          empty={!referralQ.isLoading && referralSlices.length === 0}
          emptyMessage="No referral data for this period."
          height={220}
        >
          <ThemedDonutChart
            data={referralSlices}
            totalLabel={referralTotal > 0 ? "Referrals" : undefined}
            totalValue={referralTotal > 0 ? fmtCount(referralTotal) : undefined}
            height={220}
          />
        </ChartContainer>

        <ChartContainer
          title="Gender Distribution"
          description="Patient demographics"
          loading={genderQ.isLoading}
          empty={!genderQ.isLoading && genderSlices.length === 0}
          emptyMessage="No gender data for this period."
          height={220}
        >
          <ThemedDonutChart
            data={genderSlices}
            totalLabel={genderTotal > 0 ? "Patients" : undefined}
            totalValue={genderTotal > 0 ? fmtCount(genderTotal) : undefined}
            height={220}
          />
        </ChartContainer>
      </div>

      {/* ROW 4 — Most Common Diagnoses + Most Common Medicines */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        <ChartContainer
          title="Most Common Eye Conditions"
          description="From doctor's diagnosis in prescriptions"
          loading={diagnosesQ.isLoading}
          empty={!diagnosesQ.isLoading && diagnosisSlices.length === 0}
          emptyMessage="No diagnosis data for this period."
          height={220}
        >
          <ThemedDonutChart
            data={diagnosisSlices}
            height={220}
          />
        </ChartContainer>

        <ChartContainer
          title="Most Common Medicines Prescribed"
          description="From invoice items in prescriptions"
          loading={medicinesQ.isLoading}
          empty={!medicinesQ.isLoading && medicineSlices.length === 0}
          emptyMessage="No medicines data for this period."
          height={220}
        >
          <ThemedDonutChart
            data={medicineSlices}
            height={220}
          />
        </ChartContainer>
      </div>

    </div>
  )
}
