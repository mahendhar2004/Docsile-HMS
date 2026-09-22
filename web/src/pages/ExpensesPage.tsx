/**
 * ExpensesPage — placeholder.
 *
 * Phase 7 TODO: Implement expenses module UI:
 * - Categories CRUD (/expenses/categories) with reorder
 * - Seed default categories (POST /expenses/categories/seed)
 * - Expenses by date range (GET /expenses)
 * - Create/edit/delete expenses (POST/PATCH/DELETE /expenses)
 * Permissions: expenses:view, expenses:create, expenses:edit, expenses:delete, expenses:manage
 */
export default function ExpensesPage() {
  return (
    <main className="p-6">
      <h1 className="text-xl font-semibold text-foreground">Expenses</h1>
      <p className="text-sm text-muted-foreground mt-1">
        Phase 7 TODO: Hospital expense tracking by category and date range.
      </p>
    </main>
  )
}
