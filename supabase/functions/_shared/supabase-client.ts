/**
 * Supabase service-role client factory for docsile-hms Edge Functions.
 *
 * Uses the service_role key which bypasses RLS. Tenant isolation is enforced by the
 * repository layer (mandatory WHERE hospital_id = ? on every query) per ADR-007.
 *
 * Never use the anon key in Edge Functions — it would expose client-side limitations
 * to server-side code and would not have access to service-role-only operations.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

/**
 * Returns the singleton service-role Supabase client.
 *
 * Reads SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from environment.
 * Throws at startup if either variable is missing — fail fast, never silently
 * degrade to an unconfigured client.
 */
export function getSupabaseClient(): SupabaseClient {
  if (_client) return _client;

  const url = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!url) {
    throw new Error(
      'SUPABASE_URL environment variable is not set. ' +
      'Set it via `supabase secrets set SUPABASE_URL=...` before deploying.',
    );
  }
  if (!serviceRoleKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY environment variable is not set. ' +
      'Set it via `supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...` before deploying.',
    );
  }

  _client = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return _client;
}
