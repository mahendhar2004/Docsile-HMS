/**
 * insurance service — business logic layer.
 *
 * Every function:
 *   1. Instantiates InsuranceRepository with session.hospitalId.
 *   2. Performs business logic (existence checks, financial calculations,
 *      status-machine transitions, JSON mutations).
 *   3. Returns shaped response data — never raw DB rows.
 *
 * No HTTP concerns here (no request/response objects).
 */
import { getSupabaseClient } from '../_shared/supabase-client.ts';
import { NotFoundError, ConflictError, ValidationError } from '../_shared/errors.ts';
import type { Session } from '../_shared/auth.ts';
import { InsuranceRepository } from './repository.ts';
import type {
  InsuranceCompany,
  InsuranceClaim,
  UpdateClaimStatus,
  UpdateClaimDetails,
  AddClaimPayment,
  CompanyListQuery,
  ClaimListQuery,
} from './types.ts';

// ── Insurance Companies ───────────────────────────────────────────────────────

export async function getCompanies(
  session: Session,
  query: CompanyListQuery,
): Promise<{ data: unknown[]; total: number }> {
  const repo = new InsuranceRepository(getSupabaseClient(), session.hospitalId);

  if (!query.paginated) {
    // Replaces old getAllInsuranceCompanies — all companies, no isActive filter, for dropdowns.
    const rows = await repo.findAllCompanies();
    return { data: rows, total: rows.length };
  }

  // Paginated list — active companies only (old getInsuranceCompanies behavior).
  const { rows, total } = await repo.findCompanies(query.page, query.pageSize, true);
  return { data: rows, total };
}

export async function createCompany(
  session: Session,
  body: InsuranceCompany,
): Promise<unknown> {
  const repo = new InsuranceRepository(getSupabaseClient(), session.hospitalId);
  const row = await repo.insertCompany({
    name: body.name,
    tpaName: body.tpaName ?? null,
    contactNumber: body.contactNumber ?? null,
    email: body.email ?? null,
    address: body.address ?? null,
    hospital_id: session.hospitalId,
  });
  return row;
}

export async function updateCompany(
  session: Session,
  id: string,
  body: Partial<InsuranceCompany>,
): Promise<void> {
  const repo = new InsuranceRepository(getSupabaseClient(), session.hospitalId);
  const existing = await repo.findCompanyById(id);
  if (!existing) {
    throw new NotFoundError('InsuranceCompany', id);
  }
  const patch: Record<string, unknown> = {};
  if (body.name !== undefined) patch.name = body.name;
  if (body.tpaName !== undefined) patch.tpaName = body.tpaName;
  if (body.contactNumber !== undefined) patch.contactNumber = body.contactNumber;
  if (body.email !== undefined) patch.email = body.email;
  if (body.address !== undefined) patch.address = body.address;
  if (body.isActive !== undefined) patch.isActive = body.isActive;
  await repo.updateCompany(id, patch as Parameters<typeof repo.updateCompany>[1]);
}

/** Soft-delete: sets isActive=false. Hard-delete is never used (ADR-note: companies may be referenced by existing claims). */
export async function deleteCompany(session: Session, id: string): Promise<void> {
  const repo = new InsuranceRepository(getSupabaseClient(), session.hospitalId);
  const existing = await repo.findCompanyById(id);
  if (!existing) {
    throw new NotFoundError('InsuranceCompany', id);
  }
  await repo.softDeleteCompany(id);
}

// ── Insurance Claims ──────────────────────────────────────────────────────────

export async function getClaims(
  session: Session,
  query: ClaimListQuery,
): Promise<{ data: unknown[]; total: number }> {
  const repo = new InsuranceRepository(getSupabaseClient(), session.hospitalId);
  const { rows, total } = await repo.findClaims(
    query.page,
    query.pageSize,
    query.status,
    query.excludeClosed,
    query.search,
  );
  return { data: rows, total };
}

