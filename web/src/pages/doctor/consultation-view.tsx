/**
 * doctor/consultation-view.tsx
 *
 * Main consultation panel — shown when the doctor selects a patient from
 * the queue. Displays:
 *   - Patient info header (name, ID, phone, gender, status)
 *   - Today's eye reading summary (from consultation.eyeReadings[0])
 *   - PrescriptionForm (with reference data)
 *   - AiAssistPanel (Sitha AI)
 *   - Print receipt button (billing:view)
 *
 * Handles loading/error states for the consultation query and reference data.
 */

import { Printer, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import { StatusPill, ErrorState } from "@/components/patterns"
import { useConsultation, useReferenceData } from "./hooks"
import { PrescriptionForm } from "./prescription-form"
import { AiAssistPanel } from "./ai-assist-panel"
import type { ConsultationEyeReading } from "./types"

// ─── Props ────────────────────────────────────────────────────────────────────

interface ConsultationViewProps {
  /** UUID of the patient (id, not patientId). */
  patientId: string
  doctorName: string
  canConsult: boolean
  canEdit: boolean
  canViewBilling: boolean
  apiBaseUrl: string
}

// ─── Eye reading summary ──────────────────────────────────────────────────────

function EyeReadingSummary({ reading }: { reading: ConsultationEyeReading }) {
  // Parse clinical findings for quick IOP/VA display
  let iopLine: string | null = null
  let vaLine: string | null = null
  if (reading.clinicalFindings) {
    try {
      const cf = JSON.parse(reading.clinicalFindings) as {
        iop?: { right?: string; left?: string }
        va?: { right?: string; left?: string }
        remarks?: string
      }
      if (cf.iop?.right || cf.iop?.left) {
        iopLine = `IOP: RE ${cf.iop.right ?? "—"} / LE ${cf.iop.left ?? "—"} mmHg`
      }
      if (cf.va?.right || cf.va?.left) {
        vaLine = `VA: RE ${cf.va.right ?? "—"} / LE ${cf.va.left ?? "—"}`
      }
    } catch {
      // Ignore parse error — reading may have been recorded before this schema
    }
  }

  return (
    <div className="flex items-start gap-2 p-3 rounded-md bg-muted/50 text-sm">
      <Eye size={16} className="text-muted-foreground shrink-0 mt-0.5" aria-hidden="true" />
      <div className="flex-1">
        <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide mb-1">
          Eye Reading (today)
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-foreground">
          {iopLine && <span>{iopLine}</span>}
          {vaLine && <span>{vaLine}</span>}
          {!iopLine && !vaLine && (
            <span className="text-muted-foreground">Reading recorded — no IOP/VA data to show.</span>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ConsultationView({
  patientId,
  doctorName,
  canConsult,
  canEdit,
  canViewBilling,
  apiBaseUrl,
}: ConsultationViewProps) {
  const consultationQuery = useConsultation(patientId)
  const referenceDataQuery = useReferenceData()

  // Loading state — both queries must be ready
  if (consultationQuery.isLoading || referenceDataQuery.isLoading) {
    return (
      <div className="flex flex-col gap-4 p-6" aria-label="Loading consultation">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-8 w-24" />
        </div>
        <Skeleton className="h-14 w-full rounded-md" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    )
  }

  if (consultationQuery.error) {
    return (
      <div className="p-6">
        <ErrorState
          title="Could not load consultation"
          error={consultationQuery.error}
          onRetry={() => void consultationQuery.refetch()}
        />
      </div>
    )
  }

  if (referenceDataQuery.error) {
    return (
      <div className="p-6">
        <ErrorState
          title="Could not load reference data"
          error={referenceDataQuery.error}
          onRetry={() => void referenceDataQuery.refetch()}
        />
      </div>
    )
  }

  const consultation = consultationQuery.data
  const referenceData = referenceDataQuery.data

  if (!consultation || !referenceData) return null

  const fullName = `${consultation.firstName} ${consultation.lastName}`.trim()
  const eyeReading = consultation.eyeReadings[0] ?? null

  function handlePrintReceipt() {
    // Opens receipt in a new tab — same pattern as Patient Care page
    window.open(`${apiBaseUrl}/doctor/patients/${consultation!.patientId}/receipt`, "_blank")
  }

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col gap-5 p-6">
        {/* ── Patient info header ─────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-semibold text-foreground">{fullName}</h2>
              <StatusPill status={consultation.status} size="sm" />
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
              <span>{consultation.patientId}</span>
              <span aria-hidden="true">·</span>
              <span>{consultation.phone}</span>
              <span aria-hidden="true">·</span>
              <span>{consultation.gender}</span>
              {consultation.patientType && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{consultation.patientType}</span>
                </>
              )}
            </div>
          </div>

          {/* Receipt button — billing:view */}
          {canViewBilling && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePrintReceipt}
              aria-label={`Print receipt for ${fullName}`}
            >
              <Printer size={14} aria-hidden="true" />
              Print receipt
            </Button>
          )}
        </div>

        {/* ── Eye reading summary ─────────────────────────────────────────────── */}
        {eyeReading && <EyeReadingSummary reading={eyeReading} />}

        {/* ── Prescription form ───────────────────────────────────────────────── */}
        <PrescriptionForm
          consultation={consultation}
          referenceData={referenceData}
          canConsult={canConsult}
          canEdit={canEdit}
          doctorName={doctorName}
          onSaved={() => {
            void consultationQuery.refetch()
          }}
        />

        {/* ── AI assist ───────────────────────────────────────────────────────── */}
        <AiAssistPanel
          patientId={consultation.id}
          canConsult={canConsult}
        />
      </div>
    </ScrollArea>
  )
}
