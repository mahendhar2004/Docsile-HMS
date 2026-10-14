/**
 * PackagesSection — CRUD for /settings/packages.
 * Permission: settings:view (read) / settings:edit (write)
 *
 * Field shapes verified from:
 * - supabase/functions/settings/types.ts PredefinedPackageSchema
 * - old app SettingsPage.tsx PkgRow type + PackageDialog
 * - src/lib/types.ts PackageInclusion
 */

import { useState, useEffect } from "react"
import { Plus } from "lucide-react"
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
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ConfirmationModal, ErrorState, EmptyState } from "@/components/patterns"
import {
  usePackages,
  useCreatePackage,
  useUpdatePackage,
  useDeletePackage,
  useTogglePackageActive,
} from "./hooks"
import {
  INCLUSION_OPTIONS,
  type PredefinedPackage,
  type PackageInclusion,
} from "./types"

interface PackagesSectionProps {
  canEdit: boolean
}

export function PackagesSection({ canEdit }: PackagesSectionProps) {
  const { data: packages = [], isLoading, error, refetch } = usePackages()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editItem, setEditItem] = useState<PredefinedPackage | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteName, setDeleteName] = useState("")

  const deleteM = useDeletePackage()
  const toggleM = useTogglePackageActive()

  function parseInclusions(pkg: PredefinedPackage): PackageInclusion[] {
    try {
      return JSON.parse(pkg.inclusions ?? "[]") as PackageInclusion[]
    } catch {
      return []
    }
  }

  if (error) {
    return (
      <ErrorState
        title="Could not load packages"
        error={error}
        onRetry={() => void refetch()}
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex-1" />
        {canEdit && (
          <Button size="sm" className="h-9" onClick={() => { setEditItem(null); setDialogOpen(true) }}>
            <Plus className="h-4 w-4 mr-1" aria-hidden="true" />
            Add Package
          </Button>
        )}
      </div>

      <div className="rounded-[var(--radius-lg)] bg-[var(--color-card)] shadow-[var(--shadow-card)] overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead>Package Name</TableHead>
              <TableHead>Inclusions</TableHead>
              <TableHead className="text-right">Total (₹)</TableHead>
              <TableHead className="text-right">Discount (₹)</TableHead>
              <TableHead className="text-center">Status</TableHead>
              {canEdit && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: canEdit ? 6 : 5 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : packages.length === 0 ? (
              <TableRow>
                <TableCell colSpan={canEdit ? 6 : 5} className="py-12">
                  <EmptyState
                    title="No packages created yet"
                    description="Create your first IPD package."
                  />
                </TableCell>
              </TableRow>
            ) : (
              packages.map((pkg) => {
                const inclusions = parseInclusions(pkg)
                return (
                  <TableRow key={pkg.id}>
                    <TableCell className="font-medium">{pkg.name}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {inclusions.slice(0, 3).map((inc, j) => (
                          <Badge key={j} variant="secondary" className="text-xs">
                            {inc.name}: ₹{inc.amount.toLocaleString("en-IN")}
                          </Badge>
                        ))}
                        {inclusions.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{inclusions.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ₹{pkg.totalAmount.toLocaleString("en-IN")}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {(pkg.discount ?? 0) > 0
                        ? `₹${(pkg.discount ?? 0).toLocaleString("en-IN")}`
                        : "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={pkg.isActive ? "default" : "muted"}
                        className={canEdit ? "cursor-pointer" : undefined}
                        onClick={
                          canEdit
                            ? () => toggleM.mutate({ id: pkg.id, isActive: !pkg.isActive })
                            : undefined
                        }
                      >
                        {pkg.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    {canEdit && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => { setEditItem(pkg); setDialogOpen(true) }}
                            aria-label={`Edit ${pkg.name}`}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => { setDeleteId(pkg.id); setDeleteName(pkg.name) }}
                            className="text-destructive hover:bg-destructive/10"
                            aria-label={`Delete ${pkg.name}`}
                          >
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      <PackageDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditItem(null) }}
        existing={editItem ?? undefined}
      />

      <ConfirmationModal
        open={deleteId != null}
        onOpenChange={(v) => { if (!v) { setDeleteId(null); setDeleteName("") } }}
        variant="destructive"
        title="Delete package?"
        description={`"${deleteName}" will be permanently deleted.`}
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

// ─── Package Dialog ───────────────────────────────────────────────────────────

interface PackageDialogProps {
  open: boolean
  onClose: () => void
  existing?: PredefinedPackage
}

const DEFAULT_INCLUSION: PackageInclusion = { name: "Surgery Charges", amount: 0, subItems: [] }

function PackageDialog({ open, onClose, existing }: PackageDialogProps) {
  const [name, setName] = useState(existing?.name ?? "")
  const [discount, setDiscount] = useState(existing?.discount ?? 0)
  const [inclusions, setInclusions] = useState<PackageInclusion[]>(() => {
    try {
      const parsed = JSON.parse(existing?.inclusions ?? "[]") as PackageInclusion[]
      return parsed.length > 0 ? parsed : [{ ...DEFAULT_INCLUSION, subItems: [] }]
    } catch {
      return [{ ...DEFAULT_INCLUSION, subItems: [] }]
    }
  })

  const createM = useCreatePackage(() => onClose())
  const updateM = useUpdatePackage(existing?.id ?? "", () => onClose())

  // Reset when opening — this dialog is mounted once and kept alive (only
  // `open` toggles visibility), so the useState initializers above only
  // seed the very first render (same bug found and fixed in
  // service-templates-section.tsx).
  useEffect(() => {
    if (open) {
      setName(existing?.name ?? "")
      setDiscount(existing?.discount ?? 0)
      try {
        const parsed = JSON.parse(existing?.inclusions ?? "[]") as PackageInclusion[]
        setInclusions(parsed.length > 0 ? parsed : [{ ...DEFAULT_INCLUSION, subItems: [] }])
      } catch {
        setInclusions([{ ...DEFAULT_INCLUSION, subItems: [] }])
      }
    }
  }, [open, existing])

  const totalAmount = inclusions.reduce((s, i) => s + i.amount, 0)

  function updateInclusion(idx: number, field: "name" | "amount", val: string) {
    setInclusions((prev) =>
      prev.map((inc, j) =>
        j === idx
          ? { ...inc, [field]: field === "amount" ? parseFloat(val) || 0 : val }
          : inc,
      ),
    )
  }

  function addInclusion() {
    setInclusions((prev) => [...prev, { name: "", amount: 0, subItems: [] }])
  }

  function removeInclusion(idx: number) {
    if (inclusions.length > 1) setInclusions((prev) => prev.filter((_, j) => j !== idx))
  }

  function addSubItem(incIdx: number) {
    setInclusions((prev) =>
      prev.map((inc, j) =>
        j === incIdx
          ? {
              ...inc,
              subItems: [...(inc.subItems ?? []), { itemName: "", quantity: 1, rate: 0, amount: 0 }],
            }
          : inc,
      ),
    )
  }

  function updateSubItem(
    incIdx: number,
    subIdx: number,
    field: "itemName" | "quantity" | "rate",
    val: string,
  ) {
    setInclusions((prev) =>
      prev.map((inc, j) => {
        if (j !== incIdx) return inc
        const subs = [...(inc.subItems ?? [])]
        const sub = { ...subs[subIdx]! }
        if (field === "itemName") sub.itemName = val
        else if (field === "quantity") {
          sub.quantity = parseInt(val) || 0
          sub.amount = sub.quantity * sub.rate
        } else {
          sub.rate = parseFloat(val) || 0
          sub.amount = sub.quantity * sub.rate
        }
        subs[subIdx] = sub
        return { ...inc, subItems: subs }
      }),
    )
  }

  function removeSubItem(incIdx: number, subIdx: number) {
    setInclusions((prev) =>
      prev.map((inc, j) =>
        j === incIdx
          ? { ...inc, subItems: (inc.subItems ?? []).filter((_, k) => k !== subIdx) }
          : inc,
      ),
    )
  }

  async function handleSave() {
    if (!name.trim()) return
    const payload = {
      name: name.trim(),
      inclusions: JSON.stringify(inclusions),
      totalAmount,
      discount,
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{existing ? "Edit Package" : "Create Package"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-1">
          <div>
            <Label htmlFor="pkg-name">
              Package Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="pkg-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Cataract Surgery Package"
              className="mt-1"
            />
          </div>

          <div className="flex items-center gap-6">
            <div>
              <Label>Total Amount (₹)</Label>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-sm font-semibold bg-muted border border-border rounded px-3 py-1">
                  ₹{totalAmount.toLocaleString("en-IN")}
                </span>
                <span className="text-xs text-muted-foreground">(auto-calculated)</span>
              </div>
            </div>
            <div>
              <Label htmlFor="pkg-discount">Discount (₹)</Label>
              <Input
                id="pkg-discount"
                type="number"
                value={discount || ""}
                onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                className="mt-1 w-28"
                min={0}
              />
            </div>
          </div>

          <div>
            <Label className="mb-2 block">Package Inclusions</Label>
            <div className="space-y-3">
              {inclusions.map((incl, i) => (
                <div key={i} className="border border-border rounded-lg p-3 bg-muted/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Select
                      value={incl.name || "__none__"}
                      onValueChange={(v) =>
                        updateInclusion(i, "name", v === "__none__" ? "" : v)
                      }
                    >
                      <SelectTrigger className="flex-1 text-sm" aria-label="Inclusion type">
                        <SelectValue placeholder="Select inclusion..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Select...</SelectItem>
                        {INCLUSION_OPTIONS.map((o) => (
                          <SelectItem key={o} value={o}>
                            {o}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      value={incl.amount || ""}
                      onChange={(e) => updateInclusion(i, "amount", e.target.value)}
                      placeholder="Amount"
                      className="w-28"
                      min={0}
                      aria-label="Inclusion amount"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addSubItem(i)}
                      className="shrink-0 text-xs"
                      aria-label="Add sub-item"
                    >
                      + Sub
                    </Button>
                    {inclusions.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeInclusion(i)}
                        className="shrink-0 text-destructive"
                        aria-label="Remove inclusion"
                      >
                        −
                      </Button>
                    )}
                  </div>
                  {(incl.subItems ?? []).length > 0 && (
                    <div className="ml-4 mt-2 space-y-1">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Sub Items</p>
                      {(incl.subItems ?? []).map((sub, si) => (
                        <div key={si} className="flex items-center gap-2">
                          <Input
                            value={sub.itemName}
                            onChange={(e) => updateSubItem(i, si, "itemName", e.target.value)}
                            placeholder="Item name"
                            className="flex-1 h-8 text-xs"
                          />
                          <Input
                            type="number"
                            value={sub.quantity || ""}
                            onChange={(e) => updateSubItem(i, si, "quantity", e.target.value)}
                            placeholder="Qty"
                            className="w-16 h-8 text-xs"
                            min={0}
                          />
                          <Input
                            type="number"
                            value={sub.rate || ""}
                            onChange={(e) => updateSubItem(i, si, "rate", e.target.value)}
                            placeholder="Rate"
                            className="w-20 h-8 text-xs"
                            min={0}
                          />
                          <span className="text-xs w-16 text-right tabular-nums">
                            ₹{sub.amount.toLocaleString("en-IN")}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeSubItem(i, si)}
                            className="shrink-0 w-6 h-6 text-destructive p-0"
                            aria-label="Remove sub-item"
                          >
                            ×
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addInclusion}
              className="mt-2"
            >
              + Add Inclusion
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={() => void handleSave()} disabled={isLoading || !name.trim()}>
            {isLoading ? "Saving..." : existing ? "Save Changes" : "Create Package"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
