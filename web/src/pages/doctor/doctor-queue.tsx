/**
 * doctor/doctor-queue.tsx
 *
 * Today's OPD queue visible to the doctor. Matches main's actual table
 * structure (src/app/(hospital)/doctor/components/DoctorPage.tsx) — a real
 * data table, not a card list. Main's table supports 29 user-customizable
 * columns persisted server-side (updateUserPreferences({ doctorColumns })) —
 * that full customization system needs a new backend preference endpoint
 * this app doesn't have, so the column-customizer popover is not ported;
 * this shows a fixed set matching main's actual DEFAULT_COLUMNS instead:
 * Token #, Patient ID, Name, Age/Gender, Phone, Doctor, Services, Total,
 * Status, Print (plus Type/Appointment, kept from before — harmless extra
 * info, not wrong, just not in main's default set).
 *
 * Doctor/Services/Total/Print were previously left out on the mistaken
 * assumption that GET /doctor/queue doesn't return billing/doctor-name data
 * — it actually does: supabase/functions/doctor/repository.ts's getQueue()
 * selects the full Prescription row (`Prescription(*, items:InvoiceItem(*))`)
 * and labBills, so this data has been available in the API response the
 * whole time, just untyped/unrendered. Fixed.
 */

import { useRef, useState } from "react"
import { Loader2, Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/sonner"
import { ErrorState, EmptyState, DataTable } from "@/components/patterns"
import type { ColumnDef } from "@/components/patterns"
import { apiClient } from "@/lib/api-client"
import { cn, calculateAge, formatCurrency } from "@/lib/utils"
import { printReceiptsHtml } from "@/lib/print-receipts"
import { useDefaultPrintConfig } from "@/pages/settings/hooks"
import { QuickPrintRenderer } from "@/components/receipts/quick-print-renderer"
import type { PatientReceiptData } from "@/pages/patient-care/types"
import type { DoctorQueuePatient } from "./types"

// Main's DoctorPage.tsx defines its own LOCAL statusConfig for this one
// table, deliberately different from the generic Patient-status labels used
// elsewhere (OPD list, patient-detail page): it reframes status as "which
// station is this patient waiting at" (Optometrist vs Doctor) — the
// actionable question for a doctor glancing at their queue — rather than the
// generic workflow-state label. Porting it here as a scoped, file-local
// override (not a change to the shared StatusPill) to match main's actual
// code structure and avoid affecting every other page that uses Patient
// statuses.
const QUEUE_STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  REGISTERED:   { label: "Optometrist",  bg: "bg-destructive/10",  text: "text-destructive",        dot: "bg-destructive" },
  IN_WORKUP:    { label: "Optometrist",  bg: "bg-destructive/10",  text: "text-destructive",        dot: "bg-destructive" },
  WORKUP_DONE:  { label: "Doctor",       bg: "bg-warning-soft",    text: "text-warning-soft-foreground", dot: "bg-warning" },
  WITH_DOCTOR:  { label: "Doctor",       bg: "bg-warning-soft",    text: "text-warning-soft-foreground", dot: "bg-warning" },
  VISITED:      { label: "Visited",      bg: "bg-neutral-soft",    text: "text-neutral-soft-foreground", dot: "bg-neutral" },
  COMPLETED:    { label: "Completed",    bg: "bg-success-soft",    text: "text-success-soft-foreground", dot: "bg-success" },
  MEDICAL_ONLY: { label: "Medical Only", bg: "bg-info-soft",       text: "text-info-soft-foreground",    dot: "bg-info" },
}

