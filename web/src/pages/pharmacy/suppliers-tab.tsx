/**
 * SuppliersTab — suppliers CRUD.
 * Permissions:
 *   - View: pharmacy:view
 *   - Create/Edit/Delete: pharmacy:manage_stock
 */

import { useState } from "react"
import { Plus, Building2, Phone, Mail, MapPin } from "lucide-react"
import { toast } from "sonner"
import { EmptyState, ErrorState, ConfirmationModal, PageToolbar, SearchBar } from "@/components/patterns"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { usePermissions } from "@/hooks/usePermissions"
import {
  useSuppliers,
  useCreateSupplier,
  useUpdateSupplier,
  useDeleteSupplier,
} from "./hooks"
import type { PharmacySupplier, SupplierFormValues } from "./types"

const EMPTY_FORM: SupplierFormValues = {
  name: "",
  contactPerson: "",
  phone: "",
  email: "",
  address: "",
  gstin: "",
  drugLicenseNo: "",
  creditDays: 30,
}

export function SuppliersTab() {
  const { can } = usePermissions()
  const canManage = can("pharmacy:manage_stock")

  const { data: suppliers, isLoading, error, refetch } = useSuppliers()
  const createSupplier = useCreateSupplier()
  const updateSupplier = useUpdateSupplier()
  const deleteSupplier = useDeleteSupplier()

  const [search, setSearch] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<PharmacySupplier | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [form, setForm] = useState<SupplierFormValues>(EMPTY_FORM)

  const filtered = (suppliers ?? []).filter((s) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      s.name.toLowerCase().includes(q) ||
      (s.contactPerson?.toLowerCase().includes(q) ?? false) ||
      (s.phone?.includes(q) ?? false)
    )
  })

  const set = <K extends keyof SupplierFormValues>(key: K, value: SupplierFormValues[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const openNew = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setShowForm(true)
  }

  const openEdit = (supplier: PharmacySupplier) => {
    setEditing(supplier)
    setForm({
      name: supplier.name,
      contactPerson: supplier.contactPerson ?? "",
      phone: supplier.phone ?? "",
      email: supplier.email ?? "",
      address: supplier.address ?? "",
      gstin: supplier.gstin ?? "",
      drugLicenseNo: supplier.drugLicenseNo ?? "",
      creditDays: supplier.creditDays,
    })
    setShowForm(true)
  }

  const handleSave = () => {
    if (!form.name.trim()) return
    if (editing) {
      updateSupplier.mutate(
        { id: editing.id, body: form },
        {
          onSuccess: () => {
            toast.success("Supplier updated")
            setShowForm(false)
            setEditing(null)
          },
          onError: (err) => {
            toast.error(err instanceof Error ? err.message : "Failed to update supplier")
          },
        },
      )
    } else {
      createSupplier.mutate(form, {
        onSuccess: () => {
          toast.success("Supplier added")
          setShowForm(false)
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : "Failed to add supplier")
        },
      })
    }
  }

  const handleDelete = () => {
    if (!deletingId) return
    deleteSupplier.mutate(deletingId, {
      onSuccess: () => {
        toast.success("Supplier deactivated")
        setDeletingId(null)
      },
      onError: (err) => {
        toast.error(err instanceof Error ? err.message : "Failed to delete supplier")
      },
    })
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-36 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <ErrorState
        title="Could not load suppliers"
        error={error}
        onRetry={() => void refetch()}
      />
    )
  }

  const isSaving = createSupplier.isPending || updateSupplier.isPending

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <PageToolbar>
        <SearchBar
          variant="standalone"
          value={search}
          onChange={setSearch}
          placeholder="Search suppliers..."
          aria-label="Search suppliers"
          className="flex-1 max-w-sm"
        />
        {canManage && (
          <Button size="sm" className="ml-auto" onClick={openNew}>
            <Plus className="h-4 w-4 mr-1.5" aria-hidden="true" />
            Add Supplier
          </Button>
        )}
      </PageToolbar>

      {/* Supplier cards */}
      {filtered.length === 0 ? (
        <EmptyState
          title="No suppliers found"
          description={
            search
              ? "No suppliers match your search."
              : "Add your first supplier to get started."
          }
          action={canManage ? { label: "Add Supplier", onClick: openNew } : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filtered.map((supplier) => (
            <Card key={supplier.id} className="p-5 hover:shadow-md transition-shadow">
              <CardContent className="p-0 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-slate-600" aria-hidden="true" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm">{supplier.name}</h4>
                      {supplier.contactPerson && (
                        <p className="text-xs text-muted-foreground">{supplier.contactPerson}</p>
                      )}
                    </div>
                  </div>
                  {canManage && (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(supplier)}
                        aria-label={`Edit ${supplier.name}`}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeletingId(supplier.id)}
                        aria-label={`Delete ${supplier.name}`}
                      >
                        Delete
                      </Button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  {supplier.phone && (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Phone className="h-3 w-3" aria-hidden="true" />
                      {supplier.phone}
                    </div>
                  )}
                  {supplier.email && (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Mail className="h-3 w-3" aria-hidden="true" />
                      {supplier.email}
                    </div>
                  )}
                  {supplier.address && (
                    <div className="flex items-center gap-1.5 text-muted-foreground col-span-2">
                      <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
                      <span className="truncate">{supplier.address}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-1 border-t flex-wrap">
                  {supplier.gstin && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      GSTIN: {supplier.gstin}
                    </Badge>
                  )}
                  {supplier.drugLicenseNo && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      DL: {supplier.drugLicenseNo}
                    </Badge>
                  )}
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 ml-auto">
                    Credit: {supplier.creditDays} days
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit form dialog */}
      <Dialog
        open={showForm}
        onOpenChange={(open) => {
          setShowForm(open)
          if (!open) setEditing(null)
        }}
      >
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Supplier" : "Add Supplier"}</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label className="text-xs">Supplier Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                aria-label="Supplier name"
                aria-required="true"
              />
            </div>
            <div>
              <Label className="text-xs">Contact Person</Label>
              <Input
                value={form.contactPerson}
                onChange={(e) => set("contactPerson", e.target.value)}
                aria-label="Contact person"
              />
            </div>
            <div>
              <Label className="text-xs">Phone</Label>
              <Input
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                aria-label="Phone"
              />
            </div>
            <div>
              <Label className="text-xs">Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                aria-label="Email"
              />
            </div>
            <div>
              <Label className="text-xs">GSTIN</Label>
              <Input
                value={form.gstin}
                onChange={(e) => set("gstin", e.target.value)}
                placeholder="e.g. 29ABCDE1234F1ZK"
                aria-label="GSTIN"
              />
            </div>
            <div>
              <Label className="text-xs">Drug License No.</Label>
              <Input
                value={form.drugLicenseNo}
                onChange={(e) => set("drugLicenseNo", e.target.value)}
                aria-label="Drug license number"
              />
            </div>
            <div>
              <Label className="text-xs">Credit Days</Label>
              <Input
                type="number"
                value={form.creditDays}
                onChange={(e) => set("creditDays", parseInt(e.target.value) || 30)}
                aria-label="Credit days"
              />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Address</Label>
              <textarea
                className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={form.address}
                onChange={(e) => set("address", e.target.value)}
                rows={2}
                aria-label="Address"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving || !form.name.trim()}>
              {isSaving ? "Saving..." : editing ? "Update" : "Add Supplier"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <ConfirmationModal
        open={!!deletingId}
        onOpenChange={(open) => { if (!open) setDeletingId(null) }}
        title="Deactivate Supplier"
        description="This will soft-delete the supplier. Existing stock and purchase order records are not affected."
        confirmLabel="Deactivate"
        variant="destructive"
        onConfirm={handleDelete}
        isLoading={deleteSupplier.isPending}
      />
    </div>
  )
}
