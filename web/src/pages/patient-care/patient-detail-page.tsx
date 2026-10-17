/**
 * PatientDetailPage — full content-area patient detail view.
 *
 * Matches main's actual behavior: src/app/(hospital)/patients/components/
 * PatientDetail.tsx is NOT a distinct Next.js route either (no [id] segment
 * exists there) — it's a client-side swap of the OPD list view for a
 * full-width detail view within the same /patients page. This port makes
 * it a real React Router route (/patients/:id) instead, since that's the
 * natural equivalent here and needs no changes to the row-click list
 * component beyond a one-line swap (see .claude/TODO.md) — unlike lifting
 * shared state, which would require editing that file.
 *
 * Reuses every hook/mutation from the former slide-in Sheet
 * (patient-detail-panel.tsx) — status update, date move, delete, add
 * services, billing + record payment — just inside main's real two-column
 * layout (header card, Info/Receipts/History tabs on the left, action
 * cards on the right) instead of a narrow panel, and adds main's rich
 * tabbed print modal (Cash Receipt / Prescription / Readings & Findings /
 * Report), which the Sheet never had (it only opened the raw receipt API
 * URL in a new tab).
 *
 * Deliberate deviation from main: main's PatientDetail.tsx has no Edit
 * action at all (view + billing only). The current port's Sheet has one,
 * routed through an onEdit callback into opd-tab.tsx's own inline (non-
 * exported) edit form. This page can't reach that without editing
 * opd-tab.tsx, so Edit is dropped here for now (Delete is kept — it's
 * self-contained via useDeletePatient). See .claude/TODO.md for the
 * follow-up once it's safe to touch opd-tab.tsx.
 */

