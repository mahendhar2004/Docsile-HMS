/**
 * SettingsPage — placeholder.
 *
 * Phase 7 TODO: Implement settings module UI (33 endpoints):
 * - Service templates CRUD (/settings/service-templates)
 * - Hospital profile (GET/PATCH /settings/hospital-profile)
 * - Print config (GET/PATCH /settings/print-config)
 * - Nav style (PATCH /settings/nav-style)
 * - Prescription templates CRUD (/settings/prescription-templates)
 * - Inpatient templates CRUD (/settings/inpatient-templates)
 * - Packages CRUD (/settings/packages)
 * - Surgeries CRUD (/settings/surgeries)
 * - Discharges CRUD (/settings/discharges)
 * - Medicine master CRUD (/settings/medicine-master)
 * Permissions: settings:view, settings:edit
 */
export default function SettingsPage() {
  return (
    <main className="p-6">
      <h1 className="text-xl font-semibold text-foreground">Settings</h1>
      <p className="text-sm text-muted-foreground mt-1">
        Phase 7 TODO: Hospital configuration, service templates, print settings,
        prescription templates, and master data management.
      </p>
    </main>
  )
}
