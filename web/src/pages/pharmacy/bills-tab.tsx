/**
 * BillsTab — pharmacy billing (create bill + view bill history).
 * Also embeds the pending-medicines list and patient prescription lookup.
 *
 * Permissions:
 *   - View bills: pharmacy:view (x-permission on GET /pharmacy/bills)
 *   - Create bill: pharmacy:create (x-permission on POST /pharmacy/bills)
 *   - Lookup/pending: pharmacy:view
 *
 * Field names and payment modes verified against:
 *   - supabase/functions/pharmacy/types.ts CreatePharmacyBillSchema (lines 125-141)
 *   - src/app/(hospital)/pharmacy/components/BillingTab.tsx (payment mode Select options lines 876-882)
 *   - repository.ts insertBill() (lines 568-603)
 */

import { useState, useCallback, useEffect } from "react"
import {
  Search,
  Plus,
  Trash2,
  FileText,
  Printer,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  ClipboardList,
  X,
  Loader2,
} from "lucide-react"
import { toast } from "sonner"
import {
  EmptyState,
  ErrorState,
  SingleSelect,
} from "@/components/patterns"
import type { SelectOption } from "@/components/patterns"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { usePermissions } from "@/hooks/usePermissions"
import {
  usePharmacyBills,
  useCreatePharmacyBill,
  usePendingMedicines,
  useStockSearch,
} from "./hooks"
import { apiClient } from "@/lib/api-client"
import { printReceiptsHtml } from "@/lib/print-receipts"
import { todayISO } from "@/lib/utils"
import { useHospitalProfile } from "@/pages/settings/hooks"
import type { HospitalProfile } from "@/pages/settings/types"
import type {
  BillItemRow,
  PharmacyBill,
  PatientPrescriptionResponse,
  PrescriptionMedicine,
  CreatePharmacyBillBody,
} from "./types"
import { PHARMACY_PAYMENT_MODES } from "./types"

function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount)
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

