/**
 * call-logs Edge Function — 8 endpoints
 *
 * Routes (openapi.yaml §call-logs):
 *   GET   /call-logs/analytics              call_logs:view
 *   GET   /call-logs                        call_logs:view
 *   GET   /call-logs/stats                  call_logs:view   (static — before /:id)
 *   GET   /call-logs/patients/search        call_logs:view   (static — before /:id)
 *   POST  /call-logs/sync                   call_logs:sync   (static — before /:id)
 *   POST  /call-logs/webhook/exotel         token-only       (no JWT — EXOTEL_WEBHOOK_TOKEN)
 *   PATCH /call-logs/:id/notes              call_logs:edit
 *   PATCH /call-logs/:id/patient            call_logs:edit
 *
 * Security note (H-2 fix): The webhook endpoint authenticates via a shared
 * token (X-Exotel-Token header or ?token query param) against EXOTEL_WEBHOOK_TOKEN
 * env var. If EXOTEL_WEBHOOK_TOKEN is not set, the request is rejected with 401.
 * This endpoint does NOT use requireAuth or requirePermission middleware.
 */

import { Hono } from 'hono';
import { requireAuth } from '../_shared/auth.ts';
import { requirePermission } from '../_shared/permission-guard.ts';
import { handleError, ok, paginated, errorResponse } from '../_shared/response.ts';
import { getSupabaseClient } from '../_shared/supabase-client.ts';
import type { Session } from '../_shared/auth.ts';
import {
  CallLogListQuerySchema,
  AnalyticsQuerySchema,
  UpdateNotesSchema,
  LinkPatientSchema,
  PatientSearchQuerySchema,
} from './types.ts';
import * as service from './service.ts';

const app = new Hono().basePath('/call-logs');
app.onError(handleError);

// ---- Webhook — no JWT auth; token-only; must be defined BEFORE global requireAuth ----
app.post('/webhook/exotel', async (c) => {
  // H-2 fix: fail closed if env var is missing — never fail open
  const expectedToken = Deno.env.get('EXOTEL_WEBHOOK_TOKEN');
  if (!expectedToken) {
    return errorResponse(c, 'Webhook authentication not configured', 401);
  }
  const suppliedToken =
    c.req.header('X-Exotel-Token') ?? c.req.query('token') ?? '';
  if (suppliedToken !== expectedToken) {
    return errorResponse(c, 'Invalid or missing webhook token', 401);
  }
  // Accepts both application/json and application/x-www-form-urlencoded
  let payload: unknown;
  const contentType = c.req.header('Content-Type') ?? '';
  if (contentType.includes('application/x-www-form-urlencoded')) {
    payload = await c.req.formData().then((f) => Object.fromEntries(f));
  } else {
    payload = await c.req.json();
  }
  // Webhook does not require session; uses service_role client scoped to hospital
  const hospitalId = c.req.header('X-Hospital-Id') ?? '';
  await service.processWebhook(hospitalId, payload);
  return ok(c, null, 'Webhook received');
});

// ---- All other routes require JWT auth ----
app.use('*', requireAuth);

// ---- Static routes before /:id ----
app.get('/analytics', requirePermission('call_logs:view'), async (c) => {
  const q = AnalyticsQuerySchema.safeParse(c.req.query());
  if (!q.success) return errorResponse(c, `Invalid query: ${q.error.errors[0].message}`, 400);
  return ok(c, await service.getAnalytics(c.get('session') as Session, q.data));
});
app.get('/stats', requirePermission('call_logs:view'), async (c) => ok(c, await service.getStats(c.get('session') as Session)));
app.get('/patients/search', requirePermission('call_logs:view'), async (c) => {
  const q = PatientSearchQuerySchema.safeParse(c.req.query());
  if (!q.success) return errorResponse(c, `Invalid query: ${q.error.errors[0].message}`, 400);
  return ok(c, await service.searchPatients(c.get('session') as Session, q.data.q));
});
app.post('/sync', requirePermission('call_logs:sync'), async (c) => ok(c, await service.syncExotel(c.get('session') as Session), 'Sync completed'));

// ---- Collection route ----
app.get('/', requirePermission('call_logs:view'), async (c) => {
  const s = c.get('session') as Session;
  const q = CallLogListQuerySchema.safeParse(c.req.query());
  if (!q.success) return errorResponse(c, `Invalid query: ${q.error.errors[0].message}`, 400);
  const { data, total } = await service.listCallLogs(s, q.data);
  return paginated(c, data, { page: q.data.page, pageSize: q.data.pageSize, total });
});

// ---- Parameterized routes ----
app.patch('/:id/notes', requirePermission('call_logs:edit'), async (c) => {
  const s = c.get('session') as Session;
  const b = UpdateNotesSchema.safeParse(await c.req.json());
  if (!b.success) return errorResponse(c, `Invalid notes: ${b.error.errors[0].message}`, 400);
  await service.updateNotes(s, c.req.param('id'), b.data.notes);
  return ok(c, null, 'Notes updated');
});
app.patch('/:id/patient', requirePermission('call_logs:edit'), async (c) => {
  const s = c.get('session') as Session;
  const b = LinkPatientSchema.safeParse(await c.req.json());
  if (!b.success) return errorResponse(c, `Invalid request: ${b.error.errors[0].message}`, 400);
  await service.linkPatient(s, c.req.param('id'), b.data.patientId);
  return ok(c, null, 'Call linked to patient');
});

export default app.fetch;
