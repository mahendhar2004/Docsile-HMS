/**
 * PatientsPage — thin composition root for the Patients module, matching
 * main's /patients route (src/app/(hospital)/patients/components/
 * PatientsPage.tsx): "Out-Patients" / "In-Patients" tabs. The In-Patients
 * tab here is the lightweight quick-glance view — full admission lives on
 * the separate /inpatients route (InPatientsPage), matching main's
 * separate, fuller /inpatients page.
 *
 * Placement note: main embeds the Out-Patients/In-Patients Tabs switcher
 * directly in the sticky header bar itself (center column of a 3-column
 * layout: title+refresh | tabs | actions), not below it — matched here via
 * PageHeader's `center` slot rather than a separate TabsList row.
 *
 * Permissions:
 *   patients:view    — gate for the Out-Patients tab
 *   inpatients:view  — gate for the In-Patients tab
 *   patients:create  — register new patients
 *   patients:edit    — edit, status update, date move
 *   patients:delete  — delete patients
 *   inpatients:edit     — edit inpatients, status update (this tab)
 *   inpatients:delete   — delete inpatient records (this tab)
 *   inpatients:discharge — discharge action (this tab)
 *   billing:create  — add services
 *   billing:view    — print receipt
 */

import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs"
import { PageHeader } from "@/components/patterns"
import { ErrorState } from "@/components/patterns"
import { usePermissions } from "@/hooks/usePermissions"
import { OpdTab } from "./patient-care/opd-tab"
import { IpdTab } from "./patient-care/ipd-tab"

export default function PatientsPage() {
  const { can } = usePermissions()

  // Resolve all permissions up front (all hooks called unconditionally).
  const canViewOPD = can("patients:view")
  const canViewIPD = can("inpatients:view")
  const canCreatePatient = can("patients:create")
  const canEditPatient = can("patients:edit")
  const canDeletePatient = can("patients:delete")
  const canEditInPatient = can("inpatients:edit")
  const canDeleteInPatient = can("inpatients:delete")
  const canDischargeInPatient = can("inpatients:discharge")
  const canAddServices = can("billing:create")
  const canViewReceipt = can("billing:view")

  // Neither OPD nor IPD is accessible — show access denied.
  if (!canViewOPD && !canViewIPD) {
    return (
      <main>
        <ErrorState
          title="Access denied"
          description="You need patients:view or inpatients:view permission to access this module. Contact your administrator."
        />
      </main>
    )
  }

  // If only one tab is visible, default to that tab.
  const defaultTab = canViewOPD ? "opd" : "ipd"
  const showTabSwitch = canViewOPD && canViewIPD

  return (
    <Tabs defaultValue={defaultTab} variant="underline">
      <main className="space-y-5">
        <PageHeader
          title="Patients"
          description="Registration & management"
          center={
            showTabSwitch && (
              <TabsList>
                <TabsTrigger value="opd">Out-Patients</TabsTrigger>
                <TabsTrigger value="ipd">In-Patients</TabsTrigger>
              </TabsList>
            )
          }
        />

        {canViewOPD && (
          <TabsContent value="opd">
            <OpdTab
              canCreate={canCreatePatient}
              canEdit={canEditPatient}
              canDelete={canDeletePatient}
              canAddServices={canAddServices}
              canViewReceipt={canViewReceipt}
            />
          </TabsContent>
        )}

        {canViewIPD && (
          <TabsContent value="ipd">
            <IpdTab
              canEdit={canEditInPatient}
              canDelete={canDeleteInPatient}
              canDischarge={canDischargeInPatient}
            />
          </TabsContent>
        )}
      </main>
    </Tabs>
  )
}
