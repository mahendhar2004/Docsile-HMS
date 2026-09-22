/**
 * CategoryManagerDialog — expense category CRUD with drag-to-reorder.
 *
 * UI pattern matches old app (src/app/(hospital)/expenses/components/CategoryManager.tsx):
 *   - Draggable rows with GripVertical handle (HTML5 drag API).
 *   - Inline edit row replaces display row.
 *   - Color picker (native <input type="color">) + preset swatches.
 *   - Inline "Add Category" form at the bottom.
 *   - "Seed Defaults" button (x-permission: expenses:edit, idempotent).
 *   - Delete with ConfirmationModal (API returns 409 if expenses are linked).
 *
 * Permissions:
 *   expenses:edit — create, update, delete, reorder, seed (gated via canEdit prop)
 */

import { useState } from "react"
import { GripVertical, Plus, Pencil, Check, X, Trash2, Loader2, Sprout } from "lucide-react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ConfirmationModal } from "@/components/patterns"
import {
  useCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  useReorderCategories,
  useSeedCategories,
} from "./hooks"
import type { ExpenseCategory } from "./types"

// ─── Constants ────────────────────────────────────────────────────────────────

const PRESET_COLORS = [
  "#EF4444", "#F59E0B", "#10B981", "#3B82F6", "#8B5CF6",
  "#EC4899", "#06B6D4", "#F97316", "#6366F1", "#6B7280",
  "#14B8A6", "#84CC16", "#E11D48", "#7C3AED", "#0EA5E9",
]

// ─── Props ────────────────────────────────────────────────────────────────────

