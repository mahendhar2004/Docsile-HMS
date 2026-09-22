/**
 * Tables owned by the doctor module:
 *   - Prescription          — patient consultation records (upsert: one per patient per day)
 *   - DropdownOption        — doctor-scoped custom dropdown values (per hospital)
 *   - MedicineMaster        — shared medicine catalog (created by doctor workflow; also in settings)
 *
 * Read-only from:
 *   - Patient               — patient demographics for consultation view
 *   - EyeReading            — last eye reading for consultation view
 *   - PredefinedTemplate    — prescription templates
 *   - InvestigationMaster   — investigation dropdown data
 *   - Prescription          — history for consultation context
 *   - Appointment           — doctor queue (today's appointments)
 *   - HospitalProfile       — for receipt data
 *
 * Every query scoped by hospitalId (ADR-007). Phase 7 fills in implementations.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
export class DoctorRepository {
  constructor(private readonly supabase: SupabaseClient, private readonly hospitalId: string) {}
}
