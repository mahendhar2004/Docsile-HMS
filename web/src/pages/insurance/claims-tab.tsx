/**
 * insurance/claims-tab.tsx
 *
 * Insurance Claims list tab:
 * - Status filter (SingleSelect)
 * - PaginatedDataTable with StatusPill using the real 13-value InsuranceClaimStatus enum
 * - Click row to open ClaimDetailPanel (Sheet)
 * - "+ New Claim" button (insurance:create gated)
 *
 * Endpoints:
 *   GET /insurance/claims?page=N&pageSize=N&status=... — insurance:view
 *   POST /insurance/claims (via CreateClaimForm) — insurance:create
 */

import { useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  PaginatedDataTable,
  StatusPill,
  EmptyState,
  SingleSelect,
  PageToolbar,
} from "@/components/patterns"
import type { ColumnDef } from "@/components/patterns"
import { usePermissions } from "@/hooks/usePermissions"
import { useInsuranceClaims } from "./hooks"
import { CreateClaimForm } from "./create-claim-form"
import { ClaimDetailPanel } from "./claim-detail-panel"
import { CLAIM_STATUS_FILTER_OPTIONS } from "./types"
import type { InsuranceClaim } from "./types"
import { formatDate, formatCurrency } from "@/lib/utils"

// ─── ClaimsTab ────────────────────────────────────────────────────────────────

export function ClaimsTab() {
  const { can } = usePermissions()
  const canCreate = can("insurance:create")

  // ── Status filter ────────────────────────────────────────────────────────────
  const [statusFilter, setStatusFilter] = useState("")

  // ── Paginated claim list ─────────────────────────────────────────────────────
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
  } = useInsuranceClaims(statusFilter)

  // ── Create claim ─────────────────────────────────────────────────────────────
  const [showCreate, setShowCreate] = useState(false)

  // ── Claim detail ─────────────────────────────────────────────────────────────
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null)

  // ── Table columns ────────────────────────────────────────────────────────────
  const columns: ColumnDef<InsuranceClaim>[] = [
    {
      key: "claimNumber",
      header: "Claim #",
      cell: (row) => (
        <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
          {row.claimNumber}
        </span>
      ),
      minWidth: "110px",
    },
    {
      key: "patientName",
      header: "Patient",
      cell: (row) => (
        <div>
          <p className="font-medium text-sm">{row.patientName}</p>
          <p className="text-xs text-muted-foreground">
            {row.ipNumber} &bull; {row.age}y/{row.gender.charAt(0)}
          </p>
        </div>
      ),
      minWidth: "160px",
    },
    {
      key: "insuranceCompanyName",
      header: "Insurer",
      cell: (row) => (
        <div>
          <p className="text-sm">{row.insuranceCompanyName}</p>
          {row.tpaName && (
            <p className="text-xs text-muted-foreground">{row.tpaName}</p>
          )}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => <StatusPill status={row.status} />,
    },
    {
      key: "totalBillAmount",
      header: "Bill Amount",
      align: "right",
      cell: (row) => (
        <span className="text-sm font-medium">
          {formatCurrency(row.totalBillAmount)}
        </span>
      ),
    },
    {
      key: "patientBalance",
      header: "Balance",
      align: "right",
      cell: (row) => (
        <span
          className={`text-sm font-medium ${
            row.patientBalance > 0 ? "text-orange-600" : "text-green-600"
          }`}
        >
          {formatCurrency(row.patientBalance)}
        </span>
      ),
    },
    {
      key: "admissionDate",
      header: "Admitted",
      cell: (row) => (
        <span className="text-sm text-muted-foreground">
          {row.admissionDate ? formatDate(row.admissionDate) : "—"}
        </span>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      {/* ── Toolbar ──────────────────────────────────────────────────────────── */}
      <PageToolbar>
        {/* Status filter */}
        <div className="w-52">
          <SingleSelect
            options={CLAIM_STATUS_FILTER_OPTIONS}
            value={statusFilter}
            onChange={(v) => {
              setStatusFilter(v)
            }}
            placeholder="All Statuses"
            aria-label="Filter by claim status"
          />
        </div>

        {/* New claim button */}
        {canCreate && (
          <Button size="sm" onClick={() => setShowCreate(true)} className="ml-auto">
            <Plus className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
            New Claim
          </Button>
        )}
      </PageToolbar>

      {/* ── Claims table ─────────────────────────────────────────────────────── */}
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
        onRowClick={(row) => setSelectedClaimId(row.id)}
        emptyState={
          <EmptyState
            title={statusFilter ? "No claims with this status" : "No insurance claims yet"}
            description={
              statusFilter
                ? "Try a different status filter or clear the filter to see all claims."
                : "File your first claim to start tracking insurance reimbursements."
            }
            action={
              canCreate && !statusFilter
                ? { label: "New Claim", onClick: () => setShowCreate(true) }
                : undefined
            }
          />
        }
        aria-label="Insurance claims table"
      />

      {/* ── Create claim dialog ───────────────────────────────────────────────── */}
      <CreateClaimForm
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSuccess={(claimNumber) => {
          setShowCreate(false)
          void refetch()
          // Optionally show the newly created claim by number — but we don't have
          // the ID yet. The list will refetch and the user can click the row.
          void claimNumber
        }}
      />

      {/* ── Claim detail panel ────────────────────────────────────────────────── */}
      <ClaimDetailPanel
        claimId={selectedClaimId}
        onClose={() => {
          setSelectedClaimId(null)
          void refetch()
        }}
      />
    </div>
  )
}
