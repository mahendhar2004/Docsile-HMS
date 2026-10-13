/**
 * optical/optical-bill-form.tsx
 *
 * Full-page bill creation form (used as a Dialog or inline view).
 * Matches the layout and field structure of the old BillingTab.tsx.
 *
 * Patient lookup: GET /optical/patients/{id}/ar-reading (optical:view)
 * Stock search:   GET /optical/stock/search?q=...       (optical:view)
 * Create bill:    POST /optical/bills                   (optical:create)
 *
 * Enum/option lists verified against:
 *   src/app/(hospital)/optical/components/BillingTab.tsx
 */

import { useState, useEffect } from "react"
import { Search, Plus, X, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  FormField,
  SingleSelect,
} from "@/components/patterns"
import { useStockSearch, usePatientArReading, useCreateBill } from "./hooks"
import type {
  CreateOpticalBillBody,
  CreateOpticalBillItemBody,
  StockSearchResult,
  PatientArReading,
  OpticalBillRow,
} from "./types"
import {
  OPTICAL_PAYMENT_MODE_OPTIONS,
  OPTICAL_BILL_STATUS_OPTIONS,
  OPTICAL_CATEGORY_OPTIONS,
} from "./types"

// ─── Reading display ──────────────────────────────────────────────────────────

interface EyeValue {
  sph?: string
  cyl?: string
  axis?: string
  va?: string
  add?: string
  vacph?: string
}

interface ReadingData {
  re?: EyeValue
  le?: EyeValue
  pd?: string
}

function safeReading(raw: unknown): ReadingData | null {
  if (!raw || typeof raw !== "object") return null
  return raw as ReadingData
}

function ReadingRow({ label, data }: { label: string; data: ReadingData | null }) {
  if (!data) return null
  const re = data.re
  const le = data.le
  if (!re?.sph && !le?.sph) return null

  return (
    <div className="text-xs">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
        {label}
      </p>
      <div className="space-y-0.5">
        <div className="flex gap-3">
          <span className="w-5 text-muted-foreground font-medium">RE</span>
          {re?.sph && <span>SPH: {re.sph}</span>}
          {re?.cyl && <span>CYL: {re.cyl}</span>}
          {re?.axis && <span>AXIS: {re.axis}</span>}
          {re?.va && <span>VA: {re.va}</span>}
        </div>
        <div className="flex gap-3">
          <span className="w-5 text-muted-foreground font-medium">LE</span>
          {le?.sph && <span>SPH: {le.sph}</span>}
          {le?.cyl && <span>CYL: {le.cyl}</span>}
          {le?.axis && <span>AXIS: {le.axis}</span>}
          {le?.va && <span>VA: {le.va}</span>}
        </div>
        {data.pd && (
          <p className="text-muted-foreground">PD: {data.pd}</p>
        )}
      </div>
    </div>
  )
}

// ─── Types ────────────────────────────────────────────────────────────────────

type BillItem = Omit<CreateOpticalBillItemBody, "availableQty"> & {
  availableQty: number
}

// ─── OpticalBillForm ──────────────────────────────────────────────────────────

interface OpticalBillFormProps {
  onSuccess?: (bill: OpticalBillRow) => void
  onCancel?: () => void
}

