/**
 * ExpensesPage — hospital expense tracking by category and date range.
 *
 * Endpoints:
 *   GET  /expenses/categories          → ExpenseCategory[]         (expenses:view)
 *   POST /expenses/categories          → category creation          (expenses:edit)
 *   PATCH /expenses/categories/{id}    → category update            (expenses:edit)
 *   DELETE /expenses/categories/{id}  → category delete            (expenses:edit)
 *   PATCH /expenses/categories/reorder → bulk sortOrder update      (expenses:edit)
 *   POST /expenses/categories/seed    → seed default categories    (expenses:edit)
 *   GET  /expenses?startDate=&endDate= → ExpenseWithCategory[]      (expenses:view)
 *   POST /expenses                    → create expense              (expenses:create)
 *   PATCH /expenses/{id}              → update expense              (expenses:edit)
 *   DELETE /expenses/{id}            → delete expense              (expenses:delete)
 *
 * Permissions: expenses:view, expenses:create, expenses:edit, expenses:delete
 * NOTE: expenses:manage does NOT exist — the placeholder stub was wrong.
 * Use expenses:edit for category management and expenses:delete for expense deletion.
 */

import { useRef, useState } from "react"
import { Settings2, Plus } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { PageHeader, ConfirmationModal, ErrorState } from "@/components/patterns"
import { usePermissions } from "@/hooks/usePermissions"
import { useDeleteExpense } from "./expenses/hooks"
import { CategoryManagerDialog } from "./expenses/category-manager"
import { ExpenseFormDialog } from "./expenses/expense-form"
import { ExpensesSection, type ExpensesSectionHandle } from "./expenses/expenses-section"
import type { ExpenseWithCategory } from "./expenses/types"

export default function ExpensesPage() {
  const { can } = usePermissions()

  // ── Permission checks (all called unconditionally — early return comes after)
  const hasAccess = can("expenses:view")
  const canCreate = can("expenses:create")
  const canEdit = can("expenses:edit")
  const canDelete = can("expenses:delete")

  // ── Modal state ──────────────────────────────────────────────────────────────
  const [showCategoryManager, setShowCategoryManager] = useState(false)
  const [expenseFormTarget, setExpenseFormTarget] = useState<
    ExpenseWithCategory | null | "new"
  >(null)
  const [deleteTarget, setDeleteTarget] = useState<ExpenseWithCategory | null>(null)

  const deleteMutation = useDeleteExpense()
  const sectionRef = useRef<ExpensesSectionHandle>(null)

  // ── Permission gate ──────────────────────────────────────────────────────────
  if (!hasAccess) {
    return (
      <main>
        <ErrorState
          title="Access denied"
          description="You need the expenses:view permission to view this page. Contact your administrator."
        />
      </main>
    )
  }

  // ── Handlers ─────────────────────────────────────────────────────────────────

  async function handleDeleteConfirm() {
    if (!deleteTarget) return
    try {
      await deleteMutation.mutateAsync(deleteTarget.id)
      toast.success("Expense deleted successfully")
      setDeleteTarget(null)
    } catch {
      toast.error("Failed to delete expense")
      setDeleteTarget(null)
    }
  }

  const isEditing =
    expenseFormTarget !== null && expenseFormTarget !== "new"

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <main className="space-y-0">
      <PageHeader
        title="Expenses"
        onRefresh={() => sectionRef.current?.refetch()}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCategoryManager(true)}
              aria-label="Manage expense categories"
            >
              <Settings2 className="h-4 w-4 mr-1.5" aria-hidden="true" />
              Categories
            </Button>
            {canCreate && (
              <Button
                size="sm"
                onClick={() => setExpenseFormTarget("new")}
                aria-label="Add a new expense"
              >
                <Plus className="h-4 w-4 mr-1.5" aria-hidden="true" />
                Add Expense
              </Button>
            )}
          </div>
        }
      />

      <div className="mt-4">
        <ExpensesSection
          ref={sectionRef}
          canEdit={canEdit}
          canDelete={canDelete}
          onEdit={(expense) => setExpenseFormTarget(expense)}
          onDelete={(expense) => setDeleteTarget(expense)}
        />
      </div>

      {/* Category manager dialog */}
      {showCategoryManager && (
        <CategoryManagerDialog
          onClose={() => setShowCategoryManager(false)}
          canEdit={canEdit}
        />
      )}

      {/* Expense create / edit dialog */}
      {expenseFormTarget !== null && (
        <ExpenseFormDialog
          expense={isEditing ? (expenseFormTarget as ExpenseWithCategory) : null}
          onClose={() => setExpenseFormTarget(null)}
          onSuccess={() => setExpenseFormTarget(null)}
        />
      )}

      {/* Delete expense confirmation */}
      <ConfirmationModal
        open={deleteTarget !== null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}
        variant="destructive"
        title="Delete Expense"
        description={
          deleteTarget
            ? `Delete "${deleteTarget.title}"? This action cannot be undone.`
            : undefined
        }
        confirmLabel="Delete"
        onConfirm={() => void handleDeleteConfirm()}
        isLoading={deleteMutation.isPending}
      />
    </main>
  )
}
