/**
 * ExpenseFormDialog — create or edit an expense.
 *
 * Fields match src/app/(hospital)/expenses/components/ExpenseForm.tsx exactly:
 *   title (required), amount (required, >0), categoryId (required),
 *   date (required, max=today), reason (optional).
 *
 * Note: paymentMode is NOT included in the form — matches old app (displayed
 * in the list if present, but not user-editable via this form).
 *
 * Permissions:
 *   expenses:create — POST /expenses
 *   expenses:edit   — PATCH /expenses/{id}
 */

import { useState } from "react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { CurrencyInput, SingleSelect } from "@/components/patterns"
import { todayISO } from "@/lib/utils"
import { useCategories, useCreateExpense, useUpdateExpense } from "./hooks"
import type { ExpenseWithCategory } from "./types"

// ─── Props ────────────────────────────────────────────────────────────────────

interface ExpenseFormDialogProps {
  /** If provided, the form will edit this expense (PATCH); otherwise create (POST). */
  expense?: ExpenseWithCategory | null
  onClose: () => void
  onSuccess: () => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ExpenseFormDialog({ expense, onClose, onSuccess }: ExpenseFormDialogProps) {
  const isEdit = expense != null

  const { data: categories = [] } = useCategories()

  const [title, setTitle] = useState(expense?.title ?? "")
  const [amount, setAmount] = useState(expense?.amount ?? 0)
  const [categoryId, setCategoryId] = useState(
    expense?.categoryId ?? (categories[0]?.id ?? ""),
  )
  const [date, setDate] = useState(
    expense?.date
      ? expense.date.slice(0, 10) // date field is already YYYY-MM-DD from API
      : todayISO(),
  )
  const [reason, setReason] = useState(expense?.reason ?? "")
  const [errors, setErrors] = useState<Record<string, string>>({})

  const createMutation = useCreateExpense()
  const updateMutation = useUpdateExpense()
  const isSaving = createMutation.isPending || updateMutation.isPending

  // Default categoryId once categories load (only when creating and no initial value)
  if (!isEdit && categoryId === "" && categories.length > 0) {
    setCategoryId(categories[0].id)
  }

  const categoryOptions = categories.map((c) => ({ value: c.id, label: c.name }))

  function validate(): boolean {
    const errs: Record<string, string> = {}
    if (!title.trim()) errs.title = "Expense title is required"
    if (!amount || amount <= 0) errs.amount = "Please enter a valid amount"
    if (!categoryId) errs.category = "Category is required"
    if (!date) errs.date = "Date is required"
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    const input = {
      title: title.trim(),
      categoryId,
      amount,
      date,
      reason: reason.trim() || undefined,
    }

    try {
      if (isEdit && expense) {
        await updateMutation.mutateAsync({ id: expense.id, input })
        toast.success("Expense updated successfully")
      } else {
        await createMutation.mutateAsync(input)
        toast.success("Expense added successfully")
      }
      onSuccess()
    } catch {
      toast.error(isEdit ? "Failed to update expense" : "Failed to add expense")
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Expense" : "Add New Expense"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          {/* Expense Title */}
          <div className="space-y-1.5">
            <Label htmlFor="expense-title" className="text-sm font-medium">
              Expense Title <span className="text-destructive" aria-hidden="true">*</span>
            </Label>
            <Input
              id="expense-title"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value)
                setErrors((p) => ({ ...p, title: "" }))
              }}
              placeholder="Enter expense title"
              className={errors.title ? "border-destructive" : ""}
              aria-invalid={errors.title ? true : undefined}
              aria-describedby={errors.title ? "title-error" : undefined}
            />
            {errors.title && (
              <p id="title-error" className="text-sm text-destructive">
                {errors.title}
              </p>
            )}
          </div>

          {/* Amount */}
          <div className="space-y-1.5">
            <Label htmlFor="expense-amount" className="text-sm font-medium">
              Amount (₹) <span className="text-destructive" aria-hidden="true">*</span>
            </Label>
            <CurrencyInput
              id="expense-amount"
              value={amount}
              onChange={(v) => {
                setAmount(v)
                setErrors((p) => ({ ...p, amount: "" }))
              }}
              placeholder="0"
              hasError={!!errors.amount}
              aria-label="Expense amount in rupees"
            />
            {errors.amount && (
              <p id="amount-error" className="text-sm text-destructive">
                {errors.amount}
              </p>
            )}
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              Category <span className="text-destructive" aria-hidden="true">*</span>
            </Label>
            <SingleSelect
              options={categoryOptions}
              value={categoryId}
              onChange={(v) => {
                setCategoryId(v)
                setErrors((p) => ({ ...p, category: "" }))
              }}
              placeholder="Select category"
              error={!!errors.category}
              aria-label="Expense category"
            />
            {errors.category && (
              <p className="text-sm text-destructive">{errors.category}</p>
            )}
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <Label htmlFor="expense-date" className="text-sm font-medium">
              Date of Expense <span className="text-destructive" aria-hidden="true">*</span>
            </Label>
            <Input
              id="expense-date"
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value)
                setErrors((p) => ({ ...p, date: "" }))
              }}
              max={todayISO()}
              className={errors.date ? "border-destructive" : ""}
              aria-invalid={errors.date ? true : undefined}
            />
            {errors.date && (
              <p className="text-sm text-destructive">{errors.date}</p>
            )}
          </div>

          {/* Reason (Optional) */}
          <div className="space-y-1.5">
            <Label htmlFor="expense-reason" className="text-sm font-medium">
              Reason{" "}
              <span className="text-muted-foreground font-normal">(Optional)</span>
            </Label>
            <Textarea
              id="expense-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter reason for expense"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving
                ? "Saving…"
                : isEdit
                  ? "Update Expense"
                  : "Add Expense"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
