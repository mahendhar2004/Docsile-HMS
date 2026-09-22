/**
 * Business layer for the pharmacy module.
 *
 * Rules:
 * - Every operation is scoped to s.hospitalId via PharmacyRepository (ADR-007).
 * - Existence checks before update/delete produce descriptive errors (resource type + id).
 * - Inventory quantity fields (PharmacyStock.quantity, PurchaseOrderItem.receivedQty)
 *   are always incremented — never overwritten — for addStock and receivePurchaseOrder.
 * - createPharmacyBill validates stock availability BEFORE writing the bill so that
 *   a mid-loop insufficient-stock error cannot leave a bill with no stock deducted.
 * - No transport concerns (no Request/Response objects). No direct Supabase queries.
 */

import { getSupabaseClient } from '../_shared/supabase-client.ts';
import { ConflictError, NotFoundError, ValidationError } from '../_shared/errors.ts';
import type { Session } from '../_shared/auth.ts';
import type { PharmacyMedicine, PharmacySupplier, PharmacyStock } from './types.ts';
import { PharmacyRepository } from './repository.ts';

function makeRepo(s: Session): PharmacyRepository {
  return new PharmacyRepository(getSupabaseClient(), s.hospitalId);
}

// ─── Medicines ─────────────────────────────────────────────────────────────────

export async function getMedicines(s: Session) {
  return makeRepo(s).findAllMedicines();
}

