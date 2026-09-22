import { NotImplementedError } from '../_shared/errors.ts';
import type { Session } from '../_shared/auth.ts';
import type { ExpenseCategory, Expense } from './types.ts';

export async function seedCategories(_s: Session): Promise<void> { throw new NotImplementedError('expenses.seedCategories — Phase 7'); }
export async function listCategories(_s: Session): Promise<ExpenseCategory[]> { throw new NotImplementedError('expenses.listCategories — Phase 7'); }
export async function createCategory(_s: Session, _b: ExpenseCategory): Promise<ExpenseCategory> { throw new NotImplementedError('expenses.createCategory — Phase 7'); }
export async function updateCategory(_s: Session, _id: string, _b: Partial<ExpenseCategory>): Promise<void> { throw new NotImplementedError('expenses.updateCategory — Phase 7'); }
export async function deleteCategory(_s: Session, _id: string): Promise<void> { throw new NotImplementedError('expenses.deleteCategory — Phase 7'); }
export async function reorderCategories(_s: Session, _order: { id: string; sortOrder: number }[]): Promise<void> { throw new NotImplementedError('expenses.reorderCategories — Phase 7'); }
export async function listExpenses(_s: Session, _q: { startDate?: string; endDate?: string }): Promise<Expense[]> { throw new NotImplementedError('expenses.listExpenses — Phase 7'); }
export async function createExpense(_s: Session, _b: Expense): Promise<Expense> { throw new NotImplementedError('expenses.createExpense — Phase 7'); }
export async function updateExpense(_s: Session, _id: string, _b: Partial<Expense>): Promise<void> { throw new NotImplementedError('expenses.updateExpense — Phase 7'); }
export async function deleteExpense(_s: Session, _id: string): Promise<void> { throw new NotImplementedError('expenses.deleteExpense — Phase 7'); }
