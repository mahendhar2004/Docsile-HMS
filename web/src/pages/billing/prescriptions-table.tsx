/**
 * billing/prescriptions-table.tsx
 *
 * PaginatedDataTable listing prescriptions with billing amounts and payment status.
 * Clicking a row opens the PrescriptionDetailPanel.
 * Consumes: GET /billing/prescriptions?date=YYYY-MM-DD&page=N&pageSize=N
 */

import { useState } from "react"
import { EmptyState, PaginatedDataTable, StatusPill } from "@/components/patterns"
import type { ColumnDef } from "@/components/patterns"
import { PrescriptionDetailPanel } from "./prescription-detail-panel"
import { useBillingPrescriptions } from "./hooks"
import type { BillingPrescription } from "./types"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
  }).format(new Date(iso))
}

// ─── Column definitions ───────────────────────────────────────────────────────

const COLUMNS: ColumnDef<BillingPrescription>[] = [
  {
    key: "prescriptionNumber",
    header: "Rx #",
    cell: (row) => (
      <span className="font-mono text-xs text-[var(--color-foreground)]">
        {row.prescriptionNumber}
      </span>
    ),
  },
  {
    key: "patientId",
    header: "Patient ID",
    cell: (row) => (
      <span className="font-medium text-sm">{row.patientId}</span>
    ),
  },
  {
    key: "doctorName",
    header: "Doctor",
    cell: (row) => (
      <span className="text-sm text-[var(--color-muted-foreground)]">
        {row.doctorName ?? "—"}
      </span>
    ),
  },
  {
    key: "prescriptionDate",
    header: "Date",
    cell: (row) => (
      <span className="text-sm tabular-nums">
        {formatDate(row.prescriptionDate)}
      </span>
    ),
  },
  {
    key: "total",
    header: "Total",
    cell: (row) => (
      <span className="text-sm tabular-nums font-medium">{formatINR(row.total)}</span>
    ),
  },
  {
    key: "amountPaid",
    header: "Collected",
    cell: (row) => (
      <span className="text-sm tabular-nums text-[var(--color-success)]">
        {formatINR(row.amountPaid)}
      </span>
    ),
  },
  {
    key: "balanceDue",
    header: "Balance",
    cell: (row) => (
      <span
        className={`text-sm tabular-nums font-medium ${
          row.balanceDue > 0
            ? "text-[var(--color-error)]"
            : "text-[var(--color-muted-foreground)]"
        }`}
      >
        {formatINR(row.balanceDue)}
      </span>
    ),
  },
  {
    key: "status",
    header: "Status",
    cell: (row) => <StatusPill status={row.status} />,
  },
]

// ─── Props ────────────────────────────────────────────────────────────────────

interface PrescriptionsTableProps {
  /** Filter date (YYYY-MM-DD). Null shows all prescriptions across dates. */
  date: string | null
  canCreate: boolean
  canDelete: boolean
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PrescriptionsTable({
  date,
  canCreate,
  canDelete,
}: PrescriptionsTableProps) {
  const [selectedPrescription, setSelectedPrescription] =
    useState<BillingPrescription | null>(null)

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
  } = useBillingPrescriptions(date)

  return (
    <>
      <PaginatedDataTable
        mode="offset"
        data={data}
        columns={COLUMNS}
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
        onRowClick={(row) => setSelectedPrescription(row)}
        rowClassName={() =>
          "cursor-pointer hover:bg-[var(--color-accent)]/5 transition-colors"
        }
        aria-label="Prescriptions with billing details"
        emptyState={
          <EmptyState
            title="No prescriptions found"
            description={
              date
                ? "No prescriptions were issued on this date."
                : "No prescriptions found. Prescriptions appear here once created via the Doctor module."
            }
          />
        }
      />

      <PrescriptionDetailPanel
        prescription={selectedPrescription}
        open={selectedPrescription != null}
        onClose={() => setSelectedPrescription(null)}
        canCreate={canCreate}
        canDelete={canDelete}
      />
    </>
  )
}
