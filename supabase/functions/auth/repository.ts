/**
 * Data-access layer for the auth module.
 *
 * Tables accessed:
 *   - User            — find user by email (isActive check included)
 *   - Role            — fetch role permissions (global table, no hospital_id column)
 *   - token_revocation — write revoked jtis on logout/rotation; read-side for refresh jti checks
 *
 * hospitalId timing note (ADR-007):
 *   Login happens before a session exists, so hospitalId is discovered from the
 *   User row itself — not passed in as a precondition. Role is a global (non-tenant)
 *   table (the backfill migration explicitly excludes it). token_revocation is not
 *   tenant-scoped either. This is the one auth module where the constructor does NOT
 *   take hospitalId — none of its operations require it at construction time.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export interface UserRow {
  id: string;
  email: string;
  passwordHash: string;
  fullName: string;
  role: string;
  isActive: boolean;
  hospital_id: string;
}

export class AuthRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  /**
   * Find an active user by email.
   * Returns null when no matching user exists or the account is inactive.
   * Does NOT filter by hospitalId — hospitalId is discovered from the returned row.
   */
  async findUserByEmail(email: string): Promise<UserRow | null> {
    const { data, error } = await this.supabase
      .from('User')
      .select('id, email, passwordHash, fullName, role, isActive, hospital_id')
      .eq('email', email)
      .eq('isActive', true)
      .maybeSingle();

    if (error) {
      throw new Error(`User lookup by email failed: ${error.message}`);
    }
    return data as UserRow | null;
  }

  /**
   * Fetch the permissions string array for a named role.
   * Role is a global (non-tenant) table — no hospitalId filter is required or appropriate.
   * Returns an empty array if the role row does not exist or its permissions column is
   * empty or unparseable.
   */
  async getRolePermissions(roleName: string): Promise<string[]> {
    const { data, error } = await this.supabase
      .from('Role')
      .select('permissions')
      .eq('name', roleName)
      .maybeSingle();

    if (error) {
      throw new Error(`Role lookup for "${roleName}" failed: ${error.message}`);
    }
    if (!data || !data.permissions) return [];

    try {
      const parsed = JSON.parse(data.permissions as string);
      return Array.isArray(parsed) ? (parsed as string[]) : [];
    } catch {
      return [];
    }
  }

  /**
   * Insert a revoked token jti into token_revocation.
   * Called on logout (both jtis) and on refresh rotation (old refresh jti).
   * Idempotent: duplicate inserts (e.g. a client double-posting logout) are silently ignored.
   */
  async insertRevocation(
    jti: string,
    tokenType: 'access' | 'refresh',
    expiresAt: Date,
  ): Promise<void> {
    const { error } = await this.supabase
      .from('token_revocation')
      .insert({ jti, token_type: tokenType, expires_at: expiresAt.toISOString() });

    if (error) {
      // 23505 = unique_violation — idempotent logout/rotation path
      if (error.code === '23505' || error.message.includes('duplicate key')) return;
      throw new Error(`Failed to revoke token jti "${jti}" (${tokenType}): ${error.message}`);
    }
  }

  /**
   * Check whether a jti already exists in token_revocation.
   * Used during refresh to enforce single-use rotation — if the presented refresh jti
   * is already revoked, the client must log in again.
   * (Access-token jti checks are handled by verifySession in _shared/auth.ts.)
   */
  async findRevocation(jti: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('token_revocation')
      .select('jti')
      .eq('jti', jti)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (error) {
      throw new Error(`Revocation lookup for jti "${jti}" failed: ${error.message}`);
    }
    return data !== null;
  }

  /**
   * Touch the user's lastLogin timestamp.
   * Fire-and-forget — the caller must not await this for request-critical paths.
   * Failure is swallowed silently; lastLogin is telemetry, not a business invariant.
   */
  async touchLastLogin(userId: string): Promise<void> {
    await this.supabase
      .from('User')
      .update({ lastLogin: new Date().toISOString() })
      .eq('id', userId);
    // Errors intentionally discarded — see jsdoc above.
  }
}
