/**
 * Mock fixture data for the Labs module.
 */

import type {
  Lab,
  LabWithInvestigations,
  InvestigationMaster,
  LabBillRow,
  LabBillDetailData,
  PendingPatient,
  PatientInvestigationsResponse,
} from "@/pages/labs/types"

let _seq = 1
export function uid(prefix = "lab"): string {
  return `${prefix}-${String(_seq++).padStart(4, "0")}`
}

// ─── Labs ──────────────────────────────────────────────────────────────────────

export let labs: Lab[] = [
  { id: "lab-001", name: "Clinical Lab", description: "Routine blood and urine tests", location: "Ground Floor, Room 102", printHeaderKey: "clinical_lab", isActive: true, sortOrder: 1 },
  { id: "lab-002", name: "Eye Diagnostics", description: "Visual acuity, IOP, OCT, Visual Fields", location: "First Floor, Room 201", printHeaderKey: "eye_diag", isActive: true, sortOrder: 2 },
  { id: "lab-003", name: "Imaging Center", description: "X-Ray, USG, MRI referral", location: "Ground Floor, Room 105", printHeaderKey: "imaging", isActive: true, sortOrder: 3 },
  { id: "lab-004", name: "Microbiology Lab", description: "Culture & sensitivity, swab tests", location: "Ground Floor, Room 103", printHeaderKey: null, isActive: true, sortOrder: 4 },
]

// Lab-investigation mappings (per lab)
export const labInvestigationMappings: Record<string, Array<{ investigationId: string; amount: number; isDefault: boolean }>> = {
  "lab-001": [
    { investigationId: "inv-001", amount: 350, isDefault: true },
    { investigationId: "inv-002", amount: 200, isDefault: true },
    { investigationId: "inv-003", amount: 450, isDefault: false },
    { investigationId: "inv-004", amount: 150, isDefault: true },
    { investigationId: "inv-005", amount: 250, isDefault: false },
  ],
  "lab-002": [
    { investigationId: "inv-006", amount: 100, isDefault: true },
    { investigationId: "inv-007", amount: 500, isDefault: true },
    { investigationId: "inv-008", amount: 800, isDefault: false },
    { investigationId: "inv-009", amount: 1200, isDefault: false },
  ],
  "lab-003": [
    { investigationId: "inv-010", amount: 600, isDefault: false },
    { investigationId: "inv-011", amount: 1500, isDefault: false },
  ],
  "lab-004": [
    { investigationId: "inv-012", amount: 700, isDefault: false },
  ],
}

export function getLabWithInvestigations(id: string): LabWithInvestigations | undefined {
  const lab = labs.find((l) => l.id === id)
  if (!lab) return undefined
  return { ...lab, investigations: labInvestigationMappings[id] ?? [] }
}

// ─── Investigations Master ─────────────────────────────────────────────────────

export let investigations: InvestigationMaster[] = [
  { id: "inv-001", name: "Complete Blood Count (CBC)", category: "Lab Test", description: "Full blood cell count including RBC, WBC, platelets" },
  { id: "inv-002", name: "Urine Routine", category: "Lab Test", description: "Routine urine analysis" },
  { id: "inv-003", name: "Fasting Blood Sugar", category: "Lab Test", description: "Blood glucose after 8 hrs fasting" },
  { id: "inv-004", name: "Liver Function Test", category: "Lab Test", description: "ALT, AST, ALP, Bilirubin" },
  { id: "inv-005", name: "Renal Function Test", category: "Lab Test", description: "Urea, Creatinine, Uric Acid" },
  { id: "inv-006", name: "Visual Acuity", category: "Eye Test", description: "Distance and near vision testing" },
  { id: "inv-007", name: "Intraocular Pressure (IOP)", category: "Eye Test", description: "Applanation tonometry" },
  { id: "inv-008", name: "OCT Macula", category: "Eye Test", description: "Optical Coherence Tomography - macular scan" },
  { id: "inv-009", name: "Visual Fields (HVF)", category: "Eye Test", description: "Humphrey visual field analysis" },
  { id: "inv-010", name: "Chest X-Ray PA View", category: "Imaging", description: "Standard PA chest X-ray" },
  { id: "inv-011", name: "USG Abdomen", category: "Imaging", description: "Ultrasound of abdomen and pelvis" },
  { id: "inv-012", name: "Conjunctival Swab C/S", category: "Lab Test", description: "Culture and sensitivity of conjunctival swab" },
  { id: "inv-013", name: "HbA1c", category: "Lab Test", description: "Glycated hemoglobin (3-month average)" },
  { id: "inv-014", name: "Thyroid Profile", category: "Lab Test", description: "TSH, T3, T4" },
]

