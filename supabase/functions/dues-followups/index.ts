/**
 * dues-followups Edge Function — 10 endpoints
 *
 * Routes (openapi.yaml §dues-followups):
 *   GET   /dues-followups/dues                   dues:view
 *   GET   /dues-followups/dues/summary           dues:view
 *   GET   /dues-followups/followups              dues:view
 *   GET   /dues-followups/followups/summary      dues:view
 *   PATCH /dues-followups/dues/:id/mark-paid     dues:edit
 *   GET   /dues-followups/doctors                dues:view
 *   GET   /dues-followups/departments            dues:view
 *   GET   /dues-followups/email-templates        dues:view
 *   GET   /dues-followups/hospital-name          dues:view
 *   POST  /dues-followups/send-email             dues:edit
 */

import { Hono } from 'hono';
import { requireAuth } from '../_shared/auth.ts';
import { requirePermission } from '../_shared/permission-guard.ts';
import { handleError, ok, paginated, errorResponse } from '../_shared/response.ts';
import type { Session } from '../_shared/auth.ts';
import { corsMiddleware } from '../_shared/cors.ts';
import { DuesListQuerySchema, FollowupsListQuerySchema, MarkPaidSchema, SendEmailSchema } from './types.ts';
import * as service from './service.ts';

const app = new Hono().basePath('/dues-followups');
app.use('*', corsMiddleware);
app.use('*', requireAuth);
app.onError(handleError);

app.get('/dues/summary', requirePermission('dues:view'), async (c) => {
  const s = c.get('session') as Session;
  const result = await service.getDuesSummary(s);
  return ok(c, result);
});
app.get('/dues', requirePermission('dues:view'), async (c) => {
  const s = c.get('session') as Session;
  const q = DuesListQuerySchema.safeParse(c.req.query());
  if (!q.success) return errorResponse(c, `Invalid query: ${q.error.errors[0].message}`, 400);
  const { data, total } = await service.getDues(s, q.data);
  return paginated(c, data, { page: q.data.page, pageSize: q.data.pageSize, total });
});
app.get('/followups/summary', requirePermission('dues:view'), async (c) => {
  const s = c.get('session') as Session;
  const result = await service.getFollowupsSummary(s);
  return ok(c, result);
});
app.get('/followups', requirePermission('dues:view'), async (c) => {
  const s = c.get('session') as Session;
  const q = FollowupsListQuerySchema.safeParse(c.req.query());
  if (!q.success) return errorResponse(c, `Invalid query: ${q.error.errors[0].message}`, 400);
  const { data, total } = await service.getFollowups(s, q.data);
  return paginated(c, data, { page: q.data.page, pageSize: q.data.pageSize, total });
});
app.patch('/dues/:id/mark-paid', requirePermission('dues:edit'), async (c) => {
  const s = c.get('session') as Session;
  const b = MarkPaidSchema.safeParse(await c.req.json());
  if (!b.success) return errorResponse(c, `Invalid request: ${b.error.errors[0].message}`, 400);
  await service.markPaid(s, c.req.param('id'), b.data);
  return ok(c, null, 'Due marked as paid');
});
app.get('/doctors', requirePermission('dues:view'), async (c) => ok(c, await service.getDoctors(c.get('session') as Session)));
app.get('/departments', requirePermission('dues:view'), async (c) => ok(c, await service.getDepartments(c.get('session') as Session)));
app.get('/email-templates', requirePermission('dues:view'), async (c) => ok(c, await service.getEmailTemplates(c.get('session') as Session)));
app.get('/hospital-name', requirePermission('dues:view'), async (c) => ok(c, await service.getHospitalName(c.get('session') as Session)));
app.post('/send-email', requirePermission('dues:edit'), async (c) => {
  const s = c.get('session') as Session;
  const b = SendEmailSchema.safeParse(await c.req.json());
  if (!b.success) return errorResponse(c, `Invalid request: ${b.error.errors[0].message}`, 400);
  await service.sendEmail(s, b.data);
  return ok(c, null, 'Email queued');
});

Deno.serve(app.fetch);
