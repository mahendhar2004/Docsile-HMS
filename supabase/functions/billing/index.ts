/**
 * billing Edge Function — 5 endpoints
 *
 * Routes (openapi.yaml §billing):
 *   GET    /billing/daily                              billing:view
 *   GET    /billing/prescriptions                      billing:view
 *   GET    /billing/prescriptions/:id                  billing:view
 *   POST   /billing/prescriptions/:id/payments         billing:create
 *   DELETE /billing/prescriptions/:id/payments/:payId  billing:delete
 */

import { Hono } from 'hono';
import { requireAuth } from '../_shared/auth.ts';
import { requirePermission } from '../_shared/permission-guard.ts';
import { handleError, ok, created, paginated, errorResponse } from '../_shared/response.ts';
import type { Session } from '../_shared/auth.ts';
import { corsMiddleware } from '../_shared/cors.ts';
import { BillingDateQuerySchema, RecordPaymentSchema } from './types.ts';
import * as service from './service.ts';

const app = new Hono().basePath('/billing');
app.use('*', corsMiddleware);
app.use('*', requireAuth);
app.onError(handleError);

app.get('/daily', requirePermission('billing:view'), async (c) => {
  const session = c.get('session') as Session;
  const data = await service.getDailySummary(session, c.req.query('date'));
  return ok(c, data);
});

app.get('/prescriptions', requirePermission('billing:view'), async (c) => {
  const session = c.get('session') as Session;
  const q = BillingDateQuerySchema.safeParse(c.req.query());
  if (!q.success) return errorResponse(c, `Invalid query: ${q.error.errors[0].message}`, 400);
  const { data, total } = await service.listPrescriptions(session, q.data);
  return paginated(c, data, { page: q.data.page, pageSize: q.data.pageSize, total });
});

app.get('/prescriptions/:id', requirePermission('billing:view'), async (c) => {
  const session = c.get('session') as Session;
  const result = await service.getPrescriptionById(session, c.req.param('id'));
  return ok(c, result);
});

app.post('/prescriptions/:id/payments', requirePermission('billing:create'), async (c) => {
  const session = c.get('session') as Session;
  const body = RecordPaymentSchema.safeParse(await c.req.json());
  if (!body.success) return errorResponse(c, `Invalid payment: ${body.error.errors[0].message}`, 400);
  const result = await service.recordPayment(session, c.req.param('id'), body.data);
  return created(c, result, 'Payment recorded');
});

app.delete('/prescriptions/:id/payments/:payId', requirePermission('billing:delete'), async (c) => {
  const session = c.get('session') as Session;
  await service.voidPayment(session, c.req.param('id'), c.req.param('payId'));
  return ok(c, null, 'Payment voided');
});

Deno.serve(app.fetch);
