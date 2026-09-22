/**
 * StockForm — Dialog for adding or editing a stock entry.
 * Field names verified against:
 *   - supabase/functions/pharmacy/types.ts PharmacyStockSchema
 *   - src/app/(hospital)/pharmacy/components/InventoryTab.tsx EMPTY_STOCK_FORM + handleAddStock
 */

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SingleSelect } from "@/components/patterns"
import type { PharmacyMedicine, PharmacySupplier, PharmacyStockItem, AddStockBody } from "./types"

interface StockFormProps {
  mode: "add" | "edit"
  stock: PharmacyStockItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
  medicines: PharmacyMedicine[]
  suppliers: PharmacySupplier[]
  onSubmit: (body: AddStockBody) => void
  isPending: boolean
}

interface StockFormState {
  medicineId: string
  batchNumber: string
  /** Number of packs purchased (UI helper — multiplied by packSize to get quantity) */
  packs: number
  /** Units per pack e.g. 10 tablets/strip */
  packSize: number
  mrpPerPack: number
  costPerPack: number
  gstPercent: number
  expiryMonth: string
  supplierId: string
}

const EMPTY_FORM: StockFormState = {
  medicineId: "",
  batchNumber: "",
  packs: 0,
  packSize: 1,
  mrpPerPack: 0,
  costPerPack: 0,
  gstPercent: 12,
  expiryMonth: "",
  supplierId: "",
}

