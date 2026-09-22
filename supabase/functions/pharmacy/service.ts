import { NotImplementedError } from '../_shared/errors.ts';
import type { Session } from '../_shared/auth.ts';
import type { PharmacyMedicine, PharmacySupplier, PharmacyStock } from './types.ts';

export async function getMedicines(_session: Session): Promise<PharmacyMedicine[]> { throw new NotImplementedError('pharmacy.getMedicines — Phase 7'); }
export async function createMedicine(_session: Session, _body: PharmacyMedicine): Promise<PharmacyMedicine> { throw new NotImplementedError('pharmacy.createMedicine — Phase 7'); }
export async function updateMedicine(_session: Session, _id: string, _body: Partial<PharmacyMedicine>): Promise<void> { throw new NotImplementedError('pharmacy.updateMedicine — Phase 7'); }
export async function deleteMedicine(_session: Session, _id: string): Promise<void> { throw new NotImplementedError('pharmacy.deleteMedicine — Phase 7'); }

export async function getStock(_session: Session): Promise<PharmacyStock[]> { throw new NotImplementedError('pharmacy.getStock — Phase 7'); }
export async function addStock(_session: Session, _body: PharmacyStock): Promise<void> { throw new NotImplementedError('pharmacy.addStock — Phase 7'); }
export async function updateStock(_session: Session, _id: string, _body: Partial<PharmacyStock>): Promise<void> { throw new NotImplementedError('pharmacy.updateStock — Phase 7'); }
export async function getStockSummary(_session: Session): Promise<unknown> { throw new NotImplementedError('pharmacy.getStockSummary — Phase 7'); }
export async function searchMedicineStock(_session: Session, _q: string): Promise<PharmacyStock[]> { throw new NotImplementedError('pharmacy.searchMedicineStock — Phase 7'); }

export async function getSuppliers(_session: Session): Promise<PharmacySupplier[]> { throw new NotImplementedError('pharmacy.getSuppliers — Phase 7'); }
export async function createSupplier(_session: Session, _body: PharmacySupplier): Promise<void> { throw new NotImplementedError('pharmacy.createSupplier — Phase 7'); }
export async function updateSupplier(_session: Session, _id: string, _body: Partial<PharmacySupplier>): Promise<void> { throw new NotImplementedError('pharmacy.updateSupplier — Phase 7'); }
export async function deleteSupplier(_session: Session, _id: string): Promise<void> { throw new NotImplementedError('pharmacy.deleteSupplier — Phase 7'); }

export async function getPurchaseOrders(_session: Session): Promise<unknown[]> { throw new NotImplementedError('pharmacy.getPurchaseOrders — Phase 7'); }
export async function createPurchaseOrder(_session: Session, _body: unknown): Promise<unknown> { throw new NotImplementedError('pharmacy.createPurchaseOrder — Phase 7'); }
export async function receivePurchaseOrder(_session: Session, _id: string, _body: unknown): Promise<void> { throw new NotImplementedError('pharmacy.receivePurchaseOrder — Phase 7'); }
export async function updatePOStatus(_session: Session, _id: string, _status: string): Promise<void> { throw new NotImplementedError('pharmacy.updatePOStatus — Phase 7'); }

export async function getPharmacyBills(_session: Session, _query: { page: number; pageSize: number }): Promise<{ data: unknown[]; total: number }> { throw new NotImplementedError('pharmacy.getPharmacyBills — Phase 7'); }
export async function createPharmacyBill(_session: Session, _body: unknown): Promise<unknown> { throw new NotImplementedError('pharmacy.createPharmacyBill — Phase 7'); }

export async function getPendingMedicines(_session: Session): Promise<unknown[]> { throw new NotImplementedError('pharmacy.getPendingMedicines — Phase 7'); }
export async function getPatientPrescription(_session: Session, _patientId: string): Promise<unknown> { throw new NotImplementedError('pharmacy.getPatientPrescription — Phase 7'); }
