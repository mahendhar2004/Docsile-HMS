/**
 * Mock fixture data for the Pharmacy module.
 * All arrays are module-level `let` so handlers can mutate them in-memory.
 */

import type {
  PharmacyMedicine,
  PharmacyStockItem,
  StockSummary,
  PharmacySupplier,
  PurchaseOrder,
  PharmacyBill,
  PendingMedicinePatient,
  PatientPrescriptionResponse,
  MedicineStockSearchResult,
} from "@/pages/pharmacy/types"

const HOSPITAL_ID = "mock-hospital-id"

let _seq = 1
export function uid(prefix = "p"): string {
  return `${prefix}-${String(_seq++).padStart(4, "0")}`
}

export function nowIso(): string {
  return new Date().toISOString()
}

// ─── Medicines ─────────────────────────────────────────────────────────────────

export let medicines: PharmacyMedicine[] = [
  {
    id: "med-001", name: "Ciprofloxacin 500mg", genericName: "Ciprofloxacin",
    manufacturer: "Cipla Ltd", composition: "Ciprofloxacin 500mg", category: "Tablet",
    dosageForm: "Tablet", strength: "500mg", unitOfMeasure: "Strip", hsnCode: "30042099",
    gstPercent: 12, scheduleType: "H", isActive: true, hospitalId: HOSPITAL_ID,
    createdAt: "2026-01-10T08:00:00Z", updatedAt: "2026-01-10T08:00:00Z",
  },
  {
    id: "med-002", name: "Amoxicillin 250mg", genericName: "Amoxicillin",
    manufacturer: "Sun Pharma", composition: "Amoxicillin Trihydrate 250mg", category: "Capsule",
    dosageForm: "Capsule", strength: "250mg", unitOfMeasure: "Strip", hsnCode: "30041099",
    gstPercent: 12, scheduleType: "H", isActive: true, hospitalId: HOSPITAL_ID,
    createdAt: "2026-01-10T08:00:00Z", updatedAt: "2026-01-10T08:00:00Z",
  },
  {
    id: "med-003", name: "Paracetamol 500mg", genericName: "Paracetamol",
    manufacturer: "Dr Reddy's", composition: "Paracetamol 500mg", category: "Tablet",
    dosageForm: "Tablet", strength: "500mg", unitOfMeasure: "Strip", hsnCode: "30049099",
    gstPercent: 5, scheduleType: "OTC", isActive: true, hospitalId: HOSPITAL_ID,
    createdAt: "2026-01-11T08:00:00Z", updatedAt: "2026-01-11T08:00:00Z",
  },
  {
    id: "med-004", name: "Timolol 0.5% Eye Drops", genericName: "Timolol Maleate",
    manufacturer: "Allergan India", composition: "Timolol Maleate 0.5% w/v", category: "Drops",
    dosageForm: "Drops", strength: "0.5%", unitOfMeasure: "Bottle", hsnCode: "30049099",
    gstPercent: 12, scheduleType: "H", isActive: true, hospitalId: HOSPITAL_ID,
    createdAt: "2026-01-12T08:00:00Z", updatedAt: "2026-01-12T08:00:00Z",
  },
  {
    id: "med-005", name: "Prednisolone 5mg", genericName: "Prednisolone",
    manufacturer: "Cadila Pharma", composition: "Prednisolone 5mg", category: "Tablet",
    dosageForm: "Tablet", strength: "5mg", unitOfMeasure: "Strip", hsnCode: "30039099",
    gstPercent: 12, scheduleType: "H1", isActive: true, hospitalId: HOSPITAL_ID,
    createdAt: "2026-01-13T08:00:00Z", updatedAt: "2026-01-13T08:00:00Z",
  },
  {
    id: "med-006", name: "Latanoprost 0.005% Eye Drops", genericName: "Latanoprost",
    manufacturer: "Cipla Ltd", composition: "Latanoprost 0.005% w/v", category: "Drops",
    dosageForm: "Drops", strength: "0.005%", unitOfMeasure: "Bottle", hsnCode: "30049099",
    gstPercent: 12, scheduleType: "H", isActive: true, hospitalId: HOSPITAL_ID,
    createdAt: "2026-02-01T08:00:00Z", updatedAt: "2026-02-01T08:00:00Z",
  },
  {
    id: "med-007", name: "Azithromycin 500mg", genericName: "Azithromycin",
    manufacturer: "Lupin Ltd", composition: "Azithromycin 500mg", category: "Tablet",
    dosageForm: "Tablet", strength: "500mg", unitOfMeasure: "Strip", hsnCode: "30041099",
    gstPercent: 12, scheduleType: "H", isActive: true, hospitalId: HOSPITAL_ID,
    createdAt: "2026-02-05T08:00:00Z", updatedAt: "2026-02-05T08:00:00Z",
  },
  {
    id: "med-008", name: "Ofloxacin 0.3% Eye Drops", genericName: "Ofloxacin",
    manufacturer: "Sun Pharma", composition: "Ofloxacin 0.3% w/v", category: "Drops",
    dosageForm: "Drops", strength: "0.3%", unitOfMeasure: "Bottle", hsnCode: "30049099",
    gstPercent: 12, scheduleType: "H", isActive: true, hospitalId: HOSPITAL_ID,
    createdAt: "2026-02-10T08:00:00Z", updatedAt: "2026-02-10T08:00:00Z",
  },
]

