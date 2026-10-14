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
import { Skeleton } from "@/components/ui/skeleton"
import { DataTable, EmptyState, ErrorState } from "@/components/patterns"
import type { ColumnDef } from "@/components/patterns"
import { cn } from "@/lib/utils"
import type { WorkupQueuePatient } from "./types"

// Main's real WorkupPage.tsx defines its OWN local statusConfig for this
// queue table (REGISTERED/IN_WORKUP → "Optometrist", WORKUP_DONE/WITH_DOCTOR
// → "Doctor"), deliberately different from the generic Patient-status labels
// the shared StatusPill renders elsewhere ("Registered"/"In Workup"/etc) —
// same pattern (and same statusConfig values) as the Doctor queue's own
// override. Ported as a file-local component here too, not a shared-component
// change. Note: main's Workup statusConfig has no VISITED entry (Doctor's does).
const WORKUP_STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  REGISTERED:   { label: "Optometrist",  bg: "bg-destructive/10",  text: "text-destructive",             dot: "bg-destructive" },
  IN_WORKUP:    { label: "Optometrist",  bg: "bg-destructive/10",  text: "text-destructive",             dot: "bg-destructive" },
  WORKUP_DONE:  { label: "Doctor",       bg: "bg-warning-soft",    text: "text-warning-soft-foreground", dot: "bg-warning" },
  WITH_DOCTOR:  { label: "Doctor",       bg: "bg-warning-soft",    text: "text-warning-soft-foreground", dot: "bg-warning" },
  COMPLETED:    { label: "Completed",    bg: "bg-success-soft",    text: "text-success-soft-foreground", dot: "bg-success" },
  MEDICAL_ONLY: { label: "Medical Only", bg: "bg-info-soft",       text: "text-info-soft-foreground",    dot: "bg-info" },
}

function WorkupStatusPill({ status }: { status: string }) {
  const sc = WORKUP_STATUS_CONFIG[status] ?? {
    label: status, bg: "bg-neutral-soft", text: "text-neutral-soft-foreground", dot: "bg-neutral",
  }
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap", sc.bg, sc.text)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", sc.dot)} />
      {sc.label}
    </span>
  )
}

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

function buildColumns(): ColumnDef<WorkupQueuePatient>[] {
  return [
    {
      key: "token",
      header: "Token",
      cell: (_p, index) => (
        <span className="inline-flex items-center justify-center h-6 min-w-7 rounded bg-primary/10 border border-primary/20 border-dashed text-xs font-bold text-primary tabular-nums px-1.5">
          {index + 1}
        </span>
      ),
      minWidth: "48px",
    },
    {
      key: "patientId",
      header: "Patient ID",
      cell: (p) => <span className="font-mono text-xs">{p.patientId}</span>,
    },
    {
      key: "name",
      header: "Name",
      cell: (p) => <span className="text-sm font-medium text-foreground">{p.name}</span>,
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
      key: "phone",
      header: "Phone",
      cell: (p) => (
        <span className="text-sm text-muted-foreground tabular-nums">{p.phone ?? "—"}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (p) => <WorkupStatusPill status={p.status} />,
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
  const columns = React.useMemo(() => buildColumns(), [])

  // Card container — matches main's exact queue-table wrapper (`rounded-xl
  // border border-border/60 bg-white overflow-hidden shadow-sm`, same card
  // treatment on every state: loading/error/empty/data). Previously missing
  // here, so the queue sat flat against the page background with no visual
  // separation, unlike every other table in the app (which goes through the
  // shared PaginatedDataTable, which already supplies this wrapper).
  const cardClass = "rounded-[var(--radius-lg)] bg-[var(--color-card)] overflow-hidden shadow-[var(--shadow-card)]"

  if (isLoading) {
    return (
      <div className={cardClass}>
        <WorkupQueueSkeleton />
      </div>
    )
  }

  if (error) {
    return (
      <div className={cardClass}>
        <ErrorState
          title="Could not load workup queue"
          error={error}
          onRetry={() => void refetch()}
        />
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className={cardClass}>
        <EmptyState
          title="No patients in the workup queue"
          description="There are no OPD patients with appointments or prescriptions today."
        />
      </div>
    )
  }

  return (
    <div className={cardClass}>
      <DataTable<WorkupQueuePatient>
        data={data}
        columns={columns}
        aria-label="Today's workup queue"
        onRowClick={onSelectPatient}
      />
    </div>
  )
}
