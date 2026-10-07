/**
 * labs/billing-tab.tsx
 *
 * Combined "Lab Billing & History" tab, matching main's single
 * LabBillingTab (src/app/(hospital)/labs/components/LabBillingTab.tsx) —
 * bill generation and the pending-investigations queue stacked under one
 * tab, rather than two separate top-level tabs. Each section (BillsTab,
 * PendingTab) is reused as-is, just composed together here.
 */

import { BillsTab } from "./bills-tab"
import { PendingTab } from "./pending-tab"

export function BillingTab() {
  return (
    <div className="space-y-8">
      <BillsTab />

      <section aria-label="Pending investigations">
        <h2 className="text-sm font-semibold text-[var(--color-foreground)] mb-3">
          Pending
        </h2>
        <PendingTab />
      </section>
    </div>
  )
}
