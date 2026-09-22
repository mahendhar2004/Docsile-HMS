/**
 * Tables owned by the staff module:
 *   - User              — staff member records (provisioned + managed here)
 *   - Role              — role definitions (system + custom)
 *   - RolePermission    — many-to-many: Role ↔ permission scope strings (CASCADE)
 *
 * Note: User creation also provisions a Supabase Auth identity via service_role
 * admin API — not a direct DB insert alone.
 *
 * Every query scoped by hospitalId (ADR-007). Phase 7 fills in implementations.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
export class StaffRepository {
  constructor(private readonly supabase: SupabaseClient, private readonly hospitalId: string) {}
}
