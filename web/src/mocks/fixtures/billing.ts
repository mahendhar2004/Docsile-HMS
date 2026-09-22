/**
 * Mock fixture data for the Billing module.
 * Shapes match DailySummary / BillingPrescription / InvoiceItem / PaymentRecord /
 * PrescriptionDetailData interfaces in web/src/pages/billing/types.ts exactly.
 *
 * All arrays are `let` so handlers can mutate them in-memory.
 */

// ─── Daily summaries (keyed by YYYY-MM-DD) ─────────────────────────────────────

export const dailySummaries: Record<string, {
  date: string
  totalPatients: number
  totalPrescriptions: number
  totalBilled: number
  totalCollected: number
  totalDues: number
  totalDiscount: number
}> = {
  "2026-09-22": {
    date: "2026-09-22",
    totalPatients: 9,
    totalPrescriptions: 11,
    totalBilled: 52400,
    totalCollected: 41200,
    totalDues: 11200,
    totalDiscount: 1500,
  },
  "2026-09-21": {
    date: "2026-09-21",
    totalPatients: 12,
    totalPrescriptions: 14,
    totalBilled: 68200,
    totalCollected: 63000,
    totalDues: 5200,
    totalDiscount: 2000,
  },
  "2026-09-20": {
    date: "2026-09-20",
    totalPatients: 10,
    totalPrescriptions: 12,
    totalBilled: 58400,
    totalCollected: 55000,
    totalDues: 3400,
    totalDiscount: 1000,
  },
}

// ─── Prescriptions list ───────────────────────────────────────────────────────

