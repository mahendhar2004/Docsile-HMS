/**
 * Mock fixture data for the Optical module.
 */

import type {
  OpticalProduct,
  OpticalStockEntry,
  StockSummary,
  StockSearchResult,
  OpticalBillRow,
  OpticalSettings,
  HospitalProfile,
} from "@/pages/optical/types"

let _seq = 1
export function uid(prefix = "opt"): string {
  return `${prefix}-${String(_seq++).padStart(4, "0")}`
}

// ─── Products ──────────────────────────────────────────────────────────────────

export let products: OpticalProduct[] = [
  { id: "opt-prod-001", name: "Ray-Ban Aviator Classic", brand: "Ray-Ban", category: "Frame", type: "Full Rim", material: "Metal", color: "Gold/Green", size: "55-14-135", coating: null, index: null, modelNumber: "RB3025", hsnCode: "90041010", gstPercent: 12, isActive: true },
  { id: "opt-prod-002", name: "Titan Eye+ Rimless", brand: "Titan", category: "Frame", type: "Rimless", material: "Titanium", color: "Silver", size: "52-18-140", coating: null, index: null, modelNumber: "TE-5032", hsnCode: "90041010", gstPercent: 12, isActive: true },
  { id: "opt-prod-003", name: "Fastrack Half Rim", brand: "Fastrack", category: "Frame", type: "Half Rim", material: "TR-90", color: "Matte Black", size: "54-16-145", coating: null, index: null, modelNumber: "FT-3021", hsnCode: "90041010", gstPercent: 12, isActive: true },
  { id: "opt-prod-004", name: "Single Vision CR-39 1.5", brand: null, category: "Lens", type: "Single Vision", material: "CR-39", color: null, size: null, coating: "Anti-Reflection", index: "1.5", modelNumber: null, hsnCode: "90015010", gstPercent: 12, isActive: true },
  { id: "opt-prod-005", name: "Progressive Hi-Index 1.67", brand: null, category: "Lens", type: "Progressive", material: "Hi-Index", color: null, size: null, coating: "Blue Cut", index: "1.67", modelNumber: null, hsnCode: "90015010", gstPercent: 12, isActive: true },
  { id: "opt-prod-006", name: "Bifocal Polycarbonate 1.56", brand: null, category: "Lens", type: "Bifocal", material: "Polycarbonate", color: null, size: null, coating: "Hardcoat", index: "1.56", modelNumber: null, hsnCode: "90015010", gstPercent: 12, isActive: true },
  { id: "opt-prod-007", name: "Bausch & Lomb Daily", brand: "Bausch & Lomb", category: "Contact Lens", type: "Daily", material: null, color: null, size: null, coating: null, index: null, modelNumber: "BL-ULTRA-D", hsnCode: "90019000", gstPercent: 18, isActive: true },
  { id: "opt-prod-008", name: "Lens Cleaning Solution 100ml", brand: "Optifresh", category: "Solution", type: null, material: null, color: null, size: "100ml", coating: null, index: null, modelNumber: "OPT-SOL-100", hsnCode: "34022090", gstPercent: 18, isActive: true },
  { id: "opt-prod-009", name: "Polarized Sunglasses Wrap", brand: "Oakley", category: "Sunglasses", type: "Wrap", material: "Plastic", color: "Black", size: "57-18-130", coating: "Mirror", index: null, modelNumber: "OO9102-46", hsnCode: "90041090", gstPercent: 12, isActive: true },
  { id: "opt-prod-010", name: "Screwdriver Kit Optical", brand: null, category: "Accessory", type: null, material: null, color: null, size: null, coating: null, index: null, modelNumber: "ACC-SCREW-01", hsnCode: "82059000", gstPercent: 18, isActive: true },
]

// ─── Stock ─────────────────────────────────────────────────────────────────────

