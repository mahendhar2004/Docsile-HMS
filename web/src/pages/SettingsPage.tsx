/**
 * SettingsPage — Hospital configurations, matching main's flat tab-bar
 * layout (src/app/(hospital)/settings/components/SettingsPage.tsx) — one
 * row of pill tabs, no grouping, active tab synced to the `?tab=` URL
 * query param, in main's exact order: Service Templates, Prescription
 * Templates, Medicine Templates, IPD Packages, Predefined Surgeries,
 * Discharge Templates, Hospital Profile, Print Defaults.
 *
 * Deviations from main's exact 9-tab set, both backend-contract driven:
 * - No "Inpatient Templates" tab: main's rendered Settings UI has no tab
 *   exposing this either (confirmed: its backend CRUD exists but is only
 *   consumed read-only by InPatientDetailPage's template picker, a feature
 *   this app never built). Kept settings/inpatient-templates-section.tsx
 *   and its hooks in place (unused but harmless, zero other consumers
 *   confirmed via grep) rather than deleting real working code against a
 *   real endpoint, in case a future template-picker feature wants it.
 * - No "Users" tab: main's Users tab is a simpler surface than Staff's
 *   full CRUD, but this app's actual backend contract (.sde/schemas/
 *   openapi.yaml) has no separate /settings/users or /users endpoint at
 *   all — only /staff/members, already exposed via Staff's "Staff
 *   Members" tab. Adding a second tab reusing the same endpoint would be
 *   a redundant surface, not a faithful port of a real main feature.
 *
 * One deliberate ADDITION beyond main's 9 tabs: "Doctors" (explicit user
 * request, not a parity gap — main has no Doctor master entity at all,
 * doctors there are only ever a free-text DropdownOption("doctorName")
 * value). See migration 20260922070000 and settings/doctors-section.tsx.
 *
 * Endpoints (33 total across 10 sub-scopes):
 * - Service templates CRUD (/settings/service-templates)
 * - Hospital profile (GET/PATCH /settings/hospital-profile)
 * - Print config (GET/PATCH /settings/print-config)
 * - Nav style (PATCH /settings/nav-style)
 * - Prescription templates CRUD (/settings/prescription-templates)
 * - Inpatient templates CRUD (/settings/inpatient-templates) — unused, see above
 * - Packages CRUD (/settings/packages)
 * - Surgeries CRUD (/settings/surgeries)
 * - Discharges CRUD (/settings/discharges)
 * - Medicine master CRUD (/settings/medicine-master)
 *
 * Permissions (verified from src/lib/permissions.ts):
 * - settings:view — all reads; page gate
 * - settings:edit — all writes
 */

import { useSearchParams } from "react-router-dom"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { PageHeader, ErrorState } from "@/components/patterns"
import { usePermissions } from "@/hooks/usePermissions"

// Section imports
import { ServiceTemplatesSection } from "./settings/service-templates-section"
import { HospitalProfileSection } from "./settings/hospital-profile-section"
import { PrintConfigSection } from "./settings/print-config-section"
import { PrescriptionTemplatesSection } from "./settings/prescription-templates-section"
import { PackagesSection } from "./settings/packages-section"
import { SurgeriesSection } from "./settings/surgeries-section"
import { DischargesSection } from "./settings/discharges-section"
import { MedicineMasterSection } from "./settings/medicine-master-section"
import { DoctorsSection } from "./settings/doctors-section"

// ─── Section registry — flat, main's exact order (+ "doctors", added) ────────

type SectionId =
  | "services"
  | "prescriptions"
  | "medicines"
  | "doctors"
  | "packages"
  | "surgeries"
  | "discharges"
  | "hospital"
  | "print-defaults"

const SECTIONS: { id: SectionId; label: string }[] = [
  { id: "services",      label: "Service Templates" },
  { id: "prescriptions", label: "Prescription Templates" },
  { id: "medicines",     label: "Medicine Templates" },
  { id: "doctors",       label: "Doctors" },
  { id: "packages",      label: "IPD Packages" },
  { id: "surgeries",     label: "Predefined Surgeries" },
  { id: "discharges",    label: "Discharge Templates" },
  { id: "hospital",      label: "Hospital Profile" },
  { id: "print-defaults", label: "Print Defaults" },
]

const DEFAULT_SECTION: SectionId = "services"

function isSectionId(value: string | null): value is SectionId {
  return SECTIONS.some((s) => s.id === value)
}

// ─── SettingsPage ─────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { can } = usePermissions()
  const canView = can("settings:view")
  const canEdit = can("settings:edit")

  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get("tab")
  const activeSection = isSectionId(tabParam) ? tabParam : DEFAULT_SECTION

  // ── Permission gate ──────────────────────────────────────────────────────────
  if (!canView) {
    return (
      <main>
        <ErrorState
          title="Access denied"
          description="You need the settings:view permission to access configurations. Contact your administrator."
        />
      </main>
    )
  }

  return (
    <main className="space-y-6">
      <PageHeader
        title="Configurations"
        description="Configurations"
      />

      <Tabs
        value={activeSection}
        onValueChange={(v) => setSearchParams({ tab: v }, { replace: true })}
      >
        {/* Custom pill styling matching main's exact Settings tab bar
            (rounded-full group, white-active-pill with a primary ring) —
            distinct from this app's default solid-fill active tab, which
            main itself only uses everywhere else, not here. */}
        <div className="mb-6 -mx-1 px-1 overflow-x-auto">
          <TabsList
            aria-label="Settings sections"
            className="inline-flex h-auto items-center gap-1 rounded-full border border-border/60 bg-muted/40 p-1 shadow-sm backdrop-blur-sm w-auto"
          >
            {SECTIONS.map((s) => (
              <TabsTrigger
                key={s.id}
                value={s.id}
                className="whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium text-muted-foreground transition-all hover:text-foreground hover:bg-white/60 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-primary/15"
              >
                {s.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="services">
          <ServiceTemplatesSection canEdit={canEdit} />
        </TabsContent>
        <TabsContent value="prescriptions">
          <PrescriptionTemplatesSection canEdit={canEdit} />
        </TabsContent>
        <TabsContent value="medicines">
          <MedicineMasterSection canEdit={canEdit} />
        </TabsContent>
        <TabsContent value="doctors">
          <DoctorsSection canEdit={canEdit} />
        </TabsContent>
        <TabsContent value="packages">
          <PackagesSection canEdit={canEdit} />
        </TabsContent>
        <TabsContent value="surgeries">
          <SurgeriesSection canEdit={canEdit} />
        </TabsContent>
        <TabsContent value="discharges">
          <DischargesSection canEdit={canEdit} />
        </TabsContent>
        <TabsContent value="hospital">
          <HospitalProfileSection canEdit={canEdit} />
        </TabsContent>
        <TabsContent value="print-defaults">
          <PrintConfigSection canEdit={canEdit} />
        </TabsContent>
      </Tabs>
    </main>
  )
}
