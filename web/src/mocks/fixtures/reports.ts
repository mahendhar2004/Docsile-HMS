/**
 * Mock fixtures for the Reports module.
 * Includes patient search results, patient detail data, and export rows.
 */

import type {
  PatientSearchResult,
  PatientSummary,
  PatientVisit,
  PatientPrescription,
  InpatientRecord,
  LabRecord,
  BillingData,
  ExportRow,
} from "@/pages/reports/types"

// ─── Patient search ───────────────────────────────────────────────────────────

export const reportPatients: PatientSearchResult[] = [
  {
    id: "rpt-patient-001",
    patientId: "P-0001",
    firstName: "Ramesh",
    lastName: "Kumar",
    fullName: "Ramesh Kumar",
    phone: "+919876543210",
    age: 58,
    gender: "Male",
    dateOfBirth: "1968-03-14",
    patientType: "OPD",
    registeredOn: "2024-01-15T09:00:00Z",
    lastVisitDate: "2026-09-20T10:30:00Z",
  },
  {
    id: "rpt-patient-002",
    patientId: "P-0002",
    firstName: "Priya",
    lastName: "Devi",
    fullName: "Priya Devi",
    phone: "+919944332211",
    age: 45,
    gender: "Female",
    dateOfBirth: "1981-07-22",
    patientType: "IPD",
    registeredOn: "2024-03-10T11:00:00Z",
    lastVisitDate: "2026-09-15T08:00:00Z",
  },
  {
    id: "rpt-patient-003",
    patientId: "P-0003",
    firstName: "Suresh",
    lastName: "Iyer",
    fullName: "Suresh Iyer",
    phone: "+918765432109",
    age: 62,
    gender: "Male",
    dateOfBirth: "1964-11-05",
    patientType: "OPD",
    registeredOn: "2023-08-20T10:00:00Z",
    lastVisitDate: "2026-09-19T11:00:00Z",
  },
  {
    id: "rpt-patient-004",
    patientId: "P-0004",
    firstName: "Kavitha",
    lastName: "Nair",
    fullName: "Kavitha Nair",
    phone: "+917654321098",
    age: 38,
    gender: "Female",
    dateOfBirth: "1988-05-18",
    patientType: "OPD",
    registeredOn: "2025-02-14T09:30:00Z",
    lastVisitDate: "2026-09-18T14:00:00Z",
  },
  {
    id: "rpt-patient-005",
    patientId: "P-0005",
    firstName: "Gopal",
    lastName: "Krishnan",
    fullName: "Gopal Krishnan",
    phone: "+919567890123",
    age: 71,
    gender: "Male",
    dateOfBirth: "1955-01-28",
    patientType: "OPD",
    registeredOn: "2023-05-08T10:00:00Z",
    lastVisitDate: "2026-09-14T11:00:00Z",
  },
]

// ─── Patient summary (served for any UUID) ────────────────────────────────────

export const patientSummary: PatientSummary = {
  id: "rpt-patient-001",
  patientId: "P-0001",
  firstName: "Ramesh",
  lastName: "Kumar",
  fullName: "Ramesh Kumar",
  phone: "+919876543210",
  email: "ramesh.kumar@gmail.com",
  age: 58,
  gender: "Male",
  dateOfBirth: "1968-03-14",
  address: "42, Thiruvalluvar Street, Tambaram, Chennai — 600045",
  registeredOn: "2024-01-15T09:00:00Z",
  lastVisit: "2026-09-20T10:30:00Z",
  opdVisits: 12,
  hasInpatient: true,
  inpatientStatus: "DISCHARGED",
  totalBilled: 58500,
  totalPaid: 52000,
  totalDues: 6500,
}

// ─── Patient visits ───────────────────────────────────────────────────────────

