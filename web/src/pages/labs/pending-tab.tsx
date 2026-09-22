/**
 * labs/pending-tab.tsx
 *
 * Pending lab investigations tab — shows patients who have ordered lab
 * investigations that are not yet resulted, grouped by date.
 *
 * Date-filtered via GET /labs/pending-investigations?date=YYYY-MM-DD
 * x-permission: labs:view
 *
 * Shape verified against:
 *   src/app/(hospital)/labs/components/LabBillingTab.tsx (PendingPatient type + render)
 */

import { useState } from "react"
import { RefreshCw, FlaskConical, ClipboardList } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState, ErrorState } from "@/components/patterns"
import { usePendingInvestigations } from "./hooks"
import { cn } from "@/lib/utils"

// ─── IST date helper ─────────────────────────────────────────────────────────

function todayIST(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" })
}

// ─── Component ───────────────────────────────────────────────────────────────

export function PendingTab() {
  const [date, setDate] = useState(todayIST)

  const {
    data: pendingPatients,
    isLoading,
    error,
    refetch,
  } = usePendingInvestigations(date)

  const patients = pendingPatients ?? []

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-primary" aria-hidden="true" />
          <h2 className="text-base font-semibold text-foreground">
            Pending Investigations
          </h2>
          {!isLoading && patients.length > 0 && (
            <span
              className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold tabular-nums"
              aria-label={`${patients.length} pending patients`}
            >
              {patients.length}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-8 rounded-md border border-input bg-white px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
            aria-label="Filter date"
          />
          <button
            type="button"
            onClick={() => void refetch()}
            disabled={isLoading}
            className="h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors disabled:opacity-50"
            aria-label="Refresh pending investigations"
          >
            <RefreshCw
              className={cn("h-3.5 w-3.5", isLoading && "animate-spin")}
              aria-hidden="true"
            />
          </button>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="rounded-xl border border-border bg-white overflow-hidden divide-y divide-border/40">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-16 ml-auto" />
            </div>
          ))}
        </div>
      )}

      {/* Error state */}
      {!isLoading && error && (
        <ErrorState
          title="Could not load pending investigations"
          error={error}
          onRetry={() => void refetch()}
        />
      )}

      {/* Empty state */}
      {!isLoading && !error && patients.length === 0 && (
        <EmptyState
          title="No pending investigations"
          description={`No patients with unresulted lab investigations on ${date}.`}
          icon={<FlaskConical className="h-8 w-8" aria-hidden="true" />}
        />
      )}

      {/* Patient list */}
      {!isLoading && !error && patients.length > 0 && (
        <div
          role="list"
          aria-label="Patients with pending investigations"
          className="rounded-xl border border-border bg-white overflow-hidden divide-y divide-border/40"
        >
          {patients.map((p) => (
            <div
              key={p.prescriptionId}
              role="listitem"
              className="flex items-center gap-3 px-4 py-3"
            >
              {/* Patient info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm text-foreground truncate">
                    {p.patientName}
                  </span>
                  <span className="font-mono text-[11px] text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded shrink-0">
                    {p.patientId}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {[
                    p.age && `${p.age}y`,
                    p.gender,
                    p.doctorName && `Dr. ${p.doctorName}`,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </div>
              </div>

              {/* Counts + status */}
              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={cn(
                    "inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full",
                    p.billCount > 0
                      ? "bg-amber-50 text-amber-700"
                      : "bg-blue-50 text-blue-700",
                  )}
                >
                  <FlaskConical className="h-3 w-3" aria-hidden="true" />
                  {p.investigationCount} test
                  {p.investigationCount !== 1 ? "s" : ""}
                </span>
                {p.billCount > 0 ? (
                  <span className="text-[10px] text-amber-600 font-medium">
                    Partial
                  </span>
                ) : (
                  <span className="text-[10px] text-blue-600 font-medium">
                    Pending
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
