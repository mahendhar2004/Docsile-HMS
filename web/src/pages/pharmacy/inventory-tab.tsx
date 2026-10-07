/**
 * pharmacy/inventory-tab.tsx
 *
 * Combined "Inventory" tab, matching main's single InventoryTab
 * (src/app/(hospital)/pharmacy/components/InventoryTab.tsx) — an internal
 * Medicines/Stock toggle showing one table at a time, not both stacked
 * (corrected during the placement audit — stacking both was a structural
 * mismatch, not just a styling one). Each section (MedicinesTab, StockTab)
 * is reused as-is — both are fully self-contained (own data fetching, own
 * forms) — just composed together here.
 */

import { useState } from "react"
import { SegmentedControl, type SegmentOption } from "@/components/patterns"
import { MedicinesTab } from "./medicines-tab"
import { StockTab } from "./stock-tab"

type View = "stock" | "medicines"

const VIEW_OPTIONS: SegmentOption<View>[] = [
  { value: "stock", label: "Stock" },
  { value: "medicines", label: "Medicines" },
]

export function InventoryTab() {
  const [view, setView] = useState<View>("stock")

  return (
    <div className="space-y-4">
      <SegmentedControl
        options={VIEW_OPTIONS}
        value={view}
        onValueChange={setView}
        aria-label="Inventory view"
      />

      {view === "medicines" ? <MedicinesTab /> : <StockTab />}
    </div>
  )
}
