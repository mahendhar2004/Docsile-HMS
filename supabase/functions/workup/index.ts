/**
 * workup Edge Function — 4 endpoints
 *
 * Routes (openapi.yaml §workup):
 *   GET  /workup/queue                               workup:view
 *   GET  /workup/patients/:patientId                 workup:view
 *   POST /workup/patients/:patientId/eye-readings    workup:create
 *   POST /workup/patients/:patientId/start           workup:create  (deprecated no-op)
 */

import { Hono } from 'hono';
import { requireAuth } from '../_shared/auth.ts';
import { requirePermission } from '../_shared/permission-guard.ts';
import { handleError, ok, errorResponse } from '../_shared/response.ts';
import type { Session } from '../_shared/auth.ts';
import { corsMiddleware } from '../_shared/cors.ts';
import { EyeReadingSchema } from './types.ts';
import * as service from './service.ts';

const app = new Hono().basePath('/workup');
app.use('*', corsMiddleware);
app.use('*', requireAuth);
app.onError(handleError);

app.get('/queue', requirePermission('workup:view'), async (c) => ok(c, await service.getWorkupQueue(c.get('session') as Session)));
app.get('/patients/:patientId', requirePermission('workup:view'), async (c) => ok(c, await service.getPatientForWorkup(c.get('session') as Session, c.req.param('patientId'))));
app.post('/patients/:patientId/eye-readings', requirePermission('workup:create'), async (c) => {
  const s = c.get('session') as Session;
  const b = EyeReadingSchema.safeParse(await c.req.json());
  if (!b.success) return errorResponse(c, `Invalid eye reading: ${b.error.errors[0].message}`, 400);
  return ok(c, await service.saveEyeReading(s, c.req.param('patientId'), b.data), 'Eye reading saved');
});
/** @deprecated no-op — kept for migration compatibility */
app.post('/patients/:patientId/start', requirePermission('workup:create'), async (c) => {
  await service.startWorkup(c.get('session') as Session, c.req.param('patientId'));
  return ok(c, null, 'Workup started (no-op)');
});

Deno.serve(app.fetch);
