/**
 * doctor/consultation-view.tsx
 *
 * Main consultation panel — shown when the doctor selects a patient from
 * the queue. Displays:
 *   - Patient info header (name, ID, phone, gender, status)
 *   - Tabs: "Workup Data" (editable EyeReadingForm) + "Prescription"
 *     (PrescriptionForm) — matches main's consultation layout
 *     (src/app/(hospital)/doctor/components/DoctorPage.tsx on main).
 *   - Print receipt button (billing:view)
 *
 * The Workup Data tab reuses workup/eye-reading-form.tsx and fetches via
 * useWorkupPatient (GET /workup/patients/{patientId}) rather than the
 * consultation endpoint's own ConsultationEyeReading — that type is a
 * trimmed read-only summary (missing previousPrescription/glassesReading/
 * etc fields the real edit form needs), so editing requires the full
 * EyeReadingRecord shape from the workup endpoint instead. hasCreate is
 * gated on workup:create (not doctor:consult) — fixed during final
 * review: POST /workup/patients/:id/eye-readings actually requires
 * workup:create server-side (supabase/functions/workup/index.ts), so a
 * doctor without it would get an editable form whose save 403s.
 *
 * Handles loading/error states for the consultation query, reference data,
 * and the workup patient query (a failed load previously rendered a blank
 * form indistinguishable from "no reading yet" — fixed during final review).
 * Sets this patient as Sitha AI's global context (see @/store/ai-context) so
 * the floating "Ask Sitha" widget knows to include them — Sitha lives in
 * AppShell now, not inline here.
 */

import { useEffect } from "react"
import { Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { StatusPill, ErrorState } from "@/components/patterns"
import { usePermissions } from "@/hooks/usePermissions"
import { useConsultation, useReferenceData } from "./hooks"
import { PrescriptionForm } from "./prescription-form"
import { useWorkupPatient } from "../workup/use-workup"
import { EyeReadingForm } from "../workup/eye-reading-form"
import { useAiContextStore } from "@/store/ai-context"

// ─── Props ────────────────────────────────────────────────────────────────────

interface ConsultationViewProps {
  /**
   * Sequential display patientId (not the UUID row id) — GET
   * /doctor/patients/{patientId}/consultation and friends filter on the
   * Patient table's patientId column server-side (verified against
   * supabase/functions/doctor/repository.ts), not the UUID. Fixed during
   * final review: this prop previously held the UUID, which 404s against
   * the real backend (MSW mocks had been keying on the UUID too, masking it).
   */
  patientId: string
  doctorName: string
  canConsult: boolean
  canEdit: boolean
  canViewBilling: boolean
  apiBaseUrl: string
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
  const setAiContext = useAiContextStore((s) => s.setAiContext)
  const clearAiContext = useAiContextStore((s) => s.clearAiContext)

  // Set Sitha's context to this patient while the consultation is open;
  // clear it on unmount (deselecting the patient, or navigating away) so a
  // stale patientId doesn't leak into whatever the doctor asks Sitha next.
  useEffect(() => {
    setAiContext({ patientId, module: null })
    return () => clearAiContext()
  }, [patientId, setAiContext, clearAiContext])

  const { can } = usePermissions()
  const hasWorkupCreate = can("workup:create")

  const consultationQuery = useConsultation(patientId)
  const referenceDataQuery = useReferenceData()
  // Full-fidelity eye reading record for the editable Workup Data tab — the
  // consultation endpoint's own ConsultationEyeReading is read-only-trimmed
  // (see file header). `patientId` is already the sequential display ID
  // (same convention GET /workup/patients/{patientId} expects), so no
  // separate derivation is needed here.
  const workupPatientQuery = useWorkupPatient(patientId)

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
  const existingReading = workupPatientQuery.data?.eyeReadings[0] ?? null

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

        {/* ── Workup Data / Prescription tabs ──────────────────────────────────── */}
        <Tabs defaultValue="workup" variant="underline">
          <TabsList aria-label="Consultation sections">
            <TabsTrigger value="workup">Workup Data</TabsTrigger>
            <TabsTrigger value="prescription">Prescription</TabsTrigger>
          </TabsList>

          <TabsContent value="workup">
            {workupPatientQuery.isLoading ? (
              <Skeleton className="h-40 w-full rounded-md" />
            ) : workupPatientQuery.error ? (
              <ErrorState
                title="Could not load workup data"
                error={workupPatientQuery.error}
                onRetry={() => void workupPatientQuery.refetch()}
              />
            ) : (
              <EyeReadingForm
                patientId={consultation.patientId}
                patientName={fullName}
                existingReading={existingReading}
                hasCreate={hasWorkupCreate}
              />
            )}
          </TabsContent>

          <TabsContent value="prescription">
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
          </TabsContent>
        </Tabs>
      </div>
    </ScrollArea>
  )
}
