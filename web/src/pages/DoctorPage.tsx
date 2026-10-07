/**
 * DoctorPage — doctor consultation module (page 5/18).
 *
 * Endpoints:
 *   GET  /doctor/queue                              → DoctorQueuePatient[]
 *   GET  /doctor/patients/{id}/consultation         → ConsultationPatient
 *   POST /doctor/patients/{id}/prescriptions        → PrescriptionRecord (upsert)
 *   GET  /doctor/reference-data                     → ReferenceData (medicines, investigations, templates, dropdowns)
 *   POST /doctor/medicines                          → MedicineMasterRecord (create new medicine)
 *   POST /doctor/dropdown-options                   → void (add dropdown option)
 *   GET  /doctor/patients/{id}/receipt              → opened in new tab (billing:view)
 *   POST /doctor/ai/ask                             → { answer: string } (Sitha AI)
 *
 * Permissions:
 *   doctor:view    — page access, queue, consultation, reference data
 *   doctor:consult — save prescription, create medicine, add dropdown option, AI assist
 *   doctor:edit    — (fallback for save prescription when doctor:consult absent)
 *   billing:view   — print receipt button
 *
 * Layout: matches main's queue-table-takeover IA (src/app/(hospital)/doctor/
 * page.tsx on main) — a full-width queue when no patient is selected, which
 * is replaced by the consultation view on row click (not a permanent
 * sidebar alongside it). main's queue also has a DateNavigator, but
 * GET /doctor/queue has no `date` query param at all (confirmed against
 * .sde/schemas/openapi.yaml — it's always "today" server-side), so a date
 * navigator here would be decorative with nothing to actually change; left
 * out rather than shipping a non-functional control. Search is a client-side
 * filter over the already-fetched queue (no backend support needed for
 * that, since the whole list is already in memory).
 */

import { useMemo, useState } from "react"
import { ArrowLeft, Stethoscope } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageHeader, SearchBar, StatBadge, ErrorState, EmptyState } from "@/components/patterns"
import { usePermissions } from "@/hooks/usePermissions"
import { useSessionStore } from "@/store/session"
import { useDoctorQueue } from "./doctor/hooks"
import { DoctorQueue } from "./doctor/doctor-queue"
import { ConsultationView } from "./doctor/consultation-view"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string

// ─── DoctorPage ───────────────────────────────────────────────────────────────

export default function DoctorPage() {
  const { can } = usePermissions()
  const user = useSessionStore((s) => s.user)

  const hasView = can("doctor:view")
  const canConsult = can("doctor:consult")
  const canEdit = can("doctor:edit")
  const canViewBilling = can("billing:view")

  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null)
  const [search, setSearch] = useState("")

  // Queue hook — always called (hooks must be unconditional); disabled if no permission.
  const queueQuery = useDoctorQueue(hasView)

  const filteredPatients = useMemo(() => {
    const patients = queueQuery.data ?? []
    const q = search.trim().toLowerCase()
    if (!q) return patients
    return patients.filter((p) => {
      const fullName = `${p.firstName} ${p.lastName}`.toLowerCase()
      return (
        fullName.includes(q) ||
        p.patientId.toLowerCase().includes(q) ||
        p.phone?.toLowerCase().includes(q)
      )
    })
  }, [queueQuery.data, search])

  // ── Permission gate ──────────────────────────────────────────────────────────
  if (!hasView) {
    return (
      <main>
        <ErrorState
          title="Access denied"
          description="You need the doctor:view permission to access the doctor module. Contact your administrator."
        />
      </main>
    )
  }

  const doctorName = user?.name ?? ""

  return (
    <main className="space-y-4" aria-label="Doctor module">
      <PageHeader
        title="Doctor Console"
        description="Patient queue & consultation"
        onRefresh={!selectedPatientId ? () => queueQuery.refetch() : undefined}
        actions={
          !selectedPatientId ? (
            <StatBadge value={queueQuery.data?.length ?? 0} label="in queue" variant="info" />
          ) : (
            <Button variant="outline" size="sm" onClick={() => setSelectedPatientId(null)}>
              <ArrowLeft className="h-4 w-4 mr-1.5" aria-hidden="true" />
              Back to queue
            </Button>
          )
        }
        toolbar={
          !selectedPatientId ? (
            <SearchBar
              variant="standalone"
              value={search}
              onChange={setSearch}
              placeholder="Search by name, ID, or phone…"
              aria-label="Search doctor queue"
            />
          ) : undefined
        }
      />

      {selectedPatientId ? (
        <ConsultationView
          patientId={selectedPatientId}
          doctorName={doctorName}
          canConsult={canConsult}
          canEdit={canEdit}
          canViewBilling={canViewBilling}
          apiBaseUrl={API_BASE_URL}
        />
      ) : filteredPatients.length === 0 && !queueQuery.isLoading && !queueQuery.error ? (
        <EmptyState
          icon={<Stethoscope size={40} aria-hidden="true" />}
          title={search ? "No matches" : "No patients yet"}
          description={
            search
              ? "Try a different name, ID, or phone number."
              : "Today's OPD queue is empty. Patients will appear as they register."
          }
        />
      ) : (
        <DoctorQueue
          patients={filteredPatients}
          loading={queueQuery.isLoading}
          error={queueQuery.error}
          onRefetch={() => void queueQuery.refetch()}
          selectedId={selectedPatientId}
          onSelectPatient={setSelectedPatientId}
        />
      )}
    </main>
  )
}
