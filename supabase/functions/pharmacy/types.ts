import { z } from 'zod';

export const PharmacyMedicineSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  manufacturer: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  gstPercent: z.number().nonnegative(),
  isDeleted: z.boolean().optional(),
});
export type PharmacyMedicine = z.infer<typeof PharmacyMedicineSchema>;

export const PharmacySupplierSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  gstin: z.string().nullable().optional(),
  drugLicenseNo: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  isDeleted: z.boolean().optional(),
});
export type PharmacySupplier = z.infer<typeof PharmacySupplierSchema>;

export const PharmacyStockSchema = z.object({
  id: z.string().uuid().optional(),
  medicineId: z.string().min(1),
  supplierId: z.string().nullable().optional(),
  batchNumber: z.string().min(1),
  expiryDate: z.string().date(),
  quantity: z.number().int().nonnegative(),
  purchasePrice: z.number().nonnegative(),
  sellingPrice: z.number().nonnegative(),
});
export type PharmacyStock = z.infer<typeof PharmacyStockSchema>;

export const PurchaseOrderSchema = z.object({
  id: z.string().uuid().optional(),
  orderNumber: z.string().optional(),
  supplierId: z.string().min(1),
  status: z.enum(['pending', 'received', 'cancelled']).optional(),
  totalAmount: z.number().nonnegative(),
  createdAt: z.string().datetime().optional(),
});

export const PurchaseOrderItemSchema = z.object({
  id: z.string().uuid().optional(),
  purchaseOrderId: z.string().optional(),
  medicineId: z.string().min(1),
  quantity: z.number().int().positive(),
  unitPrice: z.number().nonnegative(),
});

export const CreatePurchaseOrderSchema = z.object({
  order: PurchaseOrderSchema,
  items: z.array(PurchaseOrderItemSchema),
});

export const ReceivePurchaseOrderSchema = z.object({
  receivedItems: z.array(PurchaseOrderItemSchema),
});

export const UpdatePOStatusSchema = z.object({
  status: z.enum(['pending', 'received', 'cancelled']),
});

export const CreatePharmacyBillSchema = z.object({
  bill: z.object({
    patientId: z.string().nullable().optional(),
    totalAmount: z.number().nonnegative(),
    gstAmount: z.number().nonnegative(),
  }),
  items: z.array(z.object({
    stockId: z.string(),
    quantity: z.number().int().positive(),
    unitPrice: z.number().nonnegative(),
  })),
});

export const StockSearchQuerySchema = z.object({
  q: z.string().min(1, 'q is required'),
});

export const PharmacyBillListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(50),
});
