/**
 * expenses Edge Function — 10 endpoints
 *
 * Routes (openapi.yaml §expenses):
 *   POST   /expenses/categories/seed        expenses:edit  (static — before /:id)
 *   GET    /expenses/categories             expenses:view
 *   POST   /expenses/categories             expenses:edit
 *   PATCH  /expenses/categories/reorder     expenses:edit  (static — before /:id)
 *   PATCH  /expenses/categories/:id         expenses:edit
 *   DELETE /expenses/categories/:id         expenses:edit
 *   GET    /expenses                        expenses:view
 *   POST   /expenses                        expenses:create
 *   PATCH  /expenses/:id                    expenses:edit
 *   DELETE /expenses/:id                    expenses:delete
 */

import { Hono } from 'hono';
import { requireAuth } from '../_shared/auth.ts';
import { requirePermission } from '../_shared/permission-guard.ts';
import { handleError, ok, created, errorResponse } from '../_shared/response.ts';
import type { Session } from '../_shared/auth.ts';
import { ExpenseCategorySchema, ReorderCategoriesSchema, ExpenseSchema, ExpenseListQuerySchema } from './types.ts';
import * as service from './service.ts';

const app = new Hono().basePath('/expenses');
app.use('*', requireAuth);
app.onError(handleError);

// ---- Categories — static routes before /:id ----
app.post('/categories/seed', requirePermission('expenses:edit'), async (c) => {
  await service.seedCategories(c.get('session') as Session);
  return ok(c, null, 'Default categories seeded');
});
app.get('/categories', requirePermission('expenses:view'), async (c) => ok(c, await service.listCategories(c.get('session') as Session)));
app.post('/categories', requirePermission('expenses:edit'), async (c) => {
  const s = c.get('session') as Session;
  const b = ExpenseCategorySchema.safeParse(await c.req.json());
  if (!b.success) return errorResponse(c, `Invalid category: ${b.error.errors[0].message}`, 400);
  return created(c, await service.createCategory(s, b.data), 'Category created');
});
app.patch('/categories/reorder', requirePermission('expenses:edit'), async (c) => {
  const s = c.get('session') as Session;
  const b = ReorderCategoriesSchema.safeParse(await c.req.json());
  if (!b.success) return errorResponse(c, `Invalid reorder: ${b.error.errors[0].message}`, 400);
  await service.reorderCategories(s, b.data.order);
  return ok(c, null, 'Categories reordered');
});
app.patch('/categories/:id', requirePermission('expenses:edit'), async (c) => {
  const s = c.get('session') as Session;
  const b = ExpenseCategorySchema.partial().safeParse(await c.req.json());
  if (!b.success) return errorResponse(c, `Invalid category: ${b.error.errors[0].message}`, 400);
  await service.updateCategory(s, c.req.param('id'), b.data);
  return ok(c, null, 'Category updated');
});
app.delete('/categories/:id', requirePermission('expenses:edit'), async (c) => {
  await service.deleteCategory(c.get('session') as Session, c.req.param('id'));
  return ok(c, null, 'Category deleted');
});

// ---- Expenses ----
app.get('/', requirePermission('expenses:view'), async (c) => {
  const q = ExpenseListQuerySchema.safeParse(c.req.query());
  if (!q.success) return errorResponse(c, `Invalid query: ${q.error.errors[0].message}`, 400);
  return ok(c, await service.listExpenses(c.get('session') as Session, q.data));
});
app.post('/', requirePermission('expenses:create'), async (c) => {
  const s = c.get('session') as Session;
  const b = ExpenseSchema.safeParse(await c.req.json());
  if (!b.success) return errorResponse(c, `Invalid expense: ${b.error.errors[0].message}`, 400);
  return created(c, await service.createExpense(s, b.data), 'Expense created');
});
app.patch('/:id', requirePermission('expenses:edit'), async (c) => {
  const s = c.get('session') as Session;
  const b = ExpenseSchema.partial().safeParse(await c.req.json());
  if (!b.success) return errorResponse(c, `Invalid expense: ${b.error.errors[0].message}`, 400);
  await service.updateExpense(s, c.req.param('id'), b.data);
  return ok(c, null, 'Expense updated');
});
app.delete('/:id', requirePermission('expenses:delete'), async (c) => {
  await service.deleteExpense(c.get('session') as Session, c.req.param('id'));
  return ok(c, null, 'Expense deleted');
});

export default app.fetch;
