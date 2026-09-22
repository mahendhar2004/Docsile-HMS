import { NotImplementedError } from '../_shared/errors.ts';
import type { Session } from '../_shared/auth.ts';

export async function getDues(_s: Session, _q: { page: number; pageSize: number }): Promise<{ data: unknown[]; total: number }> { throw new NotImplementedError('dues-followups.getDues — Phase 7'); }
export async function getFollowups(_s: Session, _q: { page: number; pageSize: number }): Promise<{ data: unknown[]; total: number }> { throw new NotImplementedError('dues-followups.getFollowups — Phase 7'); }
export async function markPaid(_s: Session, _id: string, _b: { type: string; paymentMode?: string; amount?: number }): Promise<void> { throw new NotImplementedError('dues-followups.markPaid — Phase 7'); }
export async function getDoctors(_s: Session): Promise<unknown[]> { throw new NotImplementedError('dues-followups.getDoctors — Phase 7'); }
export async function getDepartments(_s: Session): Promise<unknown[]> { throw new NotImplementedError('dues-followups.getDepartments — Phase 7'); }
export async function getEmailTemplates(_s: Session): Promise<unknown[]> { throw new NotImplementedError('dues-followups.getEmailTemplates — Phase 7'); }
export async function getHospitalName(_s: Session): Promise<unknown> { throw new NotImplementedError('dues-followups.getHospitalName — Phase 7'); }
export async function sendEmail(_s: Session, _b: { patientId: string; templateId: string; customMessage?: string | null }): Promise<void> { throw new NotImplementedError('dues-followups.sendEmail — Phase 7'); }
