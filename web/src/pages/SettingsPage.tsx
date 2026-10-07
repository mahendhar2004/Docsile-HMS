/**
 * SettingsPage — Hospital configurations, service templates, print settings,
 * prescription templates, and master data management.
 *
 * Endpoints (33 total across 10 sub-scopes):
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
 *
 * Permissions (verified from src/lib/permissions.ts):
 * - settings:view — all reads; page gate
 * - settings:edit — all writes
 */

import { useState } from "react"
import { cn } from "@/lib/utils"
import { PageHeader } from "@/components/patterns"
import { ErrorState } from "@/components/patterns"
import { usePermissions } from "@/hooks/usePermissions"

// Section imports
import { ServiceTemplatesSection } from "./settings/service-templates-section"
import { HospitalProfileSection } from "./settings/hospital-profile-section"
import { PrintConfigSection } from "./settings/print-config-section"
import { PrescriptionTemplatesSection } from "./settings/prescription-templates-section"
import { InpatientTemplatesSection } from "./settings/inpatient-templates-section"
import { PackagesSection } from "./settings/packages-section"
import { SurgeriesSection } from "./settings/surgeries-section"
import { DischargesSection } from "./settings/discharges-section"
import { MedicineMasterSection } from "./settings/medicine-master-section"

// ─── Section registry ─────────────────────────────────────────────────────────

type SectionId =
  | "services"
  | "prescriptions"
  | "medicines"
  | "inpatient-templates"
  | "packages"
  | "surgeries"
  | "discharges"
  | "hospital"
  | "print-config"

interface SectionEntry {
  id: SectionId
  label: string
  group: "Templates" | "Master Data" | "Hospital Setup"
}

const SECTIONS: SectionEntry[] = [
  { id: "services",             label: "Service Templates",       group: "Templates" },
  { id: "prescriptions",        label: "Prescription Templates",  group: "Templates" },
  { id: "inpatient-templates",  label: "Inpatient Templates",     group: "Templates" },
  { id: "packages",             label: "IPD Packages",            group: "Templates" },
  { id: "surgeries",            label: "Predefined Surgeries",    group: "Templates" },
  { id: "discharges",           label: "Discharge Templates",     group: "Templates" },
  { id: "medicines",            label: "Medicine Master",         group: "Master Data" },
  { id: "hospital",             label: "Hospital Profile",        group: "Hospital Setup" },
  { id: "print-config",         label: "Print Defaults",          group: "Hospital Setup" },
]

const GROUPS = ["Templates", "Master Data", "Hospital Setup"] as const

// ─── SettingsPage ─────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { can } = usePermissions()
  const canView = can("settings:view")
  const canEdit = can("settings:edit")

  const [activeSection, setActiveSection] = useState<SectionId>("services")

  // All hooks must be called unconditionally — permission gate comes after.

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
        title="Settings"
        description="Hospital configuration, service templates, print settings, prescription templates, and master data management."
      />

      <div className="flex gap-6 min-h-[600px]">
        {/* ── Left sidebar nav ─────────────────────────────────────────────── */}
        <nav
          className="w-52 shrink-0 space-y-1"
          aria-label="Settings sections"
        >
          {GROUPS.map((group) => {
            const groupSections = SECTIONS.filter((s) => s.group === group)
            return (
              <div key={group} className="mb-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-1">
                  {group}
                </p>
                {groupSections.map((section) => (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => setActiveSection(section.id)}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      activeSection === section.id
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                    aria-current={activeSection === section.id ? "page" : undefined}
                  >
                    {section.label}
                  </button>
                ))}
              </div>
            )
          })}
        </nav>

        {/* ── Main content area ─────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0">
          {activeSection === "services" && (
            <ServiceTemplatesSection canEdit={canEdit} />
          )}
          {activeSection === "prescriptions" && (
            <PrescriptionTemplatesSection canEdit={canEdit} />
          )}
          {activeSection === "inpatient-templates" && (
            <InpatientTemplatesSection canEdit={canEdit} />
          )}
          {activeSection === "packages" && (
            <PackagesSection canEdit={canEdit} />
          )}
          {activeSection === "surgeries" && (
            <SurgeriesSection canEdit={canEdit} />
          )}
          {activeSection === "discharges" && (
            <DischargesSection canEdit={canEdit} />
          )}
          {activeSection === "medicines" && (
            <MedicineMasterSection canEdit={canEdit} />
          )}
          {activeSection === "hospital" && (
            <HospitalProfileSection canEdit={canEdit} />
          )}
          {activeSection === "print-config" && (
            <PrintConfigSection canEdit={canEdit} />
          )}
        </div>
      </div>
    </main>
  )
}
