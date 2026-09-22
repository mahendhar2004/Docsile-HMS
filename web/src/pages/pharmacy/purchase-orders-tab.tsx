/**
 * PurchaseOrdersTab — purchase orders list, create, and receive flow.
 * Permissions: all actions = pharmacy:purchase_orders
 *
 * PO status enum values verified against:
 *   - supabase/functions/pharmacy/types.ts UpdatePOStatusSchema (line 106):
 *     DRAFT, ORDERED, RECEIVED, PARTIALLY_RECEIVED, CANCELLED
 *   - src/app/(hospital)/pharmacy/components/PurchaseOrdersTab.tsx STATUS_COLORS (lines 58-64)
 */

import { useState } from "react"
import { Plus, Package, ChevronDown, ChevronUp, Check } from "lucide-react"
import { toast } from "sonner"
import { EmptyState, ErrorState, FormSection, FormField, SingleSelect } from "@/components/patterns"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { usePermissions } from "@/hooks/usePermissions"
import {
  usePurchaseOrders,
  useCreatePurchaseOrder,
  useReceivePurchaseOrder,
  useUpdatePOStatus,
  useMedicines,
  useSuppliers,
} from "./hooks"
import type {
  PurchaseOrder,
  PurchaseOrderItem,
  CreatePurchaseOrderBody,
  ReceivePurchaseOrderBody,
} from "./types"

// Status colors — verified against PurchaseOrdersTab.tsx STATUS_COLORS (lines 58-64)
const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  ORDERED: "bg-blue-100 text-blue-700",
  PARTIALLY_RECEIVED: "bg-amber-100 text-amber-700",
  RECEIVED: "bg-emerald-100 text-emerald-700",
  CANCELLED: "bg-red-100 text-red-700",
}

const STATUS_FILTER_OPTIONS = [
  { value: "", label: "All" },
  { value: "ORDERED", label: "Ordered" },
  { value: "PARTIALLY_RECEIVED", label: "Partially Received" },
  { value: "RECEIVED", label: "Received" },
  { value: "CANCELLED", label: "Cancelled" },
]

type POItemForm = {
  medicineId: string
  medicineName: string
  batchNumber: string
  quantity: number
  costPrice: number
  mrp: number
  gstPercent: number
  expiryDate: string
}

const PAYMENT_MODE_OPTIONS = [
  { value: "CASH", label: "Cash" },
  { value: "CARD", label: "Card" },
  { value: "UPI", label: "UPI" },
  { value: "CREDIT", label: "Credit" },
  { value: "NEFT", label: "NEFT" },
  { value: "CHEQUE", label: "Cheque" },
]

function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount)
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

