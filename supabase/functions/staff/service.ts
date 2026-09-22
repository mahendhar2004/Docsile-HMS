import { NotImplementedError } from '../_shared/errors.ts';
import type { Session } from '../_shared/auth.ts';
import type { Role } from './types.ts';

export async function listMembers(_s: Session): Promise<unknown[]> { throw new NotImplementedError('staff.listMembers — Phase 7'); }
export async function createMember(_s: Session, _b: { name: string; email: string; password: string; role: string; employeeId?: string | null }): Promise<unknown> { throw new NotImplementedError('staff.createMember — Phase 7'); }
export async function getMemberById(_s: Session, _id: string): Promise<unknown> { throw new NotImplementedError('staff.getMemberById — Phase 7'); }
export async function updateMember(_s: Session, _id: string, _b: unknown): Promise<void> { throw new NotImplementedError('staff.updateMember — Phase 7'); }
export async function toggleActive(_s: Session, _id: string, _isActive: boolean): Promise<void> { throw new NotImplementedError('staff.toggleActive — Phase 7'); }
export async function resetPassword(_s: Session, _id: string, _newPassword: string): Promise<void> { throw new NotImplementedError('staff.resetPassword — Phase 7'); }
export async function listRoles(_s: Session): Promise<Role[]> { throw new NotImplementedError('staff.listRoles — Phase 7'); }
export async function createRole(_s: Session, _b: Role): Promise<Role> { throw new NotImplementedError('staff.createRole — Phase 7'); }
export async function updateRole(_s: Session, _id: string, _b: Partial<Role>): Promise<void> { throw new NotImplementedError('staff.updateRole — Phase 7'); }
export async function deleteRole(_s: Session, _id: string): Promise<void> { throw new NotImplementedError('staff.deleteRole — Phase 7'); }
export async function updateRolePermissions(_s: Session, _id: string, _permissions: string[]): Promise<void> { throw new NotImplementedError('staff.updateRolePermissions — Phase 7'); }
export async function seedSystemRoles(_s: Session): Promise<void> { throw new NotImplementedError('staff.seedSystemRoles — Phase 7'); }
