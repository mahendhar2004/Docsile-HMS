/**
 * DataExportPage — standalone bulk data export page, matching main's
 * separate /data route (src/app/(hospital)/data/page.tsx +
 * components/DataExportPage.tsx) — was nested inside Reports in the
 * migration, but main has no export concept inside Reports at all; it's
 * always its own page.
 *
 * 9 export types (Patients, Prescriptions, Eye Readings, In-Patients,
 * Insurance, Lab Bills, Pharmacy Bills, Optical Bills, Expenses), each
 * with column-level CSV/Excel export, search, and date range — all
 * already fully implemented in reports/export-section.tsx (its column
 * config comment already cross-references main's DataExportPage.tsx
 * TAB_CONFIG, confirming prior parity work), just moved to its own page.
 *
 * Endpoints:
 *   GET /reports/exports/patients
 *   GET /reports/exports/prescriptions
 *   GET /reports/exports/eye-readings
 *   GET /reports/exports/inpatients
 *   GET /reports/exports/insurance-claims
 *   GET /reports/exports/lab-bills
 *   GET /reports/exports/pharmacy-bills
 *   GET /reports/exports/optical-bills
 *   GET /reports/exports/expenses
 *
 * Permission: data:export
 */

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { PageHeader, ErrorState } from "@/components/patterns"
import { usePermissions } from "@/hooks/usePermissions"
import { ExportSection } from "./reports/export-section"

export default function DataExportPage() {
  const { can } = usePermissions()
  const canExport = can("data:export")

  const [counts, setCounts] = useState<{ total: number; selected: number }>({
    total: 0,
    selected: 0,
  })

  if (!canExport) {
    return (
      <main>
        <ErrorState
          title="Access denied"
          description="You need the data:export permission to access this page. Contact your administrator."
        />
      </main>
    )
  }

  return (
    <main className="space-y-6">
      <PageHeader
        title="Data Export"
        description="Select, filter and export hospital data in CSV or Excel format"
        actions={
          <div className="flex items-center gap-2">
            {counts.selected > 0 && (
              <Badge variant="secondary" className="text-xs">
                {counts.selected} selected
              </Badge>
            )}
            <Badge variant="outline" className="text-xs">
              {counts.total} records
            </Badge>
          </div>
        }
      />
      <ExportSection onCountsChange={setCounts} />
    </main>
  )
}
