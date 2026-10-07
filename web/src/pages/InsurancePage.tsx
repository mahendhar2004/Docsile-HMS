/**
 * InsurancePage — TPA claims, preauth tracking, and settlements, matching
 * main's single-list layout (src/app/(hospital)/insurance/components/
 * InsurancePage.tsx) — no top-level tabs. "Companies" is a modal triggered
 * from the claims toolbar, not a separate tab (see insurance/claims-tab.tsx).
 * Stat-count hooks live here (not in ClaimsTab) so the StatBadges can sit
 * in PageHeader's own row, matching main's placement exactly — main
 * renders them in the sticky header itself, not inside the filter bar.
 *
 * Endpoints consumed:
 *   GET  /insurance/companies               — insurance:view
 *   GET  /insurance/companies?paginated=false — insurance:view (dropdown)
 *   POST /insurance/companies               — insurance:edit
 *   PATCH /insurance/companies/{id}         — insurance:edit
 *   DELETE /insurance/companies/{id}        — insurance:edit
 *   GET  /insurance/claims                  — insurance:view
 *   POST /insurance/claims                  — insurance:create
 *   GET  /insurance/claims/{id}             — insurance:view
 *   PATCH /insurance/claims/{id}/status     — insurance:edit (full field set)
 *   PATCH /insurance/claims/{id}/details    — insurance:edit
 *   POST /insurance/claims/{id}/payments    — insurance:edit
 *   GET  /insurance/inpatients/search       — insurance:view
 *
 * Permission gate: insurance:view — renders access-denied ErrorState if absent.
 */

import { PageHeader, StatBadge, ErrorState } from "@/components/patterns"
import { usePermissions } from "@/hooks/usePermissions"
import { useInsuranceClaims } from "./insurance/hooks"
import { ClaimsTab } from "./insurance/claims-tab"

export default function InsurancePage() {
  const { can } = usePermissions()
  const hasAccess = can("insurance:view")

  // Matches main's getInsuranceClaims() stats exactly: "Active" = all claims
  // except CLOSED, "Preauth Pending" = PREAUTH_SUBMITTED + PREAUTH_QUERY,
  // "Awaiting Settlement" = FINAL_BILL_SUBMITTED only. GET /insurance/claims
  // only filters by one status at a time, so these are a few lightweight
  // calls to the same hook reading only `.total`, not a full client-side
  // fetch (claims aren't bounded to "today" the way other modules' queues are).
  const grandTotalQuery = useInsuranceClaims("")
  const closedQuery = useInsuranceClaims("CLOSED")
  const preauthSubmittedQuery = useInsuranceClaims("PREAUTH_SUBMITTED")
  const preauthQueryQuery = useInsuranceClaims("PREAUTH_QUERY")
  const finalBillQuery = useInsuranceClaims("FINAL_BILL_SUBMITTED")

  const activeCount = grandTotalQuery.total - closedQuery.total
  const preauthPendingCount = preauthSubmittedQuery.total + preauthQueryQuery.total
  const awaitingSettlementCount = finalBillQuery.total

  if (!hasAccess) {
    return (
      <main>
        <ErrorState
          title="Access denied"
          description="You need the insurance:view permission to access this page. Contact your administrator."
        />
      </main>
    )
  }

  return (
    <main className="space-y-5">
      <PageHeader
        title="Insurance Claims"
        description="Preauth, billing & settlement"
        onRefresh={() => {
          void grandTotalQuery.refetch()
          void closedQuery.refetch()
          void preauthSubmittedQuery.refetch()
          void preauthQueryQuery.refetch()
          void finalBillQuery.refetch()
        }}
        actions={
          <>
            <StatBadge value={activeCount} label="Active" variant="info" />
            <StatBadge value={preauthPendingCount} label="Preauth Pending" variant="warning" />
            <StatBadge value={awaitingSettlementCount} label="Awaiting Settlement" variant="success" />
          </>
        }
      />

      <ClaimsTab />
    </main>
  )
}
