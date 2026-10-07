/**
 * PatientDetailPanel
 *
 * Sheet (side panel) showing full patient details with inline actions:
 * - Status update
 * - Date move
 * - Billing: this visit's billed prescriptions, balance due, record payment
 *   (billing:view / billing:create) — matches main's inline billing in
 *   PatientDetail.tsx, not a separate page. The real backend contract has
 *   no patientId filter on GET /billing/prescriptions (date-only), so this
 *   queries by the patient's own appointmentDate and filters client-side to
 *   this patient's patientId — bounded and correctly wired, not fabricated.
 * - Add services (billing:create)
 * - Print receipt (billing:view)
 * - Edit (patients:edit)
 * - Delete (patients:delete)
 *
 * Uses DataModal pattern internally for the Sheet-based fetch.
 */

import { useState } from "react"
import { format } from "date-fns"
import { Printer, Pencil, Trash2, Plus, Calendar, RefreshCw, Receipt } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetBody,
  SheetFooter,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  StatusPill,
  SingleSelect,
  ConfirmationModal,
  DatePicker,
  EmptyState,
} from "@/components/patterns"
import {
  usePatientDetail,
  useUpdatePatientStatus,
  useMovePatientDate,
  useDeletePatient,
} from "./hooks"
import { AddServicesModal } from "./add-services-modal"
import { useBillingPrescriptions, useRecordPayment } from "../billing/hooks"
import { RecordPaymentForm } from "../billing/record-payment-form"
import type { Patient } from "./types"

function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount)
}

// ─── Patient status options ────────────────────────────────────────────────────

