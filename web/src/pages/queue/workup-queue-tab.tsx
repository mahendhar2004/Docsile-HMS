/**
 * WorkupQueueTab — today's pre-consultation workup queue.
 *
 * Data source: GET /queue/workup
 * Realtime channel: hospital:{hospitalId}:queue
 * Watched tables: Patient, EyeReading
 * Polling fallback: 10 s full refetch when Realtime disconnects
 */

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Eye, Users } from "lucide-react"
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
import type { WorkupQueueEntry } from "./types"

// ─── Constants ────────────────────────────────────────────────────────────────

const POLLING_INTERVAL_MS = 10_000
const WORKUP_TABLES = ["Patient", "EyeReading"] as const

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

const COLUMNS: ColumnDef<WorkupQueueEntry>[] = [
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
    key: "eyeReading",
    header: "Eye Reading",
    align: "center",
    cell: (row) => (
      <span
        aria-label={row.eyeReadings.length > 0 ? "Eye reading done" : "Pending eye reading"}
        className={
          row.eyeReadings.length > 0
            ? "text-[var(--color-success)]"
            : "text-[var(--color-muted-foreground)]"
        }
      >
        <Eye size={16} aria-hidden="true" className="inline" />
      </span>
    ),
    minWidth: "100px",
  },
  {
    key: "referredBy",
    header: "Referred By",
    cell: (row) => (
      <span className="text-sm text-muted-foreground">{row.referredBy ?? "—"}</span>
    ),
    minWidth: "120px",
  },
  {
    key: "status",
    header: "Status",
    cell: (row) => <StatusPill status={row.status} dot />,
    minWidth: "130px",
  },
]

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function WorkupQueueSkeleton() {
  return (
    <div className="space-y-2" aria-busy="true" aria-label="Loading workup queue">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full rounded-[--radius-sm]" />
      ))}
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

interface WorkupQueueTabProps {
  hospitalId: string
}

export function WorkupQueueTab({ hospitalId }: WorkupQueueTabProps) {
  const [isLive, setIsLive] = useState(true)

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["queue", "workup"] as const,
    queryFn: () =>
      apiClient.get<WorkupQueueEntry[]>("/queue/workup").then((e) => e.data),
    refetchInterval: isLive ? false : POLLING_INTERVAL_MS,
  })

  useQueueRealtime({
    channel: `hospital:${hospitalId}:queue`,
    hospitalId,
    tables: WORKUP_TABLES,
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

      {isLoading && <WorkupQueueSkeleton />}

      {error && !isLoading && (
        <ErrorState
          title="Could not load workup queue"
          error={error}
          onRetry={() => void refetch()}
        />
      )}

      {!isLoading && !error && data && data.length === 0 && (
        <EmptyState
          icon={<Users size={48} aria-hidden="true" />}
          title="No patients in workup queue today"
          description="Patients awaiting pre-consultation eye workup will appear here."
        />
      )}

      {!isLoading && !error && data && data.length > 0 && (
        <DataTable
          data={data}
          columns={COLUMNS}
          aria-label="Workup queue"
          variant="standard"
        />
      )}
    </div>
  )
}