// ─── Lab Bills ─────────────────────────────────────────────────────────────────

export let labBills: LabBillRow[] = [
  {
    id: "lbill-001", billNumber: "LB-2026-001", createdAt: "2026-09-20T10:30:00Z",
    subtotal: 550, discount: 0, total: 550, amountPaid: 550, balanceDue: 0,
    status: "PAID", paymentMode: "Cash",
    lab: { name: "Clinical Lab", printHeaderKey: "clinical_lab" },
    patient: { id: "uuid-p0001", patientId: "P-0001", firstName: "Rajesh", lastName: "Kumar", phone: "+919876501234", age: 42, gender: "Male", address: "12 Park Street, Hyderabad" },
    items: [{ name: "Complete Blood Count (CBC)", amount: 350 }, { name: "Urine Routine", amount: 200 }],
  },
  {
    id: "lbill-002", billNumber: "LB-2026-002", createdAt: "2026-09-20T11:00:00Z",
    subtotal: 600, discount: 50, total: 550, amountPaid: 300, balanceDue: 250,
    status: "PARTIAL", paymentMode: "UPI",
    lab: { name: "Eye Diagnostics", printHeaderKey: "eye_diag" },
    patient: { id: "uuid-p0002", patientId: "P-0002", firstName: "Priya", lastName: "Sharma", phone: "+917890501234", age: 35, gender: "Female", address: "5 Rose Colony, Hyderabad" },
    items: [{ name: "Visual Acuity", amount: 100 }, { name: "Intraocular Pressure (IOP)", amount: 500 }],
  },
  {
    id: "lbill-003", billNumber: "LB-2026-003", createdAt: "2026-09-21T09:00:00Z",
    subtotal: 1200, discount: 0, total: 1200, amountPaid: 0, balanceDue: 1200,
    status: "PENDING", paymentMode: null,
    lab: { name: "Eye Diagnostics", printHeaderKey: "eye_diag" },
    patient: { id: "uuid-p0003", patientId: "P-0003", firstName: "Suresh", lastName: "Babu", phone: "+918901234567", age: 55, gender: "Male", address: null },
    items: [{ name: "OCT Macula", amount: 800 }, { name: "Visual Fields (HVF)", amount: 400 }],
  },
  {
    id: "lbill-004", billNumber: "LB-2026-004", createdAt: "2026-09-22T08:30:00Z",
    subtotal: 350, discount: 0, total: 350, amountPaid: 350, balanceDue: 0,
    status: "PAID", paymentMode: "Card",
    lab: { name: "Clinical Lab", printHeaderKey: "clinical_lab" },
    patient: { id: "uuid-p0004", patientId: "P-0004", firstName: "Nalini", lastName: "Rao", phone: "+917788990011", age: 28, gender: "Female", address: "Flat 7, Green Apartments" },
    items: [{ name: "Complete Blood Count (CBC)", amount: 350 }],
  },
  {
    id: "lbill-005", billNumber: "LB-2026-005", createdAt: "2026-09-22T10:00:00Z",
    subtotal: 750, discount: 0, total: 750, amountPaid: 750, balanceDue: 0,
    status: "PAID", paymentMode: "UPI",
    lab: { name: "Clinical Lab", printHeaderKey: "clinical_lab" },
    patient: { id: "uuid-p0005", patientId: "P-0005", firstName: "Fatima", lastName: "Begum", phone: "+917654321098", age: 48, gender: "Female", address: null },
    items: [{ name: "Fasting Blood Sugar", amount: 450 }, { name: "HbA1c", amount: 300 }],
  },
  {
    id: "lbill-006", billNumber: "LB-2026-006", createdAt: "2026-09-22T11:00:00Z",
    subtotal: 0, discount: 0, total: 0, amountPaid: 0, balanceDue: 0,
    status: "CANCELLED", paymentMode: null,
    lab: { name: "Microbiology Lab", printHeaderKey: null },
    patient: { id: "uuid-p0006", patientId: "P-0006", firstName: "Ganesh", lastName: "Iyer", phone: "+916677889900", age: 60, gender: "Male", address: "9 Lake View, Secunderabad" },
    items: [{ name: "Conjunctival Swab C/S", amount: 700 }],
  },
]