export async function createClaim(
  session: Session,
  body: InsuranceClaim,
): Promise<unknown> {
  const supabase = getSupabaseClient();
  const repo = new InsuranceRepository(supabase, session.hospitalId);

  // Fetch the linked inpatient — all denormalized fields come from it.
  const ip = await repo.findInpatientById(body.inPatientId);
  if (!ip) {
    throw new NotFoundError('InPatient', body.inPatientId);
  }

  // Atomic claim number from Postgres sequence (H-3 pattern).
  const year = new String(new Date().getFullYear()).valueOf();
  const { data: claimNumRow, error: seqError } = await supabase
    .rpc('next_insurance_claim_number', { p_year: year });
  if (seqError || !claimNumRow) {
    throw new Error(`Failed to generate claim number: ${seqError?.message ?? 'no result'}`);
  }
  const claimNumber = claimNumRow as string;

  const totalBillAmount = (ip.netAmount as number) ?? 0;
  const alreadyPaid = (ip.totalReceivedAmount as number) ?? 0;
  const preauthAmount = body.preauthAmount ?? 0;
  const patientPayable = totalBillAmount - preauthAmount;

  const initialHistory = JSON.stringify([
    {
      status: 'PREAUTH_SUBMITTED',
      date: new Date().toISOString(),
      notes: 'Claim created',
      updatedBy: session.id,
    },
  ]);

  const now = new Date().toISOString();
  const claimRow: Record<string, unknown> = {
    id: crypto.randomUUID(),
    claimNumber,
    inPatientId: ip.id,
    insuranceCompanyId: body.insuranceCompanyId ?? null,
    patientName: ip.name,
    ipNumber: ip.ipNumber,
    age: ip.age,
    gender: ip.gender,
    phone: ip.phone,
    guardianName: ip.guardianName ?? null,
    department: ip.department ?? null,
    doctorNames: ip.doctorNames ?? '[]',
    operationName: ip.operationName ?? null,
    provisionDiagnosis: ip.provisionDiagnosis ?? null,
    admissionDate: ip.admissionDate,
    dischargeDate: ip.dischargeDate ?? null,
    insuranceCompanyName: body.insuranceCompanyName,
    tpaName: body.tpaName ?? null,
    policyNumber: body.policyNumber ?? null,
    policyHolderName: body.policyHolderName ?? null,
    insuranceCardNumber: body.insuranceCardNumber ?? null,
    relationToInsured: body.relationToInsured ?? null,
    packageAmount: (ip.packageAmount as number) ?? 0,
    totalBillAmount,
    preauthAmount,
    totalApprovedAmount: preauthAmount,
    patientPayableAmount: Math.max(0, patientPayable),
    patientPaidAmount: alreadyPaid,
    patientBalance: Math.max(0, patientPayable - alreadyPaid),
    discount: (ip.discount as number) ?? 0,
    status: 'PREAUTH_SUBMITTED',
    preauthSubmittedDate: now,
    statusHistory: initialHistory,
    notes: body.notes ?? null,
    packageInclusions: ip.packageInclusions ?? null,
    createdById: session.id,
    hospital_id: session.hospitalId,
    createdAt: now,
    updatedAt: now,
  };

  const created = await repo.insertClaim(claimRow);
  return created;
}

export async function getClaimById(session: Session, id: string): Promise<unknown> {
  const repo = new InsuranceRepository(getSupabaseClient(), session.hospitalId);
  const claim = await repo.findClaimById(id);
  if (!claim) {
    throw new NotFoundError('InsuranceClaim', id);
  }
  return claim;
}

/**
 * Update claim status with optional extra data for financial transitions.
 *
 * Bug fix note for index.ts: the scaffold passed only `b.data.status` to this function,
 * discarding amount/notes/rejectionReason etc. that are needed for SETTLED, PREAUTH_APPROVED,
 * and rejection status transitions. The index.ts was updated to pass the full `b.data` object
 * so these optional fields reach the service. Without this fix, settling a claim would record
 * $0 as the settled amount, which is a functional correctness bug.
 */
