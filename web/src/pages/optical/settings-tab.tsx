/**
 * optical/settings-tab.tsx
 *
 * Optical settings — printHeaderKey for receipt printing.
 * Matches OpticalConfigTab.tsx from the old Next.js app.
 *
 * Endpoints:
 *   - GET  /optical/settings  (settings:view)
 *   - PATCH /optical/settings (settings:edit)
 *
 * The header registry (@/components/receipts/headers/registry) is now
 * ported (this session), so the field is a proper Select over
 * HEADER_OPTIONS, matching main exactly — previously a free-text input
 * since the registry didn't exist yet.
 */

import { useState, useEffect } from "react"
import { Settings2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FormSection, FormField, SingleSelect, ErrorState } from "@/components/patterns"
import { Skeleton } from "@/components/ui/skeleton"
import { HEADER_OPTIONS } from "@/components/receipts/headers/registry"
import { useOpticalSettings, useUpdateSettings } from "./hooks"

interface SettingsTabProps {
  canViewSettings: boolean
  canEditSettings: boolean
}

export function SettingsTab({ canViewSettings, canEditSettings }: SettingsTabProps) {
  const { data: settings, isLoading, isError, error, refetch } = useOpticalSettings(canViewSettings)
  const updateMutation = useUpdateSettings()

  const [printHeaderKey, setPrintHeaderKey] = useState("default")

  useEffect(() => {
    if (settings) {
      setPrintHeaderKey(settings.printHeaderKey || "default")
    }
  }, [settings])

  function handleSave() {
    updateMutation.mutate({ printHeaderKey: printHeaderKey === "default" ? "" : printHeaderKey })
  }

  if (!canViewSettings) {
    return (
      <ErrorState
        title="Access denied"
        description="You need the settings:view permission to view optical settings."
      />
    )
  }

  if (isLoading) {
    return (
      <div className="max-w-lg space-y-4">
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    )
  }

  if (isError) {
    return (
      <ErrorState
        title="Could not load settings"
        error={error}
        onRetry={() => void refetch()}
      />
    )
  }

  return (
    <div className="max-w-lg space-y-6">
      <div className="rounded-[var(--radius-lg)] bg-[var(--color-card)] shadow-[var(--shadow-card)] p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Settings2 className="h-4 w-4 text-primary" aria-hidden="true" />
          <h3 className="text-sm font-semibold">Print Settings</h3>
        </div>

        <FormSection title="" description="Choose which letterhead header prints on optical bill receipts.">
          <FormField label="Receipt Header">
            <SingleSelect
              options={HEADER_OPTIONS.map((o) => ({ value: o.key, label: o.label }))}
              value={printHeaderKey}
              onChange={(v) => setPrintHeaderKey(v ?? "default")}
              disabled={!canEditSettings}
              aria-label="Receipt header"
            />
          </FormField>
        </FormSection>

        {canEditSettings && (
          <div className="pt-2">
            <Button
              size="sm"
              onClick={handleSave}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? "Saving…" : "Save Settings"}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
