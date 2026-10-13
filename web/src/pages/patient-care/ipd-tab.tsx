/**
 * IpdTab
 *
 * Lightweight embedded In-Patients view on the Patients page, matching
 * main's /patients page's own IPD tab (src/app/(hospital)/patients/
 * components/PatientsPage.tsx) — a quick-glance table with status update,
 * not an admission entry point. Admitting a new patient, and the richer
 * stat-badge view, live on the separate /inpatients route (InPatientsPage)
 * now, matching main's separate fuller page.
 *
 * - No toolbar/filters — main's embedded IPD tab renders the table directly,
 *   scoped server-side to currently-admitted patients plus anyone discharged
 *   today or yesterday (recentDischargesOnly), so old discharge history
 *   doesn't pile up in this quick-glance view
 * - Offset-paginated inpatient table via PaginatedDataTable
 * - Inpatient detail panel (Sheet)
 * - Status update (admitted / discharged)
 * - Delete with ConfirmationModal
 *
 * Permissions:
 *   inpatients:view    — always required (caller gates the whole tab)
 *   inpatients:edit    — shows edit/status actions
 *   inpatients:delete  — shows delete action
 *   inpatients:discharge — shows discharge action
 */

import { useState, forwardRef, useImperativeHandle } from "react"
import { format } from "date-fns"
import { Trash2, RefreshCw } from "lucide-react"
import { calculateAge, formatCurrency, cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetBody,
  SheetFooter,
} from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import {
  PaginatedDataTable,
  ColumnDef,
  StatusPill,
  SingleSelect,
  ConfirmationModal,
  EmptyState,
} from "@/components/patterns"
import {
  useIpdInPatients,
  useInPatientDetail,
  useUpdateInPatientStatus,
  useDeleteInPatient,
} from "./hooks"
import type { InPatient } from "./types"

// ─── Static options ───────────────────────────────────────────────────────────

const INPATIENT_STATUS_OPTIONS = [
  { value: "admitted", label: "Admitted" },
  { value: "discharged", label: "Discharged" },
]

// ─── InPatient detail sheet ───────────────────────────────────────────────────

interface InPatientDetailSheetProps {
  inPatientId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  canEdit: boolean
  canDelete: boolean
  canDischarge: boolean
  onDeleted: () => void
}

