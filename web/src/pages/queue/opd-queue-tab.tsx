/**
 * OpdQueueTab — today's OPD doctor queue.
 *
 * Data source: GET /queue/opd
 * Realtime channel: hospital:{hospitalId}:queue
 * Watched tables: Patient, Prescription, EyeReading
 * Polling fallback: 10 s full refetch when Realtime disconnects
 */

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { ClipboardList, Eye, Users } from "lucide-react"
import { apiClient } from "@/lib/api-client"
import {
  DataTable,
  EmptyState,
  ErrorState,
  AlertBanner,
  StatusPill,
} from "@/components/patterns"
import type { ColumnDef } from "@/components/patterns"
import { Skeleton } from "@/components/ui/skeleton"
import { useQueueRealtime } from "./use-queue-realtime"
import type { OpdQueueEntry } from "./types"

// ─── Constants ────────────────────────────────────────────────────────────────

const POLLING_INTERVAL_MS = 10_000
const OPD_TABLES = ["Patient", "Prescription", "EyeReading"] as const

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—"
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  }).format(new Date(iso))
}

// ─── Column definitions ───────────────────────────────────────────────────────

const COLUMNS: ColumnDef<OpdQueueEntry>[] = [
  {
    key: "patientId",
    header: "Token",
    cell: (row) => (
      <span className="font-mono text-xs text-muted-foreground">{row.patientId}</span>
    ),
    minWidth: "80px",
  },
  {
    key: "name",
    header: "Patient",
    cell: (row) => (
      <span className="font-medium text-foreground">
        {row.firstName} {row.lastName}
      </span>
    ),
    minWidth: "160px",
  },
  {
    key: "phone",
    header: "Phone",
    cell: (row) => <span className="text-sm">{row.phone}</span>,
    minWidth: "110px",
  },
  {
    key: "appointment",
    header: "Appointment",
    cell: (row) => (
      <span className="text-sm text-muted-foreground">
        {formatDate(row.appointmentDate)}
      </span>
    ),
    minWidth: "140px",
  },
  {
    key: "workup",
    header: "Eye Reading",
    align: "center",
    cell: (row) => (
      <span
        aria-label={row.eyeReadings.length > 0 ? "Eye reading done" : "No eye reading"}
        className={
          row.eyeReadings.length > 0
            ? "text-[var(--color-success)]"
            : "text-[var(--color-muted-foreground)]"
        }
      >
        <Eye size={16} aria-hidden="true" className="inline" />
      </span>
    ),
    minWidth: "90px",
  },
  {
    key: "prescription",
    header: "Prescription",
    align: "center",
    cell: (row) => (
      <span
        aria-label={row.prescriptions.length > 0 ? "Prescription issued" : "No prescription"}
        className={
          row.prescriptions.length > 0
            ? "text-[var(--color-success)]"
            : "text-[var(--color-muted-foreground)]"
        }
      >
        <ClipboardList size={16} aria-hidden="true" className="inline" />
      </span>
    ),
    minWidth: "100px",
  },
  {
    key: "status",
    header: "Status",
    cell: (row) => <StatusPill status={row.status} dot />,
    minWidth: "130px",
  },
]

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function OpdQueueSkeleton() {
  return (
    <div className="space-y-2" aria-busy="true" aria-label="Loading OPD queue">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full rounded-[var(--radius-sm)]" />
      ))}
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

interface OpdQueueTabProps {
  hospitalId: string
}

export function OpdQueueTab({ hospitalId }: OpdQueueTabProps) {
  const [isLive, setIsLive] = useState(true)

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["queue", "opd"] as const,
    queryFn: () =>
      apiClient.get<OpdQueueEntry[]>("/queue/opd").then((e) => e.data),
    refetchInterval: isLive ? false : POLLING_INTERVAL_MS,
  })

  useQueueRealtime({
    channel: `hospital:${hospitalId}:queue`,
    hospitalId,
    tables: OPD_TABLES,
    onEvent: () => void refetch(),
    onStatusChange: setIsLive,
  })

  return (
    <div className="space-y-4">
      {!isLive && (
        <AlertBanner
          variant="warning"
          title="Live updates paused"
          description="Realtime connection lost — refreshing every 10 seconds. Data may be slightly delayed."
        />
      )}

      {isLoading && <OpdQueueSkeleton />}

      {error && !isLoading && (
        <ErrorState
          title="Could not load OPD queue"
          error={error}
          onRetry={() => void refetch()}
        />
      )}

      {!isLoading && !error && data && data.length === 0 && (
        <EmptyState
          icon={<Users size={48} aria-hidden="true" />}
          title="No patients in OPD queue today"
          description="Patients registered with today's appointment date will appear here."
        />
      )}

      {!isLoading && !error && data && data.length > 0 && (
        <DataTable
          data={data}
          columns={COLUMNS}
          aria-label="OPD doctor queue"
          variant="standard"
        />
      )}
    </div>
  )
}
