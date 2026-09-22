/**
 * optical/stock-tab.tsx
 *
 * Stock view/adjust + summary:
 *   - GET /optical/stock         (optical:view)
 *   - GET /optical/stock/summary (optical:view)
 *   - POST /optical/stock        (optical:edit)
 *   - PATCH /optical/stock/{id}  (optical:edit)
 */

import { useState, useEffect } from "react"
import { Plus, Package, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  DataTable,
  EmptyState,
  ErrorState,
  FormSection,
  FormField,
  NumberInput,
  CurrencyInput,
  StatCard,
  SingleSelect,
} from "@/components/patterns"
import type { ColumnDef } from "@/components/patterns"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import {
  useOpticalStock,
  useStockSummary,
  useOpticalProducts,
  useAddStock,
  useUpdateStock,
} from "./hooks"
import type { OpticalStockEntry, CreateOpticalStockBody, UpdateOpticalStockBody } from "./types"

// ─── Add Stock Form ────────────────────────────────────────────────────────────

interface AddStockFormState {
  productId: string
  batchNumber: string
  quantity: string
  mrp: string
  costPrice: string
  gstPercent: string
  power: string
}

const EMPTY_ADD_FORM: AddStockFormState = {
  productId: "",
  batchNumber: "",
  quantity: "1",
  mrp: "",
  costPrice: "",
  gstPercent: "12",
  power: "",
}

interface AddStockDialogProps {
  open: boolean
  onClose: () => void
  isPending: boolean
  onSubmit: (body: CreateOpticalStockBody) => void
  products: { id: string; name: string; brand: string | null; category: string }[]
}

