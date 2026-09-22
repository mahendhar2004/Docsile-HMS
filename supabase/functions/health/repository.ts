/**
 * Data-access layer for the health module.
 *
 * Tables accessed:
 *   - None owned. Runs a lightweight SELECT 1 against Supabase to verify DB connectivity.
 *
 * Phase 7: implement checkDbConnectivity() that runs SELECT 1 and returns latency.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export class HealthRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  // Phase 7: implement checkDbConnectivity(): Promise<{ latencyMs: number }>
}
