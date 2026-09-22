/**
 * optical Edge Function — 16 endpoints
 *
 * Routes (openapi.yaml §optical):
 *   GET    /optical/products                       optical:view
 *   POST   /optical/products                       optical:edit
 *   PATCH  /optical/products/:id                   optical:edit
 *   DELETE /optical/products/:id                   optical:edit
 *   GET    /optical/stock/summary                  optical:view  (static — before /stock and /stock/:id)
 *   GET    /optical/stock/search                   optical:view  (static — before /stock/:id)
 *   GET    /optical/stock                          optical:view
 *   POST   /optical/stock                          optical:edit
 *   PATCH  /optical/stock/:id                      optical:edit
 *   GET    /optical/bills                          optical:view
 *   POST   /optical/bills                          optical:create
 *   PATCH  /optical/bills/:id/status               optical:edit
 *   GET    /optical/patients/:patientId/ar-reading optical:view
 *   GET    /optical/settings                       settings:view
 *   PATCH  /optical/settings                       settings:edit
 *   GET    /optical/hospital-profile               optical:view
 */

import { Hono } from 'hono';
import { requireAuth } from '../_shared/auth.ts';
import { requirePermission } from '../_shared/permission-guard.ts';
import { handleError, ok, created, paginated, errorResponse } from '../_shared/response.ts';
import type { Session } from '../_shared/auth.ts';
import {
  OpticalProductSchema,
  OpticalStockSchema,
  CreateOpticalBillSchema,
  UpdateBillStatusSchema,
  OpticalBillListQuerySchema,
  StockSearchQuerySchema,
} from './types.ts';
import * as service from './service.ts';

const app = new Hono().basePath('/optical');
app.use('*', requireAuth);
app.onError(handleError);

// ---- Products ----
app.get('/products', requirePermission('optical:view'), async (c) => ok(c, await service.getProducts(c.get('session') as Session)));
app.post('/products', requirePermission('optical:edit'), async (c) => {
  const s = c.get('session') as Session;
  const b = OpticalProductSchema.safeParse(await c.req.json());
  if (!b.success) return errorResponse(c, `Invalid product: ${b.error.errors[0].message}`, 400);
  return created(c, await service.createProduct(s, b.data), 'Product created');
});
app.patch('/products/:id', requirePermission('optical:edit'), async (c) => {
  const s = c.get('session') as Session;
  const b = OpticalProductSchema.partial().safeParse(await c.req.json());
  if (!b.success) return errorResponse(c, `Invalid product: ${b.error.errors[0].message}`, 400);
  await service.updateProduct(s, c.req.param('id'), b.data);
  return ok(c, null, 'Product updated');
});
app.delete('/products/:id', requirePermission('optical:edit'), async (c) => {
  await service.deleteProduct(c.get('session') as Session, c.req.param('id'));
  return ok(c, null, 'Product soft-deleted');
});

// ---- Stock — static routes before :id ----
app.get('/stock/summary', requirePermission('optical:view'), async (c) => ok(c, await service.getStockSummary(c.get('session') as Session)));
app.get('/stock/search', requirePermission('optical:view'), async (c) => {
  const q = StockSearchQuerySchema.safeParse(c.req.query());
  if (!q.success) return errorResponse(c, `Invalid query: ${q.error.errors[0].message}`, 400);
  return ok(c, await service.searchStock(c.get('session') as Session, q.data.q));
});
app.get('/stock', requirePermission('optical:view'), async (c) => ok(c, await service.getStock(c.get('session') as Session)));
app.post('/stock', requirePermission('optical:edit'), async (c) => {
  const s = c.get('session') as Session;
  const b = OpticalStockSchema.safeParse(await c.req.json());
  if (!b.success) return errorResponse(c, `Invalid stock: ${b.error.errors[0].message}`, 400);
  await service.upsertStock(s, b.data);
  return ok(c, null, 'Stock upserted');
});
app.patch('/stock/:id', requirePermission('optical:edit'), async (c) => {
  const s = c.get('session') as Session;
  const b = OpticalStockSchema.partial().safeParse(await c.req.json());
  if (!b.success) return errorResponse(c, `Invalid stock: ${b.error.errors[0].message}`, 400);
  await service.updateStock(s, c.req.param('id'), b.data);
  return ok(c, null, 'Stock updated');
});

// ---- Bills ----
app.get('/bills', requirePermission('optical:view'), async (c) => {
  const s = c.get('session') as Session;
  const q = OpticalBillListQuerySchema.safeParse(c.req.query());
  if (!q.success) return errorResponse(c, `Invalid query: ${q.error.errors[0].message}`, 400);
  const { data, total } = await service.getBills(s, q.data);
  return paginated(c, data, { page: q.data.page, pageSize: q.data.pageSize, total });
});
app.post('/bills', requirePermission('optical:create'), async (c) => {
  const s = c.get('session') as Session;
  const b = CreateOpticalBillSchema.safeParse(await c.req.json());
  if (!b.success) return errorResponse(c, `Invalid bill: ${b.error.errors[0].message}`, 400);
  return created(c, await service.createBill(s, b.data), 'Optical bill created');
});
app.patch('/bills/:id/status', requirePermission('optical:edit'), async (c) => {
  const s = c.get('session') as Session;
  const b = UpdateBillStatusSchema.safeParse(await c.req.json());
  if (!b.success) return errorResponse(c, `Invalid status: ${b.error.errors[0].message}`, 400);
  await service.updateBillStatus(s, c.req.param('id'), b.data.status);
  return ok(c, null, 'Bill status updated');
});

// ---- Patient AR reading ----
app.get('/patients/:patientId/ar-reading', requirePermission('optical:view'), async (c) => ok(c, await service.getPatientArReading(c.get('session') as Session, c.req.param('patientId'))));

// ---- Settings (crosses into settings permissions) ----
app.get('/settings', requirePermission('settings:view'), async (c) => ok(c, await service.getSettings(c.get('session') as Session)));
app.patch('/settings', requirePermission('settings:edit'), async (c) => {
  const s = c.get('session') as Session;
  await service.updateSettings(s, await c.req.json());
  return ok(c, null, 'Optical settings updated');
});

// ---- Hospital profile ----
app.get('/hospital-profile', requirePermission('optical:view'), async (c) => ok(c, await service.getHospitalProfile(c.get('session') as Session)));

export default app.fetch;