function InPatientDetailSheet({
  inPatientId,
  open,
  onOpenChange,
  canEdit,
  canDelete,
  canDischarge,
  onDeleted,
}: InPatientDetailSheetProps) {
  const [showDelete, setShowDelete] = useState(false)

  const { data: inpatient, isLoading, isError, error, refetch } = useInPatientDetail(
    inPatientId,
    open,
  )

  const updateStatus = useUpdateInPatientStatus(() => void refetch())
  const deleteInPatient = useDeleteInPatient(() => {
    onDeleted()
    onOpenChange(false)
  })

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent size="lg">
          <SheetHeader>
            <SheetTitle>
              {isLoading ? (
                <Skeleton className="h-5 w-40" />
              ) : inpatient ? (
                <>IP: {inpatient.ipNumber}</>
              ) : (
                "Inpatient Details"
              )}
            </SheetTitle>
            <SheetDescription>
              {inpatient
                ? `Patient ID: ${inpatient.patientId}`
                : "View and manage inpatient information"}
            </SheetDescription>
          </SheetHeader>

          <SheetBody className="space-y-6">
            {isLoading && (
              <div className="space-y-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  // eslint-disable-next-line react/no-array-index-key
                  <Skeleton key={i} className="h-4 w-full" />
                ))}
              </div>
            )}

            {isError && !isLoading && (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <p className="text-sm text-[var(--color-error)]">
                  {error instanceof Error ? error.message : "Failed to load inpatient"}
                </p>
                <Button variant="outline" size="sm" onClick={() => void refetch()}>
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                  Retry
                </Button>
              </div>
            )}

            {inpatient && (
              <>
                {/* Status */}
                <div className="flex items-center gap-3">
                  <StatusPill status={inpatient.status.toUpperCase()} />
                  {(canEdit || canDischarge) && (
                    <div className="w-44">
                      <SingleSelect
                        options={INPATIENT_STATUS_OPTIONS}
                        value={inpatient.status}
                        onChange={(status) => {
                          if (status && inPatientId) {
                            updateStatus.mutate({
                              id: inPatientId,
                              body: { status: status as "admitted" | "discharged" },
                            })
                          }
                        }}
                        placeholder="Update status"
                        aria-label="Update inpatient status"
                      />
                    </div>
                  )}
                </div>

                {/* Admission details */}
                <section aria-label="Admission details">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)] mb-3">
                    Admission Details
                  </h3>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                    <DetailRow label="IP Number" value={inpatient.ipNumber} />
                    <DetailRow label="Patient ID" value={inpatient.patientId} />
                    {inpatient.firstName && (
                      <DetailRow
                        label="Patient Name"
                        value={`${inpatient.firstName} ${inpatient.lastName ?? ""}`}
                      />
                    )}
                    {inpatient.phone && (
                      <DetailRow label="Phone" value={inpatient.phone} />
                    )}
                    <DetailRow
                      label="Admission Date"
                      value={format(new Date(inpatient.admissionDate), "dd MMM yyyy")}
                    />
                    {inpatient.dischargeDate && (
                      <DetailRow
                        label="Discharge Date"
                        value={format(new Date(inpatient.dischargeDate), "dd MMM yyyy")}
                      />
                    )}
                    <DetailRow label="Ward" value={inpatient.ward} />
                    <DetailRow label="Bed" value={inpatient.bedNumber} />
                  </div>
                </section>

                {/* On-duty doctors */}
                {inpatient.onDutyDoctors && inpatient.onDutyDoctors !== "[]" && (() => {
                  try {
                    const doctors = JSON.parse(inpatient.onDutyDoctors) as string[]
                    if (doctors.length === 0) return null
                    return (
                      <section aria-label="On-duty doctors">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)] mb-2">
                          On-Duty Doctors
                        </h3>
                        <ul className="space-y-1">
                          {doctors.map((d, i) => (
                            // eslint-disable-next-line react/no-array-index-key
                            <li key={i} className="text-sm text-[var(--color-foreground)]">
                              {d}
                            </li>
                          ))}
                        </ul>
                      </section>
                    )
                  } catch {
                    return null
                  }
                })()}
              </>
            )}
          </SheetBody>

          {inpatient && (
            <SheetFooter>
              <div className="flex w-full items-center gap-2">
                {canDelete && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setShowDelete(true)}
                    aria-label="Delete inpatient"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </Button>
                )}
              </div>
            </SheetFooter>
          )}
        </SheetContent>
      </Sheet>

      {inpatient && (
        <ConfirmationModal
          open={showDelete}
          onOpenChange={setShowDelete}
          variant="destructive"
          title="Delete Inpatient Record"
          description={`Delete inpatient record ${inpatient.ipNumber}? This cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={() => deleteInPatient.mutate(inpatient.id)}
          isLoading={deleteInPatient.isPending}
        />
      )}
    </>
  )
}

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

// ─── Table columns ─────────────────────────────────────────────────────────────

const columns: ColumnDef<InPatient>[] = [
  {
    key: "ipNumber",
    header: "IP No.",
    cell: (ip) => <span className="font-mono text-xs">{ip.ipNumber}</span>,
  },
  {
    key: "patient",
    header: "Patient",
    cell: (ip) =>
      ip.firstName ? (
        <div>
          <div className="font-semibold text-sm">{`${ip.firstName} ${ip.lastName ?? ""}`.trim()}</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {ip.dateOfBirth && <>{calculateAge(ip.dateOfBirth)}y · </>}
            {ip.gender && <>{ip.gender.charAt(0)} · </>}
            <span className="tabular-nums">{ip.phone}</span>
          </div>
        </div>
      ) : (
        ip.patientId.slice(0, 8) + "…"
      ),
  },
  {
    key: "doctors",
    header: "Doctor(s)",
    cell: (ip) => {
      if (!ip.onDutyDoctors || ip.onDutyDoctors === "[]") {
        return <span className="text-[var(--color-muted-foreground)]">—</span>
      }
      try {
        const doctors = JSON.parse(ip.onDutyDoctors) as string[]
        return <span className="text-sm">{doctors.join(", ") || "—"}</span>
      } catch {
        return <span className="text-[var(--color-muted-foreground)]">—</span>
      }
    },
  },
  {
    key: "operation",
    header: "Operation",
    cell: (ip) =>
      ip.operationName ?? (
        <span className="text-muted-foreground/50 italic text-xs">Not assigned</span>
      ),
  },
  {
    key: "admissionDate",
    header: "Admitted",
    cell: (ip) => format(new Date(ip.admissionDate), "dd MMM yyyy"),
  },
  {
    key: "ward",
    header: "Ward",
    cell: (ip) => ip.ward ?? "—",
  },
  {
    key: "bedNumber",
    header: "Bed",
    cell: (ip) => ip.bedNumber ?? "—",
  },
  {
    key: "status",
    header: "Status",
    cell: (ip) => <StatusPill status={ip.status.toUpperCase()} size="sm" />,
  },
  {
    key: "balance",
    header: "Balance",
    align: "right",
    cell: (ip) => (
      <span
        className={cn(
          "font-semibold text-sm tabular-nums",
          (ip.balanceAmount ?? 0) > 0 ? "text-orange-600" : "text-green-600",
        )}
      >
        {formatCurrency(ip.balanceAmount ?? 0)}
      </span>
    ),
  },
]

// ─── IpdTab component ─────────────────────────────────────────────────────────

export interface IpdTabProps {
  canEdit: boolean
  canDelete: boolean
  canDischarge: boolean
}

export interface IpdTabHandle {
  /** Refetches the current page — main's header Refresh button lives one level up. */
  refetch: () => void
}

export const IpdTab = forwardRef<IpdTabHandle, IpdTabProps>(function IpdTab(
  { canEdit, canDelete, canDischarge },
  ref,
) {
  const [selectedInPatientId, setSelectedInPatientId] = useState<string | null>(null)
  const [showDetail, setShowDetail] = useState(false)

  const {
    data,
    total,
    page,
    pageSize,
    isLoading,
    isFetching,
    isError,
    error,
    setPage,
    setPageSize,
    refetch,
  } = useIpdInPatients(null, null, true)

  useImperativeHandle(ref, () => ({
    refetch: () => void refetch(),
  }))

  return (
    <div className="space-y-4">
      {/* No toolbar here — main's embedded IPD tab inside PatientsPage renders
          the table directly with no filter row at all (confirmed against
          main's actual source); filtering lives on the separate, fuller
          /inpatients route (InPatientsPage). */}

      {/* ── Inpatient table ───────────────────────────────────────────────── */}
      <PaginatedDataTable<InPatient>
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
        aria-label="Inpatients table"
        onRowClick={(ip) => {
          setSelectedInPatientId(ip.id)
          setShowDetail(true)
        }}
        emptyState={
          <EmptyState
            title="No inpatients found"
            description="Admitted patients will appear here."
          />
        }
      />

      {/* ── Inpatient detail sheet ─────────────────────────────────────────── */}
      <InPatientDetailSheet
        inPatientId={selectedInPatientId}
        open={showDetail}
        onOpenChange={setShowDetail}
        canEdit={canEdit}
        canDelete={canDelete}
        canDischarge={canDischarge}
        onDeleted={refetch}
      />
    </div>
  )
})
