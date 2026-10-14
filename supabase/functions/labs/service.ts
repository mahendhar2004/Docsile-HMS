/**
 * Labs service — business layer.
 *
 * Orchestrates the 14 labs endpoints.  No direct Supabase queries here —
 * all data-access goes through LabsRepository.  No HTTP/transport concerns.
 *
 * Lab result recording is explicitly deferred (see PROGRESS.md Known Deferred Items).
 */

import { getSupabaseClient } from '../_shared/supabase-client.ts';
import { ConflictError, NotFoundError } from '../_shared/errors.ts';
import type { Session } from '../_shared/auth.ts';
import type { Lab, InvestigationMaster } from './types.ts';
import { LabsRepository } from './repository.ts';

// ---- IST helpers --------------------------------------------------------

/** Return today's date string in IST, e.g. "2026-09-22". */
function getISTDateString(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

/**
 * Return raw IST day-boundary strings for direct use in Postgres `timestamp`
 * (no timezone) column comparisons — e.g. Prescription.prescriptionDate.
 * Postgres ignores any offset on a literal cast to that type, so these raw
 * "+05:30" strings compare correctly against values stored the same way.
 * Do NOT convert through `new Date(...).toISOString()` — that performs a
 * real UTC conversion, shifting the bound back by 5.5 hours and excluding
 * prescriptions actually written within the intended IST calendar day.
 */
function getISTDayBounds(istDate: string): { start: string; end: string } {
  return {
    start: `${istDate}T00:00:00+05:30`,
    end: `${istDate}T23:59:59+05:30`,
  };
}

// ---- Factory ------------------------------------------------------------

function repo(session: Session): LabsRepository {
  return new LabsRepository(getSupabaseClient(), session.hospitalId);
}

// =========================================================================
// Labs
// =========================================================================

/** List all labs with their active-investigation counts. */
export async function getLabs(session: Session): Promise<unknown[]> {
  const r = repo(session);
  const labs = await r.findAll();

  return await Promise.all(
    labs.map(async (lab) => {
      const count = await r.countInvestigationsForLab(lab.id as string);
      return { ...lab, _count: { investigations: count } };
    }),
  );
}

/** Create a new lab. Throws ConflictError if the name already exists. */
export async function createLab(session: Session, data: Lab): Promise<unknown> {
  const r = repo(session);
  try {
    return await r.insert({
      name: data.name,
      description: data.description,
      location: data.location,
      printHeaderKey: data.printHeaderKey,
      sortOrder: data.sortOrder,
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes('Unique')) {
      throw new ConflictError(
        `A lab named "${data.name}" already exists. Choose a different name.`,
      );
    }
    throw err;
  }
}

/** Return a single lab with its active investigations expanded. Throws 404 if not found. */
export async function getLabById(session: Session, id: string): Promise<unknown> {
  const r = repo(session);
  const lab = await r.findById(id);
  if (!lab) throw new NotFoundError('Lab', id);

  const investigations = await r.findLabInvestigations(id);
  return { ...lab, investigations };
}

/** Update mutable lab fields. Throws 404 if the lab does not belong to this hospital. */
export async function updateLab(
  session: Session,
  id: string,
  data: Partial<Lab>,
): Promise<void> {
  const r = repo(session);
  const existing = await r.findById(id);
  if (!existing) throw new NotFoundError('Lab', id);
  await r.update(id, {
    name: data.name,
    description: data.description as string | null | undefined,
    location: data.location as string | null | undefined,
    printHeaderKey: data.printHeaderKey as string | null | undefined,
    isActive: data.isActive,
    sortOrder: data.sortOrder,
  });
}

/**
 * Soft-delete a lab (set isActive = false).
 *
 * PROGRESS.md marks this as "(soft)" and the Lab table has an isActive column —
 * a hard delete would violate FK constraints when LabBill rows reference the lab.
 * The old Next.js code attempted a hard delete and surfaced the FK error message
 * "Deactivate it instead" — this implementation does the right thing directly.
 */
export async function deleteLab(session: Session, id: string): Promise<void> {
  const r = repo(session);
  const existing = await r.findById(id);
  if (!existing) throw new NotFoundError('Lab', id);
  await r.softDelete(id);
}

// =========================================================================
// Lab investigations
// =========================================================================

/** Return the active investigations mapped to a lab (with InvestigationMaster details). */
export async function getLabInvestigations(
  session: Session,
  labId: string,
): Promise<unknown[]> {
  const r = repo(session);
  const lab = await r.findById(labId);
  if (!lab) throw new NotFoundError('Lab', labId);
  return await r.findLabInvestigations(labId);
}

/**
 * Replace-all lab investigation mapping.
 *
 * Strategy (matches old updateLabInvestigations exactly):
 *   1. DELETE all existing LabInvestigation rows for this labId.
 *   2. INSERT a new row for each supplied investigationId
 *      carrying each investigation's own amount and isDefault flag.
 *
 * Throws 404 if the labId does not belong to this hospital.
 */
export async function updateLabInvestigations(
  session: Session,
  labId: string,
  investigations: { investigationId: string; amount: number; isDefault: boolean }[],
): Promise<void> {
  const r = repo(session);
  const lab = await r.findById(labId);
  if (!lab) throw new NotFoundError('Lab', labId);
  await r.replaceLabInvestigations(labId, investigations);
}

// =========================================================================
// InvestigationMaster
// =========================================================================

/** Return all active investigations for this hospital. */
export async function getAllInvestigations(
  session: Session,
): Promise<unknown[]> {
  return await repo(session).findAllInvestigations();
}

/**
 * Create a new investigation master record.
 * Throws ConflictError if an investigation with the same name already exists.
 */
export async function createInvestigation(
  session: Session,
  data: InvestigationMaster,
): Promise<void> {
  const r = repo(session);
  const existing = await r.findInvestigationByName(data.name);
  if (existing) {
    throw new ConflictError(
      `An investigation named "${data.name}" already exists in this hospital's master list.`,
    );
  }
  await r.insertInvestigation({
    name: data.name,
    category: data.category,
    description: data.description,
    createdBy: session.id,
  });
}

// =========================================================================
// Patient investigations
// =========================================================================

/**
 * Resolve the investigations prescribed for a patient and group them by lab.
 *
 * Steps (matching old getPatientInvestigations exactly):
 *   1. Find patient by sequential patientId.
 *   2. Find their latest prescription that has a non-empty investigations JSON.
 *   3. Parse the investigations array (handles both string[] and {name}[] formats).
 *   4. Resolve InvestigationMaster IDs from names.
 *   5. Fetch LabInvestigation mappings + Lab details; filter to active labs only.
 *   6. Fetch existing non-cancelled LabBills for this prescription.
 *   7. Group investigations by their preferred lab (isDefault first, else first mapping).
 *   8. Collect unassigned investigations (no master record or no lab mapping).
 */
export async function getPatientInvestigations(
  session: Session,
  patientId: string,
): Promise<unknown> {
  const r = repo(session);

  // 1. Find patient
  const patient = await r.findPatientByPatientId(patientId);
  if (!patient) throw new NotFoundError('Patient', patientId);

  const patientSummary = {
    patientId: patient.patientId as string,
    name: [patient.firstName, patient.lastName].filter(Boolean).join(' '),
    age: patient.age as number | null,
    gender: patient.gender as string,
    phone: patient.phone as string,
    doctorName: patient.doctorName as string | null,
  };

  // 2. Latest prescription with investigations
  const prescription = await r.findLatestPrescriptionWithInvestigations(
    patient.patientId as string,
  );
  if (!prescription) {
    return { patient: patientSummary, prescription: null, labGroups: [], unassigned: [] };
  }

  const prescriptionSummary = {
    id: prescription.id as string,
    prescriptionNumber: prescription.prescriptionNumber as string | null,
    doctorName: prescription.doctorName as string | null,
    prescriptionDate: prescription.prescriptionDate as string,
  };

  // 3. Parse investigation names
  let investigationNames: string[] = [];
  try {
    const parsed = JSON.parse(prescription.investigations as string);
    investigationNames = (parsed as Array<string | { name: string }>).map((inv) =>
      typeof inv === 'string' ? inv : inv.name,
    );
  } catch { /* ignore malformed JSON */ }

  if (investigationNames.length === 0) {
    return {
      patient: patientSummary,
      prescription: prescriptionSummary,
      labGroups: [],
      unassigned: [],
    };
  }

  // 4. Resolve master IDs from names
  const masters = await r.findInvestigationsByNames(investigationNames);
  const masterMap = new Map(
    (masters as { id: string; name: string }[]).map((m) => [m.name, m.id]),
  );
  const masterIds = (masters as { id: string }[]).map((m) => m.id);

  // 5. Fetch lab mappings (LabInvestigation is a child table — no hospital_id)
  const labMappingsRaw = await r.findLabMappingsByInvestigationIds(masterIds);
  // Filter to active labs only (lab IS hospital-scoped via its own hospital_id)
  const labMappings = labMappingsRaw.filter(
    (m) => (m.lab as Record<string, unknown>)?.isActive === true,
  );

  // 6. Existing bills for this prescription
  const existingBillsRaw = await r.findBillsForPrescription(prescription.id as string);
  const billedNames = new Set(
    existingBillsRaw.flatMap((b) =>
      ((b.items as { name: string }[]) ?? []).map((i) => i.name),
    ),
  );

  // 7. Group by lab (prefer isDefault mapping)
  type LabGroup = {
    lab: { id: string; name: string; location: string | null };
    items: { investigationId: string; name: string; amount: number }[];
  };
  const labGroupMap = new Map<string, LabGroup>();
  const unassigned: { name: string; alreadyBilled: boolean }[] = [];

  const invToMappings = new Map<string, typeof labMappings>();
  for (const m of labMappings) {
    const invId = m.investigationId as string;
    const list = invToMappings.get(invId) ?? [];
    list.push(m);
    invToMappings.set(invId, list);
  }

  for (const invName of investigationNames) {
    const alreadyBilled = billedNames.has(invName);
    const masterId = masterMap.get(invName);
    if (!masterId) { unassigned.push({ name: invName, alreadyBilled }); continue; }

    const mappings = invToMappings.get(masterId);
    if (!mappings || mappings.length === 0) { unassigned.push({ name: invName, alreadyBilled }); continue; }

    const chosen = mappings.find((m) => m.isDefault) ?? mappings[0];
    const lab = chosen.lab as { id: string; name: string; location: string | null };
    const group = labGroupMap.get(chosen.labId as string) ?? { lab, items: [] };
    group.items.push({ investigationId: masterId, name: invName, amount: chosen.amount as number });
    labGroupMap.set(chosen.labId as string, group);
  }

  const existingBills = existingBillsRaw.map((b) => {
    const bl = b.lab as { name: string };
    return {
      id: b.id,
      billNumber: b.billNumber,
      labName: bl?.name ?? null,
      total: b.total,
      status: b.status,
      items: ((b.items as { name: string }[]) ?? []).map((i) => i.name),
    };
  });

  return {
    patient: patientSummary,
    prescription: prescriptionSummary,
    labGroups: Array.from(labGroupMap.values()),
    unassigned,
    existingBills,
  };
}

// =========================================================================
// Pending investigations
// =========================================================================

/**
 * List prescriptions from today (IST) that have investigations written but
 * are not yet fully billed.  Matches old getPendingLabInvestigations behaviour.
 *
 * The index.ts route does not forward a date query param — the service always
 * uses today in IST (matching the old default).
 */
export async function getPendingLabInvestigations(session: Session): Promise<unknown[]> {
  const r = repo(session);
  const { start, end } = getISTDayBounds(getISTDateString());

  const prescriptions = await r.findPrescriptionsWithInvestigationsBetween(start, end);
  if (prescriptions.length === 0) return [];

  // Keep only those with a parseable non-empty investigations array
  const valid = prescriptions.filter((p) => {
    try {
      const arr = JSON.parse(p.investigations as string);
      return Array.isArray(arr) && arr.length > 0;
    } catch { return false; }
  });
  if (valid.length === 0) return [];

  // Fetch bill statuses for these prescriptions
  const prescriptionIds = valid.map((p) => p.id as string);
  const billStatuses = await r.findBillStatusesByPrescriptionIds(prescriptionIds);

  const billsByPrescription = new Map<string, string[]>();
  for (const b of billStatuses) {
    const list = billsByPrescription.get(b.prescriptionId) ?? [];
    list.push(b.status);
    billsByPrescription.set(b.prescriptionId, list);
  }

  return valid.flatMap((p) => {
    const pt = p.patient as {
      patientId: string;
      firstName: string;
      lastName: string | null;
      age: number | null;
      gender: string;
      phone: string;
    };

    let investigationCount = 0;
    try { investigationCount = JSON.parse(p.investigations as string).length; } catch { /* ignore */ }

    const statuses = billsByPrescription.get(p.id as string) ?? [];
    const fullyBilled =
      statuses.length > 0 &&
      !statuses.includes('PENDING') &&
      !statuses.includes('PARTIAL');
    if (fullyBilled) return [];

    return [{
      prescriptionId: p.id,
      prescriptionNumber: p.prescriptionNumber as string | null,
      doctorName: p.doctorName as string | null,
      investigationCount,
      patientId: pt.patientId,
      patientName: [pt.firstName, pt.lastName].filter(Boolean).join(' '),
      age: pt.age,
      gender: pt.gender,
      phone: pt.phone,
      billCount: statuses.length,
    }];
  });
}

// =========================================================================
// Lab bills
// =========================================================================

/** Paginated list of LabBills with nested lab/patient/items/payments. */
export async function getLabBills(
  session: Session,
  query: {
    page: number;
    pageSize: number;
    date?: string;
    dateFrom?: string;
    dateTo?: string;
    labId?: string;
    status?: string;
    patientId?: string;
  },
): Promise<{ data: unknown[]; total: number }> {
  const r = repo(session);
  const filters = {
    date: query.date,
    dateFrom: query.dateFrom,
    dateTo: query.dateTo,
    labId: query.labId,
    status: query.status,
    patientId: query.patientId,
  };
  const [data, total] = await Promise.all([
    r.findBills({ page: query.page, pageSize: query.pageSize, ...filters }),
    r.countBills(filters),
  ]);

  const sorted = data.map((bill) => ({
    ...bill,
    items: ((bill.items as { sortOrder: number }[]) ?? []).sort(
      (a, b) => a.sortOrder - b.sortOrder,
    ),
    payments: ((bill.payments as { paymentDate: string }[]) ?? []).sort(
      (a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime(),
    ),
  }));

  return { data: sorted, total };
}

/**
 * Create multiple LabBill rows in a single request (multi-bill).
 *
 * Semantics (matching old createLabBills exactly):
 *   - One LabBill is created per entry in `data.bills`.
 *   - Each bill can target a different lab, have its own total / discount / payment.
 *   - LabBillItems are inserted for each bill.
 *   - A LabPayment row is inserted only when payment.amount > 0.
 *   - The bill number is generated sequentially with the LB-YYYYMMDD-NNNN pattern.
 *   - Status: PAID if balanceDue <= 0, PARTIAL if amountPaid > 0, else PENDING.
 */
export async function createLabBills(
  session: Session,
  data: {
    bills: Array<{
      bill: {
        patientId: string;
        labId: string;
        prescriptionId?: string | null;
        total: number;
        discount?: number;
        discountReason?: string | null;
      };
      items: Array<{ investigationId: string; name: string; amount: number }>;
      payment?: { paymentMode: string; amount: number };
    }>;
  },
): Promise<unknown[]> {
  const r = repo(session);
  const created: {
    id: string;
    billNumber: string;
    labName: string;
    total: number;
  }[] = [];

  for (const entry of data.bills) {
    const { bill, items, payment } = entry;
    const billNumber = await r.getNextBillNumber();

    const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
    const discount = bill.discount ?? 0;
    const total = bill.total; // client-computed total (subtotal - discount)
    const amountPaid = payment?.amount ?? 0;
    const balanceDue = total - amountPaid;
    const status = balanceDue <= 0 ? 'PAID' : amountPaid > 0 ? 'PARTIAL' : 'PENDING';
    const now = new Date().toISOString();

    const labBill = await r.insertBill({
      billNumber,
      labId: bill.labId,
      patientId: bill.patientId,
      prescriptionId: bill.prescriptionId ?? null,
      subtotal,
      discount,
      discountReason: bill.discountReason ?? null,
      total,
      amountPaid,
      balanceDue,
      paymentMode: payment?.paymentMode ?? null,
      paymentDate: amountPaid > 0 ? now : null,
      status,
      createdBy: session.id,
    });

    await r.insertBillItems(
      items.map((item, i) => ({
        labBillId: labBill.id as string,
        investigationId: item.investigationId,
        name: item.name,
        amount: item.amount,
        sortOrder: i,
      })),
    );

    if (amountPaid > 0 && payment) {
      await r.insertPayment({
        labBillId: labBill.id as string,
        amount: amountPaid,
        paymentMode: payment.paymentMode,
        receivedBy: session.id,
      });
    }

    const labRow = labBill.lab as { name: string };
    created.push({
      id: labBill.id as string,
      billNumber: labBill.billNumber as string,
      labName: labRow?.name ?? '',
      total,
    });
  }

  return created;
}

/** Return a single LabBill with all relations. Throws 404 if not found. */
export async function getLabBillById(session: Session, id: string): Promise<unknown> {
  const r = repo(session);
  const bill = await r.findBillById(id);
  if (!bill) throw new NotFoundError('LabBill', id);

  return {
    ...bill,
    items: ((bill.items as { sortOrder: number }[]) ?? []).sort(
      (a, b) => a.sortOrder - b.sortOrder,
    ),
    payments: ((bill.payments as { paymentDate: string }[]) ?? []).sort(
      (a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime(),
    ),
  };
}
