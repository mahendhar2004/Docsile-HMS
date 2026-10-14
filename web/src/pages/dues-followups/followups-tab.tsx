/**
 * followups-tab.tsx
 *
 * Follow-ups list — paginated OPD + IPD follow-up records (sorted soonest-first,
 * defaulting to a 5-day window matching main unless the date range is overridden).
 * Overdue records are flagged via isOverdue. The "Send Email" action is available
 * per row when the patient has an email on file and the user has dues:edit; a
 * WhatsApp reminder button is always available (read-only external deep link).
 *
 * Data source: GET /dues-followups/followups (offset-paginated), with the
 *              full filter set from main's FollowUpsTab.tsx: notes search,
 *              type, doctor, department, date range, includeOverdue.
 * Supporting:  GET /dues-followups/doctors, GET /dues-followups/departments
 *              (filter dropdown options).
 */

import { useState, forwardRef, useImperativeHandle } from "react"
import { Mail, CalendarClock } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import {
  PaginatedDataTable,
  EmptyState,
  StatCard,
  SearchBar,
  SingleSelect,
  type ColumnDef,
  type SelectOption,
} from "@/components/patterns"
import { usePermissions } from "@/hooks/usePermissions"
import { formatDateLong } from "@/lib/utils"
import {
  useFollowups,
  useFollowupsSummary,
  useDoctors,
  useDepartments,
  type FollowupsFilters,
} from "./hooks"
import { SendEmailForm } from "./send-email-form"
import { WhatsAppButton } from "./whatsapp-button"
import type { FollowUpRecord, FollowUpType } from "./types"

// ─── Filter options — matches main's FollowUpsTab.tsx <Select> option set ───

const TYPE_OPTIONS: SelectOption[] = [
  { value: "ALL", label: "All Types" },
  { value: "OPD", label: "OPD" },
  { value: "IPD", label: "IPD" },
]

function getFollowUpWhatsAppMessage(fu: FollowUpRecord): string {
  return `Hello ${fu.patientName}, this is a reminder. You have a follow-up appointment scheduled for ${formatDateLong(fu.followUpDate)} with Dr. ${fu.doctorName}. Please visit at your convenience. Thank you.`
}

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

  // Filter bar state — matches main's FollowUpsTab.tsx exactly, all reactive
  // (no Apply button; main's own useEffect(loadFollowUps, [...]) re-fetches
  // on every change).
  const [notesSearch, setNotesSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState<FollowUpType | "ALL">("ALL")
  const [doctorFilter, setDoctorFilter] = useState("")
  const [departmentFilter, setDepartmentFilter] = useState("")
  const [includeOverdue, setIncludeOverdue] = useState(false)
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

  const { data: doctors = [] } = useDoctors()
  const { data: departments = [] } = useDepartments()

  const doctorOptions: SelectOption[] = [
    { value: "_all", label: "All Doctors" },
    ...doctors.map((d) => ({ value: d, label: d })),
  ]
  const departmentOptions: SelectOption[] = [
    { value: "_all", label: "All Departments" },
    ...departments.map((d) => ({ value: d, label: d })),
  ]

  const filters: FollowupsFilters = {
    notesSearch: notesSearch.trim() || undefined,
    type: typeFilter,
    doctor: doctorFilter || undefined,
    department: departmentFilter || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    includeOverdue,
  }

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
  } = useFollowups(filters)

  const { data: summary, isLoading: isSummaryLoading } = useFollowupsSummary()

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
      {/* Filter bar — matches main's FollowUpsTab.tsx FilterBar exactly:
          notes search, type, doctor, department, a From/To date range, and
          an "Overdue" checkbox. All reactive (no Apply button), resetting to
          page 1 on every change. The list itself defaults to a 5-day window
          (today → +4 days) when no explicit date range is set, same as main. */}
      <div className="flex items-center gap-2.5 flex-wrap">
        <SearchBar
          variant="standalone"
          value={notesSearch}
          onChange={(v) => {
            setNotesSearch(v)
            setPage(1)
          }}
          placeholder="Search by notes…"
          aria-label="Search follow-up notes"
          className="w-56"
        />
        <SingleSelect
          options={TYPE_OPTIONS}
          value={typeFilter}
          onChange={(v) => {
            setTypeFilter(v as FollowUpType | "ALL")
            setPage(1)
          }}
          className="w-28"
          aria-label="Filter by type"
        />
        <SingleSelect
          options={doctorOptions}
          value={doctorFilter || "_all"}
          onChange={(v) => {
            setDoctorFilter(v === "_all" ? "" : v)
            setPage(1)
          }}
          className="w-40"
          aria-label="Filter by doctor"
        />
        <SingleSelect
          options={departmentOptions}
          value={departmentFilter || "_all"}
          onChange={(v) => {
            setDepartmentFilter(v === "_all" ? "" : v)
            setPage(1)
          }}
          className="w-40"
          aria-label="Filter by department"
        />
        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => {
            setDateFrom(e.target.value)
            setPage(1)
          }}
          className="w-36 h-9"
          aria-label="From date"
        />
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => {
            setDateTo(e.target.value)
            setPage(1)
          }}
          className="w-36 h-9"
          aria-label="To date"
        />
        <label className="flex items-center gap-1.5 text-xs font-medium cursor-pointer select-none">
          <Checkbox
            checked={includeOverdue}
            onCheckedChange={(v) => {
              setIncludeOverdue(v === true)
              setPage(1)
            }}
          />
          <span className="text-muted-foreground whitespace-nowrap">Overdue</span>
        </label>
      </div>

      {/* Summary tiles — matches main's FollowUpsTab (Today/Tomorrow/Total/
          Overdue). Deliberately global (an all-time window, independent of
          the list's active filters above) — same already-established design
          as DuesTab's summary tiles — so "Total" here means every follow-up
          ever, not main's "Next 5 Days" label for the list's current window. */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Today" value={summary?.todayCount ?? 0} loading={isSummaryLoading} />
        <StatCard label="Tomorrow" value={summary?.tomorrowCount ?? 0} loading={isSummaryLoading} />
        <StatCard label="Total" value={summary?.totalCount ?? 0} loading={isSummaryLoading} />
        <StatCard label="Overdue" value={summary?.overdueCount ?? 0} loading={isSummaryLoading} />
      </div>

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
        variant="with-row-actions"
        rowActions={(row) => (
          <div className="flex items-center justify-end gap-1">
            {/* WhatsApp reminder — visible regardless of dues:edit, matching
                main (it's a read-only external deep link, not a mutation). */}
            <WhatsAppButton phone={row.phone} message={getFollowUpWhatsAppMessage(row)} />
            {canEdit &&
              (row.email != null ? (
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
              ))}
          </div>
        )}
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
