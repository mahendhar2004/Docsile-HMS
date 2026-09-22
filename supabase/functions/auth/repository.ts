/**
 * Data-access layer for the auth module.
 *
 * Tables owned / accessed by this module:
 *   - User (read: verify credentials, fetch role + permissions on login)
 *   - Role (read: fetch permissions for the user's role on login)
 *   - token_revocation (write: INSERT on logout; read: jti check is in _shared/auth.ts)
 *
 * NOTE: Phase 7 fills in the actual query implementations.
 * The repository constructor takes hospitalId and scopes every query to it (ADR-007).
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export class AuthRepository {
  constructor(
    private readonly supabase: SupabaseClient,
  ) {}

  // Phase 7: implement findUserByEmail(email, hospitalId), getUserPermissions(userId),
  // revokeTokens(accessJti, accessExp, refreshJti, refreshExp), verifyRefreshJti(jti)
}
