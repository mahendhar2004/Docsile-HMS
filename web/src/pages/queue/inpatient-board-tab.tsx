/**
 * InpatientBoardTab — bed/status board for currently admitted inpatients.
 *
 * Data source: GET /queue/inpatients (status != DISCHARGED, ordered admissionDate ASC)
 * Realtime channel: hospital:{hospitalId}:beds
 * Watched tables: InPatient
 * Polling fallback: 10 s full refetch when Realtime disconnects
 */

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { BedDouble } from "lucide-react"
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
import type { InpatientEntry } from "./types"

// ─── Constants ────────────────────────────────────────────────────────────────

const POLLING_INTERVAL_MS = 10_000
const INPATIENT_TABLES = ["InPatient"] as const

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—"
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(new Date(iso))
}

/** Parse `onDutyDoctors` — JSON-encoded string array of doctor names. */
function parseDoctors(json: string): string {
  try {
    const parsed: unknown = JSON.parse(json)
    if (Array.isArray(parsed) && parsed.every((d) => typeof d === "string")) {
      return (parsed as string[]).join(", ") || "—"
    }
    return "—"
  } catch {
    return "—"
  }
}

// ─── Column definitions ───────────────────────────────────────────────────────

const COLUMNS: ColumnDef<InpatientEntry>[] = [
  {
    key: "ipNumber",
    header: "IP Number",
    cell: (row) => (
      <span className="font-mono text-xs font-medium text-foreground">{row.ipNumber}</span>
    ),
    minWidth: "90px",
  },
  {
    key: "patientId",
    header: "Patient ID",
    cell: (row) => (
      <span className="font-mono text-xs text-muted-foreground">{row.patientId}</span>
    ),
    minWidth: "80px",
  },
  {
    key: "admissionDate",
    header: "Admitted",
    cell: (row) => (
      <span className="text-sm text-muted-foreground">
        {formatDate(row.admissionDate)}
      </span>
    ),
    minWidth: "110px",
  },
  {
    key: "ward",
    header: "Ward",
    cell: (row) => <span className="text-sm">{row.ward ?? "—"}</span>,
    minWidth: "80px",
  },
  {
    key: "bedNumber",
    header: "Bed",
    cell: (row) => (
      <span className="text-sm font-medium">{row.bedNumber ?? "—"}</span>
    ),
    minWidth: "60px",
  },
  {
    key: "onDutyDoctors",
    header: "On-Duty Doctors",
    cell: (row) => (
      <span className="text-sm text-muted-foreground">
        {parseDoctors(row.onDutyDoctors)}
      </span>
    ),
    minWidth: "160px",
  },
  {
    key: "status",
    header: "Status",
    cell: (row) => <StatusPill status={row.status} dot />,
    minWidth: "130px",
  },
]

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function InpatientBoardSkeleton() {
  return (
    <div className="space-y-2" aria-busy="true" aria-label="Loading inpatient board">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full rounded-[var(--radius-sm)]" />
      ))}
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

interface InpatientBoardTabProps {
  hospitalId: string
}

export function InpatientBoardTab({ hospitalId }: InpatientBoardTabProps) {
  const [isLive, setIsLive] = useState(true)

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["queue", "inpatients"] as const,
    queryFn: () =>
      apiClient.get<InpatientEntry[]>("/queue/inpatients").then((e) => e.data),
    refetchInterval: isLive ? false : POLLING_INTERVAL_MS,
  })

  useQueueRealtime({
    channel: `hospital:${hospitalId}:beds`,
    hospitalId,
    tables: INPATIENT_TABLES,
    onEvent: () => void refetch(),
    onStatusChange: setIsLive,
  })

  return (
    <div className="space-y-4">
      {!isLive && (
        <AlertBanner
          variant="warning"
          title="Live updates paused"
          description="Realtime connection lost — refreshing every 10 seconds. Bed status may be slightly delayed."
        />
      )}

      {isLoading && <InpatientBoardSkeleton />}

      {error && !isLoading && (
        <ErrorState
          title="Could not load inpatient board"
          error={error}
          onRetry={() => void refetch()}
        />
      )}

      {!isLoading && !error && data && data.length === 0 && (
        <EmptyState
          icon={<BedDouble size={48} aria-hidden="true" />}
          title="No admitted inpatients"
          description="Patients admitted and not yet discharged will appear on this board."
        />
      )}

      {!isLoading && !error && data && data.length > 0 && (
        <DataTable
          data={data}
          columns={COLUMNS}
          aria-label="Inpatient bed and status board"
          variant="standard"
        />
      )}
    </div>
  )
}