export async function updateClaimStatus(
  session: Session,
  id: string,
  statusData: UpdateClaimStatus,
): Promise<void> {
  const repo = new InsuranceRepository(getSupabaseClient(), session.hospitalId);
  const claim = await repo.findClaimById(id);
  if (!claim) {
    throw new NotFoundError('InsuranceClaim', id);
  }

  const { status, notes, amount, rejectionReason, settlementReference, deductions } = statusData;
  const now = new Date().toISOString();

  // Append to statusHistory (TEXT JSON column).
  const history: Record<string, unknown>[] = claim.statusHistory
    ? JSON.parse(claim.statusHistory as string)
    : [];
  history.push({
    status,
    date: now,
    notes: notes ?? undefined,
    updatedBy: session.id,
  });

  const patch: Record<string, unknown> = {
    status,
    statusHistory: JSON.stringify(history),
    updatedBy: session.id,
  };

  switch (status) {
    case 'PREAUTH_QUERY':
      if (notes) patch.preauthQueryNotes = notes;
      break;

    case 'PREAUTH_APPROVED':
      patch.preauthApprovedDate = now;
      if (amount !== undefined) {
        patch.preauthAmount = amount;
        const enhApproved = (claim.enhancementApproved as number) ?? 0;
        patch.totalApprovedAmount = amount + enhApproved;
        const totalBill = (claim.totalBillAmount as number) ?? 0;
        const disc = (claim.discount as number) ?? 0;
        patch.patientPayableAmount = Math.max(0, totalBill - amount - enhApproved - disc);
        patch.patientBalance = Math.max(
          0,
          totalBill - amount - enhApproved - disc - ((claim.patientPaidAmount as number) ?? 0),
        );
      }
      break;

    case 'PREAUTH_REJECTED':
      patch.preauthRejectionReason = rejectionReason ?? notes ?? null;
      break;

    case 'ENHANCEMENT_CLAIMED':
      patch.enhancementClaimedDate = now;
      if (amount !== undefined) patch.enhancementAmount = amount;
      break;

    case 'ENHANCEMENT_QUERY':
      if (notes) patch.enhancementQueryNotes = notes;
      break;

    case 'ENHANCEMENT_APPROVED':
      patch.enhancementApprovedDate = now;
      if (amount !== undefined) {
        patch.enhancementApproved = amount;
        const preauth = (claim.preauthAmount as number) ?? 0;
        patch.totalApprovedAmount = preauth + amount;
        const totalBill = (claim.totalBillAmount as number) ?? 0;
        const disc = (claim.discount as number) ?? 0;
        patch.patientPayableAmount = Math.max(0, totalBill - preauth - amount - disc);
        patch.patientBalance = Math.max(
          0,
          totalBill - preauth - amount - disc - ((claim.patientPaidAmount as number) ?? 0),
        );
      }
      break;

    case 'ENHANCEMENT_REJECTED':
      patch.enhancementRejectionReason = rejectionReason ?? notes ?? null;
      break;

    case 'FINAL_BILL_SUBMITTED':
      patch.finalBillSubmittedDate = now;
      break;

    case 'SETTLED':
    case 'PARTIALLY_SETTLED': {
      patch.settlementDate = now;
      if (settlementReference) patch.settlementReference = settlementReference;
      const settled = amount ?? (claim.totalApprovedAmount as number) ?? 0;
      const ded = deductions ?? 0;
      const totalBill = (claim.totalBillAmount as number) ?? 0;
      const disc = (claim.discount as number) ?? 0;
      patch.finalSettledAmount = settled;
      patch.deductions = ded;
      patch.patientPayableAmount = Math.max(0, totalBill - settled - disc);
      patch.patientBalance = Math.max(
        0,
        totalBill - settled - disc - ((claim.patientPaidAmount as number) ?? 0),
      );

      // Mirror the settlement as an Insurance payment record on the InPatient,
      // replacing any prior Insurance entry to avoid double-counting on re-settlement.
      if (claim.inPatientId) {
        const ip = await repo.findInpatientById(claim.inPatientId as string);
        if (ip) {
          const existing: Record<string, unknown>[] = ip.paymentRecords
            ? JSON.parse(ip.paymentRecords as string)
            : [];
          const withoutPrior = existing.filter(
            (r) => (r.amountType as string)?.toLowerCase() !== 'insurance',
          );
          const settlementRecord = {
            date: new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date()),
            amountType: 'Insurance',
            paymentMode: 'Insurance',
            amount: settled,
            notes: `Insurance settlement${settlementReference ? ` (Ref: ${settlementReference})` : ''}`,
          };
          const updated = [...withoutPrior, settlementRecord];
          const newTotalReceived = updated.reduce((s, r) => s + ((r.amount as number) ?? 0), 0);
          const netAmount = (ip.netAmount as number) ?? 0;
          const newBalance = Math.max(0, netAmount - newTotalReceived);
          await repo.updateInpatientPaymentRecords(
            claim.inPatientId as string,
            updated,
            newTotalReceived,
            newBalance,
          );
        }
      }
      break;
    }

    case 'CLAIM_REJECTED': {
      const totalBill = (claim.totalBillAmount as number) ?? 0;
      const disc = (claim.discount as number) ?? 0;
      patch.patientPayableAmount = totalBill - disc;
      patch.patientBalance = Math.max(
        0,
        totalBill - disc - ((claim.patientPaidAmount as number) ?? 0),
      );
      break;
    }

    default:
      // Generic status transition — only statusHistory entry is recorded.
      break;
  }

  await repo.updateClaim(id, patch);
}

