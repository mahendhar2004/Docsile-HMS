/**
 * Optical service — business layer.
 *
 * Implements all 16 optical endpoints. No Supabase calls here — all data
 * access goes through OpticalRepository. No HTTP/transport concerns.
 *
 * HospitalProfile reads: always via repo.getHospitalProfile() which uses
 * .eq('id', hospitalId) — the table has NO hospital_id column.
 *
 * addOpticalStock upsert key: (productId, batchNumber, power) with explicit
 * null matching. If a matching row exists, quantity is incremented; otherwise
 * a new stock row is inserted.
 */

import { getSupabaseClient } from '../_shared/supabase-client.ts';
import { NotFoundError } from '../_shared/errors.ts';
import type { Session } from '../_shared/auth.ts';
import { OpticalRepository } from './repository.ts';
import type {
  OpticalProduct,
  OpticalStock,
  CreateOpticalBill,
  OpticalBillListQuery,
  OpticalBillRow,
  StockSummary,
  StockSearchResult,
  PatientArReading,
  OpticalSettings,
} from './types.ts';

/** Factory — instantiates a repository scoped to the caller's hospital. */
function repo(session: Session): OpticalRepository {
  return new OpticalRepository(getSupabaseClient(), session.hospitalId);
}

// ─── Products ─────────────────────────────────────────────────────────────────

export async function getProducts(session: Session) {
  return repo(session).listProducts();
}

export async function createProduct(session: Session, body: OpticalProduct) {
  const now = new Date().toISOString();
  return repo(session).insertProduct({
    name: body.name,
    brand: body.brand ?? null,
    category: body.category,
    type: body.type ?? null,
    material: body.material ?? null,
    color: body.color ?? null,
    size: body.size ?? null,
    coating: body.coating ?? null,
    index: body.index ?? null,
    modelNumber: body.modelNumber ?? null,
    hsnCode: body.hsnCode ?? null,
    gstPercent: body.gstPercent ?? 12,
    isActive: true,
    createdBy: session.id,
    createdAt: now,
    updatedAt: now,
  });
}

export async function updateProduct(
  session: Session,
  id: string,
  body: Partial<OpticalProduct>,
): Promise<void> {
  const r = repo(session);
  const existing = await r.findProductById(id);
  if (!existing) throw new NotFoundError('OpticalProduct', id);
  await r.updateProduct(id, body as Record<string, unknown>);
}

/**
 * Soft-delete: sets isActive=false on the product row.
 * Not a hard delete — products may be referenced by stock rows and bill items.
 */
export async function deleteProduct(session: Session, id: string): Promise<void> {
  const r = repo(session);
  const existing = await r.findProductById(id);
  if (!existing) throw new NotFoundError('OpticalProduct', id);
  await r.softDeleteProduct(id);
}

// ─── Stock ─────────────────────────────────────────────────────────────────

export async function getStock(session: Session) {
  return repo(session).listStock();
}

/**
 * Upsert stock entry by the composite unique key (productId, batchNumber, power).
 *
 * - If a row exists with the same (productId, batchNumber, power), add `quantity`
 *   to the existing quantity (never replace — this is a stock addition, not a reset).
 * - If no matching row exists, insert a new stock row.
 *
 * Null values for batchNumber and power are matched explicitly to avoid treating
 * "no batch" and "batch=''" as different rows.
 */
export async function upsertStock(session: Session, body: OpticalStock): Promise<void> {
  const r = repo(session);
  const existing = await r.findExistingStock(body.productId, body.batchNumber, body.power);

  if (existing) {
    await r.incrementStockQuantity(
      existing.id as string,
      body.quantity,
      existing.quantity as number,
    );
  } else {
    const now = new Date().toISOString();
    await r.insertStock({
      productId: body.productId,
      batchNumber: body.batchNumber ?? null,
      quantity: body.quantity,
      mrp: body.mrp ?? 0,
      costPrice: body.costPrice ?? 0,
      gstPercent: body.gstPercent ?? 12,
      power: body.power ?? null,
      supplierId: body.supplierId ?? null,
      isActive: true,
      createdBy: session.id,
      createdAt: now,
      updatedAt: now,
    });
  }
}

