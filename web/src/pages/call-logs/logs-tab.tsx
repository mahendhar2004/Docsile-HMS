/**
 * call-logs/logs-tab.tsx
 *
 * Call logs list tab — paginated table with date/status/direction filters.
 *
 * API: GET /call-logs?page=N&pageSize=N&date=YYYY-MM-DD
 * The backend only supports a single-date filter (no date range, no server-side
 * status/direction/search filtering). Status, direction, and search filters are
 * applied client-side on the loaded page.
 *
 * Columns (matching old app CallLogsPage.tsx):
 *   Direction | Caller / Contact | Phone Number | Date & Time | Duration | Status | Notes | —
 *
 * Field names: callFrom, callTo, direction, status, startTime, duration,
 *              callerName, patientId, notes (all verified from repository.ts CallLogRow)
 */

import { useState, useMemo } from "react"
import { format } from "date-fns"
import {
  PhoneIncoming,
  PhoneOutgoing,
  Clock,
  MessageSquare,
} from "lucide-react"
import {
  DatePicker,
  EmptyState,
  PaginatedDataTable,
  SearchBar,
  SingleSelect,
  type ColumnDef,
  type SelectOption,
} from "@/components/patterns"
import { CallDetailSheet } from "./call-detail-sheet"
import { useCallLogsList } from "./hooks"
import { CALL_STATUS_CONFIG } from "./types"
import type { CallLog } from "./types"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(seconds: number | null | undefined): string {
  if (!seconds || seconds === 0) return "—"
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m === 0) return `${s}s`
  return `${m}m ${s}s`
}

