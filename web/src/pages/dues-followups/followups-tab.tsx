/**
 * followups-tab.tsx
 *
 * Follow-ups list — paginated OPD + IPD follow-up records (sorted soonest-first).
 * Overdue records are flagged via isOverdue. The "Send Email" action is available
 * per row when the patient has an email on file and the user has dues:edit.
 *
 * Data source: GET /dues-followups/followups (offset-paginated)
 * Supporting:  GET /dues-followups/doctors, GET /dues-followups/departments (loaded
 *              for informational reference — the followups endpoint does not currently
 *              accept doctor/department filter query params)
 */

import { useState, forwardRef, useImperativeHandle } from "react"
import { Mail, CalendarClock } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  PaginatedDataTable,
  EmptyState,
  type ColumnDef,
} from "@/components/patterns"
import { usePermissions } from "@/hooks/usePermissions"
import { useFollowups } from "./hooks"
import { SendEmailForm } from "./send-email-form"
import type { FollowUpRecord } from "./types"

// ─── Formatting helpers ───────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

/**
 * Parse additionalNotes — the field may be JSON-encoded (old Prescription.additionalNotes
 * format). Mirrors the parsing logic from FollowUpsTab.tsx in the old Next.js app.
 */
function parseAdditionalNotes(raw: string): string {
  if (!raw) return "—"
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const val = parsed.notes ?? parsed.value ?? String(parsed)
    return typeof val === "string" && val ? val : "—"
  } catch {
    return raw || "—"
  }
}

// ─── FollowUpsTab ─────────────────────────────────────────────────────────────

export interface FollowupsTabHandle {
  /** Refetches the current page — main's header Refresh button lives one level up. */
  refetch: () => void
}

export const FollowupsTab = forwardRef<FollowupsTabHandle>(function FollowupsTab(_props, ref) {
  const { can } = usePermissions()
  const canEdit = can("dues:edit")

  const [emailTarget, setEmailTarget] = useState<FollowUpRecord | null>(null)

  const {
    data,
    total,
    isLoading,
    isFetching,
    isError,
    error,
    page,
    pageSize,
    setPage,
    refetch,
  } = useFollowups()

  useImperativeHandle(ref, () => ({
    refetch: () => void refetch(),
  }))

  // ── Column definitions ────────────────────────────────────────────────────

  const columns: ColumnDef<FollowUpRecord>[] = [
    {
      key: "patient",
      header: "Patient",
      cell: (row) => (
        <div>
          <div className="font-medium text-sm">{row.patientName}</div>
          <div className="text-xs text-muted-foreground">
            {row.uhid}
            {row.phone ? ` · ${row.phone}` : ""}
          </div>
        </div>
      ),
    },
    {
      key: "type",
      header: "Type",
      cell: (row) => (
        <Badge variant={row.type === "OPD" ? "secondary" : "outline"} size="sm">
          {row.type}
        </Badge>
      ),
    },
    {
      key: "followUpDate",
      header: "Follow-Up Date",
      cell: (row) => (
        <div className="flex items-center gap-1.5">
          <span
            className={
              row.isOverdue
                ? "text-sm font-semibold text-red-600"
                : "text-sm"
            }
          >
            {formatDate(row.followUpDate)}
          </span>
          {row.isOverdue && (
            <Badge variant="error" size="sm">
              Overdue
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: "doctorName",
      header: "Doctor",
      cell: (row) => <span className="text-sm">{row.doctorName}</span>,
    },
    {
      key: "department",
      header: "Department",
      cell: (row) => (
        <span className="text-xs text-muted-foreground">{row.department}</span>
      ),
    },
    {
      key: "diagnosis",
      header: "Diagnosis / Reason",
      cell: (row) => (
        <span className="text-xs text-muted-foreground line-clamp-1 max-w-48 block">
          {row.diagnosis || "—"}
        </span>
      ),
    },
    {
      key: "additionalNotes",
      header: "Additional Notes",
      cell: (row) => (
        <span className="text-xs text-muted-foreground line-clamp-1 max-w-36 block">
          {parseAdditionalNotes(row.additionalNotes)}
        </span>
      ),
    },
    {
      key: "lastVisitDate",
      header: "Last Visit",
      cell: (row) => (
        <span className="text-xs text-muted-foreground">
          {formatDate(row.lastVisitDate)}
        </span>
      ),
    },
  ]

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Summary line */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {isLoading
            ? "Loading…"
            : `${total.toLocaleString("en-IN")} follow-up${total !== 1 ? "s" : ""}`}
        </p>
      </div>

      <PaginatedDataTable
        mode="offset"
        data={data}
        columns={columns}
        variant={canEdit ? "with-row-actions" : "standard"}
        rowActions={
          canEdit
            ? (row) =>
                row.email != null ? (
                  <button
                    type="button"
                    onClick={() => setEmailTarget(row)}
                    title="Send follow-up email"
                    aria-label={`Send email to ${row.patientName}`}
                    className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50 transition-colors"
                  >
                    <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                    Email
                  </button>
                ) : (
                  <span
                    className="flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground/50 cursor-not-allowed select-none"
                    title="Patient has no email address on record"
                    aria-label="No email on record"
                  >
                    <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                    No email
                  </span>
                )
            : undefined
        }
        isLoading={isLoading}
        isFetching={isFetching}
        isError={isError}
        error={error}
        onRetry={refetch}
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={setPage}
        showPageSizeSelector
        emptyState={
          <EmptyState
            title="No follow-ups found"
            description="No patients are due for follow-up in the current window."
            icon={<CalendarClock className="h-10 w-10" aria-hidden="true" />}
          />
        }
        aria-label="Follow-ups table"
      />

      {/* Send email dialog */}
      {emailTarget != null && (
        <SendEmailForm
          record={emailTarget}
          open={emailTarget != null}
          onOpenChange={(open) => {
            if (!open) setEmailTarget(null)
          }}
        />
      )}
    </div>
  )
})
