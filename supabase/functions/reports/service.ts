import { NotImplementedError } from '../_shared/errors.ts';
import type { Session } from '../_shared/auth.ts';
import type { ExportQuery } from './types.ts';

export async function searchPatients(_s: Session, _q: { q?: string; cursor?: string; limit: number }): Promise<unknown> { throw new NotImplementedError('reports.searchPatients — Phase 7'); }
export async function getPatientSummary(_s: Session, _patientId: string): Promise<unknown> { throw new NotImplementedError('reports.getPatientSummary — Phase 7'); }
export async function getPatientVisits(_s: Session, _patientId: string): Promise<unknown[]> { throw new NotImplementedError('reports.getPatientVisits — Phase 7'); }
export async function getPatientPrescriptions(_s: Session, _patientId: string): Promise<unknown[]> { throw new NotImplementedError('reports.getPatientPrescriptions — Phase 7'); }
export async function getPatientInpatient(_s: Session, _patientId: string): Promise<unknown[]> { throw new NotImplementedError('reports.getPatientInpatient — Phase 7'); }
export async function getPatientReceipt(_s: Session, _patientId: string): Promise<unknown> { throw new NotImplementedError('reports.getPatientReceipt — Phase 7'); }
export async function getPatientLabs(_s: Session, _patientId: string): Promise<unknown[]> { throw new NotImplementedError('reports.getPatientLabs — Phase 7'); }
export async function getPatientBilling(_s: Session, _patientId: string): Promise<unknown> { throw new NotImplementedError('reports.getPatientBilling — Phase 7'); }
export async function exportPatients(_s: Session, _q: ExportQuery): Promise<unknown[]> { throw new NotImplementedError('reports.exportPatients — Phase 7'); }
export async function exportPrescriptions(_s: Session, _q: ExportQuery): Promise<unknown[]> { throw new NotImplementedError('reports.exportPrescriptions — Phase 7'); }
export async function exportEyeReadings(_s: Session, _q: ExportQuery): Promise<unknown[]> { throw new NotImplementedError('reports.exportEyeReadings — Phase 7'); }
export async function exportInpatients(_s: Session, _q: ExportQuery): Promise<unknown[]> { throw new NotImplementedError('reports.exportInpatients — Phase 7'); }
export async function exportInsuranceClaims(_s: Session, _q: ExportQuery): Promise<unknown[]> { throw new NotImplementedError('reports.exportInsuranceClaims — Phase 7'); }
export async function exportLabBills(_s: Session, _q: ExportQuery): Promise<unknown[]> { throw new NotImplementedError('reports.exportLabBills — Phase 7'); }
export async function exportPharmacyBills(_s: Session, _q: ExportQuery): Promise<unknown[]> { throw new NotImplementedError('reports.exportPharmacyBills — Phase 7'); }
export async function exportOpticalBills(_s: Session, _q: ExportQuery): Promise<unknown[]> { throw new NotImplementedError('reports.exportOpticalBills — Phase 7'); }
export async function exportExpenses(_s: Session, _q: ExportQuery): Promise<unknown[]> { throw new NotImplementedError('reports.exportExpenses — Phase 7'); }
