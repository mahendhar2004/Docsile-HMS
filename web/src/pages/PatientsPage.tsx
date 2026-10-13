/**
 * PatientsPage — composition root for the Patients module, matching main's
 * /patients route (src/app/(hospital)/patients/components/PatientsPage.tsx):
 * "Out-Patients" / "In-Patients" tabs. The In-Patients tab here is the
 * lightweight quick-glance view — full admission lives on the separate
 * /inpatients route (InPatientsPage), matching main's separate fuller page.
 *
 * Header actions match main's exact placement (previously these lived
 * inside the OPD tab's own toolbar, or were missing entirely):
 *   - Refresh (whichever tab is active — via a forwarded ref per tab)
 *   - Stats — unconditional on both tabs, matching main exactly (main's own
 *     Stats modal is OPD-scoped regardless of which tab is active too, so
 *     this isn't a fabricated behavior, just main's own quirk preserved)
 *   - Ask Sitha (toggles the same global panel every page's header button
 *     shares, via useAiContextStore)
 *   - Add Patient — unconditional on both tabs (gated per-tab by
 *     patients:create / inpatients:create, matching main exactly); opens
 *     OPD's Register dialog inline, or navigates to /inpatients for IPD
 *     (that page owns the real admission flow — an already-established
 *     decision not to duplicate it here, main itself opens the same modal
 *     inline for both, which this doesn't replicate 1:1, but the button's
 *     constant presence — the part that was actually causing a visible
 *     layout shift between tabs — now matches)
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

import { useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { BarChart2, Plus, Sparkles } from "lucide-react"
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/patterns"
import { ErrorState } from "@/components/patterns"
import { usePermissions } from "@/hooks/usePermissions"
import { useAiContextStore } from "@/store/ai-context"
import { OpdTab, type OpdTabHandle } from "./patient-care/opd-tab"
import { IpdTab, type IpdTabHandle } from "./patient-care/ipd-tab"
import { useOpdPatientsStats } from "./patient-care/hooks"
import { StatsModal } from "./patient-care/stats-modal"
import { toLocalDateISO } from "@/lib/utils"

export default function PatientsPage() {
  const { can } = usePermissions()
  const navigate = useNavigate()
  const toggleSitha = useAiContextStore((s) => s.toggleOpen)
  const sithaOpen = useAiContextStore((s) => s.open)

  // Resolve all permissions up front (all hooks called unconditionally).
  const canViewOPD = can("patients:view")
  const canViewIPD = can("inpatients:view")
  const canCreatePatient = can("patients:create")
  const canCreateInPatient = can("inpatients:create")
  const canEditPatient = can("patients:edit")
  const canDeletePatient = can("patients:delete")
  const canEditInPatient = can("inpatients:edit")
  const canDeleteInPatient = can("inpatients:delete")
  const canDischargeInPatient = can("inpatients:discharge")
  const canAddServices = can("billing:create")
  const canViewReceipt = can("billing:view")

  const [activeTab, setActiveTab] = useState<"opd" | "ipd">(canViewOPD ? "opd" : "ipd")
  const [viewDate, setViewDate] = useState(() => new Date())
  const [showStats, setShowStats] = useState(false)

  const opdRef = useRef<OpdTabHandle>(null)
  const ipdRef = useRef<IpdTabHandle>(null)

  const dateStr = toLocalDateISO(viewDate)
  const statsQuery = useOpdPatientsStats(dateStr, showStats)

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

  const showTabSwitch = canViewOPD && canViewIPD

  function handleRefresh() {
    if (activeTab === "opd") opdRef.current?.refetch()
    else ipdRef.current?.refetch()
  }

  return (
    <Tabs
      value={activeTab}
      onValueChange={(v) => setActiveTab(v as "opd" | "ipd")}
      variant="underline"
    >
      <main className="space-y-5">
        <PageHeader
          title="Patients"
          description="Registration & management"
          onRefresh={handleRefresh}
          center={
            showTabSwitch && (
              <TabsList>
                <TabsTrigger value="opd">Out-Patients</TabsTrigger>
                <TabsTrigger value="ipd">In-Patients</TabsTrigger>
              </TabsList>
            )
          }
          actions={
            <>
              {/* Stats and Add Patient are unconditional on both tabs in main
                  (main's own Stats modal is OPD-scoped regardless of which
                  tab is active too) — previously gated to OPD only here,
                  which caused the header to visibly shrink/shift on every
                  tab switch. */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowStats(true)}
                aria-label="View today's stats"
              >
                <BarChart2 className="h-3.5 w-3.5 mr-1.5" aria-hidden />
                Stats
              </Button>

              <Button
                variant={sithaOpen ? "primary" : "outline"}
                size="sm"
                onClick={toggleSitha}
                aria-label="Ask Sitha AI"
              >
                <Sparkles className="h-3.5 w-3.5 mr-1.5" aria-hidden />
                {sithaOpen ? "Hide Sitha" : "Ask Sitha"}
              </Button>

              {(activeTab === "opd" ? canCreatePatient : canCreateInPatient) && (
                <Button
                  size="sm"
                  onClick={() => {
                    if (activeTab === "opd") opdRef.current?.openRegister()
                    else navigate("/inpatients")
                  }}
                >
                  <Plus className="h-4 w-4 mr-1.5" aria-hidden />
                  Add Patient
                </Button>
              )}
            </>
          }
        />

        {canViewOPD && (
          <TabsContent value="opd">
            <OpdTab
              ref={opdRef}
              canCreate={canCreatePatient}
              canEdit={canEditPatient}
              canDelete={canDeletePatient}
              canAddServices={canAddServices}
              canViewReceipt={canViewReceipt}
              viewDate={viewDate}
              onViewDateChange={setViewDate}
              onOpenSettings={() => navigate("/settings")}
            />
          </TabsContent>
        )}

        {canViewIPD && (
          <TabsContent value="ipd">
            <IpdTab
              ref={ipdRef}
              canEdit={canEditInPatient}
              canDelete={canDeleteInPatient}
              canDischarge={canDischargeInPatient}
            />
          </TabsContent>
        )}
      </main>

      <StatsModal
        open={showStats}
        onOpenChange={setShowStats}
        date={dateStr}
        patients={statsQuery.data}
        isLoading={statsQuery.isLoading}
      />
    </Tabs>
  )
}
