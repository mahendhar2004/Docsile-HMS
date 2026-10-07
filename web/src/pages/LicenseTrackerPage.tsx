/**
 * LicenseTrackerPage — hospital license expiry tracking with document management.
 *
 * Endpoints:
 *   GET    /license-tracker                  → License[]  (licenses:view)
 *   POST   /license-tracker                  → License    (licenses:create)
 *   PATCH  /license-tracker/{id}             → void       (licenses:edit)
 *   DELETE /license-tracker/{id}             → void       (licenses:delete)
 *   PATCH  /license-tracker/{id}/document    → void       (licenses:edit) — saves URL after Storage upload
 *   DELETE /license-tracker/{id}/document    → void       (licenses:edit) — server handles Storage deletion
 *
 * Permissions:
 *   licenses:view   — page gate + list
 *   licenses:create — "Add License" button
 *   licenses:edit   — edit form + document upload/remove
 *   licenses:delete — delete action
 */

import { useRef, useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ErrorState, PageHeader } from "@/components/patterns"
import { usePermissions } from "@/hooks/usePermissions"
import { LicensesList, type LicensesListHandle } from "./license-tracker/licenses-list"

export default function LicenseTrackerPage() {
  const { can } = usePermissions()
  // All hooks called unconditionally — permission gate comes after.
  const hasAccess = can("licenses:view")

  const [createOpen, setCreateOpen] = useState(false)
  const listRef = useRef<LicensesListHandle>(null)

  // ── Permission gate ───────────────────────────────────────────────────────────
  if (!hasAccess) {
    return (
      <main>
        <ErrorState
          title="Access denied"
          description="You need the licenses:view permission to access License Tracker. Contact your administrator."
        />
      </main>
    )
  }

  return (
    <main className="space-y-4">
      <PageHeader
        title="License Tracker"
        onRefresh={() => listRef.current?.refetch()}
        actions={
          can("licenses:create") ? (
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-1.5" aria-hidden="true" />
              Add License
            </Button>
          ) : undefined
        }
      />

      <LicensesList ref={listRef} createOpen={createOpen} onCreateOpenChange={setCreateOpen} />
    </main>
  )
}
