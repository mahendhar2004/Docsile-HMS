/**
 * insurance/companies-tab.tsx
 *
 * Insurance Companies CRUD tab — matches main's InsuranceCompanyManager.tsx:
 * a flat, unpaginated table of EVERY company (active + inactive), since this
 * is the management screen (not the active-only dropdown used elsewhere for
 * filing a new claim). Previously used the paginated, active-only `/insurance/
 * companies` endpoint here by mistake — once a company was deactivated it
 * permanently vanished from this screen with no way to find or reactivate it.
 * Switched to the same `?paginated=false` endpoint the create-claim dropdown
 * already uses (GET /insurance/companies?paginated=false, matching main's
 * real `getAllInsuranceCompanies()`), and dropped the pagination UI to match
 * main's own table (no page/pageSize footer there either).
 *
 * - DataTable listing all companies
 * - Inline add form (collapsible)
 * - Edit dialog
 * - Soft-delete (deactivate) confirmation + reactivate
 *
 * Permission: insurance:edit gates write actions
 */

import { useState } from "react"
import { Plus, Pencil, Trash2, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  DataTable,
  ConfirmationModal,
  EmptyState,
  ErrorState,
} from "@/components/patterns"
import type { ColumnDef } from "@/components/patterns"
import { usePermissions } from "@/hooks/usePermissions"
import {
  useInsuranceCompaniesAll,
  useCreateCompany,
  useUpdateCompany,
  useDeleteCompany,
} from "./hooks"
import type { InsuranceCompanyListItem, InsuranceCompanyBody } from "./types"

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
    isError,
    error,
    refetch,
  } = useInsuranceCompaniesAll()
  const companies = data ?? []

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
  const [editTarget, setEditTarget] = useState<InsuranceCompanyListItem | null>(null)
  const [editForm, setEditForm] = useState<InsuranceCompanyBody>(emptyForm())
  const updateMutation = useUpdateCompany(() => setEditTarget(null))

  function openEdit(company: InsuranceCompanyListItem) {
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

  // ── Delete (deactivate) confirmation ─────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<InsuranceCompanyListItem | null>(null)
  const deleteMutation = useDeleteCompany(() => setDeleteTarget(null))

  // ── Reactivate — main's InsuranceCompanyManager toggles the SAME action
  // button between deactivate/reactivate depending on current state; this
  // port split it into a dedicated edit dialog + a delete-only button, which
  // left no way back once a company was deactivated. Restores that missing
  // direction via the existing PATCH endpoint (already accepts `isActive`,
  // just never sent `true` from anywhere in this file).
  const reactivateMutation = useUpdateCompany()
  function handleReactivate(company: InsuranceCompanyListItem) {
    reactivateMutation.mutate({
      id: company.id,
      body: {
        name: company.name,
        tpaName: company.tpaName ?? undefined,
        contactNumber: company.contactNumber ?? undefined,
        email: company.email ?? undefined,
        address: company.address ?? undefined,
        isActive: true,
      },
    })
  }

  // ── Table columns ────────────────────────────────────────────────────────────
  const columns: ColumnDef<InsuranceCompanyListItem>[] = [
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
      // Literal Active/Inactive badge — matches main's InsuranceCompanyManager
      // exactly (`<Badge variant={c.isActive ? "success" : "muted"}>`).
      // Previously borrowed the shared bill-status map's PAID/CANCELLED
      // entries purely for their colors, which rendered the wrong text
      // ("Paid"/"Cancelled") for a company's active/inactive state.
      cell: (row) => (
        <Badge variant={row.isActive ? "success" : "muted"}>
          {row.isActive ? "Active" : "Inactive"}
        </Badge>
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

      {/* ── Companies table — flat/unpaginated, matches main's manager ────────── */}
      {isLoading ? (
        <div className="rounded-xl border border-border overflow-hidden" aria-label="Loading insurance companies">
          <div className="bg-muted/50 px-4 py-2.5 border-b border-border flex gap-8">
            {Array.from({ length: 5 }).map((_, i) => (
              // eslint-disable-next-line react/no-array-index-key
              <div key={i} className="h-3 w-20 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </div>
      ) : isError ? (
        <ErrorState title="Could not load companies" error={error} onRetry={refetch} />
      ) : companies.length === 0 ? (
        <EmptyState
          title="No insurance companies yet"
          description="Add your first TPA or insurer to start filing claims."
          action={
            canEdit
              ? { label: "Add Company", onClick: () => setShowAdd(true) }
              : undefined
          }
        />
      ) : (
        <DataTable
          data={companies}
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
                    {row.isActive ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteTarget(row)}
                        aria-label={`Deactivate ${row.name}`}
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleReactivate(row)}
                        disabled={reactivateMutation.isPending}
                        aria-label={`Reactivate ${row.name}`}
                        className="h-7 w-7 p-0 text-success hover:text-success"
                      >
                        <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                      </Button>
                    )}
                  </div>
                )
              : undefined
          }
          aria-label="Insurance companies table"
        />
      )}

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
