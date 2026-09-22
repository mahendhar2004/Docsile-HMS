/**
 * labs/bills-tab.tsx
 *
 * Lab billing tab — two sections:
 *   1. Bill generation: patient ID search → investigation lookup → bill cards → process payment
 *   2. Bill history:    date-filtered paginated table of lab bills
 *
 * Business logic verified against:
 *   - src/app/(hospital)/labs/components/LabBillingTab.tsx
 *   - src/app/(hospital)/labs/components/LabBillCard.tsx
 *
 * Permission gates:
 *   labs:view   — search, history
 *   labs:create — process bills (POST /labs/bills)
 *
 * PAYMENT_MODES verified from LabBillCard.tsx:
 *   const PAYMENT_MODES = ["Cash", "UPI", "Card", "Cheque", "Online", "NEFT"]
 *
 * POST /labs/bills body shape:
 *   { bills: [{ bill: { patientId, labId, prescriptionId, total, discount, discountReason },
 *               items: [{ investigationId, name, amount }],
 *               payment?: { paymentMode, amount } }] }
 * Cross-referenced: supabase/functions/labs/types.ts CreateLabBillsSchema
 */

import React, { useState } from "react"
import {
  Search,
  User,
  FileText,
  AlertTriangle,
  CheckCircle2,
  X,
  MapPin,
  CreditCard,
  Loader2,
  FlaskConical,
  RefreshCw,
} from "lucide-react"
import { usePermissions } from "@/hooks/usePermissions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PaginatedDataTable, EmptyState, PageToolbar } from "@/components/patterns"
import type { ColumnDef } from "@/components/patterns"
import { usePatientInvestigations, useCreateLabBills, useLabBills } from "./hooks"
import {
  PAYMENT_MODES,
  BILL_STATUS_BADGE,
  type BillFormData,
  type PatientInfo,
  type PrescriptionInfo,
  type LabBillRow,
} from "./types"

// ─── IST date helper ─────────────────────────────────────────────────────────

function todayIST(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" })
}

function formatINR(n: number): string {
  return `₹${n.toLocaleString("en-IN")}`
}

// ─── BillCard ─────────────────────────────────────────────────────────────────

interface BillCardProps {
  lab: { id: string; name: string; location: string | null }
  form: BillFormData
  onUpdateDiscount: (v: number) => void
  onUpdateDiscountReason: (v: string) => void
  onUpdatePaymentMode: (v: string) => void
  onUpdateAmountPaid: (v: number) => void
  onRemoveItem: (investigationId: string) => void
  onProcess: () => void
  submitting: boolean
}

