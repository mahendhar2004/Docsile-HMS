/**
 * BillingPage — daily billing summary, prescription billing, and payment management.
 *
 * Endpoints:
 *   - GET /billing/daily                            → DailySummary (plain useQuery — bounded single-day snapshot)
 *   - GET /billing/prescriptions                    → BillingPrescription[] (offset-paginated)
 *   - GET /billing/prescriptions/{id}               → PrescriptionDetailData
 *   - POST /billing/prescriptions/{id}/payments     → RecordPaymentBody
 *   - DELETE /billing/prescriptions/{id}/payments/{payId}
 *
 * Permissions:
 *   - billing:view   (page gate + all reads)
 *   - billing:create (record payment)
 *   - billing:delete (void payment — admin only)
 */

import { useState } from "react"
import { PageHeader, ErrorState } from "@/components/patterns"
import { usePermissions } from "@/hooks/usePermissions"
import { DailySummarySection } from "./billing/daily-summary"
import { PrescriptionsTable } from "./billing/prescriptions-table"

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Return today's date as YYYY-MM-DD (local time). */
function todayLocalISO(): string {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

// ─── BillingPage ──────────────────────────────────────────────────────────────

export default function BillingPage() {
  const { can } = usePermissions()

  // Permission checks — called unconditionally before any early return
  const canView = can("billing:view")
  const canCreate = can("billing:create")
  const canDelete = can("billing:delete")

  // Date state shared between the daily summary tiles and the prescriptions list.
  // Both sections filter to the same IST calendar date.
  const [selectedDate, setSelectedDate] = useState<string>(todayLocalISO)

  // ── Permission gate ────────────────────────────────────────────────────────
  if (!canView) {
    return (
      <main className="p-6">
        <ErrorState
          title="Access denied"
          description="You need the billing:view permission to access this page. Contact your administrator."
        />
      </main>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <main className="p-6 space-y-8">
      <PageHeader
        title="Billing"
        description="Daily billing summary, prescription charges, and payment management."
      />

      {/* ── Daily billing summary ──────────────────────────────────────────── */}
      <DailySummarySection
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        hasAccess={canView}
      />

      {/* ── Prescriptions list ─────────────────────────────────────────────── */}
      <section aria-label="Prescriptions">
        <h2 className="text-base font-semibold text-[var(--color-foreground)] mb-4">
          Prescriptions
        </h2>
        <PrescriptionsTable
          date={selectedDate}
          canCreate={canCreate}
          canDelete={canDelete}
        />
      </section>
    </main>
  )
}
