/**
 * Business logic for the auth module.
 *
 * Flow summary:
 *   login   — bcrypt verify, fetch role permissions, sign access + refresh JWT pair
 *   refresh — verify refresh JWT, check revocation, rotate (revoke old jti, issue new pair)
 *   logout  — best-effort decode both tokens, insert both jtis into token_revocation
 *
 * hospitalId timing (ADR-007):
 *   login:   hospitalId is discovered from the User.hospital_id column.
 *            It is not known before the user row is fetched and verified.
 *   refresh: hospitalId comes from the verified refresh JWT's claim.
 *            No user row re-query is needed.
 *   logout:  hospitalId is not needed — token_revocation is not tenant-scoped.
 *
 * JWT payload shape (both access and refresh tokens carry the full set so that
 * refresh can re-issue access tokens without a user-table round-trip):
 *   { sub, email, role, fullName, hospitalId, permissions, jti, iat, exp }
 */

import bcrypt from 'bcryptjs';
const { compare } = bcrypt;
import { jwtVerify, decodeJwt } from 'jose';
import { SignJWT } from '../_shared/auth.ts';
import { getSupabaseClient } from '../_shared/supabase-client.ts';
import { AuthRepository } from './repository.ts';
import { UnauthorizedError } from '../_shared/errors.ts';
import { logger } from '../_shared/logger.ts';
import type { LoginRequest, LoginResponseData } from './types.ts';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/** Cookie Max-Age constants — must match the values passed to buildSessionCookie / buildRefreshCookie in index.ts */
const ACCESS_TTL_SEC = 900;     // 15 minutes
const REFRESH_TTL_SEC = 604800; // 7 days

/**
 * Return the AUTH_SECRET as Uint8Array.
 * Throws if the env var is unset — fail fast rather than accepting forged JWTs.
 */
function getAuthKey(): Uint8Array {
  const secret = Deno.env.get('AUTH_SECRET');
  if (!secret) {
    throw new Error(
      'AUTH_SECRET environment variable is not set. ' +
      'Set it via `supabase secrets set AUTH_SECRET=...` before deploying.',
    );
  }
  return new TextEncoder().encode(secret);
}

/**
 * Sign a JWT with the given payload, a fresh random jti, and a fixed expiry.
 * Returns the signed token string, its jti, and the concrete expiresAt Date
 * (used to populate token_revocation.expires_at on logout/rotation).
 */
async function signToken(
  payload: Record<string, unknown>,
  ttlSeconds: number,
): Promise<{ token: string; jti: string; expiresAt: Date }> {
  const jti = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
    .setJti(jti)
    .sign(getAuthKey());
  return { token, jti, expiresAt };
}

// ─── login ───────────────────────────────────────────────────────────────────

/**
 * Verify credentials and return a signed token pair plus sanitized user info.
 * Rate-limited: 5 req/min per IP (enforced at the infrastructure layer).
 *
 * Error messages are intentionally indistinct — "Invalid email or password"
 * for both missing-user and wrong-password, so callers cannot enumerate accounts.
 */
export async function login(
  body: LoginRequest,
): Promise<{ tokens: TokenPair; user: LoginResponseData }> {
  const correlationId = crypto.randomUUID();
  const email = body.email.toLowerCase().trim();

  const repo = new AuthRepository(getSupabaseClient());
  const userRow = await repo.findUserByEmail(email);

  if (!userRow) {
    throw new UnauthorizedError('Invalid email or password.');
  }

  const passwordValid = await compare(body.password, userRow.passwordHash);
  if (!passwordValid) {
    throw new UnauthorizedError('Invalid email or password.');
  }

  let permissions = await repo.getRolePermissions(userRow.role);

  if (permissions.length === 0) {
    // The ADMIN role's permissions array may be intentionally empty in older data
    // (the old Next.js code papered over this with getAllPermissionKeys()). In the new
    // Edge Function we do NOT hardcode the permission list — that would drift from the DB.
    // The Phase 6 migration (20260922000000) seeds the missing keys. If permissions are
    // still empty here it is a data problem, not a code problem: surface it via logging
    // and return the empty array rather than making assumptions.
    logger.warn('Role has an empty permissions array — check Role table data', {
      correlationId,
      hospitalId: userRow.hospital_id,
      userId: userRow.id,
      module: 'auth',
      action: 'login',
    }, { role: userRow.role });
  }

  const jwtPayload = {
    sub: userRow.id,
    email: userRow.email,
    role: userRow.role,
    fullName: userRow.fullName,
    hospitalId: userRow.hospital_id,
    permissions,
  };

  const [access, refresh] = await Promise.all([
    signToken(jwtPayload, ACCESS_TTL_SEC),
    signToken(jwtPayload, REFRESH_TTL_SEC),
  ]);

  // Fire-and-forget — lastLogin write must not block the login response
  repo.touchLastLogin(userRow.id).catch(() => {/* swallowed — see repository jsdoc */});

  logger.info('Login successful', {
    correlationId,
    hospitalId: userRow.hospital_id,
    userId: userRow.id,
    module: 'auth',
    action: 'login',
  });

  return {
    tokens: { accessToken: access.token, refreshToken: refresh.token },
    user: {
      userId: userRow.id,
      name: userRow.fullName,
      role: userRow.role,
      hospitalId: userRow.hospital_id,
      permissions,
    },
  };
}

// ─── refresh ─────────────────────────────────────────────────────────────────

