/**
 * ServiceTemplatesSection — CRUD for /settings/service-templates.
 * Permission: settings:view (read) / settings:edit (write)
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
  useServiceTemplates,
  useCreateServiceTemplate,
  useUpdateServiceTemplate,
  useDeleteServiceTemplate,
} from "./hooks"
import { SERVICE_CATEGORIES, type ServiceTemplate } from "./types"

interface ServiceTemplatesProps {
  canEdit: boolean
}

export function ServiceTemplatesSection({ canEdit }: ServiceTemplatesProps) {
  const { data: templates = [], isLoading, error, refetch } = useServiceTemplates()
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("All")
  const [showInactive, setShowInactive] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editItem, setEditItem] = useState<ServiceTemplate | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const deleteM = useDeleteServiceTemplate()

  const filtered = templates.filter((s) => {
    if (!showInactive && !s.isActive) return false
    if (categoryFilter !== "All" && s.category !== categoryFilter) return false
    if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  function openCreate() {
    setEditItem(null)
    setDialogOpen(true)
  }

  function openEdit(t: ServiceTemplate) {
    setEditItem(t)
    setDialogOpen(true)
  }

  if (error) {
    return (
      <ErrorState
        title="Could not load service templates"
        error={error}
        onRetry={() => void refetch()}
      />
    )
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <PageToolbar>
        <Input
          placeholder="Search services..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-52 h-9"
          aria-label="Search service templates"
        />
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-40 h-9 text-sm" aria-label="Filter by category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Categories</SelectItem>
            {SERVICE_CATEGORIES.map((c) => (
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
            aria-label="Show inactive services"
          />
          Show inactive
        </label>
        <div className="flex-1" />
        {canEdit && (
          <Button size="sm" className="h-9" onClick={openCreate} aria-label="Add service template">
            <Plus className="h-4 w-4 mr-1" aria-hidden="true" />
            Add Service
          </Button>
        )}
      </PageToolbar>

      {/* Table */}
      <div className="rounded-[var(--radius-lg)] bg-[var(--color-card)] shadow-[var(--shadow-card)] overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead>Service Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Amount (₹)</TableHead>
              <TableHead className="text-right">Discount (₹)</TableHead>
              <TableHead className="text-center">Status</TableHead>
              {canEdit && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: canEdit ? 6 : 5 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={canEdit ? 6 : 5} className="py-12">
                  <EmptyState
                    title="No service templates"
                    description={
                      search || categoryFilter !== "All"
                        ? "No services match your filters."
                        : "Add your first service template to get started."
                    }
                  />
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((svc) => (
                <TableRow key={svc.id}>
                  <TableCell>
                    <div className="font-medium">{svc.name}</div>
                    {svc.description && (
                      <div className="text-xs text-muted-foreground">{svc.description}</div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{svc.category ?? "—"}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {svc.amount === 0 ? (
                      <span className="text-muted-foreground">Free</span>
                    ) : (
                      `₹${svc.amount.toLocaleString("en-IN")}`
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {(svc.discount ?? 0) > 0 ? (
                      <span className="text-green-600 font-medium">
                        ₹{(svc.discount ?? 0).toLocaleString("en-IN")}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={svc.isActive ? "default" : "muted"}>
                      {svc.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  {canEdit && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(svc)}
                          aria-label={`Edit ${svc.name}`}
                        >
                          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteId(svc.id)}
                          className="text-destructive hover:bg-destructive/10"
                          aria-label={`Delete ${svc.name}`}
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
              {filtered.length} service{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>

      {/* Create / Edit Dialog */}
      <ServiceFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        existing={editItem ?? undefined}
        allNames={templates.map((t) => t.name.toUpperCase())}
      />

      {/* Delete confirm */}
      <ConfirmationModal
        open={deleteId != null}
        onOpenChange={(v) => { if (!v) setDeleteId(null) }}
        variant="destructive"
        title="Delete service template?"
        description="This service will be permanently deleted and cannot be recovered."
        confirmLabel="Delete"
        onConfirm={async () => {
          if (deleteId) {
            await deleteM.mutateAsync(deleteId)
            setDeleteId(null)
          }
        }}
        isLoading={deleteM.isPending}
      />
    </div>
  )
}

// ─── Service Form Dialog ──────────────────────────────────────────────────────

interface ServiceFormDialogProps {
  open: boolean
  onClose: () => void
  existing?: ServiceTemplate
  allNames: string[]
}

function ServiceFormDialog({ open, onClose, existing, allNames }: ServiceFormDialogProps) {
  const [name, setName] = useState(existing?.name ?? "")
  const [category, setCategory] = useState<string>(existing?.category ?? "Consultation")
  const [description, setDescription] = useState(existing?.description ?? "")
  const [amount, setAmount] = useState(String(existing?.amount ?? ""))
  const [discount, setDiscount] = useState(String(existing?.discount ?? "0"))
  const [sortOrder, setSortOrder] = useState(String(existing?.sortOrder ?? "0"))
  const [errors, setErrors] = useState<Record<string, string>>({})

  const createM = useCreateServiceTemplate(() => onClose())
  const updateM = useUpdateServiceTemplate(existing?.id ?? "", () => onClose())

  // Reset form when dialog opens
  useState(() => {
    if (open) {
      setName(existing?.name ?? "")
      setCategory(existing?.category ?? "Consultation")
      setDescription(existing?.description ?? "")
      setAmount(String(existing?.amount ?? ""))
      setDiscount(String(existing?.discount ?? "0"))
      setSortOrder(String(existing?.sortOrder ?? "0"))
      setErrors({})
    }
  })

  const nameTrimmedUpper = name.trim().toUpperCase()
  const isDuplicate =
    !existing && allNames.includes(nameTrimmedUpper) && nameTrimmedUpper !== ""

  function validate(): boolean {
    const e: Record<string, string> = {}
    if (!name.trim()) e.name = "Service name is required"
    if (isDuplicate) e.name = "A service with this name already exists"
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSave() {
    if (!validate()) return
    const payload = {
      name: name.trim().toUpperCase(),
      category: category || undefined,
      description: description.trim() || undefined,
      amount: parseFloat(amount) || 0,
      discount: parseFloat(discount) || 0,
      sortOrder: parseInt(sortOrder) || 0,
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{existing ? "Edit Service" : "Add Service"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="svc-name">
              Service Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="svc-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value.toUpperCase())
                if (errors.name) setErrors((p) => ({ ...p, name: "" }))
              }}
              className={`mt-1 ${errors.name ? "border-destructive" : ""}`}
              placeholder="e.g. GENERAL CONSULTATION"
            />
            {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
          </div>
          <div>
            <Label htmlFor="svc-category">
              Category <span className="text-destructive">*</span>
            </Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="svc-category" className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SERVICE_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="svc-desc">Description</Label>
            <Input
              id="svc-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1"
              placeholder="Optional description"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label htmlFor="svc-amount">Amount (₹)</Label>
              <Input
                id="svc-amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="mt-1"
                min={0}
                placeholder="0"
              />
            </div>
            <div>
              <Label htmlFor="svc-discount">Discount (₹)</Label>
              <Input
                id="svc-discount"
                type="number"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                className="mt-1"
                min={0}
                placeholder="0"
              />
            </div>
            <div>
              <Label htmlFor="svc-sort">Sort Order</Label>
              <Input
                id="svc-sort"
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="mt-1"
                min={0}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={() => void handleSave()} disabled={isLoading}>
            {isLoading ? "Saving..." : existing ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