// ─── Suppliers ─────────────────────────────────────────────────────────────────

export let suppliers: PharmacySupplier[] = [
  {
    id: "sup-001", name: "MedEx Distributors Pvt Ltd",
    contactPerson: "Ramesh Sharma", phone: "+919876543210", email: "ramesh@medex.in",
    address: "Plot 12, Industrial Area, Hyderabad - 500016", gstin: "36AADCM1234A1ZQ",
    drugLicenseNo: "DL/HYD/2021/1234", creditDays: 30,
    hospitalId: HOSPITAL_ID, isActive: true, createdAt: "2026-01-05T08:00:00Z", updatedAt: "2026-01-05T08:00:00Z",
  },
  {
    id: "sup-002", name: "Bharat Pharma Supplies",
    contactPerson: "Sita Devi", phone: "+919012345678", email: "sita@bharatpharma.co.in",
    address: "Shop 7, Gandhi Nagar, Hyderabad - 500080", gstin: "36BBBCP5678B2ZR",
    drugLicenseNo: "DL/HYD/2019/5678", creditDays: 15,
    hospitalId: HOSPITAL_ID, isActive: true, createdAt: "2026-01-06T08:00:00Z", updatedAt: "2026-01-06T08:00:00Z",
  },
  {
    id: "sup-003", name: "Apollo Pharma Wholesale",
    contactPerson: "Arjun Reddy", phone: "+917890123456", email: "arjun@apollopharma.in",
    address: "No 45, Secunderabad - 500003", gstin: "36CCCAQ9012C3ZS",
    drugLicenseNo: "DL/SCB/2020/9012", creditDays: 45,
    hospitalId: HOSPITAL_ID, isActive: true, createdAt: "2026-01-07T08:00:00Z", updatedAt: "2026-01-07T08:00:00Z",
  },
  {
    id: "sup-004", name: "Venkateswara Drug Agency",
    contactPerson: "Lakshmi Prasad", phone: "+918765432109", email: null,
    address: "Near Bus Stand, Mehdipatnam, Hyderabad", gstin: null,
    drugLicenseNo: "DL/HYD/2022/3456", creditDays: 7,
    hospitalId: HOSPITAL_ID, isActive: true, createdAt: "2026-01-08T08:00:00Z", updatedAt: "2026-01-08T08:00:00Z",
  },
  {
    id: "sup-005", name: "Indus Pharma Corporation",
    contactPerson: "Mohammed Farhan", phone: "+916543210987", email: "farhan@induspharma.in",
    address: "Unit 3, Pharma City, Shamshabad", gstin: "36DDDIP3456D4ZT",
    drugLicenseNo: "DL/RR/2021/7890", creditDays: 30,
    hospitalId: HOSPITAL_ID, isActive: true, createdAt: "2026-01-09T08:00:00Z", updatedAt: "2026-01-09T08:00:00Z",
  },
]

// ─── Stock ─────────────────────────────────────────────────────────────────────