/** Escape HTML special characters before inlining into a print template — matches main's BillingTab.tsx esc(). */
function esc(s: string | null | undefined): string {
  if (s == null) return ""
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

/**
 * Build a single-page A4 HTML receipt for a pharmacy bill, fed to
 * printReceiptsHtml. Ported verbatim from main's BillingTab.tsx
 * buildPharmacyBillHtml — a real missing feature (history rows had no print
 * action at all), not a styling gap.
 */
function buildPharmacyBillHtml(bill: PharmacyBill, hp: HospitalProfile | null): string {
  const hospitalName = hp?.displayName || hp?.name || "Hospital"
  const billDate = new Date(bill.billDate).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })

  const itemsRows = bill.items
    .map(
      (it, i) => `
    <tr>
      <td class="border border-black p-1 text-center">${i + 1}</td>
      <td class="border border-black p-1">${esc(it.medicineName)}</td>
      <td class="border border-black p-1">${esc(it.batchNumber)}</td>
      <td class="border border-black p-1 text-right">${it.quantity}</td>
      <td class="border border-black p-1 text-right">${(it.mrp ?? 0).toFixed(2)}</td>
      <td class="border border-black p-1 text-right">${(it.discountPercent ?? 0).toFixed(2)}</td>
      <td class="border border-black p-1 text-right">${(it.gstPercent ?? 0).toFixed(2)}</td>
      <td class="border border-black p-1 text-right">${(it.amount ?? 0).toFixed(2)}</td>
    </tr>
  `,
    )
    .join("")

  return `
    <div class="receipt-page">
      <div class="border-b-2 border-black pb-2 mb-3 text-center">
        ${hp?.logoUrl ? `<img src="${esc(hp.logoUrl)}" alt="" style="height:48px;margin:0 auto 4px;" />` : ""}
        <h1 class="text-lg font-bold tracking-tight">${esc(hospitalName)}</h1>
        ${hp?.address ? `<p class="text-[10px]">${esc(hp.address)}</p>` : ""}
        ${
          hp?.phone || hp?.email
            ? `<p class="text-[10px]">${[hp?.phone && `Phone: ${esc(hp.phone)}`, hp?.email && `Email: ${esc(hp.email)}`].filter(Boolean).join(" · ")}</p>`
            : ""
        }
        ${hp?.registrationNo ? `<p class="text-[10px]">Reg No: ${esc(hp.registrationNo)}</p>` : ""}
      </div>

      <h2 class="text-sm text-center font-bold py-1 mb-3 border border-black">PHARMACY BILL</h2>

      <div class="grid grid-cols-2 gap-3 text-[11px] mb-3 border-b border-black pb-2">
        <div class="space-y-0.5">
          <div><strong>Bill #:</strong> ${esc(bill.billNumber)}</div>
          <div><strong>Patient:</strong> ${esc(bill.patientName)}</div>
          <div><strong>Phone:</strong> ${esc(bill.patientPhone) || "—"}</div>
          ${bill.gender ? `<div><strong>Gender:</strong> ${esc(bill.gender)}</div>` : ""}
        </div>
        <div class="space-y-0.5 text-right">
          <div><strong>Date:</strong> ${esc(billDate)}</div>
          <div><strong>Doctor:</strong> ${esc(bill.referredDoctor) || "—"}</div>
          <div><strong>Payment:</strong> ${esc(bill.paymentMode)}${bill.paymentRef ? ` · ${esc(bill.paymentRef)}` : ""}</div>
          <div><strong>Status:</strong> ${esc(bill.status)}</div>
        </div>
      </div>

      <table class="w-full border-collapse text-[10px] mb-3">
        <thead>
          <tr>
            <th class="border border-black p-1 text-center font-bold w-[5%]">#</th>
            <th class="border border-black p-1 text-left font-bold">MEDICINE</th>
            <th class="border border-black p-1 text-left font-bold w-[14%]">BATCH</th>
            <th class="border border-black p-1 text-right font-bold w-[7%]">QTY</th>
            <th class="border border-black p-1 text-right font-bold w-[10%]">MRP</th>
            <th class="border border-black p-1 text-right font-bold w-[8%]">DISC%</th>
            <th class="border border-black p-1 text-right font-bold w-[8%]">GST%</th>
            <th class="border border-black p-1 text-right font-bold w-[12%]">AMOUNT</th>
          </tr>
        </thead>
        <tbody>${itemsRows}</tbody>
      </table>

      <div class="flex justify-end">
        <table class="border-collapse text-[11px]" style="min-width:250px;">
          <tbody>
            <tr>
              <td class="p-1 pr-4 font-medium">Subtotal</td>
              <td class="p-1 text-right tabular-nums">${(bill.subtotal ?? 0).toFixed(2)}</td>
            </tr>
            ${
              (bill.discountAmount ?? 0) > 0
                ? `<tr>
              <td class="p-1 pr-4 font-medium">Discount${bill.discountPercent ? ` (${bill.discountPercent}%)` : ""}</td>
              <td class="p-1 text-right tabular-nums">- ${bill.discountAmount.toFixed(2)}</td>
            </tr>`
                : ""
            }
            ${
              (bill.gstAmount ?? 0) > 0
                ? `<tr>
              <td class="p-1 pr-4 font-medium">GST</td>
              <td class="p-1 text-right tabular-nums">${bill.gstAmount.toFixed(2)}</td>
            </tr>`
                : ""
            }
            ${
              (bill.roundOff ?? 0) !== 0
                ? `<tr>
              <td class="p-1 pr-4 font-medium">Round Off</td>
              <td class="p-1 text-right tabular-nums">${bill.roundOff.toFixed(2)}</td>
            </tr>`
                : ""
            }
            <tr class="border-t-2 border-black font-bold">
              <td class="p-1 pr-4">TOTAL</td>
              <td class="p-1 text-right tabular-nums">${(bill.billAmount ?? 0).toFixed(2)}</td>
            </tr>
            <tr>
              <td class="p-1 pr-4 font-medium">Paid</td>
              <td class="p-1 text-right tabular-nums">${(bill.paidAmount ?? 0).toFixed(2)}</td>
            </tr>
            ${
              (bill.balanceDue ?? 0) > 0
                ? `<tr class="font-bold">
              <td class="p-1 pr-4">Balance Due</td>
              <td class="p-1 text-right tabular-nums">${bill.balanceDue.toFixed(2)}</td>
            </tr>`
                : ""
            }
          </tbody>
        </table>
      </div>

      <div class="mt-6 pt-3 border-t border-black text-center text-[10px] text-gray-700">
        Thank you · ${esc(hospitalName)}
      </div>
    </div>
  `
}

/**
 * Normalize medicine name for fuzzy match — verified against BillingTab.tsx (line 110).
 */
