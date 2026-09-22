/**
 * labs/investigations-tab.tsx
 *
 * Investigation master tab — list all investigations and create new ones.
 *
 * Permission gates:
 *   labs:view   — list
 *   labs:config — create
 *
 * Investigation categories verified against:
 *   src/app/(hospital)/labs/components/LabInvestigationConfig.tsx
 *   const INVESTIGATION_CATEGORIES = ["Lab Test", "Eye Test", "Imaging", "General"]
 */

import { useState } from "react"
import { Plus, FlaskConical } from "lucide-react"
import { usePermissions } from "@/hooks/usePermissions"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
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
import { Loader2 } from "lucide-react"
import { DataTable, EmptyState, ErrorState } from "@/components/patterns"
import type { ColumnDef } from "@/components/patterns"
import { useInvestigationsList, useCreateInvestigation } from "./hooks"
import { INVESTIGATION_CATEGORIES } from "./types"
import type { InvestigationMaster } from "./types"

export function InvestigationsTab() {
  const { can } = usePermissions()

  // ── Data ──────────────────────────────────────────────────────────────────────
  const {
    data: investigations,
    isLoading,
    error,
    refetch,
  } = useInvestigationsList()

  // ── Form state ────────────────────────────────────────────────────────────────
  const [addOpen, setAddOpen] = useState(false)
  const [newName, setNewName] = useState("")
  const [newCategory, setNewCategory] = useState("")

  const createInvestigation = useCreateInvestigation(() => {
    setAddOpen(false)
    setNewName("")
    setNewCategory("")
  })

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    createInvestigation.mutate({
      name: newName.trim(),
      category: newCategory || null,
    })
  }

  // ── Column definitions ────────────────────────────────────────────────────────
  const columns: ColumnDef<InvestigationMaster>[] = [
    {
      key: "name",
      header: "Investigation Name",
      cell: (inv) => <span className="font-medium">{inv.name}</span>,
    },
    {
      key: "category",
      header: "Category",
      cell: (inv) =>
        inv.category ? (
          <Badge variant="muted">{inv.category}</Badge>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        ),
    },
    {
      key: "description",
      header: "Description",
      cell: (inv) => (
        <span className="text-sm text-muted-foreground">
          {inv.description ?? "—"}
        </span>
      ),
    },
  ]

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">
            Investigation Master
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            All investigations available for lab billing
          </p>
        </div>
        {can("labs:config") && (
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4 mr-1" aria-hidden="true" />
            Add Investigation
          </Button>
        )}
      </div>

      {/* Loading skeleton */}
      {isLoading && (
        <div className="rounded-[var(--radius-lg)] bg-[var(--color-card)] shadow-[var(--shadow-card)] overflow-hidden">
          <div className="bg-muted/50 px-4 py-2.5 border-b border-border flex gap-8">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-3 w-24" />
            ))}
          </div>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex gap-8 px-4 py-3 border-b border-border last:border-0">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 flex-1" />
            </div>
          ))}
        </div>
      )}

      {/* Error state */}
      {!isLoading && error && (
        <ErrorState
          title="Could not load investigations"
          error={error}
          onRetry={() => void refetch()}
        />
      )}

      {/* Empty state */}
      {!isLoading && !error && investigations?.length === 0 && (
        <EmptyState
          title="No investigations yet"
          description="Add investigation types to enable assigning them to labs."
          icon={<FlaskConical className="h-8 w-8" aria-hidden="true" />}
          action={
            can("labs:config")
              ? {
                  label: "Add Investigation",
                  onClick: () => setAddOpen(true),
                }
              : undefined
          }
        />
      )}

      {/* Investigations table */}
      {!isLoading && !error && investigations && investigations.length > 0 && (
        <DataTable
          aria-label="Investigation master list"
          data={investigations}
          columns={columns}
        />
      )}

      {/* Add investigation dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Investigation</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="inv-name">
                Investigation Name{" "}
                <span className="text-destructive" aria-hidden="true">
                  *
                </span>
              </Label>
              <Input
                id="inv-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g., Serum Creatinine"
                autoFocus
                required
                aria-required="true"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="inv-category">Category</Label>
              <Select value={newCategory} onValueChange={setNewCategory}>
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
                onClick={() => setAddOpen(false)}
                disabled={createInvestigation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!newName.trim() || createInvestigation.isPending}
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
