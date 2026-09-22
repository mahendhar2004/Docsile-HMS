/**
 * MedicineForm — Dialog for creating/editing a pharmacy medicine.
 * All field names and option lists verified against:
 *   - supabase/functions/pharmacy/types.ts PharmacyMedicineSchema
 *   - src/app/(hospital)/pharmacy/components/InventoryTab.tsx CATEGORIES, unit/schedule options
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
import type { PharmacyMedicine, MedicineFormValues } from "./types"
import {
  MEDICINE_CATEGORIES,
  UNIT_OF_MEASURE_OPTIONS,
  SCHEDULE_TYPE_OPTIONS,
} from "./types"

interface MedicineFormProps {
  medicine: PharmacyMedicine | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: MedicineFormValues) => void
  isPending: boolean
}

const EMPTY_FORM: MedicineFormValues = {
  name: "",
  genericName: "",
  manufacturer: "",
  composition: "",
  category: "",
  dosageForm: "",
  strength: "",
  unitOfMeasure: "Nos",
  hsnCode: "",
  gstPercent: 12,
  scheduleType: "",
}

export function MedicineForm({
  medicine,
  open,
  onOpenChange,
  onSubmit,
  isPending,
}: MedicineFormProps) {
  const [form, setForm] = useState<MedicineFormValues>(EMPTY_FORM)

  useEffect(() => {
    if (medicine) {
      setForm({
        name: medicine.name,
        genericName: medicine.genericName ?? "",
        manufacturer: medicine.manufacturer ?? "",
        composition: medicine.composition ?? "",
        category: medicine.category ?? "",
        dosageForm: medicine.dosageForm ?? "",
        strength: medicine.strength ?? "",
        unitOfMeasure: medicine.unitOfMeasure,
        hsnCode: medicine.hsnCode ?? "",
        gstPercent: medicine.gstPercent,
        scheduleType: medicine.scheduleType ?? "",
      })
    } else {
      setForm(EMPTY_FORM)
    }
  }, [medicine, open])

  const set = <K extends keyof MedicineFormValues>(key: K, value: MedicineFormValues[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const handleSubmit = () => {
    if (!form.name.trim()) return
    onSubmit(form)
  }

  const categoryOptions = MEDICINE_CATEGORIES.map((c) => ({ value: c, label: c }))
  const unitOptions = UNIT_OF_MEASURE_OPTIONS.map((u) => ({ value: u, label: u }))
  const scheduleOptions = SCHEDULE_TYPE_OPTIONS.map((s) => ({ value: s, label: s }))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>
            {medicine ? "Edit Medicine" : "Add Medicine to Master List"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label className="text-xs">Medicine Name *</Label>
            <Input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. Paracetamol 500mg"
              aria-label="Medicine name"
              aria-required="true"
            />
          </div>
          <div>
            <Label className="text-xs">Generic Name</Label>
            <Input
              value={form.genericName}
              onChange={(e) => set("genericName", e.target.value)}
              placeholder="e.g. Paracetamol"
              aria-label="Generic name"
            />
          </div>
          <div>
            <Label className="text-xs">Manufacturer</Label>
            <Input
              value={form.manufacturer}
              onChange={(e) => set("manufacturer", e.target.value)}
              placeholder="e.g. Sun Pharma"
              aria-label="Manufacturer"
            />
          </div>
          <div className="col-span-2">
            <Label className="text-xs">Composition</Label>
            <Input
              value={form.composition}
              onChange={(e) => set("composition", e.target.value)}
              placeholder="Active ingredients"
              aria-label="Composition"
            />
          </div>
          <div>
            <Label className="text-xs">Category</Label>
            <SingleSelect
              value={form.category}
              onChange={(v) => set("category", v)}
              options={categoryOptions}
              placeholder="Select category"
              clearable
              aria-label="Category"
            />
          </div>
          <div>
            <Label className="text-xs">Dosage Form</Label>
            <Input
              value={form.dosageForm}
              onChange={(e) => set("dosageForm", e.target.value)}
              placeholder="e.g. Tablet, Syrup"
              aria-label="Dosage form"
            />
          </div>
          <div>
            <Label className="text-xs">Strength</Label>
            <Input
              value={form.strength}
              onChange={(e) => set("strength", e.target.value)}
              placeholder="e.g. 500mg, 5ml"
              aria-label="Strength"
            />
          </div>
          <div>
            <Label className="text-xs">Unit of Measure</Label>
            <SingleSelect
              value={form.unitOfMeasure}
              onChange={(v) => set("unitOfMeasure", v || "Nos")}
              options={unitOptions}
              placeholder="Select unit"
              aria-label="Unit of measure"
            />
          </div>
          <div>
            <Label className="text-xs">HSN Code</Label>
            <Input
              value={form.hsnCode}
              onChange={(e) => set("hsnCode", e.target.value)}
              placeholder="e.g. 3004"
              aria-label="HSN code"
            />
          </div>
          <div>
            <Label className="text-xs">GST %</Label>
            <Input
              type="number"
              value={form.gstPercent}
              onChange={(e) => set("gstPercent", parseFloat(e.target.value) || 0)}
              min={0}
              max={28}
              aria-label="GST percentage"
            />
          </div>
          <div>
            <Label className="text-xs">Schedule</Label>
            <SingleSelect
              value={form.scheduleType}
              onChange={(v) => set("scheduleType", v)}
              options={scheduleOptions}
              placeholder="Select schedule"
              clearable
              aria-label="Schedule type"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending || !form.name.trim()}>
            {isPending ? "Saving..." : medicine ? "Save Changes" : "Add Medicine"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
