/**
 * labs/labs-tab.tsx
 *
 * Lab CRUD tab — list, create, edit, delete, configure investigations.
 *
 * Permission gates:
 *   labs:view   — viewing the list
 *   labs:config — create, edit, delete, configure investigation assignments
 */

import { useState } from "react"
import {
  Plus,
  Pencil,
  Settings2,
  Trash2,
  MapPin,
  FlaskConical,
} from "lucide-react"
import { usePermissions } from "@/hooks/usePermissions"
import { Button } from "@/components/ui/button"
import { IconButton } from "@/components/ui/icon-button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { DataTable, EmptyState, ErrorState, ConfirmationModal } from "@/components/patterns"
import type { ColumnDef } from "@/components/patterns"
import { useLabsList, useDeleteLab } from "./hooks"
import { LabForm } from "./lab-form"
import { InvestigationAssignmentForm } from "./investigation-assignment-form"
import type { Lab } from "./types"

export function LabsTab() {
  const { can } = usePermissions()

  // ── Data ──────────────────────────────────────────────────────────────────────
  const { data: labs, isLoading, error, refetch } = useLabsList()
  const deleteLab = useDeleteLab()

  // ── UI state ──────────────────────────────────────────────────────────────────
  const [formOpen, setFormOpen] = useState(false)
  const [editingLab, setEditingLab] = useState<Lab | null>(null)
  const [deletingLab, setDeletingLab] = useState<Lab | null>(null)
  /** When set, replaces the table with InvestigationAssignmentForm. */
  const [configuringLabId, setConfiguringLabId] = useState<string | null>(null)

  // ── Show investigation config if a lab is being configured ───────────────────
  if (configuringLabId) {
    return (
      <div className="space-y-4">
        <InvestigationAssignmentForm
          labId={configuringLabId}
          onBack={() => setConfiguringLabId(null)}
        />
      </div>
    )
  }

  // ── Column definitions ────────────────────────────────────────────────────────
  const columns: ColumnDef<Lab>[] = [
    {
      key: "name",
      header: "Lab Name",
      cell: (lab) => <span className="font-medium">{lab.name}</span>,
    },
    {
      key: "description",
      header: "Description",
      cell: (lab) => (
        <span className="text-sm text-muted-foreground">
          {lab.description ?? "—"}
        </span>
      ),
    },
    {
      key: "location",
      header: "Location",
      cell: (lab) =>
        lab.location ? (
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {lab.location}
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        ),
    },
    {
      key: "status",
      header: "Status",
      cell: (lab) => (
        <Badge variant={lab.isActive ? "success" : "secondary"}>
          {lab.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
  ]

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">
            Lab Configuration
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage labs and their investigation mappings
          </p>
        </div>
        {can("labs:config") && (
          <Button
            size="sm"
            onClick={() => {
              setEditingLab(null)
              setFormOpen(true)
            }}
          >
            <Plus className="h-4 w-4 mr-1" aria-hidden="true" />
            Add Lab
          </Button>
        )}
      </div>

      {/* Loading skeleton */}
      {isLoading && (
        <div className="rounded-[var(--radius-lg)] bg-[var(--color-card)] shadow-[var(--shadow-card)] overflow-hidden">
          <div className="bg-muted/50 px-4 py-2.5 border-b border-border flex gap-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-3 w-20" />
            ))}
          </div>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex gap-8 px-4 py-3 border-b border-border last:border-0">
              {Array.from({ length: 4 }).map((_, j) => (
                <Skeleton key={j} className="h-4 flex-1" />
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Error state */}
      {!isLoading && error && (
        <ErrorState
          title="Could not load labs"
          error={error}
          onRetry={() => void refetch()}
        />
      )}

      {/* Empty state */}
      {!isLoading && !error && labs?.length === 0 && (
        <EmptyState
          title="No labs configured yet"
          description="Add your first lab to get started with investigation billing."
          icon={<FlaskConical className="h-8 w-8" aria-hidden="true" />}
          action={
            can("labs:config")
              ? {
                  label: "Add Lab",
                  onClick: () => {
                    setEditingLab(null)
                    setFormOpen(true)
                  },
                }
              : undefined
          }
        />
      )}

      {/* Labs table */}
      {!isLoading && !error && labs && labs.length > 0 && (
        <DataTable
          aria-label="Labs list"
          data={labs}
          columns={columns}
          variant="with-row-actions"
          rowActions={(lab) => (
            <div className="flex items-center justify-end gap-1">
              {can("labs:config") && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConfiguringLabId(lab.id)}
                  className="text-xs"
                  aria-label={`Configure investigations for ${lab.name}`}
                >
                  <Settings2 className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
                  Configure
                </Button>
              )}
              {can("labs:config") && (
                <IconButton
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditingLab(lab)
                    setFormOpen(true)
                  }}
                  aria-label={`Edit ${lab.name}`}
                >
                  <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                </IconButton>
              )}
              {can("labs:config") && (
                <IconButton
                  variant="destructive"
                  size="sm"
                  onClick={() => setDeletingLab(lab)}
                  aria-label={`Delete ${lab.name}`}
                  className="bg-transparent hover:bg-destructive/10 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                </IconButton>
              )}
            </div>
          )}
        />
      )}

      {/* Create / edit lab dialog */}
      <LabForm
        open={formOpen}
        lab={editingLab}
        onClose={() => {
          setFormOpen(false)
          setEditingLab(null)
        }}
      />

      {/* Delete confirmation */}
      <ConfirmationModal
        open={!!deletingLab}
        onOpenChange={(open) => {
          if (!open) setDeletingLab(null)
        }}
        variant="destructive"
        title="Delete Lab"
        description={
          deletingLab
            ? `Are you sure you want to delete "${deletingLab.name}"? This cannot be undone. Labs with existing bills cannot be deleted — deactivate them instead.`
            : undefined
        }
        confirmLabel="Delete"
        onConfirm={() => {
          if (deletingLab) {
            deleteLab.mutate(deletingLab.id, {
              onSettled: () => setDeletingLab(null),
            })
          }
        }}
        isLoading={deleteLab.isPending}
      />
    </>
  )
}
