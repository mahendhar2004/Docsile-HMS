/**
 * prescriptions-tab.tsx
 *
 * Patient prescriptions — expandable accordion with medicines, investigations,
 * and clinical notes. The print trigger opens the tabbed ReportPrintModal
 * (Cash Receipt/Prescription/Readings & Findings/Full Report), matching main's
 * ReportPrintModal mode="prescription" — GET /reports/patients/:id/receipt
 * already existed server-side, it just had no frontend caller until now.
 * Tab ID: "prescriptions"
 * Endpoint: GET /reports/patients/{patientId}/prescriptions
 * Permission: reports:view (gated by parent)
 */

import { useState } from "react"
import {
  Pill,
  Stethoscope,
  ChevronDown,
  ChevronUp,
  FlaskConical,
  FileText,
  CalendarCheck,
  Printer,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ErrorState } from "@/components/patterns"
import { formatDateLong } from "@/lib/utils"
import { usePatientPrescriptions } from "./hooks"
import { ReportPrintModal } from "./report-print-modal"
import type { Medicine, PatientSummary } from "./types"

interface PrescriptionsTabProps {
  /** Patient UUID — route param for GET /reports/patients/{id}/prescriptions. */
  patientId: string
  patient: PatientSummary
}

export function PrescriptionsTab({ patientId, patient }: PrescriptionsTabProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [printRxId, setPrintRxId] = useState<string | null>(null)
  const { data: prescriptions, isLoading, isError, error, refetch } =
    usePatientPrescriptions(patientId)

  if (isLoading) {
    return (
      <div className="space-y-3" role="status" aria-label="Loading prescriptions">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white border border-gray-100 rounded-xl p-5">
            <div className="flex items-center gap-4">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-56" />
                <Skeleton className="h-3 w-36" />
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <ErrorState
        title="Could not load prescriptions"
        error={error}
        onRetry={() => void refetch()}
      />
    )
  }

  if (!prescriptions || prescriptions.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 mx-auto mb-4">
          <Pill className="h-7 w-7 text-muted-foreground" aria-hidden="true" />
        </div>
        <p className="text-sm font-medium text-foreground">No prescriptions</p>
        <p className="text-xs text-muted-foreground mt-1">
          No prescriptions have been recorded for this patient
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground mb-3">
        {prescriptions.length} prescription{prescriptions.length !== 1 ? "s" : ""} found
      </p>

      {prescriptions.map((rx) => {
        const expanded = expandedId === rx.id

        let medicines: Medicine[] = []
        try {
          medicines = JSON.parse(rx.medicines ?? "[]") as Medicine[]
        } catch {
          // ignore parse errors — treat as empty
        }

        let investigations: string[] = []
        try {
          const parsed = JSON.parse(rx.investigations ?? "[]") as Array<
            string | { name?: string }
          >
          investigations = parsed
            .map((inv) => (typeof inv === "string" ? inv : (inv.name ?? "")))
            .filter(Boolean)
        } catch {
          // ignore parse errors
        }

        const medicineCount = medicines.length
        const hasDetails =
          medicines.length > 0 ||
          investigations.length > 0 ||
          !!rx.diagnosis ||
          !!rx.presentComplaint

        return (
          <div
            key={rx.id}
            className="bg-white border border-gray-100 rounded-xl overflow-hidden hover:border-gray-200 transition-colors"
          >
            <div
              role="button"
              tabIndex={hasDetails ? 0 : -1}
              onClick={() => hasDetails && setExpandedId(expanded ? null : rx.id)}
              onKeyDown={(e) => {
                if (!hasDetails) return
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  setExpandedId(expanded ? null : rx.id)
                }
              }}
              aria-expanded={hasDetails ? expanded : undefined}
              className="w-full px-5 py-4 text-left cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50">
                  <Pill className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-foreground">
                      {formatDateLong(rx.prescriptionDate)}
                    </span>
                    {rx.prescriptionNumber && (
                      <span className="text-xs font-mono text-muted-foreground bg-gray-100 px-1.5 py-0.5 rounded">
                        {rx.prescriptionNumber}
                      </span>
                    )}
                    <Badge
                      variant={rx.patientType === "IPD" ? "secondary" : "outline"}
                      className="text-[10px] px-1.5 py-0"
                    >
                      {rx.patientType}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    {rx.doctorName && (
                      <span className="flex items-center gap-1">
                        <Stethoscope className="h-3 w-3" aria-hidden="true" />
                        {rx.doctorName}
                      </span>
                    )}
                    {medicineCount > 0 && (
                      <span className="flex items-center gap-1">
                        <Pill className="h-3 w-3" aria-hidden="true" />
                        {medicineCount} medicine{medicineCount !== 1 ? "s" : ""}
                      </span>
                    )}
                    {investigations.length > 0 && (
                      <span className="flex items-center gap-1">
                        <FlaskConical className="h-3 w-3" aria-hidden="true" />
                        {investigations.length} investigation
                        {investigations.length !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="Print prescription"
                  className="shrink-0 h-8 w-8 p-0 text-muted-foreground hover:text-primary"
                  onClick={(e) => {
                    e.stopPropagation()
                    setPrintRxId(rx.id)
                  }}
                >
                  <Printer className="h-4 w-4" aria-hidden="true" />
                </Button>

                {hasDetails &&
                  (expanded ? (
                    <ChevronUp
                      className="h-4 w-4 text-muted-foreground shrink-0"
                      aria-hidden="true"
                    />
                  ) : (
                    <ChevronDown
                      className="h-4 w-4 text-muted-foreground shrink-0"
                      aria-hidden="true"
                    />
                  ))}
              </div>
            </div>

            {expanded && (
              <div className="border-t border-gray-100 bg-gray-50/50">
                {/* Clinical details */}
                {(rx.presentComplaint || rx.diagnosis) && (
                  <div className="px-5 py-3 border-b border-gray-100">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {rx.presentComplaint && (
                        <div>
                          <span className="text-xs text-muted-foreground">
                            Chief Complaint
                          </span>
                          <p className="text-sm text-foreground mt-0.5">
                            {rx.presentComplaint}
                          </p>
                        </div>
                      )}
                      {rx.diagnosis && (
                        <div>
                          <span className="text-xs text-muted-foreground">
                            Diagnosis
                          </span>
                          <p className="text-sm text-foreground mt-0.5">
                            {rx.diagnosis}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Medicines */}
                {medicines.length > 0 && (
                  <div className="px-5 py-3 border-b border-gray-100">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      Medications
                    </h4>
                    <div className="space-y-1.5">
                      {medicines.map((med, i) => (
                        <div key={i} className="flex items-center gap-3 text-sm">
                          <span className="flex h-5 w-5 items-center justify-center rounded bg-emerald-100 text-emerald-700 text-[10px] font-bold shrink-0">
                            {i + 1}
                          </span>
                          <span className="font-medium text-foreground">
                            {med.name}
                          </span>
                          {med.timing && (
                            <span className="text-xs text-muted-foreground bg-gray-100 px-1.5 py-0.5 rounded">
                              {med.timing}
                            </span>
                          )}
                          {med.days && (
                            <span className="text-xs text-muted-foreground">
                              {med.days} days
                            </span>
                          )}
                          {med.notes && (
                            <span className="text-xs text-muted-foreground italic">
                              ({med.notes})
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Investigations */}
                {investigations.length > 0 && (
                  <div className="px-5 py-3 border-b border-gray-100">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      Investigations Advised
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {investigations.map((inv, i) => (
                        <span
                          key={i}
                          className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-md font-medium"
                        >
                          {inv}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Follow-up and notes */}
                {(rx.followUpDate || rx.additionalNotes) && (
                  <div className="px-5 py-3">
                    <div className="flex items-center gap-6">
                      {rx.followUpDate && (
                        <div className="flex items-center gap-1.5 text-sm text-blue-600">
                          <CalendarCheck className="h-3.5 w-3.5" aria-hidden="true" />
                          Follow-up: {formatDateLong(rx.followUpDate)}
                        </div>
                      )}
                      {rx.additionalNotes && (
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                          {rx.additionalNotes}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}

      {printRxId && (
        <ReportPrintModal
          open
          onClose={() => setPrintRxId(null)}
          patient={{
            id: patient.id,
            patientId: patient.patientId,
            fullName: patient.fullName,
            phone: patient.phone,
            age: patient.age,
            gender: patient.gender,
            dateOfBirth: patient.dateOfBirth,
            address: patient.address,
          }}
          mode="prescription"
          prescriptionId={printRxId}
        />
      )}
    </div>
  )
}
