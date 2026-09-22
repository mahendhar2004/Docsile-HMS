import { NotImplementedError } from '../_shared/errors.ts';
import type { Session } from '../_shared/auth.ts';

export async function getAnalytics(_s: Session, _q: { filter?: string; customStart?: string; customEnd?: string }): Promise<unknown> { throw new NotImplementedError('call-logs.getAnalytics — Phase 7'); }
export async function listCallLogs(_s: Session, _q: { page: number; pageSize: number; date?: string }): Promise<{ data: unknown[]; total: number }> { throw new NotImplementedError('call-logs.listCallLogs — Phase 7'); }
export async function getStats(_s: Session): Promise<unknown> { throw new NotImplementedError('call-logs.getStats — Phase 7'); }
export async function updateNotes(_s: Session, _id: string, _notes: string): Promise<void> { throw new NotImplementedError('call-logs.updateNotes — Phase 7'); }
export async function linkPatient(_s: Session, _id: string, _patientId: string): Promise<void> { throw new NotImplementedError('call-logs.linkPatient — Phase 7'); }
export async function searchPatients(_s: Session, _q?: string): Promise<unknown[]> { throw new NotImplementedError('call-logs.searchPatients — Phase 7'); }
export async function syncExotel(_s: Session): Promise<unknown> { throw new NotImplementedError('call-logs.syncExotel — Phase 7'); }
export async function processWebhook(_hospitalId: string, _payload: unknown): Promise<void> { throw new NotImplementedError('call-logs.processWebhook — Phase 7'); }
