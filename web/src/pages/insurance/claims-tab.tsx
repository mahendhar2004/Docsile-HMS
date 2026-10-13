/**
 * insurance/claims-tab.tsx
 *
 * Main Insurance view (not a tab anymore — see InsurancePage.tsx), matching
 * main's single-list-page layout (src/app/(hospital)/insurance/components/
 * InsurancePage.tsx). Header StatBadges live in InsurancePage.tsx now (main
 * renders them in the sticky header, not the filter bar). This component
 * owns just the filter bar + table:
 * - A plain bordered/backdrop card (NOT the sticky PageToolbar/FilterBar —
 *   main's own Insurance filter row is a one-off `rounded-xl border p-3`
 *   block, not main's sticky FilterBar pattern used elsewhere)
 * - Status filter as a pill group (main uses buttons in a muted rounded
 *   strip, not a dropdown), then a right-aligned group: text "Refresh"
 *   button, outline "Companies" button, primary "New Claim" button
 * - PaginatedDataTable with StatusPill using the real 13-value InsuranceClaimStatus enum
 * - Click row to open ClaimDetailPanel (Sheet)
 *
 * Search box matches main's "Search claim, patient, IP, phone, company..."
 * SearchInput — submit-on-Enter against GET /insurance/claims?search=,
 * which does a server-side ilike across claimNumber/patientName/ipNumber/
 * phone/insuranceCompanyName (added alongside this fix; the endpoint
 * previously had no search param at all).
 *
 * Endpoints:
 *   GET /insurance/claims?page=N&pageSize=N&status=...&excludeClosed=&search=... — insurance:view
 *   POST /insurance/claims (via CreateClaimForm) — insurance:create
 */

import { useState } from "react"
import { Plus, Building2, RefreshCw } from "lucide-react"
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
  EmptyState,
  SearchBar,
} from "@/components/patterns"
import type { ColumnDef } from "@/components/patterns"
import { usePermissions } from "@/hooks/usePermissions"
import { useInsuranceClaims } from "./hooks"
import { CreateClaimForm } from "./create-claim-form"
import { ClaimDetailPanel } from "./claim-detail-panel"
import { CompaniesTab } from "./companies-tab"
import { CLAIM_STATUS_FILTER_OPTIONS, CLAIM_STATUS_BUCKET_MAP } from "./types"
import type { InsuranceClaim } from "./types"
import { formatCurrency, cn } from "@/lib/utils"

// ─── ClaimsTab ────────────────────────────────────────────────────────────────

export function ClaimsTab() {
  const { can } = usePermissions()
  const canCreate = can("insurance:create")

  // ── Status filter ────────────────────────────────────────────────────────────
  const [statusFilter, setStatusFilter] = useState("")
  const [searchText, setSearchText] = useState("")
  const [searchFilter, setSearchFilter] = useState("")

  // ── Paginated claim list — matches main's bucketed status-group filter
  // (_status-map.ts) exactly: each pill maps to several raw statuses, and
  // "All Active"/every non-"closed" bucket also excludes CLOSED claims. ──
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
  } = useInsuranceClaims(CLAIM_STATUS_BUCKET_MAP[statusFilter].join(","), {
    excludeClosed: statusFilter !== "closed",
    search: searchFilter,
  })

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
      {/* ── Filters + Actions ─────────────────────────────────────────────────── */}
      {/* Plain bordered card, not the sticky PageToolbar/FilterBar — matches
          main's own one-off filter-row treatment for this page exactly. */}
      <div className="flex items-center gap-3 flex-wrap rounded-xl border border-border/60 bg-white/80 backdrop-blur-sm p-3">
        <div className="w-full sm:w-72">
          <SearchBar
            variant="standalone"
            value={searchText}
            onChange={setSearchText}
            onSearch={(v) => {
              setSearchFilter(v)
              setPage(1)
            }}
            placeholder="Search claim, patient, IP, phone, company..."
            aria-label="Search insurance claims"
          />
        </div>

        <div className="filter-divider hidden sm:block" />

        {/* Status filter — pill group, not a dropdown, matching main exactly */}
        <div className="flex gap-0.5 bg-muted/40 rounded-lg p-0.5 border border-border/30 flex-wrap">
          {CLAIM_STATUS_FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { setStatusFilter(opt.value); setPage(1) }}
              className={cn(
                "rounded-md text-xs font-medium h-7 px-3 transition-all",
                statusFilter === opt.value
                  ? "bg-white text-foreground shadow-sm border border-border/60"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={() => void refetch()}
            className="h-8 px-2.5 flex items-center gap-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} aria-hidden="true" />
            Refresh
          </button>
          <Button variant="outline" size="sm" className="h-8" onClick={() => setShowCompanies(true)}>
            <Building2 className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
            Companies
          </Button>
          {canCreate && (
            <Button size="sm" className="h-8" onClick={() => setShowCreate(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
              New Claim
            </Button>
          )}
        </div>
      </div>

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
