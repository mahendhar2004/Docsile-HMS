import { z } from 'zod';

// ─── OpticalProduct ──────────────────────────────────────────────────────────
// Matches CREATE TABLE "OpticalProduct" exactly.
// DB uses "isActive" (soft-delete) — scaffold had wrong field "isDeleted".
// DB column "category" is TEXT NOT NULL — required on create, omittable on PATCH.

export const OpticalProductSchema = z.object({
  name: z.string().min(1),
  brand: z.string().nullable().optional(),
  category: z.string().min(1),
  type: z.string().nullable().optional(),
  material: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  size: z.string().nullable().optional(),
  coating: z.string().nullable().optional(),
  index: z.string().nullable().optional(),
  modelNumber: z.string().nullable().optional(),
  hsnCode: z.string().nullable().optional(),
  gstPercent: z.number().nonnegative().optional(),
  isActive: z.boolean().optional(),
});
export type OpticalProduct = z.infer<typeof OpticalProductSchema>;

// ─── OpticalStock ────────────────────────────────────────────────────────────
// Matches CREATE TABLE "OpticalStock" exactly.
// DB column is "batchNumber" — scaffold had wrong field "batch".
// UNIQUE constraint: (productId, batchNumber, power) — drives upsert logic.

export const OpticalStockSchema = z.object({
  productId: z.string().min(1),
  batchNumber: z.string().nullable().optional(),
  quantity: z.number().int().nonnegative(),
  mrp: z.number().nonnegative().optional(),
  costPrice: z.number().nonnegative().optional(),
  gstPercent: z.number().nonnegative().optional(),
  power: z.string().nullable().optional(),
  supplierId: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});
export type OpticalStock = z.infer<typeof OpticalStockSchema>;

// ─── OpticalBillItem ─────────────────────────────────────────────────────────
// Matches CREATE TABLE "OpticalBillItem" exactly.
// DB column is "itemName" — scaffold had wrong field "name".
// OpticalBillItem has NO hospital_id (pure child table — ADR-007 exclusion list).

export const OpticalBillItemSchema = z.object({
  stockId: z.string().nullable().optional(),
  itemName: z.string().min(1),
  category: z.string().min(1),
  eye: z.string().nullable().optional(),
  quantity: z.number().int().positive(),
  mrp: z.number().nonnegative().optional(),
  price: z.number().nonnegative(),
  total: z.number().nonnegative(),
  discountPercent: z.number().nonnegative().optional(),
  amount: z.number().nonnegative(),
  gstPercent: z.number().nonnegative().optional(),
});
export type OpticalBillItem = z.infer<typeof OpticalBillItemSchema>;

// ─── CreateOpticalBill ───────────────────────────────────────────────────────
// Input for POST /optical/bills. Matches createOpticalBill in old actions.ts.
// patientId is optional — walk-in (cash) sales omit it.

export const CreateOpticalBillSchema = z.object({
  patientName: z.string().min(1),
  patientId: z.string().nullable().optional(),
  patientPhone: z.string().nullable().optional(),
  gender: z.string().nullable().optional(),
  referredDoctor: z.string().nullable().optional(),
  prescriptionId: z.string().nullable().optional(),
  lensPrescription: z.record(z.unknown()).nullable().optional(),
  discountPercent: z.number().nonnegative().default(0),
  roundOff: z.number().default(0),
  paymentMode: z.string().min(1).default('CASH'),
  paidAmount: z.number().nonnegative(),
  paymentRef: z.string().nullable().optional(),
  deliveryDate: z.string().nullable().optional(),
  orderNotes: z.string().nullable().optional(),
  status: z.string().optional(),
  items: z.array(OpticalBillItemSchema).min(1),
});
export type CreateOpticalBill = z.infer<typeof CreateOpticalBillSchema>;

// ─── UpdateBillStatus ────────────────────────────────────────────────────────

export const UpdateBillStatusSchema = z.object({
  status: z.string().min(1),
});

// ─── OpticalBillListQuery ────────────────────────────────────────────────────
// Supports date (single day), dateFrom/dateTo (range), search, status filters.

export const OpticalBillListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(50),
  date: z.string().date().optional(),
  dateFrom: z.string().date().optional(),
  dateTo: z.string().date().optional(),
  search: z.string().optional(),
  status: z.string().optional(),
});
export type OpticalBillListQuery = z.infer<typeof OpticalBillListQuerySchema>;

// ─── StockSearchQuery ─────────────────────────────────────────────────────────

export const StockSearchQuerySchema = z.object({
  q: z.string().min(1),
});

// ─── Response-side types (interfaces, not validated by Zod) ──────────────────

export interface OpticalBillRow {
  id: string;
  billNumber: string;
  patientId: string | null;
  patientName: string;
  patientPhone: string | null;
  gender: string | null;
  referredDoctor: string | null;
  prescriptionId: string | null;
  lensPrescription: string | null;
  billDate: string;
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  gstAmount: number;
  netAmount: number;
  roundOff: number;
  billAmount: number;
  paidAmount: number;
  balanceDue: number;
  paymentMode: string;
  paymentRef: string | null;
  deliveryDate: string | null;
  orderNotes: string | null;
  status: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  items?: OpticalBillItemRow[];
}

export interface OpticalBillItemRow {
  id: string;
  billId: string;
  stockId: string | null;
  itemName: string;
  category: string;
  eye: string | null;
  quantity: number;
  mrp: number;
  price: number;
  total: number;
  discountPercent: number;
  amount: number;
  gstPercent: number;
}

// Alias for old service.ts compatibility
export type OpticalBill = OpticalBillRow;

export interface StockSummary {
  totalItems: number;
  lowStock: number;
}

export interface StockSearchResult {
  stockId: string;
  productId: string;
  name: string;
  brand: string | null;
  category: string;
  type: string | null;
  modelNumber: string | null;
  batchNumber: string | null;
  quantity: number;
  mrp: number;
  gstPercent: number;
  power: string | null;
}

export interface PatientArReading {
  patientId: string;
  name: string;
  age: number | null;
  gender: string | null;
  phone: string | null;
  doctorName: string | null;
  autoRefractometer: unknown | null;
  glassesReading: unknown | null;
  presentPrescription: unknown | null;
  readingDate: string | null;
  prescriptionId: string | null;
}

export interface OpticalSettings {
  printHeaderKey: string;
}
