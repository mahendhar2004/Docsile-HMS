/**
 * dues-tab.tsx
 *
 * Dues dashboard — paginated list of outstanding balances across OPD, IPD, LAB,
 * and PHARMACY modules. Each row has a "Mark as Paid" action (dues:edit gated),
 * confirmed via ConfirmationModal since it is a money-affecting action.
 *
 * Data source: GET /dues-followups/dues (offset-paginated, date-desc sort)
 * Mutation:    PATCH /dues-followups/dues/{id}/mark-paid
 */

import { useState, forwardRef, useImperativeHandle } from "react"
import { IndianRupee } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  PaginatedDataTable,
  ConfirmationModal,
  EmptyState,
  StatCard,
  SearchBar,
  SingleSelect,
  type ColumnDef,
  type SelectOption,
} from "@/components/patterns"
import { usePermissions } from "@/hooks/usePermissions"
import { formatDateLong } from "@/lib/utils"
import { useDues, useDuesSummary, useMarkPaid, type DuesFilters } from "./hooks"
import { dueTypeToMarkPaidType } from "./types"
import { WhatsAppButton } from "./whatsapp-button"
import type { DueRecord, DueType } from "./types"

// ─── Filter options — matches main's DuesTab.tsx <Select> option sets ───────

const TYPE_OPTIONS: SelectOption[] = [
  { value: "ALL", label: "All Types" },
  { value: "OPD", label: "OPD" },
  { value: "IPD", label: "IPD" },
  { value: "LAB", label: "Lab" },
  { value: "PHARMACY", label: "Pharmacy" },
]

const SORT_OPTIONS: SelectOption[] = [
  { value: "date_desc", label: "Newest First" },
  { value: "date_asc", label: "Oldest First" },
  { value: "amount_desc", label: "Highest Due" },
  { value: "amount_asc", label: "Lowest Due" },
]

function getDueWhatsAppMessage(due: DueRecord): string {
  return `Hello ${due.patientName}, this is a reminder. You have an outstanding balance of Rs. ${due.balanceDue.toLocaleString("en-IN")} for services on ${formatDateLong(due.date)}. Please arrange for payment at your earliest convenience. Thank you.`
}

// ─── Formatting helpers ───────────────────────────────────────────────────────

function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

// ─── Badge variant per due type ───────────────────────────────────────────────
// Matches the old DuesTab.tsx: LAB→info, OPD→secondary, PHARMACY→warning, IPD→outline.

function dueBadgeVariant(
  type: DueType,
): "info" | "secondary" | "warning" | "outline" {
  switch (type) {
    case "OPD":
      return "secondary"
    case "LAB":
      return "info"
    case "PHARMACY":
      return "warning"
    case "IPD":
    default:
      return "outline"
  }
}

// ─── DuesTab ──────────────────────────────────────────────────────────────────

export interface DuesTabHandle {
  /** Refetches the current page — main's header Refresh button lives one level up. */
  refetch: () => void
}