export function StockForm({
  mode,
  stock,
  open,
  onOpenChange,
  medicines,
  suppliers,
  onSubmit,
  isPending,
}: StockFormProps) {
  const [form, setForm] = useState<StockFormState>(EMPTY_FORM)

  useEffect(() => {
    if (mode === "edit" && stock) {
      const expiry = new Date(stock.expiryDate)
      const yyyy = expiry.getFullYear()
      const mm = String(expiry.getMonth() + 1).padStart(2, "0")
      setForm({
        medicineId: stock.medicineId,
        batchNumber: stock.batchNumber,
        packs: 1,
        packSize: stock.unitsPerPack,
        mrpPerPack: stock.mrp * stock.unitsPerPack,
        costPerPack: stock.costPrice * stock.unitsPerPack,
        gstPercent: stock.gstPercent,
        expiryMonth: `${yyyy}-${mm}`,
        supplierId: stock.supplierId ?? "",
      })
    } else {
      setForm(EMPTY_FORM)
    }
  }, [mode, stock, open])

  const set = <K extends keyof StockFormState>(key: K, value: StockFormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const computedTotalUnits = form.packs * form.packSize
  const computedMrpPerUnit = form.packSize > 0 ? form.mrpPerPack / form.packSize : 0
  const computedCostPerUnit = form.packSize > 0 ? form.costPerPack / form.packSize : 0

  const handleSubmit = () => {
    if (!form.medicineId && mode === "add") return
    if (!form.batchNumber || !form.expiryMonth) return
    const totalUnits = mode === "edit" ? (stock?.quantity ?? 0) : computedTotalUnits
    const mrpPerUnit = Math.round(computedMrpPerUnit * 100) / 100
    const costPerUnit = Math.round(computedCostPerUnit * 100) / 100
    onSubmit({
      medicineId: form.medicineId,
      batchNumber: form.batchNumber,
      quantity: totalUnits,
      mrp: mrpPerUnit,
      costPrice: costPerUnit,
      gstPercent: form.gstPercent,
      unitsPerPack: form.packSize,
      expiryDate: form.expiryMonth + "-01",
      supplierId: form.supplierId || undefined,
    })
  }

  const medicineOptions = medicines.map((m) => ({
    value: m.id,
    label: `${m.name}${m.manufacturer ? ` — ${m.manufacturer}` : ""}`,
  }))

  const supplierOptions = suppliers.map((s) => ({ value: s.id, label: s.name }))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "edit"
              ? `Edit Stock — ${stock?.medicine.name ?? ""}`
              : "Add Opening Stock"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Medicine selection — only for add mode */}
          {mode === "add" && (
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">
                Medicine <span className="text-red-500">*</span>
              </Label>
              {medicines.length === 0 ? (
                <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                  No medicines found. Add a medicine first using the Medicines tab.
                </p>
              ) : (
                <SingleSelect
                  value={form.medicineId}
                  onChange={(v) => {
                    const med = medicines.find((m) => m.id === v)
                    set("medicineId", v)
                    if (med) set("gstPercent", med.gstPercent)
                  }}
                  options={medicineOptions}
                  placeholder="Select medicine..."
                  aria-label="Medicine"
                />
              )}
            </div>
          )}

          {/* Batch + Expiry */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">
                Batch Number <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="e.g. B2024-001"
                value={form.batchNumber}
                onChange={(e) => set("batchNumber", e.target.value)}
                aria-label="Batch number"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">
                Expiry Date <span className="text-red-500">*</span>
              </Label>
              <Input
                type="month"
                value={form.expiryMonth}
                onChange={(e) => set("expiryMonth", e.target.value)}
                aria-label="Expiry date"
              />
            </div>
          </div>

          {/* Quantity — only for add mode */}
          {mode === "add" && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">
                  No. of Packs <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="number"
                  placeholder="e.g. 10"
                  value={form.packs || ""}
                  onChange={(e) => set("packs", parseInt(e.target.value) || 0)}
                  aria-label="Number of packs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">
                  Units / Pack <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="number"
                  placeholder="e.g. 10"
                  value={form.packSize || ""}
                  onChange={(e) => set("packSize", parseInt(e.target.value) || 1)}
                  aria-label="Units per pack"
                />
                <p className="text-xs text-muted-foreground">Tablets per strip, ml per bottle, etc.</p>
              </div>
            </div>
          )}

          {mode === "add" && computedTotalUnits > 0 && (
            <div className="rounded-md bg-muted px-4 py-2.5 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Units in Stock</span>
              <span className="text-lg font-bold tabular-nums">{computedTotalUnits}</span>
            </div>
          )}

          {/* Pricing */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">
                {mode === "add" ? "MRP / Pack" : "MRP / Unit"}{" "}
                <span className="text-red-500">*</span>
              </Label>
              <Input
                type="number"
                step="0.01"
                placeholder="100.00"
                value={form.mrpPerPack || ""}
                onChange={(e) => set("mrpPerPack", parseFloat(e.target.value) || 0)}
                aria-label="MRP"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">
                {mode === "add" ? "Cost / Pack" : "Cost / Unit"}
              </Label>
              <Input
                type="number"
                step="0.01"
                placeholder="80.00"
                value={form.costPerPack || ""}
                onChange={(e) => set("costPerPack", parseFloat(e.target.value) || 0)}
                aria-label="Cost"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">GST %</Label>
              <Input
                type="number"
                value={form.gstPercent}
                onChange={(e) => set("gstPercent", parseFloat(e.target.value) || 0)}
                aria-label="GST percentage"
              />
            </div>
          </div>

          {mode === "add" && form.packSize > 0 && form.mrpPerPack > 0 && (
            <p className="text-xs text-muted-foreground">
              Rate/unit:{" "}
              <span className="font-semibold text-foreground">₹{computedMrpPerUnit.toFixed(2)}</span>
              {form.costPerPack > 0 && (
                <>
                  {" "}
                  &middot; Cost/unit:{" "}
                  <span className="font-semibold text-foreground">₹{computedCostPerUnit.toFixed(2)}</span>
                </>
              )}
              {form.costPerPack > 0 && computedMrpPerUnit > 0 && (
                <>
                  {" "}
                  &middot; Margin:{" "}
                  <span className="font-semibold text-green-600">
                    {((1 - computedCostPerUnit / computedMrpPerUnit) * 100).toFixed(1)}%
                  </span>
                </>
              )}
            </p>
          )}

          {/* Supplier */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Supplier</Label>
            {suppliers.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No suppliers added yet (optional).
              </p>
            ) : (
              <SingleSelect
                value={form.supplierId}
                onChange={(v) => set("supplierId", v)}
                options={supplierOptions}
                placeholder="Select supplier (optional)"
                clearable
                aria-label="Supplier"
              />
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Saving..." : mode === "edit" ? "Save Changes" : "Save Stock"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
