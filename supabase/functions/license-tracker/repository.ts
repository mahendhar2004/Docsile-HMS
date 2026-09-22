/**
 * Tables owned by the license-tracker module:
 *   - License   — hospital license records (ordered by expiryDate ASC)
 *
 * External storage:
 *   - Supabase Storage bucket: license-documents (for document uploads)
 *   - documentUrl is saved to License after client uploads to Storage
 *
 * Every query scoped by hospitalId (ADR-007). Phase 7 fills in implementations.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
export class LicenseTrackerRepository {
  constructor(private readonly supabase: SupabaseClient, private readonly hospitalId: string) {}
}