export let stock: PharmacyStockItem[] = [
  {
    id: "stk-001", medicineId: "med-001", batchNumber: "BN2026001", quantity: 200,
    mrp: 98, costPrice: 72, gstPercent: 12, unitsPerPack: 10, expiryDate: "2028-03-31",
    manufacturingDate: "2026-03-01", supplierId: "sup-001", purchaseOrderId: "po-001",
    hospitalId: HOSPITAL_ID, isActive: true, createdAt: "2026-03-15T08:00:00Z", updatedAt: "2026-03-15T08:00:00Z",
    medicine: { name: "Ciprofloxacin 500mg", genericName: "Ciprofloxacin", manufacturer: "Cipla Ltd", category: "Tablet", gstPercent: 12, unitOfMeasure: "Strip" },
    supplier: { name: "MedEx Distributors Pvt Ltd" },
  },
  {
    id: "stk-002", medicineId: "med-002", batchNumber: "BN2026002", quantity: 150,
    mrp: 45, costPrice: 32, gstPercent: 12, unitsPerPack: 10, expiryDate: "2028-06-30",
    manufacturingDate: "2026-06-01", supplierId: "sup-002", purchaseOrderId: null,
    hospitalId: HOSPITAL_ID, isActive: true, createdAt: "2026-04-10T08:00:00Z", updatedAt: "2026-04-10T08:00:00Z",
    medicine: { name: "Amoxicillin 250mg", genericName: "Amoxicillin", manufacturer: "Sun Pharma", category: "Capsule", gstPercent: 12, unitOfMeasure: "Strip" },
    supplier: { name: "Bharat Pharma Supplies" },
  },
  {
    id: "stk-003", medicineId: "med-003", batchNumber: "BN2026003", quantity: 500,
    mrp: 15, costPrice: 9, gstPercent: 5, unitsPerPack: 15, expiryDate: "2028-12-31",
    manufacturingDate: "2026-12-01", supplierId: "sup-001", purchaseOrderId: null,
    hospitalId: HOSPITAL_ID, isActive: true, createdAt: "2026-05-01T08:00:00Z", updatedAt: "2026-05-01T08:00:00Z",
    medicine: { name: "Paracetamol 500mg", genericName: "Paracetamol", manufacturer: "Dr Reddy's", category: "Tablet", gstPercent: 5, unitOfMeasure: "Strip" },
    supplier: { name: "MedEx Distributors Pvt Ltd" },
  },
  {
    id: "stk-004", medicineId: "med-004", batchNumber: "BN2026004", quantity: 8,
    mrp: 250, costPrice: 180, gstPercent: 12, unitsPerPack: 1, expiryDate: "2027-09-30",
    manufacturingDate: "2025-09-01", supplierId: "sup-003", purchaseOrderId: "po-002",
    hospitalId: HOSPITAL_ID, isActive: true, createdAt: "2026-06-15T08:00:00Z", updatedAt: "2026-06-15T08:00:00Z",
    medicine: { name: "Timolol 0.5% Eye Drops", genericName: "Timolol Maleate", manufacturer: "Allergan India", category: "Drops", gstPercent: 12, unitOfMeasure: "Bottle" },
    supplier: { name: "Apollo Pharma Wholesale" },
  },
  {
    id: "stk-005", medicineId: "med-005", batchNumber: "BN2026005", quantity: 300,
    mrp: 28, costPrice: 20, gstPercent: 12, unitsPerPack: 10, expiryDate: "2027-06-30",
    manufacturingDate: "2025-06-01", supplierId: "sup-002", purchaseOrderId: null,
    hospitalId: HOSPITAL_ID, isActive: true, createdAt: "2026-07-01T08:00:00Z", updatedAt: "2026-07-01T08:00:00Z",
    medicine: { name: "Prednisolone 5mg", genericName: "Prednisolone", manufacturer: "Cadila Pharma", category: "Tablet", gstPercent: 12, unitOfMeasure: "Strip" },
    supplier: { name: "Bharat Pharma Supplies" },
  },
  {
    id: "stk-006", medicineId: "med-006", batchNumber: "BN2026006", quantity: 5,
    mrp: 380, costPrice: 290, gstPercent: 12, unitsPerPack: 1, expiryDate: "2027-12-31",
    manufacturingDate: "2025-12-01", supplierId: "sup-001", purchaseOrderId: "po-001",
    hospitalId: HOSPITAL_ID, isActive: true, createdAt: "2026-08-01T08:00:00Z", updatedAt: "2026-08-01T08:00:00Z",
    medicine: { name: "Latanoprost 0.005% Eye Drops", genericName: "Latanoprost", manufacturer: "Cipla Ltd", category: "Drops", gstPercent: 12, unitOfMeasure: "Bottle" },
    supplier: { name: "MedEx Distributors Pvt Ltd" },
  },
  {
    id: "stk-007", medicineId: "med-007", batchNumber: "BN2026007", quantity: 120,
    mrp: 135, costPrice: 98, gstPercent: 12, unitsPerPack: 3, expiryDate: "2028-04-30",
    manufacturingDate: "2026-04-01", supplierId: "sup-004", purchaseOrderId: null,
    hospitalId: HOSPITAL_ID, isActive: true, createdAt: "2026-09-01T08:00:00Z", updatedAt: "2026-09-01T08:00:00Z",
    medicine: { name: "Azithromycin 500mg", genericName: "Azithromycin", manufacturer: "Lupin Ltd", category: "Tablet", gstPercent: 12, unitOfMeasure: "Strip" },
    supplier: { name: "Venkateswara Drug Agency" },
  },
  {
    id: "stk-008", medicineId: "med-008", batchNumber: "BN2026008", quantity: 45,
    mrp: 58, costPrice: 40, gstPercent: 12, unitsPerPack: 1, expiryDate: "2027-08-31",
    manufacturingDate: "2025-08-01", supplierId: "sup-005", purchaseOrderId: null,
    hospitalId: HOSPITAL_ID, isActive: true, createdAt: "2026-09-10T08:00:00Z", updatedAt: "2026-09-10T08:00:00Z",
    medicine: { name: "Ofloxacin 0.3% Eye Drops", genericName: "Ofloxacin", manufacturer: "Sun Pharma", category: "Drops", gstPercent: 12, unitOfMeasure: "Bottle" },
    supplier: { name: "Indus Pharma Corporation" },
  },
]

