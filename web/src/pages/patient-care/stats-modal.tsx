/**
 * patient-care/stats-modal.tsx
 *
 * "Today's Stats" modal, opened from the Patients page header's Stats
 * button — matches main's PatientsPage.tsx exactly: 4 count tiles (Total,
 * Registered, In Progress, Visited) + a revenue section (collected today,
 * broken down by payment mode, plus balance due).
 *
 * Counts/revenue are derived from the full day's OPD patient list (see
 * useOpdPatientsStats) using each patient's latest prescription — the same
 * `prescriptions`/`status` fields the OPD table's Doctor/Services/Receipt
 * columns already use.
 */

import { Users, UserPlus, Clock, CheckCircle2, IndianRupee, TrendingUp } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCurrency, formatDateLong } from "@/lib/utils"
import type { Patient } from "./types"

interface StatsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  date: string
  patients: Patient[] | undefined
  isLoading: boolean
}

const IN_PROGRESS_STATUSES = new Set(["IN_WORKUP", "WORKUP_DONE", "WITH_DOCTOR"])
const VISITED_STATUSES = new Set(["VISITED", "COMPLETED", "MEDICAL_ONLY"])

export function StatsModal({ open, onOpenChange, date, patients, isLoading }: StatsModalProps) {
  const data = patients ?? []

  const registered = data.filter((p) => p.status === "REGISTERED").length
  const inProgress = data.filter((p) => p.status != null && IN_PROGRESS_STATUSES.has(p.status)).length
  const visited = data.filter((p) => p.status != null && VISITED_STATUSES.has(p.status)).length

  let totalRevenue = 0
  let totalBalance = 0
  const paymentTotals = new Map<string, number>()
  for (const p of data) {
    for (const rx of p.prescriptions ?? []) {
      totalRevenue += rx.amountPaid ?? 0
      totalBalance += rx.balanceDue ?? 0
      for (const pay of rx.payments ?? []) {
        if (!pay.amount) continue
        const mode = (pay.paymentMode ?? "Other").trim() || "Other"
        paymentTotals.set(mode, (paymentTotals.get(mode) ?? 0) + pay.amount)
      }
    }
  }
  const paymentBreakdown = Array.from(paymentTotals.entries())
    .filter(([, amount]) => amount > 0)
    .sort((a, b) => b[1] - a[1])

  const tiles = [
    { label: "Total Patients", value: data.length, Icon: Users, tile: "bg-muted/40 border-border/60", chip: "bg-foreground/5 text-foreground", valueClass: "text-foreground" },
    { label: "Registered", value: registered, Icon: UserPlus, tile: "bg-primary/5 border-primary/15", chip: "bg-primary/10 text-primary", valueClass: "text-primary" },
    { label: "In Progress", value: inProgress, Icon: Clock, tile: "bg-warning/5 border-warning/15", chip: "bg-warning/10 text-warning", valueClass: "text-warning" },
    { label: "Visited", value: visited, Icon: CheckCircle2, tile: "bg-success/5 border-success/15", chip: "bg-success/10 text-success", valueClass: "text-success" },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Today&apos;s Stats</DialogTitle>
          <DialogDescription>{formatDateLong(date)}</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 mb-5">
              {tiles.map((s) => (
                <div key={s.label} className={`rounded-xl border p-4 ${s.tile}`}>
                  <div className={`inline-flex items-center justify-center h-7 w-7 rounded-lg mb-2.5 ${s.chip}`}>
                    <s.Icon className="h-3.5 w-3.5" aria-hidden />
                  </div>
                  <p className="text-xs font-medium text-muted-foreground mb-1 leading-none">{s.label}</p>
                  <p className={`text-2xl font-semibold tabular-nums tracking-tight ${s.valueClass}`}>
                    {s.value}
                  </p>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-border/60">
              <p className="text-xs font-semibold text-muted-foreground mb-3">Revenue</p>
              <div className="space-y-2">
                <div className="rounded-xl border border-success/15 bg-success/5 px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="inline-flex items-center justify-center h-7 w-7 rounded-lg bg-success/10 text-success">
                        <IndianRupee className="h-3.5 w-3.5" aria-hidden />
                      </div>
                      <span className="text-sm font-medium">Collected Today</span>
                    </div>
                    <span className="text-base font-semibold tabular-nums text-success">
                      {formatCurrency(totalRevenue)}
                    </span>
                  </div>
                  {paymentBreakdown.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 mt-3 pl-[42px]">
                      {paymentBreakdown.map(([mode, amount]) => (
                        <span
                          key={mode}
                          className="inline-flex items-center gap-1.5 rounded-full bg-white border border-success/20 px-2.5 py-1 text-xs"
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-success" />
                          <span className="font-medium">{mode}</span>
                          <span className="font-semibold tabular-nums text-success">
                            {formatCurrency(amount)}
                          </span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between rounded-xl border border-warning/15 bg-warning/5 px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="inline-flex items-center justify-center h-7 w-7 rounded-lg bg-warning/10 text-warning">
                      <TrendingUp className="h-3.5 w-3.5" aria-hidden />
                    </div>
                    <span className="text-sm font-medium">Balance Due</span>
                  </div>
                  <span className="text-base font-semibold tabular-nums text-warning">
                    {formatCurrency(totalBalance)}
                  </span>
                </div>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
