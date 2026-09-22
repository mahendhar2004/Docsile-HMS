import { z } from 'zod';

export const ExpenseCategorySchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  sortOrder: z.number().int().nonnegative().optional(),
});
export type ExpenseCategory = z.infer<typeof ExpenseCategorySchema>;

export const ReorderCategoriesSchema = z.object({
  order: z.array(z.object({
    id: z.string().min(1),
    sortOrder: z.number().int().nonnegative(),
  })),
});

export const ExpenseSchema = z.object({
  id: z.string().uuid().optional(),
  categoryId: z.string().min(1),
  description: z.string().min(1),
  amount: z.number().positive(),
  date: z.string().date(),
  notes: z.string().nullable().optional(),
});
export type Expense = z.infer<typeof ExpenseSchema>;

export const ExpenseListQuerySchema = z.object({
  startDate: z.string().date().optional(),
  endDate: z.string().date().optional(),
});