export let billingPrescriptions = [
  {
    id: "bp-001",
    prescriptionNumber: "2026-0001",
    patientId: "P-0001",
    patientType: "OPD",
    doctorName: "Dr. Suresh Menon",
    department: "Ophthalmology",
    total: 1000,
    amountPaid: 1000,
    balanceDue: 0,
    discount: 0,
    discountReason: null,
    status: "ACTIVE",
    prescriptionDate: "2026-09-22",
    paymentMode: "Cash",
    createdAt: "2026-09-22T09:30:00+05:30",
  },
  {
    id: "bp-002",
    prescriptionNumber: "2026-0002",
    patientId: "P-0002",
    patientType: "OPD",
    doctorName: "Dr. Suresh Menon",
    department: "Ophthalmology",
    total: 800,
    amountPaid: 500,
    balanceDue: 300,
    discount: 0,
    discountReason: null,
    status: "ACTIVE",
    prescriptionDate: "2026-09-22",
    paymentMode: "UPI",
    createdAt: "2026-09-22T10:00:00+05:30",
  },
  {
    id: "bp-003",
    prescriptionNumber: "2026-0003",
    patientId: "P-0003",
    patientType: "OPD",
    doctorName: "Dr. Priya Krishnan",
    department: "Ophthalmology",
    total: 1500,
    amountPaid: 1500,
    balanceDue: 0,
    discount: 200,
    discountReason: "Senior citizen",
    status: "ACTIVE",
    prescriptionDate: "2026-09-22",
    paymentMode: "Cash",
    createdAt: "2026-09-22T10:30:00+05:30",
  },
  {
    id: "bp-004",
    prescriptionNumber: "2026-0004",
    patientId: "P-0004",
    patientType: "OPD",
    doctorName: "Dr. Anand Prakash",
    department: "Ophthalmology",
    total: 2400,
    amountPaid: 1200,
    balanceDue: 1200,
    discount: 0,
    discountReason: null,
    status: "ACTIVE",
    prescriptionDate: "2026-09-22",
    paymentMode: "Card",
    createdAt: "2026-09-22T11:00:00+05:30",
  },
  {
    id: "bp-005",
    prescriptionNumber: "2026-0005",
    patientId: "P-0005",
    patientType: "OPD",
    doctorName: "Dr. Suresh Menon",
    department: "Ophthalmology",
    total: 500,
    amountPaid: 500,
    balanceDue: 0,
    discount: 0,
    discountReason: null,
    status: "ACTIVE",
    prescriptionDate: "2026-09-22",
    paymentMode: "Cash",
    createdAt: "2026-09-22T11:25:00+05:30",
  },
  {
    id: "bp-006",
    prescriptionNumber: "2026-0006",
    patientId: "P-0006",
    patientType: "OPD",
    doctorName: "Dr. Suresh Menon",
    department: "Ophthalmology",
    total: 800,
    amountPaid: 800,
    balanceDue: 0,
    discount: 0,
    discountReason: null,
    status: "ACTIVE",
    prescriptionDate: "2026-09-22",
    paymentMode: "UPI",
    createdAt: "2026-09-22T12:05:00+05:30",
  },
  {
    id: "bp-007",
    prescriptionNumber: "2026-0007",
    patientId: "P-0007",
    patientType: "OPD",
    doctorName: "Dr. Ramesh Iyer",
    department: "Ophthalmology",
    total: 3200,
    amountPaid: 0,
    balanceDue: 3200,
    discount: 500,
    discountReason: "Staff family",
    status: "ACTIVE",
    prescriptionDate: "2026-09-22",
    paymentMode: null,
    createdAt: "2026-09-22T12:15:00+05:30",
  },
  {
    id: "bp-008",
    prescriptionNumber: "2026-0008",
    patientId: "P-0008",
    patientType: "OPD",
    doctorName: "Dr. Priya Krishnan",
    department: "Ophthalmology",
    total: 1200,
    amountPaid: 1200,
    balanceDue: 0,
    discount: 0,
    discountReason: null,
    status: "ACTIVE",
    prescriptionDate: "2026-09-22",
    paymentMode: "Cash",
    createdAt: "2026-09-22T12:45:00+05:30",
  },
  {
    id: "bp-009",
    prescriptionNumber: "2026-0009",
    patientId: "P-0009",
    patientType: "Medical",
    doctorName: "Dr. Priya Krishnan",
    department: "Ophthalmology",
    total: 700,
    amountPaid: 700,
    balanceDue: 0,
    discount: 0,
    discountReason: null,
    status: "ACTIVE",
    prescriptionDate: "2026-09-22",
    paymentMode: "UPI",
    createdAt: "2026-09-22T13:10:00+05:30",
  },
  {
    id: "bp-010",
    prescriptionNumber: "2026-0010",
    patientId: "P-0010",
    patientType: "OPD",
    doctorName: null,
    department: null,
    total: 1500,
    amountPaid: 0,
    balanceDue: 1500,
    discount: 0,
    discountReason: null,
    status: "ACTIVE",
    prescriptionDate: "2026-09-22",
    paymentMode: null,
    createdAt: "2026-09-22T13:20:00+05:30",
  },
  {
    id: "bp-011",
    prescriptionNumber: "2026-0011",
    patientId: "P-0001",
    patientType: "OPD",
    doctorName: "Dr. Suresh Menon",
    department: "Ophthalmology",
    total: 2200,
    amountPaid: 2000,
    balanceDue: 200,
    discount: 0,
    discountReason: null,
    status: "ACTIVE",
    prescriptionDate: "2026-09-21",
    paymentMode: "Cash",
    createdAt: "2026-09-21T11:00:00+05:30",
  },
]

// ─── Invoice items (keyed by prescription ID) ─────────────────────────────────