interface CategoryManagerDialogProps {
  onClose: () => void
  canEdit: boolean
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CategoryManagerDialog({ onClose, canEdit }: CategoryManagerDialogProps) {
  const { data: serverCategories = [], isLoading, error } = useCategories()

  // Local working copy for drag-reorder (preview before commit)
  const [items, setItems] = useState<ExpenseCategory[]>([])
  const [isSyncedFromServer, setIsSyncedFromServer] = useState(false)

  // Sync from server once, then manage locally
  if (!isSyncedFromServer && serverCategories.length > 0) {
    setItems(serverCategories)
    setIsSyncedFromServer(true)
  }
  // Also update if server data changes (e.g. after create/delete)
  const syncedIds = items.map((i) => i.id).join(",")
  const serverIds = serverCategories.map((i) => i.id).join(",")
  if (isSyncedFromServer && syncedIds !== serverIds) {
    setItems(serverCategories)
  }

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [editColor, setEditColor] = useState("")

  // Add state
  const [isAdding, setIsAdding] = useState(false)
  const [newName, setNewName] = useState("")
  const [newColor, setNewColor] = useState("#3B82F6")

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<ExpenseCategory | null>(null)

  // Drag state
  const [dragIdx, setDragIdx] = useState<number | null>(null)

  const createMutation = useCreateCategory()
  const updateMutation = useUpdateCategory()
  const deleteMutation = useDeleteCategory()
  const reorderMutation = useReorderCategories()
  const seedMutation = useSeedCategories()

  // ── Edit handlers ──────────────────────────────────────────────────────────

  function startEdit(cat: ExpenseCategory) {
    setEditingId(cat.id)
    setEditName(cat.name)
    setEditColor(cat.color)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditName("")
    setEditColor("")
  }

  async function saveEdit() {
    if (!editingId || !editName.trim()) return
    try {
      await updateMutation.mutateAsync({
        id: editingId,
        input: { name: editName.trim(), color: editColor },
      })
      toast.success("Category updated")
      cancelEdit()
    } catch {
      toast.error("Failed to update category")
    }
  }

  // ── Add handlers ───────────────────────────────────────────────────────────

  async function handleAdd() {
    if (!newName.trim()) return
    try {
      await createMutation.mutateAsync({ name: newName.trim(), color: newColor })
      toast.success("Category added")
      setNewName("")
      setNewColor("#3B82F6")
      setIsAdding(false)
    } catch {
      toast.error("Failed to add category")
    }
  }

  // ── Delete handlers ────────────────────────────────────────────────────────

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await deleteMutation.mutateAsync(deleteTarget.id)
      toast.success("Category deleted")
      setDeleteTarget(null)
    } catch {
      toast.error(
        "Cannot delete — expenses are linked to this category. Remove linked expenses first.",
      )
      setDeleteTarget(null)
    }
  }

  // ── Drag handlers ──────────────────────────────────────────────────────────

  function handleDragStart(idx: number) {
    setDragIdx(idx)
  }

  function handleDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault()
    if (dragIdx === null || dragIdx === idx) return
    const next = [...items]
    const [dragged] = next.splice(dragIdx, 1)
    next.splice(idx, 0, dragged)
    setItems(next)
    setDragIdx(idx)
  }

  async function handleDragEnd() {
    setDragIdx(null)
    // Persist new order: { order: [{ id, sortOrder }] }
    try {
      await reorderMutation.mutateAsync({
        order: items.map((item, i) => ({ id: item.id, sortOrder: i })),
      })
    } catch {
      toast.error("Failed to save new category order")
    }
  }

  // ── Seed handler ───────────────────────────────────────────────────────────

  async function handleSeed() {
    try {
      await seedMutation.mutateAsync()
      toast.success("Default categories seeded")
    } catch {
      toast.error("Failed to seed default categories")
    }
  }

  // ── Color preset helper ────────────────────────────────────────────────────

  function applyPresetColor(color: string) {
    if (editingId) setEditColor(color)
    else setNewColor(color)
  }

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <>
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Expense Categories</DialogTitle>
          </DialogHeader>

          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {error && !isLoading && (
            <p className="text-sm text-destructive text-center py-4">
              Failed to load categories
            </p>
          )}

          {!isLoading && !error && (
            <>
              {/* Category list */}
              <div className="space-y-1">
                {items.map((cat, idx) => (
                  <div
                    key={cat.id}
                    draggable={canEdit}
                    onDragStart={() => handleDragStart(idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDragEnd={() => void handleDragEnd()}
                    className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-muted/50 group"
                  >
                    {canEdit && (
                      <GripVertical
                        className="h-4 w-4 text-muted-foreground/50 cursor-grab shrink-0"
                        aria-hidden="true"
                      />
                    )}

                    {editingId === cat.id ? (
                      <>
                        <input
                          type="color"
                          value={editColor}
                          onChange={(e) => setEditColor(e.target.value)}
                          className="h-7 w-7 rounded border-0 cursor-pointer shrink-0"
                          aria-label="Category color"
                        />
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="h-8 text-sm flex-1"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") void saveEdit()
                            if (e.key === "Escape") cancelEdit()
                          }}
                          aria-label="Category name"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => void saveEdit()}
                          disabled={updateMutation.isPending}
                          aria-label="Save"
                        >
                          <Check className="h-4 w-4 text-green-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={cancelEdit}
                          aria-label="Cancel"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <span
                          className="h-4 w-4 rounded-full shrink-0"
                          style={{ backgroundColor: cat.color }}
                          aria-hidden="true"
                        />
                        <span className="text-sm font-medium flex-1">{cat.name}</span>
                        {canEdit && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100"
                              onClick={() => startEdit(cat)}
                              aria-label={`Edit ${cat.name}`}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
                              onClick={() => setDeleteTarget(cat)}
                              aria-label={`Delete ${cat.name}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                      </>
                    )}
                  </div>
                ))}

                {items.length === 0 && !isLoading && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No categories yet. Add one or seed defaults.
                  </p>
                )}
              </div>

              {/* Add new category */}
              {canEdit && (
                <>
                  {isAdding ? (
                    <div className="flex items-center gap-2 px-2 pt-2 border-t">
                      <input
                        type="color"
                        value={newColor}
                        onChange={(e) => setNewColor(e.target.value)}
                        className="h-7 w-7 rounded border-0 cursor-pointer shrink-0"
                        aria-label="New category color"
                      />
                      <Input
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="Category name"
                        className="h-8 text-sm flex-1"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") void handleAdd()
                          if (e.key === "Escape") setIsAdding(false)
                        }}
                        aria-label="New category name"
                      />
                      <Button
                        size="sm"
                        onClick={() => void handleAdd()}
                        disabled={createMutation.isPending || !newName.trim()}
                      >
                        Add
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsAdding(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <div className="pt-2 border-t flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => setIsAdding(true)}
                      >
                        <Plus className="h-4 w-4 mr-1.5" aria-hidden="true" />
                        Add Category
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void handleSeed()}
                        disabled={seedMutation.isPending}
                        title="Seed default hospital expense categories"
                        aria-label="Seed default categories"
                      >
                        {seedMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                        ) : (
                          <Sprout className="h-4 w-4" aria-hidden="true" />
                        )}
                        <span className="ml-1.5">Seed Defaults</span>
                      </Button>
                    </div>
                  )}
                </>
              )}

              {/* Color presets */}
              <div className="flex flex-wrap gap-1.5 pt-2">
                <span className="text-xs text-muted-foreground mr-1 self-center">
                  Quick colors:
                </span>
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className="h-5 w-5 rounded-full border border-border hover:scale-110 transition-transform"
                    style={{ backgroundColor: color }}
                    onClick={() => applyPresetColor(color)}
                    aria-label={`Select color ${color}`}
                  />
                ))}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <ConfirmationModal
        open={deleteTarget !== null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}
        variant="destructive"
        title="Delete Category"
        description={
          deleteTarget
            ? `Delete "${deleteTarget.name}"? This will fail if any expenses are linked to it.`
            : undefined
        }
        confirmLabel="Delete"
        onConfirm={() => void handleDelete()}
        isLoading={deleteMutation.isPending}
      />
    </>
  )
}
