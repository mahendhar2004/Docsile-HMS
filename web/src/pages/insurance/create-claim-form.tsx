/**
 * insurance/create-claim-form.tsx
 *
 * Dialog for creating a new insurance claim.
 * Flow: search inpatient → select → fill insurance details → submit
 *
 * Endpoints:
 *   - GET /insurance/inpatients/search?q=... (search)
 *   - POST /insurance/claims (create)
 *   - GET /insurance/companies?paginated=false (dropdown)
 *
 * Field names verified against InsuranceClaimForm.tsx (old app).
 * Relation options: Self | Spouse | Child | Parent | Other (from InsuranceClaimForm.tsx)
 *
 * Permission: insurance:create
 */

import { useState, useCallback } from "react"
import { Search } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { SingleSelect } from "@/components/patterns"
import { useInpatientSearch, useInsuranceCompaniesAll, useCreateClaim } from "./hooks"
import { RELATION_SELECT_OPTIONS } from "./types"
import type { InpatientSearchResult, InsuranceCompanyListItem } from "./types"
import { formatCurrency } from "@/lib/utils"

// Minimal company option shape for select
function toCompanyOptions(companies: InsuranceCompanyListItem[]) {
  return companies
    .filter((c) => c.isActive)
    .map((c) => ({
      value: c.id,
      label: c.tpaName ? `${c.name} (${c.tpaName})` : c.name,
    }))
}

interface Props {
  open: boolean
  onClose: () => void
  onSuccess?: (claimNumber: string) => void
}