export let invoiceItems: Record<string, Array<{
  id: string
  prescriptionId: string
  description: string
  category: string | null
  quantity: number
  unitPrice: number
  amount: number
  sortOrder: number
}>> = {
  "bp-001": [
    { id: "ii-001-1", prescriptionId: "bp-001", description: "OPD Consultation", category: "Consultation", quantity: 1, unitPrice: 500, amount: 500, sortOrder: 1 },
    { id: "ii-001-2", prescriptionId: "bp-001", description: "Eye Examination", category: "Examination", quantity: 1, unitPrice: 300, amount: 300, sortOrder: 2 },
    { id: "ii-001-3", prescriptionId: "bp-001", description: "Refraction", category: "Examination", quantity: 1, unitPrice: 200, amount: 200, sortOrder: 3 },
  ],
  "bp-002": [
    { id: "ii-002-1", prescriptionId: "bp-002", description: "OPD Consultation", category: "Consultation", quantity: 1, unitPrice: 500, amount: 500, sortOrder: 1 },
    { id: "ii-002-2", prescriptionId: "bp-002", description: "Slit Lamp Examination", category: "Examination", quantity: 1, unitPrice: 300, amount: 300, sortOrder: 2 },
  ],
  "bp-003": [
    { id: "ii-003-1", prescriptionId: "bp-003", description: "OPD Consultation", category: "Consultation", quantity: 1, unitPrice: 500, amount: 500, sortOrder: 1 },
    { id: "ii-003-2", prescriptionId: "bp-003", description: "Fundus Examination", category: "Examination", quantity: 1, unitPrice: 600, amount: 600, sortOrder: 2 },
    { id: "ii-003-3", prescriptionId: "bp-003", description: "IOP Measurement", category: "Examination", quantity: 1, unitPrice: 150, amount: 150, sortOrder: 3 },
    { id: "ii-003-4", prescriptionId: "bp-003", description: "Refraction", category: "Examination", quantity: 1, unitPrice: 200, amount: 200, sortOrder: 4 },
  ],
  "bp-004": [
    { id: "ii-004-1", prescriptionId: "bp-004", description: "OPD Consultation", category: "Consultation", quantity: 1, unitPrice: 500, amount: 500, sortOrder: 1 },
    { id: "ii-004-2", prescriptionId: "bp-004", description: "Visual Field Test", category: "Diagnostic", quantity: 1, unitPrice: 800, amount: 800, sortOrder: 2 },
    { id: "ii-004-3", prescriptionId: "bp-004", description: "OCT Scan", category: "Diagnostic", quantity: 1, unitPrice: 1500, amount: 1500, sortOrder: 3 },
  ],
  "bp-005": [
    { id: "ii-005-1", prescriptionId: "bp-005", description: "OPD Consultation", category: "Consultation", quantity: 1, unitPrice: 500, amount: 500, sortOrder: 1 },
  ],
  "bp-006": [
    { id: "ii-006-1", prescriptionId: "bp-006", description: "OPD Consultation", category: "Consultation", quantity: 1, unitPrice: 500, amount: 500, sortOrder: 1 },
    { id: "ii-006-2", prescriptionId: "bp-006", description: "Eye Examination", category: "Examination", quantity: 1, unitPrice: 300, amount: 300, sortOrder: 2 },
  ],
  "bp-007": [
    { id: "ii-007-1", prescriptionId: "bp-007", description: "OPD Consultation", category: "Consultation", quantity: 1, unitPrice: 500, amount: 500, sortOrder: 1 },
    { id: "ii-007-2", prescriptionId: "bp-007", description: "OCT Scan", category: "Diagnostic", quantity: 1, unitPrice: 1500, amount: 1500, sortOrder: 2 },
    { id: "ii-007-3", prescriptionId: "bp-007", description: "Visual Field Test", category: "Diagnostic", quantity: 1, unitPrice: 800, amount: 800, sortOrder: 3 },
    { id: "ii-007-4", prescriptionId: "bp-007", description: "Gonioscopy", category: "Diagnostic", quantity: 1, unitPrice: 400, amount: 400, sortOrder: 4 },
  ],
  "bp-008": [
    { id: "ii-008-1", prescriptionId: "bp-008", description: "OPD Consultation", category: "Consultation", quantity: 1, unitPrice: 500, amount: 500, sortOrder: 1 },
    { id: "ii-008-2", prescriptionId: "bp-008", description: "Corneal Topography", category: "Diagnostic", quantity: 1, unitPrice: 700, amount: 700, sortOrder: 2 },
  ],
  "bp-009": [
    { id: "ii-009-1", prescriptionId: "bp-009", description: "Medical Consultation", category: "Consultation", quantity: 1, unitPrice: 400, amount: 400, sortOrder: 1 },
    { id: "ii-009-2", prescriptionId: "bp-009", description: "Schirmer Test", category: "Diagnostic", quantity: 1, unitPrice: 300, amount: 300, sortOrder: 2 },
  ],
  "bp-010": [
    { id: "ii-010-1", prescriptionId: "bp-010", description: "OPD Consultation", category: "Consultation", quantity: 1, unitPrice: 500, amount: 500, sortOrder: 1 },
    { id: "ii-010-2", prescriptionId: "bp-010", description: "OCT Scan", category: "Diagnostic", quantity: 1, unitPrice: 1500, amount: 1500, sortOrder: 2 },
  ],
  "bp-011": [
    { id: "ii-011-1", prescriptionId: "bp-011", description: "OPD Consultation", category: "Consultation", quantity: 1, unitPrice: 500, amount: 500, sortOrder: 1 },
    { id: "ii-011-2", prescriptionId: "bp-011", description: "Visual Field Test", category: "Diagnostic", quantity: 1, unitPrice: 800, amount: 800, sortOrder: 2 },
    { id: "ii-011-3", prescriptionId: "bp-011", description: "Retinal Examination", category: "Examination", quantity: 1, unitPrice: 900, amount: 900, sortOrder: 3 },
  ],
}

