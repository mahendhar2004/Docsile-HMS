/**
 * doctor/doctor-queue.tsx
 *
 * The left-panel queue: all OPD patients visible to the doctor today.
 * Clicking a row selects a patient and loads their consultation view.
 */

import { Skeleton } from "@/components/ui/skeleton"
import { StatusPill } from "@/components/patterns"
import { ErrorState, EmptyState } from "@/components/patterns"
import { cn } from "@/lib/utils"
import type { DoctorQueuePatient } from "./types"

// ─── Props ────────────────────────────────────────────────────────────────────

interface DoctorQueueProps {
  patients: DoctorQueuePatient[]
  loading: boolean
  error: Error | null
  onRefetch: () => void
  selectedId: string | null
  onSelectPatient: (id: string) => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(dateStr: string): string {
  try {
    return new Intl.DateTimeFormat("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Kolkata",
    }).format(new Date(dateStr))
  } catch {
    return "—"
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DoctorQueue({
  patients,
  loading,
  error,
  onRefetch,
  selectedId,
  onSelectPatient,
}: DoctorQueueProps) {
  if (loading) {
    return (
      <div className="flex flex-col gap-2 p-3" aria-label="Loading doctor queue">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-1 px-2 py-2.5 rounded-md">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-3">
        <ErrorState
          title="Could not load queue"
          error={error}
          onRetry={onRefetch}
        />
      </div>
    )
  }

  if (patients.length === 0) {
    return (
      <div className="p-3">
        <EmptyState
          title="No patients yet"
          description="Today's OPD queue is empty. Patients will appear as they register."
        />
      </div>
    )
  }

  return (
    <ol
      className="flex flex-col divide-y divide-border"
      aria-label="Doctor's patient queue"
    >
      {patients.map((patient) => {
        const isSelected = patient.id === selectedId
        const fullName = `${patient.firstName} ${patient.lastName}`.trim()
        const hasWorkup = patient.eyeReadings.length > 0
        const hasPrescription = patient.prescriptions.length > 0

        return (
          <li key={patient.id}>
            <button
              type="button"
              aria-pressed={isSelected}
              aria-label={`Select patient ${fullName}`}
              onClick={() => onSelectPatient(patient.id)}
              className={cn(
                "w-full text-left px-3 py-3 flex flex-col gap-1",
                "hover:bg-muted/60 focus-visible:outline-none focus-visible:bg-muted/60",
                "motion-interactive",
                isSelected && "bg-primary/8 border-l-2 border-l-primary",
              )}
            >
              {/* Name + token */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-foreground truncate">
                  {fullName}
                </span>
                <span className="text-xs text-muted-foreground shrink-0">
                  {patient.patientId}
                </span>
              </div>

              {/* Time + status */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">
                  {formatTime(patient.appointmentDate)}
                </span>
                <StatusPill status={patient.status} size="sm" />
              </div>

              {/* Indicators */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {hasWorkup && (
                  <span
                    className="text-success-soft-foreground"
                    title="Eye reading done"
                    aria-label="Eye reading done"
                  >
                    Eye ✓
                  </span>
                )}
                {hasPrescription && (
                  <span
                    className="text-primary"
                    title="Prescription exists"
                    aria-label="Prescription exists"
                  >
                    Rx ✓
                  </span>
                )}
              </div>
            </button>
          </li>
        )
      })}
    </ol>
  )
}
