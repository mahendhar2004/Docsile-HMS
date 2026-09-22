/**
 * billing/prescription-detail-panel.tsx
 *
 * Right-side Sheet showing:
 *   - Invoice items breakdown
 *   - Full payment history
 *   - Record-payment form (billing:create gated)
 *   - Void-payment per payment row (billing:delete gated, with ConfirmationModal)
 *
 * Consumes:
 *   - GET /billing/prescriptions/{id}
 *   - POST /billing/prescriptions/{id}/payments
 *   - DELETE /billing/prescriptions/{id}/payments/{payId}
 */

import { useState } from "react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetBody,
} from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Trash2, Plus } from "lucide-react"
import { ConfirmationModal, ErrorState, StatusPill } from "@/components/patterns"
import { usePrescriptionDetail, useRecordPayment, useVoidPayment } from "./hooks"
import { RecordPaymentForm } from "./record-payment-form"
import type { BillingPrescription, PaymentRecord } from "./types"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso))
}

// ─── Skeleton loader ──────────────────────────────────────────────────────────

function DetailSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading prescription detail">
      {/* Invoice items */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-32 mb-3" />
        {Array.from({ length: 3 }).map((_, i) => (
          // eslint-disable-next-line react/no-array-index-key
          <div key={i} className="flex justify-between">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
      <Skeleton className="h-px w-full" />
      {/* Payments */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-28 mb-3" />
        {Array.from({ length: 2 }).map((_, i) => (
          // eslint-disable-next-line react/no-array-index-key
          <div key={i} className="flex justify-between">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Void-payment row action ──────────────────────────────────────────────────

interface VoidPaymentButtonProps {
  prescriptionId: string
  payment: PaymentRecord
  canDelete: boolean
}

function VoidPaymentButton({
  prescriptionId,
  payment,
  canDelete,
}: VoidPaymentButtonProps) {
  const [open, setOpen] = useState(false)
  const voidMutation = useVoidPayment(prescriptionId, () => setOpen(false))

  if (!canDelete) return null

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="text-[var(--color-error)] hover:text-[var(--color-error)] hover:bg-[var(--color-error-soft)] h-7 w-7 p-0"
        aria-label={`Void payment of ${formatINR(payment.amount)}`}
        onClick={() => setOpen(true)}
      >
        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
      </Button>

      <ConfirmationModal
        open={open}
        onOpenChange={setOpen}
        variant="destructive"
        title="Void this payment?"
        description={`This will permanently remove the ${formatINR(
          payment.amount,
        )} ${payment.paymentMode} payment recorded on ${formatDateTime(
          payment.paymentDate,
        )}. The prescription balance will be updated. This action cannot be undone.`}
        confirmLabel="Void Payment"
        isLoading={voidMutation.isPending}
        onConfirm={() => voidMutation.mutate(payment.id)}
      />
    </>
  )
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface PrescriptionDetailPanelProps {
  prescription: BillingPrescription | null
  open: boolean
  onClose: () => void
  canCreate: boolean
  canDelete: boolean
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PrescriptionDetailPanel({
  prescription,
  open,
  onClose,
  canCreate,
  canDelete,
}: PrescriptionDetailPanelProps) {
  const [showPaymentForm, setShowPaymentForm] = useState(false)

  const detailQuery = usePrescriptionDetail(
    prescription?.id ?? null,
    open && prescription != null,
  )

  const recordPayment = useRecordPayment(prescription?.id ?? "", () => {
    setShowPaymentForm(false)
  })

  const { data: detail, isLoading, isError, error, refetch } = detailQuery

  // Reset form visibility when the panel closes or switches prescription
  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setShowPaymentForm(false)
      onClose()
    }
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent size="lg" aria-label="Prescription billing detail">
        <SheetHeader>
          <SheetTitle>
            Prescription{" "}
            {prescription?.prescriptionNumber
              ? `#${prescription.prescriptionNumber}`
              : "Detail"}
          </SheetTitle>
          <SheetDescription>
            {prescription && (
              <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span>Patient: {prescription.patientId}</span>
                {prescription.doctorName && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>Dr. {prescription.doctorName}</span>
                  </>
                )}
                <span aria-hidden="true">·</span>
                <StatusPill status={prescription.status} />
              </span>
            )}
          </SheetDescription>
        </SheetHeader>

        <SheetBody>
          {/* Loading */}
          {isLoading && <DetailSkeleton />}

          {/* Error */}
          {isError && !isLoading && (
            <ErrorState
              title="Could not load prescription detail"
              error={error}
              onRetry={() => void refetch()}
            />
          )}

          {/* Detail content */}
          {detail && !isLoading && (
            <div className="space-y-6">
              {/* Billing summary */}
              <div className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-muted)]/30 p-4">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-[var(--color-muted-foreground)] text-xs mb-0.5">
                      Total Billed
                    </p>
                    <p className="font-semibold tabular-nums">
                      {formatINR(detail.prescription.total as number ?? 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[var(--color-muted-foreground)] text-xs mb-0.5">
                      Collected
                    </p>
                    <p className="font-semibold tabular-nums text-[var(--color-success)]">
                      {formatINR(detail.prescription.amountPaid as number ?? 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[var(--color-muted-foreground)] text-xs mb-0.5">
                      Balance Due
                    </p>
                    <p
                      className={`font-semibold tabular-nums ${
                        (detail.prescription.balanceDue as number ?? 0) > 0
                          ? "text-[var(--color-error)]"
                          : "text-[var(--color-muted-foreground)]"
                      }`}
                    >
                      {formatINR(detail.prescription.balanceDue as number ?? 0)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Invoice items */}
              <div>
                <h3 className="text-sm font-semibold text-[var(--color-foreground)] mb-3">
                  Invoice Items
                </h3>
                {detail.invoiceItems.length === 0 ? (
                  <p className="text-sm text-[var(--color-muted-foreground)]">
                    No invoice items found.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {detail.invoiceItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between text-sm"
                      >
                        <div className="min-w-0">
                          <span className="text-[var(--color-foreground)]">
                            {item.description}
                          </span>
                          {item.quantity > 1 && (
                            <span className="ml-1.5 text-[var(--color-muted-foreground)] text-xs">
                              &times; {item.quantity}
                            </span>
                          )}
                          {item.category && (
                            <span className="ml-1.5 text-[var(--color-muted-foreground)] text-xs">
                              ({item.category})
                            </span>
                          )}
                        </div>
                        <span className="tabular-nums shrink-0 ml-4 font-medium">
                          {formatINR(item.amount)}
                        </span>
                      </div>
                    ))}
                    {(detail.prescription.discount as number ?? 0) > 0 && (
                      <div className="flex items-center justify-between text-sm text-[var(--color-muted-foreground)]">
                        <span>Discount</span>
                        <span className="tabular-nums">
                          &minus;{formatINR(detail.prescription.discount as number ?? 0)}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <Separator />

              {/* Payments history */}
              <div>
                <h3 className="text-sm font-semibold text-[var(--color-foreground)] mb-3">
                  Payments
                </h3>
                {detail.payments.length === 0 ? (
                  <p className="text-sm text-[var(--color-muted-foreground)]">
                    No payments recorded yet.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {detail.payments.map((payment) => (
                      <div
                        key={payment.id}
                        className="flex items-center justify-between text-sm"
                      >
                        <div className="min-w-0">
                          <span className="text-[var(--color-foreground)] font-medium">
                            {payment.paymentMode}
                          </span>
                          <span className="ml-2 text-[var(--color-muted-foreground)] text-xs">
                            {formatDateTime(payment.paymentDate)}
                          </span>
                          {payment.notes && (
                            <span className="ml-2 text-[var(--color-muted-foreground)] text-xs italic">
                              — {payment.notes}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-4">
                          <span className="tabular-nums font-medium">
                            {formatINR(payment.amount)}
                          </span>
                          <VoidPaymentButton
                            prescriptionId={prescription!.id}
                            payment={payment}
                            canDelete={canDelete}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              {/* Record payment section */}
              {canCreate && (
                <div>
                  {!showPaymentForm ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => setShowPaymentForm(true)}
                    >
                      <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                      Record Payment
                    </Button>
                  ) : (
                    <RecordPaymentForm
                      balanceDue={detail.prescription.balanceDue as number ?? 0}
                      isSubmitting={recordPayment.isPending}
                      onSubmit={(values) => recordPayment.mutate(values)}
                      onCancel={() => setShowPaymentForm(false)}
                    />
                  )}
                </div>
              )}
            </div>
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  )
}
