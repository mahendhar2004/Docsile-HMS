/**
 * Data-access layer for the health module.
 *
 * Tables accessed:
 *   - None owned. Runs a lightweight query against Supabase to verify DB connectivity.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export class HealthRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  /**
   * Run a minimal query and measure round-trip latency.
   * Uses a `head: true, count: 'exact'` select on HospitalProfile (a table that
   * always exists and is cheap to count) rather than a raw SQL "SELECT 1" — the
   * Supabase JS client has no raw-SQL escape hatch outside RPC, and this achieves
   * the same "did the DB respond" check without transferring row data.
   */
  async checkConnectivity(): Promise<{ ok: boolean; latencyMs: number }> {
    const start = performance.now();
    const { error } = await this.supabase
      .from('HospitalProfile')
      .select('id', { count: 'exact', head: true });
    const latencyMs = Math.round(performance.now() - start);
    return { ok: !error, latencyMs };
  }
}
