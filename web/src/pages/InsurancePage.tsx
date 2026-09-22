/**
 * InsurancePage — placeholder.
 *
 * Phase 7 TODO: Implement insurance module UI:
 * - Insurance companies CRUD (/insurance/companies)
 * - Insurance claims list (GET /insurance/claims)
 * - Create claim (POST /insurance/claims)
 * - Claim detail (GET /insurance/claims/{id})
 * - Update claim status / details (PATCH)
 * - Add insurance payment (POST /insurance/claims/{id}/payments)
 * - Search inpatients for insurance (GET /insurance/inpatients/search)
 * Permissions: insurance:view, insurance:create, insurance:edit
 */
export default function InsurancePage() {
  return (
    <main className="p-6">
      <h1 className="text-xl font-semibold text-foreground">Insurance</h1>
      <p className="text-sm text-muted-foreground mt-1">
        Phase 7 TODO: TPA companies, claim filing, status tracking, and payment management.
      </p>
    </main>
  )
}
