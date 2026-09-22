/**
 * optical/product-form.tsx
 *
 * Reusable Dialog form for creating and editing optical products.
 * Verified field list and enum values against:
 *   src/app/(hospital)/optical/components/InventoryTab.tsx
 */

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  FormSection,
  FormField,
  TextInput,
  NumberInput,
  SingleSelect,
} from "@/components/patterns"
import type { OpticalProduct, CreateOpticalProductBody } from "./types"
import {
  OPTICAL_CATEGORY_OPTIONS,
  FRAME_TYPES,
  FRAME_MATERIALS,
  LENS_TYPES,
  LENS_MATERIALS,
  LENS_COATINGS,
  LENS_INDICES,
  CL_TYPES,
} from "./types"

// ─── Form state type ──────────────────────────────────────────────────────────

interface ProductFormState {
  name: string
  brand: string
  category: string
  type: string
  material: string
  color: string
  size: string
  coating: string
  index: string
  modelNumber: string
  hsnCode: string
  gstPercent: string
}

const EMPTY_FORM: ProductFormState = {
  name: "",
  brand: "",
  category: "Frame",
  type: "",
  material: "",
  color: "",
  size: "",
  coating: "",
  index: "",
  modelNumber: "",
  hsnCode: "",
  gstPercent: "12",
}

function productToForm(p: OpticalProduct): ProductFormState {
  return {
    name: p.name,
    brand: p.brand ?? "",
    category: p.category,
    type: p.type ?? "",
    material: p.material ?? "",
    color: p.color ?? "",
    size: p.size ?? "",
    coating: p.coating ?? "",
    index: p.index ?? "",
    modelNumber: p.modelNumber ?? "",
    hsnCode: p.hsnCode ?? "",
    gstPercent: String(p.gstPercent ?? 12),
  }
}

function formToBody(f: ProductFormState): CreateOpticalProductBody {
  return {
    name: f.name.trim(),
    brand: f.brand.trim() || null,
    category: f.category,
    type: f.type || null,
    material: f.material || null,
    color: f.color.trim() || null,
    size: f.size.trim() || null,
    coating: f.coating || null,
    index: f.index || null,
    modelNumber: f.modelNumber.trim() || null,
    hsnCode: f.hsnCode.trim() || null,
    gstPercent: parseFloat(f.gstPercent) || 12,
  }
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface ProductFormProps {
  open: boolean
  onClose: () => void
  /** Present when editing an existing product; absent for create. */
  product?: OpticalProduct
  /** Called with the serialized body — caller handles the mutation. */
  onSubmit: (body: CreateOpticalProductBody) => void
  isPending: boolean
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ProductForm({
  open,
  onClose,
  product,
  onSubmit,
  isPending,
}: ProductFormProps) {
  const isEditing = product != null
  const [form, setForm] = useState<ProductFormState>(
    product ? productToForm(product) : EMPTY_FORM,
  )

  // Reset form when dialog opens (either blank or with product data)
  useEffect(() => {
    if (open) {
      setForm(product ? productToForm(product) : { ...EMPTY_FORM })
    }
  }, [open, product])

  function set<K extends keyof ProductFormState>(
    key: K,
    value: ProductFormState[K],
  ) {
    setForm((prev) => {
      const next = { ...prev, [key]: value }
      // Reset category-dependent fields when category changes
      if (key === "category") {
        next.type = ""
        next.material = ""
        next.coating = ""
        next.index = ""
      }
      return next
    })
  }

  // Category-dependent option lists
  const typeOptions =
    form.category === "Frame"
      ? FRAME_TYPES.map((t) => ({ value: t, label: t }))
      : form.category === "Lens"
        ? LENS_TYPES.map((t) => ({ value: t, label: t }))
        : form.category === "Contact Lens"
          ? CL_TYPES.map((t) => ({ value: t, label: t }))
          : []

  const materialOptions =
    form.category === "Frame"
      ? FRAME_MATERIALS.map((m) => ({ value: m, label: m }))
      : form.category === "Lens"
        ? LENS_MATERIALS.map((m) => ({ value: m, label: m }))
        : []

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    onSubmit(formToBody(form))
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Product" : "Add Product"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-2">
          <FormSection title="Product Details">
            <FormField label="Product Name" required>
              <TextInput
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="e.g. Ray-Ban Wayfarer"
                aria-label="Product name"
              />
            </FormField>

            <FormField label="Brand">
              <TextInput
                value={form.brand}
                onChange={(e) => set("brand", e.target.value)}
                placeholder="e.g. Ray-Ban"
                aria-label="Brand"
              />
            </FormField>

            <FormField label="Category" required>
              <SingleSelect
                options={OPTICAL_CATEGORY_OPTIONS}
                value={form.category}
                onChange={(v) => set("category", v ?? "")}
                placeholder="Select category"
                aria-label="Category"
              />
            </FormField>

            {typeOptions.length > 0 && (
              <FormField label="Type">
                <SingleSelect
                  options={typeOptions}
                  value={form.type}
                  onChange={(v) => set("type", v ?? "")}
                  placeholder="Select type"
                  aria-label="Type"
                />
              </FormField>
            )}

            {materialOptions.length > 0 && (
              <FormField label="Material">
                <SingleSelect
                  options={materialOptions}
                  value={form.material}
                  onChange={(v) => set("material", v ?? "")}
                  placeholder="Select material"
                  aria-label="Material"
                />
              </FormField>
            )}

            {form.category === "Lens" && (
              <>
                <FormField label="Coating">
                  <SingleSelect
                    options={LENS_COATINGS.map((c) => ({ value: c, label: c }))}
                    value={form.coating}
                    onChange={(v) => set("coating", v ?? "")}
                    placeholder="Select coating"
                    aria-label="Lens coating"
                  />
                </FormField>

                <FormField label="Index">
                  <SingleSelect
                    options={LENS_INDICES.map((i) => ({ value: i, label: i }))}
                    value={form.index}
                    onChange={(v) => set("index", v ?? "")}
                    placeholder="Select index"
                    aria-label="Lens index"
                  />
                </FormField>
              </>
            )}
          </FormSection>

          <Separator />

          <FormSection title="Additional Details">
            <FormField label="Color">
              <TextInput
                value={form.color}
                onChange={(e) => set("color", e.target.value)}
                placeholder={form.category === "Frame" ? "e.g. Black" : ""}
                aria-label="Color"
              />
            </FormField>

            <FormField label="Size">
              <TextInput
                value={form.size}
                onChange={(e) => set("size", e.target.value)}
                placeholder={
                  form.category === "Frame" ? "e.g. 52-18-140" : ""
                }
                aria-label="Size"
              />
            </FormField>

            <FormField label="Model Number">
              <TextInput
                value={form.modelNumber}
                onChange={(e) => set("modelNumber", e.target.value)}
                placeholder="e.g. RB2132"
                aria-label="Model number"
              />
            </FormField>

            <FormField label="HSN Code">
              <TextInput
                value={form.hsnCode}
                onChange={(e) => set("hsnCode", e.target.value)}
                placeholder="e.g. 90041000"
                aria-label="HSN code"
              />
            </FormField>

            <FormField label="GST %">
              <NumberInput
                value={parseFloat(form.gstPercent) || 0}
                onChange={(e) => set("gstPercent", e.target.value)}
                min={0}
                max={100}
                step={0.5}
                aria-label="GST percentage"
              />
            </FormField>
          </FormSection>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || !form.name.trim()}>
              {isPending ? "Saving…" : isEditing ? "Update Product" : "Add Product"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
