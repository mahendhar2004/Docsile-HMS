/**
 * InsurancePage — TPA claims, preauth tracking, and settlements, matching
 * main's single-list layout (src/app/(hospital)/insurance/components/
 * InsurancePage.tsx) — no top-level tabs. "Companies" is a modal triggered
 * from the claims toolbar, not a separate tab (see insurance/claims-tab.tsx).
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

import { PageHeader, ErrorState } from "@/components/patterns"
import { usePermissions } from "@/hooks/usePermissions"
import { ClaimsTab } from "./insurance/claims-tab"

export default function InsurancePage() {
  const { can } = usePermissions()
  const hasAccess = can("insurance:view")

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
    <main className="space-y-6">
      <PageHeader
        title="Insurance Claims"
        description="Preauth, billing & settlement"
      />

      <ClaimsTab />
    </main>
  )
}