export let stock: OpticalStockEntry[] = [
  { id: "opt-stk-001", productId: "opt-prod-001", batchNumber: "BN-OPT-2026-001", quantity: 12, mrp: 4500, costPrice: 3200, gstPercent: 12, power: null, isActive: true, product: { id: "opt-prod-001", name: "Ray-Ban Aviator Classic", brand: "Ray-Ban", category: "Frame", type: "Full Rim", modelNumber: "RB3025" } },
  { id: "opt-stk-002", productId: "opt-prod-002", batchNumber: "BN-OPT-2026-002", quantity: 8, mrp: 6200, costPrice: 4500, gstPercent: 12, power: null, isActive: true, product: { id: "opt-prod-002", name: "Titan Eye+ Rimless", brand: "Titan", category: "Frame", type: "Rimless", modelNumber: "TE-5032" } },
  { id: "opt-stk-003", productId: "opt-prod-003", batchNumber: "BN-OPT-2026-003", quantity: 20, mrp: 1800, costPrice: 1200, gstPercent: 12, power: null, isActive: true, product: { id: "opt-prod-003", name: "Fastrack Half Rim", brand: "Fastrack", category: "Frame", type: "Half Rim", modelNumber: "FT-3021" } },
  { id: "opt-stk-004", productId: "opt-prod-004", batchNumber: null, quantity: 100, mrp: 800, costPrice: 520, gstPercent: 12, power: null, isActive: true, product: { id: "opt-prod-004", name: "Single Vision CR-39 1.5", brand: null, category: "Lens", type: "Single Vision", modelNumber: null } },
  { id: "opt-stk-005", productId: "opt-prod-005", batchNumber: null, quantity: 50, mrp: 3500, costPrice: 2400, gstPercent: 12, power: null, isActive: true, product: { id: "opt-prod-005", name: "Progressive Hi-Index 1.67", brand: null, category: "Lens", type: "Progressive", modelNumber: null } },
  { id: "opt-stk-006", productId: "opt-prod-006", batchNumber: null, quantity: 75, mrp: 1200, costPrice: 800, gstPercent: 12, power: null, isActive: true, product: { id: "opt-prod-006", name: "Bifocal Polycarbonate 1.56", brand: null, category: "Lens", type: "Bifocal", modelNumber: null } },
  { id: "opt-stk-007", productId: "opt-prod-007", batchNumber: "BN-OPT-2026-007", quantity: 4, mrp: 1500, costPrice: 1000, gstPercent: 18, power: "-1.00/-1.50", isActive: true, product: { id: "opt-prod-007", name: "Bausch & Lomb Daily", brand: "Bausch & Lomb", category: "Contact Lens", type: "Daily", modelNumber: "BL-ULTRA-D" } },
  { id: "opt-stk-008", productId: "opt-prod-008", batchNumber: "BN-OPT-2026-008", quantity: 30, mrp: 250, costPrice: 160, gstPercent: 18, power: null, isActive: true, product: { id: "opt-prod-008", name: "Lens Cleaning Solution 100ml", brand: "Optifresh", category: "Solution", type: null, modelNumber: "OPT-SOL-100" } },
  { id: "opt-stk-009", productId: "opt-prod-009", batchNumber: "BN-OPT-2026-009", quantity: 6, mrp: 12000, costPrice: 8500, gstPercent: 12, power: null, isActive: true, product: { id: "opt-prod-009", name: "Polarized Sunglasses Wrap", brand: "Oakley", category: "Sunglasses", type: "Wrap", modelNumber: "OO9102-46" } },
  { id: "opt-stk-010", productId: "opt-prod-010", batchNumber: null, quantity: 3, mrp: 120, costPrice: 75, gstPercent: 18, power: null, isActive: true, product: { id: "opt-prod-010", name: "Screwdriver Kit Optical", brand: null, category: "Accessory", type: null, modelNumber: "ACC-SCREW-01" } },
]

export function getStockSummary(): StockSummary {
  // Matches main's actions.ts getStockSummary: both metrics are scoped to
  // isActive + quantity > 0 (a zero-quantity batch isn't "in stock").
  const inStock = stock.filter((s) => s.isActive && s.quantity > 0)
  return {
    totalItems: inStock.length,
    lowStock: inStock.filter((s) => s.quantity <= 5).length,
  }
}

export function searchStock(q: string): StockSearchResult[] {
  const lower = q.toLowerCase()
  return stock
    .filter((s) => s.isActive && (s.product.name.toLowerCase().includes(lower) || (s.product.brand ?? "").toLowerCase().includes(lower)))
    .map((s) => ({
      stockId: s.id,
      productId: s.productId,
      name: s.product.name,
      brand: s.product.brand,
      category: s.product.category,
      type: s.product.type,
      modelNumber: s.product.modelNumber,
      batchNumber: s.batchNumber,
      quantity: s.quantity,
      mrp: s.mrp,
      gstPercent: s.gstPercent,
      power: s.power,
    }))
}