function QueueStatusPill({ status }: { status: string }) {
  const sc = QUEUE_STATUS_CONFIG[status] ?? {
    label: status, bg: "bg-neutral-soft", text: "text-neutral-soft-foreground", dot: "bg-neutral",
  }
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap", sc.bg, sc.text)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", sc.dot)} />
      {sc.label}
    </span>
  )
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface DoctorQueueProps {
  patients: DoctorQueuePatient[]
  loading: boolean
  error: Error | null
  onRefetch: () => void
  selectedId: string | null
  onSelectPatient: (id: string) => void
  /** GET /doctor/patients/:id/receipt requires billing:view — hide Print column without it. */
  canViewBilling: boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(dateStr: string): string {
  try {
    return new Intl.DateTimeFormat("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Kolkata",
    }).format(new Date(dateStr))
  } catch {
    return "—"
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DoctorQueue({
  patients,
  loading,
  error,
  onRefetch,
  selectedId,
  onSelectPatient,
  canViewBilling,
}: DoctorQueueProps) {
  const { items: defaultPrintItems } = useDefaultPrintConfig()
  const defaultPrintConfigured = defaultPrintItems.length > 0
  const [quickPrinting, setQuickPrinting] = useState<string | null>(null)
  const [quickPrintData, setQuickPrintData] = useState<PatientReceiptData | null>(null)
  const quickPrintRef = useRef<HTMLDivElement>(null)

  // Same quick-print mechanism as consultation-view.tsx's handlePrintReceipt,
  // parameterized per queue row instead of the single open patient.
  async function handleQuickPrint(p: DoctorQueuePatient) {
    if (!defaultPrintConfigured || quickPrinting) return
    const fullName = `${p.firstName} ${p.lastName}`.trim()
    setQuickPrinting(p.patientId)
    try {
      const { data } = await apiClient.get<PatientReceiptData>(
        `/doctor/patients/${p.patientId}/receipt`,
      )
      setQuickPrintData(data)
      setTimeout(() => {
        const html = quickPrintRef.current?.innerHTML ?? ""
        if (!html) {
          toast.error("Nothing to print")
          return
        }
        printReceiptsHtml({ title: `Print - ${fullName}`, contentHtml: html })
        setTimeout(() => setQuickPrintData(null), 1500)
      }, 50)
    } catch {
      toast.error("Failed to load receipt data")
    } finally {
      setQuickPrinting(null)
    }
  }

  // Card container — matches main's exact queue-table wrapper (`rounded-xl
  // border border-border/60 bg-white overflow-hidden shadow-sm`, same card
  // treatment on every state). Previously only the loading skeleton had a
  // (partial) wrapper; error/empty/data sat flat against the page
  // background with no visual separation, unlike every other table in the
  // app (which goes through the shared PaginatedDataTable, which already
  // supplies this wrapper).
  const cardClass = "rounded-[var(--radius-lg)] bg-[var(--color-card)] overflow-hidden shadow-[var(--shadow-card)]"

  if (loading) {
    return (
      <div className={cardClass} aria-label="Loading doctor queue">
        <div className="bg-muted/50 px-4 py-2.5 border-b border-border flex gap-8">
          {Array.from({ length: 6 }).map((_, i) => (
            // eslint-disable-next-line react/no-array-index-key
            <div key={i} className="h-3 w-20 bg-muted animate-pulse rounded" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={cardClass}>
        <ErrorState title="Could not load queue" error={error} onRetry={onRefetch} />
      </div>
    )
  }

  if (patients.length === 0) {
    return (
      <div className={cardClass}>
        <EmptyState
          title="No patients yet"
          description="Today's OPD queue is empty. Patients will appear as they register."
        />
      </div>
    )
  }

  const columns: ColumnDef<DoctorQueuePatient>[] = [
    {
      key: "sno",
      header: "Token #",
      align: "center",
      cell: (_p, i) => (
        <span className="inline-flex items-center justify-center h-6 min-w-7 rounded bg-primary/10 border border-primary/20 border-dashed text-xs font-bold text-primary tabular-nums px-1.5">
          {i + 1}
        </span>
      ),
    },
    {
      key: "patientId",
      header: "Patient ID",
      cell: (p) => <span className="font-mono text-xs">{p.patientId}</span>,
    },
    {
      key: "name",
      header: "Name",
      cell: (p) => (
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{`${p.firstName} ${p.lastName}`.trim()}</span>
          {p.eyeReadings.length > 0 && (
            <span className="text-xs text-success-soft-foreground" title="Eye reading done" aria-label="Eye reading done">
              Eye ✓
            </span>
          )}
          {p.prescriptions.length > 0 && (
            <span className="text-xs text-primary" title="Prescription exists" aria-label="Prescription exists">
              Rx ✓
            </span>
          )}
        </div>
      ),
    },
    {
      key: "age",
      header: "Age / Gender",
      cell: (p) => {
        const age = p.age ?? (p.dateOfBirth ? calculateAge(p.dateOfBirth) : null)
        if (!age) return <span className="text-muted-foreground">—</span>
        const genderShort = p.gender === "MALE" ? "M" : p.gender === "FEMALE" ? "F" : "O"
        return <span className="text-sm text-foreground whitespace-nowrap">{age}y · {genderShort}</span>
      },
    },
    { key: "phone", header: "Phone", cell: (p) => <span className="text-sm text-muted-foreground">{p.phone}</span> },
    { key: "patientType", header: "Type", cell: (p) => <span className="text-sm text-muted-foreground">{p.patientType}</span> },
    { key: "appointmentDate", header: "Appointment", cell: (p) => <span className="text-sm text-muted-foreground">{formatTime(p.appointmentDate)}</span> },
    {
      key: "doctor",
      header: "Doctor",
      // Today's consulting doctor (prescription.doctorName) falls back to the
      // patient's assigned-at-registration doctor — matches main's
      // `rx?.doctorName ?? patient.doctorName ?? null`.
      cell: (p) => {
        const rx = p.prescriptions[0]
        const name = rx?.doctorName ?? p.doctorName ?? null
        return name ? <span className="text-sm text-foreground">{name}</span> : <span className="text-muted-foreground">—</span>
      },
    },
    {
      key: "service",
      header: "Services",
      cell: (p) => {
        const names = p.prescriptions[0]?.items?.map((it) => it.description) ?? []
        if (names.length === 0) return <span className="text-muted-foreground">—</span>
        return (
          <div className="inline-flex items-center gap-1 max-w-[200px]" title={names.join(", ")}>
            <span className="inline-flex items-center h-6 px-2 rounded-md bg-muted/70 border border-border/40 text-[12px] font-medium text-foreground truncate">
              {names[0]}
            </span>
            {names.length > 1 && (
              <span className="inline-flex items-center justify-center h-6 px-1.5 rounded-md bg-muted/70 border border-border/40 text-[11px] font-semibold text-muted-foreground tabular-nums shrink-0">
                +{names.length - 1}
              </span>
            )}
          </div>
        )
      },
    },
    {
      key: "total",
      header: "Total",
      align: "right",
      cell: (p) => {
        const rx = p.prescriptions[0]
        if (!rx || rx.total === 0) return <span className="text-muted-foreground">—</span>
        if (rx.balanceDue > 0) {
          return <span className="text-sm font-semibold tabular-nums text-destructive">{formatCurrency(rx.total)}</span>
        }
        return <span className="text-sm font-medium tabular-nums text-foreground">{formatCurrency(rx.total)}</span>
      },
    },
    { key: "status", header: "Status", cell: (p) => <QueueStatusPill status={p.status} /> },
    ...(canViewBilling
      ? [
          {
            key: "print",
            header: "",
            cell: (p: DoctorQueuePatient) => (
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 px-0"
                disabled={!defaultPrintConfigured || quickPrinting === p.patientId}
                title={defaultPrintConfigured ? "Quick print (default receipts)" : "Configure defaults in Settings → Print Defaults"}
                aria-label={`Quick print receipt for ${p.firstName} ${p.lastName}`.trim()}
                onClick={(e) => {
                  e.stopPropagation()
                  void handleQuickPrint(p)
                }}
              >
                {quickPrinting === p.patientId ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Printer className="h-4 w-4" aria-hidden="true" />
                )}
              </Button>
            ),
          } satisfies ColumnDef<DoctorQueuePatient>,
        ]
      : []),
  ]

  return (
    <>
      <div className={cardClass}>
        <DataTable<DoctorQueuePatient>
          aria-label="Doctor's patient queue"
          data={patients}
          columns={columns}
          onRowClick={(p) => onSelectPatient(p.patientId)}
          rowClassName={(p) => (p.patientId === selectedId ? "bg-primary/8" : undefined)}
        />
      </div>
      {quickPrintData && (
        <QuickPrintRenderer ref={quickPrintRef} data={quickPrintData} items={defaultPrintItems} />
      )}
    </>
  )
}
