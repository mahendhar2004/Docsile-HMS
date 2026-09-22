/**
 * Tables owned by the call-logs module:
 *   - CallLog   — Exotel call records (upsert by Exotel call ID)
 *
 * Read-only from:
 *   - Patient   — for patient search and linkage
 *
 * External dependency:
 *   - Exotel API — for sync (EXOTEL_API_KEY, EXOTEL_API_TOKEN, EXOTEL_SID env vars)
 *   - Exotel webhook — authenticated via EXOTEL_WEBHOOK_TOKEN env var
 *
 * Security: EXOTEL_WEBHOOK_TOKEN must always be present; the webhook fails
 * closed (401) if it is missing (H-2 fix from 0-analysis.md).
 *
 * Every query scoped by hospitalId (ADR-007). Phase 7 fills in implementations.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
export class CallLogsRepository {
  constructor(private readonly supabase: SupabaseClient, private readonly hospitalId: string) {}
}