export const patientVisits: PatientVisit[] = [
  {
    id: "visit-1",
    prescriptionNumber: "RX-2026-001",
    prescriptionDate: "2026-09-20T10:30:00Z",
    patientType: "OPD",
    doctorName: "Dr. Anand Krishnan",
    department: "Ophthalmology",
    presentComplaint: "Blurred vision in right eye",
    diagnosis: "Post-cataract IOL assessment",
    total: 500,
    balanceDue: 500,
    status: "PARTIAL",
    followUpDate: "2026-09-25T10:00:00Z",
  },
  {
    id: "visit-2",
    prescriptionNumber: "RX-2026-045",
    prescriptionDate: "2026-09-11T10:00:00Z",
    patientType: "OPD",
    doctorName: "Dr. Anand Krishnan",
    department: "Ophthalmology",
    presentComplaint: "Routine post-op check",
    diagnosis: "Cataract (post-operative)",
    total: 300,
    balanceDue: 0,
    status: "PAID",
    followUpDate: "2026-09-20T10:30:00Z",
  },
  {
    id: "visit-3",
    prescriptionNumber: "RX-2025-312",
    prescriptionDate: "2025-12-08T09:00:00Z",
    patientType: "OPD",
    doctorName: "Dr. Anand Krishnan",
    department: "Ophthalmology",
    presentComplaint: "Glare and halos after cataract surgery",
    diagnosis: "Posterior capsule opacification",
    total: 8500,
    balanceDue: 0,
    status: "PAID",
    followUpDate: "2026-01-15T09:00:00Z",
  },
]

// ─── Patient prescriptions ────────────────────────────────────────────────────

export const patientPrescriptions: PatientPrescription[] = [
  {
    id: "visit-1",
    prescriptionNumber: "RX-2026-001",
    prescriptionDate: "2026-09-20T10:30:00Z",
    patientType: "OPD",
    doctorName: "Dr. Anand Krishnan",
    medicines: JSON.stringify([
      { name: "Timolol 0.5% Eye Drops", timing: "BD", days: "30", notes: "One drop each eye" },
      { name: "Carboxymethylcellulose Lubricant", timing: "QID", days: "30", notes: "As needed" },
    ]),
    investigations: JSON.stringify(["OCT Scan", "Visual Acuity Test"]),
    presentComplaint: "Blurred vision in right eye",
    diagnosis: "Post-cataract IOL assessment",
    additionalNotes: "Review after 1 week",
    followUpDate: "2026-09-25T10:00:00Z",
    items: [
      { id: "item-1-1", description: "Consultation fee", amount: 500, sortOrder: 1 },
    ],
  },
  {
    id: "visit-3",
    prescriptionNumber: "RX-2025-312",
    prescriptionDate: "2025-12-08T09:00:00Z",
    patientType: "OPD",
    doctorName: "Dr. Anand Krishnan",
    medicines: JSON.stringify([
      { name: "Prednisolone Acetate 1% Eye Drops", timing: "TID", days: "14", notes: "Taper dose" },
    ]),
    investigations: JSON.stringify(["OCT Scan"]),
    presentComplaint: "Glare and halos after cataract surgery",
    diagnosis: "Posterior capsule opacification",
    additionalNotes: "YAG laser capsulotomy performed",
    followUpDate: "2026-01-15T09:00:00Z",
    items: [
      { id: "item-3-1", description: "YAG Laser Capsulotomy", amount: 8000, sortOrder: 1 },
      { id: "item-3-2", description: "Consultation fee", amount: 500, sortOrder: 2 },
    ],
  },
]

// ─── Patient inpatient record ─────────────────────────────────────────────────

export const patientInpatient: InpatientRecord = {
  id: "ipt-001",
  ipNumber: "IP-2025-0042",
  name: "Ramesh Kumar",
  status: "DISCHARGED",
  admissionDate: "2025-11-10T07:00:00Z",
  dischargeDate: "2025-11-12T11:00:00Z",
  department: "Ophthalmology",
  wardName: "General Ward A",
  bedNumber: "B-04",
  doctorNames: JSON.stringify(["Dr. Anand Krishnan", "Dr. Priya Sharma"]),
  provisionDiagnosis: "Mature cataract, right eye",
  operationName: "Phacoemulsification with IOL implantation",
  operationDate: "2025-11-11T09:00:00Z",
  packageAmount: 28000,
  discount: 2000,
  netAmount: 26000,
  totalReceivedAmount: 26000,
  balanceAmount: 0,
  admissionNotes: "Patient fit for surgery, routine pre-op clearance done",
  prescriptions: null,
  dischargeNotes: JSON.stringify({
    diagnosis: "Cataract RE — post phacoemulsification",
    condition: "Good",
    instructions: "Avoid heavy lifting. Use eye drops as prescribed.",
    followUp: "2 weeks",
  }),
  paymentRecords: JSON.stringify([
    { date: "2025-11-10", amount: 10000, mode: "Cash", note: "Advance" },
    { date: "2025-11-12", amount: 16000, mode: "UPI", note: "Final payment" },
  ]),
  insuranceClaims: [],
}

// ─── Patient lab records ──────────────────────────────────────────────────────

