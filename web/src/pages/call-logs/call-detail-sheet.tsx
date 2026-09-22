/**
 * call-logs/call-detail-sheet.tsx
 *
 * Sheet panel showing full details for a selected call log.
 * Matches the old app's CallDetailSheet.tsx pattern exactly:
 *   - Call metadata (from/to, direction, status, date/time, duration)
 *   - Recording audio player (if recordingUrl present)
 *   - Editable notes field (PATCH /call-logs/{id}/notes, gated call_logs:edit)
 *   - Patient link section: search + link (gated call_logs:edit)
 *
 * Field names verified against repository.ts CallLogRow.
 * Status values: "completed" | "missed" | "busy" | "failed" | "ringing"
 * Direction values: "inbound" | "outbound"
 */

import { useState } from "react"
import { format } from "date-fns"
import {
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  Clock,
  User,
  FileText,
  Link2,
  Search,
  Play,
} from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetBody,
  SheetFooter,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { ErrorState } from "@/components/patterns"
import { useUpdateNotes, useLinkPatient, usePatientSearch } from "./hooks"
import { CALL_STATUS_CONFIG } from "./types"
import type { CallLog } from "./types"

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Format call duration as "Xm Ys" or "Xs" or "—" for zero. */
function formatDuration(seconds: number | null | undefined): string {
  if (!seconds || seconds === 0) return "—"
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m === 0) return `${s}s`
  return `${m}m ${s}s`
}

/**
 * Format an E.164 or national phone number for display.
 * Matches old app formatPhone() exactly.
 */
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

// ─── Props ────────────────────────────────────────────────────────────────────