import { useEffect, useRef, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { format } from "date-fns"
import {
  ArrowLeft,
  BadgeIndianRupee,
  Building2,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Clock,
  CreditCard,
  Eye,
  FileText,
  Loader2,
  MapPin,
  Phone,
  Plus,
  Printer,
  Receipt,
  Stethoscope,
  Trash2,
  User,
  UserCheck,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  StatusPill,
  SingleSelect,
  ConfirmationModal,
  DatePicker,
  EmptyState,
} from "@/components/patterns"
import { CashReceipt } from "@/components/receipts/CashReceipt"
import { PrescriptionReceipt } from "@/components/receipts/PrescriptionReceipt"
import { ReadingsReceipt } from "@/components/receipts/ReadingsReceipt"
import { ClinicalFindingsReceipt } from "@/components/receipts/ClinicalFindingsReceipt"
import { ReadingsAndFindings } from "@/components/receipts/ReadingsAndFindings"
import { printReceiptsHtml } from "@/lib/print-receipts"
import { toGlassShape, type GlassShape } from "@/lib/glass-prescription"
import { usePermissions } from "@/hooks/usePermissions"
import { formatDate, formatCurrency, calculateAge, getInitials, toLocalDateISO } from "@/lib/utils"
import {
  usePatientDetail,
  usePatientReceipt,
  useUpdatePatientStatus,
  useMovePatientDate,
  useDeletePatient,
} from "./hooks"
import { useBillingPrescriptions, useRecordPayment } from "../billing/hooks"
import { RecordPaymentForm } from "../billing/record-payment-form"
import { AddServicesModal } from "./add-services-modal"
import type { ReceiptPrescription } from "./types"

// ─── Constants ────────────────────────────────────────────────────────────────

const PATIENT_STATUS_OPTIONS = [
  { value: "REGISTERED", label: "Registered" },
  { value: "IN_WORKUP", label: "In Workup" },
  { value: "WORKUP_DONE", label: "Workup Done" },
  { value: "WITH_DOCTOR", label: "With Doctor" },
  { value: "VISITED", label: "Visited" },
  { value: "COMPLETED", label: "Completed" },
  { value: "MEDICAL_ONLY", label: "Medical Only" },
  { value: "MOVED", label: "Moved" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "NO_SHOW", label: "No Show" },
]

const STATUS_BAR_COLOR: Record<string, string> = {
  COMPLETED: "bg-[var(--color-success)]",
  VISITED: "bg-[var(--color-info)]",
  MEDICAL_ONLY: "bg-[var(--color-info)]",
  CANCELLED: "bg-[var(--color-error)]",
  NO_SHOW: "bg-[var(--color-error)]",
  MOVED: "bg-[var(--color-warning)]",
}

type EyeCell = { sph: string; cyl: string; axis: string; va: string; vacPh?: string }
type ArReading = { rightEye: EyeCell; leftEye: EyeCell }

/** Structurally matches ClinicalFindingsReceipt's own (unexported) EyeFindings. */
interface ClinicalEye {
  lids: string
  conjunctiva: string
  cornea: string
  ac: string
  iris: string
  pupil: string
  lens: string
  tension: string
  fundus: string
  opticDisk: string
  macula: string
  vessels: string
  peripheralRetina: string
  retinoscopy: string
  retino1: string
  retino2: string
  retino3: string
  retino4: string
}

const DEFAULT_CLINICAL_EYE: ClinicalEye = {
  lids: "Normal", conjunctiva: "Normal", cornea: "Clear", ac: "Normal",
  iris: "Normal", pupil: "Normal", lens: "Clear", tension: "—",
  fundus: "—", opticDisk: "Normal", macula: "—", vessels: "—",
  peripheralRetina: "—", retinoscopy: "—", retino1: "—", retino2: "—", retino3: "—", retino4: "—",
}

// ─── Small presentational helpers ──────────────────────────────────────────────

function DetailField({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
}) {
  return (
    <div>
      <div className="mb-1 flex items-center gap-1.5">
        <Icon className="h-3 w-3 text-[var(--color-muted-foreground)]/70" aria-hidden />
        <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--color-muted-foreground)]">
          {label}
        </p>
      </div>
      <p className="pl-[18px] text-sm font-medium text-[var(--color-foreground)]">{value}</p>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PatientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { can } = usePermissions()

  const canEdit = can("patients:edit")
  const canDelete = can("patients:delete")
  const canAddServices = can("billing:create")
  const canViewReceipt = can("billing:view")

  const [showDelete, setShowDelete] = useState(false)
  const [showAddService, setShowAddService] = useState(false)
  const [newDate, setNewDate] = useState<Date | undefined>()
  const [showDateMove, setShowDateMove] = useState(false)
  const [payingPrescriptionId, setPayingPrescriptionId] = useState<string | null>(null)
  const [expandedPrescriptionId, setExpandedPrescriptionId] = useState<string | null>(null)

  const [printOpen, setPrintOpen] = useState(false)
  const [printTab, setPrintTab] = useState("cash")
  const [readingsSubTab, setReadingsSubTab] = useState<"readings" | "clinical" | "both">("both")
  const printRef = useRef<HTMLDivElement>(null)

  const { data: patient, isLoading, isError, error, refetch } = usePatientDetail(id ?? null)

  const { data: receiptData, isLoading: printLoading } = usePatientReceipt(id ?? null, printOpen)

  // appointmentDate comes back from the backend as a full IST-anchored
  // TIMESTAMPTZ (e.g. "2026-10-12T18:30:00+00:00" for IST date 2026-10-13),
  // not a plain YYYY-MM-DD — passing it straight through as the `date` query
  // param breaks the backend's `${dateStr}T00:00:00+05:30` IST-day-bounds
  // parsing, silently matching zero prescriptions. Normalize it the same
  // way the rest of the app does (opd-tab.tsx, date-navigator.tsx).
  const billingDate = patient?.appointmentDate
    ? toLocalDateISO(new Date(patient.appointmentDate))
    : null

  const {
    data: billingData,
    isLoading: billingLoading,
    total: billingTotal,
    pageSize: billingPageSize,
    setPageSize: setBillingPageSize,
    refetch: refetchBilling,
  } = useBillingPrescriptions(billingDate)

  // The endpoint is paginated (default pageSize 25) and only page 1 was
  // ever read — on a date with more billed prescriptions than that across
  // ALL patients, a patient near the end of the list would silently show
  // no billing. Once the real total is known, widen pageSize to cover it.
  useEffect(() => {
    if (billingDate && billingTotal > billingPageSize) {
      setBillingPageSize(billingTotal)
    }
  }, [billingDate, billingTotal, billingPageSize, setBillingPageSize])

  const billedPrescriptions = (billingData ?? []).filter(
    (p) => p.patientId === patient?.patientId && p.status !== "CANCELLED",
  )
  const totalBalanceDue = billedPrescriptions.reduce((sum, p) => sum + p.balanceDue, 0)

  const recordPayment = useRecordPayment(payingPrescriptionId ?? "", () => {
    setPayingPrescriptionId(null)
    void refetchBilling()
  })
  const updateStatus = useUpdatePatientStatus(() => void refetch())
  const moveDate = useMovePatientDate(() => {
    void refetch()
    setShowDateMove(false)
    setNewDate(undefined)
  })
  const deletePatient = useDeletePatient(() => navigate("/patients"))

  function handleMoveDate() {
    if (!id || !newDate) return
    moveDate.mutate({ id, body: { appointmentDate: format(newDate, "yyyy-MM-dd") } })
  }

  function handlePrint() {
    if (!printRef.current || !patient) return
    printReceiptsHtml({
      title: `Receipt — ${patient.firstName} ${patient.lastName ?? ""}`.trim(),
      contentHtml: printRef.current.innerHTML,
    })
  }

  if (isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-24 rounded-[var(--radius-xl)]" />
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <Skeleton className="h-72 rounded-[var(--radius-xl)] lg:col-span-2" />
          <Skeleton className="h-72 rounded-[var(--radius-xl)]" />
        </div>
      </div>
    )
  }

  if (isError || !patient) {
    return (
      <EmptyState
        title={isError ? "Failed to load patient" : "Patient not found"}
        description={
          isError && error instanceof Error ? error.message : "This patient may have been removed."
        }
        action={{
          label: "Back to Patients",
          onClick: () => navigate("/patients"),
          variant: "outline",
        }}
      />
    )
  }

  // Runtime shape from findPatientById includes full nested items/payments —
  // richer than the OPD-table-only `PatientLatestPrescription` the base
  // `Patient` type declares, so read it through the shape that actually
  // matches (ReceiptPrescription), same as the receipt endpoint returns.
  const prescriptions = (patient.prescriptions ?? []) as unknown as ReceiptPrescription[]
  const sortedPrescriptions = [...prescriptions].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  )
  const hasBilledPrescriptions = sortedPrescriptions.some((p) => p.total > 0)
  const hasEyeReadings = (patient.eyeReadings ?? []).length > 0
  const canPrint = canViewReceipt && (hasBilledPrescriptions || hasEyeReadings)
  const fullName = `${patient.firstName} ${patient.lastName ?? ""}`.trim()

  // ─── Print modal data mapping (ported from main's PatientDetail.tsx) ───────
  const rPatient = receiptData?.patient
  const rHospital = receiptData?.hospital
  const rPrescription = receiptData?.prescription
  const rEyeReading = receiptData?.eyeReading

  const patientInfo = rPatient
    ? {
        patientName: `${rPatient.firstName} ${rPatient.lastName ?? ""}`.trim(),
        patientId: rPatient.patientId,
        date: formatDate(rPrescription?.prescriptionDate ?? rPatient.appointmentDate),
        mobile: rPatient.phone || "—",
        gender: rPatient.gender,
        age: String(rPatient.age ?? (rPatient.dateOfBirth ? calculateAge(rPatient.dateOfBirth) : "—")),
        address: rPatient.address || "—",
        referredBy: rPatient.referredBy || undefined,
        receiptNo: rPrescription?.prescriptionNumber || undefined,
        doctorName: rPrescription?.doctorName || rPatient.doctorName || "—",
        department: rPrescription?.department || rPatient.department || undefined,
      }
    : null

  const hospitalInfo = rHospital
    ? {
        name: rHospital.name,
        displayName: rHospital.displayName,
        address: rHospital.address,
        phone: rHospital.phone,
        email: rHospital.email,
        website: rHospital.website,
        registrationNo: rHospital.registrationNo,
        logoUrl: rHospital.logoUrl,
      }
    : { name: "Hospital" }

  let medicines: { name: string; timing: string; days: string; note?: string }[] = []
  if (rPrescription?.medicines) {
    try {
      medicines = JSON.parse(rPrescription.medicines)
    } catch {
      /* empty */
    }
  }

  let investigations: string[] = []
  if (rPrescription?.investigations) {
    try {
      const parsed = JSON.parse(rPrescription.investigations) as { name: string }[]
      investigations = parsed.map((i) => i.name)
    } catch {
      /* empty */
    }
  }

  let arReading: ArReading | undefined
  let previousGlass: GlassShape | undefined
  let presentGlass: GlassShape | undefined
  let clinicalFindings: { rightEye: ClinicalEye; leftEye: ClinicalEye } | undefined

  if (rEyeReading) {
    if (rEyeReading.autoRefractometer) {
      try {
        const ar = JSON.parse(rEyeReading.autoRefractometer)
        arReading = {
          rightEye: { sph: ar.re?.sph || "", cyl: ar.re?.cyl || "", axis: ar.re?.axis || "", va: ar.re?.va || "", vacPh: ar.re?.vacPh || "" },
          leftEye: { sph: ar.le?.sph || "", cyl: ar.le?.cyl || "", axis: ar.le?.axis || "", va: ar.le?.va || "", vacPh: ar.le?.vacPh || "" },
        }
      } catch {
        /* empty */
      }
    }
    if (rEyeReading.previousPrescription) {
      try {
        previousGlass = toGlassShape(JSON.parse(rEyeReading.previousPrescription))
      } catch {
        /* empty */
      }
    }
    if (rEyeReading.presentPrescription) {
      try {
        presentGlass = toGlassShape(JSON.parse(rEyeReading.presentPrescription))
      } catch {
        /* empty */
      }
    }
    if (rEyeReading.clinicalFindings) {
      try {
        const cf = JSON.parse(rEyeReading.clinicalFindings)
        clinicalFindings = {
          rightEye: { ...DEFAULT_CLINICAL_EYE, ...cf.re },
          leftEye: { ...DEFAULT_CLINICAL_EYE, ...cf.le },
        }
      } catch {
        /* empty */
      }
    }
  }

  return (
    <div className="space-y-5">
      <Button variant="ghost" size="sm" className="-ml-2" onClick={() => navigate("/patients")}>
        <ArrowLeft className="mr-1.5 h-3.5 w-3.5" aria-hidden />
        Back to Patients
      </Button>

      {/* ─── Header card ─── */}
      <div className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-card)]">
        <div className={`h-1 ${STATUS_BAR_COLOR[patient.status ?? ""] ?? "bg-[var(--color-primary)]"}`} />
        <div className="flex flex-wrap items-start justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14 border-2 border-[var(--color-primary)]/10">
              <AvatarFallback className="bg-[var(--color-primary)]/5 text-lg font-bold text-[var(--color-primary)]">
                {getInitials(fullName)}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-[var(--color-foreground)]">{fullName}</h2>
                <StatusPill status={patient.status ?? "REGISTERED"} />
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[var(--color-muted-foreground)]">
                <span className="rounded bg-[var(--color-muted)] px-2 py-0.5 font-mono text-xs font-semibold text-[var(--color-foreground)]">
                  {patient.patientId}
                </span>
                {patient.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3" aria-hidden />
                    {patient.phone}
                  </span>
                )}
                <span>
                  {patient.age ?? (patient.dateOfBirth ? calculateAge(patient.dateOfBirth) : "—")} yrs &middot;{" "}
                  {patient.gender}
                </span>
                {patient.doctorName && (
                  <span className="flex items-center gap-1">
                    <Stethoscope className="h-3 w-3" aria-hidden />
                    {patient.doctorName}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {totalBalanceDue > 0 ? (
              <div className="flex items-center gap-2 rounded-[var(--radius-lg)] border border-[var(--color-error)]/20 bg-[var(--color-error-soft)] px-4 py-2">
                <BadgeIndianRupee className="h-4 w-4 text-[var(--color-error)]" aria-hidden />
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--color-error)]">
                    Balance Due
                  </p>
                  <p className="text-lg font-bold leading-tight text-[var(--color-error)]">
                    {formatCurrency(totalBalanceDue)}
                  </p>
                </div>
              </div>
            ) : hasBilledPrescriptions ? (
              <div className="flex items-center gap-2 rounded-[var(--radius-lg)] border border-[var(--color-success)]/20 bg-[var(--color-success-soft)] px-4 py-2">
                <BadgeIndianRupee className="h-4 w-4 text-[var(--color-success)]" aria-hidden />
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--color-success)]">
                    Payment
                  </p>
                  <p className="text-sm font-semibold leading-tight text-[var(--color-success)]">No Dues</p>
                </div>
              </div>
            ) : null}

            {canPrint && (
              <Button variant="outline" size="sm" onClick={() => setPrintOpen(true)}>
                <Printer className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                Print
              </Button>
            )}
            {canDelete && (
              <Button
                variant="destructive"
                size="sm"
                aria-label="Delete patient"
                onClick={() => setShowDelete(true)}
              >
                <Trash2 className="h-4 w-4" aria-hidden />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ─── Main content ─── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* ── Left: Info / Receipts / History ── */}
        <div className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-card)] lg:col-span-2">
          <Tabs defaultValue="info">
            <div className="border-b border-[var(--color-border)] px-5 pt-3">
              <TabsList className="h-10 gap-1 bg-transparent p-0">
                <TabsTrigger value="info" className="h-9 gap-1.5 rounded-[var(--radius-md)] text-sm">
                  <User className="h-3.5 w-3.5" aria-hidden />
                  Info
                </TabsTrigger>
                <TabsTrigger value="receipts" className="h-9 gap-1.5 rounded-[var(--radius-md)] text-sm">
                  <Receipt className="h-3.5 w-3.5" aria-hidden />
                  Receipts
                </TabsTrigger>
                <TabsTrigger value="history" className="h-9 gap-1.5 rounded-[var(--radius-md)] text-sm">
                  <Clock className="h-3.5 w-3.5" aria-hidden />
                  History
                </TabsTrigger>
              </TabsList>
            </div>

            {/* ── Info tab ── */}
            <TabsContent value="info" className="mt-0 p-5">
              <div className="grid grid-cols-2 gap-x-8 gap-y-5 sm:grid-cols-3">
                <DetailField icon={Phone} label="Phone" value={patient.phone || "—"} />
                <DetailField
                  icon={User}
                  label="Age / Gender"
                  value={`${patient.age ?? (patient.dateOfBirth ? calculateAge(patient.dateOfBirth) : "—")} / ${patient.gender}`}
                />
                <DetailField
                  icon={CalendarDays}
                  label="Date of Birth"
                  value={patient.dateOfBirth ? formatDate(patient.dateOfBirth) : "—"}
                />
                <DetailField icon={CalendarDays} label="Appointment" value={formatDate(patient.appointmentDate)} />
                <DetailField icon={Stethoscope} label="Doctor" value={patient.doctorName ?? "—"} />
                <DetailField icon={Building2} label="Department" value={patient.department ?? "—"} />
                <DetailField icon={UserCheck} label="Referred By" value={patient.referredBy ?? "—"} />
                <DetailField
                  icon={User}
                  label="Guardian"
                  value={
                    patient.guardianName
                      ? `${patient.guardianName}${patient.guardianRelation ? ` (${patient.guardianRelation})` : ""}`
                      : "—"
                  }
                />
                <DetailField icon={User} label="Patient Type" value={patient.patientCategory ?? "Regular"} />
              </div>

              {(patient.address || patient.addressLine) && (
                <div className="mt-5 border-t border-[var(--color-border)] pt-4">
                  <div className="mb-1 flex items-center gap-1.5">
                    <MapPin className="h-3 w-3 text-[var(--color-muted-foreground)]/70" aria-hidden />
                    <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--color-muted-foreground)]">
                      Address
                    </p>
                  </div>
                  <p className="pl-[18px] text-sm text-[var(--color-foreground)]">
                    {[patient.addressLine, patient.area, patient.city, patient.state, patient.pincode]
                      .filter(Boolean)
                      .join(", ") || patient.address}
                  </p>
                </div>
              )}

              {patient.notes && (
                <div className="mt-5 border-t border-[var(--color-border)] pt-4">
                  <div className="mb-1 flex items-center gap-1.5">
                    <FileText className="h-3 w-3 text-[var(--color-muted-foreground)]/70" aria-hidden />
                    <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--color-muted-foreground)]">
                      Notes
                    </p>
                  </div>
                  <p className="pl-[18px] text-sm text-[var(--color-foreground)]">{patient.notes}</p>
                </div>
              )}

              {hasEyeReadings && (
                <div className="mt-5 border-t border-[var(--color-border)] pt-4">
                  <div className="mb-2 flex items-center gap-1.5">
                    <Eye className="h-3.5 w-3.5 text-[var(--color-info)]" aria-hidden />
                    <p className="text-xs font-semibold text-[var(--color-foreground)]">Eye Readings Available</p>
                  </div>
                  <p className="pl-[22px] text-xs text-[var(--color-muted-foreground)]">
                    Last reading: {formatDate(patient.eyeReadings![0]?.readingDate ?? "")}
                  </p>
                </div>
              )}
            </TabsContent>

            {/* ── Receipts tab ── */}
            <TabsContent value="receipts" className="mt-0 p-5">
              {sortedPrescriptions.filter((p) => p.total > 0).length > 0 ? (
                <div className="space-y-3">
                  {sortedPrescriptions
                    .filter((p) => p.total > 0)
                    .map((rx) => (
                      <div
                        key={rx.id}
                        className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)]"
                      >
                        <div className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-muted)]/50 px-4 py-3">
                          <div className="flex items-center gap-3">
                            <FileText className="h-4 w-4 text-[var(--color-muted-foreground)]" aria-hidden />
                            <div>
                              <span className="font-mono text-xs font-semibold text-[var(--color-foreground)]">
                                {rx.prescriptionNumber ?? "—"}
                              </span>
                              <span className="ml-2 text-[10px] text-[var(--color-muted-foreground)]">
                                {formatDate(rx.prescriptionDate)}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={
                                rx.balanceDue > 0
                                  ? "rounded-full bg-[var(--color-error-soft)] px-2 py-0.5 text-xs font-semibold text-[var(--color-error)]"
                                  : "rounded-full bg-[var(--color-success-soft)] px-2 py-0.5 text-xs font-semibold text-[var(--color-success)]"
                              }
                            >
                              {rx.balanceDue > 0 ? `Due: ${formatCurrency(rx.balanceDue)}` : "Paid"}
                            </span>
                            {canPrint && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={() => setPrintOpen(true)}
                                aria-label="Print receipt"
                              >
                                <Printer className="h-3.5 w-3.5" aria-hidden />
                              </Button>
                            )}
                          </div>
                        </div>
                        <div className="p-4">
                          {rx.items && rx.items.length > 0 && (
                            <div className="space-y-1.5">
                              {rx.items.map((item) => (
                                <div key={item.id} className="flex justify-between text-sm">
                                  <span className="text-[var(--color-foreground)]">{item.description}</span>
                                  <span className="font-medium text-[var(--color-muted-foreground)]">
                                    {formatCurrency(item.amount)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                          <Separator className="my-3" />
                          <div className="space-y-1">
                            <div className="flex justify-between text-sm font-semibold">
                              <span>Total</span>
                              <span>{formatCurrency(rx.subtotal ?? rx.total)}</span>
                            </div>
                            {rx.discount > 0 && (
                              <div className="flex justify-between text-xs text-[var(--color-muted-foreground)]">
                                <span>Discount</span>
                                <span className="text-[var(--color-success)]">
                                  -{formatCurrency(rx.discount)}
                                </span>
                              </div>
                            )}
                            <div className="flex justify-between text-xs text-[var(--color-muted-foreground)]">
                              <span>Received ({rx.paymentMode ?? "—"})</span>
                              <span>{formatCurrency(rx.amountPaid)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-[var(--color-muted-foreground)]">
                  <Receipt className="mb-3 h-10 w-10 opacity-20" aria-hidden />
                  <p className="text-sm font-medium">No receipts yet</p>
                  <p className="mt-1 text-xs">Add services to generate receipts</p>
                </div>
              )}
            </TabsContent>

            {/* ── History tab ── */}
            <TabsContent value="history" className="mt-0 p-5">
              {sortedPrescriptions.length > 0 ? (
                <div className="relative space-y-4">
                  <div className="absolute bottom-2 left-[7px] top-2 w-px bg-[var(--color-divider)]" />
                  {sortedPrescriptions.map((p) => (
                    <div key={p.id} className="relative flex items-start gap-3.5">
                      <div
                        className={`z-10 h-3.5 w-3.5 shrink-0 rounded-full border-2 ${
                          p.status === "COMPLETED"
                            ? "border-[var(--color-success)]/30 bg-[var(--color-success)]"
                            : p.status === "BILLING_ONLY"
                              ? "border-[var(--color-info)]/30 bg-[var(--color-info)]"
                              : "border-[var(--color-primary)]/30 bg-[var(--color-primary)]"
                        }`}
                      />
                      <div className="-mt-0.5 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-[var(--color-foreground)]">{p.status}</span>
                          <span className="text-xs text-[var(--color-muted-foreground)]">
                            {formatDate(p.prescriptionDate)}
                          </span>
                        </div>
                        {p.prescriptionNumber && (
                          <p className="mt-0.5 font-mono text-xs text-[var(--color-muted-foreground)]">
                            {p.prescriptionNumber}
                          </p>
                        )}
                        {p.total > 0 && (
                          <div className="mt-1 flex items-center gap-2">
                            <span className="text-xs font-medium text-[var(--color-foreground)]">
                              {formatCurrency(p.total)}
                            </span>
                            {p.balanceDue > 0 && (
                              <span className="rounded bg-[var(--color-error-soft)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-error)]">
                                Due: {formatCurrency(p.balanceDue)}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-[var(--color-muted-foreground)]">
                  <Clock className="mb-3 h-10 w-10 opacity-20" aria-hidden />
                  <p className="text-sm font-medium">No history</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* ── Right: action cards ── */}
        <div className="space-y-4">
          {/* Billing */}
          {canViewReceipt && (
            <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                  Billing — Today&apos;s Visit
                </p>
                {totalBalanceDue > 0 && (
                  <span className="text-xs font-semibold text-[var(--color-error)]">
                    Due: {formatCurrency(totalBalanceDue)}
                  </span>
                )}
              </div>

              {billingLoading && (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              )}

              {!billingLoading && billedPrescriptions.length === 0 && (
                <p className="text-sm text-[var(--color-muted-foreground)]">
                  No billed prescriptions for this visit.
                </p>
              )}

              {!billingLoading && billedPrescriptions.length > 0 && (
                <div className="space-y-2">
                  {billedPrescriptions.map((rx) => {
                    const isExpanded = expandedPrescriptionId === rx.id
                    return (
                      <div
                        key={rx.id}
                        className="rounded-[var(--radius)] border border-[var(--color-border)] p-3"
                      >
                        <button
                          type="button"
                          className="flex w-full items-center justify-between gap-2"
                          onClick={() => setExpandedPrescriptionId(isExpanded ? null : rx.id)}
                        >
                          <div className="flex min-w-0 items-center gap-2">
                            <CreditCard className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]" aria-hidden />
                            <span className="truncate font-mono text-xs font-medium text-[var(--color-foreground)]">
                              {rx.prescriptionNumber}
                            </span>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <span className="text-xs font-semibold">{formatCurrency(rx.total)}</span>
                            {isExpanded ? (
                              <ChevronUp className="h-3 w-3 text-[var(--color-muted-foreground)]" aria-hidden />
                            ) : (
                              <ChevronDown className="h-3 w-3 text-[var(--color-muted-foreground)]" aria-hidden />
                            )}
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="mt-2 space-y-1 border-t border-[var(--color-border)] pt-2">
                            <div className="flex items-center justify-between text-xs text-[var(--color-muted-foreground)]">
                              <span>Total {formatCurrency(rx.total)} · Paid {formatCurrency(rx.amountPaid)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span
                                className={
                                  rx.balanceDue > 0
                                    ? "text-xs font-medium text-[var(--color-error)]"
                                    : "text-xs font-medium text-[var(--color-success)]"
                                }
                              >
                                {rx.balanceDue > 0 ? `Due: ${formatCurrency(rx.balanceDue)}` : "Paid"}
                              </span>
                              {canAddServices && rx.balanceDue > 0 && payingPrescriptionId !== rx.id && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setPayingPrescriptionId(rx.id)}
                                >
                                  Record Payment
                                </Button>
                              )}
                            </div>
                            {payingPrescriptionId === rx.id && (
                              <RecordPaymentForm
                                balanceDue={rx.balanceDue}
                                isSubmitting={recordPayment.isPending}
                                onSubmit={(values) => recordPayment.mutate(values)}
                                onCancel={() => setPayingPrescriptionId(null)}
                              />
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {canAddServices && (
                <Button size="sm" className="mt-3 w-full" onClick={() => setShowAddService(true)}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                  Add Service
                </Button>
              )}
            </div>
          )}

          {/* Status */}
          {canEdit && (
            <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-4">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                Status
              </p>
              <SingleSelect
                options={PATIENT_STATUS_OPTIONS}
                value={patient.status ?? ""}
                onChange={(status) => {
                  if (status && id) updateStatus.mutate({ id, body: { status } })
                }}
                placeholder="Update status"
                aria-label="Update patient status"
              />
            </div>
          )}

          {/* Move appointment */}
          {canEdit && (
            <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                  Move Appointment
                </p>
                {!showDateMove && (
                  <Button variant="outline" size="sm" onClick={() => setShowDateMove(true)}>
                    <CalendarDays className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                    Move
                  </Button>
                )}
              </div>

              {!showDateMove ? (
                <div className="flex items-center gap-2 text-xs text-[var(--color-muted-foreground)]">
                  <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                  <span>
                    Current:{" "}
                    <span className="font-medium text-[var(--color-foreground)]">
                      {formatDate(patient.appointmentDate)}
                    </span>
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <DatePicker
                    value={newDate}
                    onChange={setNewDate}
                    placeholder="Select new date"
                    aria-label="New appointment date"
                  />
                  <Button size="sm" onClick={handleMoveDate} disabled={!newDate} loading={moveDate.isPending}>
                    Move
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowDateMove(false)}>
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ─── Delete confirmation ─── */}
      <ConfirmationModal
        open={showDelete}
        onOpenChange={setShowDelete}
        variant="destructive"
        title="Delete Patient"
        description={`This will permanently delete ${fullName} (${patient.patientId}) and all associated records. This cannot be undone.`}
        confirmLabel="Delete Patient"
        onConfirm={() => deletePatient.mutate(patient.id)}
        isLoading={deletePatient.isPending}
      />

      {/* ─── Add Services modal ─── */}
      <AddServicesModal
        open={showAddService}
        onOpenChange={setShowAddService}
        patient={patient}
        onSuccess={() => void refetch()}
      />

      {/* ─── Print Receipts modal ─── */}
      <Dialog open={printOpen} onOpenChange={(open) => setPrintOpen(open)}>
        <DialogContent className="flex max-h-[95vh] max-w-[870px] flex-col gap-0 p-0">
          <DialogHeader className="flex-row items-center justify-between border-b border-[var(--color-border)] px-6 pb-3 pt-5">
            <DialogTitle className="text-base">Print Receipts — {fullName}</DialogTitle>
            <Button size="sm" onClick={handlePrint} disabled={printLoading}>
              <Printer className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              Print
            </Button>
          </DialogHeader>

          {printLoading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-24">
              <Loader2 className="h-7 w-7 animate-spin text-[var(--color-primary)]" aria-hidden />
              <p className="text-sm text-[var(--color-muted-foreground)]">Loading receipt data...</p>
            </div>
          ) : receiptData ? (
            <Tabs value={printTab} onValueChange={setPrintTab} className="flex min-h-0 flex-1 flex-col">
              <div className="border-b border-[var(--color-border)] px-4">
                <TabsList className="h-auto gap-0 rounded-none bg-transparent p-0">
                  <TabsTrigger value="cash">Cash Receipt</TabsTrigger>
                  <TabsTrigger value="prescription">Prescription</TabsTrigger>
                  <TabsTrigger value="readings">Readings &amp; Findings</TabsTrigger>
                  <TabsTrigger value="report">Report</TabsTrigger>
                </TabsList>
              </div>

              <div className="flex-1 overflow-y-auto bg-[var(--color-muted)] p-4">
                <div ref={printRef}>
                  <TabsContent value="cash" className="mt-0">
                    {patientInfo && rPrescription ? (
                      <CashReceipt
                        hospital={hospitalInfo}
                        patient={patientInfo}
                        payment={{
                          mode: rPrescription.paymentMode || "Cash",
                          totalAmount: rPrescription.subtotal ?? rPrescription.total ?? 0,
                          discount: rPrescription.discount ?? 0,
                          amountReceived: rPrescription.amountPaid ?? 0,
                          amountDue: rPrescription.balanceDue ?? 0,
                        }}
                        items={rPrescription.items?.map((i) => ({ description: i.description, amount: i.amount }))}
                      />
                    ) : (
                      <div className="rounded-lg border bg-[var(--color-card)] py-16 text-center text-sm text-[var(--color-muted-foreground)]">
                        No billing data available for this patient
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="prescription" className="mt-0">
                    {patientInfo ? (
                      <PrescriptionReceipt
                        hospital={hospitalInfo}
                        patient={patientInfo}
                        vitals={
                          rPrescription
                            ? {
                                temperature: rPrescription.temperature ? String(rPrescription.temperature) : undefined,
                                pulseRate: rPrescription.pulseRate ? String(rPrescription.pulseRate) : undefined,
                                spo2: rPrescription.spo2 ? String(rPrescription.spo2) : undefined,
                              }
                            : undefined
                        }
                        history={
                          rPrescription
                            ? {
                                presentComplaint: rPrescription.presentComplaint || undefined,
                                previousHistory: rPrescription.previousHistory || undefined,
                                diagnosis: rPrescription.diagnosis || undefined,
                              }
                            : undefined
                        }
                        medicines={medicines}
                        investigations={investigations}
                        advice={rPrescription?.additionalNotes || undefined}
                        followUpDate={rPrescription?.followUpDate ? formatDate(rPrescription.followUpDate) : undefined}
                        notes={rPrescription?.notes || undefined}
                      />
                    ) : (
                      <div className="rounded-lg border bg-[var(--color-card)] py-16 text-center text-sm text-[var(--color-muted-foreground)]">
                        No prescription data available
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="readings" className="mt-0 space-y-4">
                    <div className="mx-auto flex w-fit gap-1 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-1">
                      {(["readings", "clinical", "both"] as const).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setReadingsSubTab(t)}
                          className={`rounded-[var(--radius-md)] px-3 py-1.5 text-xs font-medium transition-colors ${
                            readingsSubTab === t
                              ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]"
                              : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
                          }`}
                        >
                          {t === "readings" ? "Readings" : t === "clinical" ? "Clinical Findings" : "Both"}
                        </button>
                      ))}
                    </div>

                    {readingsSubTab === "readings" && patientInfo && (
                      <ReadingsReceipt
                        hospital={hospitalInfo}
                        patient={patientInfo}
                        arReading={arReading}
                        previousGlass={previousGlass}
                        presentGlass={presentGlass}
                      />
                    )}
                    {readingsSubTab === "clinical" && clinicalFindings && (
                      <ClinicalFindingsReceipt
                        hospital={hospitalInfo}
                        rightEye={clinicalFindings.rightEye}
                        leftEye={clinicalFindings.leftEye}
                      />
                    )}
                    {readingsSubTab === "both" && patientInfo && (
                      <ReadingsAndFindings
                        hospital={hospitalInfo}
                        patient={patientInfo}
                        arReading={arReading}
                        previousGlass={previousGlass}
                        presentGlass={presentGlass}
                        clinicalFindings={clinicalFindings}
                      />
                    )}
                    {!rEyeReading && (
                      <div className="rounded-lg border bg-[var(--color-card)] py-16 text-center text-sm text-[var(--color-muted-foreground)]">
                        No eye reading data available for this patient
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="report" className="mt-0 space-y-0">
                    {patientInfo && (
                      <>
                        <PrescriptionReceipt
                          hospital={hospitalInfo}
                          patient={patientInfo}
                          vitals={
                            rPrescription
                              ? {
                                  temperature: rPrescription.temperature ? String(rPrescription.temperature) : undefined,
                                  pulseRate: rPrescription.pulseRate ? String(rPrescription.pulseRate) : undefined,
                                  spo2: rPrescription.spo2 ? String(rPrescription.spo2) : undefined,
                                }
                              : undefined
                          }
                          history={
                            rPrescription
                              ? {
                                  presentComplaint: rPrescription.presentComplaint || undefined,
                                  previousHistory: rPrescription.previousHistory || undefined,
                                  diagnosis: rPrescription.diagnosis || undefined,
                                }
                              : undefined
                          }
                          medicines={medicines}
                          investigations={investigations}
                          advice={rPrescription?.additionalNotes || undefined}
                          followUpDate={rPrescription?.followUpDate ? formatDate(rPrescription.followUpDate) : undefined}
                          notes={rPrescription?.notes || undefined}
                        />
                        {rEyeReading && (
                          <ReadingsAndFindings
                            hospital={hospitalInfo}
                            patient={patientInfo}
                            arReading={arReading}
                            previousGlass={previousGlass}
                            presentGlass={presentGlass}
                            clinicalFindings={clinicalFindings}
                          />
                        )}
                      </>
                    )}
                  </TabsContent>
                </div>
              </div>
            </Tabs>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
