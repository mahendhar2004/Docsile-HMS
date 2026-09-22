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

import { useState } from "react"
import { IndianRupee } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  PaginatedDataTable,
  ConfirmationModal,
  EmptyState,
  type ColumnDef,
} from "@/components/patterns"
import { usePermissions } from "@/hooks/usePermissions"
import { useDues, useMarkPaid } from "./hooks"
import { dueTypeToMarkPaidType } from "./types"
import type { DueRecord, DueType } from "./types"

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

export function DuesTab() {
  const { can } = usePermissions()
  const canEdit = can("dues:edit")

  const [payTarget, setPayTarget] = useState<DueRecord | null>(null)

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
  } = useDues()

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
        variant={canEdit ? "with-row-actions" : "standard"}
        rowActions={
          canEdit
            ? (row) => (
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
              )
            : undefined
        }
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
}
