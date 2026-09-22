import { NotImplementedError } from '../_shared/errors.ts';
import type { Session } from '../_shared/auth.ts';
import type { EyeReading } from './types.ts';

export async function getWorkupQueue(_s: Session): Promise<unknown[]> { throw new NotImplementedError('workup.getWorkupQueue — Phase 7'); }
export async function getPatientForWorkup(_s: Session, _patientId: string): Promise<unknown> { throw new NotImplementedError('workup.getPatientForWorkup — Phase 7'); }
export async function saveEyeReading(_s: Session, _patientId: string, _b: EyeReading): Promise<EyeReading> { throw new NotImplementedError('workup.saveEyeReading — Phase 7'); }
/** Deprecated no-op — workup status is computed from data, not stored. */
export async function startWorkup(_s: Session, _patientId: string): Promise<void> { /* intentional no-op */ }
