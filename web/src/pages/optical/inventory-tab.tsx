/**
 * optical/inventory-tab.tsx
 *
 * Combined "Inventory" tab, matching main's single InventoryTab
 * (src/app/(hospital)/optical/components/InventoryTab.tsx) — an internal
 * Stock/Products toggle showing one table at a time (default Stock), not
 * both stacked (corrected during the placement audit — stacking both was
 * a structural mismatch, not just a styling one). Each section
 * (ProductsTab, StockTab) is reused as-is, just composed together here.
 */

import { useState } from "react"
import { SegmentedControl, type SegmentOption } from "@/components/patterns"
import { ProductsTab } from "./products-tab"
import { StockTab } from "./stock-tab"

type View = "stock" | "products"

const VIEW_OPTIONS: SegmentOption<View>[] = [
  { value: "stock", label: "Stock" },
  { value: "products", label: "Products" },
]

export interface InventoryTabProps {
  canEdit: boolean
}

export function InventoryTab({ canEdit }: InventoryTabProps) {
  const [view, setView] = useState<View>("stock")

  return (
    <div className="space-y-4">
      <SegmentedControl
        options={VIEW_OPTIONS}
        value={view}
        onValueChange={setView}
        aria-label="Inventory view"
      />

      {view === "stock" ? <StockTab canEdit={canEdit} /> : <ProductsTab canEdit={canEdit} />}
    </div>
  )
}
