/**
 * optical/inventory-tab.tsx
 *
 * Combined "Inventory" tab, matching main's single InventoryTab
 * (src/app/(hospital)/optical/components/InventoryTab.tsx) — frames/
 * lenses/contact-lens products and stock stacked as two sections under
 * one tab, rather than two separate top-level tabs. Each section
 * (ProductsTab, StockTab) is reused as-is, just composed together here.
 */

import { ProductsTab } from "./products-tab"
import { StockTab } from "./stock-tab"

export interface InventoryTabProps {
  canEdit: boolean
}

export function InventoryTab({ canEdit }: InventoryTabProps) {
  return (
    <div className="space-y-8">
      <section aria-label="Products">
        <h2 className="text-sm font-semibold text-[var(--color-foreground)] mb-3">
          Products
        </h2>
        <ProductsTab canEdit={canEdit} />
      </section>

      <section aria-label="Stock">
        <h2 className="text-sm font-semibold text-[var(--color-foreground)] mb-3">
          Stock
        </h2>
        <StockTab canEdit={canEdit} />
      </section>
    </div>
  )
}
