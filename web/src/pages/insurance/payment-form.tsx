/**
 * insurance/payment-form.tsx
 *
 * Dialog for recording a patient payment on an insurance claim.
 * Endpoint: POST /insurance/claims/{id}/payments
 *
 * Payment modes verified from InsuranceClaimDetail.tsx line 28:
 *   const PAYMENT_MODES = ["Cash", "UPI", "Card", "Bank Transfer", "Cheque"]
 * NOTE: Insurance uses "Bank Transfer" (NOT "NEFT"/"Online" like billing module).
 *
 * Permission: insurance:edit
 */

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SingleSelect } from "@/components/patterns"
import { useAddClaimPayment } from "./hooks"
import { INSURANCE_PAYMENT_MODE_OPTIONS } from "./types"
import { formatCurrency } from "@/lib/utils"

interface Props {
  claimId: string
  open: boolean
  onClose: () => void
  onSuccess?: () => void
  /** Shown as a reminder of outstanding balance */
  patientBalance?: number
}

export function PaymentForm({ claimId, open, onClose, onSuccess, patientBalance }: Props) {
  const [amount, setAmount] = useState("")
  const [paymentMode, setPaymentMode] = useState("Cash")
  const [notes, setNotes] = useState("")

  const mutation = useAddClaimPayment(claimId, () => {
    resetAndClose()
    onSuccess?.()
  })

  function resetAndClose() {
    setAmount("")
    setPaymentMode("Cash")
    setNotes("")
    onClose()
  }

  function handleSubmit() {
    const parsed = parseFloat(amount)
    if (!amount.trim() || isNaN(parsed) || parsed <= 0) return

    mutation.mutate({
      amount: parsed,
      paymentMode,
      notes: notes.trim() || undefined,
    })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && resetAndClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record Patient Payment</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Amount (₹)</Label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                autoFocus
                aria-label="Payment amount"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Payment Mode</Label>
              <SingleSelect
                options={INSURANCE_PAYMENT_MODE_OPTIONS}
                value={paymentMode}
                onChange={setPaymentMode}
                aria-label="Payment mode"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes..."
              aria-label="Payment notes"
            />
          </div>

          {patientBalance != null && patientBalance > 0 && (
            <p className="text-xs text-muted-foreground">
              Outstanding balance:{" "}
              <span className="font-semibold text-orange-600">
                {formatCurrency(patientBalance)}
              </span>
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={resetAndClose}
            disabled={mutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              !amount.trim() ||
              parseFloat(amount) <= 0 ||
              mutation.isPending
            }
          >
            {mutation.isPending ? "Recording…" : "Record Payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
