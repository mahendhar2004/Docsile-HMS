/**
 * PharmacyPage — pharmacy module root (page 7/18).
 *
 * Endpoints covered:
 *   - GET/POST /pharmacy/medicines            (pharmacy:view / pharmacy:manage_stock)
 *   - PATCH/DELETE /pharmacy/medicines/{id}   (pharmacy:manage_stock)
 *   - GET/POST /pharmacy/stock               (pharmacy:view / pharmacy:manage_stock)
 *   - GET /pharmacy/stock/summary            (pharmacy:view)
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
import { PageHeader, ErrorState } from "@/components/patterns"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { MedicinesTab } from "./pharmacy/medicines-tab"
import { StockTab } from "./pharmacy/stock-tab"
import { SuppliersTab } from "./pharmacy/suppliers-tab"
import { PurchaseOrdersTab } from "./pharmacy/purchase-orders-tab"
import { BillsTab } from "./pharmacy/bills-tab"

export default function PharmacyPage() {
  const { can } = usePermissions()
  const hasAccess = can("pharmacy:view")

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
        description="Medicine master, stock management, suppliers, purchase orders, and billing."
      />

      <Tabs defaultValue="stock">
        <TabsList>
          <TabsTrigger value="stock">Stock</TabsTrigger>
          <TabsTrigger value="medicines">Medicines</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="purchase-orders">Purchase Orders</TabsTrigger>
          <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
        </TabsList>

        <TabsContent value="stock">
          <StockTab />
        </TabsContent>

        <TabsContent value="medicines">
          <MedicinesTab />
        </TabsContent>

        <TabsContent value="billing">
          <BillsTab />
        </TabsContent>

        <TabsContent value="purchase-orders">
          <PurchaseOrdersTab />
        </TabsContent>

        <TabsContent value="suppliers">
          <SuppliersTab />
        </TabsContent>
      </Tabs>
    </main>
  )
}
