/**
 * labs/investigation-assignment-form.tsx
 *
 * Full-page view for assigning investigations to a specific lab.
 * Replaces the labs-tab content when "Configure" is clicked on a lab row.
 *
 * Business logic verified against:
 *   - src/app/(hospital)/labs/components/LabInvestigationConfig.tsx (old Next.js app)
 *
 * Data flow:
 *   1. Load GET /labs/labs/{id} to get the lab's current investigation mappings
 *      (investigationId, amount, isDefault) from the join table.
 *   2. Load GET /labs/investigations for the full investigation master list.
 *   3. Cross-reference: pre-populate enabled/amount/isDefault from lab's existing mappings.
 *   4. Save via PUT /labs/labs/{labId}/investigations with { investigationId, amount, isDefault }[]
 *
 * Permission: labs:config (caller must check before rendering)
 */

import { useState, useEffect, useCallback } from "react"
import { ArrowLeft, Save, Search, Plus, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { IconButton } from "@/components/ui/icon-button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { ErrorState } from "@/components/patterns"
import {
  useLabById,
  useInvestigationsList,
  useUpdateLabInvestigations,
  useCreateInvestigation,
} from "./hooks"
import { INVESTIGATION_CATEGORIES } from "./types"
import type { LabInvestigationMapping } from "./types"

// ─── Internal state type ─────────────────────────────────────────────────────

interface MappingEntry {
  investigationId: string
  amount: number
  isDefault: boolean
  enabled: boolean
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface InvestigationAssignmentFormProps {
  labId: string
  onBack: () => void
}

// ─── Component ───────────────────────────────────────────────────────────────

export function InvestigationAssignmentForm({
  labId,
  onBack,
}: InvestigationAssignmentFormProps) {
  const [mappings, setMappings] = useState<Map<string, MappingEntry>>(new Map())
  const [search, setSearch] = useState("")
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [newInvName, setNewInvName] = useState("")
  const [newInvCategory, setNewInvCategory] = useState("")

  // Fetch the lab's current mappings (includes investigationId, amount, isDefault)
  const {
    data: labData,
    isLoading: labLoading,
    error: labError,
    refetch: refetchLab,
  } = useLabById(labId)

  // Fetch all investigation master records
  const {
    data: allInvestigations,
    isLoading: invLoading,
    error: invError,
    refetch: refetchInv,
  } = useInvestigationsList()

  const updateMappings = useUpdateLabInvestigations(labId, onBack)
  const createInvestigation = useCreateInvestigation(() => {
    setAddDialogOpen(false)
    setNewInvName("")
    setNewInvCategory("")
  })

  const isLoading = labLoading || invLoading

  // When lab data loads, build the initial mapping map
  useEffect(() => {
    if (!labData) return
    const map = new Map<string, MappingEntry>()
    for (const m of labData.investigations) {
      map.set(m.investigationId, {
        investigationId: m.investigationId,
        amount: m.amount,
        isDefault: m.isDefault,
        enabled: true,
      })
    }
    setMappings(map)
  }, [labData])

  function toggleInvestigation(invId: string, checked: boolean) {
    setMappings((prev) => {
      const next = new Map(prev)
      const existing = next.get(invId)
      if (existing) {
        next.set(invId, { ...existing, enabled: checked })
      } else if (checked) {
        next.set(invId, {
          investigationId: invId,
          amount: 0,
          isDefault: false,
          enabled: true,
        })
      }
      return next
    })
  }

  function updateAmount(invId: string, amount: number) {
    setMappings((prev) => {
      const next = new Map(prev)
      const existing = next.get(invId)
      if (existing) next.set(invId, { ...existing, amount })
      return next
    })
  }

  function toggleDefault(invId: string, checked: boolean) {
    setMappings((prev) => {
      const next = new Map(prev)
      const existing = next.get(invId)
      if (existing) next.set(invId, { ...existing, isDefault: checked })
      return next
    })
  }

  const handleSave = useCallback(() => {
    const enabled: LabInvestigationMapping[] = Array.from(mappings.values())
      .filter((m) => m.enabled)
      .map((m) => ({
        investigationId: m.investigationId,
        amount: m.amount,
        isDefault: m.isDefault,
      }))
    updateMappings.mutate(enabled)
  }, [mappings, updateMappings])

  function handleAddInvestigation(e: React.FormEvent) {
    e.preventDefault()
    if (!newInvName.trim()) return
    createInvestigation.mutate({
      name: newInvName.trim(),
      category: newInvCategory || null,
    })
  }

  // Filter investigations by search
  const filtered = (allInvestigations ?? []).filter((inv) =>
    inv.name.toLowerCase().includes(search.toLowerCase()),
  )

  // Group by category
  const grouped = filtered.reduce<
    Record<string, typeof filtered>
  >((acc, inv) => {
    const cat = inv.category ?? "Other"
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(inv)
    return acc
  }, {})

  const enabledCount = Array.from(mappings.values()).filter(
    (m) => m.enabled,
  ).length

  // ── Loading state ────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-7 w-7 rounded-md" />
          <Skeleton className="h-5 w-56" />
        </div>
        <Skeleton className="h-9 w-64" />
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    )
  }

  // ── Error state ──────────────────────────────────────────────────────────────

  if (labError || invError) {
    return (
      <ErrorState
        title="Failed to load data"
        error={labError ?? invError}
        onRetry={() => {
          void refetchLab()
          void refetchInv()
        }}
      />
    )
  }

  // ── Main form ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Header row */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <IconButton
            variant="ghost"
            size="sm"
            onClick={onBack}
            aria-label="Back to labs list"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </IconButton>
          <div>
            <h2 className="text-[0.95rem] font-semibold text-foreground">
              Configure Investigations — {labData?.name ?? ""}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {enabledCount} investigation{enabledCount !== 1 ? "s" : ""} enabled
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAddDialogOpen(true)}
          >
            <Plus className="h-4 w-4 mr-1" aria-hidden="true" />
            Add Investigation
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={updateMappings.isPending}
            aria-label="Save investigation mappings"
          >
            {updateMappings.isPending ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" aria-hidden="true" />
            ) : (
              <Save className="h-4 w-4 mr-1" aria-hidden="true" />
            )}
            {updateMappings.isPending ? "Saving…" : "Save Mappings"}
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          type="search"
          placeholder="Search investigations…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
          aria-label="Search investigations"
        />
      </div>

      {/* Investigation tables grouped by category */}
      {Object.entries(grouped).map(([category, investigations]) => (
        <div key={category}>
          <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider mb-2 px-1">
            {category}
          </p>
          <div className="rounded-xl border border-border bg-white overflow-hidden">
            <table className="w-full text-sm" aria-label={`${category} investigations`}>
              <thead>
                <tr className="bg-muted border-b border-border">
                  <th scope="col" className="text-left px-4 py-2.5 font-medium w-10">
                    <span className="sr-only">Enable</span>
                  </th>
                  <th scope="col" className="text-left px-4 py-2.5 font-medium">
                    Investigation
                  </th>
                  <th scope="col" className="text-left px-4 py-2.5 font-medium w-40">
                    Amount (₹)
                  </th>
                  <th scope="col" className="text-center px-4 py-2.5 font-medium w-28">
                    Default Lab
                  </th>
                </tr>
              </thead>
              <tbody>
                {investigations.map((inv) => {
                  const mapping = mappings.get(inv.id)
                  const isEnabled = mapping?.enabled ?? false
                  return (
                    <tr
                      key={inv.id}
                      className="border-b border-border last:border-0 hover:bg-muted/30"
                    >
                      <td className="px-4 py-2.5">
                        <Checkbox
                          checked={isEnabled}
                          onCheckedChange={(checked) =>
                            toggleInvestigation(inv.id, !!checked)
                          }
                          aria-label={`Enable ${inv.name}`}
                        />
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={
                            isEnabled
                              ? "font-medium"
                              : "text-muted-foreground"
                          }
                        >
                          {inv.name}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        {isEnabled ? (
                          <Input
                            type="number"
                            min={0}
                            step={10}
                            value={mapping?.amount ?? 0}
                            onChange={(e) =>
                              updateAmount(
                                inv.id,
                                parseFloat(e.target.value) || 0,
                              )
                            }
                            className="h-8 w-full bg-white"
                            aria-label={`Amount for ${inv.name}`}
                          />
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {isEnabled ? (
                          <Checkbox
                            checked={mapping?.isDefault ?? false}
                            onCheckedChange={(checked) =>
                              toggleDefault(inv.id, !!checked)
                            }
                            aria-label={`Set ${inv.name} as default for this lab`}
                          />
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {/* Empty search result */}
      {filtered.length === 0 && (
        <div className="rounded-xl border border-border bg-white py-16 text-center">
          <p className="font-medium text-muted-foreground">
            No investigations found
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Try a different search or add a new investigation
          </p>
        </div>
      )}

      {/* Add Investigation Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Investigation</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddInvestigation} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="inv-name">
                Investigation Name{" "}
                <span className="text-destructive" aria-hidden="true">
                  *
                </span>
              </Label>
              <Input
                id="inv-name"
                value={newInvName}
                onChange={(e) => setNewInvName(e.target.value)}
                placeholder="e.g., Serum Creatinine"
                autoFocus
                required
                aria-required="true"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="inv-category">Category</Label>
              <Select
                value={newInvCategory}
                onValueChange={setNewInvCategory}
              >
                <SelectTrigger id="inv-category" aria-label="Investigation category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {INVESTIGATION_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddDialogOpen(false)}
                disabled={createInvestigation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!newInvName.trim() || createInvestigation.isPending}
              >
                {createInvestigation.isPending && (
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" aria-hidden="true" />
                )}
                Add Investigation
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
