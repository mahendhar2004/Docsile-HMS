/**
 * dashboard Edge Function — 2 endpoints
 *
 * Routes (openapi.yaml §dashboard):
 *   GET /dashboard/summary      reports:view
 *   GET /dashboard/quick-stats  reports:view
 */

import { Hono } from 'hono';
import { requireAuth } from '../_shared/auth.ts';
import { requirePermission } from '../_shared/permission-guard.ts';
import { handleError, ok } from '../_shared/response.ts';
import type { Session } from '../_shared/auth.ts';
import * as service from './service.ts';

const app = new Hono().basePath('/dashboard');
app.use('*', requireAuth);
app.onError(handleError);

app.get('/summary', requirePermission('reports:view'), async (c) => ok(c, await service.getSummary(c.get('session') as Session)));
app.get('/quick-stats', requirePermission('reports:view'), async (c) => ok(c, await service.getQuickStats(c.get('session') as Session)));

export default app.fetch;
