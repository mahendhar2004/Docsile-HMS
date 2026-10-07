/**
 * ReportsPage — thin composition root (page 18/18).
 *
 * Two independent feature areas:
 *   1. Patient Report Viewer (permission: reports:view)
 *      - Patient search with cursor-based autocomplete
 *      - 5-tab report view: Visits, Prescriptions, Inpatient, Lab Records, Billing & Dues
 *   2. Bulk Data Export (permission: data:export)
 *      - 9 export types; date range + search filters; CSV + Excel download
 *
 * Endpoints:
 *   GET /reports/patients/search         — cursor-based autocomplete
 *   GET /reports/patients/{id}/summary
 *   GET /reports/patients/{id}/visits
 *   GET /reports/patients/{id}/prescriptions
 *   GET /reports/patients/{id}/inpatient
 *   GET /reports/patients/{id}/labs
 *   GET /reports/patients/{id}/billing
 *   GET /reports/exports/patients
 *   GET /reports/exports/prescriptions
 *   GET /reports/exports/eye-readings
 *   GET /reports/exports/inpatients
 *   GET /reports/exports/insurance-claims
 *   GET /reports/exports/lab-bills
 *   GET /reports/exports/pharmacy-bills
 *   GET /reports/exports/optical-bills
 *   GET /reports/exports/expenses
 */

import { useState } from "react"
import { PageHeader, ErrorState } from "@/components/patterns"
import { usePermissions } from "@/hooks/usePermissions"
import { PatientSearchSection } from "./reports/patient-search-section"
import { PatientReportView } from "./reports/patient-report-view"
import { ExportSection } from "./reports/export-section"
import { usePatientSummary } from "./reports/hooks"
import type { PatientSearchResult } from "./reports/types"

export default function ReportsPage() {
  const { can } = usePermissions()
  const [selectedPatient, setSelectedPatient] =
    useState<PatientSearchResult | null>(null)

  // Called unconditionally — null-safe (hook returns null when patientId is null)
  const {
    data: patientSummary,
    isLoading: isLoadingPatient,
  } = usePatientSummary(selectedPatient?.id ?? null)

  const canViewReports = can("reports:view")
  const canExport = can("data:export")

  if (!canViewReports && !canExport) {
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
        title="Reports"
        description="Patient report viewer and bulk data export"
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

      {/* ── Bulk Data Export ───────────────────────────────────────────────── */}
      {canExport && (
        <section
          aria-label="Bulk data export"
          className="bg-white border border-gray-100 rounded-2xl p-6"
        >
          <ExportSection />
        </section>
      )}
    </div>
  )
}
