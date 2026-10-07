/**
 * WorkupPage — clinical workup (pre-consultation eye-reading) module,
 * matching main's "Refraction" page (src/app/(hospital)/workup/page.tsx +
 * components/WorkupPage.tsx) — title, search, stat badges, and an inline
 * takeover detail view instead of a right-side Sheet.
 *
 * Endpoints:
 *   - GET  /workup/queue                      → WorkupQueuePatient[]
 *   - GET  /workup/patients/{patientId}       → WorkupPatient
 *   - POST /workup/patients/{patientId}/eye-readings → EyeReadingRecord (upsert)
 *
 * Permissions:
 *   workup:view   — required to see the page and queue
 *   workup:create — required to save eye readings (form fields are read-only without it)
 *
 * No DateNavigator: GET /workup/queue has no `date` query param at all
 * (confirmed against .sde/schemas/openapi.yaml — always "today"
 * server-side, same limitation as the Doctor queue) — would be a
 * decorative control with nothing to change.
 *
 * Stat badges: main's exact 4-way split (Total / Optometrist / Doctor /
 * Completed), verified against both main's WorkupPage.tsx bucket check
 * and this backend's actual computeStatus() (supabase/functions/workup/
 * repository.ts) during final review — Optometrist = REGISTERED +
 * IN_WORKUP, Doctor = WORKUP_DONE + WITH_DOCTOR, Completed = COMPLETED +
 * MEDICAL_ONLY (this backend's computeStatus never actually emits
 * IN_WORKUP/WITH_DOCTOR, only REGISTERED/WORKUP_DONE/MEDICAL_ONLY/
 * COMPLETED or a manual override, but checking for the extra values is
 * harmless and keeps the mapping faithful to main's own logic).
 */

import * as React from "react"
import type { UseQueryResult } from "@tanstack/react-query"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { PageHeader, SearchBar, StatBadge, ErrorState, StatusPill } from "@/components/patterns"
import { usePermissions } from "@/hooks/usePermissions"
import { EyeReadingForm } from "./workup/eye-reading-form"
import { WorkupQueue } from "./workup/workup-queue"
import { useWorkupQueue, useWorkupPatient } from "./workup/use-workup"
import type { WorkupQueuePatient } from "./workup/types"

// ─── Patient workup detail (inner content) ───────────────────────────────────

interface PatientWorkupDetailProps {
  patientId: string
  hasCreate: boolean
}

/**
 * Inner content of the workup detail view.
 * Separated into its own component so useWorkupPatient is only mounted when
 * a patient is selected — the hook is always called (no conditional hook call),
 * but the `enabled` flag prevents the fetch until patientId is real.
 */
function PatientWorkupDetail({ patientId, hasCreate }: PatientWorkupDetailProps) {
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

  const [selectedPatient, setSelectedPatient] = React.useState<WorkupQueuePatient | null>(null)
  const [search, setSearch] = React.useState("")

  // All hooks called unconditionally — early return comes after.
  const queueQuery = useWorkupQueue()

  const queueData = queueQuery.data ?? []
  const optometristCount = queueData.filter(
    (p) => p.status === "REGISTERED" || p.status === "IN_WORKUP",
  ).length
  const doctorCount = queueData.filter(
    (p) => p.status === "WORKUP_DONE" || p.status === "WITH_DOCTOR",
  ).length
  const completedCount = queueData.filter(
    (p) => p.status === "COMPLETED" || p.status === "MEDICAL_ONLY",
  ).length

  // Client-side search filter — WorkupQueue takes the whole UseQueryResult
  // (a discriminated union TS won't let us partially override by spreading),
  // so this narrows to a plain object with only the fields the component
  // actually reads (data/isLoading/error/refetch), cast back to the shape
  // it expects.
  const q = search.trim().toLowerCase()
  const filteredData = q
    ? (queueQuery.data ?? []).filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.patientId.toLowerCase().includes(q) ||
          (p.phone ?? "").toLowerCase().includes(q),
      )
    : queueQuery.data
  const displayedQueueQuery = {
    ...queueQuery,
    data: filteredData,
  } as unknown as UseQueryResult<WorkupQueuePatient[], Error>

  // ── Permission gate ───────────────────────────────────────────────────────
  if (!hasView) {
    return (
      <main>
        <ErrorState
          title="Access denied"
          description="You need the workup:view permission to access this page. Contact your administrator."
        />
      </main>
    )
  }

  return (
    <main className="space-y-4">
      <PageHeader
        title="Refraction"
        description="Pre-consultation assessment"
        onRefresh={!selectedPatient ? () => queueQuery.refetch() : undefined}
        actions={
          !selectedPatient ? (
            <>
              <StatBadge value={queueData.length} label="Total" variant="default" />
              <StatBadge value={optometristCount} label="Optometrist" variant="destructive" />
              <StatBadge value={doctorCount} label="Doctor" variant="warning" />
              <StatBadge value={completedCount} label="Completed" variant="success" />
            </>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setSelectedPatient(null)}>
              <ArrowLeft className="h-4 w-4 mr-1.5" aria-hidden="true" />
              Back to queue
            </Button>
          )
        }
        toolbar={
          !selectedPatient ? (
            <SearchBar
              variant="standalone"
              value={search}
              onChange={setSearch}
              placeholder="Search by name, ID, or phone…"
              aria-label="Search workup queue"
            />
          ) : undefined
        }
      />

      {selectedPatient ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-semibold text-foreground truncate">
              {selectedPatient.name}
            </h2>
            <span className="text-sm text-muted-foreground">
              {selectedPatient.patientId}
              {selectedPatient.age != null && <> · {selectedPatient.age} yrs</>}
              {selectedPatient.gender && <> · {selectedPatient.gender}</>}
            </span>
            <StatusPill status={selectedPatient.status} dot />
          </div>
          <PatientWorkupDetail patientId={selectedPatient.patientId} hasCreate={hasCreate} />
        </div>
      ) : (
        <section aria-label="Today's workup queue">
          <WorkupQueue query={displayedQueueQuery} onSelectPatient={setSelectedPatient} />
        </section>
      )}
    </main>
  )
}
