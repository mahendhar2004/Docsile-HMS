/**
 * MedicinesTab — medicine master CRUD.
 * Permissions: view = pharmacy:view, create/edit/delete = pharmacy:manage_stock
 */

import { useState } from "react"
import { Plus, MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"
import {
  DataTable,
  EmptyState,
  ErrorState,
  ConfirmationModal,
  SearchBar,
} from "@/components/patterns"
import type { ColumnDef } from "@/components/patterns"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { usePermissions } from "@/hooks/usePermissions"
import {
  useMedicines,
  useCreateMedicine,
  useUpdateMedicine,
  useDeleteMedicine,
} from "./hooks"
import type { PharmacyMedicine } from "./types"
import { MedicineForm } from "./medicine-form"

export function MedicinesTab() {
  const { can } = usePermissions()
  const canManage = can("pharmacy:manage_stock")

  const { data: medicines, isLoading, error, refetch } = useMedicines()
  const createMedicine = useCreateMedicine()
  const updateMedicine = useUpdateMedicine()
  const deleteMedicine = useDeleteMedicine()

  const [search, setSearch] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<PharmacyMedicine | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const filtered = (medicines ?? []).filter((m) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      m.name.toLowerCase().includes(q) ||
      (m.genericName?.toLowerCase().includes(q) ?? false) ||
      (m.manufacturer?.toLowerCase().includes(q) ?? false) ||
      (m.category?.toLowerCase().includes(q) ?? false)
    )
  })

  const columns: ColumnDef<PharmacyMedicine>[] = [
    {
      key: "name",
      header: "Name",
      cell: (row) => (
        <div>
          <p className="font-medium text-sm">{row.name}</p>
          {row.genericName && (
            <p className="text-xs text-muted-foreground">{row.genericName}</p>
          )}
          {row.manufacturer && (
            <p className="text-xs text-muted-foreground">{row.manufacturer}</p>
          )}
        </div>
      ),
    },
    {
      key: "category",
      header: "Category",
      cell: (row) =>
        row.category ? (
          <Badge variant="outline" className="text-xs">
            {row.category}
          </Badge>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        ),
    },
    {
      key: "strength",
      header: "Strength",
      cell: (row) => (
        <span className="text-xs text-muted-foreground">{row.strength ?? "—"}</span>
      ),
    },
    {
      key: "unitOfMeasure",
      header: "Unit",
      cell: (row) => (
        <span className="text-xs text-muted-foreground">{row.unitOfMeasure}</span>
      ),
    },
    {
      key: "gstPercent",
      header: "GST %",
      align: "right",
      cell: (row) => (
        <span className="text-xs text-muted-foreground">
          {row.gstPercent}%
        </span>
      ),
    },
    {
      key: "scheduleType",
      header: "Schedule",
      cell: (row) =>
        row.scheduleType ? (
          <Badge variant="secondary" className="text-xs">
            {row.scheduleType}
          </Badge>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        ),
    },
  ]

  if (canManage) {
    columns.push({
      key: "actions",
      header: "",
      align: "center",
      cell: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              aria-label={`Actions for ${row.name}`}
            >
              <MoreHorizontal className="h-4 w-4" aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onSelect={() => {
                setEditing(row)
                setShowForm(true)
              }}
            >
              <Pencil className="h-3.5 w-3.5 mr-2" aria-hidden />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onSelect={() => setDeletingId(row.id)}
            >
              <Trash2 className="h-3.5 w-3.5 mr-2" aria-hidden />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    })
  }

  const handleConfirmDelete = () => {
    if (!deletingId) return
    deleteMedicine.mutate(deletingId, {
      onSuccess: () => {
        toast.success("Medicine deleted")
        setDeletingId(null)
      },
      onError: (err) => {
        toast.error(err instanceof Error ? err.message : "Failed to delete medicine")
      },
    })
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-md" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <ErrorState
        title="Could not load medicines"
        error={error}
        onRetry={() => void refetch()}
      />
    )
  }

  return (
    <div className="space-y-4">
      {/* Toolbar — plain flex row, matches main's exact Medicines tab search & actions row. */}
      <div className="flex items-center gap-3">
        <SearchBar
          variant="standalone"
          value={search}
          onChange={setSearch}
          placeholder="Search by name, generic, manufacturer..."
          aria-label="Search medicines"
          className="flex-1 max-w-sm"
        />
        {canManage && (
          <Button
            size="sm"
            className="ml-auto"
            onClick={() => {
              setEditing(null)
              setShowForm(true)
            }}
          >
            <Plus className="h-4 w-4 mr-1.5" aria-hidden="true" />
            Add Medicine
          </Button>
        )}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <EmptyState
          title="No medicines found"
          description={
            search
              ? "No medicines match your search. Try a different term."
              : "Add medicines to the master list to get started."
          }
          action={
            canManage
              ? {
                  label: "Add Medicine",
                  onClick: () => {
                    setEditing(null)
                    setShowForm(true)
                  },
                }
              : undefined
          }
        />
      ) : (
        <DataTable columns={columns} data={filtered} />
      )}

      {/* Create / Edit form */}
      {showForm && (
        <MedicineForm
          medicine={editing}
          open={showForm}
          onOpenChange={(open) => {
            setShowForm(open)
            if (!open) setEditing(null)
          }}
          onSubmit={(values) => {
            if (editing) {
              updateMedicine.mutate(
                { id: editing.id, body: values },
                {
                  onSuccess: () => {
                    toast.success("Medicine updated")
                    setShowForm(false)
                    setEditing(null)
                  },
                  onError: (err) => {
                    toast.error(err instanceof Error ? err.message : "Failed to update medicine")
                  },
                },
              )
            } else {
              createMedicine.mutate(values, {
                onSuccess: () => {
                  toast.success("Medicine added to master list")
                  setShowForm(false)
                },
                onError: (err) => {
                  toast.error(err instanceof Error ? err.message : "Failed to add medicine")
                },
              })
            }
          }}
          isPending={createMedicine.isPending || updateMedicine.isPending}
        />
      )}

      {/* Delete confirmation */}
      <ConfirmationModal
        open={!!deletingId}
        onOpenChange={(open) => { if (!open) setDeletingId(null) }}
        title="Delete Medicine"
        description="This will soft-delete the medicine from the master list. Existing stock entries are not affected."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleConfirmDelete}
        isLoading={deleteMedicine.isPending}
      />
    </div>
  )
}
