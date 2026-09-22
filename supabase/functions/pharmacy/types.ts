/**
 * Zod schemas and inferred types for the pharmacy Edge Function.
 *
 * Field names are verified against the authoritative CREATE TABLE statements in
 * supabase-migration.sql. Phase 6 scaffold field names that diverged from the DB
 * (purchasePrice/sellingPrice vs mrp/costPrice; isDeleted vs isActive) are corrected
 * here.
 */
import { z } from 'zod';

// ─── Medicines ─────────────────────────────────────────────────────────────────
// DB: PharmacyMedicine — soft-delete via isActive=false (no isDeleted column)

export const PharmacyMedicineSchema = z.object({
  name: z.string().min(1),
  genericName: z.string().nullable().optional(),
  manufacturer: z.string().nullable().optional(),
  composition: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  dosageForm: z.string().nullable().optional(),
  strength: z.string().nullable().optional(),
  unitOfMeasure: z.string().optional(),
  hsnCode: z.string().nullable().optional(),
  gstPercent: z.number().nonnegative().optional(),
  scheduleType: z.string().nullable().optional(),
});
export type PharmacyMedicine = z.infer<typeof PharmacyMedicineSchema>;

// ─── Suppliers ─────────────────────────────────────────────────────────────────
// DB: PharmacySupplier — soft-delete via isActive=false

export const PharmacySupplierSchema = z.object({
  name: z.string().min(1),
  contactPerson: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  gstin: z.string().nullable().optional(),
  drugLicenseNo: z.string().nullable().optional(),
  creditDays: z.number().int().nonnegative().optional(),
});
export type PharmacySupplier = z.infer<typeof PharmacySupplierSchema>;

// ─── Stock ─────────────────────────────────────────────────────────────────────
// DB: PharmacyStock — actual columns: mrp, costPrice (NOT purchasePrice/sellingPrice)

export const PharmacyStockSchema = z.object({
  medicineId: z.string().min(1),
  batchNumber: z.string().min(1),
  quantity: z.number().int().nonnegative(),
  mrp: z.number().nonnegative(),
  costPrice: z.number().nonnegative(),
  gstPercent: z.number().nonnegative().optional(),
  unitsPerPack: z.number().int().positive().optional(),
  expiryDate: z.string().min(1),          // ISO date/datetime string
  manufacturingDate: z.string().nullable().optional(),
  supplierId: z.string().nullable().optional(),
  purchaseOrderId: z.string().nullable().optional(),
});
export type PharmacyStock = z.infer<typeof PharmacyStockSchema>;

// ─── Purchase Orders ───────────────────────────────────────────────────────────
// DB: PurchaseOrder — status values: DRAFT, ORDERED, RECEIVED, PARTIALLY_RECEIVED, CANCELLED

export const CreatePOItemSchema = z.object({
  medicineId: z.string().min(1),
  batchNumber: z.string().nullable().optional(),
  quantity: z.number().int().positive(),
  costPrice: z.number().nonnegative(),
  mrp: z.number().nonnegative(),
  gstPercent: z.number().nonnegative().default(12),
  expiryDate: z.string().nullable().optional(),
});

export const CreatePOHeaderSchema = z.object({
  supplierId: z.string().min(1),
  expectedDate: z.string().nullable().optional(),
  invoiceNumber: z.string().nullable().optional(),
  invoiceDate: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  discount: z.number().nonnegative().default(0),
  paymentMode: z.string().nullable().optional(),
  amountPaid: z.number().nonnegative().default(0),
});

export const CreatePurchaseOrderSchema = z.object({
  order: CreatePOHeaderSchema,
  items: z.array(CreatePOItemSchema).min(1),
});

// ReceivePurchaseOrder: each item carries the PurchaseOrderItem.id plus receipt details
export const ReceiveItemSchema = z.object({
  itemId: z.string().min(1),
  receivedQty: z.number().int().positive(),
  batchNumber: z.string().min(1),
  expiryDate: z.string().min(1),
  mrp: z.number().nonnegative(),
  costPrice: z.number().nonnegative(),
});

export const ReceivePurchaseOrderSchema = z.object({
  receivedItems: z.array(ReceiveItemSchema).min(1),
});

export const UpdatePOStatusSchema = z.object({
  status: z.enum(['DRAFT', 'ORDERED', 'RECEIVED', 'PARTIALLY_RECEIVED', 'CANCELLED']),
});

// ─── Bills ─────────────────────────────────────────────────────────────────────
// DB: PharmacyBill — patientName is NOT NULL; all amount fields are DOUBLE PRECISION

export const BillItemSchema = z.object({
  stockId: z.string().min(1),
  medicineName: z.string().min(1),
  batchNumber: z.string().min(1),
  quantity: z.number().int().positive(),
  mrp: z.number().nonnegative(),
  price: z.number().nonnegative(),          // unit selling price after discount
  total: z.number().nonnegative(),          // price * quantity
  discountPercent: z.number().nonnegative().default(0),
  amount: z.number().nonnegative(),         // pre-GST amount after line-level discount
  gstPercent: z.number().nonnegative().default(0),
});

export const CreatePharmacyBillSchema = z.object({
  bill: z.object({
    patientName: z.string().min(1),         // required — NOT NULL in DB
    patientId: z.string().nullable().optional(),
    patientPhone: z.string().nullable().optional(),
    gender: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    referredDoctor: z.string().nullable().optional(),
    prescriptionId: z.string().nullable().optional(),
    discountPercent: z.number().nonnegative().default(0),
    roundOff: z.number().default(0),
    paymentMode: z.string().default('CASH'),
    paidAmount: z.number().nonnegative().default(0),
    paymentRef: z.string().nullable().optional(),
  }),
  items: z.array(BillItemSchema).min(1),
});

// ─── Query schemas ─────────────────────────────────────────────────────────────

export const StockSearchQuerySchema = z.object({
  q: z.string().min(1, 'q is required'),
});

export const PharmacyBillListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(50),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  status: z.string().optional(),
  search: z.string().optional(),
});
