/**
 * The queue module owns no tables — it is a read-aggregation module.
 *
 * Read-only from:
 *   - Patient        — patient demographics
 *   - Prescription   — today's OPD visits (for OPD queue status)
 *   - EyeReading     — today's eye readings (for workup status)
 *   - InPatient      — currently admitted (for inpatient board)
 *   - Appointment    — today's appointments (for OPD queue)
 *
 * OPD queue status is computed from data via 3 parallel queries (appointment +
 * prescription + eye-reading dates), not stored in a status field.
 *
 * Every query scoped by hospitalId (ADR-007). Phase 7 fills in implementations.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
export class QueueRepository {
  constructor(private readonly supabase: SupabaseClient, private readonly hospitalId: string) {}
}
