/**
 * pharmacy/types.ts
 *
 * TypeScript types for the pharmacy module.
 * Cross-referenced against:
 *   - .sde/schemas/openapi.yaml  /pharmacy/* paths
 *   - supabase/functions/pharmacy/types.ts       (Zod schemas — authoritative field names)
 *   - supabase/functions/pharmacy/repository.ts  (select clauses, DB field names)
 *   - src/app/(hospital)/pharmacy/components/InventoryTab.tsx   (enum values, option lists)
 *   - src/app/(hospital)/pharmacy/components/SuppliersTab.tsx   (supplier field names)
 *   - src/app/(hospital)/pharmacy/components/PurchaseOrdersTab.tsx (PO status values)
 *   - src/app/(hospital)/pharmacy/components/BillingTab.tsx      (bill field names, payment modes)
 */

// ─── Medicines ────────────────────────────────────────────────────────────────

/**
 * PharmacyMedicine as returned by GET /pharmacy/medicines.
 * Field names verified against PharmacyMedicineSchema in supabase/functions/pharmacy/types.ts
 * and repository.ts insertMedicine().
 */
export interface PharmacyMedicine {
  id: string
  name: string
  genericName: string | null
  manufacturer: string | null
  composition: string | null
  category: string | null
  dosageForm: string | null
  strength: string | null
  unitOfMeasure: string
  hsnCode: string | null
  gstPercent: number
  scheduleType: string | null
  isActive: boolean
  hospitalId: string
  createdAt: string
  updatedAt: string
}

/**
 * Payload for POST /pharmacy/medicines and PATCH /pharmacy/medicines/{id}.
 * Matches PharmacyMedicineSchema from supabase/functions/pharmacy/types.ts.
 */
export interface MedicineFormValues {
  name: string
  genericName: string
  manufacturer: string
  composition: string
  category: string
  dosageForm: string
  strength: string
  unitOfMeasure: string
  hsnCode: string
  gstPercent: number
  scheduleType: string
}

/**
 * Medicine categories verified against CATEGORIES array in
 * src/app/(hospital)/pharmacy/components/InventoryTab.tsx (lines 164-177).
 */
export const MEDICINE_CATEGORIES = [
  "Tablet",
  "Capsule",
  "Syrup",
  "Injection",
  "Drops",
  "Cream",
  "Ointment",
  "Powder",
  "Inhaler",
  "Surgical",
  "Consumable",
  "Other",
] as const

/**
 * Unit of measure options verified against unitOfMeasure Select in
 * src/app/(hospital)/pharmacy/components/InventoryTab.tsx (lines 707-723).
 */
export const UNIT_OF_MEASURE_OPTIONS = [
  "Nos",
  "Strip",
  "Bottle",
  "Box",
  "Vial",
  "Tube",
  "Sachet",
] as const

/**
 * Schedule type options verified against scheduleType Select in
 * src/app/(hospital)/pharmacy/components/InventoryTab.tsx (lines 733-743).
 */
export const SCHEDULE_TYPE_OPTIONS = ["OTC", "H", "H1", "X"] as const

// ─── Stock ────────────────────────────────────────────────────────────────────

/**
 * PharmacyStock as returned by GET /pharmacy/stock.
 * Includes nested medicine and supplier joins from repository.ts findAllStock():
 *   .select('*, medicine:PharmacyMedicine(name, genericName, manufacturer, category, gstPercent, unitOfMeasure), supplier:PharmacySupplier(name)')
 *
 * Field names verified against PharmacyStockSchema in supabase/functions/pharmacy/types.ts:
 *   mrp, costPrice (NOT purchasePrice/sellingPrice per the correction note in types.ts line 45-46).
 */
export interface PharmacyStockItem {
  id: string
  medicineId: string
  batchNumber: string
  quantity: number
  mrp: number
  costPrice: number
  gstPercent: number
  unitsPerPack: number
  expiryDate: string
  manufacturingDate: string | null
  supplierId: string | null
  purchaseOrderId: string | null
  hospitalId: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  /** Joined from PharmacyMedicine */
  medicine: {
    name: string
    genericName: string | null
    manufacturer: string | null
    category: string | null
    gstPercent: number
    unitOfMeasure: string
  }
  /** Joined from PharmacySupplier (nullable when no supplier) */
  supplier: { name: string } | null
}

/**
 * Stock summary returned by GET /pharmacy/stock/summary.
 * Field names verified against repository.ts getStockSummaryCountsAndValue() (lines 276-336).
 */
export interface StockSummary {
  totalItems: number
  lowStock: number
  nearExpiry: number
  expired: number
  stockValue: number
}

/**
 * Payload for POST /pharmacy/stock (add new stock entry).
 * Matches PharmacyStockSchema from supabase/functions/pharmacy/types.ts.
 * The UI uses packs/packSize and computes quantity/mrp/costPrice client-side
 * (verified in InventoryTab.tsx lines 363-398).
 */
