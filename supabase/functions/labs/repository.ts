/**
 * Labs repository — data-access layer only.
 *
 * Tables owned:
 *   Lab                — lab centre records (soft-delete via isActive)
 *   LabInvestigation   — junction: Lab ↔ InvestigationMaster (no hospital_id — child table)
 *   InvestigationMaster — investigation master data (has hospital_id)
 *   LabBill            — bills for ordered tests (has hospital_id)
 *   LabBillItem        — line items on LabBill (no hospital_id — child table, CASCADE)
 *   LabPayment         — payments against LabBill (no hospital_id — child table, CASCADE)
 *
 * Every entity-table query is scoped by hospitalId per ADR-007.
 * Pure child/junction tables (LabInvestigation, LabBillItem, LabPayment) are accessed
 * through their parent FK — no hospital_id column on those tables.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export class LabsRepository {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly hospitalId: string,
  ) {}

  // =========================================================================
  // Lab
  // =========================================================================

  /** List all labs (active + inactive) ordered by sortOrder then name. */
  async findAll(): Promise<Record<string, unknown>[]> {
    const { data, error } = await this.supabase
      .from('Lab')
      .select('*')
      .eq('hospital_id', this.hospitalId)
      .order('sortOrder', { ascending: true })
      .order('name', { ascending: true });
    if (error) throw error;
    return data ?? [];
  }

  /** Count active investigations for each lab (for the list view). */
  async countInvestigationsForLab(labId: string): Promise<number> {
    const { count, error } = await this.supabase
      .from('LabInvestigation')
      .select('*', { count: 'exact', head: true })
      .eq('labId', labId)
      .eq('isActive', true);
    if (error) throw error;
    return count ?? 0;
  }

  /** Find a single lab by its UUID, scoped to this hospital. */
  async findById(id: string): Promise<Record<string, unknown> | null> {
    const { data, error } = await this.supabase
      .from('Lab')
      .select('*')
      .eq('id', id)
      .eq('hospital_id', this.hospitalId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  /** Insert a new lab row. */
  async insert(data: {
    name: string;
    description?: string | null;
    location?: string | null;
    printHeaderKey?: string | null;
    sortOrder?: number;
  }): Promise<Record<string, unknown>> {
    const now = new Date().toISOString();
    const { data: lab, error } = await this.supabase
      .from('Lab')
      .insert({
        name: data.name,
        description: data.description ?? null,
        location: data.location ?? null,
        printHeaderKey: data.printHeaderKey ?? null,
        sortOrder: data.sortOrder ?? 0,
        isActive: true,
        hospital_id: this.hospitalId,
        createdAt: now,
        updatedAt: now,
      })
      .select()
      .single();
    if (error) throw error;
    return lab;
  }

  /** Update mutable lab fields. */
  async update(
    id: string,
    data: Partial<{
      name: string;
      description: string | null;
      location: string | null;
      printHeaderKey: string | null;
      isActive: boolean;
      sortOrder: number;
    }>,
  ): Promise<void> {
    const { error } = await this.supabase
      .from('Lab')
      .update({ ...data, updatedAt: new Date().toISOString() })
      .eq('id', id)
      .eq('hospital_id', this.hospitalId);
    if (error) throw error;
  }

  /**
   * Soft-delete: set isActive = false.
   * Hard-delete was the old behaviour but PROGRESS.md designates this as "(soft)"
   * and the Lab table has isActive — use that rather than deleting a row that may
   * have LabBill FK references.
   */
  async softDelete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('Lab')
      .update({ isActive: false, updatedAt: new Date().toISOString() })
      .eq('id', id)
      .eq('hospital_id', this.hospitalId);
    if (error) throw error;
  }

  // =========================================================================
  // LabInvestigation (junction table — no hospital_id)
  // =========================================================================

  /** Active investigations mapped to this lab, with InvestigationMaster details. */
  async findLabInvestigations(labId: string): Promise<Record<string, unknown>[]> {
    const { data, error } = await this.supabase
      .from('LabInvestigation')
      .select('*, investigation:InvestigationMaster(*)')
      .eq('labId', labId)
      .eq('isActive', true)
      .order('investigation(name)', { ascending: true });
    if (error) throw error;
    return data ?? [];
  }

  /**
   * Replace-all: delete every existing LabInvestigation for this labId then
   * insert the new set, carrying each investigation's own `amount` and
   * `isDefault` — the old Next.js updateLabInvestigations accepted
   * {investigationId, amount, isDefault}[], not a flat id list. The original
   * Phase 5/6 scaffold narrowed this to `investigationIds: string[]` with
   * hardcoded amount=0/isDefault=false, which would have silently discarded
   * per-investigation pricing and default-selection on every save — found and
   * fixed post-Phase-5 (openapi.yaml + this repository + service/types).
   * The caller is responsible for ensuring labId belongs to this hospital
   * (checked in the service layer before calling here).
   */
  async replaceLabInvestigations(
    labId: string,
    investigations: { investigationId: string; amount: number; isDefault: boolean }[],
  ): Promise<void> {
    const { error: delError } = await this.supabase
      .from('LabInvestigation')
      .delete()
      .eq('labId', labId);
    if (delError) throw delError;

    if (investigations.length === 0) return;

    const rows = investigations.map((inv) => ({
      labId,
      investigationId: inv.investigationId,
      amount: inv.amount,
      isDefault: inv.isDefault,
      isActive: true,
    }));
    const { error: insError } = await this.supabase
      .from('LabInvestigation')
      .insert(rows);
    if (insError) throw insError;
  }

  /**
   * Get lab-investigation mappings for the given investigation IDs,
   * joined with Lab details.  Used by getPatientInvestigations.
   */
  async findLabMappingsByInvestigationIds(
    investigationIds: string[],
  ): Promise<Record<string, unknown>[]> {
    if (investigationIds.length === 0) return [];
    const { data, error } = await this.supabase
      .from('LabInvestigation')
      .select('*, lab:Lab(*), investigation:InvestigationMaster(*)')
      .in('investigationId', investigationIds)
      .eq('isActive', true);
    if (error) throw error;
    return data ?? [];
  }

  // =========================================================================
  // InvestigationMaster
  // =========================================================================

  /** All active investigations ordered by sortOrder then name. */
  async findAllInvestigations(): Promise<Record<string, unknown>[]> {
    const { data, error } = await this.supabase
      .from('InvestigationMaster')
      .select('*')
      .eq('hospital_id', this.hospitalId)
      .eq('isActive', true)
      .order('sortOrder', { ascending: true })
      .order('name', { ascending: true });
    if (error) throw error;
    return data ?? [];
  }

  /** Look up an InvestigationMaster by exact name (for duplicate-name guard). */
  async findInvestigationByName(name: string): Promise<Record<string, unknown> | null> {
    const { data, error } = await this.supabase
      .from('InvestigationMaster')
      .select('id, name')
      .eq('hospital_id', this.hospitalId)
      .eq('name', name)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  /** Find InvestigationMaster records by a set of names (used to match prescription items). */
  async findInvestigationsByNames(names: string[]): Promise<Record<string, unknown>[]> {
    if (names.length === 0) return [];
    const { data, error } = await this.supabase
      .from('InvestigationMaster')
      .select('id, name')
      .eq('hospital_id', this.hospitalId)
      .in('name', names)
      .eq('isActive', true);
    if (error) throw error;
    return data ?? [];
  }

  /** Insert a new InvestigationMaster row. */
  async insertInvestigation(data: {
    name: string;
    category?: string | null;
    description?: string | null;
    createdBy: string;
  }): Promise<Record<string, unknown>> {
    const now = new Date().toISOString();
    const { data: inv, error } = await this.supabase
      .from('InvestigationMaster')
      .insert({
        name: data.name,
        category: data.category ?? null,
        description: data.description ?? null,
        isActive: true,
        sortOrder: 0,
        createdBy: data.createdBy,
        hospital_id: this.hospitalId,
        createdAt: now,
        updatedAt: now,
      })
      .select()
      .single();
    if (error) throw error;
    return inv;
  }

  // =========================================================================
  // Patient / Prescription (read-only — used by getPatientInvestigations)
  // =========================================================================

  /** Find a patient by the sequential patientId (e.g. "P0001"), scoped to hospital. */
  async findPatientByPatientId(
    patientId: string,
  ): Promise<Record<string, unknown> | null> {
    const { data, error } = await this.supabase
      .from('Patient')
      .select('id, patientId, firstName, lastName, age, gender, phone, doctorName')
      .eq('patientId', patientId)
      .eq('hospital_id', this.hospitalId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  /**
   * Find the latest prescription with a non-empty investigations JSON field
   * for the given patient (by sequential patientId).
   */
  async findLatestPrescriptionWithInvestigations(
    patientId: string,
  ): Promise<Record<string, unknown> | null> {
    const { data, error } = await this.supabase
      .from('Prescription')
      .select('id, prescriptionNumber, investigations, doctorName, prescriptionDate')
      .eq('patientId', patientId)
      .eq('hospital_id', this.hospitalId)
      .in('status', ['COMPLETED', 'DRAFT'])
      .neq('investigations', '[]')
      .not('investigations', 'is', null)
      .order('prescriptionDate', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  /**
   * Find existing LabBills for a prescription (to detect already-billed investigations).
   * LabBill has hospital_id.
   */
  async findBillsForPrescription(
    prescriptionId: string,
  ): Promise<Record<string, unknown>[]> {
    const { data, error } = await this.supabase
      .from('LabBill')
      .select('*, lab:Lab(*), items:LabBillItem(*)')
      .eq('prescriptionId', prescriptionId)
      .eq('hospital_id', this.hospitalId)
      .neq('status', 'CANCELLED');
    if (error) throw error;
    return data ?? [];
  }

  // =========================================================================
  // Pending investigations
  // =========================================================================

  /**
   * Fetch prescriptions in the given UTC time range that have a non-empty
   * investigations field, including the nested Patient row.
   */
  async findPrescriptionsWithInvestigationsBetween(
    startUtc: string,
    endUtc: string,
  ): Promise<Record<string, unknown>[]> {
    const { data, error } = await this.supabase
      .from('Prescription')
      .select(`
        id, prescriptionNumber, doctorName, investigations, prescriptionDate,
        patient:Patient(id, patientId, firstName, lastName, age, gender, phone)
      `)
      .eq('hospital_id', this.hospitalId)
      .gte('prescriptionDate', startUtc)
      .lte('prescriptionDate', endUtc)
      .neq('investigations', '[]')
      .not('investigations', 'is', null)
      .order('prescriptionDate', { ascending: false });
    if (error) throw error;
    return data ?? [];
  }

  /**
   * Fetch LabBill statuses for a set of prescription IDs (to determine which
   * prescriptions are already fully billed).
   */
  async findBillStatusesByPrescriptionIds(
    prescriptionIds: string[],
  ): Promise<{ prescriptionId: string; status: string }[]> {
    if (prescriptionIds.length === 0) return [];
    const { data, error } = await this.supabase
      .from('LabBill')
      .select('prescriptionId, status')
      .eq('hospital_id', this.hospitalId)
      .in('prescriptionId', prescriptionIds);
    if (error) throw error;
    return (data ?? []) as { prescriptionId: string; status: string }[];
  }

  // =========================================================================
  // LabBill
  // =========================================================================

  /**
   * Generate the next bill number for today using the same prefix pattern as
   * the old Next.js code: LB-YYYYMMDD-NNNN.
   *
   * Note: this has the same TOCTOU limitation as the old app.  A dedicated
   * Postgres sequence for lab bills would fix it but is not yet created
   * (only patient/IP/prescription sequences exist — see deferred items).
   */
  async getNextBillNumber(): Promise<string> {
    const today = new Date();
    const prefix = `LB-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    const { data: last } = await this.supabase
      .from('LabBill')
      .select('billNumber')
      .eq('hospital_id', this.hospitalId)
      .like('billNumber', `${prefix}%`)
      .order('billNumber', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!last) return `${prefix}-0001`;
    const lastNum = parseInt((last.billNumber as string).split('-').pop() ?? '0', 10);
    return `${prefix}-${String(lastNum + 1).padStart(4, '0')}`;
  }

  /** Insert a LabBill row. Returns the inserted row (with nested lab). */
  async insertBill(data: {
    billNumber: string;
    labId: string;
    patientId: string;
    prescriptionId?: string | null;
    subtotal: number;
    discount: number;
    discountReason?: string | null;
    total: number;
    amountPaid: number;
    balanceDue: number;
    paymentMode?: string | null;
    paymentDate?: string | null;
    status: string;
    createdBy: string;
  }): Promise<Record<string, unknown>> {
    const now = new Date().toISOString();
    const { data: bill, error } = await this.supabase
      .from('LabBill')
      .insert({
        ...data,
        hospital_id: this.hospitalId,
        createdAt: now,
        updatedAt: now,
      })
      .select('*, lab:Lab(*)')
      .single();
    if (error) throw error;
    return bill;
  }

  /** Insert LabBillItem rows for a bill. */
  async insertBillItems(
    items: {
      labBillId: string;
      investigationId: string;
      name: string;
      amount: number;
      sortOrder: number;
    }[],
  ): Promise<void> {
    if (items.length === 0) return;
    const { error } = await this.supabase.from('LabBillItem').insert(items);
    if (error) throw error;
  }

  /** Insert a LabPayment row (only when amountPaid > 0). */
  async insertPayment(payment: {
    labBillId: string;
    amount: number;
    paymentMode: string;
    receivedBy: string;
  }): Promise<void> {
    const { error } = await this.supabase.from('LabPayment').insert(payment);
    if (error) throw error;
  }

  /** Paginated list of LabBills, ordered by createdAt DESC. */
  async findBills(filters: {
    page: number;
    pageSize: number;
    date?: string;
  }): Promise<Record<string, unknown>[]> {
    let query = this.supabase
      .from('LabBill')
      .select(
        '*, lab:Lab(name, printHeaderKey), patient:Patient(id, patientId, firstName, lastName, phone, age, gender, address), items:LabBillItem(*), payments:LabPayment(*)',
      )
      .eq('hospital_id', this.hospitalId)
      .order('createdAt', { ascending: false });

    if (filters.date) {
      const start = new Date(`${filters.date}T00:00:00+05:30`).toISOString();
      const end = new Date(`${filters.date}T23:59:59+05:30`).toISOString();
      query = query.gte('createdAt', start).lte('createdAt', end);
    }

    const { data, error } = await query
      .range(
        (filters.page - 1) * filters.pageSize,
        filters.page * filters.pageSize - 1,
      );
    if (error) throw error;
    return data ?? [];
  }

  /** Count LabBills matching the same filters (for pagination total). */
  async countBills(filters: { date?: string }): Promise<number> {
    let query = this.supabase
      .from('LabBill')
      .select('*', { count: 'exact', head: true })
      .eq('hospital_id', this.hospitalId);

    if (filters.date) {
      const start = new Date(`${filters.date}T00:00:00+05:30`).toISOString();
      const end = new Date(`${filters.date}T23:59:59+05:30`).toISOString();
      query = query.gte('createdAt', start).lte('createdAt', end);
    }

    const { count, error } = await query;
    if (error) throw error;
    return count ?? 0;
  }

  /** Single LabBill with all nested relations (items, payments, lab, patient, prescription). */
  async findBillById(id: string): Promise<Record<string, unknown> | null> {
    const { data, error } = await this.supabase
      .from('LabBill')
      .select(
        '*, lab:Lab(*), patient:Patient(*), prescription:Prescription(prescriptionNumber, doctorName), items:LabBillItem(*), payments:LabPayment(*)',
      )
      .eq('id', id)
      .eq('hospital_id', this.hospitalId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }
}
