/**
 * InsuranceRepository — data-access layer for the insurance module.
 *
 * Tables owned:
 *   - InsuranceCompany   (soft-delete via isActive=false)
 *   - InsuranceClaim     (status-machine workflow; financial fields computed in-process)
 *
 * Read/write cross-module:
 *   - InPatient          (read for claim creation; write paymentRecords for patient payments)
 *
 * All queries are scoped by hospital_id (ADR-007).
 * No InsurancePayment table exists in the DB — patient payments on a claim are
 * recorded by appending to InPatient.paymentRecords (TEXT JSON) and updating
 * claim denormalized counters, matching the old actions.ts behavior exactly.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { InsuranceCompany, UpdateClaimDetails } from './types.ts';
import { withTimestamps, withId } from '../_shared/db-helpers.ts';

export class InsuranceRepository {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly hospitalId: string,
  ) {}

  // ── InsuranceCompany ──────────────────────────────────────────────────────

  /**
   * Paginated list of companies.
   * When activeOnly=true the old getInsuranceCompanies (list view) behavior applies.
   * When activeOnly=false (paginated=false / all) the old getAllInsuranceCompanies behavior.
   */
  async findCompanies(
    page: number,
    pageSize: number,
    activeOnly: boolean,
  ): Promise<{ rows: Record<string, unknown>[]; total: number }> {
    let query = this.supabase
      .from('InsuranceCompany')
      .select('*', { count: 'exact' })
      .eq('hospital_id', this.hospitalId)
      .order('name', { ascending: true });

    if (activeOnly) {
      query = query.eq('isActive', true);
    }

    const from = (page - 1) * pageSize;
    query = query.range(from, from + pageSize - 1);

    const { data, count, error } = await query;
    if (error) throw error;
    return { rows: (data ?? []) as Record<string, unknown>[], total: count ?? 0 };
  }

  /** Return all companies unfiltered and unpaginated (for dropdown/select). */
  async findAllCompanies(): Promise<Record<string, unknown>[]> {
    const { data, error } = await this.supabase
      .from('InsuranceCompany')
      .select('*')
      .eq('hospital_id', this.hospitalId)
      .order('name', { ascending: true });
    if (error) throw error;
    return (data ?? []) as Record<string, unknown>[];
  }

  async findCompanyById(id: string): Promise<Record<string, unknown> | null> {
    const { data, error } = await this.supabase
      .from('InsuranceCompany')
      .select('*')
      .eq('id', id)
      .eq('hospital_id', this.hospitalId)
      .maybeSingle();
    if (error) throw error;
    return data as Record<string, unknown> | null;
  }

  async insertCompany(row: {
    name: string;
    tpaName?: string | null;
    contactNumber?: string | null;
    email?: string | null;
    address?: string | null;
    hospital_id: string;
  }): Promise<Record<string, unknown>> {
    const { data, error } = await this.supabase
      .from('InsuranceCompany')
      .insert(withTimestamps({ ...row, isActive: true }))
      .select()
      .single();
    if (error) throw error;
    return data as Record<string, unknown>;
  }

  async updateCompany(
    id: string,
    patch: Partial<{
      name: string;
      tpaName: string | null;
      contactNumber: string | null;
      email: string | null;
      address: string | null;
      isActive: boolean;
    }>,
  ): Promise<void> {
    const { error } = await this.supabase
      .from('InsuranceCompany')
      .update({ ...patch, updatedAt: new Date().toISOString() })
      .eq('id', id)
      .eq('hospital_id', this.hospitalId);
    if (error) throw error;
  }

  /** Soft-delete: set isActive=false. */
  async softDeleteCompany(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('InsuranceCompany')
      .update({ isActive: false, updatedAt: new Date().toISOString() })
      .eq('id', id)
      .eq('hospital_id', this.hospitalId);
    if (error) throw error;
  }

  // ── InsuranceClaim ────────────────────────────────────────────────────────

  async findClaims(
    page: number,
    pageSize: number,
    status?: string,
    excludeClosed?: boolean,
    search?: string,
  ): Promise<{ rows: Record<string, unknown>[]; total: number }> {
    let query = this.supabase
      .from('InsuranceClaim')
      .select(
        'id, claimNumber, patientName, ipNumber, insuranceCompanyName, tpaName, totalBillAmount, preauthAmount, enhancementApproved, totalApprovedAmount, finalSettledAmount, patientBalance, status, createdAt',
        { count: 'exact' },
      )
      .eq('hospital_id', this.hospitalId)
      .order('createdAt', { ascending: false });

    if (excludeClosed) {
      query = query.neq('status', 'CLOSED');
    }

    if (status) {
      const statuses = status.split(',').map((s) => s.trim()).filter(Boolean);
      query = statuses.length > 1 ? query.in('status', statuses) : query.eq('status', statuses[0]);
    }

    if (search) {
      query = query.or(
        `claimNumber.ilike.%${search}%,patientName.ilike.%${search}%,ipNumber.ilike.%${search}%,phone.ilike.%${search}%,insuranceCompanyName.ilike.%${search}%`,
      );
    }

    const from = (page - 1) * pageSize;
    query = query.range(from, from + pageSize - 1);

    const { data, count, error } = await query;
    if (error) throw error;
    return { rows: (data ?? []) as Record<string, unknown>[], total: count ?? 0 };
  }

  async findClaimById(id: string): Promise<Record<string, unknown> | null> {
    const { data, error } = await this.supabase
      .from('InsuranceClaim')
      .select('*')
      .eq('id', id)
      .eq('hospital_id', this.hospitalId)
      .maybeSingle();
    if (error) throw error;
    return data as Record<string, unknown> | null;
  }

  async insertClaim(row: Record<string, unknown>): Promise<Record<string, unknown>> {
    const { data, error } = await this.supabase
      .from('InsuranceClaim')
      .insert(withId(row))
      .select()
      .single();
    if (error) throw error;
    return data as Record<string, unknown>;
  }

  async updateClaim(id: string, patch: Record<string, unknown>): Promise<void> {
    const { error } = await this.supabase
      .from('InsuranceClaim')
      .update({ ...patch, updatedAt: new Date().toISOString() })
      .eq('id', id)
      .eq('hospital_id', this.hospitalId);
    if (error) throw error;
  }

  // ── InPatient (cross-module read + payment write) ─────────────────────────

  async findInpatientById(id: string): Promise<Record<string, unknown> | null> {
    const { data, error } = await this.supabase
      .from('InPatient')
      .select('*')
      .eq('id', id)
      .eq('hospital_id', this.hospitalId)
      .maybeSingle();
    if (error) throw error;
    return data as Record<string, unknown> | null;
  }

  /**
   * Search inpatients for insurance claim creation.
   * Old behavior: ilike on ipNumber, name, phone; limit 10.
   */
  async searchInpatients(search: string): Promise<Record<string, unknown>[]> {
    const { data, error } = await this.supabase
      .from('InPatient')
      .select('id, ipNumber, name, age, gender, phone, department, packageAmount, netAmount, admissionDate, operationName')
      .eq('hospital_id', this.hospitalId)
      .or(`ipNumber.ilike.%${search}%,name.ilike.%${search}%,phone.like.%${search}%`)
      .order('admissionDate', { ascending: false })
      .limit(10);
    if (error) throw error;
    return (data ?? []) as Record<string, unknown>[];
  }

  /** Update InPatient payment records JSON and recalculate totals. */
  async updateInpatientPaymentRecords(
    inpatientId: string,
    paymentRecords: unknown[],
    totalReceivedAmount: number,
    balanceAmount: number,
  ): Promise<void> {
    const { error } = await this.supabase
      .from('InPatient')
      .update({
        paymentRecords: JSON.stringify(paymentRecords),
        totalReceivedAmount,
        balanceAmount,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', inpatientId)
      .eq('hospital_id', this.hospitalId);
    if (error) throw error;
  }
}
