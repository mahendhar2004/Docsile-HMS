/**
 * insurance/claim-status-form.tsx
 *
 * Dialog for updating insurance claim status.
 * Sends the FULL field set per UpdateClaimStatusSchema:
 *   status, notes?, amount?, rejectionReason?, settlementReference?, deductions?
 *
 * Fields shown depend on the target status (from old app InsuranceClaimDetail.tsx):
 *   - needsAmount:    PREAUTH_APPROVED | ENHANCEMENT_CLAIMED | ENHANCEMENT_APPROVED | SETTLED | PARTIALLY_SETTLED
 *   - needsRejection: PREAUTH_REJECTED | ENHANCEMENT_REJECTED | CLAIM_REJECTED
 *   - needsSettlement: SETTLED | PARTIALLY_SETTLED (adds settlementReference + deductions)
 *   - Notes field: always shown
 *
 * Permission: insurance:edit
 */

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { StatusPill } from "@/components/patterns"
import { useUpdateClaimStatus } from "./hooks"
import {
  INS_STATUS_LABELS,
  STATUS_NEEDS_AMOUNT,
  STATUS_NEEDS_REJECTION,
  STATUS_NEEDS_SETTLEMENT,
} from "./types"
import type { InsuranceClaimStatus, UpdateClaimStatusBody } from "./types"

interface Props {
  claimId: string
  targetStatus: InsuranceClaimStatus | null
  onClose: () => void
  onSuccess?: () => void
}

export function ClaimStatusForm({ claimId, targetStatus, onClose, onSuccess }: Props) {
  const [notes, setNotes] = useState("")
  const [amount, setAmount] = useState("")
  const [rejectionReason, setRejectionReason] = useState("")
  const [settlementRef, setSettlementRef] = useState("")
  const [deductions, setDeductions] = useState("")

  const mutation = useUpdateClaimStatus(claimId, () => {
    resetAndClose()
    onSuccess?.()
  })

  function resetAndClose() {
    setNotes("")
    setAmount("")
    setRejectionReason("")
    setSettlementRef("")
    setDeductions("")
    onClose()
  }

  function handleSubmit() {
    if (!targetStatus) return

    const body: UpdateClaimStatusBody = {
      status: targetStatus,
      notes: notes.trim() || undefined,
      amount: amount.trim() ? parseFloat(amount) : undefined,
      rejectionReason: rejectionReason.trim() || undefined,
      settlementReference: settlementRef.trim() || undefined,
      deductions: deductions.trim() ? parseFloat(deductions) : undefined,
    }

    mutation.mutate(body)
  }

  if (!targetStatus) return null

  const needsAmount = STATUS_NEEDS_AMOUNT.includes(targetStatus)
  const needsRejection = STATUS_NEEDS_REJECTION.includes(targetStatus)
  const needsSettlement = STATUS_NEEDS_SETTLEMENT.includes(targetStatus)

  const amountLabel =
    targetStatus === "ENHANCEMENT_CLAIMED"
      ? "Enhancement Amount (₹)"
      : "Approved / Settled Amount (₹)"

  return (
    <Dialog open={targetStatus != null} onOpenChange={(v) => !v && resetAndClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Change Status
            <StatusPill status={targetStatus} />
          </DialogTitle>
          {targetStatus && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {INS_STATUS_LABELS[targetStatus]}
            </p>
          )}
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Amount — for approvals, enhancements, and settlements */}
          {needsAmount && (
            <div className="space-y-1.5">
              <Label>{amountLabel}</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                autoFocus
                aria-label={amountLabel}
              />
            </div>
          )}

          {/* Rejection reason — for rejected statuses */}
          {needsRejection && (
            <div className="space-y-1.5">
              <Label>Rejection Reason</Label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Describe the reason for rejection..."
                className="h-20 resize-none"
                autoFocus
                aria-label="Rejection reason"
              />
            </div>
          )}

          {/* Settlement reference + deductions — for settled statuses */}
          {needsSettlement && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Settlement Reference</Label>
                <Input
                  value={settlementRef}
                  onChange={(e) => setSettlementRef(e.target.value)}
                  placeholder="UTR / Cheque No."
                  aria-label="Settlement reference"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Deductions (₹)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={deductions}
                  onChange={(e) => setDeductions(e.target.value)}
                  placeholder="0"
                  aria-label="Deductions amount"
                />
              </div>
            </div>
          )}

          {/* Notes — always shown */}
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes..."
              aria-label="Status change notes"
              autoFocus={!needsAmount && !needsRejection}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={resetAndClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={mutation.isPending}>
            {mutation.isPending ? "Saving…" : "Confirm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
