/**
 * optical/bills-tab.tsx
 *
 * Optical bills list + create new bill:
 *   - GET /optical/bills           (optical:view)
 *   - POST /optical/bills          (optical:create)
 *   - PATCH /optical/bills/{id}/status (optical:edit)
 */

import { useState } from "react"
import { Plus, ChevronDown, Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  PaginatedDataTable,
  EmptyState,
  StatusPill,
  SingleSelect,
} from "@/components/patterns"
import type { ColumnDef } from "@/components/patterns"
import { OpticalBillForm } from "./optical-bill-form"
import { OpticalBillPrintModal } from "./optical-bill-print-modal"
import { useOpticalBills, useUpdateBillStatus } from "./hooks"
import type { OpticalBillRow } from "./types"
import { OPTICAL_BILL_STATUSES } from "./types"

function formatINR(n: number) {
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

interface BillsTabProps {
  canCreate: boolean
  canEdit: boolean
}

export function BillsTab({ canCreate, canEdit }: BillsTabProps) {
  const [dateFilter, setDateFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [showCreate, setShowCreate] = useState(false)
  const [printBill, setPrintBill] = useState<OpticalBillRow | null>(null)

  const {
    data,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
    page,
    pageSize,
    total,
    setPage,
    setPageSize,
  } = useOpticalBills({
    date: dateFilter || undefined,
    status: statusFilter || undefined,
  })

  const updateStatus = useUpdateBillStatus()

  const columns: ColumnDef<OpticalBillRow>[] = [
    {
      key: "billNumber",
      header: "Bill No.",
      cell: (b) => (
        <span className="font-mono text-xs font-semibold">{b.billNumber}</span>
      ),
    },
    {
      key: "patientName",
      header: "Patient",
      cell: (b) => (
        <div>
          <p className="font-medium text-sm">{b.patientName}</p>
          {b.patientPhone && (
            <p className="text-xs text-muted-foreground">{b.patientPhone}</p>
          )}
        </div>
      ),
    },
    {
      key: "billDate",
      header: "Date",
      cell: (b) => (
        <span className="text-sm">{formatDate(b.billDate)}</span>
      ),
    },
    {
      key: "billAmount",
      header: "Amount",
      cell: (b) => (
        <span className="text-sm font-semibold tabular-nums">
          {formatINR(b.billAmount)}
        </span>
      ),
    },
    {
      key: "paidAmount",
      header: "Paid",
      cell: (b) => (
        <span className="text-sm tabular-nums">{formatINR(b.paidAmount)}</span>
      ),
    },
    {
      key: "balanceDue",
      header: "Balance",
      cell: (b) => (
        <span
          className={`text-sm tabular-nums font-medium ${b.balanceDue > 0 ? "text-destructive" : "text-success"}`}
        >
          {formatINR(b.balanceDue)}
        </span>
      ),
    },
    {
      key: "paymentMode",
      header: "Mode",
      cell: (b) => (
        <span className="text-sm text-muted-foreground">{b.paymentMode}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (b) => <StatusPill status={b.status} />,
    },
    {
      key: "print",
      header: "",
      align: "center",
      cell: (b) => (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 text-muted-foreground hover:text-primary"
          onClick={() => setPrintBill(b)}
          aria-label={`Print bill ${b.billNumber}`}
        >
          <Printer className="h-3.5 w-3.5" aria-hidden />
        </Button>
      ),
    },
    ...(canEdit
      ? [
          {
            key: "id",
            header: "",
            cell: (b: OpticalBillRow) => (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Change status for bill ${b.billNumber}`}
                  >
                    Status <ChevronDown className="h-3 w-3 ml-1" aria-hidden="true" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {OPTICAL_BILL_STATUSES.filter((s) => s !== b.status).map(
                    (s) => (
                      <DropdownMenuItem
                        key={s}
                        onClick={() =>
                          updateStatus.mutate({ id: b.id, status: s })
                        }
                      >
                        Mark {s}
                      </DropdownMenuItem>
                    ),
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            ),
          } satisfies ColumnDef<OpticalBillRow>,
        ]
      : []),
  ]

  return (
    <div className="space-y-4">
      {/* Filter bar — plain bordered card, not the sticky PageToolbar/FilterBar;
          matches main's exact Bill History card treatment. */}
      <div className="rounded-xl border border-border bg-white p-4 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="h-8 text-sm w-40"
            aria-label="Filter by date"
          />
          {dateFilter && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDateFilter("")}
              aria-label="Clear date filter"
            >
              Clear
            </Button>
          )}
        </div>

        <SingleSelect
          options={OPTICAL_BILL_STATUSES.map((s) => ({ value: s, label: s }))}
          value={statusFilter}
          onChange={(v) => setStatusFilter(v ?? "")}
          placeholder="All statuses"
          aria-label="Filter by status"
        />
        {statusFilter && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStatusFilter("")}
            aria-label="Clear status filter"
          >
            Clear
          </Button>
        )}

        {canCreate && (
          <Button size="sm" onClick={() => setShowCreate(true)} className="ml-auto">
            <Plus className="h-4 w-4 mr-1.5" aria-hidden="true" />
            New Bill
          </Button>
        )}
      </div>

      {/* Paginated table */}
      <PaginatedDataTable
        mode="offset"
        data={data}
        columns={columns}
        isLoading={isLoading}
        isFetching={isFetching}
        isError={isError}
        error={error}
        onRetry={refetch}
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        showPageSizeSelector
        pageSizeOptions={[25, 50, 100]}
        skeletonRows={8}
        aria-label="Optical bills table"
        emptyState={
          <EmptyState
            title="No bills found"
            description={
              dateFilter
                ? "No optical bills for this date."
                : "No optical bills yet — create the first one."
            }
            action={
              canCreate
                ? { label: "New Bill", onClick: () => setShowCreate(true) }
                : undefined
            }
          />
        }
      />

      {/* New Bill Sheet */}
      <Sheet open={showCreate} onOpenChange={(v) => { if (!v) setShowCreate(false) }}>
        <SheetContent side="right" className="w-full sm:max-w-5xl overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle>New Optical Bill</SheetTitle>
          </SheetHeader>
          <OpticalBillForm
            onSuccess={() => setShowCreate(false)}
            onCancel={() => setShowCreate(false)}
          />
        </SheetContent>
      </Sheet>

      {/* Print preview */}
      <OpticalBillPrintModal
        open={printBill != null}
        onClose={() => setPrintBill(null)}
        bill={printBill}
      />
    </div>
  )
}