export const patientLabs: LabRecord[] = [
  {
    id: "lab-1",
    billNumber: "LB-2026-001",
    status: "PAID",
    subtotal: 2200,
    discount: 200,
    total: 2000,
    amountPaid: 2000,
    balanceDue: 0,
    paymentMode: "Cash",
    createdAt: "2026-09-20T11:00:00Z",
    lab: { name: "Docsile Diagnostics", printHeaderKey: null },
    items: [
      { id: "li-1-1", name: "HbA1c", amount: 600, sortOrder: 1 },
      { id: "li-1-2", name: "Fasting Blood Sugar", amount: 200, sortOrder: 2 },
      { id: "li-1-3", name: "Lipid Profile", amount: 800, sortOrder: 3 },
      { id: "li-1-4", name: "Complete Blood Count", amount: 400, sortOrder: 4 },
    ],
    payments: [
      { id: "lp-1-1", paymentDate: "2026-09-20T11:30:00Z", amount: 2000, paymentMode: "Cash" },
    ],
  },
  {
    id: "lab-2",
    billNumber: "LB-2025-298",
    status: "PAID",
    subtotal: 3500,
    discount: 0,
    total: 3500,
    amountPaid: 3500,
    balanceDue: 0,
    paymentMode: "UPI",
    createdAt: "2025-11-10T08:00:00Z",
    lab: { name: "Docsile Diagnostics", printHeaderKey: null },
    items: [
      { id: "li-2-1", name: "Pre-operative CBC", amount: 400, sortOrder: 1 },
      { id: "li-2-2", name: "Blood Glucose (Random)", amount: 150, sortOrder: 2 },
      { id: "li-2-3", name: "ECG", amount: 300, sortOrder: 3 },
      { id: "li-2-4", name: "Chest X-Ray", amount: 600, sortOrder: 4 },
      { id: "li-2-5", name: "Renal Function Test", amount: 700, sortOrder: 5 },
      { id: "li-2-6", name: "Coagulation Profile", amount: 850, sortOrder: 6 },
      { id: "li-2-7", name: "Blood Grouping", amount: 200, sortOrder: 7 },
    ],
    payments: [
      { id: "lp-2-1", paymentDate: "2025-11-10T08:30:00Z", amount: 3500, paymentMode: "UPI" },
    ],
  },
]

// ─── Patient billing ──────────────────────────────────────────────────────────

export const patientBilling: BillingData = {
  summary: {
    opdTotal: 9300,
    opdPaid: 8800,
    opdDue: 500,
    labTotal: 5500,
    labPaid: 5500,
    labDue: 0,
    ipdTotal: 26000,
    ipdPaid: 26000,
    ipdDue: 0,
    grandTotal: 40800,
    grandPaid: 40300,
    grandDue: 500,
  },
  prescriptions: [
    {
      id: "visit-1",
      prescriptionNumber: "RX-2026-001",
      prescriptionDate: "2026-09-20T10:30:00Z",
      total: 500,
      amountPaid: 0,
      balanceDue: 500,
      status: "PARTIAL",
      payments: [],
    },
    {
      id: "visit-2",
      prescriptionNumber: "RX-2026-045",
      prescriptionDate: "2026-09-11T10:00:00Z",
      total: 300,
      amountPaid: 300,
      balanceDue: 0,
      status: "PAID",
      payments: [
        { id: "pp-2-1", amount: 300, paymentMode: "Cash", paymentDate: "2026-09-11T10:30:00Z" },
      ],
    },
    {
      id: "visit-3",
      prescriptionNumber: "RX-2025-312",
      prescriptionDate: "2025-12-08T09:00:00Z",
      total: 8500,
      amountPaid: 8500,
      balanceDue: 0,
      status: "PAID",
      payments: [
        { id: "pp-3-1", amount: 8500, paymentMode: "UPI", paymentDate: "2025-12-08T10:00:00Z" },
      ],
    },
  ],
  labBills: [
    {
      id: "lab-1",
      billNumber: "LB-2026-001",
      createdAt: "2026-09-20T11:00:00Z",
      total: 2000,
      amountPaid: 2000,
      balanceDue: 0,
      status: "PAID",
      lab: { name: "Docsile Diagnostics" },
      payments: [
        { id: "lp-1-1", amount: 2000, paymentMode: "Cash", paymentDate: "2026-09-20T11:30:00Z" },
      ],
    },
    {
      id: "lab-2",
      billNumber: "LB-2025-298",
      createdAt: "2025-11-10T08:00:00Z",
      total: 3500,
      amountPaid: 3500,
      balanceDue: 0,
      status: "PAID",
      lab: { name: "Docsile Diagnostics" },
      payments: [
        { id: "lp-2-1", amount: 3500, paymentMode: "UPI", paymentDate: "2025-11-10T08:30:00Z" },
      ],
    },
  ],
  inpatient: {
    packageAmount: 28000,
    discount: 2000,
    netAmount: 26000,
    totalReceivedAmount: 26000,
    balanceAmount: 0,
    paymentRecords: JSON.stringify([
      { date: "2025-11-10", amount: 10000, mode: "Cash" },
      { date: "2025-11-12", amount: 16000, mode: "UPI" },
    ]),
  },
}

