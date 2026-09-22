import { NotImplementedError } from '../_shared/errors.ts';
import type { Session } from '../_shared/auth.ts';
import type { InsuranceCompany, InsuranceClaim } from './types.ts';

export async function getCompanies(_s: Session, _q: { page: number; pageSize: number; paginated: boolean }): Promise<{ data: InsuranceCompany[]; total: number }> { throw new NotImplementedError('insurance.getCompanies — Phase 7'); }
export async function createCompany(_s: Session, _b: InsuranceCompany): Promise<InsuranceCompany> { throw new NotImplementedError('insurance.createCompany — Phase 7'); }
export async function updateCompany(_s: Session, _id: string, _b: Partial<InsuranceCompany>): Promise<void> { throw new NotImplementedError('insurance.updateCompany — Phase 7'); }
export async function deleteCompany(_s: Session, _id: string): Promise<void> { throw new NotImplementedError('insurance.deleteCompany — Phase 7'); }
export async function getClaims(_s: Session, _q: { page: number; pageSize: number; status?: string }): Promise<{ data: InsuranceClaim[]; total: number }> { throw new NotImplementedError('insurance.getClaims — Phase 7'); }
export async function createClaim(_s: Session, _b: InsuranceClaim): Promise<InsuranceClaim> { throw new NotImplementedError('insurance.createClaim — Phase 7'); }
export async function getClaimById(_s: Session, _id: string): Promise<unknown> { throw new NotImplementedError('insurance.getClaimById — Phase 7'); }
export async function updateClaimStatus(_s: Session, _id: string, _status: string): Promise<void> { throw new NotImplementedError('insurance.updateClaimStatus — Phase 7'); }
export async function updateClaimDetails(_s: Session, _id: string, _b: { approvedAmount?: number; settledAmount?: number }): Promise<void> { throw new NotImplementedError('insurance.updateClaimDetails — Phase 7'); }
export async function addClaimPayment(_s: Session, _id: string, _b: { amount: number; paymentMode: string }): Promise<void> { throw new NotImplementedError('insurance.addClaimPayment — Phase 7'); }
export async function searchInpatients(_s: Session, _q?: string): Promise<unknown[]> { throw new NotImplementedError('insurance.searchInpatients — Phase 7'); }
