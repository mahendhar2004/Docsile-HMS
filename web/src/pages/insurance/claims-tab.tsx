/**
 * insurance/claims-tab.tsx
 *
 * Main Insurance view (not a tab anymore — see InsurancePage.tsx), matching
 * main's single-list-page layout (src/app/(hospital)/insurance/components/
 * InsurancePage.tsx):
 * - 3 header StatBadges (Active, Preauth Pending, Awaiting Settlement)
 * - Status filter + "Companies" button (opens a Sheet, not a tab) +
 *   "+ New Claim" button (no search input — see note further down)
 * - PaginatedDataTable with StatusPill using the real 13-value InsuranceClaimStatus enum
 * - Click row to open ClaimDetailPanel (Sheet)
 *
 * Stat badges: verified against main's actual aggregation
 * (src/app/(hospital)/insurance/actions.ts getInsuranceClaims stats, and
 * InsurancePage.tsx's StatBadge wiring) rather than approximated — "Active"
 * = all claims except CLOSED (stats.totalClaims — main does NOT also
 * exclude SETTLED/CLAIM_REJECTED, corrected during final review),
 * "Preauth Pending" = PREAUTH_SUBMITTED + PREAUTH_QUERY, "Awaiting
 * Settlement" = FINAL_BILL_SUBMITTED only (main does NOT include
 * PARTIALLY_SETTLED here, corrected during final review). Since GET
 * /insurance/claims only filters by one status at a time, computed via a
 * few extra lightweight calls to the same hook (only `.total` is read)
 * rather than fetching the whole list client-side (claims aren't bounded
 * to "today" like other modules' queues).
 *
 * Endpoints:
 *   GET /insurance/claims?page=N&pageSize=N&status=... — insurance:view
 *   POST /insurance/claims (via CreateClaimForm) — insurance:create
 */

import { useState } from "react"
import { Plus, Building2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetBody,
} from "@/components/ui/sheet"
import {
  PaginatedDataTable,
  StatusPill,
  StatBadge,
  EmptyState,
  SingleSelect,
  PageToolbar,
} from "@/components/patterns"
import type { ColumnDef } from "@/components/patterns"
import { usePermissions } from "@/hooks/usePermissions"
import { useInsuranceClaims } from "./hooks"
import { CreateClaimForm } from "./create-claim-form"
import { ClaimDetailPanel } from "./claim-detail-panel"
import { CompaniesTab } from "./companies-tab"
import { CLAIM_STATUS_FILTER_OPTIONS } from "./types"
import type { InsuranceClaim } from "./types"
import { formatCurrency } from "@/lib/utils"

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

  // ── Header stat badges (real, status-bucketed — see file header) ────────────
  const grandTotalQuery = useInsuranceClaims("")
  const closedQuery = useInsuranceClaims("CLOSED")
  const preauthSubmittedQuery = useInsuranceClaims("PREAUTH_SUBMITTED")
  const preauthQueryQuery = useInsuranceClaims("PREAUTH_QUERY")
  const finalBillQuery = useInsuranceClaims("FINAL_BILL_SUBMITTED")
  // Matches main's getInsuranceClaims() stats exactly: totalClaims excludes
  // only CLOSED (not SETTLED/CLAIM_REJECTED too), settlementPending is
  // FINAL_BILL_SUBMITTED only (not + PARTIALLY_SETTLED) — corrected during
  // final review, also cutting the extra queries from 8 to 4.
  const activeCount = grandTotalQuery.total - closedQuery.total
  const preauthPendingCount = preauthSubmittedQuery.total + preauthQueryQuery.total
  const awaitingSettlementCount = finalBillQuery.total

  // ── Create claim ─────────────────────────────────────────────────────────────
  const [showCreate, setShowCreate] = useState(false)

  // ── Companies ─────────────────────────────────────────────────────────────────
  const [showCompanies, setShowCompanies] = useState(false)

  // ── Claim detail ─────────────────────────────────────────────────────────────
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null)

  // ── Table columns ────────────────────────────────────────────────────────────
  // Main's exact 10 columns (InsurancePage.tsx claims table), in order —
  // ported during final review, the original only had 7.
  const columns: ColumnDef<InsuranceClaim>[] = [
    {
      key: "claimNumber",
      header: "Claim No",
      cell: (row) => (
        <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
          {row.claimNumber}
        </span>
      ),
      minWidth: "110px",
    },
    {
      key: "patientName",
      header: "Patient / IP",
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
      header: "Insurance Company",
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
      key: "totalBillAmount",
      header: "Total Claimed",
      align: "right",
      cell: (row) => (
        <span className="text-sm font-medium">
          {formatCurrency(row.totalBillAmount)}
        </span>
      ),
    },
    {
      key: "preauthAmount",
      header: "Preauth",
      align: "right",
      cell: (row) => (
        <span className="text-sm">{formatCurrency(row.preauthAmount)}</span>
      ),
    },
    {
      key: "enhancementApproved",
      header: "Enhancement",
      align: "right",
      cell: (row) => (
        <span className="text-sm">{formatCurrency(row.enhancementApproved)}</span>
      ),
    },
    {
      key: "totalApprovedAmount",
      header: "Total Approved",
      align: "right",
      cell: (row) => (
        <span className="text-sm">{formatCurrency(row.totalApprovedAmount)}</span>
      ),
    },
    {
      key: "finalSettledAmount",
      header: "Settled",
      align: "right",
      cell: (row) => (
        <span className="text-sm">{formatCurrency(row.finalSettledAmount)}</span>
      ),
    },
    {
      key: "patientBalance",
      header: "Patient Due",
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
      key: "status",
      header: "Status",
      cell: (row) => <StatusPill status={row.status} />,
    },
  ]

  return (
    <div className="space-y-4">
      {/* ── Stat badges ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <StatBadge value={activeCount} label="Active" variant="info" />
        <StatBadge value={preauthPendingCount} label="Preauth Pending" variant="warning" />
        <StatBadge value={awaitingSettlementCount} label="Awaiting Settlement" variant="success" />
      </div>

      {/* ── Toolbar ──────────────────────────────────────────────────────────── */}
      {/* No search input: main's search is a server-side DB filter (getInsuranceClaims'
          `search` param on the old Next.js app's direct Supabase query) — this backend's
          GET /insurance/claims has no search query param at all (confirmed in
          openapi.yaml), and a client-side filter over just the current page would
          silently miss matches on other pages, which is worse than no search.
          Corrected during final review (previously shipped a misleading version). */}
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

        <Button variant="outline" size="sm" onClick={() => setShowCompanies(true)}>
          <Building2 className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
          Companies
        </Button>

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

      {/* ── Companies (modal, not a tab — matches main) ───────────────────────── */}
      <Sheet open={showCompanies} onOpenChange={setShowCompanies}>
        <SheetContent size="lg">
          <SheetHeader>
            <SheetTitle>Insurance Companies</SheetTitle>
          </SheetHeader>
          <SheetBody>
            <CompaniesTab />
          </SheetBody>
        </SheetContent>
      </Sheet>
    </div>
  )
}
