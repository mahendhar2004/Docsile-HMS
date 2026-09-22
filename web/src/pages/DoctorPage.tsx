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
 * Layout: fixed left sidebar (260px) with the doctor queue, main content area
 * with the consultation view. Queue stays visible while consulting.
 * Sidebar is collapsible on smaller viewports via toggle button.
 */

import { useState } from "react"
import { PanelLeftClose, PanelLeftOpen, Stethoscope } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageHeader, ErrorState, EmptyState } from "@/components/patterns"
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
  const [sidebarOpen, setSidebarOpen] = useState(true)

  // Queue hook — always called (hooks must be unconditional); disabled if no permission.
  const queueQuery = useDoctorQueue(hasView)

  // ── Permission gate ──────────────────────────────────────────────────────────
  if (!hasView) {
    return (
      <main className="p-6">
        <ErrorState
          title="Access denied"
          description="You need the doctor:view permission to access the doctor module. Contact your administrator."
        />
      </main>
    )
  }

  const doctorName = user?.name ?? ""

  return (
    <main className="flex h-full overflow-hidden" aria-label="Doctor module">
      {/* ── Left sidebar: doctor queue ──────────────────────────────────────── */}
      <aside
        aria-label="Doctor's patient queue"
        className={[
          "flex flex-col border-r border-border bg-surface transition-all duration-200 overflow-hidden shrink-0",
          sidebarOpen ? "w-72" : "w-0",
        ].join(" ")}
      >
        {sidebarOpen && (
          <>
            <div className="flex items-center justify-between px-3 py-3 border-b border-border">
              <span className="text-sm font-semibold text-foreground">Today's queue</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(false)}
                aria-label="Collapse queue sidebar"
              >
                <PanelLeftClose size={16} aria-hidden="true" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <DoctorQueue
                patients={queueQuery.data ?? []}
                loading={queueQuery.isLoading}
                error={queueQuery.error}
                onRefetch={() => void queueQuery.refetch()}
                selectedId={selectedPatientId}
                onSelectPatient={setSelectedPatientId}
              />
            </div>
          </>
        )}
      </aside>

      {/* ── Main content ─────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Page header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border shrink-0">
          {!sidebarOpen && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open queue sidebar"
            >
              <PanelLeftOpen size={16} aria-hidden="true" />
            </Button>
          )}
          <PageHeader
            title="Doctor"
            description="Patient consultation, prescription writing, and clinical assistance."
          />
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-hidden">
          {selectedPatientId ? (
            <ConsultationView
              patientId={selectedPatientId}
              doctorName={doctorName}
              canConsult={canConsult}
              canEdit={canEdit}
              canViewBilling={canViewBilling}
              apiBaseUrl={API_BASE_URL}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <EmptyState
                icon={<Stethoscope size={40} aria-hidden="true" />}
                title="Select a patient"
                description="Choose a patient from the queue on the left to start or continue their consultation."
              />
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
