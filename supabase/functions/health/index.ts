/**
 * health Edge Function — 2 endpoints
 *
 * Routes (openapi.yaml §health):
 *   GET /health     — public liveness check
 *   GET /health/db  — public database connectivity check
 *
 * No auth required — health checks must be accessible even when auth is broken.
 * Rate limit: 60 req/min per IP (infrastructure layer).
 */

import { Hono } from 'hono';
import { handleError, ok } from '../_shared/response.ts';
import * as service from './service.ts';

const app = new Hono().basePath('/health');
app.onError(handleError);

// GET /health — public liveness
app.get('/', async (c) => {
  const data = await service.getLiveness();
  return ok(c, data, 'Service is up');
});

// GET /health/db — public DB connectivity
app.get('/db', async (c) => {
  const data = await service.getDbHealth();
  return ok(c, data, 'DB connection is healthy');
});

export default app.fetch;
