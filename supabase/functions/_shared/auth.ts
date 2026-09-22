/**
 * Session verification for docsile-hms Edge Functions.
 *
 * Implements ADR-005: custom jose JWT verification against AUTH_SECRET env var.
 * No hardcoded fallback — if AUTH_SECRET is missing, the function crashes at startup.
 * Checks jti against token_revocation table (H-1 fix — logout is immediately effective).
 *
 * Cookie name: docsile-session (access token, 15-min expiry)
 * Refresh cookie name: docsile-refresh (7-day expiry, rotated on use)
 */

import { jwtVerify, SignJWT } from 'jose';
import type { Context, MiddlewareHandler } from 'hono';
import { getSupabaseClient } from './supabase-client.ts';
import { UnauthorizedError } from './errors.ts';

export interface Session {
  /** User UUID */
  id: string;
  /** Role name string (e.g. ADMIN, DOCTOR, RECEPTIONIST) */
  role: string;
  /** Array of permission scope strings (e.g. ["patients:view", "billing:create"]) */
  permissions: string[];
  /** Hospital UUID extracted from the JWT */
  hospitalId: string;
  /** JWT ID — used for revocation checks */
  jti: string;
}

/** Cached reference to the AUTH_SECRET key bytes — resolved once at cold start. */
let _authSecretKey: Uint8Array | null = null;

function getAuthSecretKey(): Uint8Array {
  if (_authSecretKey) return _authSecretKey;

  const secret = Deno.env.get('AUTH_SECRET');
  if (!secret) {
    throw new Error(
      'AUTH_SECRET environment variable is not set. ' +
      'Set it via `supabase secrets set AUTH_SECRET=...` before deploying. ' +
      'This is a required secret — the server must crash rather than accept forged JWTs.',
    );
  }

  _authSecretKey = new TextEncoder().encode(secret);
  return _authSecretKey;
}

/**
 * Parse the docsile-session cookie from the request Cookie header.
 * Returns null if the cookie is absent.
 */
function parseSessionCookie(req: Request): string | null {
  const cookieHeader = req.headers.get('Cookie');
  if (!cookieHeader) return null;

  for (const part of cookieHeader.split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (name.trim() === 'docsile-session') {
      return rest.join('=').trim();
    }
  }
  return null;
}

/**
 * Parse the docsile-refresh cookie from the request Cookie header.
 * Returns null if the cookie is absent.
 */
export function parseRefreshCookie(req: Request): string | null {
  const cookieHeader = req.headers.get('Cookie');
  if (!cookieHeader) return null;

  for (const part of cookieHeader.split(';')) {
    const [name, ...rest] = part.trim().split(';')[0].split('=');
    if (name.trim() === 'docsile-refresh') {
      return rest.join('=').trim();
    }
  }
  return null;
}

/**
 * Verify the docsile-session cookie JWT and return a typed Session.
 * Throws UnauthorizedError if:
 * - Cookie is missing
 * - JWT signature is invalid or token is expired
 * - Token jti is in the token_revocation table
 */
export async function verifySession(req: Request): Promise<Session> {
  const token = parseSessionCookie(req);
  if (!token) {
    throw new UnauthorizedError('No docsile-session cookie present. Please log in.');
  }

  let payload: Record<string, unknown>;
  try {
    const { payload: p } = await jwtVerify(token, getAuthSecretKey());
    payload = p as Record<string, unknown>;
  } catch {
    throw new UnauthorizedError('Session token is invalid or expired. Please log in again.');
  }

  const jti = payload['jti'] as string | undefined;
  if (!jti) {
    throw new UnauthorizedError('Session token is missing jti claim. Please log in again.');
  }

  // H-1 fix: check jti against revocation table — logout is immediately effective
  const supabase = getSupabaseClient();
  const { data: revoked } = await supabase
    .from('token_revocation')
    .select('jti')
    .eq('jti', jti)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (revoked) {
    throw new UnauthorizedError('Session has been revoked (logged out). Please log in again.');
  }

  return {
    id: payload['sub'] as string,
    role: payload['role'] as string,
    permissions: (payload['permissions'] as string[]) ?? [],
    hospitalId: payload['hospitalId'] as string,
    jti,
  };
}

/**
 * Hono middleware that verifies the session and attaches it to the context.
 * Attach with: `app.use('*', requireAuth)`
 *
 * After this middleware runs, handlers can access the session via `c.get('session')`.
 */
export const requireAuth: MiddlewareHandler = async (c, next) => {
  const session = await verifySession(c.req.raw);
  c.set('session', session);
  await next();
};

/**
 * Build an HttpOnly session cookie string for Set-Cookie headers.
 */
export function buildSessionCookie(token: string, maxAgeSeconds: number): string {
  return `docsile-session=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${maxAgeSeconds}`;
}

/**
 * Build an HttpOnly refresh cookie string for Set-Cookie headers.
 */
export function buildRefreshCookie(token: string, maxAgeSeconds: number): string {
  return `docsile-refresh=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${maxAgeSeconds}`;
}

/**
 * Build expired cookie strings to clear both session cookies.
 */
export function buildClearCookies(): string[] {
  return [
    'docsile-session=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0',
    'docsile-refresh=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0',
  ];
}

// Re-export SignJWT for use in the auth module's service.ts
export { SignJWT };
