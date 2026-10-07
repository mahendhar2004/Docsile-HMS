/**
 * InPatientsPage — full in-patient management (page, not a tab), matching
 * main's separate /inpatients route (src/app/(hospital)/inpatients/page.tsx
 * + components/InPatientsPage.tsx) — admission wizard, detail view, status
 * update, delete. The lightweight embedded tab on /patients
 * (patient-care/ipd-tab.tsx) is view-only by comparison; admission only
 * happens here.
 *
 * Stat badges: main's InPatientsPage shows 5 richer stats (totalAdmitted,
 * activeInStay, readyToDischarge, dischargedToday, totalBalancePending)
 * computed server-side against a richer status enum (PRE_OP/IN_SURGERY/
 * POST_OP/READY_FOR_DISCHARGE/etc). This app's actual backend contract
 * (.sde/schemas/openapi.yaml GET /patient-care/inpatients) only tracks two
 * statuses — admitted | discharged — so only those two counts are real;
 * showing main's richer breakdown would mean fabricating numbers the
 * backend cannot produce. Two StatBadges (Admitted, Discharged) instead,
 * each backed by the same paginated-list endpoint's real `meta.total`.
 *
 * Permissions: inpatients:view (page gate), inpatients:create (Admit
 * button), inpatients:edit, inpatients:delete, inpatients:discharge.
 */

import { useState } from "react"
import { format } from "date-fns"
import { Plus, Trash2, RefreshCw } from "lucide-react"
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
  PageHeader,
  PaginatedDataTable,
  ColumnDef,
  StatusPill,
  StatBadge,
  SegmentedControl,
  SingleSelect,
  ConfirmationModal,
  EmptyState,
  ErrorState,
  PageToolbar,
} from "@/components/patterns"
import { usePermissions } from "@/hooks/usePermissions"
import {
  useIpdInPatients,
  useInPatientDetail,
  useUpdateInPatientStatus,
  useDeleteInPatient,
} from "./patient-care/hooks"
import { InpatientAdmissionForm } from "./patient-care/inpatient-admission-form"
import type { InPatient } from "./patient-care/types"

// ─── Static options ───────────────────────────────────────────────────────────

const STATUS_FILTER_OPTIONS = [
  { value: "", label: "All" },
  { value: "admitted", label: "Admitted" },
  { value: "discharged", label: "Discharged" },
]

const INPATIENT_STATUS_OPTIONS = [
  { value: "admitted", label: "Admitted" },
  { value: "discharged", label: "Discharged" },
]

// ─── InPatient detail sheet (identical to the embedded tab's) ────────────────

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
                    {inpatient.phone && <DetailRow label="Phone" value={inpatient.phone} />}
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
  { key: "ipNumber", header: "IP No.", cell: (ip) => <span className="font-mono text-xs">{ip.ipNumber}</span> },
  {
    key: "patient",
    header: "Patient",
    cell: (ip) => (ip.firstName ? `${ip.firstName} ${ip.lastName ?? ""}`.trim() : ip.patientId.slice(0, 8) + "…"),
  },
  { key: "admissionDate", header: "Admitted", cell: (ip) => format(new Date(ip.admissionDate), "dd MMM yyyy") },
  { key: "ward", header: "Ward", cell: (ip) => ip.ward ?? "—" },
  { key: "bedNumber", header: "Bed", cell: (ip) => ip.bedNumber ?? "—" },
  { key: "status", header: "Status", cell: (ip) => <StatusPill status={ip.status.toUpperCase()} size="sm" /> },
]

// ─── InPatientsPage ────────────────────────────────────────────────────────────

export default function InPatientsPage() {
  const { can } = usePermissions()
  const hasAccess = can("inpatients:view")
  const canCreate = can("inpatients:create")
  const canEdit = can("inpatients:edit")
  const canDelete = can("inpatients:delete")
  const canDischarge = can("inpatients:discharge")

  const [filterStatus, setFilterStatus] = useState<string>("")
  const [selectedInPatientId, setSelectedInPatientId] = useState<string | null>(null)
  const [showDetail, setShowDetail] = useState(false)
  const [showAdmit, setShowAdmit] = useState(false)

  const {
    data, total, page, pageSize, isLoading, isFetching, isError, error,
    setPage, setPageSize, refetch,
  } = useIpdInPatients(null, filterStatus || null)

  // Real backend-derived counts (meta.total from the same endpoint, filtered
  // by status) — not fabricated, but also not main's richer 5-stat
  // breakdown, which needs status categories this backend doesn't have.
  const { total: admittedCount } = useIpdInPatients(null, "admitted")
  const { total: dischargedCount } = useIpdInPatients(null, "discharged")

  if (!hasAccess) {
    return (
      <main>
        <ErrorState
          title="Access denied"
          description="You need inpatients:view permission to access this module. Contact your administrator."
        />
      </main>
    )
  }

  return (
    <main className="space-y-4">
      <PageHeader
        title="In-Patients"
        description="Admission & ward management"
        onRefresh={refetch}
        actions={
          <>
            <StatBadge value={admittedCount} label="Admitted" variant="info" />
            <StatBadge value={dischargedCount} label="Discharged" variant="success" />
          </>
        }
      />

      {/* No date filter: main's InPatients toolbar is search + status pills
          only (no DateNavigator) — confirmed against main's actual source. */}
      <PageToolbar className="items-start sm:items-center">
        <SegmentedControl
          options={STATUS_FILTER_OPTIONS}
          value={filterStatus}
          onValueChange={(v) => { setFilterStatus(v); setPage(1) }}
          aria-label="Filter by inpatient status"
        />

        {canCreate && (
          <Button onClick={() => setShowAdmit(true)} className="ml-auto">
            <Plus className="h-4 w-4 mr-1.5" aria-hidden />
            Admit Patient
          </Button>
        )}
      </PageToolbar>

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
        onRowClick={(ip) => { setSelectedInPatientId(ip.id); setShowDetail(true) }}
        emptyState={
          <EmptyState
            title="No inpatients found"
            description={filterStatus ? "Try adjusting the filters above." : "Admitted patients will appear here."}
            action={canCreate ? { label: "Admit Patient", onClick: () => setShowAdmit(true) } : undefined}
          />
        }
      />

      <InPatientDetailSheet
        inPatientId={selectedInPatientId}
        open={showDetail}
        onOpenChange={setShowDetail}
        canEdit={canEdit}
        canDelete={canDelete}
        canDischarge={canDischarge}
        onDeleted={refetch}
      />

      <InpatientAdmissionForm
        open={showAdmit}
        onOpenChange={setShowAdmit}
        onSuccess={() => void refetch()}
      />
    </main>
  )
}