export function getStockSummary(): StockSummary {
  // Matches main's actions.ts getStockSummary exactly: all five metrics are
  // scoped to isActive + quantity > 0, and "near expiry" is a 3-month
  // window (not 30 days — that was a mismatch with the client-side
  // "Near Expiry" filter chip, which has always used 3 months).
  const inStock = stock.filter((s) => s.isActive && s.quantity > 0)
  const total = inStock.length
  const lowStock = inStock.filter((s) => s.quantity <= 10).length
  const now = new Date()
  const threeMonths = new Date()
  threeMonths.setMonth(threeMonths.getMonth() + 3)
  const nearExpiry = inStock.filter((s) => {
    const exp = new Date(s.expiryDate)
    return exp > now && exp <= threeMonths
  }).length
  const expired = inStock.filter((s) => new Date(s.expiryDate) <= now).length
  const stockValue = inStock.reduce((acc, s) => acc + s.quantity * s.mrp, 0)
  return { totalItems: total, lowStock, nearExpiry, expired, stockValue }
}

export function searchStock(q: string): MedicineStockSearchResult[] {
  const lower = q.toLowerCase()
  return stock
    .filter((s) => s.isActive && s.medicine.name.toLowerCase().includes(lower))
    .map((s) => ({
      stockId: s.id,
      medicineId: s.medicineId,
      name: s.medicine.name,
      genericName: s.medicine.genericName,
      batchNumber: s.batchNumber,
      quantity: s.quantity,
      mrp: s.mrp,
      gstPercent: s.gstPercent,
      expiryDate: s.expiryDate,
    }))
}

// ─── Purchase Orders ───────────────────────────────────────────────────────────

