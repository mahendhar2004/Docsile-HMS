/**
 * workup/workup-queue.tsx
 *
 * WorkupQueue — today's patient workup list.
 *
 * Handles its own loading/error/empty states; delegates row clicks to the
 * parent page which manages the Sheet open state.
 */

import * as React from "react"
import type { UseQueryResult } from "@tanstack/react-query"
import { Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { DataTable, EmptyState, ErrorState, StatusPill } from "@/components/patterns"
import type { ColumnDef } from "@/components/patterns"
import type { WorkupQueuePatient } from "./types"

// ─── Formatting helpers ───────────────────────────────────────────────────────

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—"
  try {
    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Kolkata",
    }).format(new Date(dateStr))
  } catch {
    return dateStr
  }
}

// ─── Column definitions ───────────────────────────────────────────────────────

function buildColumns(
  onSelectPatient: (p: WorkupQueuePatient) => void,
): ColumnDef<WorkupQueuePatient>[] {
  return [
    {
      key: "patient",
      header: "Patient",
      cell: (p) => (
        <div>
          <p className="text-sm font-medium text-foreground">{p.name}</p>
          <p className="text-xs text-muted-foreground">{p.patientId}</p>
        </div>
      ),
      minWidth: "140px",
    },
    {
      key: "details",
      header: "Age / Gender",
      cell: (p) => {
        const parts: string[] = []
        if (p.age != null) parts.push(String(p.age))
        if (p.gender) parts.push(p.gender)
        return (
          <span className="text-sm text-muted-foreground">
            {parts.length > 0 ? parts.join(" / ") : "—"}
          </span>
        )
      },
    },
    {
      key: "appointment",
      header: "Appointment",
      cell: (p) => (
        <span className="text-sm text-muted-foreground">
          {formatDate(p.appointmentDate)}
        </span>
      ),
      minWidth: "130px",
    },
    {
      key: "status",
      header: "Status",
      cell: (p) => <StatusPill status={p.status} dot />,
    },
    {
      key: "action",
      header: "",
      cell: (p) => (
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            onSelectPatient(p)
          }}
          aria-label={`Open workup for ${p.name}`}
        >
          <Eye className="h-4 w-4 mr-1.5" aria-hidden="true" />
          Workup
        </Button>
      ),
      align: "right",
    },
  ]
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function WorkupQueueSkeleton() {
  return (
    <div className="space-y-2" aria-busy="true" aria-label="Loading workup queue">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-border">
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-8 w-20 rounded-sm" />
        </div>
      ))}
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export interface WorkupQueueProps {
  query: UseQueryResult<WorkupQueuePatient[], Error>
  onSelectPatient: (patient: WorkupQueuePatient) => void
}

export function WorkupQueue({ query, onSelectPatient }: WorkupQueueProps) {
  const { data, isLoading, error, refetch } = query
  const columns = React.useMemo(
    () => buildColumns(onSelectPatient),
    [onSelectPatient],
  )

  if (isLoading) {
    return <WorkupQueueSkeleton />
  }

  if (error) {
    return (
      <ErrorState
        title="Could not load workup queue"
        error={error}
        onRetry={() => void refetch()}
      />
    )
  }

  if (!data || data.length === 0) {
    return (
      <EmptyState
        title="No patients in the workup queue"
        description="There are no OPD patients with appointments or prescriptions today."
      />
    )
  }

  return (
    <DataTable<WorkupQueuePatient>
      data={data}
      columns={columns}
      aria-label="Today's workup queue"
      onRowClick={onSelectPatient}
    />
  )
}
