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
 * Note: HEADER_OPTIONS registry (from old app's @/components/receipts/headers/registry)
 * is not available in the Vite app. The settings field is a free-form string key.
 * The form uses a TextInput for the printHeaderKey value — the user enters the key
 * directly. If/when the header registry is ported, this can be replaced with a Select.
 */

import { useState, useEffect } from "react"
import { Settings2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FormSection, FormField, TextInput, ErrorState } from "@/components/patterns"
import { Skeleton } from "@/components/ui/skeleton"
import { useOpticalSettings, useUpdateSettings } from "./hooks"

interface SettingsTabProps {
  canViewSettings: boolean
  canEditSettings: boolean
}

export function SettingsTab({ canViewSettings, canEditSettings }: SettingsTabProps) {
  const { data: settings, isLoading, isError, error, refetch } = useOpticalSettings(canViewSettings)
  const updateMutation = useUpdateSettings()

  const [printHeaderKey, setPrintHeaderKey] = useState("")

  useEffect(() => {
    if (settings) {
      setPrintHeaderKey(settings.printHeaderKey ?? "")
    }
  }, [settings])

  function handleSave() {
    updateMutation.mutate({ printHeaderKey: printHeaderKey || "" })
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

        <FormSection title="" description="Enter the header key that appears on printed optical bills (e.g. 'default').">
          <FormField label="Receipt Header Key">
            <TextInput
              value={printHeaderKey}
              onChange={(e) => setPrintHeaderKey(e.target.value)}
              placeholder="default"
              disabled={!canEditSettings}
              aria-label="Print header key"
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
