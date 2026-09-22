/**
 * billing/daily-summary.tsx
 *
 * Date picker + StatCard tiles showing the day's billing totals.
 * Consumes: GET /billing/daily?date=YYYY-MM-DD
 */

import { IndianRupee, Users, FileText, TrendingUp, AlertCircle, Tag } from "lucide-react"
import { StatCard, DatePicker, ErrorState, PageToolbar } from "@/components/patterns"
import { useDailySummary } from "./hooks"

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── Props ────────────────────────────────────────────────────────────────────

interface DailySummaryProps {
  /** ISO date string (YYYY-MM-DD) currently selected. */
  selectedDate: string
  /** Called when the user picks a different date. */
  onDateChange: (date: string) => void
  /** Whether the user has billing:view permission (should always be true here, but guard anyway). */
  hasAccess: boolean
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DailySummarySection({
  selectedDate,
  onDateChange,
  hasAccess,
}: DailySummaryProps) {
  const { data: summary, isLoading, isError, error, refetch } = useDailySummary(
    selectedDate,
    hasAccess,
  )

  // Convert YYYY-MM-DD string to Date for DatePicker
  const selectedDateObj = new Date(`${selectedDate}T00:00:00`)

  function handleDateChange(date: Date | undefined) {
    if (!date) return
    // Format to YYYY-MM-DD in local time
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    onDateChange(`${year}-${month}-${day}`)
  }

  return (
    <section aria-label="Daily billing summary">
      {/* Date picker toolbar */}
      <PageToolbar className="mb-4">
        <label
          className="text-sm font-medium text-[var(--color-muted-foreground)] shrink-0"
          htmlFor="billing-date-picker"
        >
          Summary for
        </label>
        <div className="w-48">
          <DatePicker
            id="billing-date-picker"
            value={selectedDateObj}
            onChange={handleDateChange}
            toDate={new Date()}
            aria-label="Select billing date"
          />
        </div>
      </PageToolbar>

      {/* Error state */}
      {isError && !isLoading && (
        <ErrorState
          title="Could not load daily summary"
          error={error}
          onRetry={() => void refetch()}
        />
      )}

      {/* Stat tiles */}
      {!isError && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard
            label="Patients Billed"
            value={summary ? formatCount(summary.totalPatients) : "—"}
            icon={<Users size={20} aria-hidden="true" />}
            loading={isLoading}
          />
          <StatCard
            label="Prescriptions"
            value={summary ? formatCount(summary.totalPrescriptions) : "—"}
            icon={<FileText size={20} aria-hidden="true" />}
            loading={isLoading}
          />
          <StatCard
            label="Total Billed"
            value={summary ? formatINR(summary.totalBilled) : "—"}
            icon={<IndianRupee size={20} aria-hidden="true" />}
            loading={isLoading}
          />
          <StatCard
            label="Collected"
            value={summary ? formatINR(summary.totalCollected) : "—"}
            icon={<TrendingUp size={20} aria-hidden="true" />}
            loading={isLoading}
          />
          <StatCard
            label="Outstanding Dues"
            value={summary ? formatINR(summary.totalDues) : "—"}
            icon={<AlertCircle size={20} aria-hidden="true" />}
            loading={isLoading}
          />
          <StatCard
            label="Discount Given"
            value={summary ? formatINR(summary.totalDiscount) : "—"}
            icon={<Tag size={20} aria-hidden="true" />}
            loading={isLoading}
          />
        </div>
      )}
    </section>
  )
}
