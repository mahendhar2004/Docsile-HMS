/**
 * Expenses service — business layer.
 *
 * Orchestrates all business rules for the expenses module. No framework or
 * transport concerns here — only decisions, guards, and delegation to the
 * data-access layer.
 */
import { getSupabaseClient } from '../_shared/supabase-client.ts';
import type { Session } from '../_shared/auth.ts';
import { NotFoundError, ConflictError } from '../_shared/errors.ts';
import { ExpensesRepository } from './repository.ts';
import type {
  ExpenseCategoryInput,
  ExpenseCategoryRow,
  ExpenseInput,
  ExpenseRow,
  ExpenseListQuery,
} from './types.ts';

/**
 * Default categories seeded for a new hospital.
 * Names and colors match the old Next.js seedDefaultCategories exactly.
 */
const DEFAULT_CATEGORIES: Array<{ name: string; color: string }> = [
  { name: 'Stationary', color: 'rgba(59, 130, 246, 0.7)' },
  { name: 'Discount', color: 'rgba(80, 25, 25, 0.7)' },
  { name: 'House Keeping', color: 'rgba(16, 185, 129, 0.7)' },
  { name: "DR's & RMP's", color: 'rgba(244, 63, 94, 0.7)' },
  { name: 'Lab', color: 'rgba(249, 115, 22, 0.7)' },
  { name: 'Salaries', color: 'rgba(139, 92, 246, 0.7)' },
  { name: 'Medicine', color: 'rgba(236, 72, 153, 0.7)' },
  { name: 'Opticals', color: 'rgba(20, 184, 166, 0.7)' },
  { name: 'Maintenance', color: 'rgba(125, 156, 40, 0.7)' },
  { name: 'Other', color: 'rgba(161, 161, 170, 0.7)' },
];

function makeRepo(session: Session): ExpensesRepository {
  return new ExpensesRepository(getSupabaseClient(), session.hospitalId);
}

// ── Category endpoints ────────────────────────────────────────────────────────

/**
 * POST /expenses/categories/seed — expenses:edit
 *
 * Idempotent: if this hospital already has any ExpenseCategory rows, the
 * function returns immediately without inserting anything. Safe to call
 * multiple times (e.g. from setup flows or re-provisioning).
 */
export async function seedCategories(session: Session): Promise<void> {
  const repo = makeRepo(session);
  const existing = await repo.countCategories();
  if (existing > 0) return; // Already seeded for this hospital — no-op

  const now = new Date().toISOString();
  const rows = DEFAULT_CATEGORIES.map((cat, i) => ({
    name: cat.name,
    color: cat.color,
    sortOrder: i,
    hospital_id: session.hospitalId,
    createdBy: session.id,
    createdAt: now,
    updatedAt: now,
  }));
  await repo.bulkInsertCategories(rows);
}

/**
 * GET /expenses/categories — expenses:view
 *
 * Returns all active categories for this hospital, ordered by sortOrder ASC,
 * name ASC (matching old getCategories exactly).
 */
export async function listCategories(session: Session): Promise<ExpenseCategoryRow[]> {
  return makeRepo(session).findAllCategories();
}

/**
 * POST /expenses/categories — expenses:edit
 *
 * Appends the new category after the current highest sortOrder.
 * Throws 409 ConflictError if a category with the same name already exists
 * for this hospital.
 */
export async function createCategory(
  session: Session,
  body: ExpenseCategoryInput,
): Promise<ExpenseCategoryRow> {
  const repo = makeRepo(session);
  const maxSort = await repo.findMaxSortOrder();
  const now = new Date().toISOString();

  try {
    return await repo.insertCategory({
      name: body.name,
      color: body.color ?? '#6B7280',
      sortOrder: maxSort + 1,
      hospital_id: session.hospitalId,
      createdBy: session.id,
      createdAt: now,
      updatedAt: now,
    });
  } catch (err: unknown) {
    // Postgres unique violation on ExpenseCategory.name
    if ((err as { code?: string }).code === '23505') {
      throw new ConflictError(
        `Expense category with name "${body.name}" already exists for this hospital. Choose a different name.`,
      );
    }
    throw err;
  }
}

/**
 * PATCH /expenses/categories/:id — expenses:edit
 *
 * Partial update — only fields present in body are written.
 * Throws 404 if the category does not exist for this hospital.
 * Throws 409 if renaming to a name already taken by another category.
 */
export async function updateCategory(
  session: Session,
  id: string,
  body: Partial<ExpenseCategoryInput>,
): Promise<void> {
  const repo = makeRepo(session);
  const existing = await repo.findCategoryById(id);
  if (!existing) {
    throw new NotFoundError('ExpenseCategory', id);
  }

  const payload: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  if (body.name !== undefined) payload['name'] = body.name;
  if (body.color !== undefined) payload['color'] = body.color;

  try {
    await repo.updateCategory(id, payload);
  } catch (err: unknown) {
    if ((err as { code?: string }).code === '23505') {
      throw new ConflictError(
        `Expense category with name "${body.name}" already exists for this hospital. Choose a different name.`,
      );
    }
    throw err;
  }
}