export function CreateClaimForm({ open, onClose, onSuccess }: Props) {
  // ── Inpatient search ─────────────────────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState("")
  const [committedQ, setCommittedQ] = useState("")
  const [selectedIP, setSelectedIP] = useState<InpatientSearchResult | null>(null)

  const searchQuery = useInpatientSearch(committedQ, open)

  function handleSearch() {
    if (searchTerm.trim().length >= 2) setCommittedQ(searchTerm.trim())
  }

  function handleSelectIP(ip: InpatientSearchResult) {
    setSelectedIP(ip)
    setSearchTerm(ip.ipNumber)
    setCommittedQ("")
  }

  // ── Companies dropdown ────────────────────────────────────────────────────────
  const companiesQuery = useInsuranceCompaniesAll(open)
  const companyOptions = toCompanyOptions(companiesQuery.data ?? [])

  // ── Form state ────────────────────────────────────────────────────────────────
  const [companyId, setCompanyId] = useState("")
  const [companyName, setCompanyName] = useState("")
  const [tpaName, setTpaName] = useState("")
  const [policyNumber, setPolicyNumber] = useState("")
  const [policyHolderName, setPolicyHolderName] = useState("")
  const [insuranceCardNumber, setInsuranceCardNumber] = useState("")
  const [relationToInsured, setRelationToInsured] = useState("")
  const [preauthAmount, setPreauthAmount] = useState("")
  const [notes, setNotes] = useState("")

  // ── Company selection helper ──────────────────────────────────────────────────
  const handleCompanySelect = useCallback(
    (id: string) => {
      setCompanyId(id)
      const company = (companiesQuery.data ?? []).find((c) => c.id === id)
      if (company) {
        setCompanyName(company.name)
        setTpaName(company.tpaName ?? "")
      }
    },
    [companiesQuery.data],
  )

  // ── Reset ─────────────────────────────────────────────────────────────────────
  function resetForm() {
    setSearchTerm("")
    setCommittedQ("")
    setSelectedIP(null)
    setCompanyId("")
    setCompanyName("")
    setTpaName("")
    setPolicyNumber("")
    setPolicyHolderName("")
    setInsuranceCardNumber("")
    setRelationToInsured("")
    setPreauthAmount("")
    setNotes("")
  }

  function handleClose() {
    resetForm()
    onClose()
  }

  // ── Create mutation ───────────────────────────────────────────────────────────
  const createMutation = useCreateClaim((claimNumber) => {
    resetForm()
    onSuccess?.(claimNumber)
  })

  function handleSubmit() {
    if (!selectedIP) return
    if (!companyName.trim()) return

    createMutation.mutate({
      inPatientId: selectedIP.id,
      insuranceCompanyId: companyId || undefined,
      insuranceCompanyName: companyName,
      tpaName: tpaName || undefined,
      policyNumber: policyNumber || undefined,
      policyHolderName: policyHolderName || undefined,
      insuranceCardNumber: insuranceCardNumber || undefined,
      relationToInsured: relationToInsured || undefined,
      preauthAmount: preauthAmount ? parseFloat(preauthAmount) : 0,
      notes: notes || undefined,
    })
  }

  const searchResults = searchQuery.data ?? []
  const canSubmit = !!selectedIP && !!companyName.trim() && !createMutation.isPending

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Insurance Claim</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-1">
          {/* ── Search InPatient ─────────────────────────────────────────────── */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">
              Search InPatient
            </Label>
            <div className="flex gap-2">
              <Input
                placeholder="Search by IP number, name, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                aria-label="Search inpatient"
              />
              <Button
                size="sm"
                variant="secondary"
                onClick={handleSearch}
                disabled={searchTerm.trim().length < 2 || searchQuery.isFetching}
                aria-label="Search"
              >
                <Search className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>

            {/* Search results dropdown */}
            {searchResults.length > 0 && committedQ && (
              <div className="rounded-lg border border-border max-h-40 overflow-y-auto bg-background shadow-sm">
                {searchResults.map((ip) => (
                  <button
                    key={ip.id}
                    type="button"
                    onClick={() => handleSelectIP(ip)}
                    className="w-full text-left px-3 py-2 hover:bg-muted text-sm flex justify-between items-center"
                  >
                    <div>
                      <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded mr-2">
                        {ip.ipNumber}
                      </span>
                      <span className="font-medium">{ip.name}</span>
                      <span className="text-muted-foreground ml-2">
                        {ip.age}y / {ip.gender.charAt(0)}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatCurrency(ip.netAmount)}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Selected inpatient summary card */}
            {selectedIP != null && (
              <div className="rounded-lg bg-muted/50 border border-border p-3 text-sm">
                <div className="flex justify-between mb-1">
                  <span className="font-medium">{selectedIP.name}</span>
                  <span className="font-mono text-xs">{selectedIP.ipNumber}</span>
                </div>
                <div className="text-xs text-muted-foreground grid grid-cols-3 gap-1">
                  <span>
                    {selectedIP.age}y / {selectedIP.gender.charAt(0)}
                  </span>
                  <span>{selectedIP.department ?? "—"}</span>
                  <span>{selectedIP.operationName ?? "—"}</span>
                </div>
                <div className="flex justify-between mt-1 text-xs">
                  <span>Package: {formatCurrency(selectedIP.packageAmount)}</span>
                  <span className="font-medium">
                    Net: {formatCurrency(selectedIP.netAmount)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* ── Insurance Company ────────────────────────────────────────────── */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">
              Insurance Company
            </Label>
            <SingleSelect
              options={companyOptions}
              value={companyId}
              onChange={handleCompanySelect}
              placeholder="Select insurance company"
              aria-label="Insurance company"
              clearable
            />
          </div>

          {/* ── Policy Details ───────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Policy Number</Label>
              <Input
                value={policyNumber}
                onChange={(e) => setPolicyNumber(e.target.value)}
                placeholder="Policy / Member ID"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Insurance Card No</Label>
              <Input
                value={insuranceCardNumber}
                onChange={(e) => setInsuranceCardNumber(e.target.value)}
                placeholder="Card number"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Policy Holder Name</Label>
              <Input
                value={policyHolderName}
                onChange={(e) => setPolicyHolderName(e.target.value)}
                placeholder="Policy holder"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Relation to Insured</Label>
              <SingleSelect
                options={[{ value: "", label: "Select relation" }, ...RELATION_SELECT_OPTIONS]}
                value={relationToInsured}
                onChange={setRelationToInsured}
                aria-label="Relation to insured"
              />
            </div>
          </div>

          {/* ── Preauth Amount ───────────────────────────────────────────────── */}
          <div className="space-y-1">
            <Label className="text-xs">Preauth Amount (₹)</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={preauthAmount}
              onChange={(e) => setPreauthAmount(e.target.value)}
              placeholder="0"
              aria-label="Preauth amount"
            />
          </div>

          {/* ── Notes ────────────────────────────────────────────────────────── */}
          <div className="space-y-1">
            <Label className="text-xs">Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes"
              className="h-16 resize-none"
            />
          </div>

          {/* ── Submit ───────────────────────────────────────────────────────── */}
          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={!canSubmit}
          >
            {createMutation.isPending ? "Creating claim…" : "Create Insurance Claim"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
