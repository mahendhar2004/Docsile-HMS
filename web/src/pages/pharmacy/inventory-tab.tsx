/**
 * pharmacy/inventory-tab.tsx
 *
 * Combined "Inventory" tab, matching main's single InventoryTab
 * (src/app/(hospital)/pharmacy/components/InventoryTab.tsx) — medicine
 * master CRUD and stock/batch entry stacked as two tables under one tab,
 * rather than two separate top-level tabs. Each section (MedicinesTab,
 * StockTab) is reused as-is — both are fully self-contained (own data
 * fetching, own forms) — just composed together here.
 */

import { MedicinesTab } from "./medicines-tab"
import { StockTab } from "./stock-tab"

export function InventoryTab() {
  return (
    <div className="space-y-8">
      <section aria-label="Medicine master">
        <h2 className="text-sm font-semibold text-[var(--color-foreground)] mb-3">
          Medicines
        </h2>
        <MedicinesTab />
      </section>

      <section aria-label="Stock">
        <h2 className="text-sm font-semibold text-[var(--color-foreground)] mb-3">
          Stock
        </h2>
        <StockTab />
      </section>
    </div>
  )
}
