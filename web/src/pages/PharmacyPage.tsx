/**
 * PharmacyPage — pharmacy module root (page 7/18), matching main's 4-tab
 * structure (src/app/(hospital)/pharmacy/components/PharmacyPage.tsx):
 * Billing, Inventory, Suppliers, Purchase Orders — default Billing.
 * Main's single "Inventory" tab combines medicine master + stock/batch
 * entry as two stacked tables (see pharmacy/inventory-tab.tsx).
 *
 * Endpoints covered:
 *   - GET/POST /pharmacy/medicines            (pharmacy:view / pharmacy:manage_stock)
 *   - PATCH/DELETE /pharmacy/medicines/{id}   (pharmacy:manage_stock)
 *   - GET/POST /pharmacy/stock               (pharmacy:view / pharmacy:manage_stock)
 *   - GET /pharmacy/stock/summary            (pharmacy:view) — header stat badges
 *   - GET /pharmacy/stock/search             (pharmacy:view)
 *   - PATCH /pharmacy/stock/{id}             (pharmacy:manage_stock)
 *   - GET/POST /pharmacy/suppliers           (pharmacy:view / pharmacy:manage_stock)
 *   - PATCH/DELETE /pharmacy/suppliers/{id}  (pharmacy:manage_stock)
 *   - GET/POST /pharmacy/purchase-orders     (pharmacy:purchase_orders)
 *   - POST /pharmacy/purchase-orders/{id}/receive (pharmacy:purchase_orders)
 *   - PATCH /pharmacy/purchase-orders/{id}/status (pharmacy:purchase_orders)
 *   - GET/POST /pharmacy/bills               (pharmacy:view / pharmacy:create)
 *   - GET /pharmacy/pending-medicines        (pharmacy:view)
 *   - GET /pharmacy/patients/{id}/prescription (pharmacy:view)
 *
 * Permission gate: pharmacy:view (minimum to enter the module)
 */

import { usePermissions } from "@/hooks/usePermissions"
import { PageHeader, StatBadge, ErrorState } from "@/components/patterns"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { InventoryTab } from "./pharmacy/inventory-tab"
import { SuppliersTab } from "./pharmacy/suppliers-tab"
import { PurchaseOrdersTab } from "./pharmacy/purchase-orders-tab"
import { BillsTab } from "./pharmacy/bills-tab"
import { useStockSummary } from "./pharmacy/hooks"

export default function PharmacyPage() {
  const { can } = usePermissions()
  const hasAccess = can("pharmacy:view")

  const { data: summary, refetch: refetchSummary } = useStockSummary(hasAccess)

  if (!hasAccess) {
    return (
      <main>
        <ErrorState
          title="Access denied"
          description="You need the pharmacy:view permission to access the pharmacy module. Contact your administrator."
        />
      </main>
    )
  }

  return (
    <main className="space-y-6">
      <PageHeader
        title="Pharmacy"
        description="Billing, inventory & suppliers"
        onRefresh={refetchSummary}
        actions={
          summary ? (
            <>
              {summary.lowStock > 0 && (
                <StatBadge value={summary.lowStock} label="Low Stock" variant="destructive" />
              )}
              {summary.nearExpiry > 0 && (
                <StatBadge value={summary.nearExpiry} label="Near Expiry" variant="warning" />
              )}
              <StatBadge value={summary.totalItems} label="Items in Stock" variant="info" />
            </>
          ) : undefined
        }
      />

      <Tabs defaultValue="billing">
        <TabsList>
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
          <TabsTrigger value="purchase-orders">Purchase Orders</TabsTrigger>
        </TabsList>

        <TabsContent value="billing">
          <BillsTab />
        </TabsContent>

        <TabsContent value="inventory">
          <InventoryTab />
        </TabsContent>

        <TabsContent value="suppliers">
          <SuppliersTab />
        </TabsContent>

        <TabsContent value="purchase-orders">
          <PurchaseOrdersTab />
        </TabsContent>
      </Tabs>
    </main>
  )
}
