/**
 * insurance/claim-detail-panel.tsx
 *
 * Sheet panel showing the full insurance claim lifecycle:
 *   - Header: patient name, IP number, claim number, status pill
 *   - Financial summary cards (Total Bill, Preauth, Total Approved, Settled, Balance)
 *   - Tabs: Overview (patient info + insurance details) | Financials (bill breakdown, settlement)
 *   - Right sidebar: Status Timeline (parsed from statusHistory JSON)
 *   - Key Dates (preauth/enhancement/final-bill/settlement lifecycle dates)
 *   - Rejection details card (if applicable)
 *   - Actions: Change Status (dropdown showing allowed transitions), Add Patient Payment
 *   - Edit insurance company details inline
 *
 * Status update sends FULL field set via PATCH /insurance/claims/{id}/status.
 * Payment uses the real insurance payment modes: Cash, UPI, Card, Bank Transfer, Cheque.
 *
 * Permissions:
 *   - insurance:view — read
 *   - insurance:edit — change status, add payment, edit details
 */

import { useState } from "react"
import { ChevronDown, Plus } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { StatusPill, ErrorState, SingleSelect } from "@/components/patterns"
import { usePermissions } from "@/hooks/usePermissions"
import { useInsuranceClaim, useInsuranceCompaniesAll, useUpdateClaimDetails } from "./hooks"
import { ClaimStatusForm } from "./claim-status-form"
import { PaymentForm } from "./payment-form"
import {
  INS_STATUS_LABELS,
  INS_STATUS_TRANSITIONS,
} from "./types"
import type {
  InsuranceClaim,
  InsuranceClaimStatus,
  InsuranceStatusHistoryEntry,
  PackageInclusion,
} from "./types"
import { formatDate, formatCurrency } from "@/lib/utils"

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  claimId: string | null
  onClose: () => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseDoctors(raw: string): string[] {
  try {
    const parsed: unknown = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed as string[]
    return []
  } catch {
    return raw ? [raw] : []
  }
}

function parseStatusHistory(raw: string | null): InsuranceStatusHistoryEntry[] {
  if (!raw) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as InsuranceStatusHistoryEntry[]) : []
  } catch {
    return []
  }
}

function parsePackageInclusions(raw: string | null): PackageInclusion[] {
  if (!raw) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as PackageInclusion[]) : []
  } catch {
    return []
  }
}

// ─── Financial summary card ───────────────────────────────────────────────────

function FinancialCard({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="rounded-lg border border-border p-3 bg-background">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className={`text-base font-bold mt-0.5 ${className ?? "text-foreground"}`}>{value}</p>
    </div>
  )
}

// ─── Insurance details edit form ──────────────────────────────────────────────