export function PurchaseOrdersTab() {
  const { can } = usePermissions()
  const canPO = can("pharmacy:purchase_orders")

  const [statusFilter, setStatusFilter] = useState("")
  const { data: orders, isLoading, error, refetch } = usePurchaseOrders(statusFilter || undefined, canPO)
  const { data: medicines } = useMedicines(canPO)
  const { data: suppliers } = useSuppliers(canPO)
  const createPO = useCreatePurchaseOrder()
  const receivePO = useReceivePurchaseOrder()
  const updateStatus = useUpdatePOStatus()

  const [expandedPO, setExpandedPO] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [showReceive, setShowReceive] = useState(false)
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null)

  // Create PO form state
  const [poHeader, setPOHeader] = useState({
    supplierId: "",
    expectedDate: "",
    invoiceNumber: "",
    invoiceDate: "",
    notes: "",
    discount: 0,
    paymentMode: "",
    amountPaid: 0,
  })
  const [poItems, setPOItems] = useState<POItemForm[]>([])

  // Receive items form state
  const [receiveItems, setReceiveItems] = useState<{
    itemId: string
    medicineName: string
    orderedQty: number
    receivedQty: number
    newReceivedQty: number
    batchNumber: string
    expiryDate: string
    mrp: number
    costPrice: number
  }[]>([])

  // PO totals
  const poSubtotal = poItems.reduce((s, it) => s + it.quantity * it.costPrice, 0)
  const poGst = poItems.reduce((s, it) => s + (it.quantity * it.costPrice * it.gstPercent) / 100, 0)
  const poTotal = poSubtotal + poGst - poHeader.discount

  const supplierOptions = (suppliers ?? []).map((s) => ({ value: s.id, label: s.name }))
  const medicineOptions = (medicines ?? []).map((m) => ({ value: m.id, label: m.name }))

  const addPOItem = () => {
    setPOItems([
      ...poItems,
      { medicineId: "", medicineName: "", batchNumber: "", quantity: 0, costPrice: 0, mrp: 0, gstPercent: 12, expiryDate: "" },
    ])
  }

  const updatePOItem = (idx: number, updates: Partial<POItemForm>) => {
    const items = [...poItems]
    items[idx] = { ...items[idx], ...updates }
    setPOItems(items)
  }

  const removePOItem = (idx: number) => {
    setPOItems(poItems.filter((_, i) => i !== idx))
  }

  const handleCreatePO = () => {
    if (!poHeader.supplierId) return toast.error("Select a supplier")
    if (poItems.length === 0) return toast.error("Add at least one item")
    if (poItems.some((it) => !it.medicineId || it.quantity <= 0)) {
      return toast.error("All items must have medicine and quantity")
    }
    const body: CreatePurchaseOrderBody = {
      order: {
        supplierId: poHeader.supplierId,
        expectedDate: poHeader.expectedDate || undefined,
        invoiceNumber: poHeader.invoiceNumber || undefined,
        invoiceDate: poHeader.invoiceDate || undefined,
        notes: poHeader.notes || undefined,
        discount: poHeader.discount,
        paymentMode: poHeader.paymentMode || undefined,
        amountPaid: poHeader.amountPaid,
      },
      items: poItems.map((it) => ({
        medicineId: it.medicineId,
        batchNumber: it.batchNumber || undefined,
        quantity: it.quantity,
        costPrice: it.costPrice,
        mrp: it.mrp,
        gstPercent: it.gstPercent,
        expiryDate: it.expiryDate || undefined,
      })),
    }
    createPO.mutate(body, {
      onSuccess: (data) => {
        toast.success(`Purchase Order ${(data as { orderNumber: string }).orderNumber} created`)
        setShowCreate(false)
        setPOItems([])
        setPOHeader({ supplierId: "", expectedDate: "", invoiceNumber: "", invoiceDate: "", notes: "", discount: 0, paymentMode: "", amountPaid: 0 })
      },
      onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to create PO"),
    })
  }

  const openReceive = (po: PurchaseOrder) => {
    setSelectedPO(po)
    setReceiveItems(
      po.items.map((item: PurchaseOrderItem) => ({
        itemId: item.id,
        medicineName: item.medicine.name,
        orderedQty: item.quantity,
        receivedQty: item.receivedQty,
        newReceivedQty: item.quantity - item.receivedQty,
        batchNumber: item.batchNumber ?? "",
        expiryDate: item.expiryDate
          ? new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date(item.expiryDate))
          : "",
        mrp: item.mrp,
        costPrice: item.costPrice,
      })),
    )
    setShowReceive(true)
  }

  const handleReceive = () => {
    if (!selectedPO) return
    const toReceive = receiveItems
      .filter((it) => it.newReceivedQty > 0)
      .map((it) => ({
        itemId: it.itemId,
        receivedQty: it.newReceivedQty,
        batchNumber: it.batchNumber,
        expiryDate: it.expiryDate,
        mrp: it.mrp,
        costPrice: it.costPrice,
      }))
    if (toReceive.length === 0) return toast.error("No items to receive")
    if (toReceive.some((it) => !it.batchNumber || !it.expiryDate)) {
      return toast.error("All items need batch number and expiry date")
    }
    const body: ReceivePurchaseOrderBody = { receivedItems: toReceive }
    receivePO.mutate(
      { id: selectedPO.id, body },
      {
        onSuccess: () => {
          toast.success("Items received and added to stock")
          setShowReceive(false)
          setSelectedPO(null)
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to receive items"),
      },
    )
  }

  const handleCancelPO = (poId: string) => {
    updateStatus.mutate(
      { id: poId, status: "CANCELLED" },
      {
        onSuccess: () => toast.success("PO cancelled"),
        onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to cancel PO"),
      },
    )
  }

  if (!canPO) {
    return (
      <div className="p-8 text-center text-muted-foreground text-sm">
        You need the <strong>pharmacy:purchase_orders</strong> permission to view and manage purchase orders.
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  if (error) {
    return <ErrorState title="Could not load purchase orders" error={error} onRetry={() => void refetch()} />
  }

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div
          className="flex items-center gap-1.5 border rounded-lg px-1 py-0.5 bg-muted/30"
          role="group"
          aria-label="Status filter"
        >
          {STATUS_FILTER_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setStatusFilter(value)}
              className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                statusFilter === value
                  ? "bg-white shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              aria-pressed={statusFilter === value}
            >
              {label}
            </button>
          ))}
        </div>
        <Button
          size="sm"
          className="ml-auto"
          onClick={() => {
            setShowCreate(true)
            setPOItems([{ medicineId: "", medicineName: "", batchNumber: "", quantity: 0, costPrice: 0, mrp: 0, gstPercent: 12, expiryDate: "" }])
            setPOHeader({ supplierId: "", expectedDate: "", invoiceNumber: "", invoiceDate: "", notes: "", discount: 0, paymentMode: "", amountPaid: 0 })
          }}
        >
          <Plus className="h-4 w-4 mr-1.5" aria-hidden="true" />
          New Purchase Order
        </Button>
      </div>

      {/* Orders list */}
      {(orders ?? []).length === 0 ? (
        <EmptyState
          title="No purchase orders found"
          description="Create your first purchase order to start tracking supply."
          action={{ label: "New Purchase Order", onClick: () => setShowCreate(true) }}
        />
      ) : (
        <div className="space-y-3">
          {(orders ?? []).map((po) => (
            <Card key={po.id} className="overflow-hidden">
              <button
                onClick={() => setExpandedPO(expandedPO === po.id ? null : po.id)}
                className="w-full p-4 flex items-center justify-between hover:bg-muted/20 transition-colors"
                aria-expanded={expandedPO === po.id}
              >
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center">
                    <Package className="h-5 w-5 text-slate-600" aria-hidden="true" />
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm">{po.orderNumber}</p>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[po.status] ?? ""}`}
                      >
                        {po.status.replace(/_/g, " ")}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {po.supplier.name} &middot; {formatDate(po.createdAt)} &middot; {po.items.length} items
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-semibold text-sm">{formatINR(po.totalAmount)}</p>
                    {po.balanceDue > 0 && (
                      <p className="text-xs text-red-500">Due: {formatINR(po.balanceDue)}</p>
                    )}
                  </div>
                  {expandedPO === po.id ? (
                    <ChevronUp className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <ChevronDown className="h-4 w-4" aria-hidden="true" />
                  )}
                </div>
              </button>

              {expandedPO === po.id && (
                <div className="border-t px-4 pb-4">
                  <table className="w-full text-sm mt-3">
                    <thead>
                      <tr className="border-b bg-muted/20">
                        <th className="text-left p-2 text-xs font-medium text-muted-foreground">Medicine</th>
                        <th className="text-right p-2 text-xs font-medium text-muted-foreground">Ordered</th>
                        <th className="text-right p-2 text-xs font-medium text-muted-foreground">Received</th>
                        <th className="text-right p-2 text-xs font-medium text-muted-foreground">Cost</th>
                        <th className="text-right p-2 text-xs font-medium text-muted-foreground">MRP</th>
                        <th className="text-center p-2 text-xs font-medium text-muted-foreground">GST %</th>
                        <th className="text-right p-2 text-xs font-medium text-muted-foreground">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {po.items.map((item: PurchaseOrderItem) => (
                        <tr key={item.id} className="border-b">
                          <td className="p-2 text-xs font-medium">{item.medicine.name}</td>
                          <td className="p-2 text-xs text-right">{item.quantity}</td>
                          <td className="p-2 text-xs text-right">
                            {item.receivedQty}
                            {item.receivedQty >= item.quantity && (
                              <Check className="inline h-3 w-3 ml-1 text-emerald-500" aria-label="Fully received" />
                            )}
                          </td>
                          <td className="p-2 text-xs text-right">{formatINR(item.costPrice)}</td>
                          <td className="p-2 text-xs text-right">{formatINR(item.mrp)}</td>
                          <td className="p-2 text-xs text-center">{item.gstPercent}%</td>
                          <td className="p-2 text-xs text-right font-medium">{formatINR(item.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t">
                        <td colSpan={5}></td>
                        <td className="p-2 text-xs text-right font-medium">Subtotal:</td>
                        <td className="p-2 text-xs text-right font-medium">{formatINR(po.subtotal)}</td>
                      </tr>
                      <tr>
                        <td colSpan={5}></td>
                        <td className="p-2 text-xs text-right">GST:</td>
                        <td className="p-2 text-xs text-right">{formatINR(po.gstAmount)}</td>
                      </tr>
                      {po.discount > 0 && (
                        <tr>
                          <td colSpan={5}></td>
                          <td className="p-2 text-xs text-right">Discount:</td>
                          <td className="p-2 text-xs text-right text-red-500">-{formatINR(po.discount)}</td>
                        </tr>
                      )}
                      <tr>
                        <td colSpan={5}></td>
                        <td className="p-2 text-xs text-right font-semibold">Total:</td>
                        <td className="p-2 text-xs text-right font-semibold">{formatINR(po.totalAmount)}</td>
                      </tr>
                    </tfoot>
                  </table>

                  {po.notes && (
                    <p className="text-xs text-muted-foreground mt-2">Notes: {po.notes}</p>
                  )}

                  <div className="flex items-center gap-2 mt-3">
                    {(po.status === "ORDERED" || po.status === "PARTIALLY_RECEIVED") && (
                      <Button size="sm" onClick={() => openReceive(po)}>
                        <Check className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
                        Receive Items
                      </Button>
                    )}
                    {po.status === "ORDERED" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive"
                        onClick={() => handleCancelPO(po.id)}
                      >
                        Cancel PO
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Create PO Dialog */}
      <Dialog
        open={showCreate}
        onOpenChange={(open) => {
          setShowCreate(open)
          if (!open) setPOItems([])
        }}
      >
        <DialogContent size="xl" className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Purchase Order</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <FormSection title="Order Details">
              <div className="grid grid-cols-3 gap-3">
                <FormField label="Supplier" required>
                  <SingleSelect
                    value={poHeader.supplierId}
                    onChange={(v) => setPOHeader({ ...poHeader, supplierId: v })}
                    options={supplierOptions}
                    placeholder="Select supplier"
                    aria-label="Supplier"
                  />
                </FormField>
                <FormField label="Invoice Number">
                  <Input
                    value={poHeader.invoiceNumber}
                    onChange={(e) => setPOHeader({ ...poHeader, invoiceNumber: e.target.value })}
                    aria-label="Invoice number"
                  />
                </FormField>
                <FormField label="Invoice Date">
                  <Input
                    type="date"
                    value={poHeader.invoiceDate}
                    onChange={(e) => setPOHeader({ ...poHeader, invoiceDate: e.target.value })}
                    aria-label="Invoice date"
                  />
                </FormField>
                <FormField label="Expected Delivery">
                  <Input
                    type="date"
                    value={poHeader.expectedDate}
                    onChange={(e) => setPOHeader({ ...poHeader, expectedDate: e.target.value })}
                    aria-label="Expected delivery date"
                  />
                </FormField>
                <FormField label="Payment Mode">
                  <SingleSelect
                    value={poHeader.paymentMode}
                    onChange={(v) => setPOHeader({ ...poHeader, paymentMode: v })}
                    options={PAYMENT_MODE_OPTIONS}
                    placeholder="Select payment mode"
                    clearable
                    aria-label="Payment mode"
                  />
                </FormField>
                <FormField label="Notes" className="col-span-3">
                  <Input
                    value={poHeader.notes}
                    onChange={(e) => setPOHeader({ ...poHeader, notes: e.target.value })}
                    aria-label="Notes"
                  />
                </FormField>
              </div>
            </FormSection>

            {/* Line items */}
            <FormSection title="Order Items">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Items</span>
                <Button variant="outline" size="sm" onClick={addPOItem}>
                  <Plus className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
                  Add Item
                </Button>
              </div>
              <div className="border rounded-lg overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/30 border-b">
                      <th className="text-left p-2 text-xs font-medium text-muted-foreground">Medicine</th>
                      <th className="text-left p-2 text-xs font-medium text-muted-foreground w-24">Batch</th>
                      <th className="text-right p-2 text-xs font-medium text-muted-foreground w-20">Qty</th>
                      <th className="text-right p-2 text-xs font-medium text-muted-foreground w-20">Cost</th>
                      <th className="text-right p-2 text-xs font-medium text-muted-foreground w-20">MRP</th>
                      <th className="text-right p-2 text-xs font-medium text-muted-foreground w-16">GST %</th>
                      <th className="text-left p-2 text-xs font-medium text-muted-foreground w-24">Expiry</th>
                      <th className="text-right p-2 text-xs font-medium text-muted-foreground w-20">Amt</th>
                      <th className="w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {poItems.map((item, idx) => (
                      <tr key={idx} className="border-b">
                        <td className="p-1.5">
                          <SingleSelect
                            value={item.medicineId}
                            onChange={(v) => {
                              const med = (medicines ?? []).find((m) => m.id === v)
                              updatePOItem(idx, {
                                medicineId: v,
                                medicineName: med?.name ?? "",
                                gstPercent: med?.gstPercent ?? 12,
                              })
                            }}
                            options={medicineOptions}
                            placeholder="Select"
                            aria-label={`Medicine for item ${idx + 1}`}
                          />
                        </td>
                        <td className="p-1.5">
                          <Input
                            className="h-8 text-xs"
                            value={item.batchNumber}
                            onChange={(e) => updatePOItem(idx, { batchNumber: e.target.value })}
                            aria-label={`Batch for item ${idx + 1}`}
                          />
                        </td>
                        <td className="p-1.5">
                          <Input
                            type="number"
                            className="h-8 text-xs text-right"
                            value={item.quantity || ""}
                            onChange={(e) => updatePOItem(idx, { quantity: parseInt(e.target.value) || 0 })}
                            aria-label={`Quantity for item ${idx + 1}`}
                          />
                        </td>
                        <td className="p-1.5">
                          <Input
                            type="number"
                            step="0.01"
                            className="h-8 text-xs text-right"
                            value={item.costPrice || ""}
                            onChange={(e) => updatePOItem(idx, { costPrice: parseFloat(e.target.value) || 0 })}
                            aria-label={`Cost for item ${idx + 1}`}
                          />
                        </td>
                        <td className="p-1.5">
                          <Input
                            type="number"
                            step="0.01"
                            className="h-8 text-xs text-right"
                            value={item.mrp || ""}
                            onChange={(e) => updatePOItem(idx, { mrp: parseFloat(e.target.value) || 0 })}
                            aria-label={`MRP for item ${idx + 1}`}
                          />
                        </td>
                        <td className="p-1.5">
                          <Input
                            type="number"
                            className="h-8 text-xs text-right"
                            value={item.gstPercent}
                            onChange={(e) => updatePOItem(idx, { gstPercent: parseFloat(e.target.value) || 0 })}
                            aria-label={`GST for item ${idx + 1}`}
                          />
                        </td>
                        <td className="p-1.5">
                          <Input
                            type="month"
                            className="h-8 text-xs"
                            value={item.expiryDate ? item.expiryDate.substring(0, 7) : ""}
                            onChange={(e) => updatePOItem(idx, { expiryDate: e.target.value ? e.target.value + "-01" : "" })}
                            aria-label={`Expiry for item ${idx + 1}`}
                          />
                        </td>
                        <td className="p-1.5 text-right text-xs font-medium">
                          {formatINR(item.quantity * item.costPrice * (1 + item.gstPercent / 100))}
                        </td>
                        <td className="p-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive h-8 w-8 p-0"
                            onClick={() => removePOItem(idx)}
                            aria-label={`Remove item ${idx + 1}`}
                          >
                            ×
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* PO Totals */}
              <div className="flex justify-end mt-3">
                <div className="w-64 space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span>{formatINR(poSubtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">GST:</span>
                    <span>{formatINR(poGst)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <Label className="text-xs text-muted-foreground">Discount:</Label>
                    <Input
                      type="number"
                      className="w-24 h-7 text-xs text-right"
                      value={poHeader.discount || ""}
                      onChange={(e) => setPOHeader({ ...poHeader, discount: parseFloat(e.target.value) || 0 })}
                      aria-label="Discount amount"
                    />
                  </div>
                  <div className="flex justify-between font-semibold border-t pt-1.5">
                    <span>Total:</span>
                    <span>{formatINR(poTotal)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <Label className="text-xs text-muted-foreground">Paid:</Label>
                    <Input
                      type="number"
                      className="w-24 h-7 text-xs text-right"
                      value={poHeader.amountPaid || ""}
                      onChange={(e) => setPOHeader({ ...poHeader, amountPaid: parseFloat(e.target.value) || 0 })}
                      aria-label="Amount paid"
                    />
                  </div>
                </div>
              </div>
            </FormSection>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreate(false)}
              disabled={createPO.isPending}
            >
              Cancel
            </Button>
            <Button onClick={handleCreatePO} disabled={createPO.isPending}>
              {createPO.isPending ? "Creating..." : "Create Purchase Order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receive Items Dialog */}
      <Dialog
        open={showReceive}
        onOpenChange={(open) => {
          setShowReceive(open)
          if (!open) setSelectedPO(null)
        }}
      >
        <DialogContent size="xl" className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Receive Items — {selectedPO?.orderNumber ?? ""}</DialogTitle>
          </DialogHeader>

          <div className="border rounded-lg overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/30 border-b">
                  <th className="text-left p-2 text-xs font-medium text-muted-foreground">Medicine</th>
                  <th className="text-right p-2 text-xs font-medium text-muted-foreground w-16">Ordered</th>
                  <th className="text-right p-2 text-xs font-medium text-muted-foreground w-20">Already Rcvd</th>
                  <th className="text-right p-2 text-xs font-medium text-muted-foreground w-20">Receiving</th>
                  <th className="text-left p-2 text-xs font-medium text-muted-foreground w-24">Batch *</th>
                  <th className="text-left p-2 text-xs font-medium text-muted-foreground w-28">Expiry *</th>
                  <th className="text-right p-2 text-xs font-medium text-muted-foreground w-20">MRP</th>
                  <th className="text-right p-2 text-xs font-medium text-muted-foreground w-20">Cost</th>
                </tr>
              </thead>
              <tbody>
                {receiveItems.map((item, idx) => (
                  <tr key={item.itemId} className="border-b">
                    <td className="p-2 text-xs font-medium">{item.medicineName}</td>
                    <td className="p-2 text-xs text-right">{item.orderedQty}</td>
                    <td className="p-2 text-xs text-right">{item.receivedQty}</td>
                    <td className="p-1.5">
                      <Input
                        type="number"
                        className="h-7 text-xs text-right"
                        value={item.newReceivedQty || ""}
                        onChange={(e) => {
                          const items = [...receiveItems]
                          items[idx] = { ...items[idx], newReceivedQty: parseInt(e.target.value) || 0 }
                          setReceiveItems(items)
                        }}
                        aria-label={`Receiving qty for ${item.medicineName}`}
                      />
                    </td>
                    <td className="p-1.5">
                      <Input
                        className="h-7 text-xs"
                        value={item.batchNumber}
                        onChange={(e) => {
                          const items = [...receiveItems]
                          items[idx] = { ...items[idx], batchNumber: e.target.value }
                          setReceiveItems(items)
                        }}
                        aria-label={`Batch for ${item.medicineName}`}
                      />
                    </td>
                    <td className="p-1.5">
                      <Input
                        type="date"
                        className="h-7 text-xs"
                        value={item.expiryDate}
                        onChange={(e) => {
                          const items = [...receiveItems]
                          items[idx] = { ...items[idx], expiryDate: e.target.value }
                          setReceiveItems(items)
                        }}
                        aria-label={`Expiry for ${item.medicineName}`}
                      />
                    </td>
                    <td className="p-1.5">
                      <Input
                        type="number"
                        step="0.01"
                        className="h-7 text-xs text-right"
                        value={item.mrp || ""}
                        onChange={(e) => {
                          const items = [...receiveItems]
                          items[idx] = { ...items[idx], mrp: parseFloat(e.target.value) || 0 }
                          setReceiveItems(items)
                        }}
                        aria-label={`MRP for ${item.medicineName}`}
                      />
                    </td>
                    <td className="p-1.5">
                      <Input
                        type="number"
                        step="0.01"
                        className="h-7 text-xs text-right"
                        value={item.costPrice || ""}
                        onChange={(e) => {
                          const items = [...receiveItems]
                          items[idx] = { ...items[idx], costPrice: parseFloat(e.target.value) || 0 }
                          setReceiveItems(items)
                        }}
                        aria-label={`Cost for ${item.medicineName}`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowReceive(false)}
              disabled={receivePO.isPending}
            >
              Cancel
            </Button>
            <Button onClick={handleReceive} disabled={receivePO.isPending}>
              {receivePO.isPending ? "Receiving..." : "Receive & Update Stock"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
