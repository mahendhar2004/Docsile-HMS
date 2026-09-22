/**
 * WorkupPage — clinical workup (pre-consultation eye-reading) module.
 *
 * Endpoints:
 *   - GET  /workup/queue                      → WorkupQueuePatient[]
 *   - GET  /workup/patients/{id}              → WorkupPatient
 *   - POST /workup/patients/{id}/eye-readings → EyeReadingRecord (upsert)
 *
 * Permissions:
 *   workup:view   — required to see the page and queue
 *   workup:create — required to save eye readings (form fields are read-only without it)
 *
 * Layout:
 *   - WorkupQueue (DataTable) fills the main area.
 *   - Clicking a row opens a right-side Sheet with the patient's workup detail
 *     and the structured eye-reading form. The queue stays visible behind it.
 */

import * as React from "react"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetBody,
} from "@/components/ui/sheet"
import { PageHeader, ErrorState, StatusPill } from "@/components/patterns"
import { usePermissions } from "@/hooks/usePermissions"
import { EyeReadingForm } from "./workup/eye-reading-form"
import { WorkupQueue } from "./workup/workup-queue"
import { useWorkupQueue, useWorkupPatient } from "./workup/use-workup"
import type { WorkupQueuePatient } from "./workup/types"

// ─── Patient workup sheet (inner content) ────────────────────────────────────

interface PatientWorkupSheetProps {
  patientId: string
  hasCreate: boolean
}

/**
 * Inner content of the workup Sheet.
 * Separated into its own component so useWorkupPatient is only mounted when
 * a patient is selected — the hook is always called (no conditional hook call),
 * but the `enabled` flag prevents the fetch until patientId is real.
 */
function PatientWorkupSheet({ patientId, hasCreate }: PatientWorkupSheetProps) {
  const { data: patient, isLoading, error } = useWorkupPatient(patientId)

  if (isLoading) {
    return (
      <div className="space-y-4" aria-busy="true" aria-label="Loading patient data">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-4 w-32" />
        <div className="space-y-3 pt-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
    )
  }

  if (error || !patient) {
    return (
      <ErrorState
        title="Could not load patient data"
        error={error ?? undefined}
        description={!error ? "Patient not found." : undefined}
      />
    )
  }

  const existingReading = patient.eyeReadings[0] ?? null

  return (
    <EyeReadingForm
      patientId={patientId}
      patientName={patient.name}
      existingReading={existingReading}
      hasCreate={hasCreate}
    />
  )
}

// ─── WorkupPage ───────────────────────────────────────────────────────────────

export default function WorkupPage() {
  const { can } = usePermissions()
  const hasView = can("workup:view")
  const hasCreate = can("workup:create")

  const [selectedPatient, setSelectedPatient] =
    React.useState<WorkupQueuePatient | null>(null)

  // All hooks called unconditionally — early return comes after.
  const queueQuery = useWorkupQueue()

  // ── Permission gate ───────────────────────────────────────────────────────
  if (!hasView) {
    return (
      <main className="p-6">
        <ErrorState
          title="Access denied"
          description="You need the workup:view permission to access this page. Contact your administrator."
        />
      </main>
    )
  }

  const handleSelectPatient = (patient: WorkupQueuePatient) => {
    setSelectedPatient(patient)
  }

  const handleSheetClose = (open: boolean) => {
    if (!open) setSelectedPatient(null)
  }

  return (
    <main className="p-6 space-y-6">
      <PageHeader
        title="Workup"
        description="Pre-consultation eye reading for today's OPD patients."
      />

      {/* Workup queue table */}
      <section aria-label="Today's workup queue">
        <WorkupQueue query={queueQuery} onSelectPatient={handleSelectPatient} />
      </section>

      {/* Patient workup detail — right-side Sheet */}
      <Sheet
        open={selectedPatient != null}
        onOpenChange={handleSheetClose}
      >
        <SheetContent size="lg" aria-label="Patient workup detail">
          <SheetHeader>
            <div className="flex items-center gap-3 pr-8">
              <div className="flex-1 min-w-0">
                <SheetTitle className="truncate">
                  {selectedPatient?.name ?? "Patient Workup"}
                </SheetTitle>
                <SheetDescription>
                  {selectedPatient != null && (
                    <>
                      {selectedPatient.patientId}
                      {selectedPatient.age != null && (
                        <> · {selectedPatient.age} yrs</>
                      )}
                      {selectedPatient.gender && (
                        <> · {selectedPatient.gender}</>
                      )}
                    </>
                  )}
                </SheetDescription>
              </div>
              {selectedPatient != null && (
                <StatusPill status={selectedPatient.status} dot />
              )}
            </div>
          </SheetHeader>

          <SheetBody>
            {selectedPatient != null && (
              <PatientWorkupSheet
                patientId={selectedPatient.patientId}
                hasCreate={hasCreate}
              />
            )}
          </SheetBody>
        </SheetContent>
      </Sheet>
    </main>
  )
}