export let purchaseOrders: PurchaseOrder[] = [
  {
    id: "po-001", orderNumber: "PO-2026-001", supplierId: "sup-001",
    status: "RECEIVED", subtotal: 8000, gstAmount: 960, discount: 0,
    totalAmount: 8960, amountPaid: 8960, balanceDue: 0, paymentMode: "NEFT",
    invoiceNumber: "INV/MX/2026/1001", invoiceDate: "2026-03-10",
    expectedDate: "2026-03-14", notes: null, hospitalId: HOSPITAL_ID,
    createdAt: "2026-03-08T09:00:00Z", updatedAt: "2026-03-15T10:00:00Z",
    supplier: { name: "MedEx Distributors Pvt Ltd", phone: "+919876543210" },
    items: [
      { id: "poi-001", purchaseOrderId: "po-001", medicineId: "med-001", batchNumber: "BN2026001", quantity: 100, receivedQty: 100, costPrice: 72, mrp: 98, gstPercent: 12, expiryDate: "2028-03-31", amount: 7200, medicine: { name: "Ciprofloxacin 500mg" } },
      { id: "poi-002", purchaseOrderId: "po-001", medicineId: "med-006", batchNumber: "BN2026006", quantity: 1, receivedQty: 1, costPrice: 290, mrp: 380, gstPercent: 12, expiryDate: "2027-12-31", amount: 800, medicine: { name: "Latanoprost 0.005% Eye Drops" } },
    ],
  },
  {
    id: "po-002", orderNumber: "PO-2026-002", supplierId: "sup-003",
    status: "ORDERED", subtotal: 5400, gstAmount: 648, discount: 0,
    totalAmount: 6048, amountPaid: 0, balanceDue: 6048, paymentMode: null,
    invoiceNumber: null, invoiceDate: null,
    expectedDate: "2026-09-28", notes: "Urgent — running low on eye drops",
    hospitalId: HOSPITAL_ID,
    createdAt: "2026-09-20T09:00:00Z", updatedAt: "2026-09-20T09:00:00Z",
    supplier: { name: "Apollo Pharma Wholesale", phone: "+917890123456" },
    items: [
      { id: "poi-003", purchaseOrderId: "po-002", medicineId: "med-004", batchNumber: null, quantity: 30, receivedQty: 0, costPrice: 180, mrp: 250, gstPercent: 12, expiryDate: null, amount: 5400, medicine: { name: "Timolol 0.5% Eye Drops" } },
    ],
  },
  {
    id: "po-003", orderNumber: "PO-2026-003", supplierId: "sup-002",
    status: "DRAFT", subtotal: 3200, gstAmount: 384, discount: 200,
    totalAmount: 3384, amountPaid: 0, balanceDue: 3384, paymentMode: null,
    invoiceNumber: null, invoiceDate: null, expectedDate: null, notes: null,
    hospitalId: HOSPITAL_ID,
    createdAt: "2026-09-21T10:00:00Z", updatedAt: "2026-09-21T10:00:00Z",
    supplier: { name: "Bharat Pharma Supplies", phone: "+919012345678" },
    items: [
      { id: "poi-004", purchaseOrderId: "po-003", medicineId: "med-002", batchNumber: null, quantity: 100, receivedQty: 0, costPrice: 32, mrp: 45, gstPercent: 12, expiryDate: null, amount: 3200, medicine: { name: "Amoxicillin 250mg" } },
    ],
  },
  {
    id: "po-004", orderNumber: "PO-2026-004", supplierId: "sup-001",
    status: "PARTIALLY_RECEIVED", subtotal: 4500, gstAmount: 225, discount: 0,
    totalAmount: 4725, amountPaid: 2000, balanceDue: 2725, paymentMode: "CASH",
    invoiceNumber: "INV/MX/2026/0899", invoiceDate: "2026-08-20",
    expectedDate: "2026-08-25", notes: null, hospitalId: HOSPITAL_ID,
    createdAt: "2026-08-18T09:00:00Z", updatedAt: "2026-09-01T09:00:00Z",
    supplier: { name: "MedEx Distributors Pvt Ltd", phone: "+919876543210" },
    items: [
      { id: "poi-005", purchaseOrderId: "po-004", medicineId: "med-003", batchNumber: "BN2026003", quantity: 500, receivedQty: 300, costPrice: 9, mrp: 15, gstPercent: 5, expiryDate: "2028-12-31", amount: 4500, medicine: { name: "Paracetamol 500mg" } },
    ],
  },
  {
    id: "po-005", orderNumber: "PO-2026-005", supplierId: "sup-004",
    status: "CANCELLED", subtotal: 1960, gstAmount: 235, discount: 0,
    totalAmount: 2195, amountPaid: 0, balanceDue: 0, paymentMode: null,
    invoiceNumber: null, invoiceDate: null, expectedDate: "2026-07-10", notes: "Supplier could not fulfill",
    hospitalId: HOSPITAL_ID,
    createdAt: "2026-07-05T09:00:00Z", updatedAt: "2026-07-08T09:00:00Z",
    supplier: { name: "Venkateswara Drug Agency", phone: "+918765432109" },
    items: [
      { id: "poi-006", purchaseOrderId: "po-005", medicineId: "med-007", batchNumber: null, quantity: 20, receivedQty: 0, costPrice: 98, mrp: 135, gstPercent: 12, expiryDate: null, amount: 1960, medicine: { name: "Azithromycin 500mg" } },
    ],
  },
]

