import { z } from 'zod';

export const OpticalProductSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  category: z.string().nullable().optional(),
  brand: z.string().nullable().optional(),
  isDeleted: z.boolean().optional(),
});
export type OpticalProduct = z.infer<typeof OpticalProductSchema>;

export const OpticalStockSchema = z.object({
  id: z.string().uuid().optional(),
  productId: z.string().min(1),
  batch: z.string().nullable().optional(),
  power: z.string().nullable().optional(),
  quantity: z.number().int().nonnegative(),
  costPrice: z.number().nonnegative().optional(),
  sellingPrice: z.number().nonnegative().optional(),
});
export type OpticalStock = z.infer<typeof OpticalStockSchema>;

export const OpticalBillItemSchema = z.object({
  id: z.string().uuid().optional(),
  opticalBillId: z.string().optional(),
  stockId: z.string().min(1),
  name: z.string().min(1),
  quantity: z.number().int().positive(),
  price: z.number().nonnegative(),
});

export const OpticalBillSchema = z.object({
  id: z.string().uuid().optional(),
  billNumber: z.string().optional(),
  patientId: z.string().min(1),
  totalAmount: z.number().nonnegative(),
  status: z.string().optional(),
  createdAt: z.string().datetime().optional(),
});
export type OpticalBill = z.infer<typeof OpticalBillSchema>;

export const CreateOpticalBillSchema = z.object({
  bill: OpticalBillSchema,
  items: z.array(OpticalBillItemSchema),
});

export const UpdateBillStatusSchema = z.object({
  status: z.string().min(1),
});

export const OpticalBillListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(50),
  date: z.string().date().optional(),
});

export const StockSearchQuerySchema = z.object({
  q: z.string().min(1),
});
