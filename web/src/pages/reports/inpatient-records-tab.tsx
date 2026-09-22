/**
 * inpatient-records-tab.tsx
 *
 * Patient inpatient admission record with:
 *   - Admission card (ward, bed, doctors, operation, financials)
 *   - Collapsible inpatient prescriptions
 *   - Collapsible discharge summary
 *   - Collapsible insurance claims
 * Tab ID: "inpatient"
 * Endpoint: GET /reports/patients/{patientId}/inpatient
 * Permission: reports:view (gated by parent)
 *
 * NOTE: patientId here is the Patient UUID (Patient.id), used directly as
 * InPatient FK. The service passes the route UUID directly for this endpoint.
 */

import { useState } from "react"
import {
  BedDouble,
  Calendar,
  Stethoscope,
  Syringe,
  FileText,
  Shield,
  Pill,
  ChevronDown,
  ChevronUp,
  Heart,
  CalendarCheck,
  ClipboardList,
  CreditCard,
  Printer,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ErrorState } from "@/components/patterns"
import { formatDateLong, formatCurrency } from "@/lib/utils"
import { toast } from "@/components/ui/sonner"
import { usePatientInpatient } from "./hooks"
import { INPATIENT_STATUS_COLORS } from "./types"

interface InpatientRecordsTabProps {
  /** Patient UUID — used as the route param AND directly as InPatient FK. */
  patientId: string
}

interface IPPrescription {
  medicine: string
  days: string
  timing: string
  note?: string
}

interface DischargeSummary {
  diagnosis?: string
  conditionAtDischarge?: string
  medications?: string
  followUpInstructions?: string
  notes?: string
}

interface PaymentRecord {
  date?: string
  amount?: number
  mode?: string
  notes?: string
}

