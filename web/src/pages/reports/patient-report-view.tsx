/**
 * patient-report-view.tsx
 *
 * Full patient report view: summary card + 5-tab content area.
 * Tab structure matches the real old Next.js app exactly:
 *   visits | prescriptions | inpatient | labs | billing
 *
 * Props: patientId (UUID — used for all API calls)
 *        patientSummary (loaded by parent from GET /reports/patients/{id}/summary)
 *
 * Permission: reports:view (gated by parent ReportsPage)
 */

import { useState } from "react"
import {
  Calendar,
  Pill,
  BedDouble,
  FlaskConical,
  IndianRupee,
  User,
  Phone,
  Mail,
  CalendarDays,
  Activity,
  Clock,
  MapPin,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { formatDateLong, formatCurrency, getInitials } from "@/lib/utils"
import { VisitHistoryTab } from "./visit-history-tab"
import { PrescriptionsTab } from "./prescriptions-tab"
import { LabRecordsTab } from "./lab-records-tab"
import { InpatientRecordsTab } from "./inpatient-records-tab"
import { BillingTab } from "./billing-tab"
import type { PatientSummary } from "./types"

// ─── Tab definition ───────────────────────────────────────────────────────────

/** Tab IDs and config — verified from old ReportsPage.tsx TABS constant. */
const TABS = [
  { id: "visits", label: "Visits", icon: Calendar, accent: "blue" },
  { id: "prescriptions", label: "Prescriptions", icon: Pill, accent: "emerald" },
  { id: "inpatient", label: "Inpatient", icon: BedDouble, accent: "violet" },
  { id: "labs", label: "Lab Records", icon: FlaskConical, accent: "orange" },
  { id: "billing", label: "Billing & Dues", icon: IndianRupee, accent: "rose" },
] as const

type TabId = (typeof TABS)[number]["id"]

const ACCENT_STYLES: Record<
  string,
  { active: string; icon: string; dot: string }
> = {
  blue: {
    active:
      "bg-blue-50 border-blue-200 text-blue-700 shadow-sm shadow-blue-100/50",
    icon: "text-blue-600",
    dot: "bg-blue-500",
  },
  emerald: {
    active:
      "bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm shadow-emerald-100/50",
    icon: "text-emerald-600",
    dot: "bg-emerald-500",
  },
  violet: {
    active:
      "bg-violet-50 border-violet-200 text-violet-700 shadow-sm shadow-violet-100/50",
    icon: "text-violet-600",
    dot: "bg-violet-500",
  },
  orange: {
    active:
      "bg-orange-50 border-orange-200 text-orange-700 shadow-sm shadow-orange-100/50",
    icon: "text-orange-600",
    dot: "bg-orange-500",
  },
  rose: {
    active:
      "bg-rose-50 border-rose-200 text-rose-700 shadow-sm shadow-rose-100/50",
    icon: "text-rose-600",
    dot: "bg-rose-500",
  },
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface PatientReportViewProps {
  /** Patient UUID (Patient.id) — route param for all sub-report endpoints. */
  patientId: string
  patient: PatientSummary
  isLoadingPatient: boolean
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PatientReportView({
  patientId,
  patient,
  isLoadingPatient,
}: PatientReportViewProps) {
  const [activeTab, setActiveTab] = useState<TabId>("visits")

  if (isLoadingPatient) {
    return (
      <div className="space-y-4 px-1">
        <div className="bg-white border border-gray-100 rounded-xl p-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-16 w-16 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-72" />
            </div>
          </div>
          <div className="grid grid-cols-5 gap-4 mt-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-0 px-1">
      {/* Patient summary card */}
      <PatientSummaryCard patient={patient} />

      {/* Tab navigation */}
      <div className="sticky top-18 z-10 -mx-5 px-5 pt-5 pb-0 bg-gray-50">
        <nav
          aria-label="Patient report sections"
          className="bg-white border border-gray-200 rounded-2xl p-1.5 flex gap-1 overflow-x-auto"
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id
            const styles = ACCENT_STYLES[tab.accent]
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                aria-selected={isActive}
                aria-controls={`tab-panel-${tab.id}`}
                role="tab"
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all duration-200 whitespace-nowrap",
                  isActive
                    ? styles.active
                    : "border-transparent text-muted-foreground hover:text-foreground hover:bg-gray-50",
                )}
              >
                <tab.icon
                  className={cn(
                    "h-4 w-4 shrink-0",
                    isActive ? styles.icon : "text-current",
                  )}
                  aria-hidden="true"
                />
                <span>{tab.label}</span>
                {isActive && (
                  <span
                    className={cn("h-1.5 w-1.5 rounded-full", styles.dot)}
                    aria-hidden="true"
                  />
                )}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab content */}
      <div className="pt-5" role="tabpanel" id={`tab-panel-${activeTab}`}>
        {activeTab === "visits" && <VisitHistoryTab patientId={patientId} />}
        {activeTab === "prescriptions" && (
          <PrescriptionsTab patientId={patientId} patient={patient} />
        )}
        {activeTab === "inpatient" && (
          <InpatientRecordsTab patientId={patientId} patient={patient} />
        )}
        {activeTab === "labs" && <LabRecordsTab patientId={patientId} patient={patient} />}
        {activeTab === "billing" && <BillingTab patientId={patientId} />}
      </div>
    </div>
  )
}

// ─── Patient summary card ─────────────────────────────────────────────────────

function PatientSummaryCard({ patient }: { patient: PatientSummary }) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
      {/* Top band */}
      <div className="px-6 py-5">
        <div className="flex items-start gap-5">
          <Avatar className="h-16 w-16 shrink-0 border-2 border-white shadow-sm">
            <AvatarFallback className="text-lg bg-primary/10 text-primary font-bold">
              {getInitials(patient.fullName)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-xl font-bold text-foreground">
                {patient.fullName}
              </h2>
              <span className="text-xs font-mono bg-primary/10 text-primary px-2.5 py-1 rounded-md font-semibold">
                {patient.patientId}
              </span>
              <Badge variant="outline" className="text-xs">
                {patient.gender}
                {patient.age ? ` • ${patient.age}Y` : ""}
              </Badge>
            </div>
            <div className="flex items-center gap-4 mt-2 flex-wrap">
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                {patient.phone}
              </span>
              {patient.email && (
                <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                  {patient.email}
                </span>
              )}
              {patient.address && (
                <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                  {patient.address.length > 40
                    ? patient.address.slice(0, 40) + "…"
                    : patient.address}
                </span>
              )}
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                Registered {formatDateLong(patient.registeredOn)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-5 divide-x divide-gray-100 border-t border-gray-100">
        <SummaryStatItem
          icon={Activity}
          label="OPD Visits"
          value={String(patient.opdVisits)}
          color="text-blue-600"
          bg="bg-blue-50"
        />
        <SummaryStatItem
          icon={BedDouble}
          label="Inpatient"
          value={
            patient.hasInpatient
              ? patient.inpatientStatus === "DISCHARGED"
                ? "Discharged"
                : (patient.inpatientStatus ?? "Yes")
              : "None"
          }
          color={patient.hasInpatient ? "text-violet-600" : "text-gray-400"}
          bg={patient.hasInpatient ? "bg-violet-50" : "bg-gray-50"}
        />
        <SummaryStatItem
          icon={IndianRupee}
          label="Total Billed"
          value={formatCurrency(patient.totalBilled)}
          color="text-foreground"
          bg="bg-gray-50"
        />
        <SummaryStatItem
          icon={IndianRupee}
          label="Total Paid"
          value={formatCurrency(patient.totalPaid)}
          color="text-emerald-600"
          bg="bg-emerald-50"
        />
        <SummaryStatItem
          icon={Clock}
          label="Outstanding Dues"
          value={formatCurrency(patient.totalDues)}
          color={patient.totalDues > 0 ? "text-red-600" : "text-emerald-600"}
          bg={patient.totalDues > 0 ? "bg-red-50" : "bg-emerald-50"}
          highlight={patient.totalDues > 0}
        />
      </div>
    </div>
  )
}

function SummaryStatItem({
  icon: Icon,
  label,
  value,
  color,
  bg,
  highlight,
}: {
  icon: React.ElementType
  label: string
  value: string
  color: string
  bg: string
  highlight?: boolean
}) {
  return (
    <div className={`px-5 py-4 ${highlight ? "bg-red-50/50" : ""}`}>
      <div className="flex items-center gap-2 mb-1.5">
        <div
          className={`flex h-7 w-7 items-center justify-center rounded-lg ${bg}`}
        >
          <Icon className={`h-3.5 w-3.5 ${color}`} aria-hidden="true" />
        </div>
        <span className="text-xs text-muted-foreground font-medium">{label}</span>
      </div>
      <p className={`text-[0.95rem] font-bold ${color}`}>{value}</p>
    </div>
  )
}

// Keep User imported for patient-search-section usage if needed
// (suppresses unused import lint if it surfaces)
void User