export interface AddStockBody {
  medicineId: string
  batchNumber: string
  quantity: number
  mrp: number
  costPrice: number
  gstPercent: number
  unitsPerPack: number
  expiryDate: string
  supplierId?: string
}

/**
 * Payload for PATCH /pharmacy/stock/{id}.
 */
export interface UpdateStockBody {
  batchNumber?: string
  quantity?: number
  mrp?: number
  costPrice?: number
  gstPercent?: number
  expiryDate?: string
}

// ─── Suppliers ────────────────────────────────────────────────────────────────

/**
 * PharmacySupplier as returned by GET /pharmacy/suppliers.
 * Field names verified against PharmacySupplierSchema in supabase/functions/pharmacy/types.ts
 * and SuppliersTab.tsx (emptyForm at line 33-36).
 */
export interface PharmacySupplier {
  id: string
  name: string
  contactPerson: string | null
  phone: string | null
  email: string | null
  address: string | null
  gstin: string | null
  drugLicenseNo: string | null
  creditDays: number
  hospitalId: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

/**
 * Payload for POST /pharmacy/suppliers and PATCH /pharmacy/suppliers/{id}.
 */
export interface SupplierFormValues {
  name: string
  contactPerson: string
  phone: string
  email: string
  address: string
  gstin: string
  drugLicenseNo: string
  creditDays: number
}

// ─── Purchase Orders ──────────────────────────────────────────────────────────

/**
 * PurchaseOrderItem as returned nested inside PurchaseOrder.
 * Field names verified against repository.ts insertPurchaseOrderItems() (lines 441-458)
 * and PurchaseOrdersTab.tsx POItemForm type (lines 47-56).
 */
export interface PurchaseOrderItem {
  id: string
  purchaseOrderId: string
  medicineId: string
  batchNumber: string | null
  quantity: number
  receivedQty: number
  costPrice: number
  mrp: number
  gstPercent: number
  expiryDate: string | null
  amount: number
  /** Joined from PharmacyMedicine */
  medicine: { name: string }
}

/**
 * PurchaseOrder as returned by GET /pharmacy/purchase-orders.
 * Includes nested supplier and items joins from repository.ts findAllPurchaseOrders():
 *   .select('*, supplier:PharmacySupplier(name, phone), items:PurchaseOrderItem(*, medicine:PharmacyMedicine(name))')
 *
 * Status enum values verified against UpdatePOStatusSchema in supabase/functions/pharmacy/types.ts
 * AND the STATUS_COLORS map in PurchaseOrdersTab.tsx (lines 58-64):
 *   DRAFT, ORDERED, PARTIALLY_RECEIVED, RECEIVED, CANCELLED
 * NOTE: the openapi.yaml PurchaseOrder schema uses lowercase [pending, received, cancelled]
 * but the DB and service use uppercase (verified against UpdatePOStatusSchema at types.ts line 106).
 */
export interface PurchaseOrder {
  id: string
  orderNumber: string
  supplierId: string
  status: "DRAFT" | "ORDERED" | "PARTIALLY_RECEIVED" | "RECEIVED" | "CANCELLED"
  subtotal: number
  gstAmount: number
  discount: number
  totalAmount: number
  amountPaid: number
  balanceDue: number
  paymentMode: string | null
  invoiceNumber: string | null
  invoiceDate: string | null
  expectedDate: string | null
  notes: string | null
  hospitalId: string
  createdAt: string
  updatedAt: string
  /** Joined from PharmacySupplier */
  supplier: { name: string; phone: string | null }
  /** Joined from PurchaseOrderItem */
  items: PurchaseOrderItem[]
}

/**
 * Payload for POST /pharmacy/purchase-orders.
 * Matches CreatePurchaseOrderSchema from supabase/functions/pharmacy/types.ts (lines 86-89).
 */
export interface CreatePurchaseOrderBody {
  order: {
    supplierId: string
    expectedDate?: string
    invoiceNumber?: string
    invoiceDate?: string
    notes?: string
    discount: number
    paymentMode?: string
    amountPaid: number
  }
  items: Array<{
    medicineId: string
    batchNumber?: string
    quantity: number
    costPrice: number
    mrp: number
    gstPercent: number
    expiryDate?: string
  }>
}

/**
 * Payload for POST /pharmacy/purchase-orders/{id}/receive.
 * Matches ReceivePurchaseOrderSchema from supabase/functions/pharmacy/types.ts (lines 101-103).
 */
export interface ReceivePurchaseOrderBody {
  receivedItems: Array<{
    itemId: string
    receivedQty: number
    batchNumber: string
    expiryDate: string
    mrp: number
    costPrice: number
  }>
}

// ─── Pharmacy Bills ───────────────────────────────────────────────────────────

/**
 * PharmacyBillItem as returned nested inside PharmacyBill.
 * Field names verified against repository.ts insertBillItems() (lines 607-625)
 * and BillingTab.tsx BillItem type (lines 44-53).
 */
export interface PharmacyBillItem {
  id: string
  billId: string
  stockId: string
  medicineName: string
  batchNumber: string
  quantity: number
  mrp: number
  price: number
  total: number
  discountPercent: number
  amount: number
  gstPercent: number
}

/**
 * PharmacyBill as returned by GET /pharmacy/bills.
 * Field names verified against repository.ts insertBill() (lines 568-603)
 * and BillingTab.tsx (buildPharmacyBillHtml usage of bill fields).
 */
export interface PharmacyBill {
  id: string
  billNumber: string
  patientId: string | null
  patientName: string
  patientPhone: string | null
  gender: string | null
  email: string | null
  referredDoctor: string | null
  prescriptionId: string | null
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
  status: string
  billDate: string
  hospitalId: string
  createdAt: string
  updatedAt: string
  /** Joined from PharmacyBillItem */
  items: PharmacyBillItem[]
}

/**
 * Bill item form row used in the billing UI.
 * Verified against BillingTab.tsx BillItem type (lines 44-53).
 */
export interface BillItemRow {
  stockId: string
  medicineName: string
  batchNumber: string
  quantity: number
  mrp: number
  price: number
  total: number
  discountPercent: number
  amount: number
  gstPercent: number
  availableQty: number
}

/**
 * Payload for POST /pharmacy/bills.
 * Matches CreatePharmacyBillSchema from supabase/functions/pharmacy/types.ts (lines 125-141).
 * The bill object is nested under "bill" key, items under "items" key.
 */
export interface CreatePharmacyBillBody {
  bill: {
    patientName: string
    patientId?: string
    patientPhone?: string
    gender?: string
    email?: string
    referredDoctor?: string
    prescriptionId?: string
    discountPercent: number
    roundOff: number
    paymentMode: string
    paidAmount: number
    paymentRef?: string
  }
  items: Array<{
    stockId: string
    medicineName: string
    batchNumber: string
    quantity: number
    mrp: number
    price: number
    total: number
    discountPercent: number
    amount: number
    gstPercent: number
  }>
}

// ─── Medicine stock search (for billing) ─────────────────────────────────────

/**
 * Stock search result from GET /pharmacy/stock/search.
 * Shape verified against repository.ts searchMedicineStock() return mapping (lines 367-380).
 */
export interface MedicineStockSearchResult {
  stockId: string
  medicineId: string
  name: string
  genericName: string | null
  batchNumber: string
  quantity: number
  mrp: number
  gstPercent: number
  expiryDate: string
}

// ─── Pending medicines ────────────────────────────────────────────────────────

/**
 * Pending medicine entry from GET /pharmacy/pending-medicines.
 * Shape inferred from repository.ts findPendingPrescriptions() + service enrichment.
 * Verified against getPendingMedicines usage in BillingTab.tsx (lines 600-622).
 */
export interface PendingMedicinePatient {
  prescriptionId: string
  prescriptionNumber: string
  patientId: string
  patientName: string
  phone: string
  doctorName: string | null
  medicineCount: number
  billCount: number
}

// ─── Patient prescription lookup ──────────────────────────────────────────────

/**
 * Prescription medicine item within a patient prescription.
 * Verified against BillingTab.tsx prescriptionMeds state type (line 272):
 *   { name: string; days?: string; timing?: string; note?: string }
 */
export interface PrescriptionMedicine {
  name: string
  days?: string
  timing?: string
  note?: string
}

/**
 * Patient prescription lookup response from GET /pharmacy/patients/{patientId}/prescription.
 * Verified against repository.ts findPatientByPatientId() + findLatestPrescriptionForPatient()
 * and BillingTab.tsx handlePatientSearch() (lines 330-349).
 */
export interface PatientPrescriptionResponse {
  patient: {
    patientId: string
    name: string
    age: number | null
    gender: string | null
    phone: string
    email: string | null
    doctorName: string | null
  }
  prescription: {
    id: string
    prescriptionNumber: string
    medicines: PrescriptionMedicine[]
    doctorName: string | null
    prescriptionDate: string
  } | null
}

// ─── Payment mode options ─────────────────────────────────────────────────────

/**
 * Payment modes for pharmacy billing.
 * Verified against BillingTab.tsx paymentMode Select options (lines 876-882):
 * CASH, CARD, UPI, CREDIT (uppercase internal values).
 * Note: these differ from billing module's payment modes (Cash, UPI, etc. titlecase)
 * because pharmacy billing uses uppercase DB values per the Select options in BillingTab.tsx.
 */
export const PHARMACY_PAYMENT_MODES = [
  { value: "CASH", label: "Cash" },
  { value: "CARD", label: "Card" },
  { value: "UPI", label: "UPI" },
  { value: "CREDIT", label: "Credit" },
] as const
