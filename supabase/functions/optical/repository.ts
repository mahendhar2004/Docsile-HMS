/**
 * Optical repository — data-access layer.
 *
 * Tables owned by the optical module:
 *   - OpticalProduct    — product catalog (soft-delete via isActive=false)
 *   - OpticalStock      — stock entries per product/batch/power (upsert semantics)
 *   - OpticalBill       — bills for optical purchases
 *   - OpticalBillItem   — line items on OpticalBill (CASCADE from OpticalBill)
 *
 * Read-only from:
 *   - HospitalProfile   — for hospital name/print header and optical settings
 *   - Patient           — for AR-reading lookup
 *   - EyeReading        — nested under Patient for AR-reading lookup
 *   - Prescription      — nested under Patient for AR-reading lookup
 *
 * Scoping rules (ADR-007):
 *   - OpticalProduct, OpticalStock, OpticalBill, Patient: scoped by .eq('hospital_id', hospitalId)
 *   - OpticalBillItem: pure child table — NO hospital_id column (excluded from backfill per 4-datamodel.md)
 *   - HospitalProfile: NO hospital_id column — its OWN `id` IS the hospital identifier.
 *     ALWAYS use .eq('id', hospitalId). Never query/insert a nonexistent hospital_id column.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { OpticalBillListQuery, StockSearchResult } from './types.ts';

export class OpticalRepository {
  constructor(private readonly supabase: SupabaseClient, private readonly hospitalId: string) {}

  // ─── OpticalProduct ────────────────────────────────────────────────────────

  async listProducts() {
    const { data, error } = await this.supabase
      .from('OpticalProduct')
      .select('*')
      .eq('hospital_id', this.hospitalId)
      .eq('isActive', true)
      .order('category', { ascending: true })
      .order('name', { ascending: true })
      .limit(200);
    if (error) throw error;
    return data ?? [];
  }

  async findProductById(id: string) {
    const { data, error } = await this.supabase
      .from('OpticalProduct')
      .select('*')
      .eq('id', id)
      .eq('hospital_id', this.hospitalId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async insertProduct(row: Record<string, unknown>) {
    const { data, error } = await this.supabase
      .from('OpticalProduct')
      .insert({ ...row, hospital_id: this.hospitalId })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async updateProduct(id: string, patch: Record<string, unknown>) {
    const { error } = await this.supabase
      .from('OpticalProduct')
      .update({ ...patch, updatedAt: new Date().toISOString() })
      .eq('id', id)
      .eq('hospital_id', this.hospitalId);
    if (error) throw error;
  }

  /**
   * Soft-delete: sets isActive=false. Hard delete is intentionally not exposed —
   * products may be referenced by stock rows and bill items.
   */
  async softDeleteProduct(id: string) {
    const { error } = await this.supabase
      .from('OpticalProduct')
      .update({ isActive: false, updatedAt: new Date().toISOString() })
      .eq('id', id)
      .eq('hospital_id', this.hospitalId);
    if (error) throw error;
  }

  // ─── OpticalStock ──────────────────────────────────────────────────────────

  async listStock() {
    const { data, error } = await this.supabase
      .from('OpticalStock')
      .select('*, product:OpticalProduct(*)')
      .eq('hospital_id', this.hospitalId)
      .eq('isActive', true)
      .order('createdAt', { ascending: false })
      .limit(500);
    if (error) throw error;
    // Filter out rows where the inner product join returned null (soft-deleted product)
    return (data ?? []).filter((item: Record<string, unknown>) => item.product != null);
  }

  /**
   * Find an existing stock row by the UNIQUE key (productId, batchNumber, power).
   * Nulls are matched explicitly with .is(col, null) to avoid false non-matches.
   */
  async findExistingStock(
    productId: string,
    batchNumber: string | null | undefined,
    power: string | null | undefined,
  ) {
    // Build query step by step to handle nullable UNIQUE key columns correctly
    const base = this.supabase
      .from('OpticalStock')
      .select('*')
      .eq('hospital_id', this.hospitalId)
      .eq('productId', productId);

    const withBatch = batchNumber != null
      ? base.eq('batchNumber', batchNumber)
      : base.is('batchNumber', null);

    const withPower = power != null
      ? withBatch.eq('power', power)
      : withBatch.is('power', null);

    const { data, error } = await withPower.limit(1);
    if (error) throw error;
    return (data as Record<string, unknown>[])?.[0] ?? null;
  }

  async insertStock(row: Record<string, unknown>) {
    const { data, error } = await this.supabase
      .from('OpticalStock')
      .insert({ ...row, hospital_id: this.hospitalId })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  /**
   * Increment quantity on an existing stock row by addQuantity.
   * currentQuantity is passed in to avoid a second read inside this method.
   */
  async incrementStockQuantity(id: string, addQuantity: number, currentQuantity: number) {
    const { data, error } = await this.supabase
      .from('OpticalStock')
      .update({
        quantity: currentQuantity + addQuantity,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('hospital_id', this.hospitalId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async findStockById(id: string) {
    const { data, error } = await this.supabase
      .from('OpticalStock')
      .select('*')
      .eq('id', id)
      .eq('hospital_id', this.hospitalId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async updateStock(id: string, patch: Record<string, unknown>) {
    const { error } = await this.supabase
      .from('OpticalStock')
      .update({ ...patch, updatedAt: new Date().toISOString() })
      .eq('id', id)
      .eq('hospital_id', this.hospitalId);
    if (error) throw error;
  }

  /**
   * Summary counts: total active stock rows (quantity > 0) and low-stock rows
   * (1 ≤ quantity ≤ 5). Mirrors old getStockSummary in actions.ts.
   * Uses parallel requests for efficiency.
   */
  async getStockSummary() {
    const [totalResult, lowResult] = await Promise.all([
      this.supabase
        .from('OpticalStock')
        .select('id', { count: 'exact', head: true })
        .eq('hospital_id', this.hospitalId)
        .eq('isActive', true)
        .gt('quantity', 0),
      this.supabase
        .from('OpticalStock')
        .select('id', { count: 'exact', head: true })
        .eq('hospital_id', this.hospitalId)
        .eq('isActive', true)
        .lte('quantity', 5)
        .gt('quantity', 0),
    ]);
    if (totalResult.error) throw totalResult.error;
    if (lowResult.error) throw lowResult.error;
    return {
      totalItems: totalResult.count ?? 0,
      lowStock: lowResult.count ?? 0,
    };
  }

  /**
   * Fetch active in-stock rows with product data, then do in-process name/brand/model
   * search matching. Returns at most 20 results in the mapped StockSearchResult shape.
   */
  async searchStock(search: string): Promise<StockSearchResult[]> {
    const { data, error } = await this.supabase
      .from('OpticalStock')
      .select('*, product:OpticalProduct!inner(*)')
      .eq('hospital_id', this.hospitalId)
      .eq('isActive', true)
      .gt('quantity', 0)
      .order('createdAt', { ascending: false })
      .limit(200);
    if (error) throw error;

    const s = search.toLowerCase();
    return ((data ?? []) as Record<string, unknown>[])
      .filter((item) => {
        const product = item.product as Record<string, string | null>;
        return (
          (product.name ?? '').toLowerCase().includes(s) ||
          (product.brand ?? '').toLowerCase().includes(s) ||
          (product.modelNumber ?? '').toLowerCase().includes(s)
        );
      })
      .slice(0, 20)
      .map((item) => {
        const product = item.product as Record<string, unknown>;
        return {
          stockId: item.id as string,
          productId: product.id as string,
          name: product.name as string,
          brand: (product.brand ?? null) as string | null,
          category: product.category as string,
          type: (product.type ?? null) as string | null,
          modelNumber: (product.modelNumber ?? null) as string | null,
          batchNumber: (item.batchNumber ?? null) as string | null,
          quantity: item.quantity as number,
          mrp: item.mrp as number,
          gstPercent: item.gstPercent as number,
          power: (item.power ?? null) as string | null,
        };
      });
  }

  // ─── OpticalBill ───────────────────────────────────────────────────────────

  /**
   * Paginated bill list with optional date/status/search filters.
   * Includes nested OpticalBillItem rows on each bill.
   * In-process search filter is applied after the DB fetch when search is set,
   * which means the total count reflects the DB-level filter only — acceptable
   * since search is an additive refinement used for display, not reporting.
   */
  async listBills(filters: OpticalBillListQuery): Promise<{ data: Record<string, unknown>[]; total: number }> {
    const offset = (filters.page - 1) * filters.pageSize;

    let query = this.supabase
      .from('OpticalBill')
      .select('*, items:OpticalBillItem(*)', { count: 'exact' })
      .eq('hospital_id', this.hospitalId)
      .order('createdAt', { ascending: false })
      .range(offset, offset + filters.pageSize - 1);

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    // Single-day date filter takes precedence over range filter
    if (filters.date) {
      query = query
        .gte('billDate', new Date(filters.date + 'T00:00:00+05:30').toISOString())
        .lte('billDate', new Date(filters.date + 'T23:59:59+05:30').toISOString());
    } else {
      if (filters.dateFrom) {
        query = query.gte('billDate', new Date(filters.dateFrom + 'T00:00:00+05:30').toISOString());
      }
      if (filters.dateTo) {
        query = query.lte('billDate', new Date(filters.dateTo + 'T23:59:59+05:30').toISOString());
      }
    }

    const { data, count, error } = await query;
    if (error) throw error;

    let bills = (data ?? []) as Record<string, unknown>[];
    if (filters.search) {
      const s = filters.search.toLowerCase();
      bills = bills.filter(
        (b) =>
          ((b.patientName as string) ?? '').toLowerCase().includes(s) ||
          ((b.billNumber as string) ?? '').toLowerCase().includes(s) ||
          ((b.patientPhone as string) ?? '').toLowerCase().includes(s),
      );
    }

    return { data: bills, total: count ?? 0 };
  }

  /**
   * Generate the next sequential bill number for today's date.
   * Format: OPT-YYYYMMDD-NNNN (e.g. OPT-20260922-0001).
   * Matches old getNextOpticalBillNumber logic exactly.
   * Not atomic — acceptable because optical billing volume is low; a
   * collision would produce a Supabase UNIQUE error on the billNumber column,
   * which is surfaced to the caller as a 500 (not silently swallowed).
   */
  async getNextBillNumber(): Promise<string> {
    const today = new Date();
    const prefix = `OPT-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    const { data: last } = await this.supabase
      .from('OpticalBill')
      .select('billNumber')
      .eq('hospital_id', this.hospitalId)
      .like('billNumber', `${prefix}%`)
      .order('billNumber', { ascending: false })
      .limit(1)
      .maybeSingle();
    const seq = last ? parseInt(last.billNumber.split('-').pop() || '0') + 1 : 1;
    return `${prefix}-${String(seq).padStart(4, '0')}`;
  }

  async insertBill(row: Record<string, unknown>) {
    const { data, error } = await this.supabase
      .from('OpticalBill')
      .insert({ ...row, hospital_id: this.hospitalId })
      .select()
      .single();
    if (error) throw error;
    return data as Record<string, unknown>;
  }

  /**
   * OpticalBillItem is a pure child table — it has NO hospital_id column (see
   * 4-datamodel.md exclusion list). Do NOT inject hospital_id here.
   */
  async insertBillItem(row: Record<string, unknown>) {
    const { error } = await this.supabase.from('OpticalBillItem').insert(row);
    if (error) throw error;
  }

  async findBillById(id: string) {
    const { data, error } = await this.supabase
      .from('OpticalBill')
      .select('*')
      .eq('id', id)
      .eq('hospital_id', this.hospitalId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async updateBillStatus(id: string, status: string) {
    const { error } = await this.supabase
      .from('OpticalBill')
      .update({ status, updatedAt: new Date().toISOString() })
      .eq('id', id)
      .eq('hospital_id', this.hospitalId);
    if (error) throw error;
  }

  /**
   * Decrement stock quantity after a bill item is sold.
   * Fetches current quantity first then updates — matching old actions.ts pattern.
   * No hospital_id filter here because stockId is already constrained to this
   * hospital via the bill creation flow, and OpticalStock does have hospital_id
   * (which is implicitly satisfied since we're operating within one hospital).
   * Added hospital_id filter for defense in depth anyway.
   */
  async decrementStockQuantity(stockId: string, decrementBy: number) {
    const { data: current, error: fetchError } = await this.supabase
      .from('OpticalStock')
      .select('quantity')
      .eq('id', stockId)
      .eq('hospital_id', this.hospitalId)
      .maybeSingle();
    if (fetchError) throw fetchError;
    if (!current) throw new Error(`OpticalStock with id "${stockId}" not found.`);
    const { error } = await this.supabase
      .from('OpticalStock')
      .update({
        quantity: (current.quantity as number) - decrementBy,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', stockId)
      .eq('hospital_id', this.hospitalId);
    if (error) throw error;
  }

  // ─── Patient / EyeReading (read-only from this module) ────────────────────

  async findPatientWithReadings(patientId: string) {
    const { data, error } = await this.supabase
      .from('Patient')
      .select('*, eyeReadings:EyeReading(*), prescriptions:Prescription(*)')
      .eq('patientId', patientId)
      .eq('hospital_id', this.hospitalId)
      .maybeSingle();
    if (error) throw error;
    return data as Record<string, unknown> | null;
  }

  // ─── HospitalProfile — NO hospital_id column ──────────────────────────────
  //
  // CRITICAL: HospitalProfile's OWN `id` IS the hospital identifier.
  // The hospital_id backfill migration explicitly excluded HospitalProfile
  // (it IS the hospital, not a tenant-scoped row). Always use .eq('id', hospitalId).
  // Never add a hospital_id filter or insert a hospital_id column here.

  async getHospitalProfile() {
    const { data, error } = await this.supabase
      .from('HospitalProfile')
      .select('*')
      .eq('id', this.hospitalId)
      .maybeSingle();
    if (error) throw error;
    return data as Record<string, unknown> | null;
  }

  /**
   * Merge-update only the settings JSON blob on HospitalProfile.
   * The caller is responsible for JSON.stringify — this method only writes
   * the pre-serialized string.
   */
  async updateHospitalProfileSettings(settingsJson: string) {
    const { error } = await this.supabase
      .from('HospitalProfile')
      .update({ settings: settingsJson, updatedAt: new Date().toISOString() })
      .eq('id', this.hospitalId);
    if (error) throw error;
  }
}