export function getLabBillDetail(id: string): LabBillDetailData | undefined {
  const bill = labBills.find((b) => b.id === id)
  if (!bill) return undefined
  return {
    bill,
    items: bill.items,
    payments: bill.amountPaid > 0
      ? [{ paymentMode: bill.paymentMode ?? "Cash", amount: bill.amountPaid, createdAt: bill.createdAt }]
      : [],
  }
}

// ─── Pending Investigations ────────────────────────────────────────────────────

// Internal-only: main's getPendingLabInvestigations(date) filters prescriptions
// by prescriptionDate (IST day bounds) — the public PendingPatient shape has no
// date field, so it's tracked here and stripped by the handler before response.
interface PendingPatientFixture extends PendingPatient {
  prescriptionDate: string
}

export let pendingPatients: PendingPatientFixture[] = [
  { patientId: "P-0008", patientName: "Ravi Shankar", age: 34, gender: "Male", doctorName: "Dr. Anand Rao", investigationCount: 3, billCount: 0, prescriptionId: "presc-008", prescriptionDate: "2026-09-22" },
  { patientId: "P-0009", patientName: "Saroja Devi", age: 62, gender: "Female", doctorName: "Dr. Kiran Patel", investigationCount: 2, billCount: 0, prescriptionId: "presc-009", prescriptionDate: "2026-09-22" },
  { patientId: "P-0010", patientName: "Aruna Devi", age: 45, gender: "Female", doctorName: "Dr. Anand Rao", investigationCount: 1, billCount: 0, prescriptionId: "presc-010", prescriptionDate: "2026-09-22" },
]

// ─── Patient investigation response fixture ────────────────────────────────────

export const patientInvestigationMap: Record<string, PatientInvestigationsResponse> = {
  "P-0008": {
    patient: { patientId: "P-0008", name: "Ravi Shankar", age: 34, gender: "Male", phone: "+916655443322", doctorName: "Dr. Anand Rao" },
    prescription: { id: "presc-008", prescriptionNumber: "RX-2026-008", doctorName: "Dr. Anand Rao", prescriptionDate: "2026-09-22" },
    labGroups: [
      {
        lab: { id: "lab-001", name: "Clinical Lab", location: "Ground Floor, Room 102" },
        items: [{ investigationId: "inv-001", name: "Complete Blood Count (CBC)", amount: 350 }, { investigationId: "inv-003", name: "Fasting Blood Sugar", amount: 450 }],
      },
      {
        lab: { id: "lab-002", name: "Eye Diagnostics", location: "First Floor, Room 201" },
        items: [{ investigationId: "inv-006", name: "Visual Acuity", amount: 100 }],
      },
    ],
    unassigned: [],
    existingBills: [],
  },
}