interface CallDetailSheetProps {
  call: CallLog
  onClose: () => void
  /** Called after a successful notes save or patient link so the list refetches. */
  onUpdated: () => void
  /** True when the user has call_logs:edit permission. Gates write actions. */
  canEdit: boolean
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CallDetailSheet({
  call,
  onClose,
  onUpdated,
  canEdit,
}: CallDetailSheetProps) {
  // ── Notes state ──────────────────────────────────────────────────────────
  const [notes, setNotes] = useState(call.notes ?? "")

  // ── Patient search state ─────────────────────────────────────────────────
  const [showPatientSearch, setShowPatientSearch] = useState(false)
  const [patientSearchInput, setPatientSearchInput] = useState("")

  // Debounce: search fires when input >= 2 chars (hook's enabled gate).
  const patientSearch = usePatientSearch(patientSearchInput)

  // ── Mutations ────────────────────────────────────────────────────────────
  const updateNotes = useUpdateNotes()
  const linkPatient = useLinkPatient()

  // ── Display config ───────────────────────────────────────────────────────
  const config = CALL_STATUS_CONFIG[call.status] ?? CALL_STATUS_CONFIG.failed
  const isInbound = call.direction === "inbound"
  const DirectionIcon = isInbound ? PhoneIncoming : PhoneOutgoing

  // ── Handlers ─────────────────────────────────────────────────────────────

  function handleSaveNotes() {
    if (!notes.trim() || notes === (call.notes ?? "")) return
    updateNotes.mutate(
      { id: call.id, notes: notes.trim() },
      { onSuccess: () => { onUpdated() } },
    )
  }

  function handleLinkPatient(patientId: string) {
    linkPatient.mutate(
      { id: call.id, patientId },
      {
        onSuccess: () => {
          setShowPatientSearch(false)
          setPatientSearchInput("")
          onUpdated()
        },
      },
    )
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <Sheet open onOpenChange={(open) => { if (!open) onClose() }}>
      <SheetContent side="right" size="lg">
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <div
              className={`h-8 w-8 rounded-full flex items-center justify-center border ${config.bgClass}`}
              aria-hidden="true"
            >
              <Phone className={`h-4 w-4 ${config.colorClass}`} />
            </div>
            Call Details
          </SheetTitle>
          <SheetDescription>
            {config.label} {isInbound ? "inbound" : "outbound"} call
          </SheetDescription>
        </SheetHeader>

        {/* ── Body ────────────────────────────────────────────────────────── */}
        <SheetBody className="space-y-6">

          {/* ── Direction + status badge ─────────────────────────────────── */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <DirectionIcon
              className={`h-4 w-4 ${isInbound ? "text-blue-500" : "text-orange-500"}`}
              aria-hidden="true"
            />
            <span className="capitalize font-medium">{call.direction} Call</span>
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full border ${config.bgClass} ${config.colorClass}`}
            >
              {config.label}
            </span>
          </div>

          {/* ── Call metadata ────────────────────────────────────────────── */}
          <div className="bg-muted/40 rounded-lg p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-xs text-muted-foreground">From</span>
              <span className="text-sm font-medium">{formatPhone(call.callFrom)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-muted-foreground">To</span>
              <span className="text-sm font-medium">{formatPhone(call.callTo)}</span>
            </div>
            {call.startTime != null && (
              <div className="flex justify-between">
                <span className="text-xs text-muted-foreground">Date &amp; Time</span>
                <span className="text-sm font-medium">
                  {format(new Date(call.startTime), "dd MMM yyyy, hh:mm a")}
                </span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Duration</span>
              <span className="text-sm font-medium flex items-center gap-1">
                <Clock className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                {formatDuration(call.duration)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-muted-foreground">Exotel SID</span>
              <span className="text-xs text-muted-foreground font-mono truncate max-w-[180px]">
                {call.exotelCallSid}
              </span>
            </div>
          </div>

          {/* ── Linked patient ───────────────────────────────────────────── */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-foreground flex items-center gap-1.5">
                <User className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                Patient
              </h3>
              {canEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => {
                    setShowPatientSearch((prev) => !prev)
                    if (showPatientSearch) setPatientSearchInput("")
                  }}
                  aria-label={call.callerName != null ? "Change linked patient" : "Link patient"}
                >
                  <Link2 className="h-3 w-3 mr-1" aria-hidden="true" />
                  {call.callerName != null ? "Change" : "Link Patient"}
                </Button>
              )}
            </div>

            {call.callerName != null ? (
              <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                <p className="text-sm font-medium text-blue-800">{call.callerName}</p>
                {call.patientId != null && (
                  <p className="text-xs text-blue-600 mt-0.5">ID: {call.patientId}</p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No patient linked to this call</p>
            )}

            {/* Patient search panel */}
            {showPatientSearch && (
              <div className="space-y-2 mt-2" role="region" aria-label="Search patients">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search
                      className="h-4 w-4 text-muted-foreground absolute left-2.5 top-2.5"
                      aria-hidden="true"
                    />
                    <Input
                      placeholder="Name, phone, or patient ID..."
                      value={patientSearchInput}
                      onChange={(e) => setPatientSearchInput(e.target.value)}
                      className="pl-8 h-9 text-sm"
                      aria-label="Search patients"
                    />
                  </div>
                </div>

                {/* Loading */}
                {patientSearch.isLoading && patientSearchInput.trim().length >= 2 && (
                  <div className="space-y-1">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-10 w-full rounded-md" />
                    ))}
                  </div>
                )}

                {/* Error */}
                {patientSearch.isError && (
                  <p className="text-xs text-red-600 px-1">Failed to search patients. Try again.</p>
                )}

                {/* Results */}
                {patientSearch.data != null && patientSearch.data.length > 0 && (
                  <div
                    className="border border-border rounded-lg divide-y max-h-48 overflow-y-auto"
                    role="listbox"
                    aria-label="Patient search results"
                  >
                    {patientSearch.data.map((patient) => (
                      <button
                        key={patient.id}
                        type="button"
                        onClick={() => handleLinkPatient(patient.id)}
                        disabled={linkPatient.isPending}
                        className="w-full text-left px-3 py-2 hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        role="option"
                        aria-selected={call.patientId === patient.id}
                      >
                        <p className="text-sm font-medium">{patient.fullName}</p>
                        <p className="text-xs text-muted-foreground">
                          {patient.patientId}
                          {patient.phone ? ` | ${formatPhone(patient.phone)}` : ""}
                        </p>
                      </button>
                    ))}
                  </div>
                )}

                {/* No results */}
                {patientSearch.data != null &&
                  patientSearch.data.length === 0 &&
                  patientSearchInput.trim().length >= 2 &&
                  !patientSearch.isLoading && (
                    <p className="text-xs text-muted-foreground px-1">No patients found</p>
                  )}
              </div>
            )}
          </div>

          {/* ── Recording ────────────────────────────────────────────────── */}
          {call.recordingUrl != null && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-foreground flex items-center gap-1.5">
                <Play className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                Recording
              </h3>
              <audio controls className="w-full" preload="none" aria-label="Call recording">
                <source src={call.recordingUrl} />
                Your browser does not support the audio element.
              </audio>
            </div>
          )}

          {/* ── Notes ────────────────────────────────────────────────────── */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-foreground flex items-center gap-1.5">
              <FileText className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              Notes
            </h3>
            <Textarea
              placeholder="Add notes about this call (e.g., appointment requested, follow-up needed)..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="text-sm resize-none"
              readOnly={!canEdit}
              aria-label="Call notes"
            />
            {canEdit && (
              <Button
                size="sm"
                onClick={handleSaveNotes}
                disabled={
                  updateNotes.isPending ||
                  !notes.trim() ||
                  notes.trim() === (call.notes ?? "").trim()
                }
                aria-label="Save notes"
              >
                {updateNotes.isPending ? "Saving..." : "Save Notes"}
              </Button>
            )}
            {!canEdit && (
              <p className="text-xs text-muted-foreground">
                You need call_logs:edit permission to edit notes.
              </p>
            )}
          </div>

          {/* Mutation error display */}
          {(updateNotes.isError || linkPatient.isError) && (
            <ErrorState
              title="Action failed"
              description="The last action could not be completed. Please try again."
              onRetry={updateNotes.isError ? handleSaveNotes : undefined}
            />
          )}
        </SheetBody>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <SheetFooter>
          <Button variant="outline" onClick={onClose} aria-label="Close panel">
            Close
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
