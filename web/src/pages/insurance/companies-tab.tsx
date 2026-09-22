/**
 * insurance/companies-tab.tsx
 *
 * Insurance Companies CRUD tab:
 * - PaginatedDataTable listing all companies
 * - Inline add form (collapsible)
 * - Edit dialog
 * - Soft-delete confirmation
 *
 * Permission: insurance:edit gates write actions
 */

import { useState } from "react"
import { Plus, Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  PaginatedDataTable,
  ConfirmationModal,
  EmptyState,
  StatusPill,
} from "@/components/patterns"
import type { ColumnDef } from "@/components/patterns"
import { usePermissions } from "@/hooks/usePermissions"
import {
  useInsuranceCompanies,
  useCreateCompany,
  useUpdateCompany,
  useDeleteCompany,
} from "./hooks"
import type { InsuranceCompany, InsuranceCompanyBody } from "./types"

// ─── Empty company form state ─────────────────────────────────────────────────

function emptyForm(): InsuranceCompanyBody {
  return { name: "", tpaName: "", contactNumber: "", email: "", address: "" }
}

// ─── CompaniesTab ─────────────────────────────────────────────────────────────

export function CompaniesTab() {
  const { can } = usePermissions()
  const canEdit = can("insurance:edit")

  const {
    data,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
    page,
    pageSize,
    total,
    setPage,
    setPageSize,
  } = useInsuranceCompanies()

  // ── Add inline form ──────────────────────────────────────────────────────────
  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState<InsuranceCompanyBody>(emptyForm())
  const createMutation = useCreateCompany(() => {
    setShowAdd(false)
    setAddForm(emptyForm())
  })

  function handleAddSubmit() {
    if (!addForm.name.trim()) return
    createMutation.mutate({
      name: addForm.name.trim(),
      tpaName: addForm.tpaName || undefined,
      contactNumber: addForm.contactNumber || undefined,
      email: addForm.email || undefined,
      address: addForm.address || undefined,
    })
  }

  // ── Edit dialog ──────────────────────────────────────────────────────────────
  const [editTarget, setEditTarget] = useState<InsuranceCompany | null>(null)
  const [editForm, setEditForm] = useState<InsuranceCompanyBody>(emptyForm())
  const updateMutation = useUpdateCompany(() => setEditTarget(null))

  function openEdit(company: InsuranceCompany) {
    setEditTarget(company)
    setEditForm({
      name: company.name,
      tpaName: company.tpaName ?? "",
      contactNumber: company.contactNumber ?? "",
      email: company.email ?? "",
      address: company.address ?? "",
    })
  }

  function handleEditSubmit() {
    if (!editTarget || !editForm.name.trim()) return
    updateMutation.mutate({
      id: editTarget.id,
      body: {
        name: editForm.name.trim(),
        tpaName: editForm.tpaName || undefined,
        contactNumber: editForm.contactNumber || undefined,
        email: editForm.email || undefined,
        address: editForm.address || undefined,
      },
    })
  }

  // ── Delete confirmation ──────────────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<InsuranceCompany | null>(null)
  const deleteMutation = useDeleteCompany(() => setDeleteTarget(null))

  // ── Table columns ────────────────────────────────────────────────────────────
  const columns: ColumnDef<InsuranceCompany>[] = [
    {
      key: "name",
      header: "Company Name",
      cell: (row) => <span className="font-medium">{row.name}</span>,
    },
    {
      key: "tpaName",
      header: "TPA",
      cell: (row) => (
        <span className="text-muted-foreground">{row.tpaName ?? "—"}</span>
      ),
    },
    {
      key: "contactNumber",
      header: "Contact",
      cell: (row) => (
        <span className="text-sm text-muted-foreground">
          {row.contactNumber ?? "—"}
        </span>
      ),
    },
    {
      key: "email",
      header: "Email",
      cell: (row) => (
        <span className="text-sm text-muted-foreground">{row.email ?? "—"}</span>
      ),
    },
    {
      key: "isActive",
      header: "Status",
      cell: (row) => (
        <StatusPill status={row.isActive ? "PAID" : "CANCELLED"} />
      ),
    },
  ]

  return (
    <div className="space-y-4">
      {/* ── Toolbar ──────────────────────────────────────────────────────────── */}
      {canEdit && (
        <div>
          {!showAdd ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowAdd(true)}
            >
              <Plus className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
              Add Company
            </Button>
          ) : (
            <div className="rounded-lg border border-border p-4 space-y-3 bg-muted/30">
              <p className="text-sm font-medium">New Insurance Company</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Company Name *</Label>
                  <Input
                    value={addForm.name}
                    onChange={(e) =>
                      setAddForm((f) => ({ ...f, name: e.target.value }))
                    }
                    placeholder="e.g. Star Health"
                    autoFocus
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">TPA Name</Label>
                  <Input
                    value={addForm.tpaName ?? ""}
                    onChange={(e) =>
                      setAddForm((f) => ({ ...f, tpaName: e.target.value }))
                    }
                    placeholder="e.g. Medi Assist"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Contact Number</Label>
                  <Input
                    value={addForm.contactNumber ?? ""}
                    onChange={(e) =>
                      setAddForm((f) => ({
                        ...f,
                        contactNumber: e.target.value,
                      }))
                    }
                    placeholder="Phone"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Email</Label>
                  <Input
                    type="email"
                    value={addForm.email ?? ""}
                    onChange={(e) =>
                      setAddForm((f) => ({ ...f, email: e.target.value }))
                    }
                    placeholder="email@example.com"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleAddSubmit}
                  disabled={!addForm.name.trim() || createMutation.isPending}
                >
                  {createMutation.isPending ? "Saving…" : "Add"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setShowAdd(false)
                    setAddForm(emptyForm())
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Companies table ───────────────────────────────────────────────────── */}
      <PaginatedDataTable
        mode="offset"
        data={data}
        columns={columns}
        variant={canEdit ? "with-row-actions" : "standard"}
        rowActions={
          canEdit
            ? (row) => (
                <div className="flex items-center justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEdit(row)}
                    aria-label={`Edit ${row.name}`}
                    className="h-7 w-7 p-0"
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteTarget(row)}
                    aria-label={`Deactivate ${row.name}`}
                    className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                </div>
              )
            : undefined
        }
        isLoading={isLoading}
        isFetching={isFetching}
        isError={isError}
        error={error}
        onRetry={refetch}
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        showPageSizeSelector
        emptyState={
          <EmptyState
            title="No insurance companies yet"
            description="Add your first TPA or insurer to start filing claims."
            action={
              canEdit
                ? { label: "Add Company", onClick: () => setShowAdd(true) }
                : undefined
            }
          />
        }
        aria-label="Insurance companies table"
      />

      {/* ── Edit dialog ───────────────────────────────────────────────────────── */}
      <Dialog open={editTarget != null} onOpenChange={(v) => !v && setEditTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Insurance Company</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs">Company Name *</Label>
              <Input
                value={editForm.name}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, name: e.target.value }))
                }
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">TPA Name</Label>
                <Input
                  value={editForm.tpaName ?? ""}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, tpaName: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Contact Number</Label>
                <Input
                  value={editForm.contactNumber ?? ""}
                  onChange={(e) =>
                    setEditForm((f) => ({
                      ...f,
                      contactNumber: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Email</Label>
                <Input
                  type="email"
                  value={editForm.email ?? ""}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, email: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Address</Label>
                <Input
                  value={editForm.address ?? ""}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, address: e.target.value }))
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditTarget(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleEditSubmit}
              disabled={!editForm.name.trim() || updateMutation.isPending}
            >
              {updateMutation.isPending ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete confirmation ───────────────────────────────────────────────── */}
      <ConfirmationModal
        open={deleteTarget != null}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        variant="destructive"
        title="Deactivate company?"
        description={`"${deleteTarget?.name ?? ""}" will be marked inactive and hidden from new claim forms.`}
        confirmLabel="Deactivate"
        isLoading={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id)
        }}
      />
    </div>
  )
}
