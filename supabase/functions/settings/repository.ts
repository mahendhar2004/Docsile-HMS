/**
 * Tables owned by the settings module:
 *   - HospitalProfile        — singleton hospital config (soft-upsert by hospitalId)
 *   - ServiceTemplate        — billable service catalog
 *   - PredefinedTemplate     — prescription templates
 *   - InpatientTemplate      — inpatient document templates
 *   - PredefinedPackage      — predefined service bundles
 *   - PredefinedSurgery      — predefined surgery definitions (soft-delete)
 *   - PredefinedDischarge    — predefined discharge summary templates (soft-delete)
 *   - MedicineMaster         — global medicine catalog (shared with doctor module)
 *
 * Every query scoped by hospitalId (ADR-007). Phase 7 fills in implementations.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
export class SettingsRepository {
  constructor(private readonly supabase: SupabaseClient, private readonly hospitalId: string) {}
}
