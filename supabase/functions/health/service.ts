/**
 * Business logic for the health module.
 *
 * Both endpoints are public (no auth) and must stay simple — a health check that
 * itself depends on complex logic defeats the purpose. getDbHealth is the only
 * one that touches the database; getLiveness never does (it must report "up"
 * even if the DB is unreachable, so callers can distinguish "function is down"
 * from "function is up but DB is down").
 */

import { getSupabaseClient } from '../_shared/supabase-client.ts';
import { HealthRepository } from './repository.ts';
import type { HealthResponse, DbHealthResponse } from './types.ts';

export async function getLiveness(): Promise<HealthResponse> {
  return { status: 'ok' };
}

export async function getDbHealth(): Promise<DbHealthResponse> {
  const repo = new HealthRepository(getSupabaseClient());
  const { ok, latencyMs } = await repo.checkConnectivity();
  return { status: ok ? 'ok' : 'degraded', latencyMs };
}