/**
 * DELETE /expenses/categories/:id — expenses:edit
 *
 * Hard delete. Mirrors the FK RESTRICT behavior:
 * - Throws 404 if the category does not belong to this hospital.
 * - Throws 409 if any Expense rows reference this category (RESTRICT guard
 *   enforced in application code before hitting the DB constraint, giving a
 *   descriptive error rather than a Postgres violation).
 */
export async function deleteCategory(session: Session, id: string): Promise<void> {
  const repo = makeRepo(session);
  const existing = await repo.findCategoryById(id);
  if (!existing) {
    throw new NotFoundError('ExpenseCategory', id);
  }

  const linkedCount = await repo.countExpensesForCategory(id);
  if (linkedCount > 0) {
    throw new ConflictError(
      `Cannot delete ExpenseCategory with id "${id}" — ${linkedCount} expense(s) are linked to it. Reassign them to another category first.`,
    );
  }

  await repo.deleteCategoryById(id);
}

/**
 * PATCH /expenses/categories/reorder — expenses:edit
 *
 * Bulk sortOrder update. Accepts an explicit {id, sortOrder} pair array so the
 * caller controls the exact sort position of each category. All updates run
 * concurrently. Each update is scoped to this hospital so a caller cannot
 * reorder another tenant's categories.
 */
export async function reorderCategories(
  session: Session,
  order: { id: string; sortOrder: number }[],
): Promise<void> {
  await makeRepo(session).updateCategoryOrders(order);
}

// ── Expense endpoints ─────────────────────────────────────────────────────────

/**
 * GET /expenses — expenses:view
 *
 * Returns expenses in the given date range, joined with their category.
 * Both dates are optional; when omitted all expenses for the hospital are returned.
 * Mirrors old getExpensesByDateRange filter logic (endDate covers full day to 23:59:59).
 */
export async function listExpenses(
  session: Session,
  query: ExpenseListQuery,
): Promise<ExpenseRow[]> {
  return makeRepo(session).findExpenses(query.startDate, query.endDate);
}

/**
 * POST /expenses — expenses:create
 *
 * Creates a new expense. Verifies the referenced ExpenseCategory belongs to
 * this hospital before inserting.
 */
export async function createExpense(session: Session, body: ExpenseInput): Promise<ExpenseRow> {
  const repo = makeRepo(session);

  // Guard: category must exist for this hospital
  const category = await repo.findCategoryById(body.categoryId);
  if (!category) {
    throw new NotFoundError('ExpenseCategory', body.categoryId);
  }

  const now = new Date().toISOString();
  return repo.insertExpense({
    title: body.title,
    categoryId: body.categoryId,
    amount: body.amount,
    date: new Date(body.date).toISOString(),
    reason: body.reason ?? null,
    paymentMode: body.paymentMode ?? null,
    hospital_id: session.hospitalId,
    createdBy: session.id,
    createdAt: now,
    updatedAt: now,
  });
}

/**
 * PATCH /expenses/:id — expenses:edit
 *
 * Partial update. Throws 404 if the expense does not exist for this hospital.
 * If categoryId is being changed, verifies the new category also belongs to
 * this hospital.
 */
export async function updateExpense(
  session: Session,
  id: string,
  body: Partial<ExpenseInput>,
): Promise<void> {
  const repo = makeRepo(session);

  const existing = await repo.findExpenseById(id);
  if (!existing) {
    throw new NotFoundError('Expense', id);
  }

  // Guard: if changing category, verify the new one belongs to this hospital
  if (body.categoryId !== undefined) {
    const category = await repo.findCategoryById(body.categoryId);
    if (!category) {
      throw new NotFoundError('ExpenseCategory', body.categoryId);
    }
  }

  const payload: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  if (body.title !== undefined) payload['title'] = body.title;
  if (body.categoryId !== undefined) payload['categoryId'] = body.categoryId;
  if (body.amount !== undefined) payload['amount'] = body.amount;
  if (body.date !== undefined) payload['date'] = new Date(body.date).toISOString();
  if (body.reason !== undefined) payload['reason'] = body.reason;
  if (body.paymentMode !== undefined) payload['paymentMode'] = body.paymentMode;

  await repo.updateExpense(id, payload);
}

/**
 * DELETE /expenses/:id — expenses:delete
 *
 * Hard delete. Throws 404 if the expense does not exist for this hospital.
 */
export async function deleteExpense(session: Session, id: string): Promise<void> {
  const repo = makeRepo(session);

  const existing = await repo.findExpenseById(id);
  if (!existing) {
    throw new NotFoundError('Expense', id);
  }

  await repo.deleteExpenseById(id);
}