// ─── Bills ─────────────────────────────────────────────────────────────────────

export let bills: OpticalBillRow[] = [
  {
    id: "opt-bill-001", billNumber: "OB-2026-001", patientId: "P-0001",
    patientName: "Rajesh Kumar", patientPhone: "+919876501234", gender: "Male",
    referredDoctor: "Dr. Anand Rao", prescriptionId: "presc-001",
    lensPrescription: null, billDate: "2026-09-15T10:00:00Z",
    subtotal: 5300, discountPercent: 5, discountAmount: 265, gstAmount: 576,
    netAmount: 5611, roundOff: -0.6, billAmount: 5611, paidAmount: 5611,
    balanceDue: 0, paymentMode: "CASH", paymentRef: null, deliveryDate: "2026-09-22",
    orderNotes: "Handle with care", status: "READY", createdBy: "mock-admin-id",
    createdAt: "2026-09-15T10:00:00Z", updatedAt: "2026-09-20T09:00:00Z",
    items: [
      { id: "obi-001", billId: "opt-bill-001", stockId: "opt-stk-001", itemName: "Ray-Ban Aviator Classic", category: "Frame", eye: null, quantity: 1, mrp: 4500, price: 4500, total: 4500, discountPercent: 5, amount: 4275, gstPercent: 12 },
      { id: "obi-002", billId: "opt-bill-001", stockId: "opt-stk-004", itemName: "Single Vision CR-39 1.5", category: "Lens", eye: "OD", quantity: 1, mrp: 800, price: 800, total: 800, discountPercent: 5, amount: 760, gstPercent: 12 },
    ],
  },
  {
    id: "opt-bill-002", billNumber: "OB-2026-002", patientId: "P-0004",
    patientName: "Nalini Rao", patientPhone: "+917788990011", gender: "Female",
    referredDoctor: null, prescriptionId: null,
    lensPrescription: null, billDate: "2026-09-20T14:00:00Z",
    subtotal: 3500, discountPercent: 0, discountAmount: 0, gstAmount: 420,
    netAmount: 3920, roundOff: 0, billAmount: 3920, paidAmount: 2000,
    balanceDue: 1920, paymentMode: "UPI", paymentRef: "UPI/OPTBILL/001", deliveryDate: null,
    orderNotes: null, status: "ORDERED", createdBy: "mock-admin-id",
    createdAt: "2026-09-20T14:00:00Z", updatedAt: "2026-09-20T14:00:00Z",
    items: [
      { id: "obi-003", billId: "opt-bill-002", stockId: "opt-stk-005", itemName: "Progressive Hi-Index 1.67", category: "Lens", eye: null, quantity: 1, mrp: 3500, price: 3500, total: 3500, discountPercent: 0, amount: 3500, gstPercent: 12 },
    ],
  },
  {
    id: "opt-bill-003", billNumber: "OB-2026-003", patientId: "P-0006",
    patientName: "Ganesh Iyer", patientPhone: "+916677889900", gender: "Male",
    referredDoctor: "Dr. Sunita Mehta", prescriptionId: "presc-006",
    lensPrescription: null, billDate: "2026-09-22T11:00:00Z",
    subtotal: 7800, discountPercent: 10, discountAmount: 780, gstAmount: 837.6,
    netAmount: 7857.6, roundOff: 0.4, billAmount: 7858, paidAmount: 7858,
    balanceDue: 0, paymentMode: "Card", paymentRef: "CARD/****1234", deliveryDate: null,
    orderNotes: null, status: "COMPLETED", createdBy: "mock-admin-id",
    createdAt: "2026-09-22T11:00:00Z", updatedAt: "2026-09-22T11:00:00Z",
    items: [
      { id: "obi-004", billId: "opt-bill-003", stockId: "opt-stk-002", itemName: "Titan Eye+ Rimless", category: "Frame", eye: null, quantity: 1, mrp: 6200, price: 6200, total: 6200, discountPercent: 10, amount: 5580, gstPercent: 12 },
      { id: "obi-005", billId: "opt-bill-003", stockId: "opt-stk-005", itemName: "Progressive Hi-Index 1.67", category: "Lens", eye: null, quantity: 1, mrp: 3500, price: 1600, total: 1600, discountPercent: 10, amount: 1440, gstPercent: 12 },
    ],
  },
  {
    id: "opt-bill-004", billNumber: "OB-2026-004", patientId: "P-0007",
    patientName: "Kavita Nair", patientPhone: "+915566778899", gender: "Female",
    referredDoctor: null, prescriptionId: null,
    lensPrescription: null, billDate: "2026-09-18T09:30:00Z",
    subtotal: 1750, discountPercent: 0, discountAmount: 0, gstAmount: 315,
    netAmount: 2065, roundOff: 0, billAmount: 2065, paidAmount: 2065,
    balanceDue: 0, paymentMode: "NEFT", paymentRef: "NEFT/20260918/001", deliveryDate: null,
    orderNotes: null, status: "COMPLETED", createdBy: "mock-admin-id",
    createdAt: "2026-09-18T09:30:00Z", updatedAt: "2026-09-18T09:30:00Z",
    items: [
      { id: "obi-006", billId: "opt-bill-004", stockId: "opt-stk-007", itemName: "Bausch & Lomb Daily", category: "Contact Lens", eye: null, quantity: 1, mrp: 1500, price: 1500, total: 1500, discountPercent: 0, amount: 1500, gstPercent: 18 },
      { id: "obi-007", billId: "opt-bill-004", stockId: "opt-stk-008", itemName: "Lens Cleaning Solution 100ml", category: "Solution", eye: null, quantity: 1, mrp: 250, price: 250, total: 250, discountPercent: 0, amount: 250, gstPercent: 18 },
    ],
  },
  {
    id: "opt-bill-005", billNumber: "OB-2026-005", patientId: null,
    patientName: "Walk-in Customer", patientPhone: null, gender: null,
    referredDoctor: null, prescriptionId: null,
    lensPrescription: null, billDate: "2026-09-22T15:00:00Z",
    subtotal: 12000, discountPercent: 0, discountAmount: 0, gstAmount: 1440,
    netAmount: 13440, roundOff: 0, billAmount: 13440, paidAmount: 13440,
    balanceDue: 0, paymentMode: "Credit", paymentRef: null, deliveryDate: null,
    orderNotes: null, status: "COMPLETED", createdBy: "mock-admin-id",
    createdAt: "2026-09-22T15:00:00Z", updatedAt: "2026-09-22T15:00:00Z",
    items: [
      { id: "obi-008", billId: "opt-bill-005", stockId: "opt-stk-009", itemName: "Polarized Sunglasses Wrap", category: "Sunglasses", eye: null, quantity: 1, mrp: 12000, price: 12000, total: 12000, discountPercent: 0, amount: 12000, gstPercent: 12 },
    ],
  },
]

