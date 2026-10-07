/**
 * doctor/consultation-view.tsx
 *
 * Main consultation panel — shown when the doctor selects a patient from
 * the queue. Two-column layout matching main's exact consultation panel
 * (src/app/(hospital)/doctor/components/DoctorPage.tsx on main):
 *   - Left (flex-1): white card with Tabs ("Workup Data" / "Prescription")
 *     and a single "Save All" button in the tab header row that saves both
 *     forms at once via imperative refs.
 *   - Right (w-80, sticky): History panel — today's AR reading (if any) +
 *     past prescriptions — plus the patient info header.
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
 * AppShell now, not inline here (main's inline "Ask Sitha AI" card in the
 * history sidebar is intentionally not duplicated for the same reason).
 */

import { useEffect, useRef, useState } from "react"
import { Printer, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { StatusPill, ErrorState } from "@/components/patterns"
import { usePermissions } from "@/hooks/usePermissions"
import { formatDate } from "@/lib/utils"
import { useConsultation, useReferenceData } from "./hooks"
import { PrescriptionForm, type PrescriptionFormHandle } from "./prescription-form"
import { useWorkupPatient } from "../workup/use-workup"
import { EyeReadingForm, type EyeReadingFormHandle } from "../workup/eye-reading-form"
import { useAiContextStore } from "@/store/ai-context"
import { ARReadingSummary, PrescriptionHistoryCard } from "./consultation-history"

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

  const eyeReadingRef = useRef<EyeReadingFormHandle>(null)
  const prescriptionRef = useRef<PrescriptionFormHandle>(null)
  const [savingAll, setSavingAll] = useState(false)

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

  async function handleSaveAll() {
    setSavingAll(true)
    try {
      const saves: Promise<void>[] = []
      if (eyeReadingRef.current) saves.push(eyeReadingRef.current.save())
      if (prescriptionRef.current) saves.push(prescriptionRef.current.save())
      await Promise.all(saves)
    } catch (err) {
      console.error("Save all error:", err)
    } finally {
      setSavingAll(false)
    }
  }

  const pastPrescriptions = consultation.pastPrescriptions
  const lastVisitLabel =
    pastPrescriptions.length > 0
      ? `Last visit: ${formatDate(pastPrescriptions[0].prescriptionDate)}`
      : "First visit"

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

        {/* ── Two-column consultation layout — matches main's exact structure:
            left card (Tabs + Save All), right sticky History sidebar. ────── */}
        <div className="flex flex-col lg:flex-row gap-4">
          {/* ── Left: Workup Data / Prescription tabs + Save All ──────────────── */}
          <div className="flex-1 min-w-0 bg-white rounded-2xl border border-border">
            <Tabs defaultValue="workup" variant="underline">
              <div className="px-3 sm:px-6 pt-4 pb-0 border-b border-border flex flex-wrap gap-y-2 justify-between items-center">
                <TabsList
                  aria-label="Consultation sections"
                  className="bg-transparent h-auto p-0 rounded-none gap-1 -mb-px"
                >
                  <TabsTrigger
                    value="workup"
                    className="rounded-none px-3 py-2.5 text-sm font-medium border-b-2 border-transparent text-muted-foreground hover:text-foreground transition-colors data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                  >
                    Workup Data
                  </TabsTrigger>
                  <TabsTrigger
                    value="prescription"
                    className="rounded-none px-3 py-2.5 text-sm font-medium border-b-2 border-transparent text-muted-foreground hover:text-foreground transition-colors data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                  >
                    Prescription
                  </TabsTrigger>
                </TabsList>

                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xs text-muted-foreground">{lastVisitLabel}</span>
                  <Button size="sm" onClick={() => void handleSaveAll()} disabled={savingAll}>
                    {savingAll && (
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" aria-hidden="true" />
                    )}
                    Save All
                  </Button>
                </div>
              </div>

              {/* forceMount on both tabs so refs stay valid regardless of which
                  tab is active — "Save All" must be able to save both forms
                  even when only one is visible. */}
              <TabsContent
                value="workup"
                forceMount
                className="mt-0 px-3 sm:px-6 py-4 sm:py-5 data-[state=inactive]:hidden"
              >
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
                    ref={eyeReadingRef}
                    patientId={consultation.patientId}
                    patientName={fullName}
                    existingReading={existingReading}
                    hasCreate={hasWorkupCreate}
                    compact
                  />
                )}
              </TabsContent>

              <TabsContent
                value="prescription"
                forceMount
                className="mt-0 px-3 sm:px-6 py-4 sm:py-5 data-[state=inactive]:hidden"
              >
                <PrescriptionForm
                  ref={prescriptionRef}
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

          {/* ── Right: History (today's AR reading + past prescriptions) ─────── */}
          <div className="w-full lg:w-80 lg:shrink-0 lg:sticky lg:top-4 lg:self-start space-y-3 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:pr-0.5">
            <div className="bg-white rounded-2xl border border-border overflow-hidden">
              <div className="px-4 pt-4 pb-2 border-b border-border">
                <h3 className="text-sm font-semibold text-foreground">History</h3>
              </div>
              <div className="p-4 space-y-4">
                {existingReading?.autoRefractometer && (
                  <ARReadingSummary arJson={existingReading.autoRefractometer} />
                )}

                {pastPrescriptions.length > 0 ? (
                  <div className="space-y-3">
                    {pastPrescriptions.map((rx) => (
                      <PrescriptionHistoryCard key={rx.id} prescription={rx} />
                    ))}
                  </div>
                ) : (
                  !existingReading?.autoRefractometer && (
                    <div className="text-center py-12 text-muted-foreground text-sm">
                      <p>No previous prescription history</p>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </ScrollArea>
  )
}
