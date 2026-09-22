/**
 * InsurancePage — TPA companies, claim filing, status tracking, payment management.
 *
 * Structure: two-tab layout (Companies | Claims)
 *   Companies tab — insurance company CRUD (insurance:edit gated write actions)
 *   Claims tab — paginated claims list with status filter, claim detail panel, create flow
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

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { PageHeader, ErrorState } from "@/components/patterns"
import { usePermissions } from "@/hooks/usePermissions"
import { CompaniesTab } from "./insurance/companies-tab"
import { ClaimsTab } from "./insurance/claims-tab"

export default function InsurancePage() {
  const { can } = usePermissions()
  const hasAccess = can("insurance:view")

  if (!hasAccess) {
    return (
      <main className="p-6">
        <ErrorState
          title="Access denied"
          description="You need the insurance:view permission to access this page. Contact your administrator."
        />
      </main>
    )
  }

  return (
    <main className="p-6 space-y-6">
      <PageHeader
        title="Insurance"
        description="TPA company management, claim filing, status tracking, and patient payment management."
      />

      <Tabs defaultValue="claims">
        <TabsList>
          <TabsTrigger value="claims">Claims</TabsTrigger>
          <TabsTrigger value="companies">Companies</TabsTrigger>
        </TabsList>

        <TabsContent value="claims" className="mt-4">
          <ClaimsTab />
        </TabsContent>

        <TabsContent value="companies" className="mt-4">
          <CompaniesTab />
        </TabsContent>
      </Tabs>
    </main>
  )
}
