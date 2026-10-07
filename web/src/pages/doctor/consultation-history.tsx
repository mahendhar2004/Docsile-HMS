/**
 * doctor/consultation-history.tsx
 *
 * Small presentational pieces for the consultation panel's History sidebar
 * (today's AR reading + past prescriptions). Ported from main's inline
 * ARReadingCompact / ARReadingSummary / PrescriptionHistoryCard functions
 * (src/app/(hospital)/doctor/components/DoctorPage.tsx) into their own file,
 * since this codebase splits page modules into small files rather than one
 * large page component.
 *
 * Field names match PrescriptionRecord/EyeReadingRecord exactly — medicines,
 * investigations, and autoRefractometer are JSON-encoded strings from the
 * backend, parsed defensively here same as main does.
 */

import { formatDate } from "@/lib/utils"
import type { MedicineItem, InvestigationItem } from "./types"

// ─── AR reading (auto refractometer) ───────────────────────────────────────────

export function ARReadingCompact({ arJson, label }: { arJson: string; label?: string }) {
  let ar: {
    re?: { sph?: string; cyl?: string; axis?: string; va?: string }
    le?: { sph?: string; cyl?: string; axis?: string; va?: string }
    pd?: string
  }
  try {
    ar = JSON.parse(arJson)
  } catch {
    return null
  }

  const hasRE = ar.re && (ar.re.sph || ar.re.cyl || ar.re.axis || ar.re.va)
  const hasLE = ar.le && (ar.le.sph || ar.le.cyl || ar.le.axis || ar.le.va)
  if (!hasRE && !hasLE) return null

  return (
    <div className="text-[11px] leading-relaxed">
      {label && (
        <p className="text-[10px] font-semibold text-violet-600 uppercase tracking-wider mb-1">
          {label}
        </p>
      )}
      <table className="w-full">
        <thead>
          <tr className="text-muted-foreground/70">
            <th className="text-left font-medium w-6" />
            <th className="text-center font-medium">SPH</th>
            <th className="text-center font-medium">CYL</th>
            <th className="text-center font-medium">Axis</th>
            <th className="text-center font-medium">VA</th>
          </tr>
        </thead>
        <tbody className="font-medium">
          {hasRE && (
            <tr>
              <td className="font-semibold text-violet-600">RE</td>
              <td className="text-center tabular-nums">{ar.re?.sph || "-"}</td>
              <td className="text-center tabular-nums">{ar.re?.cyl || "-"}</td>
              <td className="text-center tabular-nums">{ar.re?.axis || "-"}</td>
              <td className="text-center tabular-nums">{ar.re?.va || "-"}</td>
            </tr>
          )}
          {hasLE && (
            <tr>
              <td className="font-semibold text-violet-600">LE</td>
              <td className="text-center tabular-nums">{ar.le?.sph || "-"}</td>
              <td className="text-center tabular-nums">{ar.le?.cyl || "-"}</td>
              <td className="text-center tabular-nums">{ar.le?.axis || "-"}</td>
              <td className="text-center tabular-nums">{ar.le?.va || "-"}</td>
            </tr>
          )}
        </tbody>
      </table>
      {ar.pd && (
        <p className="text-[10px] text-muted-foreground mt-0.5">
          PD: <span className="font-medium text-foreground">{ar.pd}</span>
        </p>
      )}
    </div>
  )
}

export function ARReadingSummary({ arJson }: { arJson: string }) {
  return (
    <div className="rounded-lg border border-violet-200 bg-violet-50/50 p-2.5">
      <ARReadingCompact arJson={arJson} label="AR Reading (Workup)" />
    </div>
  )
}

// ─── Past prescription card ────────────────────────────────────────────────────

export interface PrescriptionHistoryItem {
  prescriptionDate: string
  doctorName: string | null
  diagnosis: string | null
  presentComplaint: string | null
  previousHistory: string | null
  medicines: string | null
  investigations: string | null
}

export function PrescriptionHistoryCard({ prescription }: { prescription: PrescriptionHistoryItem }) {
  let medicines: MedicineItem[] = []
  try {
    medicines = prescription.medicines ? JSON.parse(prescription.medicines) : []
  } catch {
    /* empty */
  }
  let investigations: InvestigationItem[] = []
  try {
    investigations = prescription.investigations ? JSON.parse(prescription.investigations) : []
  } catch {
    /* empty */
  }

  const hasContent =
    prescription.presentComplaint ||
    prescription.previousHistory ||
    prescription.diagnosis ||
    medicines.length > 0 ||
    investigations.length > 0

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2 bg-muted/40 border-b border-border flex items-center justify-between">
        <span className="text-[11px] font-semibold text-foreground">
          {formatDate(prescription.prescriptionDate)}
        </span>
        {prescription.doctorName && (
          <span className="text-[10px] text-muted-foreground">Dr. {prescription.doctorName}</span>
        )}
      </div>

      {!hasContent ? (
        <div className="px-3 py-3">
          <p className="text-[11px] text-muted-foreground italic">No details recorded</p>
        </div>
      ) : (
        <div className="divide-y divide-border/60">
          {/* Clinical notes block */}
          {(prescription.presentComplaint || prescription.previousHistory || prescription.diagnosis) && (
            <div className="px-3 py-2 space-y-1">
              {prescription.presentComplaint && (
                <div className="flex gap-1.5">
                  <span className="text-[10px] font-semibold text-muted-foreground shrink-0 w-6 pt-px">
                    C/O
                  </span>
                  <span className="text-[11px] text-foreground leading-snug">
                    {prescription.presentComplaint}
                  </span>
                </div>
              )}
              {prescription.previousHistory && (
                <div className="flex gap-1.5">
                  <span className="text-[10px] font-semibold text-muted-foreground shrink-0 w-6 pt-px">
                    Hx
                  </span>
                  <span className="text-[11px] text-foreground leading-snug">
                    {prescription.previousHistory}
                  </span>
                </div>
              )}
              {prescription.diagnosis && (
                <div className="flex gap-1.5">
                  <span className="text-[10px] font-semibold text-amber-600 shrink-0 w-6 pt-px">
                    Dx
                  </span>
                  <span className="text-[11px] font-semibold text-foreground leading-snug">
                    {prescription.diagnosis}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Medicines */}
          {medicines.length > 0 && (
            <div className="px-3 py-2">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                Rx
              </p>
              <div className="space-y-0.5">
                {medicines.slice(0, 5).map((m, i) => (
                  <p key={i} className="text-[11px] leading-snug">
                    <span className="text-foreground">{m.name}</span>
                    {(m.timing || m.days) && (
                      <span className="text-muted-foreground">
                        {m.timing && ` ${m.timing}`}
                        {m.days && ` · ${m.days}d`}
                      </span>
                    )}
                  </p>
                ))}
                {medicines.length > 5 && (
                  <p className="text-[10px] text-muted-foreground">+{medicines.length - 5} more</p>
                )}
              </div>
            </div>
          )}

          {/* Investigations */}
          {investigations.length > 0 && (
            <div className="px-3 py-2">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                Inv
              </p>
              <div className="flex flex-wrap gap-1">
                {investigations.map((inv, i) => (
                  <span
                    key={i}
                    className="text-[10px] px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100"
                  >
                    {inv.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