// ─── Settings ──────────────────────────────────────────────────────────────────

export let opticalSettings: OpticalSettings = { printHeaderKey: "default" }

// ─── Hospital Profile ──────────────────────────────────────────────────────────

export const hospitalProfile: HospitalProfile = {
  id: "mock-hospital-id",
  name: "Docsile Eye Hospital",
  displayName: "Docsile Eye & Multi-Specialty Hospital",
  address: "123 Main Road, Hyderabad - 500001",
  phone: "+914012345678",
  email: "info@docsile.in",
  website: null,
  logoUrl: null,
  registrationNo: null,
  gstin: null,
}

// ─── Patient AR reading fixtures ───────────────────────────────────────────────

export const patientArReadings: Record<string, object> = {
  "P-0001": {
    patientId: "P-0001", name: "Rajesh Kumar", age: 42, gender: "Male", phone: "+919876501234",
    doctorName: "Dr. Anand Rao",
    autoRefractometer: { RE: { sph: "-2.25", cyl: "-0.75", axis: "170" }, LE: { sph: "-2.00", cyl: "-0.50", axis: "160" } },
    glassesReading: { RE: { sph: "-2.00", cyl: "-0.75", axis: "170", va: "6/6" }, LE: { sph: "-1.75", cyl: "-0.50", axis: "165", va: "6/6" } },
    presentPrescription: null,
    readingDate: "2026-09-22",
    prescriptionId: "presc-001",
  },
}