export function OpticalBillForm({ onSuccess, onCancel }: OpticalBillFormProps) {
  // ── Patient lookup ────────────────────────────────────────────────────────
  const [patientIdInput, setPatientIdInput] = useState("")
  const [patientLookupId, setPatientLookupId] = useState<string | null>(null)
  const [patientNameOverride, setPatientNameOverride] = useState("")

  const {
    data: patientData,
    isLoading: lookingUp,
    error: lookupError,
  } = usePatientArReading(patientLookupId)

  const patient = patientData as PatientArReading | undefined

  // ── Stock search ──────────────────────────────────────────────────────────
  const [itemSearch, setItemSearch] = useState("")
  const { data: searchResults, isFetching: searching } = useStockSearch(itemSearch)

  // ── Bill items ────────────────────────────────────────────────────────────
  const [billItems, setBillItems] = useState<BillItem[]>([])

  // ── Custom item ───────────────────────────────────────────────────────────
  const [showCustom, setShowCustom] = useState(false)
  const [customItem, setCustomItem] = useState({
    name: "",
    category: "Lens",
    price: "",
    eye: "",
  })

  // ── Payment ───────────────────────────────────────────────────────────────
  const [discountPercent, setDiscountPercent] = useState(0)
  const [roundOff, setRoundOff] = useState(0)
  const [paymentMode, setPaymentMode] = useState("CASH")
  const [paidAmount, setPaidAmount] = useState(0)
  const [deliveryDate, setDeliveryDate] = useState("")
  const [orderNotes, setOrderNotes] = useState("")
  const [status, setStatus] = useState("COMPLETED")

  // ── Mutation ──────────────────────────────────────────────────────────────
  const createMutation = useCreateBill((bill) => {
    clearBill()
    onSuccess?.(bill)
  })

  // ── Derived totals ────────────────────────────────────────────────────────
  const subtotal = billItems.reduce((s, i) => s + i.total, 0)
  const discountAmount = subtotal * (discountPercent / 100)
  const netAmount = subtotal - discountAmount
  const billAmount = Math.round(netAmount + roundOff)
  const balanceDue = billAmount - paidAmount

  // Auto-update paid amount when bill amount changes
  useEffect(() => {
    setPaidAmount(billAmount > 0 ? billAmount : 0)
  }, [billAmount])

  // ── Patient lookup handler ─────────────────────────────────────────────────
  function handleLookup() {
    if (!patientIdInput.trim()) return
    setPatientLookupId(patientIdInput.trim())
  }

  function clearPatient() {
    setPatientLookupId(null)
    setPatientIdInput("")
    setPatientNameOverride("")
  }

  // ── Add from stock search ─────────────────────────────────────────────────
  function addToBill(stock: StockSearchResult) {
    if (billItems.some((i) => i.stockId === stock.stockId)) return
    setBillItems((prev) => [
      ...prev,
      {
        stockId: stock.stockId,
        itemName: [stock.brand, stock.name].filter(Boolean).join(" "),
        category: stock.category,
        quantity: 1,
        mrp: stock.mrp,
        price: stock.mrp,
        total: stock.mrp,
        discountPercent: 0,
        amount: stock.mrp,
        gstPercent: stock.gstPercent,
        availableQty: stock.quantity,
      },
    ])
    setItemSearch("")
  }

  // ── Add custom item ───────────────────────────────────────────────────────
  function addCustom() {
    if (!customItem.name.trim() || !customItem.price) return
    const price = parseFloat(customItem.price)
    setBillItems((prev) => [
      ...prev,
      {
        itemName: customItem.name.trim(),
        category: customItem.category,
        eye: customItem.eye || null,
        quantity: 1,
        mrp: price,
        price,
        total: price,
        discountPercent: 0,
        amount: price,
        gstPercent: 12,
        availableQty: 9999,
      },
    ])
    setCustomItem({ name: "", category: "Lens", price: "", eye: "" })
    setShowCustom(false)
  }

  function updateItem(
    index: number,
    field: "quantity" | "price" | "discountPercent",
    value: number,
  ) {
    setBillItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item
        const updated = { ...item, [field]: value }
        if (field === "quantity" || field === "price") {
          updated.total = updated.quantity * updated.price
        }
        updated.amount =
          updated.total - updated.total * ((updated.discountPercent ?? 0) / 100)
        return updated
      }),
    )
  }

  function removeItem(index: number) {
    setBillItems((prev) => prev.filter((_, i) => i !== index))
  }

  function clearBill() {
    clearPatient()
    setBillItems([])
    setDiscountPercent(0)
    setRoundOff(0)
    setPaymentMode("CASH")
    setPaidAmount(0)
    setDeliveryDate("")
    setOrderNotes("")
    setStatus("COMPLETED")
  }

  // ── Save bill ─────────────────────────────────────────────────────────────
  function handleSave() {
    const patientName =
      patient?.name ?? patientNameOverride.trim() ?? patientIdInput.trim()
    if (!patientName) return
    if (billItems.length === 0) return

    // Validate stock quantities
    for (const item of billItems) {
      if (item.stockId && item.quantity > item.availableQty) return
    }

    const body: CreateOpticalBillBody = {
      patientName,
      patientId: patient?.patientId ?? null,
      patientPhone: patient?.phone ?? null,
      gender: patient?.gender ?? null,
      referredDoctor: patient?.doctorName ?? null,
      prescriptionId: patient?.prescriptionId ?? null,
      lensPrescription:
        patient?.presentPrescription != null
          ? (patient.presentPrescription as Record<string, unknown>)
          : null,
      discountPercent,
      roundOff,
      paymentMode,
      paidAmount,
      deliveryDate: deliveryDate || null,
      orderNotes: orderNotes || null,
      status,
      items: billItems.map(({ availableQty: _, ...item }) => item),
    }

    createMutation.mutate(body)
  }

  const hasReadings: boolean = !!(
    patient != null &&
    (patient.autoRefractometer ||
      patient.presentPrescription ||
      patient.glassesReading)
  )

  const canSave =
    (patient != null || patientNameOverride.trim().length > 0 || patientIdInput.trim().length > 0) &&
    billItems.length > 0 &&
    !billItems.some((i) => i.stockId && i.quantity > i.availableQty)

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
      {/* ── Left: Form ───────────────────────────────────────────────────────── */}
      <div className="md:col-span-8 space-y-5">
        {/* Patient Lookup */}
        <div className="rounded-[var(--radius-lg)] bg-[var(--color-card)] shadow-[var(--shadow-card)] p-4 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Patient
          </p>

          <div className="flex gap-2">
            <Input
              placeholder="Enter Patient ID (e.g. OPD-001)"
              value={patientIdInput}
              onChange={(e) => setPatientIdInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLookup()}
              aria-label="Patient ID"
              className="flex-1"
            />
            <Button
              size="sm"
              onClick={handleLookup}
              disabled={lookingUp || !patientIdInput.trim()}
            >
              {lookingUp ? "Looking up…" : "Lookup"}
            </Button>
          </div>

          {lookupError && !lookingUp && (
            <p className="text-sm text-destructive">Patient not found.</p>
          )}

          {/* Walk-in name when no patient found */}
          {!patient && !lookingUp && (
            <div>
              <Label className="text-xs">Walk-in Name (if no patient ID)</Label>
              <Input
                value={patientNameOverride}
                onChange={(e) => setPatientNameOverride(e.target.value)}
                placeholder="Patient name"
                className="mt-1"
                aria-label="Walk-in patient name"
              />
            </div>
          )}

          {/* Patient info */}
          {patient != null && (
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground text-sm">
                  {patient.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {patient.age && `${patient.age}y`}
                  {patient.gender && ` · ${patient.gender}`}
                  {patient.phone && ` · ${patient.phone}`}
                  {patient.doctorName && ` · ${patient.doctorName}`}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                aria-label="Clear patient"
                onClick={clearPatient}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}

          {/* Eye Readings */}
          {patient != null && hasReadings && (
            <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-3 space-y-2">
              <div className="flex items-center gap-1.5">
                <Eye className="h-3.5 w-3.5 text-blue-600" aria-hidden="true" />
                <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider">
                  Eye Readings
                  {patient.readingDate && (
                    <span className="font-normal normal-case text-blue-500 ml-1">
                      (
                      {new Date(patient.readingDate).toLocaleDateString(
                        "en-IN",
                        {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        },
                      )}
                      )
                    </span>
                  )}
                </p>
              </div>
              <ReadingRow
                label="Auto Refractometer"
                data={safeReading(patient.autoRefractometer)}
              />
              <ReadingRow
                label="Glasses Reading"
                data={safeReading(patient.glassesReading)}
              />
              <ReadingRow
                label="Present Prescription"
                data={safeReading(patient.presentPrescription)}
              />
            </div>
          )}
        </div>

        {/* Add Items */}
        <div className="rounded-[var(--radius-lg)] bg-[var(--color-card)] shadow-[var(--shadow-card)] p-4 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Add Items
          </p>

          {/* Stock search */}
          <div className="relative">
            <Search
              className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              placeholder="Search frames, lenses, accessories…"
              value={itemSearch}
              onChange={(e) => setItemSearch(e.target.value)}
              className="pl-8"
              aria-label="Search stock items"
            />
            {searching && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                Searching…
              </span>
            )}
            {(searchResults ?? []).length > 0 && (
              <div
                className="absolute z-20 left-0 right-0 top-full mt-1 bg-background border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto"
                role="listbox"
                aria-label="Stock search results"
              >
                {(searchResults ?? []).map((s) => (
                  <button
                    key={s.stockId}
                    role="option"
                    aria-selected={billItems.some((i) => i.stockId === s.stockId)}
                    onClick={() => addToBill(s)}
                    className="w-full text-left px-3 py-2 hover:bg-muted/50 flex items-center justify-between text-sm border-b border-border last:border-0"
                  >
                    <div className="min-w-0">
                      <p className="font-medium truncate">
                        {s.brand && (
                          <span className="text-muted-foreground">
                            {s.brand}{" "}
                          </span>
                        )}
                        {s.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {s.category}
                        {s.type && ` · ${s.type}`}
                        {s.modelNumber && ` · ${s.modelNumber}`}
                        {s.power && ` · ${s.power}`}
                        {` · Qty: ${s.quantity}`}
                      </p>
                    </div>
                    <span className="text-sm font-semibold tabular-nums ml-3 shrink-0">
                      ₹{s.mrp.toLocaleString("en-IN")}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Custom item */}
          {!showCustom ? (
            <button
              onClick={() => setShowCustom(true)}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              type="button"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              Add custom item
            </button>
          ) : (
            <div className="rounded-lg border border-dashed border-border bg-muted/30 p-3 space-y-2">
              <div className="flex gap-2 flex-wrap">
                <Input
                  placeholder="Item name (e.g. Progressive Lens)"
                  value={customItem.name}
                  onChange={(e) =>
                    setCustomItem((p) => ({ ...p, name: e.target.value }))
                  }
                  className="flex-1 min-w-40 h-8 text-sm"
                  autoFocus
                  aria-label="Custom item name"
                />
                <div className="w-40">
                  <SingleSelect
                    options={OPTICAL_CATEGORY_OPTIONS}
                    value={customItem.category}
                    onChange={(v) =>
                      setCustomItem((p) => ({ ...p, category: v ?? "Lens" }))
                    }
                    aria-label="Custom item category"
                  />
                </div>
                <Input
                  type="number"
                  placeholder="Price"
                  value={customItem.price}
                  onChange={(e) =>
                    setCustomItem((p) => ({ ...p, price: e.target.value }))
                  }
                  className="w-28 h-8 text-sm"
                  min={0}
                  aria-label="Custom item price"
                />
                <Input
                  placeholder="Eye (RE/LE)"
                  value={customItem.eye}
                  onChange={(e) =>
                    setCustomItem((p) => ({ ...p, eye: e.target.value }))
                  }
                  className="w-24 h-8 text-sm"
                  aria-label="Custom item eye"
                />
              </div>
              <div className="flex gap-2">
                <Button size="sm" type="button" onClick={addCustom}>
                  Add
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  type="button"
                  onClick={() => setShowCustom(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Bill items table */}
          {billItems.length > 0 && (
            <div className="space-y-1 mt-2">
              <div className="grid grid-cols-[1fr_60px_80px_70px_60px] gap-2 text-xs text-muted-foreground px-1 pb-1 border-b border-border">
                <span>Item</span>
                <span className="text-right">Qty</span>
                <span className="text-right">Price</span>
                <span className="text-right">Disc%</span>
                <span className="text-right">Total</span>
              </div>
              {billItems.map((item, i) => (
                <div
                  key={i}
                  className="grid grid-cols-[1fr_60px_80px_70px_60px] gap-2 items-center py-1 px-1 hover:bg-muted/30 rounded"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{item.itemName}</p>
                    <p className="text-xs text-muted-foreground">{item.category}</p>
                  </div>
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) =>
                      updateItem(i, "quantity", parseInt(e.target.value) || 1)
                    }
                    min={1}
                    max={item.availableQty}
                    className="w-full text-right text-sm border border-border rounded px-1 py-0.5"
                    aria-label={`Quantity for ${item.itemName}`}
                  />
                  <input
                    type="number"
                    value={item.price}
                    onChange={(e) =>
                      updateItem(i, "price", parseFloat(e.target.value) || 0)
                    }
                    min={0}
                    className="w-full text-right text-sm border border-border rounded px-1 py-0.5"
                    aria-label={`Price for ${item.itemName}`}
                  />
                  <input
                    type="number"
                    value={item.discountPercent}
                    onChange={(e) =>
                      updateItem(
                        i,
                        "discountPercent",
                        parseFloat(e.target.value) || 0,
                      )
                    }
                    min={0}
                    max={100}
                    className="w-full text-right text-sm border border-border rounded px-1 py-0.5"
                    aria-label={`Discount for ${item.itemName}`}
                  />
                  <div className="flex items-center justify-end gap-1">
                    <span className="text-sm tabular-nums">
                      ₹{item.amount.toLocaleString("en-IN")}
                    </span>
                    <button
                      onClick={() => removeItem(i)}
                      className="text-muted-foreground hover:text-destructive"
                      aria-label={`Remove ${item.itemName}`}
                      type="button"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Payment details */}
        <div className="rounded-[var(--radius-lg)] bg-[var(--color-card)] shadow-[var(--shadow-card)] p-4 space-y-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Payment
          </p>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Payment Mode">
              <SingleSelect
                options={OPTICAL_PAYMENT_MODE_OPTIONS}
                value={paymentMode}
                onChange={(v) => setPaymentMode(v ?? "CASH")}
                aria-label="Payment mode"
              />
            </FormField>

            <FormField label="Status">
              <SingleSelect
                options={OPTICAL_BILL_STATUS_OPTIONS}
                value={status}
                onChange={(v) => setStatus(v ?? "COMPLETED")}
                aria-label="Bill status"
              />
            </FormField>

            <FormField label="Delivery Date">
              <Input
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                aria-label="Delivery date"
              />
            </FormField>
          </div>

          <FormField label="Order Notes">
            <Input
              value={orderNotes}
              onChange={(e) => setOrderNotes(e.target.value)}
              placeholder="Any special instructions…"
              aria-label="Order notes"
            />
          </FormField>
        </div>
      </div>

      {/* ── Right: Summary ────────────────────────────────────────────────────── */}
      <div className="md:col-span-4">
        <div className="sticky top-24 rounded-[var(--radius-lg)] bg-[var(--color-card)] shadow-[var(--shadow-card)] p-4 space-y-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Bill Summary
          </p>

          <div className="text-sm text-muted-foreground">
            {billItems.length === 0
              ? "No items added"
              : `${billItems.length} item${billItems.length > 1 ? "s" : ""}`}
          </div>

          {billItems.length > 0 && (
            <>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="tabular-nums">
                    ₹{subtotal.toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Discount %</span>
                  <input
                    type="number"
                    value={discountPercent}
                    onChange={(e) =>
                      setDiscountPercent(parseFloat(e.target.value) || 0)
                    }
                    min={0}
                    max={100}
                    className="w-16 text-right text-sm border border-border rounded px-1 py-0.5 tabular-nums"
                    aria-label="Bill discount percentage"
                  />
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Discount (₹)</span>
                  <span className="tabular-nums text-success">
                    -₹{discountAmount.toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Round Off</span>
                  <input
                    type="number"
                    value={roundOff}
                    onChange={(e) =>
                      setRoundOff(parseFloat(e.target.value) || 0)
                    }
                    step={0.01}
                    className="w-16 text-right text-sm border border-border rounded px-1 py-0.5 tabular-nums"
                    aria-label="Round off"
                  />
                </div>
                <Separator />
                <div className="flex justify-between font-semibold">
                  <span>Bill Amount</span>
                  <span className="tabular-nums">
                    ₹{billAmount.toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Paid</span>
                  <input
                    type="number"
                    value={paidAmount}
                    onChange={(e) =>
                      setPaidAmount(parseFloat(e.target.value) || 0)
                    }
                    min={0}
                    className="w-24 text-right text-sm border border-border rounded px-1 py-0.5 tabular-nums"
                    aria-label="Amount paid"
                  />
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Balance Due</span>
                  <span
                    className={`tabular-nums font-semibold ${balanceDue > 0 ? "text-destructive" : "text-success"}`}
                  >
                    ₹{balanceDue.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <Button
                  className="w-full"
                  onClick={handleSave}
                  disabled={!canSave || createMutation.isPending}
                >
                  {createMutation.isPending
                    ? "Creating Bill…"
                    : `Create Bill — ₹${billAmount.toLocaleString("en-IN")}`}
                </Button>
                {onCancel && (
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={onCancel}
                    disabled={createMutation.isPending}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </>
          )}

          {billItems.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Search for items above or add a custom item to begin.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
