import { NotImplementedError } from '../_shared/errors.ts';
import type { Session } from '../_shared/auth.ts';

export async function getOpdQueue(_s: Session): Promise<unknown[]> { throw new NotImplementedError('queue.getOpdQueue — Phase 7'); }
export async function getWorkupQueue(_s: Session): Promise<unknown[]> { throw new NotImplementedError('queue.getWorkupQueue — Phase 7'); }
export async function getInpatientBoard(_s: Session): Promise<unknown[]> { throw new NotImplementedError('queue.getInpatientBoard — Phase 7'); }
