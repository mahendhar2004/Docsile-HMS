/**
 * Data-access layer for the pharmacy module.
 *
 * Tables owned:
 *   - PharmacyMedicine   — medicine catalogue (soft-delete via isActive=false)
 *   - PharmacySupplier   — supplier records (soft-delete via isActive=false)
 *   - PharmacyStock      — stock batches with expiry and quantity (INTEGER)
 *   - PurchaseOrder      — stock purchase orders
 *   - PurchaseOrderItem  — line items on purchase orders (no hospital_id — child table)
 *   - PharmacyBill       — bills issued at the pharmacy counter
 *   - PharmacyBillItem   — items on a pharmacy bill (no hospital_id — child table)
 *
 * Every query on a hospital-scoped table is filtered by `.eq('hospital_id', this.hospitalId)`
 * per ADR-007. Child tables (PurchaseOrderItem, PharmacyBillItem) are scoped implicitly
 * through their parent FK.
 *
 * Field names verified against supabase-migration.sql CREATE TABLE statements.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export class PharmacyRepository {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly hospitalId: string,
  ) {}

  // ─── Medicines ───────────────────────────────────────────────────────────────

  async findAllMedicines() {
    const { data, error } = await this.supabase
      .from('PharmacyMedicine')
      .select('*')
      .eq('hospital_id', this.hospitalId)
      .eq('isActive', true)
      .order('name', { ascending: true });
    if (error) throw error;
    return data ?? [];
  }

  async findMedicineById(id: string) {
    const { data, error } = await this.supabase
      .from('PharmacyMedicine')
      .select('id')
      .eq('hospital_id', this.hospitalId)
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async insertMedicine(row: {
    name: string;
    genericName?: string | null;
    manufacturer?: string | null;
    composition?: string | null;
    category?: string | null;
    dosageForm?: string | null;
    strength?: string | null;
    unitOfMeasure?: string;
    hsnCode?: string | null;
    gstPercent?: number;
    scheduleType?: string | null;
    createdBy: string;
  }) {
    const now = new Date().toISOString();
    const { data, error } = await this.supabase
      .from('PharmacyMedicine')
      .insert({
        ...row,
        unitOfMeasure: row.unitOfMeasure ?? 'Nos',
        gstPercent: row.gstPercent ?? 12,
        hospital_id: this.hospitalId,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async updateMedicine(id: string, patch: Record<string, unknown>) {
    const { error } = await this.supabase
      .from('PharmacyMedicine')
      .update({ ...patch, updatedAt: new Date().toISOString() })
      .eq('hospital_id', this.hospitalId)
      .eq('id', id);
    if (error) throw error;
  }

  async softDeleteMedicine(id: string) {
    const { error } = await this.supabase
      .from('PharmacyMedicine')
      .update({ isActive: false, updatedAt: new Date().toISOString() })
      .eq('hospital_id', this.hospitalId)
      .eq('id', id);
    if (error) throw error;
  }

  // ─── Suppliers ───────────────────────────────────────────────────────────────

  async findAllSuppliers() {
    const { data, error } = await this.supabase
      .from('PharmacySupplier')
      .select('*')
      .eq('hospital_id', this.hospitalId)
      .eq('isActive', true)
      .order('name', { ascending: true });
    if (error) throw error;
    return data ?? [];
  }

  async findSupplierById(id: string) {
    const { data, error } = await this.supabase
      .from('PharmacySupplier')
      .select('id')
      .eq('hospital_id', this.hospitalId)
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  /** Fetch purchase order and stock counts for supplier badge display. */
  async findSupplierCountsByIds(supplierIds: string[]) {
    const [poRes, stockRes] = await Promise.all([
      this.supabase
        .from('PurchaseOrder')
        .select('supplierId')
        .eq('hospital_id', this.hospitalId)
        .in('supplierId', supplierIds),
      this.supabase
        .from('PharmacyStock')
        .select('supplierId')
        .eq('hospital_id', this.hospitalId)
        .in('supplierId', supplierIds),
    ]);
    if (poRes.error) throw poRes.error;
    if (stockRes.error) throw stockRes.error;
    return { purchaseOrders: poRes.data ?? [], stockEntries: stockRes.data ?? [] };
  }

  async insertSupplier(row: {
    name: string;
    contactPerson?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    gstin?: string | null;
    drugLicenseNo?: string | null;
    creditDays?: number;
    createdBy: string;
  }) {
    const now = new Date().toISOString();
    const { data, error } = await this.supabase
      .from('PharmacySupplier')
      .insert({
        ...row,
        creditDays: row.creditDays ?? 30,
        hospital_id: this.hospitalId,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async updateSupplier(id: string, patch: Record<string, unknown>) {
    const { error } = await this.supabase
      .from('PharmacySupplier')
      .update({ ...patch, updatedAt: new Date().toISOString() })
      .eq('hospital_id', this.hospitalId)
      .eq('id', id);
    if (error) throw error;
  }

  async softDeleteSupplier(id: string) {
    const { error } = await this.supabase
      .from('PharmacySupplier')
      .update({ isActive: false, updatedAt: new Date().toISOString() })
      .eq('hospital_id', this.hospitalId)
      .eq('id', id);
    if (error) throw error;
  }

  // ─── Stock ───────────────────────────────────────────────────────────────────

  async findAllStock() {
    const { data, error } = await this.supabase
      .from('PharmacyStock')
      .select(
        '*, medicine:PharmacyMedicine(name, genericName, manufacturer, category, gstPercent, unitOfMeasure), supplier:PharmacySupplier(name)',
      )
      .eq('hospital_id', this.hospitalId)
      .eq('isActive', true)
      .gt('quantity', 0)
      .order('expiryDate', { ascending: true })
      .limit(200);
    if (error) throw error;
    return data ?? [];
  }

  async findStockById(id: string) {
    const { data, error } = await this.supabase
      .from('PharmacyStock')
      .select('*')
      .eq('hospital_id', this.hospitalId)
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  /**
   * Look up an existing stock batch for a medicine+batch combination.
   * Used by addStock to decide whether to insert or increment.
   */
  async findStockByMedicineAndBatch(medicineId: string, batchNumber: string) {
    const { data, error } = await this.supabase
      .from('PharmacyStock')
      .select('*')
      .eq('hospital_id', this.hospitalId)
      .eq('medicineId', medicineId)
      .eq('batchNumber', batchNumber)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async insertStock(row: {
    medicineId: string;
    batchNumber: string;
    quantity: number;
    mrp: number;
    costPrice: number;
    gstPercent?: number;
    unitsPerPack?: number;
    expiryDate: string;
    manufacturingDate?: string | null;
    supplierId?: string | null;
    purchaseOrderId?: string | null;
    createdBy: string;
  }) {
    const now = new Date().toISOString();
    const { data, error } = await this.supabase
      .from('PharmacyStock')
      .insert({
        ...row,
        gstPercent: row.gstPercent ?? 12,
        unitsPerPack: row.unitsPerPack ?? 1,
        hospital_id: this.hospitalId,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async updateStock(id: string, patch: Record<string, unknown>) {
    const { error } = await this.supabase
      .from('PharmacyStock')
      .update({ ...patch, updatedAt: new Date().toISOString() })
      .eq('hospital_id', this.hospitalId)
      .eq('id', id);
    if (error) throw error;
  }

  async getStockSummaryCountsAndValue() {
    const now = new Date();
    const threeMonthsOut = new Date();
    threeMonthsOut.setMonth(threeMonthsOut.getMonth() + 3);

    const [totalRes, lowRes, nearExpRes, expRes, valRes] = await Promise.all([
      this.supabase
        .from('PharmacyStock')
        .select('*', { count: 'exact', head: true })
        .eq('hospital_id', this.hospitalId)
        .eq('isActive', true)
        .gt('quantity', 0),
      this.supabase
        .from('PharmacyStock')
        .select('*', { count: 'exact', head: true })
        .eq('hospital_id', this.hospitalId)
        .eq('isActive', true)
        .gt('quantity', 0)
        .lte('quantity', 10),
      this.supabase
        .from('PharmacyStock')
        .select('*', { count: 'exact', head: true })
        .eq('hospital_id', this.hospitalId)
        .eq('isActive', true)
        .gt('quantity', 0)
        .gt('expiryDate', now.toISOString())
        .lte('expiryDate', threeMonthsOut.toISOString()),
      this.supabase
        .from('PharmacyStock')
        .select('*', { count: 'exact', head: true })
        .eq('hospital_id', this.hospitalId)
        .eq('isActive', true)
        .gt('quantity', 0)
        .lte('expiryDate', now.toISOString()),
      this.supabase
        .from('PharmacyStock')
        .select('quantity, mrp')
        .eq('hospital_id', this.hospitalId)
        .eq('isActive', true)
        .gt('quantity', 0),
    ]);

    if (totalRes.error) throw totalRes.error;
    if (lowRes.error) throw lowRes.error;
    if (nearExpRes.error) throw nearExpRes.error;
    if (expRes.error) throw expRes.error;
    if (valRes.error) throw valRes.error;

    const stockValue = (valRes.data ?? []).reduce(
      (sum: number, s: { quantity: number; mrp: number }) => sum + s.quantity * s.mrp,
      0,
    );

    return {
      totalItems: totalRes.count ?? 0,
      lowStock: lowRes.count ?? 0,
      nearExpiry: nearExpRes.count ?? 0,
      expired: expRes.count ?? 0,
      stockValue,
    };
  }

  /**
   * Search for in-stock, non-expired batches matching a medicine name substring.
   * Returns shaped search results for billing (stockId, name, quantity, mrp, etc.).
   */
  async searchMedicineStock(q: string) {
    // Step 1: find medicine IDs matching the search term (scoped to hospital)
    const { data: medicines, error: medErr } = await this.supabase
      .from('PharmacyMedicine')
      .select('id')
      .eq('hospital_id', this.hospitalId)
      .or(`name.ilike.%${q}%,genericName.ilike.%${q}%`);
    if (medErr) throw medErr;
    if (!medicines || medicines.length === 0) return [];

    const medicineIds = medicines.map((m: { id: string }) => m.id);

    // Step 2: fetch available (qty > 0, not expired) stock for those medicines
    const { data: stock, error: stockErr } = await this.supabase
      .from('PharmacyStock')
      .select('*, medicine:PharmacyMedicine(name, genericName, gstPercent)')
      .eq('hospital_id', this.hospitalId)
      .eq('isActive', true)
      .gt('quantity', 0)
      .gt('expiryDate', new Date().toISOString())
      .in('medicineId', medicineIds)
      .order('expiryDate', { ascending: true })
      .limit(20);
    if (stockErr) throw stockErr;

    return (stock ?? []).map((s: Record<string, unknown>) => {
      const med = s.medicine as Record<string, unknown>;
      return {
        stockId: s.id,
        medicineId: s.medicineId,
        name: med?.name,
        genericName: med?.genericName,
        batchNumber: s.batchNumber,
        quantity: s.quantity,
        mrp: s.mrp,
        gstPercent: med?.gstPercent,
        expiryDate: s.expiryDate,
      };
    });
  }

  // ─── Purchase Orders ─────────────────────────────────────────────────────────

  async findAllPurchaseOrders() {
    const { data, error } = await this.supabase
      .from('PurchaseOrder')
      .select(
        '*, supplier:PharmacySupplier(name, phone), items:PurchaseOrderItem(*, medicine:PharmacyMedicine(name))',
      )
      .eq('hospital_id', this.hospitalId)
      .order('createdAt', { ascending: false })
      .limit(100);
    if (error) throw error;
    return data ?? [];
  }

  async findPurchaseOrderById(id: string) {
    const { data, error } = await this.supabase
      .from('PurchaseOrder')
      .select('*, items:PurchaseOrderItem(*, medicine:PharmacyMedicine(*))')
      .eq('hospital_id', this.hospitalId)
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async insertPurchaseOrder(row: {
    orderNumber: string;
    supplierId: string;
    expectedDate?: string | null;
    invoiceNumber?: string | null;
    invoiceDate?: string | null;
    subtotal: number;
    gstAmount: number;
    discount: number;
    totalAmount: number;
    amountPaid: number;
    balanceDue: number;
    paymentMode?: string | null;
    notes?: string | null;
    status: string;
    createdBy: string;
  }) {
    const now = new Date().toISOString();
    const { data, error } = await this.supabase
      .from('PurchaseOrder')
      .insert({
        ...row,
        hospital_id: this.hospitalId,
        createdAt: now,
        updatedAt: now,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async insertPurchaseOrderItems(
    items: Array<{
      purchaseOrderId: string;
      medicineId: string;
      batchNumber?: string | null;
      quantity: number;
      costPrice: number;
      mrp: number;
      gstPercent: number;
      expiryDate?: string | null;
      amount: number;
    }>,
  ) {
    const { error } = await this.supabase
      .from('PurchaseOrderItem')
      .insert(items);
    if (error) throw error;
  }

  async updatePurchaseOrderItem(itemId: string, patch: Record<string, unknown>) {
    const { error } = await this.supabase
      .from('PurchaseOrderItem')
      .update(patch)
      .eq('id', itemId);
    if (error) throw error;
  }

  async findPurchaseOrderItemsByPoId(poId: string) {
    const { data, error } = await this.supabase
      .from('PurchaseOrderItem')
      .select('*')
      .eq('purchaseOrderId', poId);
    if (error) throw error;
    return data ?? [];
  }

  async updatePurchaseOrderStatus(id: string, status: string) {
    const { error } = await this.supabase
      .from('PurchaseOrder')
      .update({ status, updatedAt: new Date().toISOString() })
      .eq('hospital_id', this.hospitalId)
      .eq('id', id);
    if (error) throw error;
  }

  /**
   * Generate the next PO order number using the read-max-then-increment pattern.
   * PO numbers are NOT safety-critical in the same way as bill numbers (duplicates
   * cause a UNIQUE constraint error rather than a financial discrepancy), so the
   * TOCTOU risk is acceptable here. If a collision occurs, the DB UNIQUE constraint
   * catches it and the caller retries.
   *
   * Format: PO-YYYYMM-NNNN (monthly-scoped, 4-digit counter)
   */
  async getNextPONumber(): Promise<string> {
    const today = new Date();
    const prefix = `PO-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}`;
    const { data: last } = await this.supabase
      .from('PurchaseOrder')
      .select('orderNumber')
      .eq('hospital_id', this.hospitalId)
      .like('orderNumber', `${prefix}%`)
      .order('orderNumber', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!last) return `${prefix}-0001`;
    const lastNum = parseInt(last.orderNumber.split('-').pop() ?? '0', 10);
    return `${prefix}-${String(lastNum + 1).padStart(4, '0')}`;
  }

  // ─── Bills ───────────────────────────────────────────────────────────────────

  /**
   * Paginated query for pharmacy bills with optional date/status/search filters.
   * Search is applied at the DB level (ilike) so the returned `total` count is accurate
   * for pagination, unlike the old code's client-side filtering approach.
   */
  async findBills(opts: {
    page: number;
    pageSize: number;
    dateFrom?: string;
    dateTo?: string;
    status?: string;
    search?: string;
  }) {
    const from = (opts.page - 1) * opts.pageSize;
    const to = from + opts.pageSize - 1;

    let query = this.supabase
      .from('PharmacyBill')
      .select('*, items:PharmacyBillItem(*)', { count: 'exact' })
      .eq('hospital_id', this.hospitalId)
      .order('createdAt', { ascending: false })
      .range(from, to);

    if (opts.dateFrom) {
      query = query.gte('billDate', new Date(`${opts.dateFrom}T00:00:00`).toISOString());
    }
    if (opts.dateTo) {
      query = query.lte('billDate', new Date(`${opts.dateTo}T23:59:59`).toISOString());
    }
    if (opts.status) {
      query = query.eq('status', opts.status);
    }
    if (opts.search) {
      query = query.or(
        `patientName.ilike.%${opts.search}%,billNumber.ilike.%${opts.search}%,patientPhone.ilike.%${opts.search}%`,
      );
    }

    const { data, error, count } = await query;
    if (error) throw error;
    return { data: data ?? [], total: count ?? 0 };
  }

  /**
   * Obtain the next pharmacy bill number from the atomic Postgres sequence.
   * Replaces the TOCTOU-unsafe read-max-then-increment pattern in the old code.
   */
  async nextBillNumber(year: string): Promise<string> {
    const { data, error } = await this.supabase.rpc('next_pharmacy_bill_number', {
      p_year: year,
    });
    if (error) throw error;
    return data as string;
  }

  async insertBill(row: {
    billNumber: string;
    patientId?: string | null;
    patientName: string;
    patientPhone?: string | null;
    gender?: string | null;
    email?: string | null;
    referredDoctor?: string | null;
    prescriptionId?: string | null;
    subtotal: number;
    discountPercent: number;
    discountAmount: number;
    gstAmount: number;
    netAmount: number;
    roundOff: number;
    billAmount: number;
    paidAmount: number;
    balanceDue: number;
    paymentMode: string;
    paymentRef?: string | null;
    status: string;
    createdBy: string;
  }) {
    const now = new Date().toISOString();
    const { data, error } = await this.supabase
      .from('PharmacyBill')
      .insert({
        ...row,
        hospital_id: this.hospitalId,
        createdAt: now,
        updatedAt: now,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async insertBillItems(
    items: Array<{
      billId: string;
      stockId: string;
      medicineName: string;
      batchNumber: string;
      quantity: number;
      mrp: number;
      price: number;
      total: number;
      discountPercent: number;
      amount: number;
      gstPercent: number;
    }>,
  ) {
    const { error } = await this.supabase
      .from('PharmacyBillItem')
      .insert(items);
    if (error) throw error;
  }

  // ─── Misc ────────────────────────────────────────────────────────────────────

  /**
   * Look up a patient by their string patientId (e.g. "P-0042"), not the UUID.
   * Prescription.patientId is a FK to Patient.patientId (the text field).
   */
  async findPatientByPatientId(patientId: string) {
    const { data, error } = await this.supabase
      .from('Patient')
      .select('id, patientId, firstName, lastName, age, gender, phone, email, doctorName')
      .eq('hospital_id', this.hospitalId)
      .eq('patientId', patientId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  /**
   * Find the most recent non-empty prescription for a patient (by patientId text field).
   */
  async findLatestPrescriptionForPatient(patientId: string) {
    const { data, error } = await this.supabase
      .from('Prescription')
      .select('id, prescriptionNumber, medicines, doctorName, prescriptionDate')
      .eq('hospital_id', this.hospitalId)
      .eq('patientId', patientId)
      .in('status', ['COMPLETED', 'DRAFT'])
      .neq('medicines', '[]')
      .order('prescriptionDate', { ascending: false })
      .limit(1);
    if (error) throw error;
    return data?.[0] ?? null;
  }

  /**
   * Fetch prescriptions with non-empty medicines for a given IST day window,
   * joined with patient data — for the pending-medicines list.
   */
  async findPendingPrescriptions(start: string, end: string) {
    const { data, error } = await this.supabase
      .from('Prescription')
      .select(
        'id, prescriptionNumber, doctorName, medicines, prescriptionDate, patient:Patient(id, patientId, firstName, lastName, age, gender, phone)',
      )
      .eq('hospital_id', this.hospitalId)
      .gte('prescriptionDate', start)
      .lte('prescriptionDate', end)
      .neq('medicines', '[]')
      .not('medicines', 'is', null)
      .order('prescriptionDate', { ascending: false });
    if (error) throw error;
    return data ?? [];
  }

  /**
   * Fetch bill statuses for a list of prescription IDs — used to determine
   * which pending prescriptions have already been dispensed.
   */
  async findBillsByPrescriptionIds(prescriptionIds: string[]) {
    if (prescriptionIds.length === 0) return [];
    const { data, error } = await this.supabase
      .from('PharmacyBill')
      .select('prescriptionId, status')
      .eq('hospital_id', this.hospitalId)
      .in('prescriptionId', prescriptionIds);
    if (error) throw error;
    return data ?? [];
  }
}