export const DuesTab = forwardRef<DuesTabHandle>(function DuesTab(_props, ref) {
  const { can } = usePermissions()
  const canEdit = can("dues:edit")

  const [payTarget, setPayTarget] = useState<DueRecord | null>(null)

  // Filter bar state — matches main's DuesTab.tsx exactly (search/type/sort
  // are reactive, no Apply button; main's own `useEffect(loadDues, [...])`
  // re-fetches on every change).
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState<DueType | "ALL">("ALL")
  const [sortBy, setSortBy] = useState<DuesFilters["sortBy"]>("date_desc")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

  const filters: DuesFilters = {
    search: search.trim() || undefined,
    type: typeFilter,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    sortBy,
  }

  const {
    data,
    total,
    isLoading,
    isFetching,
    isError,
    error,
    page,
    pageSize,
    setPage,
    refetch,
  } = useDues(filters)

  const { data: summary, isLoading: isSummaryLoading } = useDuesSummary()

  useImperativeHandle(ref, () => ({
    refetch: () => void refetch(),
  }))

  const markPaid = useMarkPaid(() => setPayTarget(null))

  // ── Column definitions ────────────────────────────────────────────────────

  const columns: ColumnDef<DueRecord>[] = [
    {
      key: "patient",
      header: "Patient",
      cell: (row) => (
        <div>
          <div className="font-medium text-sm">{row.patientName}</div>
          <div className="text-xs text-muted-foreground">
            {row.uhid}
            {row.phone ? ` · ${row.phone}` : ""}
          </div>
        </div>
      ),
    },
    {
      key: "type",
      header: "Type",
      cell: (row) => (
        <Badge variant={dueBadgeVariant(row.type)} size="sm">
          {row.type}
        </Badge>
      ),
    },
    {
      key: "services",
      header: "Services / Package",
      cell: (row) => (
        <div>
          <span className="text-xs text-muted-foreground line-clamp-1 max-w-48 block">
            {row.services}
          </span>
          {row.prescriptionNumber != null && (
            <div className="text-[10px] font-mono text-muted-foreground/70">
              {row.prescriptionNumber}
            </div>
          )}
          {row.labBillNumber != null && (
            <div className="text-[10px] font-mono text-muted-foreground/70">
              {row.labBillNumber}
            </div>
          )}
          {row.pharmacyBillNumber != null && (
            <div className="text-[10px] font-mono text-muted-foreground/70">
              {row.pharmacyBillNumber}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "totalAmount",
      header: "Total",
      align: "right",
      cell: (row) => (
        <span className="text-sm">{formatINR(row.totalAmount)}</span>
      ),
    },
    {
      key: "amountPaid",
      header: "Paid",
      align: "right",
      cell: (row) => (
        <span className="text-sm text-green-600">{formatINR(row.amountPaid)}</span>
      ),
    },
    {
      key: "balanceDue",
      header: "Balance Due",
      align: "right",
      cell: (row) => (
        <span className="font-semibold text-sm text-red-600">
          {formatINR(row.balanceDue)}
        </span>
      ),
    },
    {
      key: "date",
      header: "Date",
      cell: (row) => (
        <span className="text-xs text-muted-foreground">{formatDate(row.date)}</span>
      ),
    },
  ]

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Filter bar — matches main's DuesTab.tsx FilterBar exactly: search,
          type, sort, and a From/To date range. All reactive (no Apply
          button), resetting to page 1 on every change. */}
      <div className="flex items-center gap-2.5 flex-wrap">
        <SearchBar
          variant="standalone"
          value={search}
          onChange={(v) => {
            setSearch(v)
            setPage(1)
          }}
          placeholder="Search name, phone, ID…"
          aria-label="Search dues"
          className="w-56"
        />
        <SingleSelect
          options={TYPE_OPTIONS}
          value={typeFilter}
          onChange={(v) => {
            setTypeFilter(v as DueType | "ALL")
            setPage(1)
          }}
          className="w-32"
          aria-label="Filter by type"
        />
        <SingleSelect
          options={SORT_OPTIONS}
          value={sortBy ?? "date_desc"}
          onChange={(v) => {
            setSortBy(v as DuesFilters["sortBy"])
            setPage(1)
          }}
          className="w-40"
          aria-label="Sort dues"
        />
        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => {
            setDateFrom(e.target.value)
            setPage(1)
          }}
          className="w-36 h-9"
          aria-label="From date"
        />
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => {
            setDateTo(e.target.value)
            setPage(1)
          }}
          className="w-36 h-9"
          aria-label="To date"
        />
      </div>

      {/* Summary tiles — matches main's DuesTab (Total Outstanding + per-type
          OPD/IPD/LAB/PHARMACY totals), computed over every outstanding due
          server-side, not just the current page. */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <StatCard
          label="Total Outstanding"
          value={formatINR(summary?.totalOutstanding ?? 0)}
          loading={isSummaryLoading}
        />
        <StatCard
          label={`OPD (${summary?.opdCount ?? 0})`}
          value={formatINR(summary?.opdTotal ?? 0)}
          loading={isSummaryLoading}
        />
        <StatCard
          label={`IPD (${summary?.ipdCount ?? 0})`}
          value={formatINR(summary?.ipdTotal ?? 0)}
          loading={isSummaryLoading}
        />
        <StatCard
          label={`Lab (${summary?.labCount ?? 0})`}
          value={formatINR(summary?.labTotal ?? 0)}
          loading={isSummaryLoading}
        />
        <StatCard
          label={`Pharmacy (${summary?.pharmacyCount ?? 0})`}
          value={formatINR(summary?.pharmacyTotal ?? 0)}
          loading={isSummaryLoading}
        />
      </div>

      {/* Summary line */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {isLoading ? "Loading…" : `${total.toLocaleString("en-IN")} outstanding record${total !== 1 ? "s" : ""}`}
        </p>
      </div>

      <PaginatedDataTable
        mode="offset"
        data={data}
        columns={columns}
        variant="with-row-actions"
        rowActions={(row) => (
          <div className="flex items-center justify-end gap-1">
            {/* WhatsApp reminder — visible regardless of dues:edit, matching
                main (it's a read-only external deep link, not a mutation). */}
            <WhatsAppButton phone={row.phone} message={getDueWhatsAppMessage(row)} />
            {canEdit && (
              <button
                type="button"
                onClick={() => setPayTarget(row)}
                title="Mark as Paid"
                aria-label={`Mark ${row.patientName}'s due as paid`}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-50 transition-colors"
              >
                <IndianRupee className="h-3.5 w-3.5" aria-hidden="true" />
                Mark Paid
              </button>
            )}
          </div>
        )}
        isLoading={isLoading}
        isFetching={isFetching}
        isError={isError}
        error={error}
        onRetry={refetch}
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={setPage}
        showPageSizeSelector
        emptyState={
          <EmptyState
            title="No outstanding dues"
            description="All payments are up to date."
          />
        }
        aria-label="Outstanding dues table"
      />

      {/* Mark as Paid confirmation */}
      {payTarget != null && (
        <ConfirmationModal
          open={payTarget != null}
          onOpenChange={(open) => {
            if (!open) setPayTarget(null)
          }}
          variant="warning"
          title="Mark as Paid?"
          description={`This will mark ${payTarget.patientName}'s outstanding balance of ${formatINR(payTarget.balanceDue)} as fully paid. This action cannot be reversed.`}
          confirmLabel="Mark as Paid"
          onConfirm={() =>
            markPaid.mutate({
              id: payTarget.id,
              body: { type: dueTypeToMarkPaidType(payTarget.type) },
            })
          }
          isLoading={markPaid.isPending}
        />
      )}
    </div>
  )
})
