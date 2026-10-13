/**
 * pharmacy Edge Function — 21 endpoints
 *
 * Routes (openapi.yaml §pharmacy):
 *   GET    /pharmacy/medicines                           pharmacy:view
 *   POST   /pharmacy/medicines                           pharmacy:manage_stock
 *   PATCH  /pharmacy/medicines/:id                       pharmacy:manage_stock
 *   DELETE /pharmacy/medicines/:id                       pharmacy:manage_stock
 *   GET    /pharmacy/stock                               pharmacy:view
 *   POST   /pharmacy/stock                               pharmacy:manage_stock
 *   GET    /pharmacy/stock/summary                       pharmacy:view
 *   GET    /pharmacy/stock/search                        pharmacy:view
 *   PATCH  /pharmacy/stock/:id                           pharmacy:manage_stock
 *   GET    /pharmacy/suppliers                           pharmacy:view
 *   POST   /pharmacy/suppliers                           pharmacy:manage_stock
 *   PATCH  /pharmacy/suppliers/:id                       pharmacy:manage_stock
 *   DELETE /pharmacy/suppliers/:id                       pharmacy:manage_stock
 *   GET    /pharmacy/purchase-orders                     pharmacy:purchase_orders
 *   POST   /pharmacy/purchase-orders                     pharmacy:purchase_orders
 *   POST   /pharmacy/purchase-orders/:id/receive         pharmacy:purchase_orders
 *   PATCH  /pharmacy/purchase-orders/:id/status          pharmacy:purchase_orders
 *   GET    /pharmacy/bills                               pharmacy:view
 *   POST   /pharmacy/bills                               pharmacy:create
 *   GET    /pharmacy/pending-medicines                   pharmacy:view
 *   GET    /pharmacy/patients/:patientId/prescription    pharmacy:view
 */

import { Hono } from 'hono';
import { requireAuth } from '../_shared/auth.ts';
import { requirePermission } from '../_shared/permission-guard.ts';
import { handleError, ok, created, paginated, errorResponse } from '../_shared/response.ts';
import type { Session } from '../_shared/auth.ts';
import { corsMiddleware } from '../_shared/cors.ts';
import {
  PharmacyMedicineSchema,
  PharmacyStockSchema,
  PharmacySupplierSchema,
  CreatePurchaseOrderSchema,
  ReceivePurchaseOrderSchema,
  UpdatePOStatusSchema,
  CreatePharmacyBillSchema,
  StockSearchQuerySchema,
  PharmacyBillListQuerySchema,
} from './types.ts';
import * as service from './service.ts';

const app = new Hono().basePath('/pharmacy');
app.use('*', corsMiddleware);
app.use('*', requireAuth);
app.onError(handleError);

// ---- Medicines ----
app.get('/medicines', requirePermission('pharmacy:view'), async (c) => {
  const s = c.get('session') as Session;
  return ok(c, await service.getMedicines(s));
});
app.post('/medicines', requirePermission('pharmacy:manage_stock'), async (c) => {
  const s = c.get('session') as Session;
  const b = PharmacyMedicineSchema.safeParse(await c.req.json());
  if (!b.success) return errorResponse(c, `Invalid medicine: ${b.error.errors[0].message}`, 400);
  return created(c, await service.createMedicine(s, b.data), 'Medicine created');
});
app.patch('/medicines/:id', requirePermission('pharmacy:manage_stock'), async (c) => {
  const s = c.get('session') as Session;
  const b = PharmacyMedicineSchema.partial().safeParse(await c.req.json());
  if (!b.success) return errorResponse(c, `Invalid medicine: ${b.error.errors[0].message}`, 400);
  await service.updateMedicine(s, c.req.param('id'), b.data);
  return ok(c, null, 'Medicine updated');
});
app.delete('/medicines/:id', requirePermission('pharmacy:manage_stock'), async (c) => {
  const s = c.get('session') as Session;
  await service.deleteMedicine(s, c.req.param('id'));
  return ok(c, null, 'Medicine soft-deleted');
});

// ---- Stock — static routes before :id ----
app.get('/stock/summary', requirePermission('pharmacy:view'), async (c) => {
  const s = c.get('session') as Session;
  return ok(c, await service.getStockSummary(s));
});
app.get('/stock/search', requirePermission('pharmacy:view'), async (c) => {
  const s = c.get('session') as Session;
  const q = StockSearchQuerySchema.safeParse(c.req.query());
  if (!q.success) return errorResponse(c, `Invalid query: ${q.error.errors[0].message}`, 400);
  return ok(c, await service.searchMedicineStock(s, q.data.q));
});
app.get('/stock', requirePermission('pharmacy:view'), async (c) => {
  const s = c.get('session') as Session;
  return ok(c, await service.getStock(s));
});
app.post('/stock', requirePermission('pharmacy:manage_stock'), async (c) => {
  const s = c.get('session') as Session;
  const b = PharmacyStockSchema.safeParse(await c.req.json());
  if (!b.success) return errorResponse(c, `Invalid stock: ${b.error.errors[0].message}`, 400);
  await service.addStock(s, b.data);
  return created(c, null, 'Stock entry created');
});
app.patch('/stock/:id', requirePermission('pharmacy:manage_stock'), async (c) => {
  const s = c.get('session') as Session;
  const b = PharmacyStockSchema.partial().safeParse(await c.req.json());
  if (!b.success) return errorResponse(c, `Invalid stock: ${b.error.errors[0].message}`, 400);
  await service.updateStock(s, c.req.param('id'), b.data);
  return ok(c, null, 'Stock updated');
});

