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
 * decorative control with nothing to change. Stat badges show Total and
 * Completed only (computed client-side from the already-fetched queue,
 * grouping by the real `status` field) — main's exact 4-way Optometrist/
 * Doctor/Visited/Completed split needs a backend-side status taxonomy this
 * plan can't verify without reading Supabase function source, which is
 * outside this plan's remit (web/ only); showing only the countable,
 * unambiguous buckets avoids guessing at a label-to-status mapping.
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

  const completedCount = (queueQuery.data ?? []).filter(
    (p) => p.status === "COMPLETED" || p.status === "VISITED",
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
        description="Pre-consultation eye assessment with refraction and clinical findings."
        toolbar={
          !selectedPatient ? (
            <>
              <SearchBar
                variant="standalone"
                value={search}
                onChange={setSearch}
                placeholder="Search by name, ID, or phone…"
                aria-label="Search workup queue"
              />
              <StatBadge value={queueQuery.data?.length ?? 0} label="Total" variant="info" />
              <StatBadge value={completedCount} label="Completed" variant="success" />
            </>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setSelectedPatient(null)}>
              <ArrowLeft className="h-4 w-4 mr-1.5" aria-hidden="true" />
              Back to queue
            </Button>
          )
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