// ─── Export data (flat rows per export endpoint) ──────────────────────────────

export const exportPatients: ExportRow[] = [
  {
    patientId: "P-0001", firstName: "Ramesh", lastName: "Kumar", age: 58, gender: "Male",
    phone: "+919876543210", email: "ramesh.kumar@gmail.com",
    address: "42, Thiruvalluvar Street, Tambaram, Chennai", guardianName: null,
    referredBy: "Self", doctorName: "Dr. Anand Krishnan", department: "Ophthalmology",
    patientType: "OPD", status: "ACTIVE", appointmentDate: "2026-09-20", createdAt: "2024-01-15",
  },
  {
    patientId: "P-0002", firstName: "Priya", lastName: "Devi", age: 45, gender: "Female",
    phone: "+919944332211", email: "priyadevi@yahoo.com",
    address: "12, Anna Salai, Kancheepuram", guardianName: null,
    referredBy: "Dr. Anand Krishnan", doctorName: "Dr. Priya Sharma", department: "Ophthalmology",
    patientType: "IPD", status: "ACTIVE", appointmentDate: "2026-09-15", createdAt: "2024-03-10",
  },
  {
    patientId: "P-0003", firstName: "Suresh", lastName: "Iyer", age: 62, gender: "Male",
    phone: "+918765432109", email: null,
    address: "88, Rajaji Nagar, Vellore", guardianName: "Lakshmi Iyer",
    referredBy: "Diabetic Clinic", doctorName: "Dr. Meena Patel", department: "Retina",
    patientType: "OPD", status: "ACTIVE", appointmentDate: "2026-09-19", createdAt: "2023-08-20",
  },
]

export const exportPrescriptions: ExportRow[] = [
  {
    prescriptionNumber: "RX-2026-001", patientId: "P-0001", patientType: "OPD",
    doctorName: "Dr. Anand Krishnan", department: "Ophthalmology",
    diagnosis: "Post-cataract IOL assessment", presentComplaint: "Blurred vision",
    medicines: "Timolol 0.5%, Lubricant eye drops", investigations: "OCT Scan",
    subtotal: 500, discount: 0, total: 500, amountPaid: 0, balanceDue: 500,
    paymentMode: null, status: "PARTIAL", prescriptionDate: "2026-09-20", followUpDate: "2026-09-25",
  },
  {
    prescriptionNumber: "RX-2025-312", patientId: "P-0001", patientType: "OPD",
    doctorName: "Dr. Anand Krishnan", department: "Ophthalmology",
    diagnosis: "Posterior capsule opacification", presentComplaint: "Glare and halos",
    medicines: "Prednisolone Acetate 1%", investigations: "OCT Scan",
    subtotal: 8500, discount: 0, total: 8500, amountPaid: 8500, balanceDue: 0,
    paymentMode: "UPI", status: "PAID", prescriptionDate: "2025-12-08", followUpDate: "2026-01-15",
  },
]

export const exportEyeReadings: ExportRow[] = [
  {
    patientId: "P-0001", autoRefractometer: null, glassesReading: null,
    previousPrescription: null, presentPrescription: null, clinicalFindings: null,
    status: "COMPLETED", readingDate: "2026-09-20",
  },
]