function AddStockDialog({
  open,
  onClose,
  isPending,
  onSubmit,
  products,
}: AddStockDialogProps) {
  const [form, setForm] = useState<AddStockFormState>({ ...EMPTY_ADD_FORM })

  function set<K extends keyof AddStockFormState>(
    key: K,
    value: AddStockFormState[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.productId || !form.mrp) return
    onSubmit({
      productId: form.productId,
      batchNumber: form.batchNumber.trim() || null,
      quantity: parseInt(form.quantity) || 1,
      mrp: parseFloat(form.mrp) || 0,
      costPrice: parseFloat(form.costPrice) || 0,
      gstPercent: parseFloat(form.gstPercent) || 12,
      power: form.power.trim() || null,
    })
  }

  const productOptions = products.map((p) => ({
    value: p.id,
    label: `${p.brand ? `${p.brand} ` : ""}${p.name} (${p.category})`,
  }))

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { onClose(); setForm({ ...EMPTY_ADD_FORM }) } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Stock</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <FormSection title="">
            <FormField label="Product" required>
              <SingleSelect
                options={productOptions}
                value={form.productId}
                onChange={(v) => set("productId", v ?? "")}
                placeholder="Select product"
                aria-label="Product"
              />
            </FormField>

            <FormField label="Batch Number">
              <Input
                value={form.batchNumber}
                onChange={(e) => set("batchNumber", e.target.value)}
                placeholder="e.g. BATCH-001"
                aria-label="Batch number"
              />
            </FormField>

            <FormField label="Power / Prescription">
              <Input
                value={form.power}
                onChange={(e) => set("power", e.target.value)}
                placeholder="e.g. -1.00"
                aria-label="Power"
              />
            </FormField>

            <FormField label="Quantity" required>
              <NumberInput
                value={parseInt(form.quantity) || 1}
                onChange={(e) => set("quantity", e.target.value)}
                min={1}
                aria-label="Quantity"
              />
            </FormField>

            <FormField label="MRP" required>
              <CurrencyInput
                value={parseFloat(form.mrp) || 0}
                onChange={(v) => set("mrp", String(v))}
                aria-label="MRP"
              />
            </FormField>

            <FormField label="Cost Price">
              <CurrencyInput
                value={parseFloat(form.costPrice) || 0}
                onChange={(v) => set("costPrice", String(v))}
                aria-label="Cost price"
              />
            </FormField>

            <FormField label="GST %">
              <NumberInput
                value={parseFloat(form.gstPercent) || 12}
                onChange={(e) => set("gstPercent", e.target.value)}
                min={0}
                max={100}
                step={0.5}
                aria-label="GST percentage"
              />
            </FormField>
          </FormSection>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => { onClose(); setForm({ ...EMPTY_ADD_FORM }) }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending || !form.productId || !form.mrp}
            >
              {isPending ? "Saving…" : "Add Stock"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Edit Stock Dialog ─────────────────────────────────────────────────────────

interface EditStockDialogProps {
  open: boolean
  onClose: () => void
  stock: OpticalStockEntry | null
  isPending: boolean
  onSubmit: (body: UpdateOpticalStockBody) => void
}

function EditStockDialog({ open, onClose, stock, isPending, onSubmit }: EditStockDialogProps) {
  const [qty, setQty] = useState<number>(stock?.quantity ?? 0)
  const [mrp, setMrp] = useState<number>(stock?.mrp ?? 0)
  const [costPrice, setCostPrice] = useState<number>(stock?.costPrice ?? 0)

  // Sync when stock changes (when dialog opens with different item)
  useEffect(() => {
    if (stock) {
      setQty(stock.quantity)
      setMrp(stock.mrp)
      setCostPrice(stock.costPrice)
    }
  }, [stock])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSubmit({ quantity: qty, mrp, costPrice })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit Stock</DialogTitle>
        </DialogHeader>
        {stock && (
          <div className="mb-3">
            <p className="font-medium text-sm">
              {stock.product.brand ? `${stock.product.brand} ` : ""}
              {stock.product.name}
            </p>
            <p className="text-xs text-muted-foreground">
              {stock.product.category}
              {stock.batchNumber && ` · ${stock.batchNumber}`}
              {stock.power && ` · ${stock.power}`}
            </p>
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Quantity">
            <NumberInput
              value={qty}
              onChange={(e) => setQty(parseFloat(e.target.value) || 0)}
              min={0}
              aria-label="Quantity"
            />
          </FormField>
          <FormField label="MRP">
            <CurrencyInput
              value={mrp}
              onChange={(v) => setMrp(v ?? 0)}
              aria-label="MRP"
            />
          </FormField>
          <FormField label="Cost Price">
            <CurrencyInput
              value={costPrice}
              onChange={(v) => setCostPrice(v ?? 0)}
              aria-label="Cost price"
            />
          </FormField>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : "Update"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── StockTab ─────────────────────────────────────────────────────────────────

interface StockTabProps {
  canEdit: boolean
}

export function StockTab({ canEdit }: StockTabProps) {
  const { data: stock, isLoading, isError, error, refetch } = useOpticalStock()
  const { data: summary } = useStockSummary()
  const { data: products } = useOpticalProducts(canEdit)

  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<OpticalStockEntry | null>(null)

  const addMutation = useAddStock(() => setShowAdd(false))
  const updateMutation = useUpdateStock(
    editing?.id ?? "",
    () => setEditing(null),
  )

  const columns: ColumnDef<OpticalStockEntry>[] = [
    {
      key: "product",
      header: "Product",
      cell: (s) => (
        <div>
          <p className="font-medium text-foreground text-sm">
            {s.product.brand ? `${s.product.brand} ` : ""}
            {s.product.name}
          </p>
          {s.product.modelNumber && (
            <p className="text-xs text-muted-foreground font-mono">
              {s.product.modelNumber}
            </p>
          )}
        </div>
      ),
    },
    {
      key: "productId",
      header: "Category",
      cell: (s) => (
        <Badge variant="secondary" className="font-normal text-xs">
          {s.product.category}
        </Badge>
      ),
    },
    {
      key: "batchNumber",
      header: "Batch",
      cell: (s) => (
        <span className="text-sm font-mono">{s.batchNumber ?? "—"}</span>
      ),
    },
    {
      key: "power",
      header: "Power",
      cell: (s) => <span className="text-sm">{s.power ?? "—"}</span>,
    },
    {
      key: "quantity",
      header: "Qty",
      cell: (s) => (
        <span
          className={`text-sm font-semibold tabular-nums ${s.quantity <= 5 ? "text-destructive" : ""}`}
        >
          {s.quantity}
        </span>
      ),
    },
    {
      key: "mrp",
      header: "MRP",
      cell: (s) => (
        <span className="text-sm tabular-nums">
          ₹{s.mrp.toLocaleString("en-IN")}
        </span>
      ),
    },
    {
      key: "gstPercent",
      header: "GST %",
      cell: (s) => <span className="text-sm tabular-nums">{s.gstPercent}%</span>,
    },
    ...(canEdit
      ? [
          {
            key: "id",
            header: "",
            cell: (s: OpticalStockEntry) => (
              <Button
                variant="ghost"
                size="sm"
                aria-label={`Edit stock for ${s.product.name}`}
                onClick={() => setEditing(s)}
              >
                Edit
              </Button>
            ),
          } satisfies ColumnDef<OpticalStockEntry>,
        ]
      : []),
  ]

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-20 rounded-lg" />
          <Skeleton className="h-20 rounded-lg" />
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded" />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <ErrorState
        title="Could not load stock"
        error={error}
        onRetry={() => void refetch()}
      />
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary tiles */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            label="Total SKUs"
            value={String(summary.totalItems)}
            icon={<Package size={18} aria-hidden="true" />}
          />
          <StatCard
            label="Low Stock"
            value={String(summary.lowStock)}
            icon={<AlertTriangle size={18} aria-hidden="true" />}
          />
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {stock?.length ?? 0} stock entries
        </p>
        {canEdit && (
          <Button size="sm" onClick={() => setShowAdd(true)}>
            <Plus className="h-4 w-4 mr-1.5" aria-hidden="true" />
            Add Stock
          </Button>
        )}
      </div>

      {stock && stock.length === 0 ? (
        <EmptyState
          title="No stock entries"
          description="Add stock to start tracking inventory."
          action={
            canEdit
              ? { label: "Add Stock", onClick: () => setShowAdd(true) }
              : undefined
          }
        />
      ) : (
        <DataTable
          columns={columns}
          data={stock ?? []}
          aria-label="Optical stock table"
        />
      )}

      {/* Add stock dialog */}
      <AddStockDialog
        open={showAdd}
        onClose={() => setShowAdd(false)}
        isPending={addMutation.isPending}
        onSubmit={(body) => addMutation.mutate(body)}
        products={products ?? []}
      />

      {/* Edit stock dialog */}
      <EditStockDialog
        open={editing != null}
        onClose={() => setEditing(null)}
        stock={editing}
        isPending={updateMutation.isPending}
        onSubmit={(body) => updateMutation.mutate(body)}
      />
    </div>
  )
}
