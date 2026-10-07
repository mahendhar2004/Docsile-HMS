/**
 * labs/config-tab.tsx
 *
 * Combined "Lab Configuration" tab, matching main's single LabConfigTab
 * (src/app/(hospital)/labs/components/LabConfigTab.tsx) — lab CRUD and
 * investigation master management stacked under one tab, rather than two
 * separate top-level tabs. Each section (LabsTab, InvestigationsTab) is
 * reused as-is, just composed together here.
 */

import { LabsTab } from "./labs-tab"
import { InvestigationsTab } from "./investigations-tab"

export function ConfigTab() {
  return (
    <div className="space-y-8">
      <section aria-label="Labs">
        <h2 className="text-sm font-semibold text-[var(--color-foreground)] mb-3">
          Labs
        </h2>
        <LabsTab />
      </section>

      <section aria-label="Investigations">
        <h2 className="text-sm font-semibold text-[var(--color-foreground)] mb-3">
          Investigations
        </h2>
        <InvestigationsTab />
      </section>
    </div>
  )
}