export const exportInpatients: ExportRow[] = [
  {
    ipNumber: "IP-2025-0042", patientId: "P-0001", name: "Ramesh Kumar", age: 58, gender: "Male",
    phone: "+919876543210", department: "Ophthalmology", doctorNames: "Dr. Anand Krishnan",
    operationName: "Phacoemulsification with IOL implantation", operationDate: "2025-11-11",
    packageAmount: 28000, discount: 2000, netAmount: 26000, totalReceivedAmount: 26000,
    balanceAmount: 0, status: "DISCHARGED", bedNumber: "B-04", wardName: "General Ward A",
    admissionDate: "2025-11-10", dischargeDate: "2025-11-12",
  },
  {
    ipNumber: "IP-2026-0018", patientId: "P-0002", name: "Priya Devi", age: 45, gender: "Female",
    phone: "+919944332211", department: "Ophthalmology", doctorNames: "Dr. Priya Sharma",
    operationName: "Cataract Phacoemulsification LE", operationDate: "2026-09-16",
    packageAmount: 28000, discount: 0, netAmount: 28000, totalReceivedAmount: 20000,
    balanceAmount: 8000, status: "DISCHARGED", bedNumber: "C-02", wardName: "Semi-Private Ward",
    admissionDate: "2026-09-15", dischargeDate: "2026-09-17",
  },
]

export const exportInsuranceClaims: ExportRow[] = [
  {
    claimNumber: "CLM-2025-0001", patientName: "Meenakshi Sundaram", ipNumber: "IP-2025-0075",
    insuranceCompanyName: "United India Insurance", tpaName: "Vipul Medcorp",
    policyNumber: "UII-POL-2023-44821", packageAmount: 72000, totalBillAmount: 72000,
    preauthAmount: 65000, totalApprovedAmount: 60000, finalSettledAmount: 58000,
    patientPayableAmount: 14000, patientBalance: 14000, status: "SETTLED",
    admissionDate: "2026-09-05", dischargeDate: "2026-09-09",
  },
]

export const exportLabBills: ExportRow[] = [
  {
    billNumber: "LB-2026-001", labName: "Docsile Diagnostics", patientId: "P-0001",
    subtotal: 2200, discount: 200, total: 2000, amountPaid: 2000, balanceDue: 0,
    paymentMode: "Cash", status: "PAID", createdAt: "2026-09-20",
  },
  {
    billNumber: "LB-2026-088", labName: "Docsile Diagnostics", patientId: "P-0003",
    subtotal: 1800, discount: 0, total: 1800, amountPaid: 500, balanceDue: 1300,
    paymentMode: null, status: "PARTIAL", createdAt: "2026-09-19",
  },
]

export const exportPharmacyBills: ExportRow[] = [
  {
    billNumber: "PH-2026-211", patientName: "Kavitha Nair", patientPhone: "+917654321098",
    referredDoctor: "Dr. Meena Patel", subtotal: 2400, discountAmount: 0, gstAmount: 0,
    billAmount: 2400, paidAmount: 0, balanceDue: 2400, paymentMode: null,
    status: "PENDING", billDate: "2026-09-18",
  },
  {
    billNumber: "PH-2026-198", patientName: "Deepa Subramaniam", patientPhone: "+913210987654",
    referredDoctor: "Dr. Anand Krishnan", subtotal: 850, discountAmount: 0, gstAmount: 0,
    billAmount: 850, paidAmount: 400, balanceDue: 450, paymentMode: null,
    status: "PARTIAL", billDate: "2026-09-16",
  },
]

export const exportOpticalBills: ExportRow[] = [
  {
    billNumber: "OPT-2026-042", patientName: "Ramesh Kumar", patientPhone: "+919876543210",
    referredDoctor: "Dr. Anand Krishnan", subtotal: 4800, discountAmount: 0, gstAmount: 432,
    billAmount: 5232, paidAmount: 5232, balanceDue: 0, paymentMode: "UPI",
    status: "PAID", billDate: "2026-09-11",
  },
]

export const exportExpenses: ExportRow[] = [
  { title: "Surgical gloves and masks", category: "Medicines & Supplies", amount: 18500, date: "2026-09-20", reason: "Monthly procurement", paymentMode: "Bank Transfer", createdAt: "2026-09-20" },
  { title: "ECG machine servicing", category: "Equipment Maintenance", amount: 7200, date: "2026-09-18", reason: "Annual maintenance", paymentMode: "Cheque", createdAt: "2026-09-18" },
  { title: "September nursing staff salaries", category: "Staff Salaries", amount: 285000, date: "2026-09-15", reason: null, paymentMode: "Bank Transfer", createdAt: "2026-09-15" },
  { title: "Electricity bill — August", category: "Utilities", amount: 42000, date: "2026-09-12", reason: "TNEB commercial tariff", paymentMode: "Online", createdAt: "2026-09-12" },
  { title: "Floor cleaning materials", category: "Housekeeping", amount: 3800, date: "2026-09-10", reason: "Phenyl, mops, disinfectants", paymentMode: "Cash", createdAt: "2026-09-10" },
]
