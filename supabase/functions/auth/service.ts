/**
 * Business logic stubs for the auth module.
 * Phase 7 replaces each throw with the real implementation.
 *
 * Auth flow (Phase 2 §5, ADR-005):
 *   login  → bcrypt.compare password → sign 15-min access + 7-day refresh JWT → store refresh jti
 *   refresh → verify refresh JWT → revoke old jti → sign new pair → return new cookies
 *   logout  → insert both jtis into token_revocation → clear cookies
 */

import { NotImplementedError } from '../_shared/errors.ts';
import type { LoginRequest, LoginResponseData } from './types.ts';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/**
 * Verify credentials and return signed token pair + user info.
 * Rate-limited: 5 req/min per IP (enforced at the index.ts layer).
 */
export async function login(_body: LoginRequest): Promise<{ tokens: TokenPair; user: LoginResponseData }> {
  throw new NotImplementedError('auth.login — Phase 7');
}

/**
 * Validate the refresh cookie JWT, rotate it (revoke old jti, issue new pair).
 * Rate-limited: 30 req/min per user jti.
 */
export async function refresh(_refreshToken: string): Promise<TokenPair> {
  throw new NotImplementedError('auth.refresh — Phase 7');
}

/**
 * Revoke both the access and refresh token jtis.
 * Inserts into token_revocation so logout is immediately effective (H-1 fix).
 */
export async function logout(_accessToken: string, _refreshToken: string | null): Promise<void> {
  throw new NotImplementedError('auth.logout — Phase 7');
}
