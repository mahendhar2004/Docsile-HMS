/**
 * doctor/doctor-queue.tsx
 *
 * Today's OPD queue visible to the doctor. Matches main's actual table
 * structure (src/app/(hospital)/doctor/components/DoctorPage.tsx) — a real
 * data table, not a card list. Main's table supports 29 user-customizable
 * columns persisted server-side (updateUserPreferences({ doctorColumns })) —
 * that full customization system needs a new backend preference endpoint
 * this app doesn't have, so this shows a fixed set of main's default
 * columns instead: Patient ID, Name, Phone, Type, Appointment, Status.
 * Main's other defaults (Token #, Age, Doctor, Services, Total, Print) rely
 * on fields GET /doctor/queue doesn't return at all (no billing/doctor-name
 * data on this endpoint) — can't show those without fabricating data.
 */

import { StatusPill, ErrorState, EmptyState, DataTable } from "@/components/patterns"
import type { ColumnDef } from "@/components/patterns"
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
      <div className="rounded-[var(--radius-lg)] border border-border overflow-hidden" aria-label="Loading doctor queue">
        <div className="bg-muted/50 px-4 py-2.5 border-b border-border flex gap-8">
          {Array.from({ length: 6 }).map((_, i) => (
            // eslint-disable-next-line react/no-array-index-key
            <div key={i} className="h-3 w-20 bg-muted animate-pulse rounded" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return <ErrorState title="Could not load queue" error={error} onRetry={onRefetch} />
  }

  if (patients.length === 0) {
    return (
      <EmptyState
        title="No patients yet"
        description="Today's OPD queue is empty. Patients will appear as they register."
      />
    )
  }

  const columns: ColumnDef<DoctorQueuePatient>[] = [
    {
      key: "patientId",
      header: "Patient ID",
      cell: (p) => <span className="font-mono text-xs">{p.patientId}</span>,
    },
    {
      key: "name",
      header: "Name",
      cell: (p) => (
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{`${p.firstName} ${p.lastName}`.trim()}</span>
          {p.eyeReadings.length > 0 && (
            <span className="text-xs text-success-soft-foreground" title="Eye reading done" aria-label="Eye reading done">
              Eye ✓
            </span>
          )}
          {p.prescriptions.length > 0 && (
            <span className="text-xs text-primary" title="Prescription exists" aria-label="Prescription exists">
              Rx ✓
            </span>
          )}
        </div>
      ),
    },
    { key: "phone", header: "Phone", cell: (p) => <span className="text-sm text-muted-foreground">{p.phone}</span> },
    { key: "patientType", header: "Type", cell: (p) => <span className="text-sm text-muted-foreground">{p.patientType}</span> },
    { key: "appointmentDate", header: "Appointment", cell: (p) => <span className="text-sm text-muted-foreground">{formatTime(p.appointmentDate)}</span> },
    { key: "status", header: "Status", cell: (p) => <StatusPill status={p.status} size="sm" /> },
  ]

  return (
    <DataTable<DoctorQueuePatient>
      aria-label="Doctor's patient queue"
      data={patients}
      columns={columns}
      onRowClick={(p) => onSelectPatient(p.patientId)}
      rowClassName={(p) => (p.patientId === selectedId ? "bg-primary/8" : undefined)}
    />
  )
}
