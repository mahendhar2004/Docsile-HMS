/**
 * labs/config-tab.tsx
 *
 * "Lab Configuration" tab, matching main's single LabConfigTab
 * (src/app/(hospital)/labs/components/LabConfigTab.tsx) — just the labs
 * table. Investigation master management isn't a separate section in
 * main at all; it lives entirely inside the per-lab "Configure" action
 * (LabsTab's own InvestigationAssignmentForm, which already has its own
 * "Add Investigation" dialog — matches main's LabInvestigationConfig
 * exactly). A separate standalone Investigations section was removed
 * during the placement audit — it duplicated that capability and had no
 * counterpart in main at all (main's InvestigationMaster has no
 * update/delete action either, only list + create, same as what
 * InvestigationAssignmentForm already provides).
 */

import { LabsTab } from "./labs-tab"

export function ConfigTab() {
  return <LabsTab />
}
