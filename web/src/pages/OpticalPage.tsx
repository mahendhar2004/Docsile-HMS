/**
 * OpticalPage — Optical module, matching main's 3-tab structure
 * (src/app/(hospital)/optical/components/OpticalPage.tsx): Billing,
 * Inventory, Configuration — default Billing. Main's single Inventory tab
 * combines products + stock as two stacked sections (see
 * optical/inventory-tab.tsx).
 *
 * Endpoints:
 *   Products:       GET/POST /optical/products, PATCH/DELETE /optical/products/{id}
 *   Stock:          GET /optical/stock, POST /optical/stock, PATCH /optical/stock/{id}
 *   Stock summary:  GET /optical/stock/summary — header stat badges
 *   Stock search:   GET /optical/stock/search?q=...
 *   Bills:          GET/POST /optical/bills, PATCH /optical/bills/{id}/status
 *   AR reading:     GET /optical/patients/{id}/ar-reading
 *   Settings:       GET/PATCH /optical/settings
 *   Hospital prof.: GET /optical/hospital-profile
 *
 * Permissions (per OpenAPI x-permission):
 *   optical:view    — page gate, all reads
 *   optical:create  — POST /optical/bills
 *   optical:edit    — product CRUD, stock add/update, bill status update
 *   settings:view   — GET /optical/settings
 *   settings:edit   — PATCH /optical/settings
 */

import { PageHeader, StatBadge, ErrorState } from "@/components/patterns"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { usePermissions } from "@/hooks/usePermissions"
import { InventoryTab } from "./optical/inventory-tab"
import { BillsTab } from "./optical/bills-tab"
import { SettingsTab } from "./optical/settings-tab"
import { useStockSummary } from "./optical/hooks"

// ─── OpticalPage ──────────────────────────────────────────────────────────────

export default function OpticalPage() {
  const { can } = usePermissions()

  // All permission checks called unconditionally before any early return.
  const canView = can("optical:view")
  const canCreate = can("optical:create")
  const canEdit = can("optical:edit")
  const canViewSettings = can("settings:view")
  const canEditSettings = can("settings:edit")

  const { data: summary } = useStockSummary(canView)

  // ── Permission gate ────────────────────────────────────────────────────────
  if (!canView) {
    return (
      <main>
        <ErrorState
          title="Access denied"
          description="You need the optical:view permission to access this page. Contact your administrator."
        />
      </main>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <main className="space-y-6">
      <PageHeader
        title="Optical"
        description="Frames, lenses & contact lens"
        toolbar={
          summary ? (
            <>
              <StatBadge value={summary.lowStock} label="Low Stock" variant="destructive" />
              <StatBadge value={summary.totalItems} label="Items in Stock" variant="info" />
            </>
          ) : undefined
        }
      />

      <Tabs defaultValue="billing">
        <TabsList aria-label="Optical sections">
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="configuration">Configuration</TabsTrigger>
        </TabsList>

        <TabsContent value="billing" className="mt-6">
          <BillsTab canCreate={canCreate} canEdit={canEdit} />
        </TabsContent>

        <TabsContent value="inventory" className="mt-6">
          <InventoryTab canEdit={canEdit} />
        </TabsContent>

        <TabsContent value="configuration" className="mt-6">
          <SettingsTab
            canViewSettings={canViewSettings}
            canEditSettings={canEditSettings}
          />
        </TabsContent>
      </Tabs>
    </main>
  )
}