// ─── Bills ─────────────────────────────────────────────────────────────────────

export let bills: PharmacyBill[] = [
  {
    id: "pbill-001", billNumber: "PB-2026-001", patientId: "P-0001",
    patientName: "Rajesh Kumar", patientPhone: "+919876501234", gender: "Male",
    email: null, referredDoctor: "Dr. Anand Rao", prescriptionId: "presc-001",
    subtotal: 196, discountPercent: 0, discountAmount: 0, gstAmount: 23.52,
    netAmount: 219.52, roundOff: 0.48, billAmount: 220, paidAmount: 220,
    balanceDue: 0, paymentMode: "CASH", paymentRef: null, status: "PAID",
    billDate: "2026-09-20T10:15:00Z", hospitalId: HOSPITAL_ID,
    createdAt: "2026-09-20T10:15:00Z", updatedAt: "2026-09-20T10:15:00Z",
    items: [
      { id: "pbi-001", billId: "pbill-001", stockId: "stk-001", medicineName: "Ciprofloxacin 500mg", batchNumber: "BN2026001", quantity: 2, mrp: 98, price: 98, total: 196, discountPercent: 0, amount: 196, gstPercent: 12 },
    ],
  },
  {
    id: "pbill-002", billNumber: "PB-2026-002", patientId: "P-0002",
    patientName: "Priya Sharma", patientPhone: "+917890501234", gender: "Female",
    email: null, referredDoctor: "Dr. Sunita Mehta", prescriptionId: null,
    subtotal: 45, discountPercent: 10, discountAmount: 4.50, gstAmount: 4.86,
    netAmount: 45.36, roundOff: 0.64, billAmount: 46, paidAmount: 46,
    balanceDue: 0, paymentMode: "UPI", paymentRef: "UPI/2026/00234", status: "PAID",
    billDate: "2026-09-21T11:30:00Z", hospitalId: HOSPITAL_ID,
    createdAt: "2026-09-21T11:30:00Z", updatedAt: "2026-09-21T11:30:00Z",
    items: [
      { id: "pbi-002", billId: "pbill-002", stockId: "stk-002", medicineName: "Amoxicillin 250mg", batchNumber: "BN2026002", quantity: 1, mrp: 45, price: 45, total: 45, discountPercent: 10, amount: 40.50, gstPercent: 12 },
    ],
  },
  {
    id: "pbill-003", billNumber: "PB-2026-003", patientId: null,
    patientName: "Walk-in Patient", patientPhone: null, gender: null,
    email: null, referredDoctor: null, prescriptionId: null,
    subtotal: 58, discountPercent: 0, discountAmount: 0, gstAmount: 6.96,
    netAmount: 64.96, roundOff: 0.04, billAmount: 65, paidAmount: 65,
    balanceDue: 0, paymentMode: "CASH", paymentRef: null, status: "PAID",
    billDate: "2026-09-22T09:00:00Z", hospitalId: HOSPITAL_ID,
    createdAt: "2026-09-22T09:00:00Z", updatedAt: "2026-09-22T09:00:00Z",
    items: [
      { id: "pbi-003", billId: "pbill-003", stockId: "stk-008", medicineName: "Ofloxacin 0.3% Eye Drops", batchNumber: "BN2026008", quantity: 1, mrp: 58, price: 58, total: 58, discountPercent: 0, amount: 58, gstPercent: 12 },
    ],
  },
  {
    id: "pbill-004", billNumber: "PB-2026-004", patientId: "P-0003",
    patientName: "Suresh Babu", patientPhone: "+918901234567", gender: "Male",
    email: null, referredDoctor: "Dr. Kiran Patel", prescriptionId: "presc-003",
    subtotal: 500, discountPercent: 5, discountAmount: 25, gstAmount: 23.75,
    netAmount: 498.75, roundOff: 0.25, billAmount: 499, paidAmount: 499,
    balanceDue: 0, paymentMode: "CARD", paymentRef: "CARD/****4521", status: "PAID",
    billDate: "2026-09-22T12:00:00Z", hospitalId: HOSPITAL_ID,
    createdAt: "2026-09-22T12:00:00Z", updatedAt: "2026-09-22T12:00:00Z",
    items: [
      { id: "pbi-004", billId: "pbill-004", stockId: "stk-005", medicineName: "Prednisolone 5mg", batchNumber: "BN2026005", quantity: 5, mrp: 28, price: 28, total: 140, discountPercent: 5, amount: 133, gstPercent: 12 },
      { id: "pbi-005", billId: "pbill-004", stockId: "stk-003", medicineName: "Paracetamol 500mg", batchNumber: "BN2026003", quantity: 24, mrp: 15, price: 15, total: 360, discountPercent: 5, amount: 342, gstPercent: 5 },
    ],
  },
  {
    id: "pbill-005", billNumber: "PB-2026-005", patientId: "P-0005",
    patientName: "Fatima Begum", patientPhone: "+917654321098", gender: "Female",
    email: null, referredDoctor: null, prescriptionId: null,
    subtotal: 250, discountPercent: 0, discountAmount: 0, gstAmount: 30,
    netAmount: 280, roundOff: 0, billAmount: 280, paidAmount: 0,
    balanceDue: 280, paymentMode: "CREDIT", paymentRef: null, status: "PENDING",
    billDate: "2026-09-22T14:00:00Z", hospitalId: HOSPITAL_ID,
    createdAt: "2026-09-22T14:00:00Z", updatedAt: "2026-09-22T14:00:00Z",
    items: [
      { id: "pbi-006", billId: "pbill-005", stockId: "stk-004", medicineName: "Timolol 0.5% Eye Drops", batchNumber: "BN2026004", quantity: 1, mrp: 250, price: 250, total: 250, discountPercent: 0, amount: 250, gstPercent: 12 },
    ],
  },
]

