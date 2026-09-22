/**
 * auth Edge Function — 3 endpoints
 *
 * Routes (openapi.yaml §auth):
 *   POST /auth/login   — public (no session cookie required)
 *   POST /auth/refresh — cookie-only (validates docsile-refresh cookie)
 *   POST /auth/logout  — cookie-only (validates docsile-session cookie)
 *
 * Auth endpoints do NOT use requireAuth or requirePermission middleware —
 * they ARE the auth flow. login is public; refresh/logout validate their own cookies.
 */

import { Hono } from 'hono';
import { handleError, ok, errorResponse } from '../_shared/response.ts';
import { parseRefreshCookie, buildSessionCookie, buildRefreshCookie, buildClearCookies } from '../_shared/auth.ts';
import { LoginRequestSchema } from './types.ts';
import * as service from './service.ts';

const app = new Hono().basePath('/auth');
app.onError(handleError);

// POST /auth/login — public — rate limit: 5/min per IP (enforced at infrastructure layer)
app.post('/login', async (c) => {
  const body = await c.req.json();
  const parsed = LoginRequestSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(c, `Invalid login request: ${parsed.error.errors.map(e => e.message).join(', ')}`, 400);
  }
  const { tokens, user } = await service.login(parsed.data);
  const response = ok(c, user, 'Login successful');
  response.headers.append('Set-Cookie', buildSessionCookie(tokens.accessToken, 900));
  response.headers.append('Set-Cookie', buildRefreshCookie(tokens.refreshToken, 604800));
  return response;
});

// POST /auth/refresh — cookie-only — rate limit: 30/min per user jti
app.post('/refresh', async (c) => {
  const refreshToken = parseRefreshCookie(c.req.raw);
  if (!refreshToken) {
    return errorResponse(c, 'Refresh token cookie (docsile-refresh) is missing. Please log in.', 401);
  }
  const tokens = await service.refresh(refreshToken);
  const response = ok(c, null, 'Token refreshed');
  response.headers.append('Set-Cookie', buildSessionCookie(tokens.accessToken, 900));
  response.headers.append('Set-Cookie', buildRefreshCookie(tokens.refreshToken, 604800));
  return response;
});

// POST /auth/logout — cookie-only
app.post('/logout', async (c) => {
  const cookieHeader = c.req.header('Cookie') ?? '';
  const accessToken = cookieHeader.match(/docsile-session=([^;]+)/)?.[1] ?? '';
  const refreshToken = parseRefreshCookie(c.req.raw);
  await service.logout(accessToken, refreshToken);
  const response = ok(c, null, 'Logged out successfully');
  for (const cookie of buildClearCookies()) {
    response.headers.append('Set-Cookie', cookie);
  }
  return response;
});

export default app.fetch;