export async function updateStock(
  session: Session,
  id: string,
  body: Partial<OpticalStock>,
): Promise<void> {
  const r = repo(session);
  const existing = await r.findStockById(id);
  if (!existing) throw new NotFoundError('OpticalStock', id);
  await r.updateStock(id, body as Record<string, unknown>);
}

export async function getStockSummary(session: Session): Promise<StockSummary> {
  return repo(session).getStockSummary();
}

/**
 * Search stock for billing autocomplete.
 * Returns empty array for queries shorter than 2 characters (matches old behavior).
 */
export async function searchStock(session: Session, q: string): Promise<StockSearchResult[]> {
  if (q.length < 2) return [];
  return repo(session).searchStock(q);
}

// ─── Bills ─────────────────────────────────────────────────────────────────

export async function getBills(
  session: Session,
  filters: OpticalBillListQuery,
): Promise<{ data: OpticalBillRow[]; total: number }> {
  const result = await repo(session).listBills(filters);
  return { data: result.data as OpticalBillRow[], total: result.total };
}

/**
 * Create an optical bill with line items.
 *
 * Financials are computed server-side (not trusted from the client):
 *   subtotal     = sum of item totals
 *   gstAmount    = sum of GST extracted from each item's post-discount amount
 *   discountAmount = subtotal × discountPercent / 100
 *   netAmount    = subtotal − discountAmount
 *   billAmount   = Math.round(netAmount + roundOff)
 *   balanceDue   = billAmount − paidAmount
 *
 * After inserting the bill and each item, stock quantity is decremented for
 * any item that carries a stockId. The decrement is sequential (not parallel)
 * to preserve the read-then-update pattern that avoids going negative.
 */
export async function createBill(
  session: Session,
  body: CreateOpticalBill,
): Promise<{ billNumber: string; billAmount: number }> {
  const r = repo(session);
  const billNumber = await r.getNextBillNumber();

  const subtotal = body.items.reduce((s, i) => s + i.total, 0);
  const gstAmount = body.items.reduce(
    (s, i) => s + ((i.amount * (i.gstPercent ?? 0)) / (100 + (i.gstPercent ?? 0))),
    0,
  );
  const discountPercent = body.discountPercent ?? 0;
  const discountAmount = subtotal * (discountPercent / 100);
  const netAmount = subtotal - discountAmount;
  const roundOff = body.roundOff ?? 0;
  const billAmount = Math.round(netAmount + roundOff);
  const balanceDue = billAmount - body.paidAmount;
  const now = new Date().toISOString();

  const bill = await r.insertBill({
    billNumber,
    patientId: body.patientId ?? null,
    patientName: body.patientName,
    patientPhone: body.patientPhone ?? null,
    gender: body.gender ?? null,
    referredDoctor: body.referredDoctor ?? null,
    prescriptionId: body.prescriptionId ?? null,
    lensPrescription: body.lensPrescription ? JSON.stringify(body.lensPrescription) : null,
    subtotal,
    discountPercent,
    discountAmount,
    gstAmount,
    netAmount,
    roundOff,
    billAmount,
    paidAmount: body.paidAmount,
    balanceDue,
    paymentMode: body.paymentMode ?? 'CASH',
    paymentRef: body.paymentRef ?? null,
    deliveryDate: body.deliveryDate ? new Date(body.deliveryDate).toISOString() : null,
    orderNotes: body.orderNotes ?? null,
    status: body.status ?? 'COMPLETED',
    createdBy: session.id,
    createdAt: now,
    updatedAt: now,
  });

  for (const item of body.items) {
    await r.insertBillItem({
      billId: bill.id as string,
      stockId: item.stockId ?? null,
      itemName: item.itemName,
      category: item.category,
      eye: item.eye ?? null,
      quantity: item.quantity,
      mrp: item.mrp ?? 0,
      price: item.price,
      total: item.total,
      discountPercent: item.discountPercent ?? 0,
      amount: item.amount,
      gstPercent: item.gstPercent ?? 0,
    });

    if (item.stockId) {
      await r.decrementStockQuantity(item.stockId, item.quantity);
    }
  }

  return { billNumber: bill.billNumber as string, billAmount: bill.billAmount as number };
}

export async function updateBillStatus(
  session: Session,
  id: string,
  status: string,
): Promise<void> {
  const r = repo(session);
  const existing = await r.findBillById(id);
  if (!existing) throw new NotFoundError('OpticalBill', id);
  await r.updateBillStatus(id, status);
}