/**
 * Validate the refresh cookie JWT, rotate it (revoke old jti, issue a new pair).
 *
 * Re-fetches permissions from the Role table so any permission changes granted or
 * revoked by an admin take effect within one 15-minute access token window, rather
 * than waiting for the full 7-day refresh expiry. Falls back to the permissions
 * embedded in the refresh token if the Role row returns empty (log + carry forward
 * rather than downgrade an active session silently).
 */
export async function refresh(
  refreshToken: string,
): Promise<{ tokens: TokenPair; user: LoginResponseData }> {
  const correlationId = crypto.randomUUID();

  let payload: Record<string, unknown>;
  try {
    const { payload: p } = await jwtVerify(refreshToken, getAuthKey());
    payload = p as Record<string, unknown>;
  } catch {
    throw new UnauthorizedError(
      'Refresh token is invalid or expired. Please log in again.',
    );
  }

  const oldJti = payload['jti'] as string | undefined;
  const sub = payload['sub'] as string | undefined;
  const hospitalId = payload['hospitalId'] as string | undefined;
  const role = payload['role'] as string | undefined;

  if (!oldJti || !sub || !hospitalId || !role) {
    throw new UnauthorizedError(
      'Refresh token is missing required claims (jti, sub, hospitalId, or role). Please log in again.',
    );
  }

  const repo = new AuthRepository(getSupabaseClient());
  const alreadyRevoked = await repo.findRevocation(oldJti);
  if (alreadyRevoked) {
    // A revoked refresh jti being presented is a possible token replay attempt.
    // Log it with enough detail to investigate, but return a generic 401.
    logger.warn('Refresh token jti is already revoked — possible token replay attempt', {
      correlationId,
      hospitalId,
      userId: sub,
      module: 'auth',
      action: 'refresh',
    }, { jti: oldJti });
    throw new UnauthorizedError(
      'Refresh token has already been used or revoked. Please log in again.',
    );
  }

  // Re-fetch permissions so any role changes are reflected in the new access token
  let permissions = await repo.getRolePermissions(role);
  if (permissions.length === 0) {
    // Role has no permissions in DB — fall back to what the refresh token carries
    // so we do not silently downgrade an active session (see login note above)
    permissions = (payload['permissions'] as string[] | undefined) ?? [];
    logger.warn('Role has empty permissions during refresh — carrying forward token claims', {
      correlationId,
      hospitalId,
      userId: sub,
      module: 'auth',
      action: 'refresh',
    }, { role });
  }

  const jwtPayload = {
    sub,
    email: payload['email'] as string,
    role,
    fullName: payload['fullName'] as string,
    hospitalId,
    permissions,
  };

  // Issue the new token pair first, then revoke the old jti.
  // Order matters: if the revocation insert fails, the client still has
  // a working new pair. The old jti will remain usable until natural expiry,
  // which is an acceptable trade-off at this scale vs. leaving the client
  // with no valid session.
  const [access, newRefresh] = await Promise.all([
    signToken(jwtPayload, ACCESS_TTL_SEC),
    signToken(jwtPayload, REFRESH_TTL_SEC),
  ]);

  const oldRefreshExp = typeof payload['exp'] === 'number'
    ? new Date(payload['exp'] * 1000)
    : new Date(Date.now() + REFRESH_TTL_SEC * 1000);

  await repo.insertRevocation(oldJti, 'refresh', oldRefreshExp);

  logger.info('Token refresh successful', {
    correlationId,
    hospitalId,
    userId: sub,
    module: 'auth',
    action: 'refresh',
  });

  return {
    tokens: { accessToken: access.token, refreshToken: newRefresh.token },
    user: {
      userId: sub,
      name: jwtPayload.fullName,
      role,
      hospitalId,
      permissions,
    },
  };
}

// ─── logout ──────────────────────────────────────────────────────────────────

/**
 * Revoke both the access and refresh token jtis (true server-side logout, H-1 fix).
 *
 * Uses best-effort JWT decode (NOT verify) so logout succeeds even when the access
 * token is already expired or the signature is stale. If either token is unparseable
 * we simply skip its revocation — the client should still receive clear-cookie headers
 * and be considered logged out.
 *
 * Both revocations run in parallel; Promise.allSettled ensures a failure on one
 * does not abort the other.
 */
export async function logout(
  accessToken: string,
  refreshToken: string | null,
): Promise<void> {
  const correlationId = crypto.randomUUID();
  const repo = new AuthRepository(getSupabaseClient());
  const now = Date.now();

  const revocations: Promise<void>[] = [];

  if (accessToken) {
    try {
      const claims = decodeJwt(accessToken);
      const jti = typeof claims['jti'] === 'string' ? claims['jti'] : undefined;
      const exp = typeof claims['exp'] === 'number'
        ? new Date(claims['exp'] * 1000)
        : new Date(now + ACCESS_TTL_SEC * 1000);
      if (jti) {
        revocations.push(repo.insertRevocation(jti, 'access', exp));
      }
    } catch {
      // Unparseable token — nothing to revoke; logout proceeds
    }
  }

  if (refreshToken) {
    try {
      const claims = decodeJwt(refreshToken);
      const jti = typeof claims['jti'] === 'string' ? claims['jti'] : undefined;
      const exp = typeof claims['exp'] === 'number'
        ? new Date(claims['exp'] * 1000)
        : new Date(now + REFRESH_TTL_SEC * 1000);
      if (jti) {
        revocations.push(repo.insertRevocation(jti, 'refresh', exp));
      }
    } catch {
      // Unparseable token — nothing to revoke; logout proceeds
    }
  }

  // allSettled — one DB failure should not prevent the other jti from being revoked
  await Promise.allSettled(revocations);

  logger.info('Logout processed', {
    correlationId,
    module: 'auth',
    action: 'logout',
  });
}
