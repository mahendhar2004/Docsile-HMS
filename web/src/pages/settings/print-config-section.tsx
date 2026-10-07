/**
 * PrintConfigSection — GET/PATCH /settings/print-config.
 * Manages the ordered list of default print receipts for the quick-print button on Doctor page.
 * Permission: settings:view (read) / settings:edit (write)
 *
 * The print config is a free-form JSON blob stored in HospitalProfile.settings.
 * The `defaultPrint` key holds { items: DefaultPrintItem[] }.
 * Field shapes verified from src/lib/default-print.ts (old app).
 */

import { useEffect, useState } from "react"
import { Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ErrorState, EmptyState } from "@/components/patterns"
import { usePrintConfig, useUpdatePrintConfig } from "./hooks"
import type {
  DefaultPrintItem,
  DefaultPrintItemType,
  ReadingsSubMode,
} from "./types"
import {
  DEFAULT_PRINT_LABELS,
  READINGS_SUBMODE_LABELS,
  parsePrintConfig,
} from "./types"

const ALL_ITEM_TYPES: DefaultPrintItemType[] = ["cash", "prescription", "readings", "report"]

interface PrintConfigSectionProps {
  canEdit: boolean
}

export function PrintConfigSection({ canEdit }: PrintConfigSectionProps) {
  const { data: rawConfig, isLoading, error, refetch } = usePrintConfig()
  const updateM = useUpdatePrintConfig()

  const [items, setItems] = useState<DefaultPrintItem[]>([])
  const [savedItems, setSavedItems] = useState<DefaultPrintItem[]>([])

  useEffect(() => {
    const parsed = parsePrintConfig(rawConfig)
    setItems(parsed)
    setSavedItems(parsed)
  }, [rawConfig])

  const usedTypes = new Set(items.map((i) => i.type))
  const addableTypes = ALL_ITEM_TYPES.filter((t) => !usedTypes.has(t))
  const dirty = JSON.stringify(items) !== JSON.stringify(savedItems)

  function addItem(type: DefaultPrintItemType) {
    if (usedTypes.has(type)) return
    const newItem: DefaultPrintItem =
      type === "readings" ? { type: "readings", subMode: "both" } : { type }
    setItems((prev) => [...prev, newItem])
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  function moveItem(index: number, delta: -1 | 1) {
    setItems((prev) => {
      const next = [...prev]
      const target = index + delta
      if (target < 0 || target >= next.length) return prev
      const tmp = next[index]
      next[index] = next[target]!
      next[target] = tmp!
      return next
    })
  }

  function updateSubMode(index: number, subMode: ReadingsSubMode) {
    setItems((prev) =>
      prev.map((it, i) => {
        if (i !== index || it.type !== "readings") return it
        return { ...it, subMode }
      }),
    )
  }

  async function handleSave() {
    const newConfig = { ...(rawConfig ?? {}), defaultPrint: { items } }
    await updateM.mutateAsync(newConfig)
    setSavedItems(items)
  }

  if (error) {
    return (
      <ErrorState
        title="Could not load print configuration"
        error={error}
        onRetry={() => void refetch()}
      />
    )
  }

  if (isLoading) {
    return (
      <div className="max-w-2xl space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-base font-semibold text-foreground">
          Quick Print — Default Receipts
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Configure which receipts are printed when the quick-print button is clicked on the
          Doctor page. The order below is the print order — each item produces one page.
        </p>
      </div>

      {/* Items list */}
      <div className="space-y-2">
        {items.length === 0 ? (
          <EmptyState
            title="No default receipts configured"
            description="Add one below to enable the quick-print button on the Doctor page."
          />
        ) : (
          items.map((item, index) => (
            <div
              key={item.type}
              className="flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2"
            >
              <span className="inline-flex items-center justify-center h-6 w-6 rounded bg-muted text-xs font-semibold text-muted-foreground tabular-nums">
                {index + 1}
              </span>
              <span className="flex-1 text-sm font-medium text-foreground">
                {DEFAULT_PRINT_LABELS[item.type]}
              </span>
              {item.type === "readings" && canEdit && (
                <Select
                  value={item.subMode}
                  onValueChange={(v) => updateSubMode(index, v as ReadingsSubMode)}
                >
                  <SelectTrigger className="h-8 w-44 text-xs" aria-label="Readings sub-mode">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(["readings", "clinical", "both"] as const).map((sm) => (
                      <SelectItem key={sm} value={sm}>
                        {READINGS_SUBMODE_LABELS[sm]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {item.type === "readings" && !canEdit && (
                <span className="text-xs text-muted-foreground">
                  {READINGS_SUBMODE_LABELS[item.subMode]}
                </span>
              )}
              {canEdit && (
                <>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => moveItem(index, -1)}
                    disabled={index === 0}
                    aria-label="Move up"
                    className="h-8 w-8 p-0"
                  >
                    <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => moveItem(index, 1)}
                    disabled={index === items.length - 1}
                    aria-label="Move down"
                    className="h-8 w-8 p-0"
                  >
                    <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeItem(index)}
                    aria-label={`Remove ${DEFAULT_PRINT_LABELS[item.type]}`}
                    className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                </>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add + Save row */}
      {canEdit && (
        <div className="flex items-center justify-between gap-4 pt-2 border-t border-border">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={addableTypes.length === 0}>
                <Plus className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
                Add receipt
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {addableTypes.map((t) => (
                <DropdownMenuItem key={t} onClick={() => addItem(t)}>
                  {DEFAULT_PRINT_LABELS[t]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setItems(savedItems)}
              disabled={!dirty || updateM.isPending}
            >
              Reset
            </Button>
            <Button
              size="sm"
              onClick={() => void handleSave()}
              disabled={!dirty || updateM.isPending}
            >
              {updateM.isPending ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