// ---- Suppliers ----
app.get('/suppliers', requirePermission('pharmacy:view'), async (c) => {
  const s = c.get('session') as Session;
  return ok(c, await service.getSuppliers(s));
});
app.post('/suppliers', requirePermission('pharmacy:manage_stock'), async (c) => {
  const s = c.get('session') as Session;
  const b = PharmacySupplierSchema.safeParse(await c.req.json());
  if (!b.success) return errorResponse(c, `Invalid supplier: ${b.error.errors[0].message}`, 400);
  await service.createSupplier(s, b.data);
  return created(c, null, 'Supplier created');
});
app.patch('/suppliers/:id', requirePermission('pharmacy:manage_stock'), async (c) => {
  const s = c.get('session') as Session;
  const b = PharmacySupplierSchema.partial().safeParse(await c.req.json());
  if (!b.success) return errorResponse(c, `Invalid supplier: ${b.error.errors[0].message}`, 400);
  await service.updateSupplier(s, c.req.param('id'), b.data);
  return ok(c, null, 'Supplier updated');
});
app.delete('/suppliers/:id', requirePermission('pharmacy:manage_stock'), async (c) => {
  const s = c.get('session') as Session;
  await service.deleteSupplier(s, c.req.param('id'));
  return ok(c, null, 'Supplier soft-deleted');
});

// ---- Purchase orders — static routes before :id ----
app.get('/purchase-orders', requirePermission('pharmacy:purchase_orders'), async (c) => {
  const s = c.get('session') as Session;
  return ok(c, await service.getPurchaseOrders(s));
});
app.post('/purchase-orders', requirePermission('pharmacy:purchase_orders'), async (c) => {
  const s = c.get('session') as Session;
  const b = CreatePurchaseOrderSchema.safeParse(await c.req.json());
  if (!b.success) return errorResponse(c, `Invalid purchase order: ${b.error.errors[0].message}`, 400);
  return created(c, await service.createPurchaseOrder(s, b.data), 'Purchase order created');
});
app.post('/purchase-orders/:id/receive', requirePermission('pharmacy:purchase_orders'), async (c) => {
  const s = c.get('session') as Session;
  const b = ReceivePurchaseOrderSchema.safeParse(await c.req.json());
  if (!b.success) return errorResponse(c, `Invalid receive data: ${b.error.errors[0].message}`, 400);
  await service.receivePurchaseOrder(s, c.req.param('id'), b.data);
  return ok(c, null, 'Order received and stock updated');
});
app.patch('/purchase-orders/:id/status', requirePermission('pharmacy:purchase_orders'), async (c) => {
  const s = c.get('session') as Session;
  const b = UpdatePOStatusSchema.safeParse(await c.req.json());
  if (!b.success) return errorResponse(c, `Invalid status: ${b.error.errors[0].message}`, 400);
  await service.updatePOStatus(s, c.req.param('id'), b.data.status);
  return ok(c, null, 'Status updated');
});

// ---- Bills ----
app.get('/bills', requirePermission('pharmacy:view'), async (c) => {
  const s = c.get('session') as Session;
  const q = PharmacyBillListQuerySchema.safeParse(c.req.query());
  if (!q.success) return errorResponse(c, `Invalid query: ${q.error.errors[0].message}`, 400);
  const { data, total } = await service.getPharmacyBills(s, q.data);
  return paginated(c, data, { page: q.data.page, pageSize: q.data.pageSize, total });
});
app.post('/bills', requirePermission('pharmacy:create'), async (c) => {
  const s = c.get('session') as Session;
  const b = CreatePharmacyBillSchema.safeParse(await c.req.json());
  if (!b.success) return errorResponse(c, `Invalid bill: ${b.error.errors[0].message}`, 400);
  return created(c, await service.createPharmacyBill(s, b.data), 'Pharmacy bill created');
});

// ---- Misc ----
app.get('/pending-medicines', requirePermission('pharmacy:view'), async (c) => {
  const s = c.get('session') as Session;
  return ok(c, await service.getPendingMedicines(s));
});
app.get('/patients/:patientId/prescription', requirePermission('pharmacy:view'), async (c) => {
  const s = c.get('session') as Session;
  return ok(c, await service.getPatientPrescription(s, c.req.param('patientId')));
});

Deno.serve(app.fetch);
