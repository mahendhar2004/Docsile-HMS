import { NotImplementedError } from '../_shared/errors.ts';
import type { Session } from '../_shared/auth.ts';
import type { RecordPaymentBody } from './types.ts';

export async function getDailySummary(_session: Session, _date?: string): Promise<unknown> {
  throw new NotImplementedError('billing.getDailySummary — Phase 7');
}

export async function listPrescriptions(
  _session: Session,
  _query: { date?: string; page: number; pageSize: number },
): Promise<{ data: unknown[]; total: number }> {
  throw new NotImplementedError('billing.listPrescriptions — Phase 7');
}

export async function getPrescriptionById(_session: Session, _id: string): Promise<unknown> {
  throw new NotImplementedError('billing.getPrescriptionById — Phase 7');
}

export async function recordPayment(
  _session: Session,
  _prescriptionId: string,
  _body: RecordPaymentBody,
): Promise<unknown> {
  throw new NotImplementedError('billing.recordPayment — Phase 7');
}

export async function voidPayment(
  _session: Session,
  _prescriptionId: string,
  _payId: string,
): Promise<void> {
  throw new NotImplementedError('billing.voidPayment — Phase 7');
}