/**
 * Update claim financial/policy details (PATCH /claims/{id}/details).
 * Handles approvedAmount, settledAmount, and policy admin fields.
 * Financial recalculates derived balance fields when amounts change.
 */
export async function updateClaimDetails(
  session: Session,
  id: string,
  body: UpdateClaimDetails,
): Promise<void> {
  const repo = new InsuranceRepository(getSupabaseClient(), session.hospitalId);
  const claim = await repo.findClaimById(id);
  if (!claim) {
    throw new NotFoundError('InsuranceClaim', id);
  }

  const patch: Record<string, unknown> = { updatedBy: session.id };

  // Policy / admin fields (direct pass-through).
  if (body.insuranceCompanyName !== undefined) patch.insuranceCompanyName = body.insuranceCompanyName;
  if (body.insuranceCompanyId !== undefined) patch.insuranceCompanyId = body.insuranceCompanyId;
  if (body.tpaName !== undefined) patch.tpaName = body.tpaName;
  if (body.policyNumber !== undefined) patch.policyNumber = body.policyNumber;
  if (body.policyHolderName !== undefined) patch.policyHolderName = body.policyHolderName;
  if (body.insuranceCardNumber !== undefined) patch.insuranceCardNumber = body.insuranceCardNumber;
  if (body.relationToInsured !== undefined) patch.relationToInsured = body.relationToInsured;
  if (body.notes !== undefined) patch.notes = body.notes;
  if (body.totalBillAmount !== undefined) patch.totalBillAmount = body.totalBillAmount;

  // Financial fields from openapi.yaml spec with derived recalculation.
  if (body.approvedAmount !== undefined) {
    patch.totalApprovedAmount = body.approvedAmount;
    const totalBill = (body.totalBillAmount as number | undefined) ?? (claim.totalBillAmount as number) ?? 0;
    const disc = (claim.discount as number) ?? 0;
    patch.patientPayableAmount = Math.max(0, totalBill - body.approvedAmount - disc);
    patch.patientBalance = Math.max(
      0,
      totalBill - body.approvedAmount - disc - ((claim.patientPaidAmount as number) ?? 0),
    );
  }
  if (body.settledAmount !== undefined) {
    patch.finalSettledAmount = body.settledAmount;
  }

  await repo.updateClaim(id, patch);
}

