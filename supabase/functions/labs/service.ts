import { NotImplementedError } from '../_shared/errors.ts';
import type { Session } from '../_shared/auth.ts';
import type { Lab, InvestigationMaster } from './types.ts';

export async function getLabs(_s: Session): Promise<Lab[]> { throw new NotImplementedError('labs.getLabs — Phase 7'); }
export async function createLab(_s: Session, _b: Lab): Promise<Lab> { throw new NotImplementedError('labs.createLab — Phase 7'); }
export async function getLabById(_s: Session, _id: string): Promise<unknown> { throw new NotImplementedError('labs.getLabById — Phase 7'); }
export async function updateLab(_s: Session, _id: string, _b: Partial<Lab>): Promise<void> { throw new NotImplementedError('labs.updateLab — Phase 7'); }
export async function deleteLab(_s: Session, _id: string): Promise<void> { throw new NotImplementedError('labs.deleteLab — Phase 7'); }
export async function getLabInvestigations(_s: Session, _labId: string): Promise<InvestigationMaster[]> { throw new NotImplementedError('labs.getLabInvestigations — Phase 7'); }
export async function updateLabInvestigations(_s: Session, _labId: string, _ids: string[]): Promise<void> { throw new NotImplementedError('labs.updateLabInvestigations — Phase 7'); }
export async function getAllInvestigations(_s: Session): Promise<InvestigationMaster[]> { throw new NotImplementedError('labs.getAllInvestigations — Phase 7'); }
export async function createInvestigation(_s: Session, _b: InvestigationMaster): Promise<void> { throw new NotImplementedError('labs.createInvestigation — Phase 7'); }
export async function getPatientInvestigations(_s: Session, _patientId: string): Promise<unknown> { throw new NotImplementedError('labs.getPatientInvestigations — Phase 7'); }
export async function getPendingLabInvestigations(_s: Session): Promise<unknown[]> { throw new NotImplementedError('labs.getPendingLabInvestigations — Phase 7'); }
export async function getLabBills(_s: Session, _q: { page: number; pageSize: number; date?: string }): Promise<{ data: unknown[]; total: number }> { throw new NotImplementedError('labs.getLabBills — Phase 7'); }
export async function createLabBills(_s: Session, _b: unknown): Promise<unknown> { throw new NotImplementedError('labs.createLabBills — Phase 7'); }
export async function getLabBillById(_s: Session, _id: string): Promise<unknown> { throw new NotImplementedError('labs.getLabBillById — Phase 7'); }
