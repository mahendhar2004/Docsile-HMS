/**
 * PatientCarePage — thin composition root for the patient-care module.
 *
 * Renders an OPD/IPD tabbed view. Each tab is a self-contained module with
 * its own state, data fetching, and action dialogs.
 *
 * Permissions:
 *   patients:view    — gate for the OPD tab
 *   inpatients:view  — gate for the IPD tab
 *   patients:create  — register new patients
 *   patients:edit    — edit, status update, date move
 *   patients:delete  — delete patients
 *   inpatients:create   — admit patients
 *   inpatients:edit     — edit inpatients, status update
 *   inpatients:delete   — delete inpatient records
 *   inpatients:discharge — discharge action
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

export default function PatientCarePage() {
  const { can } = usePermissions()

  // Resolve all permissions up front (all hooks called unconditionally).
  const canViewOPD = can("patients:view")
  const canViewIPD = can("inpatients:view")
  const canCreatePatient = can("patients:create")
  const canEditPatient = can("patients:edit")
  const canDeletePatient = can("patients:delete")
  const canCreateInPatient = can("inpatients:create")
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

  return (
    <main className="space-y-5">
      <PageHeader
        title="Patient Care"
        description="OPD registrations and in-patient admissions."
      />

      <Tabs defaultValue={defaultTab} variant="underline">
        <TabsList>
          {canViewOPD && (
            <TabsTrigger value="opd">OPD Patients</TabsTrigger>
          )}
          {canViewIPD && (
            <TabsTrigger value="ipd">In-Patients</TabsTrigger>
          )}
        </TabsList>

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
              canCreate={canCreateInPatient}
              canEdit={canEditInPatient}
              canDelete={canDeleteInPatient}
              canDischarge={canDischargeInPatient}
            />
          </TabsContent>
        )}
      </Tabs>
    </main>
  )
}
