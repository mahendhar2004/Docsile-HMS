/**
 * MedicineMasterSection — CRUD for /settings/medicine-master.
 * Permission: settings:view (read) / settings:edit (write)
 *
 * Field shapes verified from:
 * - supabase/functions/settings/types.ts MedicineMasterSchema
 * - old app SettingsPage.tsx MedicineMasterRow type + MedicinesTab
 */

import { useState } from "react"
import { Plus, Pencil, Trash2 } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ConfirmationModal, ErrorState, EmptyState, PageToolbar } from "@/components/patterns"
import {
  useMedicineMaster,
  useCreateMedicineMaster,
  useUpdateMedicineMaster,
  useDeleteMedicineMaster,
} from "./hooks"
import {
  MEDICINE_CATEGORIES,
  PRESCRIPTION_TIMINGS,
  PRESCRIPTION_DAYS,
  type MedicineMaster,
} from "./types"

interface MedicineMasterSectionProps {
  canEdit: boolean
}

export function MedicineMasterSection({ canEdit }: MedicineMasterSectionProps) {
  const { data: medicines = [], isLoading, error, refetch } = useMedicineMaster()
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("All")
  const [showInactive, setShowInactive] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editItem, setEditItem] = useState<MedicineMaster | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteName, setDeleteName] = useState("")

  const deleteM = useDeleteMedicineMaster()

  const filtered = medicines.filter((m) => {
    if (!showInactive && !m.isActive) return false
    if (categoryFilter !== "All" && m.category !== categoryFilter) return false
    if (search && !m.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  function openCreate() {
    setEditItem(null)
    setDialogOpen(true)
  }

  function openEdit(m: MedicineMaster) {
    setEditItem(m)
    setDialogOpen(true)
  }

  if (error) {
    return (
      <ErrorState
        title="Could not load medicine master"
        error={error}
        onRetry={() => void refetch()}
      />
    )
  }

  return (
    <div className="space-y-4">
      <PageToolbar>
        <Input
          placeholder="Search medicines..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-52 h-9"
          aria-label="Search medicine master"
        />
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-40 h-9 text-sm" aria-label="Filter by category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Categories</SelectItem>
            {MEDICINE_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <label className="flex items-center gap-1.5 text-sm text-muted-foreground cursor-pointer">
          <Checkbox
            checked={showInactive}
            onCheckedChange={(v) => setShowInactive(v === true)}
            aria-label="Show inactive medicines"
          />
          Show inactive
        </label>
        <div className="flex-1" />
        {canEdit && (
          <Button size="sm" className="h-9" onClick={openCreate} aria-label="Add medicine">
            <Plus className="h-4 w-4 mr-1" aria-hidden="true" />
            Add Medicine
          </Button>
        )}
      </PageToolbar>

      <div className="rounded-xl border border-border bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead>Medicine Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Default Timing</TableHead>
              <TableHead>Default Days</TableHead>
              <TableHead>Default Note</TableHead>
              <TableHead className="text-center">Status</TableHead>
              {canEdit && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: canEdit ? 7 : 6 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={canEdit ? 7 : 6} className="py-12">
                  <EmptyState
                    title="No medicines in master"
                    description={
                      search || categoryFilter !== "All"
                        ? "No medicines match your filters."
                        : "Add your first medicine to the master list."
                    }
                  />
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((med) => (
                <TableRow key={med.id}>
                  <TableCell>
                    <div className="font-medium">{med.name}</div>
                  </TableCell>
                  <TableCell>
                    {med.category ? (
                      <Badge variant="secondary">{med.category}</Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {med.defaultTiming ? (
                      <span className="text-sm font-mono bg-muted px-1.5 py-0.5 rounded">
                        {med.defaultTiming}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {med.defaultDays ? (
                      <span className="text-sm">
                        {med.defaultDays === "Continuous"
                          ? "Continuous"
                          : `${med.defaultDays} days`}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="max-w-[180px]">
                    {med.note ? (
                      <span className="text-sm text-muted-foreground truncate block">
                        {med.note}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={med.isActive ? "default" : "muted"}>
                      {med.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  {canEdit && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(med)}
                          aria-label={`Edit ${med.name}`}
                        >
                          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setDeleteId(med.id)
                            setDeleteName(med.name)
                          }}
                          className="text-destructive hover:bg-destructive/10"
                          aria-label={`Delete ${med.name}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {!isLoading && filtered.length > 0 && (
          <div className="px-4 py-2 border-t border-border bg-muted/20">
            <span className="text-xs text-muted-foreground">
              {filtered.length} medicine{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>

      <MedicineFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        existing={editItem ?? undefined}
      />

      <ConfirmationModal
        open={deleteId != null}
        onOpenChange={(v) => {
          if (!v) {
            setDeleteId(null)
            setDeleteName("")
          }
        }}
        variant="destructive"
        title="Delete medicine?"
        description={`"${deleteName}" will be permanently deleted from the master list.`}
        confirmLabel="Delete"
        onConfirm={async () => {
          if (deleteId) {
            await deleteM.mutateAsync(deleteId)
            setDeleteId(null)
            setDeleteName("")
          }
        }}
        isLoading={deleteM.isPending}
      />
    </div>
  )
}

// ─── Medicine Form Dialog ─────────────────────────────────────────────────────

interface MedicineFormDialogProps {
  open: boolean
  onClose: () => void
  existing?: MedicineMaster
}

function MedicineFormDialog({ open, onClose, existing }: MedicineFormDialogProps) {
  const [name, setName] = useState(existing?.name ?? "")
  const [category, setCategory] = useState(existing?.category ?? "")
  const [defaultTiming, setDefaultTiming] = useState(existing?.defaultTiming ?? "")
  const [defaultDays, setDefaultDays] = useState(existing?.defaultDays ?? "")
  const [note, setNote] = useState(existing?.note ?? "")
  const [sortOrder, setSortOrder] = useState(String(existing?.sortOrder ?? "0"))
  const [errors, setErrors] = useState<Record<string, string>>({})

  const createM = useCreateMedicineMaster(() => onClose())
  const updateM = useUpdateMedicineMaster(existing?.id ?? "", () => onClose())

  // Reset when opening
  useState(() => {
    if (open) {
      setName(existing?.name ?? "")
      setCategory(existing?.category ?? "")
      setDefaultTiming(existing?.defaultTiming ?? "")
      setDefaultDays(existing?.defaultDays ?? "")
      setNote(existing?.note ?? "")
      setSortOrder(String(existing?.sortOrder ?? "0"))
      setErrors({})
    }
  })

  async function handleSave() {
    const e: Record<string, string> = {}
    if (!name.trim()) e.name = "Medicine name is required"
    if (Object.keys(e).length > 0) {
      setErrors(e)
      return
    }
    const payload = {
      name: name.trim(),
      category: category || undefined,
      defaultTiming: defaultTiming || undefined,
      defaultDays: defaultDays || undefined,
      note: note.trim() || undefined,
      sortOrder: parseInt(sortOrder) || 0,
      isActive: true,
    }
    if (existing) {
      await updateM.mutateAsync(payload)
    } else {
      await createM.mutateAsync(payload)
    }
  }

  const isLoading = createM.isPending || updateM.isPending

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{existing ? "Edit Medicine" : "Add Medicine"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="med-name">
              Medicine Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="med-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                if (errors.name) setErrors((p) => ({ ...p, name: "" }))
              }}
              placeholder="e.g. Moxifloxacin 0.5% Eye Drops"
              className={errors.name ? "border-destructive" : ""}
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="med-cat">Category</Label>
            <Select
              value={category || "__none__"}
              onValueChange={(v) => setCategory(v === "__none__" ? "" : v)}
            >
              <SelectTrigger id="med-cat">
                <SelectValue placeholder="Select category..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No category</SelectItem>
                {MEDICINE_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="med-timing">Default Timing</Label>
              <Select
                value={defaultTiming || "__none__"}
                onValueChange={(v) => setDefaultTiming(v === "__none__" ? "" : v)}
              >
                <SelectTrigger id="med-timing">
                  <SelectValue placeholder="Select timing..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No default</SelectItem>
                  {PRESCRIPTION_TIMINGS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="med-days">Default Days</Label>
              <Select
                value={defaultDays || "__none__"}
                onValueChange={(v) => setDefaultDays(v === "__none__" ? "" : v)}
              >
                <SelectTrigger id="med-days">
                  <SelectValue placeholder="Select days..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No default</SelectItem>
                  {PRESCRIPTION_DAYS.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d === "Continuous" ? "Continuous" : `${d} days`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="med-note">Default Note</Label>
            <Input
              id="med-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. After food, shake well before use"
            />
            <p className="text-xs text-muted-foreground">
              This note auto-fills when this medicine is added in a prescription.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="med-sort">Sort Order</Label>
            <Input
              id="med-sort"
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              placeholder="0"
              className="w-28"
            />
            <p className="text-xs text-muted-foreground">
              Lower number appears first in medicine dropdowns.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={() => void handleSave()} disabled={isLoading}>
            {isLoading ? "Saving..." : existing ? "Save Changes" : "Add Medicine"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
