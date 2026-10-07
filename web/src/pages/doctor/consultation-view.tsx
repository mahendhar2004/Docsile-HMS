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
 * useWorkupPatient (GET /workup/patients/{id}) rather than the consultation
 * endpoint's own ConsultationEyeReading — that type is a trimmed read-only
 * summary (missing previousPrescription/glassesReading/etc fields the real
 * edit form needs), so editing requires the full EyeReadingRecord shape
 * from the workup endpoint instead. hasCreate is wired to doctor:consult
 * (not workup:create) since this edit surface lives in the Doctor module.
 *
 * Handles loading/error states for the consultation query and reference data.
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
import { useConsultation, useReferenceData } from "./hooks"
import { PrescriptionForm } from "./prescription-form"
import { useWorkupPatient } from "../workup/use-workup"
import { EyeReadingForm } from "../workup/eye-reading-form"
import { useAiContextStore } from "@/store/ai-context"

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

  const consultationQuery = useConsultation(patientId)
  const referenceDataQuery = useReferenceData()
  // Full-fidelity eye reading record for the editable Workup Data tab — the
  // consultation endpoint's own ConsultationEyeReading is read-only-trimmed
  // (see file header). GET /workup/patients/{patientId} keys off the
  // sequential display patientId, NOT the UUID `id` this view receives as
  // its own `patientId` prop (confirmed against workup/types.ts — easy to
  // mix up since both are called "patientId" in their own module) — so this
  // reads consultation.patientId once that query resolves, not the prop.
  // Always called (rules of hooks); the hook's own `enabled: patientId !=
  // null` gates the fetch until consultation data is in.
  const workupPatientQuery = useWorkupPatient(consultationQuery.data?.patientId ?? null)

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
            ) : (
              <EyeReadingForm
                patientId={consultation.patientId}
                patientName={fullName}
                existingReading={existingReading}
                hasCreate={canConsult}
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
