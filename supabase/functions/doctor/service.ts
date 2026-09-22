import { NotImplementedError } from '../_shared/errors.ts';
import type { Session } from '../_shared/auth.ts';
import type { Prescription, MedicineMaster } from './types.ts';

export async function getDoctorQueue(_s: Session): Promise<unknown[]> { throw new NotImplementedError('doctor.getDoctorQueue — Phase 7'); }
export async function getPatientConsultation(_s: Session, _patientId: string): Promise<unknown> { throw new NotImplementedError('doctor.getPatientConsultation — Phase 7'); }
export async function savePrescription(_s: Session, _patientId: string, _b: Prescription): Promise<Prescription> { throw new NotImplementedError('doctor.savePrescription — Phase 7'); }
export async function getReferenceData(_s: Session): Promise<unknown> { throw new NotImplementedError('doctor.getReferenceData — Phase 7'); }
export async function getMedicineMaster(_s: Session): Promise<MedicineMaster[]> { throw new NotImplementedError('doctor.getMedicineMaster — Phase 7'); }
export async function getInvestigationMaster(_s: Session): Promise<unknown[]> { throw new NotImplementedError('doctor.getInvestigationMaster — Phase 7'); }
export async function getPrescriptionTemplates(_s: Session): Promise<unknown[]> { throw new NotImplementedError('doctor.getPrescriptionTemplates — Phase 7'); }
export async function getDropdownOptions(_s: Session): Promise<unknown> { throw new NotImplementedError('doctor.getDropdownOptions — Phase 7'); }
export async function addDropdownOption(_s: Session, _b: { fieldName: string; value: string }): Promise<void> { throw new NotImplementedError('doctor.addDropdownOption — Phase 7'); }
export async function createMedicine(_s: Session, _b: MedicineMaster): Promise<void> { throw new NotImplementedError('doctor.createMedicine — Phase 7'); }
export async function getPatientReceipt(_s: Session, _patientId: string): Promise<unknown> { throw new NotImplementedError('doctor.getPatientReceipt — Phase 7'); }