export async function createMedicine(s: Session, body: PharmacyMedicine) {
  const repo = makeRepo(s);
  try {
    return await repo.insertMedicine({
      name: body.name,
      genericName: body.genericName ?? null,
      manufacturer: body.manufacturer ?? null,
      composition: body.composition ?? null,
      category: body.category ?? null,
      dosageForm: body.dosageForm ?? null,
      strength: body.strength ?? null,
      unitOfMeasure: body.unitOfMeasure,
      hsnCode: body.hsnCode ?? null,
      gstPercent: body.gstPercent,
      scheduleType: body.scheduleType ?? null,
      createdBy: s.id,
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.message.toLowerCase().includes('unique')) {
      throw new ConflictError(
        `A medicine named "${body.name}" with manufacturer "${body.manufacturer ?? 'unspecified'}" already exists.`,
      );
    }
    throw err;
  }
}

export async function updateMedicine(s: Session, id: string, body: Partial<PharmacyMedicine>): Promise<void> {
  const repo = makeRepo(s);
  const existing = await repo.findMedicineById(id);
  if (!existing) throw new NotFoundError('PharmacyMedicine', id);
  await repo.updateMedicine(id, body as Record<string, unknown>);
}

export async function deleteMedicine(s: Session, id: string): Promise<void> {
  const repo = makeRepo(s);
  const existing = await repo.findMedicineById(id);
  if (!existing) throw new NotFoundError('PharmacyMedicine', id);
  await repo.softDeleteMedicine(id);
}

// ─── Stock ─────────────────────────────────────────────────────────────────────

export async function getStock(s: Session) {
  return makeRepo(s).findAllStock();
}

/**
 * Add stock for a medicine+batch combination.
 * If the batch already exists, increments the quantity and updates mrp/costPrice.
 * Never overwrites quantity — always increments (matching old addStock behavior).
 */
export async function addStock(s: Session, body: PharmacyStock): Promise<void> {
  const repo = makeRepo(s);
  const existing = await repo.findStockByMedicineAndBatch(body.medicineId, body.batchNumber);
  if (existing) {
    // Increment quantity; update price fields to the latest values from this delivery
    await repo.updateStock(existing.id, {
      quantity: existing.quantity + body.quantity,
      mrp: body.mrp,
      costPrice: body.costPrice,
    });
    return;
  }
  await repo.insertStock({
    medicineId: body.medicineId,
    batchNumber: body.batchNumber,
    quantity: body.quantity,
    mrp: body.mrp,
    costPrice: body.costPrice,
    gstPercent: body.gstPercent,
    unitsPerPack: body.unitsPerPack,
    expiryDate: new Date(body.expiryDate).toISOString(),
    manufacturingDate: body.manufacturingDate ? new Date(body.manufacturingDate).toISOString() : null,
    supplierId: body.supplierId ?? null,
    purchaseOrderId: body.purchaseOrderId ?? null,
    createdBy: s.id,
  });
}

export async function updateStock(s: Session, id: string, body: Partial<PharmacyStock>): Promise<void> {
  const repo = makeRepo(s);
  const existing = await repo.findStockById(id);
  if (!existing) throw new NotFoundError('PharmacyStock', id);
  const patch: Record<string, unknown> = { ...body };
  if (body.expiryDate) patch.expiryDate = new Date(body.expiryDate).toISOString();
  if (body.manufacturingDate) patch.manufacturingDate = new Date(body.manufacturingDate).toISOString();
  await repo.updateStock(id, patch);
}

export async function getStockSummary(s: Session) {
  return makeRepo(s).getStockSummaryCountsAndValue();
}

export async function searchMedicineStock(s: Session, q: string) {
  if (q.length < 2) return [];
  return makeRepo(s).searchMedicineStock(q);
}

// ─── Suppliers ─────────────────────────────────────────────────────────────────

export async function getSuppliers(s: Session) {
  const repo = makeRepo(s);
  const suppliers = await repo.findAllSuppliers();
  if (suppliers.length === 0) return [];

  const ids = suppliers.map((sup: Record<string, unknown>) => sup.id as string);
  const { purchaseOrders, stockEntries } = await repo.findSupplierCountsByIds(ids);

  const poCounts: Record<string, number> = {};
  const stockCounts: Record<string, number> = {};
  for (const row of purchaseOrders as Array<{ supplierId: string }>) {
    poCounts[row.supplierId] = (poCounts[row.supplierId] ?? 0) + 1;
  }
  for (const row of stockEntries as Array<{ supplierId: string }>) {
    stockCounts[row.supplierId] = (stockCounts[row.supplierId] ?? 0) + 1;
  }

  return suppliers.map((sup: Record<string, unknown>) => ({
    ...sup,
    _count: {
      purchaseOrders: poCounts[sup.id as string] ?? 0,
      stockEntries: stockCounts[sup.id as string] ?? 0,
    },
  }));
}

export async function createSupplier(s: Session, body: PharmacySupplier): Promise<void> {
  const repo = makeRepo(s);
  try {
    await repo.insertSupplier({
      name: body.name,
      contactPerson: body.contactPerson ?? null,
      phone: body.phone ?? null,
      email: body.email ?? null,
      address: body.address ?? null,
      gstin: body.gstin ?? null,
      drugLicenseNo: body.drugLicenseNo ?? null,
      creditDays: body.creditDays,
      createdBy: s.id,
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.message.toLowerCase().includes('unique')) {
      throw new ConflictError(
        `A supplier named "${body.name}" already exists.`,
      );
    }
    throw err;
  }
}

export async function updateSupplier(s: Session, id: string, body: Partial<PharmacySupplier>): Promise<void> {
  const repo = makeRepo(s);
  const existing = await repo.findSupplierById(id);
  if (!existing) throw new NotFoundError('PharmacySupplier', id);
  await repo.updateSupplier(id, body as Record<string, unknown>);
}

export async function deleteSupplier(s: Session, id: string): Promise<void> {
  const repo = makeRepo(s);
  const existing = await repo.findSupplierById(id);
  if (!existing) throw new NotFoundError('PharmacySupplier', id);
  await repo.softDeleteSupplier(id);
}

// ─── Purchase Orders ──────────────────────────────────────────────────────────

export async function getPurchaseOrders(s: Session) {
  return makeRepo(s).findAllPurchaseOrders();
}

export async function createPurchaseOrder(
  s: Session,
  body: { order: Record<string, unknown>; items: Record<string, unknown>[] },
) {
  const repo = makeRepo(s);
  const { order, items } = body;

  // Compute derived financials server-side — never trust client-supplied totals
  const discount = (order.discount as number) ?? 0;
  const amountPaid = (order.amountPaid as number) ?? 0;

  const itemsWithAmount = items.map((item) => ({
    medicineId: item.medicineId as string,
    batchNumber: (item.batchNumber as string | null) ?? null,
    quantity: item.quantity as number,
    costPrice: item.costPrice as number,
    mrp: item.mrp as number,
    gstPercent: (item.gstPercent as number) ?? 12,
    expiryDate: item.expiryDate ? new Date(item.expiryDate as string).toISOString() : null,
    amount: (item.quantity as number) * (item.costPrice as number) * (1 + ((item.gstPercent as number) ?? 0) / 100),
  }));

  const subtotal = itemsWithAmount.reduce((sum, item) => sum + item.quantity * item.costPrice, 0);
  const gstAmount = itemsWithAmount.reduce(
    (sum, item) => sum + (item.quantity * item.costPrice * item.gstPercent) / 100,
    0,
  );
  const totalAmount = subtotal + gstAmount - discount;
  const balanceDue = totalAmount - amountPaid;

  const orderNumber = await repo.getNextPONumber();

  const po = await repo.insertPurchaseOrder({
    orderNumber,
    supplierId: order.supplierId as string,
    expectedDate: (order.expectedDate as string | null) ?? null,
    invoiceNumber: (order.invoiceNumber as string | null) ?? null,
    invoiceDate: order.invoiceDate ? new Date(order.invoiceDate as string).toISOString() : null,
    subtotal,
    gstAmount,
    discount,
    totalAmount,
    amountPaid,
    balanceDue,
    paymentMode: (order.paymentMode as string | null) ?? null,
    notes: (order.notes as string | null) ?? null,
    status: 'ORDERED',
    createdBy: s.id,
  });

  await repo.insertPurchaseOrderItems(
    itemsWithAmount.map((item) => ({
      purchaseOrderId: po.id,
      medicineId: item.medicineId,
      batchNumber: item.batchNumber,
      quantity: item.quantity,
      costPrice: item.costPrice,
      mrp: item.mrp,
      gstPercent: item.gstPercent,
      expiryDate: item.expiryDate,
      amount: item.amount,
    })),
  );

  return { id: po.id, orderNumber: po.orderNumber };
}

/**
 * Receive items from a purchase order.
 * For each received item:
 *   1. Increment PurchaseOrderItem.receivedQty (never overwrite)
 *   2. Upsert PharmacyStock: increment quantity if batch exists, insert if new
 * Then recompute PO status: RECEIVED if all items fully received, PARTIALLY_RECEIVED otherwise.
 */
export async function receivePurchaseOrder(
  s: Session,
  id: string,
  body: { receivedItems: Record<string, unknown>[] },
): Promise<void> {
  const repo = makeRepo(s);
  const po = await repo.findPurchaseOrderById(id);
  if (!po) throw new NotFoundError('PurchaseOrder', id);

  const poItems = (po.items ?? []) as Record<string, unknown>[];

  for (const received of body.receivedItems) {
    const poItem = poItems.find((i) => i.id === received.itemId);
    if (!poItem) continue; // skip unknown item IDs silently (same as old code)

    // 1. Increment receivedQty on the PO line item
    const newReceivedQty = (poItem.receivedQty as number) + (received.receivedQty as number);
    await repo.updatePurchaseOrderItem(received.itemId as string, {
      receivedQty: newReceivedQty,
      batchNumber: received.batchNumber,
      expiryDate: new Date(received.expiryDate as string).toISOString(),
      mrp: received.mrp,
      costPrice: received.costPrice,
    });

    // 2. Upsert stock: increment if batch exists, insert if new
    const existingStock = await repo.findStockByMedicineAndBatch(
      poItem.medicineId as string,
      received.batchNumber as string,
    );

    if (existingStock) {
      await repo.updateStock(existingStock.id, {
        quantity: existingStock.quantity + (received.receivedQty as number),
        mrp: received.mrp,
        costPrice: received.costPrice,
      });
    } else {
      await repo.insertStock({
        medicineId: poItem.medicineId as string,
        batchNumber: received.batchNumber as string,
        quantity: received.receivedQty as number,
        mrp: received.mrp as number,
        costPrice: received.costPrice as number,
        gstPercent: poItem.gstPercent as number,
        unitsPerPack: 1,
        expiryDate: new Date(received.expiryDate as string).toISOString(),
        supplierId: po.supplierId as string,
        purchaseOrderId: po.id as string,
        createdBy: s.id,
      });
    }
  }

  // Recompute PO status from the freshly-updated items
  const allItems = await repo.findPurchaseOrderItemsByPoId(id);
  const allReceived = allItems.every(
    (i: Record<string, unknown>) => (i.receivedQty as number) >= (i.quantity as number),
  );
  await repo.updatePurchaseOrderStatus(id, allReceived ? 'RECEIVED' : 'PARTIALLY_RECEIVED');
}

export async function updatePOStatus(s: Session, id: string, status: string): Promise<void> {
  const repo = makeRepo(s);
  const existing = await repo.findPurchaseOrderById(id);
  if (!existing) throw new NotFoundError('PurchaseOrder', id);
  await repo.updatePurchaseOrderStatus(id, status);
}

// ─── Bills ────────────────────────────────────────────────────────────────────

export async function getPharmacyBills(
  s: Session,
  query: { page: number; pageSize: number; dateFrom?: string; dateTo?: string; status?: string; search?: string },
): Promise<{ data: unknown[]; total: number }> {
  return makeRepo(s).findBills(query);
}

/**
 * Create a pharmacy bill with items and deduct stock.
 *
 * Safety-critical ordering:
 *   Phase 1 — Validate: fetch all stock rows and verify quantity sufficiency BEFORE any write.
 *   Phase 2 — Write:   get atomic bill number → insert bill → insert items.
 *   Phase 3 — Deduct:  decrement stock quantities.
 *
 * This prevents a partial-insert state where a bill exists but stock was only partially
 * deducted (which would happen if we deducted item-by-item without a pre-check).
 */
export async function createPharmacyBill(
  s: Session,
  body: { bill: Record<string, unknown>; items: Record<string, unknown>[] },
): Promise<unknown> {
  const repo = makeRepo(s);
  const { bill, items } = body;

  // ── Phase 1: Stock validation ──────────────────────────────────────────────
  const stockSnapshots: Array<{ id: string; currentQty: number; requestedQty: number; medicineName: string }> = [];
  for (const item of items) {
    const stock = await repo.findStockById(item.stockId as string);
    if (!stock) {
      throw new NotFoundError('PharmacyStock', item.stockId as string);
    }
    const requestedQty = item.quantity as number;
    if (stock.quantity < requestedQty) {
      throw new ValidationError(
        `Insufficient stock for "${item.medicineName}" (stockId "${item.stockId}"): ` +
        `available ${stock.quantity}, requested ${requestedQty}.`,
      );
    }
    stockSnapshots.push({
      id: stock.id,
      currentQty: stock.quantity,
      requestedQty,
      medicineName: item.medicineName as string,
    });
  }

  // ── Phase 2: Compute amounts and write bill ────────────────────────────────
  const discountPercent = (bill.discountPercent as number) ?? 0;
  const roundOff = (bill.roundOff as number) ?? 0;
  const paidAmount = (bill.paidAmount as number) ?? 0;

  const subtotal = items.reduce((sum, item) => sum + (item.amount as number), 0);
  const discountAmount = subtotal * (discountPercent / 100);
  const afterDiscount = subtotal - discountAmount;

  const gstAmount = items.reduce((sum, item) => {
    const itemGst = (item.gstPercent as number) ?? 0;
    const itemShare = subtotal > 0 ? ((item.amount as number) / subtotal) * afterDiscount : 0;
    return sum + (itemShare * itemGst) / (100 + itemGst);
  }, 0);

  const netAmount = afterDiscount;
  const billAmount = Math.round(netAmount + roundOff);
  const balanceDue = billAmount - paidAmount;

  const year = new Date().getFullYear().toString();
  const billNumber = await repo.nextBillNumber(year);

  const newBill = await repo.insertBill({
    billNumber,
    patientId: (bill.patientId as string | null) ?? null,
    patientName: bill.patientName as string,
    patientPhone: (bill.patientPhone as string | null) ?? null,
    gender: (bill.gender as string | null) ?? null,
    email: (bill.email as string | null) ?? null,
    referredDoctor: (bill.referredDoctor as string | null) ?? null,
    prescriptionId: (bill.prescriptionId as string | null) ?? null,
    subtotal,
    discountPercent,
    discountAmount,
    gstAmount,
    netAmount,
    roundOff,
    billAmount,
    paidAmount,
    balanceDue,
    paymentMode: (bill.paymentMode as string) ?? 'CASH',
    paymentRef: (bill.paymentRef as string | null) ?? null,
    status: balanceDue > 0 ? 'DUE' : 'COMPLETED',
    createdBy: s.id,
  });

  await repo.insertBillItems(
    items.map((item) => ({
      billId: newBill.id,
      stockId: item.stockId as string,
      medicineName: item.medicineName as string,
      batchNumber: item.batchNumber as string,
      quantity: item.quantity as number,
      mrp: item.mrp as number,
      price: item.price as number,
      total: item.total as number,
      discountPercent: (item.discountPercent as number) ?? 0,
      amount: item.amount as number,
      gstPercent: (item.gstPercent as number) ?? 0,
    })),
  );

  // ── Phase 3: Deduct stock ──────────────────────────────────────────────────
  // Re-read each stock row's CURRENT quantity immediately before writing, rather
  // than reusing the Phase 1 snapshot — Phase 1 and Phase 3 are separated by the
  // bill/item insert, widening the read-then-write gap. The old Next.js code
  // re-fetched quantity right before decrementing in the same loop iteration;
  // using the stale Phase-1 value here would make the race window WORSE than
  // the old code's, not just "still imperfect" (found and fixed post-review —
  // this is not a full atomic-decrement fix, just restoring parity with the
  // old code's tighter window; a true fix would need a DB-level atomic
  // decrement RPC, out of scope for this pass).
  for (const snapshot of stockSnapshots) {
    const current = await repo.findStockById(snapshot.id);
    const currentQty = (current?.quantity as number | undefined) ?? snapshot.currentQty;
    await repo.updateStock(snapshot.id, {
      quantity: currentQty - snapshot.requestedQty,
    });
  }

  return {
    id: newBill.id,
    billNumber: newBill.billNumber,
    billAmount: newBill.billAmount,
  };
}

// ─── Misc ─────────────────────────────────────────────────────────────────────

/**
 * Return today's prescriptions (IST) that have non-empty medicines and have not
 * yet been fully dispensed. Used by the pharmacy counter to show pending work.
 */
export async function getPendingMedicines(s: Session) {
  const repo = makeRepo(s);

  // Today's date in IST (Asia/Kolkata), formatted as YYYY-MM-DD
  const target = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const start = new Date(`${target}T00:00:00+05:30`).toISOString();
  const end = new Date(`${target}T23:59:59+05:30`).toISOString();

  const prescriptions = await repo.findPendingPrescriptions(start, end);
  if (prescriptions.length === 0) return [];

  // Filter out rows where medicines JSON is empty or unparseable
  const valid = (prescriptions as Record<string, unknown>[]).filter((p) => {
    try {
      const arr = JSON.parse(p.medicines as string);
      return Array.isArray(arr) && arr.length > 0;
    } catch {
      return false;
    }
  });
  if (valid.length === 0) return [];

  const prescriptionIds = valid.map((p) => p.id as string);
  const existingBills = await repo.findBillsByPrescriptionIds(prescriptionIds);

  // Build a map of prescriptionId → bill statuses
  const billsByPrescription = new Map<string, string[]>();
  for (const b of existingBills as Array<{ prescriptionId: string | null; status: string }>) {
    if (!b.prescriptionId) continue;
    const list = billsByPrescription.get(b.prescriptionId) ?? [];
    list.push(b.status);
    billsByPrescription.set(b.prescriptionId, list);
  }

  return valid.flatMap((p) => {
    const patient = p.patient as Record<string, unknown>;
    let medicineCount = 0;
    try { medicineCount = JSON.parse(p.medicines as string).length; } catch { /* ignore */ }

    const billStatuses = billsByPrescription.get(p.id as string) ?? [];
    // A prescription is "billed" if every bill is in a final (non-pending, non-partial) state
    const billed =
      billStatuses.length > 0 &&
      !billStatuses.includes('PENDING') &&
      !billStatuses.includes('PARTIAL');
    if (billed) return [];

    return [{
      prescriptionId: p.id,
      prescriptionNumber: p.prescriptionNumber,
      doctorName: p.doctorName,
      medicineCount,
      patientId: patient.patientId,
      patientName: [patient.firstName, patient.lastName].filter(Boolean).join(' '),
      age: patient.age,
      gender: patient.gender,
      phone: patient.phone,
      billCount: billStatuses.length,
    }];
  });
}

/**
 * Fetch a patient's latest non-empty prescription for the pharmacy dispensing UI.
 * The patientId URL param is the human-readable string (e.g. "P-0042"), not the UUID.
 */
export async function getPatientPrescription(s: Session, patientId: string) {
  const repo = makeRepo(s);
  const patient = await repo.findPatientByPatientId(patientId);
  if (!patient) throw new NotFoundError('Patient', patientId);

  const prescription = await repo.findLatestPrescriptionForPatient(
    patient.patientId as string,
  );

  let medicines: Record<string, unknown>[] = [];
  if (prescription) {
    try {
      medicines = JSON.parse(prescription.medicines as string);
    } catch {
      medicines = [];
    }
  }

  return {
    patient: {
      patientId: patient.patientId,
      name: [patient.firstName, patient.lastName].filter(Boolean).join(' '),
      age: patient.age,
      gender: patient.gender,
      phone: patient.phone,
      email: patient.email,
      doctorName: patient.doctorName,
    },
    prescription: prescription
      ? {
          id: prescription.id,
          prescriptionNumber: prescription.prescriptionNumber,
          doctorName: prescription.doctorName,
          prescriptionDate: prescription.prescriptionDate,
          medicines,
        }
      : null,
  };
}
