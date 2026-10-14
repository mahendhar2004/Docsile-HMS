/**
 * Settings repository — data-access layer.
 *
 * Tables owned by the settings module:
 *   - ServiceTemplate       (hard delete)
 *   - HospitalProfile       (single-row-per-hospital upsert, no delete)
 *   - PredefinedTemplate    (prescription templates, hard delete)
 *   - InpatientTemplate     (hard delete)
 *   - PredefinedPackage     (hard delete)
 *   - PredefinedSurgery     (soft delete — isActive=false)
 *   - PredefinedDischarge   (soft delete — isActive=false)
 *   - MedicineMaster        (hard delete; read-shared with doctor module)
 *
 * Every query is scoped by hospital_id (ADR-007). The supabase client uses the
 * service_role key which bypasses RLS, so hospital_id filtering is mandatory here.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { withTimestamps } from '../_shared/db-helpers.ts';

export class SettingsRepository {
  constructor(private readonly supabase: SupabaseClient, private readonly hospitalId: string) {}

  // ─── ServiceTemplate ───────────────────────────────────────────────────────

  async listServiceTemplates(includeInactive = false) {
    let query = this.supabase
      .from('ServiceTemplate')
      .select('*')
      .eq('hospital_id', this.hospitalId);
    if (!includeInactive) query = query.eq('isActive', true);
    const { data, error } = await query
      .order('category', { ascending: true })
      .order('sortOrder', { ascending: true })
      .order('name', { ascending: true });
    if (error) throw error;
    return data ?? [];
  }

  async findServiceTemplateById(id: string) {
    const { data, error } = await this.supabase
      .from('ServiceTemplate')
      .select('*')
      .eq('id', id)
      .eq('hospital_id', this.hospitalId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async insertServiceTemplate(row: Record<string, unknown>) {
    const { data, error } = await this.supabase
      .from('ServiceTemplate')
      .insert(withTimestamps({ ...row, hospital_id: this.hospitalId }))
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async updateServiceTemplate(id: string, patch: Record<string, unknown>) {
    const { error } = await this.supabase
      .from('ServiceTemplate')
      .update({ ...patch, updatedAt: new Date().toISOString() })
      .eq('id', id)
      .eq('hospital_id', this.hospitalId);
    if (error) throw error;
  }

  async deleteServiceTemplate(id: string) {
    const { error } = await this.supabase
      .from('ServiceTemplate')
      .delete()
      .eq('id', id)
      .eq('hospital_id', this.hospitalId);
    if (error) throw error;
  }

  // ─── HospitalProfile ───────────────────────────────────────────────────────

  /**
   * HospitalProfile has NO hospital_id column — its own `id` IS the hospital
   * identifier used everywhere else in the system (see the Phase 4 migration's
   * explicit exclusion: "HospitalProfile (IS the hospital)"). Fetch/write it by
   * `id`, never by a `hospital_id` column, which does not exist on this table.
   * (Found and fixed post-commit: the original implementation filtered/inserted
   * a `hospital_id` column here, which would have made every call to this
   * endpoint fail with a database error — an undefined-column error, not a
   * silent tenant-isolation gap, but broken either way.)
   */
  async getHospitalProfile() {
    const { data, error } = await this.supabase
      .from('HospitalProfile')
      .select('*')
      .eq('id', this.hospitalId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  /**
   * Upsert hospital profile. If no row exists for this hospital, inserts one with
   * a default name (this should only happen for a hospital whose profile row is
   * somehow missing — under normal operation the row already exists, since
   * `this.hospitalId` IS that row's `id`). If a row exists, patches only the
   * provided fields.
   */
  async upsertHospitalProfile(patch: Record<string, unknown>) {
    const now = new Date().toISOString();
    const existing = await this.getHospitalProfile();
    if (!existing) {
      const { error } = await this.supabase
        .from('HospitalProfile')
        .insert({
          id: this.hospitalId,
          name: 'My Hospital',
          ...patch,
          createdAt: now,
          updatedAt: now,
        });
      if (error) throw error;
    } else {
      const { error } = await this.supabase
        .from('HospitalProfile')
        .update({ ...patch, updatedAt: now })
        .eq('id', this.hospitalId);
      if (error) throw error;
    }
  }

  // ─── PredefinedTemplate (prescription templates) ──────────────────────────

  async listPrescriptionTemplates(includeInactive = false) {
    let query = this.supabase
      .from('PredefinedTemplate')
      .select('*')
      .eq('hospital_id', this.hospitalId);
    if (!includeInactive) query = query.eq('isActive', true);
    const { data, error } = await query.order('code', { ascending: true });
    if (error) throw error;
    return data ?? [];
  }

  async findPrescriptionTemplateById(id: string) {
    const { data, error } = await this.supabase
      .from('PredefinedTemplate')
      .select('*')
      .eq('id', id)
      .eq('hospital_id', this.hospitalId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async findPrescriptionTemplateByCode(code: string) {
    const { data, error } = await this.supabase
      .from('PredefinedTemplate')
      .select('id')
      .eq('code', code)
      .eq('hospital_id', this.hospitalId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async insertPrescriptionTemplate(row: Record<string, unknown>) {
    const { data, error } = await this.supabase
      .from('PredefinedTemplate')
      .insert(withTimestamps({ ...row, hospital_id: this.hospitalId }))
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async updatePrescriptionTemplate(id: string, patch: Record<string, unknown>) {
    const { error } = await this.supabase
      .from('PredefinedTemplate')
      .update({ ...patch, updatedAt: new Date().toISOString() })
      .eq('id', id)
      .eq('hospital_id', this.hospitalId);
    if (error) throw error;
  }

  async deletePrescriptionTemplate(id: string) {
    const { error } = await this.supabase
      .from('PredefinedTemplate')
      .delete()
      .eq('id', id)
      .eq('hospital_id', this.hospitalId);
    if (error) throw error;
  }

  // ─── InpatientTemplate ────────────────────────────────────────────────────

  async listInpatientTemplates(includeInactive = false) {
    let query = this.supabase
      .from('InpatientTemplate')
      .select('*')
      .eq('hospital_id', this.hospitalId);
    if (!includeInactive) query = query.eq('isActive', true);
    const { data, error } = await query.order('code', { ascending: true });
    if (error) throw error;
    return data ?? [];
  }

  async findInpatientTemplateById(id: string) {
    const { data, error } = await this.supabase
      .from('InpatientTemplate')
      .select('*')
      .eq('id', id)
      .eq('hospital_id', this.hospitalId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async findInpatientTemplateByCode(code: string) {
    const { data, error } = await this.supabase
      .from('InpatientTemplate')
      .select('id')
      .eq('code', code)
      .eq('hospital_id', this.hospitalId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async insertInpatientTemplate(row: Record<string, unknown>) {
    const { data, error } = await this.supabase
      .from('InpatientTemplate')
      .insert(withTimestamps({ ...row, hospital_id: this.hospitalId }))
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async updateInpatientTemplate(id: string, patch: Record<string, unknown>) {
    const { error } = await this.supabase
      .from('InpatientTemplate')
      .update({ ...patch, updatedAt: new Date().toISOString() })
      .eq('id', id)
      .eq('hospital_id', this.hospitalId);
    if (error) throw error;
  }

  async deleteInpatientTemplate(id: string) {
    const { error } = await this.supabase
      .from('InpatientTemplate')
      .delete()
      .eq('id', id)
      .eq('hospital_id', this.hospitalId);
    if (error) throw error;
  }

  // ─── PredefinedPackage ────────────────────────────────────────────────────

  async listPackages(includeInactive = false) {
    let query = this.supabase
      .from('PredefinedPackage')
      .select('*')
      .eq('hospital_id', this.hospitalId);
    if (!includeInactive) query = query.eq('isActive', true);
    const { data, error } = await query.order('name', { ascending: true });
    if (error) throw error;
    return data ?? [];
  }

  async findPackageById(id: string) {
    const { data, error } = await this.supabase
      .from('PredefinedPackage')
      .select('*')
      .eq('id', id)
      .eq('hospital_id', this.hospitalId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async findPackageByName(name: string) {
    const { data, error } = await this.supabase
      .from('PredefinedPackage')
      .select('id')
      .eq('name', name)
      .eq('hospital_id', this.hospitalId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async insertPackage(row: Record<string, unknown>) {
    const { data, error } = await this.supabase
      .from('PredefinedPackage')
      .insert(withTimestamps({ ...row, hospital_id: this.hospitalId }))
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async updatePackage(id: string, patch: Record<string, unknown>) {
    const { error } = await this.supabase
      .from('PredefinedPackage')
      .update({ ...patch, updatedAt: new Date().toISOString() })
      .eq('id', id)
      .eq('hospital_id', this.hospitalId);
    if (error) throw error;
  }

  async deletePackage(id: string) {
    const { error } = await this.supabase
      .from('PredefinedPackage')
      .delete()
      .eq('id', id)
      .eq('hospital_id', this.hospitalId);
    if (error) throw error;
  }

  // ─── PredefinedSurgery (soft delete) ──────────────────────────────────────

  async listSurgeries(includeInactive = false) {
    let query = this.supabase
      .from('PredefinedSurgery')
      .select('*')
      .eq('hospital_id', this.hospitalId);
    if (!includeInactive) query = query.eq('isActive', true);
    const { data, error } = await query
      .order('sortOrder', { ascending: true })
      .order('name', { ascending: true });
    if (error) throw error;
    return data ?? [];
  }

  async findSurgeryById(id: string) {
    const { data, error } = await this.supabase
      .from('PredefinedSurgery')
      .select('*')
      .eq('id', id)
      .eq('hospital_id', this.hospitalId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async insertSurgery(row: Record<string, unknown>) {
    const { data, error } = await this.supabase
      .from('PredefinedSurgery')
      .insert(withTimestamps({ ...row, hospital_id: this.hospitalId }))
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async updateSurgery(id: string, patch: Record<string, unknown>) {
    const { error } = await this.supabase
      .from('PredefinedSurgery')
      .update({ ...patch, updatedAt: new Date().toISOString() })
      .eq('id', id)
      .eq('hospital_id', this.hospitalId);
    if (error) throw error;
  }

  /** Soft-delete: sets isActive=false. Mirrors old deletePredefinedSurgery behavior. */
  async softDeleteSurgery(id: string) {
    const { error } = await this.supabase
      .from('PredefinedSurgery')
      .update({ isActive: false, updatedAt: new Date().toISOString() })
      .eq('id', id)
      .eq('hospital_id', this.hospitalId);
    if (error) throw error;
  }

  // ─── PredefinedDischarge (soft delete) ────────────────────────────────────

  async listDischarges(includeInactive = false) {
    let query = this.supabase
      .from('PredefinedDischarge')
      .select('*')
      .eq('hospital_id', this.hospitalId);
    if (!includeInactive) query = query.eq('isActive', true);
    const { data, error } = await query
      .order('sortOrder', { ascending: true })
      .order('name', { ascending: true });
    if (error) throw error;
    return data ?? [];
  }

  async findDischargeById(id: string) {
    const { data, error } = await this.supabase
      .from('PredefinedDischarge')
      .select('*')
      .eq('id', id)
      .eq('hospital_id', this.hospitalId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async insertDischarge(row: Record<string, unknown>) {
    const { data, error } = await this.supabase
      .from('PredefinedDischarge')
      .insert(withTimestamps({ ...row, hospital_id: this.hospitalId }))
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async updateDischarge(id: string, patch: Record<string, unknown>) {
    const { error } = await this.supabase
      .from('PredefinedDischarge')
      .update({ ...patch, updatedAt: new Date().toISOString() })
      .eq('id', id)
      .eq('hospital_id', this.hospitalId);
    if (error) throw error;
  }

  /** Soft-delete: sets isActive=false. Mirrors old deletePredefinedDischarge behavior. */
  async softDeleteDischarge(id: string) {
    const { error } = await this.supabase
      .from('PredefinedDischarge')
      .update({ isActive: false, updatedAt: new Date().toISOString() })
      .eq('id', id)
      .eq('hospital_id', this.hospitalId);
    if (error) throw error;
  }

  // ─── MedicineMaster ───────────────────────────────────────────────────────

  async listMedicineMaster(includeInactive = false) {
    let query = this.supabase
      .from('MedicineMaster')
      .select('*')
      .eq('hospital_id', this.hospitalId);
    if (!includeInactive) query = query.eq('isActive', true);
    const { data, error } = await query
      .order('sortOrder', { ascending: true })
      .order('name', { ascending: true });
    if (error) throw error;
    return data ?? [];
  }

  async findMedicineMasterById(id: string) {
    const { data, error } = await this.supabase
      .from('MedicineMaster')
      .select('*')
      .eq('id', id)
      .eq('hospital_id', this.hospitalId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async findMedicineMasterByName(name: string) {
    const { data, error } = await this.supabase
      .from('MedicineMaster')
      .select('id')
      .eq('name', name)
      .eq('hospital_id', this.hospitalId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async insertMedicineMaster(row: Record<string, unknown>) {
    const { data, error } = await this.supabase
      .from('MedicineMaster')
      .insert(withTimestamps({ ...row, hospital_id: this.hospitalId }))
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async updateMedicineMaster(id: string, patch: Record<string, unknown>) {
    const { error } = await this.supabase
      .from('MedicineMaster')
      .update({ ...patch, updatedAt: new Date().toISOString() })
      .eq('id', id)
      .eq('hospital_id', this.hospitalId);
    if (error) throw error;
  }

  async deleteMedicineMaster(id: string) {
    const { error } = await this.supabase
      .from('MedicineMaster')
      .delete()
      .eq('id', id)
      .eq('hospital_id', this.hospitalId);
    if (error) throw error;
  }
}
