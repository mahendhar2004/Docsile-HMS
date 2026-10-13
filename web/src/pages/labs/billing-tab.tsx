/**
 * labs/billing-tab.tsx
 *
 * Combined "Lab Billing & History" tab, matching main's single
 * LabBillingTab (src/app/(hospital)/labs/components/LabBillingTab.tsx) —
 * bill generation and the pending-investigations queue stacked under one
 * tab, rather than two separate top-level tabs. Each section (BillsTab,
 * PendingTab) is reused as-is, just composed together here.
 *
 * Note: main's exact vertical order is Generate Bills -> Pending
 * Investigations -> Lab Bills History (collapsible), but BillsTab already
 * bundles Generate Bills + History together internally as one component —
 * splitting it apart just to insert Pending in the middle wasn't worth the
 * structural cost given everything else still being audited. Order here
 * is Bills (Generate+History) then Pending.
 *
 * No extra wrapper heading here — PendingTab already renders its own
 * "Pending Investigations" header row (icon + live count badge + date
 * filter + refresh, inside its own card), matching main's actual
 * "PENDING INVESTIGATIONS PANEL" exactly. An earlier version of this file
 * wrapped it in a second <section> with its own plain heading, producing
 * a visible duplicate "Pending Investigations" label stacked on screen.
 */

import { BillsTab } from "./bills-tab"
import { PendingTab } from "./pending-tab"

export function BillingTab() {
  return (
    <div className="space-y-8">
      <BillsTab />
      <PendingTab />
    </div>
  )
}
