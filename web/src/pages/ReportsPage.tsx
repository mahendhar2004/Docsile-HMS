/**
 * ReportsPage — thin composition root (page 18/18), matching main's
 * /reports route: 5-tab patient report viewer only (Visits, Prescriptions,
 * Inpatient, Lab Records, Billing & Dues). Bulk Data Export moved to its
 * own page (DataExportPage, /data) — main has no export concept inside
 * Reports at all.
 *
 * Endpoints:
 *   GET /reports/patients/search         — cursor-based autocomplete
 *   GET /reports/patients/{id}/summary
 *   GET /reports/patients/{id}/visits
 *   GET /reports/patients/{id}/prescriptions
 *   GET /reports/patients/{id}/inpatient
 *   GET /reports/patients/{id}/labs
 *   GET /reports/patients/{id}/billing
 */

import { useEffect, useState } from "react"
import { ClipboardList, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageHeader, ErrorState } from "@/components/patterns"
import { usePermissions } from "@/hooks/usePermissions"
import { useAiContextStore } from "@/store/ai-context"
import { PatientSearchSection } from "./reports/patient-search-section"
import { PatientReportView } from "./reports/patient-report-view"
import { usePatientSummary } from "./reports/hooks"
import type { PatientSearchResult } from "./reports/types"

export default function ReportsPage() {
  const { can } = usePermissions()
  const [selectedPatient, setSelectedPatient] =
    useState<PatientSearchResult | null>(null)

  const setAiContext = useAiContextStore((s) => s.setAiContext)
  const clearAiContext = useAiContextStore((s) => s.clearAiContext)
  const toggleSitha = useAiContextStore((s) => s.toggleOpen)
  const sithaOpen = useAiContextStore((s) => s.open)
  useEffect(() => {
    setAiContext({ patientId: selectedPatient?.patientId ?? null, module: null })
    return () => clearAiContext()
  }, [selectedPatient, setAiContext, clearAiContext])

  // Called unconditionally — null-safe (hook returns null when patientId is null)
  const {
    data: patientSummary,
    isLoading: isLoadingPatient,
  } = usePatientSummary(selectedPatient?.id ?? null)

  const canViewReports = can("reports:view")

  if (!canViewReports) {
    return (
      <ErrorState
        title="Access Denied"
        description="You do not have permission to view the Reports module."
      />
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Patient Reports"
        actions={
          <>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <ClipboardList className="h-3.5 w-3.5" aria-hidden />
              <span>Complete Patient History</span>
            </div>
            <Button
              variant={sithaOpen ? "primary" : "outline"}
              size="sm"
              onClick={toggleSitha}
              aria-label="Ask Sitha AI"
              className={!sithaOpen ? "bg-primary/5 border-primary/20 text-primary hover:bg-primary/10" : undefined}
            >
              <Sparkles className="h-3.5 w-3.5 mr-1.5" aria-hidden />
              {sithaOpen ? "Hide Sitha" : "Ask Sitha"}
            </Button>
          </>
        }
      />

      {/* ── Patient Report Viewer ──────────────────────────────────────────── */}
      {canViewReports && (
        <section aria-label="Patient report viewer" className="space-y-5">
          <PatientSearchSection
            selectedPatientId={selectedPatient?.id ?? null}
            onSelect={setSelectedPatient}
          />

          {selectedPatient && patientSummary && (
            <PatientReportView
              patientId={selectedPatient.id}
              patient={patientSummary}
              isLoadingPatient={isLoadingPatient}
            />
          )}

          {selectedPatient && isLoadingPatient && !patientSummary && (
            <PatientReportView
              patientId={selectedPatient.id}
              patient={
                // Placeholder passed while loading — PatientReportView handles
                // isLoadingPatient=true by rendering its own skeleton
                null as never
              }
              isLoadingPatient
            />
          )}
        </section>
      )}
    </div>
  )
}
