/**
 * optical/types.ts
 *
 * TypeScript types for the Optical module.
 * Cross-referenced against:
 *   - .sde/schemas/openapi.yaml             /optical/* paths
 *   - supabase/functions/optical/types.ts   (Zod schemas + response interfaces)
 *   - supabase/functions/optical/repository.ts (field names / select clauses)
 *   - src/app/(hospital)/optical/components/InventoryTab.tsx  (product enums)
 *   - src/app/(hospital)/optical/components/BillingTab.tsx    (bill enums, payment modes)
 */

// ─── Product CRUD (/optical/products) ─────────────────────────────────────────
// Field names from supabase/functions/optical/types.ts OpticalProductSchema.

export interface OpticalProduct {
  id: string
  name: string
  brand: string | null
  category: string
  type: string | null
  material: string | null
  color: string | null
  size: string | null
  coating: string | null
  index: string | null
  modelNumber: string | null
  hsnCode: string | null
  gstPercent: number
  isActive: boolean
}

export interface CreateOpticalProductBody {
  name: string
  brand?: string | null
  category: string
  type?: string | null
  material?: string | null
  color?: string | null
  size?: string | null
  coating?: string | null
  index?: string | null
  modelNumber?: string | null
  hsnCode?: string | null
  gstPercent?: number
}

export type UpdateOpticalProductBody = Partial<CreateOpticalProductBody>

// ─── Stock (/optical/stock, /optical/stock/summary, /optical/stock/search) ───
// Field names from supabase/functions/optical/types.ts OpticalStockSchema +
// repository.ts listStock() which joins `product:OpticalProduct(*)`.

export interface OpticalStockEntry {
  id: string
  productId: string
  batchNumber: string | null
  quantity: number
  mrp: number
  costPrice: number
  gstPercent: number
  power: string | null
  isActive: boolean
  /** Nested from OpticalProduct via Supabase join */
  product: {
    id: string
    name: string
    brand: string | null
    category: string
    type: string | null
    modelNumber: string | null
  }
}

export interface CreateOpticalStockBody {
  productId: string
  batchNumber?: string | null
  quantity: number
  mrp?: number
  costPrice?: number
  gstPercent?: number
  power?: string | null
}

export interface UpdateOpticalStockBody {
  quantity?: number
  mrp?: number
  costPrice?: number
}

/** GET /optical/stock/summary response */
export interface StockSummary {
  totalItems: number
  lowStock: number
}

/** GET /optical/stock/search?q=... response items */
export interface StockSearchResult {
  stockId: string
  productId: string
  name: string
  brand: string | null
  category: string
  type: string | null
  modelNumber: string | null
  batchNumber: string | null
  quantity: number
  mrp: number
  gstPercent: number
  power: string | null
}

// ─── Optical Bills (/optical/bills) ──────────────────────────────────────────
// Field names from supabase/functions/optical/types.ts OpticalBillRow interface.

export interface OpticalBillRow {
  id: string
  billNumber: string
  patientId: string | null
  patientName: string
  patientPhone: string | null
  gender: string | null
  referredDoctor: string | null
  prescriptionId: string | null
  lensPrescription: string | null
  billDate: string
  subtotal: number
  discountPercent: number
  discountAmount: number
  gstAmount: number
  netAmount: number
  roundOff: number
  billAmount: number
  paidAmount: number
  balanceDue: number
  paymentMode: string
  paymentRef: string | null
  deliveryDate: string | null
  orderNotes: string | null
  status: string
  createdBy: string
  createdAt: string
  updatedAt: string
  items?: OpticalBillItemRow[]
}

export interface OpticalBillItemRow {
  id: string
  billId: string
  stockId: string | null
  itemName: string
  category: string
  eye: string | null
  quantity: number
  mrp: number
  price: number
  total: number
  discountPercent: number
  amount: number
  gstPercent: number
}

// ─── POST /optical/bills request body ─────────────────────────────────────────
// From supabase/functions/optical/types.ts CreateOpticalBillSchema.

export interface CreateOpticalBillItemBody {
  stockId?: string | null
  itemName: string
  category: string
  eye?: string | null
  quantity: number
  mrp?: number
  price: number
  total: number
  discountPercent?: number
  amount: number
  gstPercent?: number
  availableQty?: number // UI-only, not sent to API
}

export interface CreateOpticalBillBody {
  patientName: string
  patientId?: string | null
  patientPhone?: string | null
  gender?: string | null
  referredDoctor?: string | null
  prescriptionId?: string | null
  lensPrescription?: Record<string, unknown> | null
  discountPercent?: number
  roundOff?: number
  paymentMode: string
  paidAmount: number
  paymentRef?: string | null
  deliveryDate?: string | null
  orderNotes?: string | null
  status?: string
  items: CreateOpticalBillItemBody[]
}

