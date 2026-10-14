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
import { useMedicines, useStock } from "./hooks"

type View = "stock" | "medicines"

export function InventoryTab() {
  const [view, setView] = useState<View>("stock")

  // Same TanStack Query cache key as StockTab/MedicinesTab's own fetches, so
  // this doesn't trigger extra network requests — just reads the counts for
  // the tab labels, matching main's "Stock (N)"/"All Medicines (N)" labels.
  const { data: stock } = useStock()
  const { data: medicines } = useMedicines()

  const viewOptions: SegmentOption<View>[] = [
    { value: "stock", label: `Stock (${stock?.length ?? 0})` },
    { value: "medicines", label: `All Medicines (${medicines?.length ?? 0})` },
  ]

  return (
    <div className="space-y-4">
      <SegmentedControl
        options={viewOptions}
        value={view}
        onValueChange={setView}
        aria-label="Inventory view"
      />

      {view === "medicines" ? <MedicinesTab /> : <StockTab />}
    </div>
  )
}
