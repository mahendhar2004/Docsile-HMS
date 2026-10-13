/**
 * queue Edge Function — 3 endpoints
 *
 * Routes (openapi.yaml §queue):
 *   GET /queue/opd         queue:view
 *   GET /queue/workup      queue:view
 *   GET /queue/inpatients  queue:view
 */

import { Hono } from 'hono';
import { requireAuth } from '../_shared/auth.ts';
import { requirePermission } from '../_shared/permission-guard.ts';
import { handleError, ok } from '../_shared/response.ts';
import type { Session } from '../_shared/auth.ts';
import { corsMiddleware } from '../_shared/cors.ts';
import * as service from './service.ts';

const app = new Hono().basePath('/queue');
app.use('*', corsMiddleware);
app.use('*', requireAuth);
app.onError(handleError);

app.get('/opd', requirePermission('queue:view'), async (c) => ok(c, await service.getOpdQueue(c.get('session') as Session)));
app.get('/workup', requirePermission('queue:view'), async (c) => ok(c, await service.getWorkupQueue(c.get('session') as Session)));
app.get('/inpatients', requirePermission('queue:view'), async (c) => ok(c, await service.getInpatientBoard(c.get('session') as Session)));

Deno.serve(app.fetch);