function BillCard({
  lab,
  form,
  onUpdateDiscount,
  onUpdateDiscountReason,
  onUpdatePaymentMode,
  onUpdateAmountPaid,
  onRemoveItem,
  onProcess,
  submitting,
}: BillCardProps) {
  const { can } = usePermissions()
  const subtotal = form.items.reduce((s, i) => s + i.amount, 0)
  const total = Math.max(0, subtotal - form.discount)
  const balance = total - form.amountPaid

  return (
    <div className="rounded-[var(--radius-lg)] bg-[var(--color-card)] shadow-[var(--shadow-card)] overflow-hidden">
      {/* Card header */}
      <div className="bg-muted/50 px-4 py-3 border-b border-border">
        <h4 className="font-semibold text-sm">{lab.name}</h4>
        {lab.location && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
            <MapPin className="h-3 w-3" aria-hidden="true" />
            {lab.location}
          </div>
        )}
      </div>

      {/* Items */}
      <div className="px-4 py-3">
        {form.items.map((item) => (
          <div
            key={item.investigationId}
            className="flex items-center justify-between py-1.5 border-b border-border last:border-0"
          >
            <span className="text-sm">{item.name}</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">
                {formatINR(item.amount)}
              </span>
              <button
                type="button"
                onClick={() => onRemoveItem(item.investigationId)}
                className="text-muted-foreground hover:text-destructive transition-colors"
                aria-label={`Remove ${item.name}`}
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>
        ))}
        {form.items.length === 0 && (
          <div className="text-sm text-muted-foreground py-4 text-center">
            All items removed
          </div>
        )}
      </div>

      {/* Totals and payment */}
      {form.items.length > 0 && (
        <div className="border-t border-border px-4 py-3 space-y-2.5 bg-muted/20">
          {/* Subtotal */}
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-medium">{formatINR(subtotal)}</span>
          </div>

          {/* Discount */}
          <div className="flex items-center gap-2">
            <Label
              htmlFor={`discount-${lab.id}`}
              className="text-xs text-muted-foreground w-16 shrink-0"
            >
              Discount
            </Label>
            <Input
              id={`discount-${lab.id}`}
              type="number"
              min={0}
              max={subtotal}
              value={form.discount || ""}
              onChange={(e) =>
                onUpdateDiscount(parseFloat(e.target.value) || 0)
              }
              className="h-8 w-24 bg-white text-sm"
              placeholder="0"
              aria-label={`Discount for ${lab.name}`}
            />
            <Input
              value={form.discountReason ?? ""}
              onChange={(e) => onUpdateDiscountReason(e.target.value)}
              className="h-8 flex-1 bg-white text-sm"
              placeholder="Reason (optional)"
              aria-label={`Discount reason for ${lab.name}`}
            />
          </div>

          {/* Total after discount */}
          <div className="flex justify-between text-sm font-semibold border-t border-border pt-2">
            <span>Total</span>
            <span>{formatINR(total)}</span>
          </div>

          {/* Payment mode + amount */}
          <div className="flex items-center gap-2">
            <Label
              htmlFor={`payment-mode-${lab.id}`}
              className="text-xs text-muted-foreground w-16 shrink-0"
            >
              Payment
            </Label>
            <Select
              value={form.paymentMode}
              onValueChange={onUpdatePaymentMode}
            >
              <SelectTrigger
                id={`payment-mode-${lab.id}`}
                className="h-8 w-28 bg-white text-sm"
                aria-label={`Payment mode for ${lab.name}`}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_MODES.map((mode) => (
                  <SelectItem key={mode} value={mode}>
                    {mode}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="number"
              min={0}
              max={total}
              value={form.amountPaid || ""}
              onChange={(e) =>
                onUpdateAmountPaid(parseFloat(e.target.value) || 0)
              }
              className="h-8 flex-1 bg-white text-sm"
              placeholder="Amount paid"
              aria-label={`Amount paid for ${lab.name}`}
            />
          </div>

          {/* Balance due */}
          {balance > 0 && (
            <div className="flex justify-between text-sm text-orange-600">
              <span>Balance Due</span>
              <span className="font-medium">{formatINR(balance)}</span>
            </div>
          )}

          {/* Process button */}
          {can("labs:create") && (
            <Button
              type="button"
              onClick={onProcess}
              disabled={submitting || form.items.length === 0}
              className="w-full"
              size="sm"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" aria-hidden="true" />
              ) : (
                <CreditCard className="h-4 w-4 mr-1" aria-hidden="true" />
              )}
              {submitting
                ? "Processing…"
                : `Process Payment — ${formatINR(total)}`}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── BillsTab ─────────────────────────────────────────────────────────────────

export function BillsTab() {
  const { can } = usePermissions()

  // ── Patient search state ──────────────────────────────────────────────────────
  const [searchInput, setSearchInput] = useState("")
  /** Setting this triggers the patient investigations query. */
  const [searchedPatientId, setSearchedPatientId] = useState<string | null>(null)
  const [billForms, setBillForms] = useState<Map<string, BillFormData>>(new Map())
  const [submitting, setSubmitting] = useState(false)
  const [completedBills, setCompletedBills] = useState<
    { billNumber: string; labName: string; total: number }[]
  >([])

  // ── History filter state ──────────────────────────────────────────────────────
  const [historyDate, setHistoryDate] = useState(todayIST)

  // ── Queries ───────────────────────────────────────────────────────────────────
  const {
    data: patientData,
    isLoading: patientLoading,
    error: patientError,
  } = usePatientInvestigations(searchedPatientId)

  const billsQuery = useLabBills(historyDate || null)

  const createLabBills = useCreateLabBills()

  // ── Patient investigation helpers ─────────────────────────────────────────────

  // Sync bill forms when patient investigation data loads
  React.useEffect(() => {
    if (!patientData) return
    const forms = new Map<string, BillFormData>()
    for (const group of patientData.labGroups) {
      forms.set(group.lab.id, {
        labId: group.lab.id,
        items: [...group.items],
        discount: 0,
        paymentMode: "Cash",
        amountPaid: group.items.reduce((s, i) => s + i.amount, 0),
      })
    }
    setBillForms(forms)
    setCompletedBills([])
  }, [patientData])

  function handleSearch() {
    if (!searchInput.trim()) return
    setSearchedPatientId(searchInput.trim())
  }

  function handleClear() {
    setSearchInput("")
    setSearchedPatientId(null)
    setBillForms(new Map())
    setCompletedBills([])
  }

  function updateBillForm(labId: string, updates: Partial<BillFormData>) {
    setBillForms((prev) => {
      const next = new Map(prev)
      const existing = next.get(labId)
      if (existing) next.set(labId, { ...existing, ...updates })
      return next
    })
  }

  function removeItem(labId: string, investigationId: string) {
    setBillForms((prev) => {
      const next = new Map(prev)
      const existing = next.get(labId)
      if (!existing) return prev
      const newItems = existing.items.filter(
        (i) => i.investigationId !== investigationId,
      )
      const newSubtotal = newItems.reduce((s, i) => s + i.amount, 0)
      next.set(labId, {
        ...existing,
        items: newItems,
        amountPaid: Math.min(
          existing.amountPaid,
          Math.max(0, newSubtotal - existing.discount),
        ),
      })
      return next
    })
  }

  /**
   * Build the CreateLabBillsBody from one BillFormData entry.
   * POST /labs/bills body: { bills: [{ bill, items, payment? }] }
   * Field names from supabase/functions/labs/types.ts:
   *   - bill.total (not totalAmount)
   *   - items[].amount (not price)
   */
  function buildBillEntry(
    form: BillFormData,
    patient: PatientInfo,
    prescription: PrescriptionInfo | null,
  ) {
    const subtotal = form.items.reduce((s, i) => s + i.amount, 0)
    const total = Math.max(0, subtotal - form.discount)
    return {
      bill: {
        patientId: patient.patientId,
        labId: form.labId,
        prescriptionId: prescription?.id ?? null,
        total,
        discount: form.discount,
        discountReason: form.discountReason ?? null,
      },
      items: form.items.map((item) => ({
        investigationId: item.investigationId,
        name: item.name,
        amount: item.amount,
      })),
      payment:
        form.amountPaid > 0
          ? { paymentMode: form.paymentMode, amount: form.amountPaid }
          : undefined,
    }
  }

  async function handleProcessSingle(labId: string) {
    if (!patientData?.patient || !patientData.prescription) return
    const form = billForms.get(labId)
    if (!form || form.items.length === 0) return

    setSubmitting(true)
    const entry = buildBillEntry(form, patientData.patient, patientData.prescription)
    createLabBills.mutate(
      { bills: [entry] },
      {
        onSuccess: () => {
          const labName =
            patientData.labGroups.find((g) => g.lab.id === labId)?.lab.name ?? labId
          const total = Math.max(
            0,
            form.items.reduce((s, i) => s + i.amount, 0) - form.discount,
          )
          setCompletedBills((prev) => [
            ...prev,
            { billNumber: "—", labName, total },
          ])
          setBillForms((prev) => {
            const next = new Map(prev)
            next.delete(labId)
            return next
          })
          setSubmitting(false)
        },
        onError: () => {
          setSubmitting(false)
        },
      },
    )
  }

  async function handleProcessAll() {
    if (!patientData?.patient) return
    const entries = Array.from(billForms.values())
      .filter((b) => b.items.length > 0)
      .map((b) =>
        buildBillEntry(b, patientData.patient, patientData.prescription),
      )
    if (entries.length === 0) return

    setSubmitting(true)
    createLabBills.mutate(
      { bills: entries },
      {
        onSuccess: () => {
          const completed = Array.from(billForms.values())
            .filter((b) => b.items.length > 0)
            .map((b) => {
              const labName =
                patientData.labGroups.find((g) => g.lab.id === b.labId)?.lab
                  .name ?? b.labId
              const total = Math.max(
                0,
                b.items.reduce((s, i) => s + i.amount, 0) - b.discount,
              )
              return { billNumber: "—", labName, total }
            })
          setCompletedBills(completed)
          setBillForms(new Map())
          setSubmitting(false)
        },
        onError: () => {
          setSubmitting(false)
        },
      },
    )
  }

  // ── Bill history columns ──────────────────────────────────────────────────────
  const [expandedBillId, setExpandedBillId] = useState<string | null>(null)

  const billColumns: ColumnDef<LabBillRow>[] = [
    {
      key: "billNumber",
      header: "Bill #",
      cell: (bill) => (
        <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded font-medium">
          {bill.billNumber}
        </span>
      ),
    },
    {
      key: "createdAt",
      header: "Date",
      cell: (bill) => (
        <span className="text-xs text-muted-foreground">
          {new Date(bill.createdAt).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}
        </span>
      ),
    },
    {
      key: "patient",
      header: "Patient",
      cell: (bill) => (
        <div>
          <div className="font-medium text-sm">
            {bill.patient.firstName} {bill.patient.lastName ?? ""}
          </div>
          <div className="text-xs text-muted-foreground font-mono">
            {bill.patient.patientId}
          </div>
        </div>
      ),
    },
    {
      key: "lab",
      header: "Lab",
      cell: (bill) => (
        <span className="text-sm">{bill.lab.name}</span>
      ),
    },
    {
      key: "total",
      header: "Total",
      align: "right",
      cell: (bill) => (
        <span className="text-xs font-medium">{formatINR(bill.total)}</span>
      ),
    },
    {
      key: "amountPaid",
      header: "Paid",
      align: "right",
      cell: (bill) => (
        <span className="text-xs font-medium text-green-600">
          {formatINR(bill.amountPaid)}
        </span>
      ),
    },
    {
      key: "balanceDue",
      header: "Balance",
      align: "right",
      cell: (bill) => (
        <span
          className={
            bill.balanceDue > 0
              ? "text-xs font-medium text-orange-600"
              : "text-xs font-medium text-green-600"
          }
        >
          {bill.balanceDue > 0 ? formatINR(bill.balanceDue) : "Nil"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (bill) => (
        <Badge variant={BILL_STATUS_BADGE[bill.status] ?? "secondary"}>
          {bill.status}
        </Badge>
      ),
    },
  ]

  // ── Render ────────────────────────────────────────────────────────────────────

  const labGroups = patientData?.labGroups ?? []
  const hasActiveGroups = Array.from(billForms.values()).some(
    (b) => b.items.length > 0,
  )

  return (
    <div className="space-y-6">
      {/* ── BILLING SECTION ────────────────────────────────────────────────────── */}
      <section
        aria-label="Generate lab bills"
        className="rounded-[var(--radius-lg)] bg-[var(--color-card)] shadow-[var(--shadow-card)] p-5 space-y-4"
      >
        <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider px-1">
          Generate Lab Bills
        </p>

        {/* Patient search */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              placeholder="Enter Patient ID…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSearch()
              }}
              className="pl-9 bg-white"
              aria-label="Patient ID search"
            />
          </div>
          <Button
            type="button"
            onClick={handleSearch}
            disabled={patientLoading || !searchInput.trim()}
            size="sm"
          >
            {patientLoading && (
              <Loader2 className="h-4 w-4 animate-spin mr-1" aria-hidden="true" />
            )}
            Search
          </Button>
          {searchedPatientId && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={handleClear}
            >
              Clear
            </Button>
          )}
        </div>

        {/* Patient search error */}
        {patientError && !patientLoading && searchedPatientId && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {patientError instanceof Error
              ? patientError.message
              : "Patient not found or has no investigations."}
          </div>
        )}

        {/* Patient info card */}
        {patientData?.patient && (
          <PatientInfoCard
            patient={patientData.patient}
            prescription={patientData.prescription}
          />
        )}

        {/* Existing bills warning */}
        {(patientData?.existingBills?.length ?? 0) > 0 && (
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3">
            <div className="flex items-center gap-2 text-yellow-800 text-sm font-medium mb-1.5">
              <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
              Existing lab bills found for this prescription
            </div>
            {patientData!.existingBills!.map((bill) => (
              <div key={bill.id} className="text-xs text-yellow-700 ml-6">
                {bill.billNumber} — {bill.labName} — {formatINR(bill.total)} (
                {bill.status})
              </div>
            ))}
          </div>
        )}

        {/* Completed bills success */}
        {completedBills.length > 0 && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-3">
            <div className="flex items-center gap-2 text-green-800 text-sm font-medium mb-1.5">
              <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
              Bills Created Successfully
            </div>
            {completedBills.map((bill, i) => (
              <div
                key={`${bill.billNumber}-${i}`}
                className="text-xs text-green-700 ml-6"
              >
                {bill.labName} — {formatINR(bill.total)}
              </div>
            ))}
          </div>
        )}

        {/* No prescription state */}
        {patientData?.patient && !patientData.prescription && (
          <div className="rounded-[var(--radius-lg)] bg-[var(--color-card)] shadow-[var(--shadow-card)] py-12 text-center">
            <FileText
              className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-40"
              aria-hidden="true"
            />
            <p className="font-medium text-muted-foreground">
              No prescription with investigations found
            </p>
          </div>
        )}

        {/* No investigations in prescription */}
        {patientData?.patient &&
          patientData.prescription &&
          labGroups.length === 0 &&
          (patientData.unassigned?.length ?? 0) === 0 &&
          completedBills.length === 0 && (
            <div className="rounded-[var(--radius-lg)] bg-[var(--color-card)] shadow-[var(--shadow-card)] py-12 text-center">
              <FileText
                className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-40"
                aria-hidden="true"
              />
              <p className="font-medium text-muted-foreground">
                No investigations in the latest prescription
              </p>
            </div>
          )}

        {/* Bill cards per lab group */}
        {billForms.size > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">
                Auto-Segregated Bills (
                {billForms.size} lab{billForms.size !== 1 ? "s" : ""})
              </p>
              {billForms.size > 1 && can("labs:create") && hasActiveGroups && (
                <Button
                  type="button"
                  onClick={() => void handleProcessAll()}
                  disabled={submitting}
                  size="sm"
                >
                  {submitting && (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" aria-hidden="true" />
                  )}
                  Process All
                </Button>
              )}
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              {labGroups
                .filter((g) => billForms.has(g.lab.id))
                .map((group) => {
                  const form = billForms.get(group.lab.id)!
                  return (
                    <BillCard
                      key={group.lab.id}
                      lab={group.lab}
                      form={form}
                      onUpdateDiscount={(v) =>
                        updateBillForm(group.lab.id, { discount: v })
                      }
                      onUpdateDiscountReason={(v) =>
                        updateBillForm(group.lab.id, { discountReason: v })
                      }
                      onUpdatePaymentMode={(v) =>
                        updateBillForm(group.lab.id, { paymentMode: v })
                      }
                      onUpdateAmountPaid={(v) =>
                        updateBillForm(group.lab.id, { amountPaid: v })
                      }
                      onRemoveItem={(invId) => removeItem(group.lab.id, invId)}
                      onProcess={() => void handleProcessSingle(group.lab.id)}
                      submitting={submitting}
                    />
                  )
                })}
            </div>
          </div>
        )}

        {/* Unassigned investigations warning */}
        {(patientData?.unassigned?.length ?? 0) > 0 && (
          <div className="rounded-lg border border-orange-200 bg-orange-50 p-3">
            <div className="flex items-center gap-2 text-orange-800 text-sm font-medium mb-1.5">
              <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
              Unassigned Investigations (not mapped to any lab)
            </div>
            {patientData!.unassigned.map((inv) => (
              <div key={inv.name} className="text-xs text-orange-700 ml-6">
                {inv.name}
                {inv.alreadyBilled && (
                  <span className="ml-1 text-orange-500">(already billed)</span>
                )}
              </div>
            ))}
            <p className="text-xs text-orange-600 mt-2 ml-6">
              Configure these in the Lab Configuration tab to enable billing.
            </p>
          </div>
        )}
      </section>

      {/* ── HISTORY SECTION ────────────────────────────────────────────────────── */}
      <section aria-label="Lab bills history">
        {/* Filter bar */}
        <PageToolbar className="mb-3">
          <div>
            <label className="text-xs text-muted-foreground block mb-1" htmlFor="history-date">
              Date
            </label>
            <div className="flex items-center gap-2">
              <Input
                id="history-date"
                type="date"
                value={historyDate}
                onChange={(e) => setHistoryDate(e.target.value)}
                className="h-9 w-40 bg-white text-sm"
                aria-label="History date filter"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9"
                onClick={() => void billsQuery.refetch()}
                aria-label="Refresh bill history"
              >
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              </Button>
            </div>
          </div>
        </PageToolbar>

        {/* Bill history table */}
        <PaginatedDataTable
          mode="offset"
          aria-label="Lab bills history"
          data={billsQuery.data}
          columns={billColumns}
          isLoading={billsQuery.isLoading}
          isFetching={billsQuery.isFetching}
          isError={billsQuery.isError}
          error={billsQuery.error}
          onRetry={() => void billsQuery.refetch()}
          page={billsQuery.page}
          pageSize={billsQuery.pageSize}
          total={billsQuery.total}
          onPageChange={billsQuery.setPage}
          onPageSizeChange={billsQuery.setPageSize}
          showPageSizeSelector
          onRowClick={(bill) =>
            setExpandedBillId(
              expandedBillId === bill.id ? null : bill.id,
            )
          }
          rowClassName={(bill) =>
            expandedBillId === bill.id ? "bg-muted/30" : undefined
          }
          emptyState={
            <EmptyState
              title="No lab bills found"
              description="Lab bills will appear here once created."
              icon={<FlaskConical className="h-8 w-8" aria-hidden="true" />}
            />
          }
        />

        {/* Expanded bill detail — shown below the table row via a separate panel */}
        {expandedBillId && (() => {
          const bill = billsQuery.data.find((b) => b.id === expandedBillId)
          if (!bill) return null
          return (
            <div className="rounded-[var(--radius-lg)] bg-muted/30 shadow-[var(--shadow-card)] px-6 py-4 mt-2 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                Investigations:
              </p>
              <div className="space-y-0.5 max-w-md">
                {bill.items.map((item, i) => (
                  <div
                    key={i}
                    className="flex justify-between text-sm"
                  >
                    <span>{item.name}</span>
                    <span className="font-medium">
                      {formatINR(item.amount)}
                    </span>
                  </div>
                ))}
              </div>
              {bill.discount > 0 && (
                <div className="flex justify-between text-sm text-muted-foreground max-w-md">
                  <span>Discount</span>
                  <span>-{formatINR(bill.discount)}</span>
                </div>
              )}
              {bill.paymentMode && (
                <div className="text-xs text-muted-foreground">
                  Payment: {bill.paymentMode}
                </div>
              )}
            </div>
          )
        })()}
      </section>
    </div>
  )
}

// ─── PatientInfoCard ──────────────────────────────────────────────────────────

function PatientInfoCard({
  patient,
  prescription,
}: {
  patient: PatientInfo
  prescription: PrescriptionInfo | null
}) {
  return (
    <div className="rounded-[var(--radius-lg)] bg-[var(--color-card)] shadow-[var(--shadow-card)] p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 shrink-0">
          <User className="h-5 w-5 text-primary" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm">{patient.name}</span>
            <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded font-medium">
              {patient.patientId}
            </span>
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {[
              patient.age && `${patient.age}y`,
              patient.gender,
              patient.phone,
              patient.doctorName && `Dr. ${patient.doctorName}`,
            ]
              .filter(Boolean)
              .join(" · ")}
          </div>
        </div>
        {prescription && (
          <div className="text-right shrink-0">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <FileText className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="font-mono">{prescription.prescriptionNumber}</span>
            </div>
            <div className="text-xs text-muted-foreground">
              {new Date(prescription.prescriptionDate).toLocaleDateString(
                "en-IN",
                { day: "2-digit", month: "short", year: "numeric" },
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
