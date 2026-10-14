/**
 * optical/inventory-tab.tsx
 *
 * Combined "Inventory" tab, matching main's single InventoryTab
 * (src/app/(hospital)/optical/components/InventoryTab.tsx) — an internal
 * Stock/Products toggle showing one table at a time (default Stock), not
 * both stacked (corrected during the placement audit — stacking both was
 * a structural mismatch, not just a styling one). Each section
 * (ProductsTab, StockTab) is reused as-is, just composed together here.
 *
 * Main's "Products" sub-tab button shows a live count, e.g. "Products (12)"
 * — its "Stock" button deliberately has no count. Reusing `useOpticalProducts`'s
 * own query here (same cache key as ProductsTab/StockTab's own fetch) costs
 * no extra network request, just reads the already-cached length.
 */

import { useState } from "react"
import { SegmentedControl, type SegmentOption } from "@/components/patterns"
import { ProductsTab } from "./products-tab"
import { StockTab } from "./stock-tab"
import { useOpticalProducts } from "./hooks"

type View = "stock" | "products"

export interface InventoryTabProps {
  canEdit: boolean
}

export function InventoryTab({ canEdit }: InventoryTabProps) {
  const [view, setView] = useState<View>("stock")
  const { data: products } = useOpticalProducts()

  const viewOptions: SegmentOption<View>[] = [
    { value: "stock", label: "Stock" },
    { value: "products", label: `Products (${products?.length ?? 0})` },
  ]

  return (
    <div className="space-y-4">
      <SegmentedControl
        options={viewOptions}
        value={view}
        onValueChange={setView}
        aria-label="Inventory view"
      />

      {view === "stock" ? <StockTab canEdit={canEdit} /> : <ProductsTab canEdit={canEdit} />}
    </div>
  )
}
