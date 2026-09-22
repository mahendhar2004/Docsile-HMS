import { NotImplementedError } from '../_shared/errors.ts';
import type { Session } from '../_shared/auth.ts';
import type { OpticalProduct, OpticalStock, OpticalBill } from './types.ts';

export async function getProducts(_s: Session): Promise<OpticalProduct[]> { throw new NotImplementedError('optical.getProducts — Phase 7'); }
export async function createProduct(_s: Session, _b: OpticalProduct): Promise<OpticalProduct> { throw new NotImplementedError('optical.createProduct — Phase 7'); }
export async function updateProduct(_s: Session, _id: string, _b: Partial<OpticalProduct>): Promise<void> { throw new NotImplementedError('optical.updateProduct — Phase 7'); }
export async function deleteProduct(_s: Session, _id: string): Promise<void> { throw new NotImplementedError('optical.deleteProduct — Phase 7'); }
export async function getStock(_s: Session): Promise<OpticalStock[]> { throw new NotImplementedError('optical.getStock — Phase 7'); }
export async function upsertStock(_s: Session, _b: OpticalStock): Promise<void> { throw new NotImplementedError('optical.upsertStock — Phase 7'); }
export async function getStockSummary(_s: Session): Promise<unknown> { throw new NotImplementedError('optical.getStockSummary — Phase 7'); }
export async function searchStock(_s: Session, _q: string): Promise<unknown[]> { throw new NotImplementedError('optical.searchStock — Phase 7'); }
export async function updateStock(_s: Session, _id: string, _b: Partial<OpticalStock>): Promise<void> { throw new NotImplementedError('optical.updateStock — Phase 7'); }
export async function getBills(_s: Session, _q: { page: number; pageSize: number; date?: string }): Promise<{ data: OpticalBill[]; total: number }> { throw new NotImplementedError('optical.getBills — Phase 7'); }
export async function createBill(_s: Session, _b: unknown): Promise<unknown> { throw new NotImplementedError('optical.createBill — Phase 7'); }
export async function updateBillStatus(_s: Session, _id: string, _status: string): Promise<void> { throw new NotImplementedError('optical.updateBillStatus — Phase 7'); }
export async function getPatientArReading(_s: Session, _patientId: string): Promise<unknown> { throw new NotImplementedError('optical.getPatientArReading — Phase 7'); }
export async function getSettings(_s: Session): Promise<unknown> { throw new NotImplementedError('optical.getSettings — Phase 7'); }
export async function updateSettings(_s: Session, _b: unknown): Promise<void> { throw new NotImplementedError('optical.updateSettings — Phase 7'); }
export async function getHospitalProfile(_s: Session): Promise<unknown> { throw new NotImplementedError('optical.getHospitalProfile — Phase 7'); }