// ─── Pending Medicines ─────────────────────────────────────────────────────────

export let pendingMedicines: PendingMedicinePatient[] = [
  {
    prescriptionId: "presc-010", prescriptionNumber: "RX-2026-010",
    patientId: "P-0010", patientName: "Aruna Devi",
    phone: "+919988776655", doctorName: "Dr. Anand Rao", medicineCount: 3, billCount: 0,
  },
  {
    prescriptionId: "presc-011", prescriptionNumber: "RX-2026-011",
    patientId: "P-0011", patientName: "Vinod Singh",
    phone: "+918877665544", doctorName: "Dr. Sunita Mehta", medicineCount: 2, billCount: 0,
  },
  {
    prescriptionId: "presc-012", prescriptionNumber: "RX-2026-012",
    patientId: "P-0012", patientName: "Meena Kumari",
    phone: "+917766554433", doctorName: "Dr. Kiran Patel", medicineCount: 4, billCount: 1,
  },
  {
    prescriptionId: "presc-013", prescriptionNumber: "RX-2026-013",
    patientId: "P-0013", patientName: "Ravi Shankar",
    phone: "+916655443322", doctorName: null, medicineCount: 1, billCount: 0,
  },
]

// ─── Patient prescription lookup fixture ───────────────────────────────────────

export const patientPrescriptionMap: Record<string, PatientPrescriptionResponse> = {
  "P-0001": {
    patient: { patientId: "P-0001", name: "Rajesh Kumar", age: 42, gender: "Male", phone: "+919876501234", email: null, doctorName: "Dr. Anand Rao" },
    prescription: { id: "presc-001", prescriptionNumber: "RX-2026-001", medicines: [{ name: "Ciprofloxacin 500mg", days: "5", timing: "1-0-1", note: "After food" }], doctorName: "Dr. Anand Rao", prescriptionDate: "2026-09-20" },
  },
  "P-0010": {
    patient: { patientId: "P-0010", name: "Aruna Devi", age: 58, gender: "Female", phone: "+919988776655", email: null, doctorName: "Dr. Anand Rao" },
    prescription: { id: "presc-010", prescriptionNumber: "RX-2026-010", medicines: [{ name: "Timolol 0.5% Eye Drops", days: "30", timing: "1-0-1", note: "Both eyes" }, { name: "Latanoprost 0.005% Eye Drops", days: "30", timing: "0-0-1", note: "Left eye at night" }, { name: "Paracetamol 500mg", days: "3", timing: "1-1-1", note: "SOS for pain" }], doctorName: "Dr. Anand Rao", prescriptionDate: "2026-09-22" },
  },
}
