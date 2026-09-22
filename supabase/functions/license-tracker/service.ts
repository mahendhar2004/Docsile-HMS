import { NotImplementedError } from '../_shared/errors.ts';
import type { Session } from '../_shared/auth.ts';
import type { License } from './types.ts';

export async function listLicenses(_s: Session): Promise<License[]> { throw new NotImplementedError('license-tracker.listLicenses — Phase 7'); }
export async function createLicense(_s: Session, _b: License): Promise<License> { throw new NotImplementedError('license-tracker.createLicense — Phase 7'); }
export async function updateLicense(_s: Session, _id: string, _b: Partial<License>): Promise<void> { throw new NotImplementedError('license-tracker.updateLicense — Phase 7'); }
export async function deleteLicense(_s: Session, _id: string): Promise<void> { throw new NotImplementedError('license-tracker.deleteLicense — Phase 7'); }
export async function saveDocumentUrl(_s: Session, _id: string, _url: string): Promise<void> { throw new NotImplementedError('license-tracker.saveDocumentUrl — Phase 7'); }
export async function removeDocument(_s: Session, _id: string): Promise<void> { throw new NotImplementedError('license-tracker.removeDocument — Phase 7'); }