// ─── Patient AR reading ─────────────────────────────────────────────────────

/**
 * Fetch a patient with their latest eye reading (AR data) and latest prescription.
 * Matches old getPatientWithARReading behavior exactly.
 * Returns null if no patient found for patientId — not a 404 (caller decides).
 */
export async function getPatientArReading(
  session: Session,
  patientId: string,
): Promise<PatientArReading | null> {
  const patient = await repo(session).findPatientWithReadings(patientId);
  if (!patient) return null;

  const eyeReadings = ((patient.eyeReadings ?? []) as Record<string, unknown>[]).sort(
    (a, b) =>
      new Date(b.readingDate as string).getTime() -
      new Date(a.readingDate as string).getTime(),
  );
  const latestReading = eyeReadings[0] ?? null;

  const prescriptions = ((patient.prescriptions ?? []) as Record<string, unknown>[])
    .filter((p) => p.status === 'COMPLETED' || p.status === 'DRAFT')
    .sort(
      (a, b) =>
        new Date(b.prescriptionDate as string).getTime() -
        new Date(a.prescriptionDate as string).getTime(),
    );
  const latestPrescription = prescriptions[0] ?? null;

  function safeParse(raw: unknown): unknown {
    if (!raw) return null;
    try { return JSON.parse(String(raw)); } catch { return null; }
  }

  return {
    patientId: patient.patientId as string,
    name: ([patient.firstName, patient.lastName] as (string | null)[]).filter(Boolean).join(' '),
    age: (patient.age as number) ?? null,
    gender: (patient.gender as string) ?? null,
    phone: (patient.phone as string) ?? null,
    doctorName: (patient.doctorName as string) ?? null,
    autoRefractometer: safeParse(latestReading?.autoRefractometer),
    glassesReading: safeParse(latestReading?.glassesReading),
    presentPrescription: safeParse(latestReading?.presentPrescription),
    readingDate: (latestReading?.readingDate as string) ?? null,
    prescriptionId: (latestPrescription?.id as string) ?? null,
  };
}

// ─── Settings (stored in HospitalProfile.settings JSON blob) ─────────────────

/**
 * Optical settings are stored as a key inside the HospitalProfile.settings TEXT/JSON
 * blob — same pattern as PrintConfig and NavStyle in the settings module.
 *
 * Key: opticalPrintHeaderKey → the Supabase Storage key for the optical print header image.
 *
 * HospitalProfile is fetched via .eq('id', hospitalId) — NO hospital_id column exists
 * on this table. The old code used .limit(1).single() without an id filter, which is
 * a known bug (would read the wrong tenant's profile in a multi-tenant setup).
 */
export async function getSettings(session: Session): Promise<OpticalSettings> {
  const profile = await repo(session).getHospitalProfile();
  try {
    const s = JSON.parse((profile?.settings as string) ?? '{}');
    return { printHeaderKey: (s.opticalPrintHeaderKey as string) ?? '' };
  } catch {
    return { printHeaderKey: '' };
  }
}

export async function updateSettings(session: Session, body: unknown): Promise<void> {
  const input = body as { printHeaderKey?: string };
  const r = repo(session);
  const profile = await r.getHospitalProfile();
  if (!profile) throw new NotFoundError('HospitalProfile', session.hospitalId);

  let existing: Record<string, unknown> = {};
  try {
    existing = JSON.parse((profile.settings as string) ?? '{}');
  } catch { /* start fresh if corrupt */ }

  if (input.printHeaderKey !== undefined) {
    existing.opticalPrintHeaderKey = input.printHeaderKey || undefined;
  }

  await r.updateHospitalProfileSettings(JSON.stringify(existing));
}

// ─── Hospital Profile ─────────────────────────────────────────────────────────

/**
 * Returns the full HospitalProfile row for the current hospital.
 * Used by the optical billing UI to populate the print header.
 *
 * IMPORTANT: HospitalProfile has NO hospital_id column — its own `id` IS the
 * hospital identifier. Fetched via .eq('id', hospitalId) in the repository.
 * The old code used .limit(1).single() with no id filter — known bug, avoided here.
 */
export async function getHospitalProfile(session: Session) {
  const profile = await repo(session).getHospitalProfile();
  if (!profile) throw new NotFoundError('HospitalProfile', session.hospitalId);
  return profile;
}