function InsuranceDetailsEditor({
  claim,
  onSaved,
}: {
  claim: InsuranceClaim
  onSaved: () => void
}) {
  const companiesQuery = useInsuranceCompaniesAll()
  const updateMutation = useUpdateClaimDetails(claim.id, onSaved)

  const [companyId, setCompanyId] = useState(claim.insuranceCompanyId ?? "")
  const [companyName, setCompanyName] = useState(claim.insuranceCompanyName ?? "")
  const [tpaName, setTpaName] = useState(claim.tpaName ?? "")
  const [policyNumber, setPolicyNumber] = useState(claim.policyNumber ?? "")
  const [cardNumber, setCardNumber] = useState(claim.insuranceCardNumber ?? "")

  const companyOptions = (companiesQuery.data ?? [])
    .filter((c) => c.isActive)
    .map((c) => ({ value: c.id, label: c.name }))

  function handleCompanyChange(id: string) {
    setCompanyId(id)
    const company = (companiesQuery.data ?? []).find((c) => c.id === id)
    if (company) {
      setCompanyName(company.name)
      setTpaName(company.tpaName ?? "")
    }
  }

  function handleSave() {
    updateMutation.mutate({
      insuranceCompanyId: companyId || undefined,
      insuranceCompanyName: companyName,
      tpaName: tpaName || undefined,
      policyNumber: policyNumber || undefined,
      insuranceCardNumber: cardNumber || undefined,
    })
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label className="text-xs">Insurance Company</Label>
        <SingleSelect
          options={companyOptions}
          value={companyId}
          onChange={handleCompanyChange}
          placeholder="Select company"
          clearable
          aria-label="Insurance company"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Policy Number</Label>
          <Input
            value={policyNumber}
            onChange={(e) => setPolicyNumber(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Card Number</Label>
          <Input
            value={cardNumber}
            onChange={(e) => setCardNumber(e.target.value)}
          />
        </div>
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={handleSave}
          disabled={updateMutation.isPending}
        >
          {updateMutation.isPending ? "Saving…" : "Save"}
        </Button>
        <Button size="sm" variant="ghost" onClick={onSaved}>
          Cancel
        </Button>
      </div>
    </div>
  )
}

// ─── Claim detail content ─────────────────────────────────────────────────────

function ClaimDetailContent({ claim, onRefresh }: { claim: InsuranceClaim; onRefresh: () => void }) {
  const { can } = usePermissions()
  const canEdit = can("insurance:edit")

  const currentStatus = claim.status as InsuranceClaimStatus
  const allowedTransitions = INS_STATUS_TRANSITIONS[currentStatus] ?? []

  // Status change form
  const [statusTarget, setStatusTarget] = useState<InsuranceClaimStatus | null>(null)

  // Payment form
  const [showPayment, setShowPayment] = useState(false)

  // Edit details
  const [editingDetails, setEditingDetails] = useState(false)

  const history = parseStatusHistory(claim.statusHistory)
  const packageInclusions = parsePackageInclusions(claim.packageInclusions)
  const doctors = parseDoctors(claim.doctorNames)

  const infoRows: [string, string][] = [
    ["Patient Name", claim.patientName],
    ["IP Number", claim.ipNumber],
    ["Age / Gender", `${claim.age} / ${claim.gender.charAt(0)}`],
    ["Phone", claim.phone],
    ["Guardian", claim.guardianName ?? "—"],
    ["Department", claim.department ?? "—"],
    ["Doctors", doctors.join(", ") || "—"],
    ["Operation", claim.operationName ?? "—"],
    ["Diagnosis", claim.provisionDiagnosis ?? "—"],
    ["Admission", claim.admissionDate ? formatDate(claim.admissionDate) : "—"],
    ["Discharge", claim.dischargeDate ? formatDate(claim.dischargeDate) : "—"],
  ]

  const insuranceRows: [string, string][] = [
    ["Insurance Company", claim.insuranceCompanyName],
    ["TPA", claim.tpaName ?? "—"],
    ["Policy Number", claim.policyNumber ?? "—"],
    ["Card Number", claim.insuranceCardNumber ?? "—"],
    ["Policy Holder", claim.policyHolderName ?? "—"],
    ["Relation", claim.relationToInsured ?? "—"],
  ]

  const keyDates: [string, string][] = [
    ["Preauth Submitted", claim.preauthSubmittedDate ? formatDate(claim.preauthSubmittedDate) : "—"],
    ["Preauth Approved", claim.preauthApprovedDate ? formatDate(claim.preauthApprovedDate) : "—"],
    ["Enhancement Claimed", claim.enhancementClaimedDate ? formatDate(claim.enhancementClaimedDate) : "—"],
    ["Enhancement Approved", claim.enhancementApprovedDate ? formatDate(claim.enhancementApprovedDate) : "—"],
    ["Final Bill Submitted", claim.finalBillSubmittedDate ? formatDate(claim.finalBillSubmittedDate) : "—"],
    ["Settlement Date", claim.settlementDate ? formatDate(claim.settlementDate) : "—"],
  ]

  return (
    <div className="space-y-6">
      {/* ── Claim header ────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base font-semibold">{claim.patientName}</h2>
            <StatusPill status={currentStatus} />
          </div>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
              {claim.claimNumber}
            </span>
            <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
              {claim.ipNumber}
            </span>
            {claim.insuranceCompanyName && claim.insuranceCompanyName !== "TBD" && (
              <span className="text-xs text-muted-foreground font-medium">
                {claim.insuranceCompanyName}
              </span>
            )}
          </div>
        </div>

        {canEdit && (
          <div className="flex flex-wrap items-center gap-2">
            {allowedTransitions.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline">
                    Change Status
                    <ChevronDown className="h-3.5 w-3.5 ml-1" aria-hidden="true" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {allowedTransitions.map((s) => (
                    <DropdownMenuItem key={s} onSelect={() => setStatusTarget(s)}>
                      {INS_STATUS_LABELS[s]}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowPayment(true)}
            >
              <Plus className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
              Patient Payment
            </Button>
          </div>
        )}
      </div>

      {/* ── Financial summary ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        <FinancialCard label="Total Bill" value={formatCurrency(claim.totalBillAmount)} />
        <FinancialCard label="Preauth" value={formatCurrency(claim.preauthAmount)} className="text-blue-600" />
        <FinancialCard label="Total Approved" value={formatCurrency(claim.totalApprovedAmount)} className="text-blue-600" />
        <FinancialCard label="Settled" value={formatCurrency(claim.finalSettledAmount)} className="text-green-600" />
        <FinancialCard
          label="Patient Balance"
          value={formatCurrency(claim.patientBalance)}
          className={claim.patientBalance > 0 ? "text-orange-600" : "text-green-600"}
        />
      </div>

      {/* ── Main content: Tabs + Timeline ────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Tabs */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="financials">Financials</TabsTrigger>
            </TabsList>

            {/* Overview tab */}
            <TabsContent value="overview" className="space-y-4 mt-4">
              {/* Patient Info */}
              <div className="rounded-lg border border-border p-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  Patient Information
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-3 gap-x-4 text-sm">
                  {infoRows.map(([label, value]) => (
                    <div key={label}>
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className="font-medium">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Insurance Details */}
              <div className="rounded-lg border border-border p-4">
                <div className="flex justify-between items-center mb-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Insurance Details
                  </p>
                  {canEdit && !editingDetails && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={() => setEditingDetails(true)}
                    >
                      Edit
                    </Button>
                  )}
                </div>
                {editingDetails ? (
                  <InsuranceDetailsEditor
                    claim={claim}
                    onSaved={() => {
                      setEditingDetails(false)
                      onRefresh()
                    }}
                  />
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-3 gap-x-4 text-sm">
                    {insuranceRows.map(([label, value]) => (
                      <div key={label}>
                        <p className="text-xs text-muted-foreground">{label}</p>
                        <p className="font-medium">{value}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {claim.notes && (
                <div className="rounded-lg border border-border p-4">
                  <p className="text-xs text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm">{claim.notes}</p>
                </div>
              )}
            </TabsContent>

            {/* Financials tab */}
            <TabsContent value="financials" className="space-y-4 mt-4">
              {/* Bill summary */}
              <div className="rounded-lg border border-border p-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  Bill Summary
                </p>
                <div className="space-y-2.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Package Amount</span>
                    <span className="font-medium">{formatCurrency(claim.packageAmount)}</span>
                  </div>
                  {claim.discount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Discount</span>
                      <span className="text-muted-foreground">- {formatCurrency(claim.discount)}</span>
                    </div>
                  )}
                  <div className="border-t border-dashed pt-2.5 flex justify-between">
                    <span className="font-semibold">Total Bill Amount</span>
                    <span className="font-bold text-base">{formatCurrency(claim.totalBillAmount)}</span>
                  </div>
                </div>
              </div>

              {/* Insurance approval */}
              <div className="rounded-lg border border-border p-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  Insurance Approval
                </p>
                <div className="space-y-2.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Preauth Amount</span>
                    <span className="font-medium text-blue-600">{formatCurrency(claim.preauthAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Enhancement Approved</span>
                    <span className="font-medium text-blue-600">{formatCurrency(claim.enhancementApproved)}</span>
                  </div>
                  <div className="border-t border-dashed pt-2.5 flex justify-between">
                    <span className="font-semibold">Total Approved</span>
                    <span className="font-bold text-base text-blue-600">{formatCurrency(claim.totalApprovedAmount)}</span>
                  </div>
                </div>
              </div>

              {/* Settlement */}
              <div className="rounded-lg border border-border p-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  Settlement
                </p>
                <div className="space-y-2.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Final Settled</span>
                    <span className="font-medium text-green-600">{formatCurrency(claim.finalSettledAmount)}</span>
                  </div>
                  {claim.deductions > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Deductions</span>
                      <span className="font-medium text-red-500">- {formatCurrency(claim.deductions)}</span>
                    </div>
                  )}
                  {claim.settlementReference && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Settlement Ref</span>
                      <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">
                        {claim.settlementReference}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Patient account */}
              <div className="rounded-lg border-2 border-border p-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  Patient Account
                </p>
                <div className="space-y-2.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Patient Payable</span>
                    <span className="font-medium text-orange-600">{formatCurrency(claim.patientPayableAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Patient Paid</span>
                    <span className="font-medium text-green-600">{formatCurrency(claim.patientPaidAmount)}</span>
                  </div>
                  <div className="border-t border-dashed pt-2.5 flex justify-between">
                    <span className="font-bold">Patient Balance</span>
                    <span className={`font-bold text-base ${claim.patientBalance > 0 ? "text-destructive" : "text-green-600"}`}>
                      {formatCurrency(claim.patientBalance)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Package inclusions */}
              {packageInclusions.length > 0 && (
                <div className="rounded-lg border border-border p-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                    Package Inclusions
                  </p>
                  <div className="space-y-1.5">
                    {packageInclusions.map((item, i) => (
                      <div key={i} className="rounded-lg border bg-muted/30 px-3.5 py-2.5">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">{item.name}</span>
                          <span className="font-semibold">{formatCurrency(item.amount)}</span>
                        </div>
                        {item.subItems && item.subItems.length > 0 && (
                          <div className="mt-1.5 space-y-1 border-t border-dashed pt-1.5">
                            {item.subItems.map((sub, j) => (
                              <div key={j} className="flex justify-between text-xs text-muted-foreground">
                                <span>
                                  {sub.itemName}{" "}
                                  <span className="text-muted-foreground/60">x{sub.quantity}</span>
                                </span>
                                <span>{formatCurrency(sub.amount)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Right: Timeline + Key dates + Rejection details */}
        <div className="space-y-4">
          {/* Status Timeline */}
          <div className="rounded-lg border border-border p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Status Timeline
            </p>
            {history.length > 0 ? (
              <div className="space-y-0">
                {[...history].reverse().map((entry, i) => (
                  <div key={i} className="flex gap-3 pb-4">
                    <div className="flex flex-col items-center">
                      <div className="h-2.5 w-2.5 rounded-full bg-primary mt-1.5 shrink-0" />
                      {i < history.length - 1 && (
                        <div className="w-px flex-1 bg-border mt-1" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <StatusPill status={entry.status} size="sm" />
                        <span className="text-xs text-muted-foreground">
                          {formatDate(entry.date)}
                        </span>
                      </div>
                      {entry.notes && (
                        <p className="text-sm text-muted-foreground mt-1">{entry.notes}</p>
                      )}
                      {entry.updatedBy && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          by {entry.updatedBy}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No status history
              </p>
            )}
          </div>

          {/* Key Dates */}
          <div className="rounded-lg border border-border p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Key Dates
            </p>
            <div className="grid grid-cols-1 gap-y-2.5 text-sm">
              {keyDates.map(([label, value]) => (
                <div key={label}>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="font-medium">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Rejection Details */}
          {(claim.preauthRejectionReason != null || claim.enhancementRejectionReason != null) && (
            <div className="rounded-lg border border-border p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Rejection Details
              </p>
              {claim.preauthRejectionReason && (
                <div className="rounded-lg bg-destructive/5 border border-destructive/20 p-3 mb-2">
                  <p className="text-xs text-muted-foreground">Preauth Rejection</p>
                  <p className="text-sm">{claim.preauthRejectionReason}</p>
                </div>
              )}
              {claim.enhancementRejectionReason && (
                <div className="rounded-lg bg-destructive/5 border border-destructive/20 p-3">
                  <p className="text-xs text-muted-foreground">Enhancement Rejection</p>
                  <p className="text-sm">{claim.enhancementRejectionReason}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Modals ────────────────────────────────────────────────────────────── */}
      <ClaimStatusForm
        claimId={claim.id}
        targetStatus={statusTarget}
        onClose={() => setStatusTarget(null)}
        onSuccess={() => {
          setStatusTarget(null)
          onRefresh()
        }}
      />

      <PaymentForm
        claimId={claim.id}
        open={showPayment}
        onClose={() => setShowPayment(false)}
        onSuccess={() => {
          setShowPayment(false)
          onRefresh()
        }}
        patientBalance={claim.patientBalance}
      />
    </div>
  )
}

// ─── ClaimDetailPanel (Sheet wrapper) ────────────────────────────────────────

export function ClaimDetailPanel({ claimId, onClose }: Props) {
  const { data: claim, isLoading, isError, error, refetch } = useInsuranceClaim(claimId)

  return (
    <Sheet open={claimId != null} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-4xl overflow-y-auto p-6"
      >
        <SheetHeader className="mb-4">
          <SheetTitle className="text-base">Claim Detail</SheetTitle>
        </SheetHeader>

        {isLoading && (
          <div className="space-y-4">
            <Skeleton className="h-16 w-full" />
            <div className="grid grid-cols-5 gap-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14" />
              ))}
            </div>
            <Skeleton className="h-48 w-full" />
          </div>
        )}

        {isError && (
          <ErrorState
            title="Could not load claim"
            error={error}
            onRetry={() => void refetch()}
          />
        )}

        {!isLoading && !isError && claim != null && (
          <ClaimDetailContent
            claim={claim}
            onRefresh={() => void refetch()}
          />
        )}
      </SheetContent>
    </Sheet>
  )
}