function formatPhone(phone: string | null | undefined): string {
  if (!phone) return "Unknown"
  const digits = phone.replace(/\D/g, "")
  if (digits.length === 12 && digits.startsWith("91")) {
    return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`
  }
  if (digits.length === 10) {
    return `${digits.slice(0, 5)} ${digits.slice(5)}`
  }
  return phone
}

// ─── Filter options ───────────────────────────────────────────────────────────

const STATUS_OPTIONS: SelectOption[] = [
  { value: "all", label: "All Status" },
  { value: "completed", label: "Answered" },
  { value: "missed", label: "Missed" },
  { value: "busy", label: "Busy" },
  { value: "failed", label: "Failed" },
]

const DIRECTION_OPTIONS: SelectOption[] = [
  { value: "all", label: "All Directions" },
  { value: "inbound", label: "Inbound" },
  { value: "outbound", label: "Outbound" },
]

// ─── Props ────────────────────────────────────────────────────────────────────

interface LogsTabProps {
  canView: boolean
  canEdit: boolean
}

// ─── Columns ──────────────────────────────────────────────────────────────────

function buildColumns(): ColumnDef<CallLog>[] {
  return [
    {
      key: "direction",
      header: "Direction",
      cell: (row) => {
        const isInbound = row.direction === "inbound"
        const Icon = isInbound ? PhoneIncoming : PhoneOutgoing
        return (
          <div className="flex items-center gap-1.5">
            <Icon
              className={`h-4 w-4 ${isInbound ? "text-blue-500" : "text-orange-500"}`}
              aria-hidden="true"
            />
            <span className="text-sm capitalize">{row.direction}</span>
          </div>
        )
      },
      minWidth: "100px",
    },
    {
      key: "callerName",
      header: "Caller / Contact",
      cell: (row) => (
        <span className="text-sm font-medium text-foreground">
          {row.callerName ?? "—"}
        </span>
      ),
      minWidth: "140px",
    },
    {
      key: "phone",
      header: "Phone Number",
      cell: (row) => {
        const isInbound = row.direction === "inbound"
        return (
          <span className="text-sm text-muted-foreground font-mono text-xs">
            {formatPhone(isInbound ? row.callFrom : row.callTo)}
          </span>
        )
      },
      minWidth: "140px",
    },
    {
      key: "startTime",
      header: "Date & Time",
      cell: (row) =>
        row.startTime != null ? (
          <div className="text-sm">
            <div className="text-foreground">
              {format(new Date(row.startTime), "dd MMM yyyy")}
            </div>
            <div className="text-xs text-muted-foreground">
              {format(new Date(row.startTime), "hh:mm a")}
            </div>
          </div>
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        ),
      minWidth: "130px",
    },
    {
      key: "duration",
      header: "Duration",
      cell: (row) => (
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Clock className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{formatDuration(row.duration)}</span>
        </div>
      ),
      minWidth: "90px",
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => {
        const cfg = CALL_STATUS_CONFIG[row.status] ?? CALL_STATUS_CONFIG.failed
        return (
          <span
            className={`inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full border ${cfg.bgClass} ${cfg.colorClass}`}
          >
            {cfg.label}
          </span>
        )
      },
      minWidth: "90px",
    },
    {
      key: "notes",
      header: "Notes",
      cell: (row) =>
        row.notes != null ? (
          <div className="flex items-center gap-1 text-sm text-muted-foreground max-w-[180px]">
            <MessageSquare className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">{row.notes}</span>
          </div>
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        ),
      minWidth: "160px",
    },
  ]
}

// ─── LogsTab ──────────────────────────────────────────────────────────────────

export function LogsTab({ canView, canEdit }: LogsTabProps) {
  const [viewDate, setViewDate] = useState<Date>(() => new Date())
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [directionFilter, setDirectionFilter] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [selectedCall, setSelectedCall] = useState<CallLog | null>(null)

  // Convert Date to the string format the API expects
  const date = format(viewDate, "yyyy-MM-dd")

  // Fetch paginated data for the selected date
  const {
    data,
    total,
    page,
    pageSize,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
    setPage,
    setPageSize,
  } = useCallLogsList(date, canView)

  // Client-side filtering for status, direction, search (API only supports date)
  const filteredData = useMemo<CallLog[]>(() => {
    let rows = data
    if (statusFilter !== "all") {
      rows = rows.filter((r) => r.status === statusFilter)
    }
    if (directionFilter !== "all") {
      rows = rows.filter((r) => r.direction === directionFilter)
    }
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase().trim()
      rows = rows.filter(
        (r) =>
          r.callFrom.toLowerCase().includes(q) ||
          r.callTo.toLowerCase().includes(q) ||
          (r.callerName?.toLowerCase().includes(q) ?? false) ||
          (r.notes?.toLowerCase().includes(q) ?? false),
      )
    }
    return rows
  }, [data, statusFilter, directionFilter, searchQuery])

  const columns = useMemo(() => buildColumns(), [])

  return (
    <>
      {/* ── Filter bar ──────────────────────────────────────────────────────────
          Plain bordered card, not the sticky PageToolbar/FilterBar — matches
          main's exact one-off filter-row treatment for this tab. */}
      <div className="flex flex-col sm:flex-row gap-3 p-4 mb-4 rounded-xl border border-border/60 bg-white shadow-sm">
        <DatePicker
          value={viewDate}
          onChange={(d) => { if (d) { setViewDate(d); setPage(1) } }}
          placeholder="Select date"
          aria-label="Filter by date"
        />

        <SearchBar
          variant="standalone"
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search by phone, name, or notes..."
          aria-label="Search call logs"
          className="flex-1 min-w-[200px]"
        />

        <SingleSelect
          options={STATUS_OPTIONS}
          value={statusFilter}
          onChange={setStatusFilter}
          placeholder="All Status"
        />

        <SingleSelect
          options={DIRECTION_OPTIONS}
          value={directionFilter}
          onChange={setDirectionFilter}
          placeholder="All Directions"
        />
      </div>

      {/* ── Paginated table ──────────────────────────────────────────────────── */}
      <PaginatedDataTable<CallLog>
        mode="offset"
        data={filteredData}
        columns={columns}
        isLoading={isLoading}
        isFetching={isFetching}
        isError={isError}
        error={error}
        onRetry={() => void refetch()}
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        showPageSizeSelector
        pageSizeOptions={[25, 50, 100]}
        onRowClick={(row) => setSelectedCall(row)}
        rowClassName={() => "cursor-pointer"}
        emptyState={
          <EmptyState
            title="No call logs found"
            description={
              searchQuery || statusFilter !== "all" || directionFilter !== "all"
                ? "No calls match the current filters. Try changing the date or clearing filters."
                : "No call logs recorded for this date. Use Sync to pull calls from Exotel."
            }
          />
        }
        aria-label="Call logs list"
      />

      {/* ── Call detail sheet ────────────────────────────────────────────────── */}
      {selectedCall != null && (
        <CallDetailSheet
          call={selectedCall}
          onClose={() => setSelectedCall(null)}
          onUpdated={() => {
            setSelectedCall(null)
            void refetch()
          }}
          canEdit={canEdit}
        />
      )}
    </>
  )
}