function normalizeMedName(s: string): string {
  return s
    .toLowerCase()
    .replace(/\(.*?\)/g, " ")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

/**
 * Parse timing string to doses per day — verified against BillingTab.tsx timingToDosesPerDay (lines 63-97).
 */
function timingToDosesPerDay(timing: string | undefined | null): number | null {
  if (!timing) return null
  const t = timing.trim()
  const lower = t.toLowerCase()
  if (/^\d+(\s*-\s*\d+)+$/.test(t)) {
    const sum = t.split("-").map((s) => parseInt(s.trim(), 10) || 0).reduce((a, b) => a + b, 0)
    return sum > 0 ? sum : null
  }
  const xTimes = lower.match(/(\d+)\s*(?:times?|x)\b/)
  if (xTimes) return parseInt(xTimes[1], 10) || null
  if (lower === "od" || lower === "qd") return 1
  if (lower === "bd" || lower === "bid") return 2
  if (lower === "tds" || lower === "tid") return 3
  if (lower === "qid") return 4
  if (/^(morning|night|evening|noon|afternoon|bedtime|hs|am|pm)$/.test(lower)) return 1
  if (lower === "sos" || lower === "prn") return 1
  if (lower.includes(",") || lower.includes("+")) {
    const parts = lower.split(/[,+]/).map((s) => s.trim()).filter(Boolean)
    if (parts.length > 1) return parts.length
  }
  return null
}

function suggestedQuantity(days: string | undefined | null, timing: string | undefined | null): number | null {
  if (!days) return null
  const d = parseInt(String(days).trim(), 10)
  if (!d || d <= 0) return null
  const perDay = timingToDosesPerDay(timing)
  if (perDay == null) return null
  return d * perDay
}

function findPrescriptionMatch(
  stockName: string,
  meds: PrescriptionMedicine[],
): PrescriptionMedicine | null {
  const n = normalizeMedName(stockName)
  if (!n) return null
  for (const med of meds) {
    const m = normalizeMedName(med.name)
    if (!m) continue
    if (n === m) return med
    const nHead = n.split(" ").slice(0, 2).join(" ")
    const mHead = m.split(" ").slice(0, 2).join(" ")
    if (nHead && nHead === mHead) return med
    if (n.length >= 4 && m.includes(n)) return med
    if (m.length >= 4 && n.includes(m)) return med
  }
  return null
}

const paymentModeOptions: SelectOption[] = PHARMACY_PAYMENT_MODES.map((m) => ({
  value: m.value,
  label: m.label,
}))

const genderOptions: SelectOption[] = [
  { value: "Male", label: "Male" },
  { value: "Female", label: "Female" },
  { value: "Other", label: "Other" },
]

export function BillsTab() {
  const { can } = usePermissions()
  const canCreate = can("pharmacy:create")

  // Bill history panel — two-tier date state matches main's exact UX: the
  // From/To inputs are freely editable, but the list only refetches for the
  // *applied* range when "Search" is clicked (main's own loadHistory is an
  // explicit imperative call, not a reactive effect on every keystroke).
  const [showHistory, setShowHistory] = useState(false)
  const [historyDateFrom, setHistoryDateFrom] = useState(todayISO())
  const [historyDateTo, setHistoryDateTo] = useState(todayISO())
  const [appliedDateFrom, setAppliedDateFrom] = useState(todayISO())
  const [appliedDateTo, setAppliedDateTo] = useState(todayISO())

  // Bill history pagination
  const {
    data: bills,
    isLoading: billsLoading,
    error: billsError,
    refetch: refetchBills,
  } = usePharmacyBills({ dateFrom: appliedDateFrom, dateTo: appliedDateTo, enabled: showHistory })

  function handleSearchHistory() {
    setAppliedDateFrom(historyDateFrom)
    setAppliedDateTo(historyDateTo)
    void refetchBills()
  }

  const { data: pendingMedicines, isLoading: pendingLoading, refetch: refetchPending } =
    usePendingMedicines()

  const createBill = useCreatePharmacyBill()

  // Bill printing (from history rows) — hospital profile is cached (5 min
  // staleTime) so this doesn't refetch on every print, matching main's
  // BillingTab.tsx lazy-load-and-cache behavior.
  const { data: hospitalProfile } = useHospitalProfile()
  const [printingBillId, setPrintingBillId] = useState<string | null>(null)

  function handlePrintBill(bill: PharmacyBill) {
    setPrintingBillId(bill.id)
    try {
      const html = buildPharmacyBillHtml(bill, hospitalProfile ?? null)
      printReceiptsHtml({ title: `Pharmacy Bill ${bill.billNumber}`, contentHtml: html })
    } catch {
      toast.error("Could not print bill")
    } finally {
      setPrintingBillId(null)
    }
  }

  // Patient lookup state
  const [patientSearch, setPatientSearch] = useState("")
  const [lookupLoading, setLookupLoading] = useState(false)
  const [patientInfo, setPatientInfo] = useState<PatientPrescriptionResponse["patient"] | null>(null)
  const [prescriptionId, setPrescriptionId] = useState<string | null>(null)
  const [prescriptionMeds, setPrescriptionMeds] = useState<PrescriptionMedicine[]>([])

  // Bill form fields
  const [patientName, setPatientName] = useState("")
  const [gender, setGender] = useState("Male")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [referredDoctor, setReferredDoctor] = useState("")

  // Medicine search for billing
  const [medSearch, setMedSearch] = useState("")
  const stockSearch = useStockSearch(medSearch)
  const [billItems, setBillItems] = useState<BillItemRow[]>([])
  const [showResults, setShowResults] = useState(false)

  // Bill summary
  const [discountPercent, setDiscountPercent] = useState(0)
  const [roundOff, setRoundOff] = useState(0)
  const [paymentMode, setPaymentMode] = useState("CASH")
  const [paidAmount, setPaidAmount] = useState(0)
  const [paymentRef, setPaymentRef] = useState("")

  // Calculations
  const subtotal = billItems.reduce((s, it) => s + it.amount, 0)
  const discountAmount = subtotal * (discountPercent / 100)
  const afterDiscount = subtotal - discountAmount
  const gstTotal = billItems.reduce((s, it) => {
    const share = subtotal > 0 ? (it.amount / subtotal) * afterDiscount : 0
    return s + (share * it.gstPercent) / (100 + it.gstPercent)
  }, 0)
  const taxableAmount = afterDiscount - gstTotal
  const netAmount = afterDiscount
  const billAmount = Math.round(netAmount + roundOff)

  useEffect(() => {
    setPaidAmount(billAmount)
  }, [billAmount])

  const clearBill = useCallback(() => {
    setPatientSearch("")
    setPatientInfo(null)
    setPatientName("")
    setGender("Male")
    setPhone("")
    setEmail("")
    setReferredDoctor("")
    setPrescriptionId(null)
    setPrescriptionMeds([])
    setBillItems([])
    setDiscountPercent(0)
    setRoundOff(0)
    setPaymentMode("CASH")
    setPaidAmount(0)
    setPaymentRef("")
    setMedSearch("")
  }, [])

  const handlePatientLookup = async () => {
    if (!patientSearch) return
    setLookupLoading(true)
    try {
      const res = await apiClient.get<PatientPrescriptionResponse>(
        `/pharmacy/patients/${encodeURIComponent(patientSearch)}/prescription`,
      )
      const { patient, prescription } = res.data
      setPatientInfo(patient)
      setPatientName(patient.name)
      const g = (patient.gender ?? "").toUpperCase()
      setGender(g === "FEMALE" ? "Female" : g === "OTHER" ? "Other" : "Male")
      setPhone(patient.phone)
      setEmail(patient.email ?? "")
      setReferredDoctor(patient.doctorName ?? prescription?.doctorName ?? "")
      setPrescriptionId(prescription?.id ?? null)
      setPrescriptionMeds(prescription?.medicines ?? [])
      toast.success(`Patient found: ${patient.name}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Patient not found")
    } finally {
      setLookupLoading(false)
    }
  }

  const addToBill = (stock: NonNullable<typeof stockSearch.data>[number]) => {
    if (billItems.find((it) => it.stockId === stock.stockId)) {
      toast.error("Already added to bill")
      return
    }
    const match = findPrescriptionMatch(stock.name, prescriptionMeds)
    const suggested = match ? suggestedQuantity(match.days, match.timing) : null
    const initialQty =
      suggested != null ? Math.max(1, Math.min(suggested, stock.quantity || suggested)) : 1
    const newItem: BillItemRow = {
      stockId: stock.stockId,
      medicineName: stock.name,
      batchNumber: stock.batchNumber,
      quantity: initialQty,
      mrp: stock.mrp,
      price: stock.mrp,
      total: stock.mrp * initialQty,
      discountPercent: 0,
      amount: stock.mrp * initialQty,
      gstPercent: stock.gstPercent,
      availableQty: stock.quantity,
    }
    setBillItems([...billItems, newItem])
    setMedSearch("")
    setShowResults(false)
  }

  const updateItem = (idx: number, field: "quantity" | "price" | "discountPercent", value: number) => {
    const items = [...billItems]
    const item = { ...items[idx] }
    if (field === "quantity") {
      if (value > item.availableQty) {
        toast.error(`Only ${item.availableQty} available`)
        return
      }
      item.quantity = Math.max(0, value)
    } else if (field === "price") {
      item.price = value
    } else if (field === "discountPercent") {
      item.discountPercent = value
    }
    item.total = item.quantity * item.price
    item.amount = item.total - item.total * (item.discountPercent / 100)
    items[idx] = item
    setBillItems(items)
  }

  const removeItem = (idx: number) => {
    setBillItems(billItems.filter((_, i) => i !== idx))
  }

  const handleSaveBill = () => {
    if (!patientName) return toast.error("Patient name is required")
    if (billItems.length === 0) return toast.error("Add at least one medicine")
    const body: CreatePharmacyBillBody = {
      bill: {
        patientName,
        patientId: patientInfo?.patientId,
        patientPhone: phone,
        gender,
        email,
        referredDoctor,
        prescriptionId: prescriptionId ?? undefined,
        discountPercent,
        roundOff,
        paymentMode,
        paidAmount,
        paymentRef: paymentRef || undefined,
      },
      items: billItems.map((it) => ({
        stockId: it.stockId,
        medicineName: it.medicineName,
        batchNumber: it.batchNumber,
        quantity: it.quantity,
        mrp: it.mrp,
        price: it.price,
        total: it.total,
        discountPercent: it.discountPercent,
        amount: it.amount,
        gstPercent: it.gstPercent,
      })),
    }
    createBill.mutate(body, {
      onSuccess: (data) => {
        const d = data as { billNumber: string; billAmount: number }
        toast.success(`Bill ${d.billNumber} created — ${formatINR(d.billAmount)}`)
        clearBill()
        void refetchPending()
      },
      onError: (err) => {
        toast.error(err instanceof Error ? err.message : "Failed to create bill")
      },
    })
  }

  const loadPendingPatient = async (patientId: string) => {
    setLookupLoading(true)
    try {
      const res = await apiClient.get<PatientPrescriptionResponse>(
        `/pharmacy/patients/${encodeURIComponent(patientId)}/prescription`,
      )
      const { patient, prescription } = res.data
      setPatientInfo(patient)
      setPatientName(patient.name)
      const g = (patient.gender ?? "").toUpperCase()
      setGender(g === "FEMALE" ? "Female" : g === "OTHER" ? "Other" : "Male")
      setPhone(patient.phone)
      setEmail(patient.email ?? "")
      setReferredDoctor(patient.doctorName ?? prescription?.doctorName ?? "")
      setPrescriptionId(prescription?.id ?? null)
      setPrescriptionMeds(prescription?.medicines ?? [])
      toast.success(`Loaded: ${patient.name}`)
      window.scrollTo({ top: 0, behavior: "smooth" })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load patient")
    } finally {
      setLookupLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-base font-semibold">Pharmacy Billing</h3>
          <span className="text-sm text-muted-foreground">
            Date:{" "}
            <span className="font-medium text-foreground">
              {new Date().toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={clearBill} aria-label="Clear current bill">
            <X className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
            Clear Bill
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowHistory((v) => !v)}
            aria-expanded={showHistory}
          >
            <FileText className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
            Bill History
            {showHistory ? (
              <ChevronUp className="h-3.5 w-3.5 ml-1" aria-hidden="true" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 ml-1" aria-hidden="true" />
            )}
          </Button>
        </div>
      </div>

      {/* Pending Medicines list */}
      {(pendingLoading || (pendingMedicines ?? []).length > 0) && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <h4 className="text-sm font-semibold">Pending Medicines</h4>
              {(pendingMedicines ?? []).length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {pendingMedicines?.length}
                </Badge>
              )}
            </div>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={() => void refetchPending()}
              disabled={pendingLoading}
              aria-label="Refresh pending medicines"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 mr-1 ${pendingLoading ? "animate-spin" : ""}`}
                aria-hidden="true"
              />
              {pendingLoading ? "Loading..." : "Refresh"}
            </Button>
          </div>

          {(pendingMedicines ?? []).length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              No pending prescriptions today. Refresh to check.
            </p>
          ) : (
            <div className="space-y-2">
              {pendingMedicines?.map((p) => (
                <button
                  key={p.prescriptionId}
                  className="w-full flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30 cursor-pointer transition-colors text-left"
                  onClick={() => void loadPendingPatient(p.patientId)}
                  aria-label={`Load ${p.patientName}`}
                >
                  <div>
                    <p className="text-sm font-medium">{p.patientName}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.patientId} &middot; {p.phone}
                      {p.doctorName && ` · ${p.doctorName}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {p.medicineCount} medicine{p.medicineCount !== 1 ? "s" : ""}
                    </Badge>
                    {p.billCount > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        Partial
                      </Badge>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Main billing form + summary */}
      <div className="grid grid-cols-12 gap-5">
        {/* Left: Bill form */}
        <div className="col-span-12 lg:col-span-8 space-y-4">
          {/* Patient lookup */}
          <Card className="p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <Input
                  placeholder="Search Patient ID..."
                  value={patientSearch}
                  onChange={(e) => setPatientSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void handlePatientLookup()
                  }}
                  className="pl-9"
                  aria-label="Patient ID lookup"
                />
              </div>
              <Button size="sm" onClick={() => void handlePatientLookup()} disabled={lookupLoading}>
                {lookupLoading ? "Searching..." : "Lookup"}
              </Button>
            </div>

            {/* Prescription preview */}
            {prescriptionMeds.length > 0 && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs font-medium text-blue-700 mb-2">
                  Prescription by {referredDoctor} ({prescriptionMeds.length} medicines)
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {prescriptionMeds.map((med, i) => {
                    const qty = suggestedQuantity(med.days, med.timing)
                    return (
                      <Badge key={i} variant="secondary" className="text-xs px-2 py-0.5 bg-white border border-blue-200">
                        {med.name} {med.days ? `- ${med.days} days` : ""} {med.timing ? `(${med.timing})` : ""}
                        {qty != null && <span className="ml-1.5 font-semibold text-blue-700">· qty ~{qty}</span>}
                      </Badge>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Patient details form */}
            <div className="grid grid-cols-5 gap-3">
              <div>
                <Label className="text-xs">Patient Name *</Label>
                <Input
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  aria-label="Patient name"
                  aria-required="true"
                />
              </div>
              <div>
                <Label className="text-xs">Gender</Label>
                <SingleSelect
                  value={gender}
                  onChange={(v) => setGender(v ?? "Male")}
                  options={genderOptions}
                  placeholder="Gender"
                  aria-label="Gender"
                />
              </div>
              <div>
                <Label className="text-xs">Phone</Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  aria-label="Phone"
                />
              </div>
              <div>
                <Label className="text-xs">Email</Label>
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-label="Email"
                />
              </div>
              <div>
                <Label className="text-xs">Referred Doctor</Label>
                <Input
                  value={referredDoctor}
                  onChange={(e) => setReferredDoctor(e.target.value)}
                  aria-label="Referred doctor"
                />
              </div>
            </div>
          </Card>

          {/* Medicine search */}
          <Card className="p-4">
            <div className="relative">
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <Input
                    placeholder="Search medicine name to add..."
                    value={medSearch}
                    onChange={(e) => {
                      setMedSearch(e.target.value)
                      setShowResults(e.target.value.length >= 2)
                    }}
                    className="pl-9"
                    aria-label="Search medicine stock"
                  />
                </div>
              </div>

              {/* Search results dropdown */}
              {showResults && (stockSearch.data ?? []).length > 0 && (
                <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg max-h-64 overflow-y-auto">
                  {(stockSearch.data ?? []).map((stock) => (
                    <button
                      key={stock.stockId}
                      onClick={() => addToBill(stock)}
                      className="w-full px-4 py-2.5 text-left hover:bg-muted/50 flex items-center justify-between border-b last:border-0 transition-colors"
                      aria-label={`Add ${stock.name} to bill`}
                    >
                      <div>
                        <p className="text-sm font-medium">{stock.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Batch: {stock.batchNumber} | Exp:{" "}
                          {formatDate(stock.expiryDate)} | Qty: {stock.quantity}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">{formatINR(stock.mrp)}</p>
                        <p className="text-xs text-muted-foreground">GST {stock.gstPercent}%</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </Card>

          {/* Bill items table */}
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left p-3 font-medium text-muted-foreground">Medicine Name</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Batch</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Price</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Qty</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Total</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Disc. %</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Amount</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {billItems.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-muted-foreground text-sm">
                        Search and add medicines to the bill
                      </td>
                    </tr>
                  ) : (
                    billItems.map((item, idx) => (
                      <tr key={idx} className="border-b hover:bg-muted/20">
                        <td className="p-3">
                          <p className="font-medium text-sm">{item.medicineName}</p>
                          <p className="text-[10px] text-muted-foreground">
                            Avl: {item.availableQty}
                          </p>
                        </td>
                        <td className="p-3 text-xs font-mono">{item.batchNumber}</td>
                        <td className="p-2">
                          <Input
                            type="number"
                            className="h-7 w-20 text-xs text-right ml-auto border-transparent hover:border-input bg-transparent focus:bg-white"
                            value={item.price}
                            onChange={(e) =>
                              updateItem(idx, "price", parseFloat(e.target.value) || 0)
                            }
                            aria-label={`Price for ${item.medicineName}`}
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            type="number"
                            className="h-7 w-16 text-xs text-right ml-auto border-transparent hover:border-input bg-transparent focus:bg-white"
                            value={item.quantity === 0 ? "" : item.quantity}
                            onChange={(e) =>
                              updateItem(
                                idx,
                                "quantity",
                                e.target.value === "" ? 0 : parseInt(e.target.value),
                              )
                            }
                            aria-label={`Quantity for ${item.medicineName}`}
                          />
                        </td>
                        <td className="p-3 text-right text-xs">{formatINR(item.total)}</td>
                        <td className="p-2">
                          <Input
                            type="number"
                            className="h-7 w-16 text-xs text-right ml-auto border-transparent hover:border-input bg-transparent focus:bg-white"
                            value={item.discountPercent}
                            onChange={(e) =>
                              updateItem(
                                idx,
                                "discountPercent",
                                parseFloat(e.target.value) || 0,
                              )
                            }
                            aria-label={`Discount for ${item.medicineName}`}
                          />
                        </td>
                        <td className="p-3 text-right font-semibold text-xs">
                          {formatINR(item.amount)}
                        </td>
                        <td className="p-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive h-8 w-8 p-0"
                            onClick={() => removeItem(idx)}
                            aria-label={`Remove ${item.medicineName}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Right: Bill summary */}
        <div className="col-span-12 lg:col-span-4">
          <Card className="p-4 sticky top-28">
            <div className="space-y-2.5">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Subtotal (MRP)</span>
                <span className="font-medium tabular-nums">{formatINR(subtotal)}</span>
              </div>

              <div className="flex justify-between items-center">
                <Label className="text-xs">Discount %</Label>
                <Input
                  type="number"
                  className="w-20 h-7 text-right text-xs"
                  value={discountPercent || ""}
                  onChange={(e) => setDiscountPercent(parseFloat(e.target.value) || 0)}
                  aria-label="Discount percentage"
                />
              </div>

              {discountPercent > 0 && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Discount Amt</span>
                  <span className="font-medium tabular-nums text-red-500">
                    - {formatINR(discountAmount)}
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center text-sm border-t pt-2">
                <span className="text-muted-foreground">Taxable Amount</span>
                <span className="font-medium tabular-nums">{formatINR(taxableAmount)}</span>
              </div>

              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">GST</span>
                <span className="font-medium tabular-nums">{formatINR(gstTotal)}</span>
              </div>

              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Net Amount</span>
                <span className="font-medium tabular-nums">{formatINR(netAmount)}</span>
              </div>

              <div className="flex justify-between items-center">
                <Label className="text-xs">Round Off</Label>
                <Input
                  type="number"
                  step="0.5"
                  className="w-20 h-7 text-right text-xs"
                  value={roundOff || ""}
                  onChange={(e) => setRoundOff(parseFloat(e.target.value) || 0)}
                  aria-label="Round off"
                />
              </div>

              <div className="flex justify-between items-center pt-2 border-t">
                <span className="text-sm font-semibold">Bill Amount</span>
                <span className="text-lg font-bold tabular-nums">{formatINR(billAmount)}</span>
              </div>

              <div className="pt-1 space-y-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-24">
                    <SingleSelect
                      value={paymentMode}
                      onChange={(v) => setPaymentMode(v ?? "CASH")}
                      options={paymentModeOptions}
                      placeholder="Mode"
                      aria-label="Payment mode"
                    />
                  </div>
                  <Input
                    type="number"
                    placeholder="Paid"
                    className="flex-1 h-9 text-right text-xs"
                    value={paidAmount || ""}
                    onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                    aria-label="Amount paid"
                  />
                </div>
                <Input
                  placeholder="Reference / UPI ID"
                  className="h-9 text-xs"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  aria-label="Payment reference"
                />
              </div>

              {billAmount > 0 && paidAmount < billAmount && (
                <div className="flex justify-between items-center pt-2 border-t border-red-200 bg-red-50 -mx-4 px-4 pb-2 rounded-b-lg">
                  <span className="text-sm font-semibold text-red-600">Balance Due</span>
                  <span className="text-lg font-bold tabular-nums text-red-600">
                    {formatINR(billAmount - paidAmount)}
                  </span>
                </div>
              )}
            </div>

            {canCreate && (
              <div className="pt-3 mt-3 border-t">
                <Button
                  className="w-full"
                  size="sm"
                  onClick={handleSaveBill}
                  disabled={createBill.isPending}
                  aria-label="Save pharmacy bill"
                >
                  <Plus className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
                  {createBill.isPending ? "Saving..." : "Save Bill"}
                </Button>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Bill History */}
      {showHistory && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold">Bill History</h4>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <Label className="text-xs">From</Label>
                <Input
                  type="date"
                  className="h-7 w-36 text-xs"
                  value={historyDateFrom}
                  onChange={(e) => setHistoryDateFrom(e.target.value)}
                  aria-label="Bill history from date"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <Label className="text-xs">To</Label>
                <Input
                  type="date"
                  className="h-7 w-36 text-xs"
                  value={historyDateTo}
                  onChange={(e) => setHistoryDateTo(e.target.value)}
                  aria-label="Bill history to date"
                />
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={handleSearchHistory}
              >
                <Search className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
                Search
              </Button>
            </div>
          </div>

          {billsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full rounded" />
              ))}
            </div>
          ) : billsError ? (
            <ErrorState title="Could not load bills" error={billsError} onRetry={() => void refetchBills()} />
          ) : (bills ?? []).length === 0 ? (
            <EmptyState title="No bills found" description="Create a bill above to see it here." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left p-2 text-xs font-medium text-muted-foreground">Bill #</th>
                    <th className="text-left p-2 text-xs font-medium text-muted-foreground">Date</th>
                    <th className="text-left p-2 text-xs font-medium text-muted-foreground">Patient</th>
                    <th className="text-right p-2 text-xs font-medium text-muted-foreground">Items</th>
                    <th className="text-right p-2 text-xs font-medium text-muted-foreground">Amount</th>
                    <th className="text-right p-2 text-xs font-medium text-muted-foreground">Paid</th>
                    <th className="text-right p-2 text-xs font-medium text-muted-foreground">Due</th>
                    <th className="text-center p-2 text-xs font-medium text-muted-foreground">Status</th>
                    <th className="text-center p-2 text-xs font-medium text-muted-foreground w-10">Print</th>
                  </tr>
                </thead>
                <tbody>
                  {(bills ?? []).map((bill: PharmacyBill) => (
                    <tr key={bill.id} className="border-b hover:bg-muted/20">
                      <td className="p-2 font-mono text-xs">{bill.billNumber}</td>
                      <td className="p-2 text-xs">{formatDate(bill.billDate)}</td>
                      <td className="p-2">
                        <p className="font-medium text-xs">{bill.patientName}</p>
                        <p className="text-[10px] text-muted-foreground">{bill.patientPhone}</p>
                      </td>
                      <td className="p-2 text-right text-xs">{bill.items.length}</td>
                      <td className="p-2 text-right font-medium text-xs">
                        {formatINR(bill.billAmount)}
                      </td>
                      <td className="p-2 text-right text-green-600 text-xs">
                        {formatINR(bill.paidAmount)}
                      </td>
                      <td className="p-2 text-right text-xs">
                        <span
                          className={`font-medium ${
                            bill.balanceDue > 0 ? "text-red-600" : "text-green-600"
                          }`}
                        >
                          {bill.balanceDue > 0 ? formatINR(bill.balanceDue) : "Nil"}
                        </span>
                      </td>
                      <td className="p-2 text-center">
                        <Badge
                          variant={bill.balanceDue > 0 ? "error" : "neutral"}
                          className="text-[10px]"
                        >
                          {bill.balanceDue > 0
                            ? "DUE"
                            : bill.status === "COMPLETED"
                            ? "PAID"
                            : bill.status}
                        </Badge>
                      </td>
                      <td className="p-2 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                          disabled={printingBillId === bill.id}
                          onClick={() => handlePrintBill(bill)}
                          aria-label={`Print bill ${bill.billNumber}`}
                        >
                          {printingBillId === bill.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                          ) : (
                            <Printer className="h-3.5 w-3.5" aria-hidden="true" />
                          )}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
