/**
 * Tables owned by the workup module:
 *   - EyeReading   — auto-refractometer readings (upsert per patient per prescription day)
 *
 * Read-only from:
 *   - Patient      — patient demographics
 *   - Prescription — current prescription for the patient
 *   - Appointment  — today's queue (workup queue)
 *
 * Note: workup status is computed from data (eye reading existence for today's
 * prescription) — it is NOT stored in a status field. The /start endpoint is
 * a deprecated no-op kept only for migration compatibility.
 *
 * Every query scoped by hospitalId (ADR-007). Phase 7 fills in implementations.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
export class WorkupRepository {
  constructor(private readonly supabase: SupabaseClient, private readonly hospitalId: string) {}
}
