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
 * is Bills (Generate+History) then Pending; heading text matches main's
 * exact "Pending Investigations" label.
 */

import { BillsTab } from "./bills-tab"
import { PendingTab } from "./pending-tab"

export function BillingTab() {
  return (
    <div className="space-y-8">
      <BillsTab />

      <section aria-label="Pending investigations" className="rounded-xl border border-border/60 bg-white overflow-hidden p-4">
        <h2 className="text-sm font-semibold text-foreground mb-3">
          Pending Investigations
        </h2>
        <PendingTab />
      </section>
    </div>
  )
}