export function InpatientRecordsTab({ patientId }: InpatientRecordsTabProps) {
  const [showPrescriptions, setShowPrescriptions] = useState(false)
  const [showDischarge, setShowDischarge] = useState(false)
  const [showInsurance, setShowInsurance] = useState(false)

  const { data: record, isLoading, isError, error, refetch } =
    usePatientInpatient(patientId)

  if (isLoading) {
    return (
      <div className="space-y-4" role="status" aria-label="Loading inpatient records">
        <div className="bg-white border border-gray-100 rounded-xl p-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-12 w-12 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-64" />
              <Skeleton className="h-3 w-40" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-6">
            <Skeleton className="h-20 rounded-lg" />
            <Skeleton className="h-20 rounded-lg" />
            <Skeleton className="h-20 rounded-lg" />
          </div>
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <ErrorState
        title="Could not load inpatient records"
        error={error}
        onRetry={() => void refetch()}
      />
    )
  }

  if (!record) {
    return (
      <div className="text-center py-16">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 mx-auto mb-4">
          <BedDouble className="h-7 w-7 text-muted-foreground" aria-hidden="true" />
        </div>
        <p className="text-sm font-medium text-foreground">No inpatient records</p>
        <p className="text-xs text-muted-foreground mt-1">
          This patient has no inpatient admissions
        </p>
      </div>
    )
  }

  // Parse JSON fields
  const ipPrescriptions: IPPrescription[] = (() => {
    try {
      const parsed = JSON.parse(record.prescriptions ?? "[]") as IPPrescription[]
      return Array.isArray(parsed)
        ? parsed.filter((m) => m.medicine?.trim())
        : []
    } catch {
      return []
    }
  })()

  const dischargeSummary: DischargeSummary | null = (() => {
    try {
      const parsed = JSON.parse(record.dischargeNotes ?? "{}") as DischargeSummary
      if (
        parsed &&
        typeof parsed === "object" &&
        (parsed.diagnosis ||
          parsed.conditionAtDischarge ||
          parsed.medications ||
          parsed.followUpInstructions ||
          parsed.notes)
      ) {
        return parsed
      }
      return null
    } catch {
      return null
    }
  })()

  const doctors: string[] = (() => {
    try {
      return JSON.parse(record.doctorNames ?? "[]") as string[]
    } catch {
      return []
    }
  })()

  const paymentRecords: PaymentRecord[] = (() => {
    try {
      return JSON.parse(record.paymentRecords ?? "[]") as PaymentRecord[]
    } catch {
      return []
    }
  })()

  return (
    <div className="space-y-4">
      {/* Admission card */}
      <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
        <div className="px-6 py-5">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-50">
              <BedDouble className="h-5 w-5 text-violet-600" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h3 className="text-base font-bold text-foreground">{record.name}</h3>
                <span className="text-xs font-mono bg-violet-100 text-violet-700 px-2 py-0.5 rounded font-semibold">
                  {record.ipNumber}
                </span>
                <Badge variant={INPATIENT_STATUS_COLORS[record.status] ?? "secondary"}>
                  {record.status}
                </Badge>
              </div>
              <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" aria-hidden="true" />
                  Admitted: {formatDateLong(record.admissionDate)}
                </span>
                {record.dischargeDate && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" aria-hidden="true" />
                    Discharged: {formatDateLong(record.dischargeDate)}
                  </span>
                )}
                {record.department && <span>{record.department}</span>}
                {record.wardName && record.bedNumber && (
                  <span>
                    Ward: {record.wardName} / Bed: {record.bedNumber}
                  </span>
                )}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              aria-label="Print inpatient record"
              className="shrink-0 gap-1.5"
              onClick={() => toast.info("Print functionality coming soon.")}
            >
              <Printer className="h-3.5 w-3.5" aria-hidden="true" />
              Print
            </Button>
          </div>
        </div>

        {/* Details grid */}
        <div className="border-t border-gray-100 px-6 py-4 bg-gray-50/30">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {doctors.length > 0 && (
              <div>
                <span className="text-xs text-muted-foreground">Doctors</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {doctors.map((d, i) => (
                    <span
                      key={i}
                      className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md font-medium flex items-center gap-1"
                    >
                      <Stethoscope className="h-3 w-3" aria-hidden="true" />
                      {d}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {record.provisionDiagnosis && (
              <div>
                <span className="text-xs text-muted-foreground">
                  Provisional Diagnosis
                </span>
                <p className="text-sm font-medium text-foreground mt-0.5">
                  {record.provisionDiagnosis}
                </p>
              </div>
            )}
            {record.operationName && (
              <div>
                <span className="text-xs text-muted-foreground">Operation</span>
                <p className="text-sm font-medium text-foreground mt-0.5 flex items-center gap-1">
                  <Syringe className="h-3.5 w-3.5 text-violet-500" aria-hidden="true" />
                  {record.operationName}
                </p>
                {record.operationDate && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatDateLong(record.operationDate)}
                  </p>
                )}
              </div>
            )}
            <div>
              <span className="text-xs text-muted-foreground">Financial</span>
              <div className="mt-0.5 space-y-0.5">
                <p className="text-sm font-medium text-foreground">
                  Package: {formatCurrency(record.packageAmount)}
                </p>
                <p className="text-xs text-emerald-600 font-medium">
                  Paid: {formatCurrency(record.totalReceivedAmount)}
                </p>
                {record.balanceAmount > 0 && (
                  <p className="text-xs text-red-600 font-medium">
                    Due: {formatCurrency(record.balanceAmount)}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Payment records */}
        {paymentRecords.length > 0 && (
          <div className="border-t border-gray-100 px-6 py-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Payment Records
            </h4>
            <div className="space-y-1.5">
              {paymentRecords.map((rec, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between text-sm py-1.5"
                >
                  <div className="flex items-center gap-2">
                    <CreditCard
                      className="h-3.5 w-3.5 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <span>
                      {rec.date ? formatDateLong(rec.date) : `Payment ${i + 1}`}
                    </span>
                    {rec.mode && (
                      <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded text-muted-foreground">
                        {rec.mode}
                      </span>
                    )}
                  </div>
                  <span className="font-medium text-emerald-600">
                    {formatCurrency(rec.amount ?? 0)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Admission notes */}
        {record.admissionNotes && (
          <div className="border-t border-gray-100 px-6 py-3">
            <span className="text-xs text-muted-foreground">Admission Notes</span>
            <p className="text-sm text-foreground mt-0.5">{record.admissionNotes}</p>
          </div>
        )}
      </div>

      {/* Inpatient prescriptions */}
      {ipPrescriptions.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
          <button
            onClick={() => setShowPrescriptions(!showPrescriptions)}
            aria-expanded={showPrescriptions}
            className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <Pill className="h-4 w-4 text-emerald-600" aria-hidden="true" />
              <span className="text-sm font-semibold text-foreground">
                Inpatient Prescriptions
              </span>
              <Badge variant="secondary" className="text-xs">
                {ipPrescriptions.length} medicine
                {ipPrescriptions.length !== 1 ? "s" : ""}
              </Badge>
            </div>
            {showPrescriptions ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            )}
          </button>

          {showPrescriptions && (
            <div className="border-t border-gray-100 px-5 py-4">
              <div className="space-y-2">
                {ipPrescriptions.map((med, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 px-3.5 py-2.5 rounded-lg bg-gray-50/80 border border-gray-100"
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-100 text-emerald-700 text-[11px] font-bold shrink-0">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-semibold text-foreground">
                        {med.medicine}
                      </span>
                    </div>
                    {med.timing && (
                      <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md font-medium shrink-0">
                        {med.timing}
                      </span>
                    )}
                    {med.days && (
                      <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-md font-medium shrink-0">
                        {med.days} days
                      </span>
                    )}
                    {med.note && (
                      <span className="text-xs text-muted-foreground italic shrink-0 max-w-[160px] truncate">
                        {med.note}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Discharge summary */}
      {(dischargeSummary ||
        (record.status === "DISCHARGED" && record.dischargeDate)) && (
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
          <button
            onClick={() => setShowDischarge(!showDischarge)}
            aria-expanded={showDischarge}
            className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <FileText className="h-4 w-4 text-blue-600" aria-hidden="true" />
              <span className="text-sm font-semibold text-foreground">
                Discharge Summary
              </span>
              {record.dischargeDate && (
                <span className="text-xs text-muted-foreground">
                  {formatDateLong(record.dischargeDate)}
                </span>
              )}
            </div>
            {showDischarge ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            )}
          </button>

          {showDischarge && (
            <div className="border-t border-gray-100">
              {dischargeSummary ? (
                <div className="p-5 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {record.dischargeDate && (
                      <div className="rounded-xl bg-gray-50/80 border border-gray-100 px-4 py-3">
                        <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide mb-0.5">
                          Discharge Date
                        </p>
                        <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-blue-500" aria-hidden="true" />
                          {formatDateLong(record.dischargeDate)}
                        </p>
                      </div>
                    )}
                    {dischargeSummary.conditionAtDischarge && (
                      <div className="rounded-xl bg-gray-50/80 border border-gray-100 px-4 py-3">
                        <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide mb-0.5">
                          Condition at Discharge
                        </p>
                        <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                          <Heart className="h-3.5 w-3.5 text-rose-500" aria-hidden="true" />
                          {dischargeSummary.conditionAtDischarge}
                        </p>
                      </div>
                    )}
                  </div>
                  {dischargeSummary.diagnosis && (
                    <div className="rounded-xl bg-blue-50/50 border border-blue-100 px-4 py-3">
                      <p className="text-[11px] text-blue-600 font-medium uppercase tracking-wide mb-1 flex items-center gap-1">
                        <ClipboardList className="h-3 w-3" aria-hidden="true" />
                        Discharge Diagnosis
                      </p>
                      <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                        {dischargeSummary.diagnosis}
                      </p>
                    </div>
                  )}
                  {dischargeSummary.medications && (
                    <div className="rounded-xl bg-emerald-50/50 border border-emerald-100 px-4 py-3">
                      <p className="text-[11px] text-emerald-600 font-medium uppercase tracking-wide mb-1 flex items-center gap-1">
                        <Pill className="h-3 w-3" aria-hidden="true" />
                        Medications on Discharge
                      </p>
                      <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                        {dischargeSummary.medications}
                      </p>
                    </div>
                  )}
                  {dischargeSummary.followUpInstructions && (
                    <div className="rounded-xl bg-amber-50/50 border border-amber-100 px-4 py-3">
                      <p className="text-[11px] text-amber-600 font-medium uppercase tracking-wide mb-1 flex items-center gap-1">
                        <CalendarCheck className="h-3 w-3" aria-hidden="true" />
                        Follow-up Instructions
                      </p>
                      <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                        {dischargeSummary.followUpInstructions}
                      </p>
                    </div>
                  )}
                  {dischargeSummary.notes && (
                    <div className="rounded-xl bg-gray-50/80 border border-gray-100 px-4 py-3">
                      <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide mb-1 flex items-center gap-1">
                        <FileText className="h-3 w-3" aria-hidden="true" />
                        Additional Notes
                      </p>
                      <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                        {dischargeSummary.notes}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="px-5 py-4 bg-gray-50/30">
                  <p className="text-sm text-muted-foreground">
                    Discharged on {formatDateLong(record.dischargeDate!)}. No
                    detailed discharge summary available.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Insurance claims */}
      {record.insuranceClaims.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
          <button
            onClick={() => setShowInsurance(!showInsurance)}
            aria-expanded={showInsurance}
            className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <Shield className="h-4 w-4 text-amber-600" aria-hidden="true" />
              <span className="text-sm font-semibold text-foreground">
                Insurance Claims
              </span>
              <Badge variant="secondary" className="text-xs">
                {record.insuranceClaims.length}
              </Badge>
            </div>
            {showInsurance ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            )}
          </button>

          {showInsurance && (
            <div className="border-t border-gray-100 divide-y divide-gray-50">
              {record.insuranceClaims.map((claim) => (
                <div key={claim.id} className="px-5 py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">
                          {claim.insuranceCompanyName}
                        </span>
                        <span className="text-xs font-mono text-muted-foreground bg-gray-100 px-1.5 py-0.5 rounded">
                          {claim.claimNumber}
                        </span>
                      </div>
                      <Badge variant="outline" className="mt-1 text-xs">
                        {claim.status.replace(/_/g, " ")}
                      </Badge>
                    </div>
                    <div className="text-right">
                      {claim.totalApprovedAmount > 0 && (
                        <p className="text-sm font-medium">
                          Approved: {formatCurrency(claim.totalApprovedAmount)}
                        </p>
                      )}
                      {claim.finalSettledAmount > 0 && (
                        <p className="text-xs text-emerald-600 font-medium">
                          Settled: {formatCurrency(claim.finalSettledAmount)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