/**
 * Record a patient co-payment on an insurance claim.
 *
 * Payment pattern (matching old addInsurancePatientPayment exactly):
 *   1. Fetch InPatient and append a new Cash payment record to paymentRecords JSON.
 *   2. Recompute totalReceivedAmount and balanceAmount on InPatient.
 *   3. Derive the authoritative patientPaidAmount from non-Insurance records only.
 *   4. Update claim's patientPaidAmount + patientBalance + statusHistory.
 *
 * There is no separate InsurancePayment table — this is the DB-authoritative pattern.
 */
export async function addClaimPayment(
  session: Session,
  claimId: string,
  body: AddClaimPayment,
): Promise<void> {
  const repo = new InsuranceRepository(getSupabaseClient(), session.hospitalId);
  const claim = await repo.findClaimById(claimId);
  if (!claim) {
    throw new NotFoundError('InsuranceClaim', claimId);
  }

  const now = new Date().toISOString();

  // Append to statusHistory for audit trail.
  const history: Record<string, unknown>[] = claim.statusHistory
    ? JSON.parse(claim.statusHistory as string)
    : [];
  history.push({
    status: claim.status,
    date: now,
    notes: `Patient payment: ₹${body.amount} via ${body.paymentMode}${body.notes ? ` - ${body.notes}` : ''}`,
    updatedBy: session.id,
  });

  let patientCashPaid = ((claim.patientPaidAmount as number) ?? 0) + body.amount;

  if (claim.inPatientId) {
    const ip = await repo.findInpatientById(claim.inPatientId as string);
    if (ip) {
      const existing: Record<string, unknown>[] = ip.paymentRecords
        ? JSON.parse(ip.paymentRecords as string)
        : [];
      const newRecord = {
        date: new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date()),
        amountType: 'Cash',
        paymentMode: body.paymentMode,
        amount: body.amount,
        notes: body.notes ?? null,
      };
      const updated = [...existing, newRecord];
      const newTotalReceived = updated.reduce((s, r) => s + ((r.amount as number) ?? 0), 0);
      const netAmount = (ip.netAmount as number) ?? 0;
      const newBalance = Math.max(0, netAmount - newTotalReceived);

      await repo.updateInpatientPaymentRecords(
        claim.inPatientId as string,
        updated,
        newTotalReceived,
        newBalance,
      );

      // Authoritative patientCashPaid = sum of non-Insurance records.
      patientCashPaid = updated
        .filter((r) => (r.amountType as string)?.toLowerCase() !== 'insurance')
        .reduce((s, r) => s + ((r.amount as number) ?? 0), 0);
    }
  }

  const newBalance = Math.max(
    0,
    ((claim.patientPayableAmount as number) ?? 0) - patientCashPaid,
  );

  await repo.updateClaim(claimId, {
    patientPaidAmount: patientCashPaid,
    patientBalance: newBalance,
    statusHistory: JSON.stringify(history),
    updatedBy: session.id,
  });
}

/**
 * Search inpatients by ipNumber, name, or phone for insurance claim creation.
 *
 * Filters on: InPatient rows matching the search term in any of the three fields.
 * Returns up to 10 matches ordered by admissionDate DESC.
 * Minimum search length of 2 characters (same guard as old searchInPatientsForInsurance).
 */
export async function searchInpatients(
  session: Session,
  query?: string,
): Promise<unknown[]> {
  if (!query || query.trim().length < 2) return [];
  const repo = new InsuranceRepository(getSupabaseClient(), session.hospitalId);
  return repo.searchInpatients(query.trim());
}