// ─── Payment records (keyed by prescription ID) ───────────────────────────────

export let paymentRecords: Record<string, Array<{
  id: string
  prescriptionId: string
  amount: number
  paymentMode: string
  paymentRef: string | null
  receivedBy: string | null
  paymentDate: string
  notes: string | null
}>> = {
  "bp-001": [
    { id: "pay-001-1", prescriptionId: "bp-001", amount: 1000, paymentMode: "Cash", paymentRef: null, receivedBy: "Reception", paymentDate: "2026-09-22", notes: null },
  ],
  "bp-002": [
    { id: "pay-002-1", prescriptionId: "bp-002", amount: 500, paymentMode: "UPI", paymentRef: "UPI12345", receivedBy: "Reception", paymentDate: "2026-09-22", notes: "Partial payment" },
  ],
  "bp-003": [
    { id: "pay-003-1", prescriptionId: "bp-003", amount: 1500, paymentMode: "Cash", paymentRef: null, receivedBy: "Reception", paymentDate: "2026-09-22", notes: null },
  ],
  "bp-004": [
    { id: "pay-004-1", prescriptionId: "bp-004", amount: 1200, paymentMode: "Card", paymentRef: "CARD98765", receivedBy: "Reception", paymentDate: "2026-09-22", notes: "Partial payment" },
  ],
  "bp-005": [
    { id: "pay-005-1", prescriptionId: "bp-005", amount: 500, paymentMode: "Cash", paymentRef: null, receivedBy: "Reception", paymentDate: "2026-09-22", notes: null },
  ],
  "bp-006": [
    { id: "pay-006-1", prescriptionId: "bp-006", amount: 800, paymentMode: "UPI", paymentRef: "UPI67890", receivedBy: "Reception", paymentDate: "2026-09-22", notes: null },
  ],
  "bp-007": [],
  "bp-008": [
    { id: "pay-008-1", prescriptionId: "bp-008", amount: 1200, paymentMode: "Cash", paymentRef: null, receivedBy: "Reception", paymentDate: "2026-09-22", notes: null },
  ],
  "bp-009": [
    { id: "pay-009-1", prescriptionId: "bp-009", amount: 700, paymentMode: "UPI", paymentRef: "UPI11111", receivedBy: "Reception", paymentDate: "2026-09-22", notes: null },
  ],
  "bp-010": [],
  "bp-011": [
    { id: "pay-011-1", prescriptionId: "bp-011", amount: 2000, paymentMode: "Cash", paymentRef: null, receivedBy: "Reception", paymentDate: "2026-09-21", notes: "Advance payment" },
  ],
}

// ─── ID counters ──────────────────────────────────────────────────────────────

let _paySeq = 100

export function nextPaymentId(): string {
  return `pay-${String(_paySeq++).padStart(3, "0")}`
}