// ─── PATCH /optical/bills/{id}/status ────────────────────────────────────────

export interface UpdateBillStatusBody {
  status: string
}

// ─── GET /optical/patients/{id}/ar-reading ───────────────────────────────────
// From supabase/functions/optical/types.ts PatientArReading interface.

export interface PatientArReading {
  patientId: string
  name: string
  age: number | null
  gender: string | null
  phone: string | null
  doctorName: string | null
  /** JSON-encoded ARSection — same shape Workup module writes */
  autoRefractometer: unknown | null
  /** JSON-encoded glasses reading */
  glassesReading: unknown | null
  /** JSON-encoded SRSection (present prescription) */
  presentPrescription: unknown | null
  readingDate: string | null
  prescriptionId: string | null
}

// ─── GET /optical/settings ───────────────────────────────────────────────────
// From supabase/functions/optical/types.ts OpticalSettings interface.

export interface OpticalSettings {
  printHeaderKey: string
}

// ─── GET /optical/hospital-profile ───────────────────────────────────────────
// Repository getHospitalProfile() returns full HospitalProfile row.

export interface HospitalProfile {
  id: string
  name: string
  displayName: string | null
  address: string | null
  phone: string | null
  email: string | null
  logoUrl: string | null
}

// ─── Enum / option lists ──────────────────────────────────────────────────────
// All verified against src/app/(hospital)/optical/components/InventoryTab.tsx.

/** Product categories — from InventoryTab.tsx CATEGORIES constant. */
export const OPTICAL_CATEGORIES = [
  "Frame",
  "Lens",
  "Contact Lens",
  "Accessory",
  "Solution",
  "Sunglasses",
] as const
export type OpticalCategory = (typeof OPTICAL_CATEGORIES)[number]

/** Frame types — from InventoryTab.tsx FRAME_TYPES constant. */
export const FRAME_TYPES = ["Full Rim", "Half Rim", "Rimless", "Wrap"] as const

/** Frame materials — from InventoryTab.tsx FRAME_MATERIALS constant. */
export const FRAME_MATERIALS = [
  "Metal",
  "Plastic",
  "TR-90",
  "Titanium",
  "Acetate",
  "Memory Metal",
] as const

/** Lens types — from InventoryTab.tsx LENS_TYPES constant. */
export const LENS_TYPES = [
  "Single Vision",
  "Bifocal",
  "Progressive",
  "Photochromic",
  "Tinted",
] as const

/** Lens materials — from InventoryTab.tsx LENS_MATERIALS constant. */
export const LENS_MATERIALS = [
  "CR-39",
  "Polycarbonate",
  "Glass",
  "Trivex",
  "Hi-Index",
] as const

/** Lens coatings — from InventoryTab.tsx LENS_COATINGS constant. */
export const LENS_COATINGS = [
  "Anti-Reflection",
  "Blue Cut",
  "Photochromic",
  "Hardcoat",
  "Mirror",
] as const

/** Lens indices — from InventoryTab.tsx LENS_INDICES constant. */
export const LENS_INDICES = ["1.5", "1.56", "1.6", "1.67", "1.74"] as const

/** Contact lens types — from InventoryTab.tsx CL_TYPES constant. */
export const CL_TYPES = [
  "Daily",
  "Monthly",
  "Yearly",
  "Toric",
  "Multifocal",
] as const

/**
 * Payment modes for optical bills.
 * From src/app/(hospital)/optical/components/BillingTab.tsx PAYMENT_MODES constant (line 101).
 * NOTE: This is DIFFERENT from the billing module's list — optical uses CASH (uppercase),
 * includes Credit, and uses NEFT. Do not substitute the billing module's list here.
 */
export const OPTICAL_PAYMENT_MODES = ["CASH", "UPI", "Card", "NEFT", "Credit"] as const

/**
 * Optical bill statuses.
 * From src/app/(hospital)/optical/components/BillingTab.tsx (lines 660–663)
 * and actions.ts (default status = "COMPLETED").
 */
export const OPTICAL_BILL_STATUSES = [
  "COMPLETED",
  "ORDERED",
  "READY",
  "CANCELLED",
] as const

/** Helpers for SingleSelect */
export const OPTICAL_CATEGORY_OPTIONS = OPTICAL_CATEGORIES.map((c) => ({
  value: c,
  label: c,
}))
export const OPTICAL_PAYMENT_MODE_OPTIONS = OPTICAL_PAYMENT_MODES.map((m) => ({
  value: m,
  label: m,
}))
export const OPTICAL_BILL_STATUS_OPTIONS = OPTICAL_BILL_STATUSES.map((s) => ({
  value: s,
  label: s,
}))