const PATIENT_STATUS_OPTIONS = [
  { value: "REGISTERED", label: "Registered" },
  { value: "IN_WORKUP", label: "In Workup" },
  { value: "WORKUP_DONE", label: "Workup Done" },
  { value: "WITH_DOCTOR", label: "With Doctor" },
  { value: "VISITED", label: "Visited" },
  { value: "COMPLETED", label: "Completed" },
  { value: "MEDICAL_ONLY", label: "Medical Only" },
  { value: "MOVED", label: "Moved" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "NO_SHOW", label: "No Show" },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-[var(--color-muted-foreground)]">{label}</span>
      <span className="text-sm text-[var(--color-foreground)]">
        {value ?? <span className="text-[var(--color-muted-foreground)] italic">—</span>}
      </span>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export interface PatientDetailPanelProps {
  patientId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Called after a successful delete so the table can refresh. */
  onDeleted: () => void
  /** Whether the current user can edit patients. */
  canEdit: boolean
  /** Whether the current user can delete patients. */
  canDelete: boolean
  /** Whether the current user can add services (billing:create). */
  canAddServices: boolean
  /** Whether the current user can view receipts (billing:view). */
  canViewReceipt: boolean
  /** Open the edit dialog for this patient. */
  onEdit: (patient: Patient) => void
}

export function PatientDetailPanel({
  patientId,
  open,
  onOpenChange,
  onDeleted,
  canEdit,
  canDelete,
  canAddServices,
  canViewReceipt,
  onEdit,
}: PatientDetailPanelProps) {
  const [showDelete, setShowDelete] = useState(false)
  const [showAddService, setShowAddService] = useState(false)
  const [newDate, setNewDate] = useState<Date | undefined>()
  const [showDateMove, setShowDateMove] = useState(false)
  const [payingPrescriptionId, setPayingPrescriptionId] = useState<string | null>(null)

  const {
    data: patient,
    isLoading,
    isError,
    error,
    refetch,
  } = usePatientDetail(patientId, open)

  // This visit's billed prescriptions — bounded to the patient's own
  // appointment date (see file header for why patientId can't be a server
  // query param), filtered client-side to this patient.
  const {
    data: billingData,
    isLoading: billingLoading,
    refetch: refetchBilling,
  } = useBillingPrescriptions(patient?.appointmentDate ?? null)
  const billedPrescriptions = (billingData ?? []).filter(
    (p) => p.patientId === patient?.patientId && p.status !== "CANCELLED",
  )
  const totalBalanceDue = billedPrescriptions.reduce((sum, p) => sum + p.balanceDue, 0)

  const recordPayment = useRecordPayment(payingPrescriptionId ?? "", () => {
    setPayingPrescriptionId(null)
    void refetchBilling()
  })

  const updateStatus = useUpdatePatientStatus(() => void refetch())
  const moveDate = useMovePatientDate(() => {
    void refetch()
    setShowDateMove(false)
    setNewDate(undefined)
  })
  const deletePatient = useDeletePatient(() => {
    onDeleted()
    onOpenChange(false)
  })

  function handlePrintReceipt() {
    if (!patientId) return
    // Open receipt in a new tab — the API returns printable data.
    window.open(
      `${import.meta.env.VITE_API_BASE_URL}/patient-care/patients/${patientId}/receipt`,
      "_blank",
      "noopener,noreferrer",
    )
  }

  function handleMoveDate() {
    if (!patientId || !newDate) return
    moveDate.mutate({
      id: patientId,
      body: { appointmentDate: format(newDate, "yyyy-MM-dd") },
    })
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent size="lg">
          <SheetHeader>
            <SheetTitle>
              {isLoading ? (
                <Skeleton className="h-5 w-40" />
              ) : patient ? (
                `${patient.firstName} ${patient.lastName}`
              ) : (
                "Patient Details"
              )}
            </SheetTitle>
            <SheetDescription>
              {patient
                ? `${patient.patientId} · ${patient.patientType}`
                : "View and manage patient information"}
            </SheetDescription>
          </SheetHeader>

          <SheetBody className="space-y-6">
            {/* ── Loading ───────────────────────────────────────────────── */}
            {isLoading && (
              <div className="space-y-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  // eslint-disable-next-line react/no-array-index-key
                  <Skeleton key={i} className="h-4 w-full" />
                ))}
              </div>
            )}

            {/* ── Error ─────────────────────────────────────────────────── */}
            {isError && !isLoading && (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <p className="text-sm text-[var(--color-error)]">
                  {error instanceof Error ? error.message : "Failed to load patient"}
                </p>
                <Button variant="outline" size="sm" onClick={() => void refetch()}>
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                  Retry
                </Button>
              </div>
            )}

            {/* ── Patient details ───────────────────────────────────────── */}
            {patient && (
              <>
                {/* Status */}
                <div className="flex items-center gap-3">
                  <StatusPill status={patient.status ?? "REGISTERED"} />
                  {canEdit && (
                    <div className="w-44">
                      <SingleSelect
                        options={PATIENT_STATUS_OPTIONS}
                        value={patient.status ?? ""}
                        onChange={(status) => {
                          if (status && patientId) {
                            updateStatus.mutate({ id: patientId, body: { status } })
                          }
                        }}
                        placeholder="Update status"
                        aria-label="Update patient status"
                      />
                    </div>
                  )}
                </div>

                {/* Personal info */}
                <section aria-label="Personal information">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)] mb-3">
                    Personal Information
                  </h3>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                    <DetailRow label="First Name" value={patient.firstName} />
                    <DetailRow label="Last Name" value={patient.lastName} />
                    <DetailRow label="Phone" value={patient.phone} />
                    <DetailRow label="Email" value={patient.email} />
                    <DetailRow label="Gender" value={patient.gender} />
                    <DetailRow
                      label="Date of Birth"
                      value={
                        patient.dateOfBirth
                          ? format(new Date(patient.dateOfBirth), "dd MMM yyyy")
                          : null
                      }
                    />
                    <div className="col-span-2">
                      <DetailRow label="Address" value={patient.address} />
                    </div>
                  </div>
                </section>

                {/* Visit info */}
                <section aria-label="Visit information">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)] mb-3">
                    Visit Information
                  </h3>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                    <DetailRow label="Patient ID" value={patient.patientId} />
                    <DetailRow label="Patient Type" value={patient.patientType} />
                    <DetailRow
                      label="Appointment Date"
                      value={format(new Date(patient.appointmentDate), "dd MMM yyyy")}
                    />
                    <DetailRow label="Referred By" value={patient.referredBy} />
                  </div>
                </section>

                {/* Billing */}
                {canViewReceipt && (
                  <section aria-label="Billing">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                        Billing
                      </h3>
                      {totalBalanceDue > 0 && (
                        <span className="text-xs font-semibold text-[var(--color-error)]">
                          Due: {formatINR(totalBalanceDue)}
                        </span>
                      )}
                    </div>

                    {billingLoading && (
                      <div className="space-y-2">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                      </div>
                    )}

                    {!billingLoading && billedPrescriptions.length === 0 && (
                      <p className="text-sm text-[var(--color-muted-foreground)]">
                        No billed prescriptions for this visit.
                      </p>
                    )}

                    {!billingLoading && billedPrescriptions.length > 0 && (
                      <div className="space-y-2">
                        {billedPrescriptions.map((rx) => (
                          <div
                            key={rx.id}
                            className="rounded-[var(--radius)] border border-[var(--color-border)] p-3 space-y-2"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <Receipt className="h-3.5 w-3.5 text-[var(--color-muted-foreground)] shrink-0" aria-hidden />
                                <span className="text-xs font-mono font-medium text-[var(--color-foreground)] truncate">
                                  {rx.prescriptionNumber}
                                </span>
                              </div>
                              <span
                                className={
                                  rx.balanceDue > 0
                                    ? "text-xs font-medium text-[var(--color-error)]"
                                    : "text-xs font-medium text-[var(--color-success)]"
                                }
                              >
                                {rx.balanceDue > 0 ? `Due: ${formatINR(rx.balanceDue)}` : "Paid"}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-xs text-[var(--color-muted-foreground)]">
                              <span>Total {formatINR(rx.total)} · Paid {formatINR(rx.amountPaid)}</span>
                              {canAddServices && rx.balanceDue > 0 && payingPrescriptionId !== rx.id && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setPayingPrescriptionId(rx.id)}
                                >
                                  Record Payment
                                </Button>
                              )}
                            </div>
                            {payingPrescriptionId === rx.id && (
                              <RecordPaymentForm
                                balanceDue={rx.balanceDue}
                                isSubmitting={recordPayment.isPending}
                                onSubmit={(values) => recordPayment.mutate(values)}
                                onCancel={() => setPayingPrescriptionId(null)}
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                )}

                {/* Date move */}
                {canEdit && (
                  <section aria-label="Move appointment date">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)] mb-3">
                      Move Appointment
                    </h3>
                    {showDateMove ? (
                      <div className="flex items-center gap-2">
                        <DatePicker
                          value={newDate}
                          onChange={setNewDate}
                          placeholder="Select new date"
                          aria-label="New appointment date"
                        />
                        <Button
                          size="sm"
                          onClick={handleMoveDate}
                          disabled={!newDate}
                          loading={moveDate.isPending}
                        >
                          Move
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setShowDateMove(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowDateMove(true)}
                      >
                        <Calendar className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                        Change Date
                      </Button>
                    )}
                  </section>
                )}
              </>
            )}

            {/* Empty state when patientId is null */}
            {!isLoading && !isError && !patient && (
              <EmptyState
                title="No patient selected"
                description="Select a patient from the list to view details."
              />
            )}
          </SheetBody>

          {/* ── Footer actions ─────────────────────────────────────────────── */}
          {patient && (
            <SheetFooter>
              <div className="flex w-full items-center gap-2">
                {/* Left-side: destructive actions */}
                {canDelete && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setShowDelete(true)}
                    aria-label="Delete patient"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </Button>
                )}

                {canEdit && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(patient)}
                    aria-label="Edit patient"
                  >
                    <Pencil className="h-4 w-4 mr-1.5" aria-hidden />
                    Edit
                  </Button>
                )}

                {/* Right-side: utility actions */}
                <div className="ml-auto flex items-center gap-2">
                  {canViewReceipt && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePrintReceipt}
                      aria-label="Print receipt"
                    >
                      <Printer className="h-4 w-4 mr-1.5" aria-hidden />
                      Receipt
                    </Button>
                  )}
                  {canAddServices && (
                    <Button
                      size="sm"
                      onClick={() => setShowAddService(true)}
                    >
                      <Plus className="h-4 w-4 mr-1.5" aria-hidden />
                      Add Service
                    </Button>
                  )}
                </div>
              </div>
            </SheetFooter>
          )}
        </SheetContent>
      </Sheet>

      {/* ── Delete confirmation ────────────────────────────────────────────── */}
      {patient && (
        <ConfirmationModal
          open={showDelete}
          onOpenChange={setShowDelete}
          variant="destructive"
          title="Delete Patient"
          description={`This will permanently delete ${patient.firstName} ${patient.lastName} (${patient.patientId}) and all associated records. This cannot be undone.`}
          confirmLabel="Delete Patient"
          onConfirm={() => deletePatient.mutate(patient.id)}
          isLoading={deletePatient.isPending}
        />
      )}

      {/* ── Add Services modal ─────────────────────────────────────────────── */}
      {patient && (
        <AddServicesModal
          open={showAddService}
          onOpenChange={setShowAddService}
          patient={patient}
          onSuccess={() => void refetch()}
        />
      )}
    </>
  )
}
