import { NotImplementedError } from '../_shared/errors.ts';
import type { Session } from '../_shared/auth.ts';

export async function getSummary(_s: Session): Promise<unknown> { throw new NotImplementedError('dashboard.getSummary — Phase 7'); }
export async function getQuickStats(_s: Session): Promise<unknown> { throw new NotImplementedError('dashboard.getQuickStats — Phase 7'); }
