/**
 * OpticalPage — Optical module: product CRUD, stock management, bills, and settings.
 *
 * Endpoints:
 *   Products:       GET/POST /optical/products, PATCH/DELETE /optical/products/{id}
 *   Stock:          GET /optical/stock, POST /optical/stock, PATCH /optical/stock/{id}
 *   Stock summary:  GET /optical/stock/summary
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

import { PageHeader, ErrorState } from "@/components/patterns"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { usePermissions } from "@/hooks/usePermissions"
import { ProductsTab } from "./optical/products-tab"
import { StockTab } from "./optical/stock-tab"
import { BillsTab } from "./optical/bills-tab"
import { SettingsTab } from "./optical/settings-tab"

// ─── OpticalPage ──────────────────────────────────────────────────────────────

export default function OpticalPage() {
  const { can } = usePermissions()

  // All permission checks called unconditionally before any early return.
  const canView = can("optical:view")
  const canCreate = can("optical:create")
  const canEdit = can("optical:edit")
  const canViewSettings = can("settings:view")
  const canEditSettings = can("settings:edit")

  // ── Permission gate ────────────────────────────────────────────────────────
  if (!canView) {
    return (
      <main className="p-6">
        <ErrorState
          title="Access denied"
          description="You need the optical:view permission to access this page. Contact your administrator."
        />
      </main>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <main className="p-6 space-y-6">
      <PageHeader
        title="Optical"
        description="Manage optical products, stock, bills, and settings."
      />

      <Tabs defaultValue="products">
        <TabsList aria-label="Optical sections">
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="stock">Stock</TabsTrigger>
          <TabsTrigger value="bills">Bills</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="mt-6">
          <ProductsTab canEdit={canEdit} />
        </TabsContent>

        <TabsContent value="stock" className="mt-6">
          <StockTab canEdit={canEdit} />
        </TabsContent>

        <TabsContent value="bills" className="mt-6">
          <BillsTab canCreate={canCreate} canEdit={canEdit} />
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <SettingsTab
            canViewSettings={canViewSettings}
            canEditSettings={canEditSettings}
          />
        </TabsContent>
      </Tabs>
    </main>
  )
}
