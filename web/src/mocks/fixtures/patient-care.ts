/**
 * Mock fixture data for the Patient Care module.
 * Shapes match Patient / InPatient / DropdownOption / ServiceTemplate interfaces
 * in web/src/pages/patient-care/types.ts exactly.
 *
 * All arrays are `let` so handlers can mutate them in-memory.
 */

const HOSPITAL_ID = "mock-hospital-id"
const CREATED_BY = "mock-admin-id"

// ─── Local row types (mirrors the page types without cross-module import) ──────

interface PatientRow {
  id: string
  patientId: string
  firstName: string
  lastName: string
  phone: string
  email: string | null
  gender: string
  dateOfBirth: string | null
  address: string | null
  patientType: string
  appointmentDate: string
  status: string | null
  referredBy: string | null
  createdById: string | null
  hospitalId: string
  createdAt: string
  updatedAt: string
}

interface InPatientRow {
  id: string
  ipNumber: string
  patientId: string
  admissionDate: string
  dischargeDate: string | null
  status: string
  ward: string | null
  bedNumber: string | null
  onDutyDoctors: string
  paymentRecords: string
  prescriptions: string
  hospitalId: string
  createdById: string | null
  createdAt: string
  firstName?: string
  lastName?: string
  phone?: string
  gender?: string
}

// ─── Sequential ID counters ───────────────────────────────────────────────────

let _nextPatientSeq = 11
let _nextIpSeq = 6

export function getNextPatientId(): string {
  return `P-${String(_nextPatientSeq).padStart(4, "0")}`
}

export function getNextIpNumber(): string {
  return `IP-${String(_nextIpSeq).padStart(4, "0")}`
}

export function bumpPatientSeq(): void {
  _nextPatientSeq++
}

export function bumpIpSeq(): void {
  _nextIpSeq++
}

// ─── Patients (OPD) ───────────────────────────────────────────────────────────

export let patients: PatientRow[] = [
  {
    id: "pat-001",
    patientId: "P-0001",
    firstName: "Rajesh",
    lastName: "Kumar",
    phone: "+919876543210",
    email: "rajesh.kumar@gmail.com",
    gender: "Male",
    dateOfBirth: "1980-04-15",
    address: "12, MG Road, Bengaluru, Karnataka 560001",
    patientType: "OPD",
    appointmentDate: "2026-09-22T09:00:00+05:30",
    status: "REGISTERED",
    referredBy: null,
    createdById: CREATED_BY,
    hospitalId: HOSPITAL_ID,
    createdAt: "2026-09-22T08:45:00+05:30",
    updatedAt: "2026-09-22T08:45:00+05:30",
  },
  {
    id: "pat-002",
    patientId: "P-0002",
    firstName: "Priya",
    lastName: "Sharma",
    phone: "+919845678901",
    email: null,
    gender: "Female",
    dateOfBirth: "1995-07-22",
    address: "45, Anna Salai, Chennai, Tamil Nadu 600002",
    patientType: "OPD",
    appointmentDate: "2026-09-22T09:30:00+05:30",
    status: "IN_WORKUP",
    referredBy: "Dr. Anand Prakash",
    createdById: CREATED_BY,
    hospitalId: HOSPITAL_ID,
    createdAt: "2026-09-22T09:00:00+05:30",
    updatedAt: "2026-09-22T09:15:00+05:30",
  },
  {
    id: "pat-003",
    patientId: "P-0003",
    firstName: "Arun",
    lastName: "Singh",
    phone: "+917654321098",
    email: null,
    gender: "Male",
    dateOfBirth: "1972-11-03",
    address: "88, Civil Lines, Jaipur, Rajasthan 302006",
    patientType: "OPD",
    appointmentDate: "2026-09-22T10:00:00+05:30",
    status: "WORKUP_DONE",
    referredBy: null,
    createdById: CREATED_BY,
    hospitalId: HOSPITAL_ID,
    createdAt: "2026-09-22T09:30:00+05:30",
    updatedAt: "2026-09-22T10:05:00+05:30",
  },
  {
    id: "pat-004",
    patientId: "P-0004",
    firstName: "Meena",
    lastName: "Patel",
    phone: "+919123456789",
    email: "meena.patel@yahoo.in",
    gender: "Female",
    dateOfBirth: "1988-03-30",
    address: "23, Ashram Road, Ahmedabad, Gujarat 380009",
    patientType: "OPD",
    appointmentDate: "2026-09-22T10:30:00+05:30",
    status: "WITH_DOCTOR",
    referredBy: "Dr. Ramesh Iyer",
    createdById: CREATED_BY,
    hospitalId: HOSPITAL_ID,
    createdAt: "2026-09-22T10:00:00+05:30",
    updatedAt: "2026-09-22T10:35:00+05:30",
  },
  {
    id: "pat-005",
    patientId: "P-0005",
    firstName: "Suresh",
    lastName: "Reddy",
    phone: "+918976543210",
    email: null,
    gender: "Male",
    dateOfBirth: "1965-01-18",
    address: "7, Banjara Hills, Hyderabad, Telangana 500034",
    patientType: "OPD",
    appointmentDate: "2026-09-22T11:00:00+05:30",
    status: "VISITED",
    referredBy: null,
    createdById: CREATED_BY,
    hospitalId: HOSPITAL_ID,
    createdAt: "2026-09-22T10:30:00+05:30",
    updatedAt: "2026-09-22T11:20:00+05:30",
  },
  {
    id: "pat-006",
    patientId: "P-0006",
    firstName: "Anjali",
    lastName: "Nair",
    phone: "+919812345678",
    email: "anjali.nair@gmail.com",
    gender: "Female",
    dateOfBirth: "1992-09-05",
    address: "56, MG Road, Kochi, Kerala 682016",
    patientType: "OPD",
    appointmentDate: "2026-09-22T11:30:00+05:30",
    status: "COMPLETED",
    referredBy: null,
    createdById: CREATED_BY,
    hospitalId: HOSPITAL_ID,
    createdAt: "2026-09-22T11:00:00+05:30",
    updatedAt: "2026-09-22T12:00:00+05:30",
  },
  {
    id: "pat-007",
    patientId: "P-0007",
    firstName: "Vikram",
    lastName: "Mehta",
    phone: "+917891234560",
    email: null,
    gender: "Male",
    dateOfBirth: "1978-06-12",
    address: "34, Connaught Place, New Delhi 110001",
    patientType: "OPD",
    appointmentDate: "2026-09-22T12:00:00+05:30",
    status: "REGISTERED",
    referredBy: "Dr. Sunita Rao",
    createdById: CREATED_BY,
    hospitalId: HOSPITAL_ID,
    createdAt: "2026-09-22T11:30:00+05:30",
    updatedAt: "2026-09-22T11:30:00+05:30",
  },
  {
    id: "pat-008",
    patientId: "P-0008",
    firstName: "Kavitha",
    lastName: "Iyer",
    phone: "+919098765432",
    email: "kavitha.iyer@outlook.com",
    gender: "Female",
    dateOfBirth: "2001-02-28",
    address: "12, T. Nagar, Chennai, Tamil Nadu 600017",
    patientType: "OPD",
    appointmentDate: "2026-09-22T12:30:00+05:30",
    status: "IN_WORKUP",
    referredBy: null,
    createdById: CREATED_BY,
    hospitalId: HOSPITAL_ID,
    createdAt: "2026-09-22T12:00:00+05:30",
    updatedAt: "2026-09-22T12:15:00+05:30",
  },
  {
    id: "pat-009",
    patientId: "P-0009",
    firstName: "Ramesh",
    lastName: "Joshi",
    phone: "+918765432109",
    email: null,
    gender: "Male",
    dateOfBirth: "1955-12-20",
    address: "90, Linking Road, Mumbai, Maharashtra 400054",
    patientType: "Medical",
    appointmentDate: "2026-09-22T13:00:00+05:30",
    status: "MEDICAL_ONLY",
    referredBy: null,
    createdById: CREATED_BY,
    hospitalId: HOSPITAL_ID,
    createdAt: "2026-09-22T12:45:00+05:30",
    updatedAt: "2026-09-22T13:00:00+05:30",
  },
  {
    id: "pat-010",
    patientId: "P-0010",
    firstName: "Deepa",
    lastName: "Rao",
    phone: "+919654321087",
    email: "deepa.rao@gmail.com",
    gender: "Female",
    dateOfBirth: "1985-08-14",
    address: "15, Indiranagar, Bengaluru, Karnataka 560038",
    patientType: "OPD",
    appointmentDate: "2026-09-22T13:30:00+05:30",
    status: "REGISTERED",
    referredBy: "Dr. Anand Prakash",
    createdById: CREATED_BY,
    hospitalId: HOSPITAL_ID,
    createdAt: "2026-09-22T13:15:00+05:30",
    updatedAt: "2026-09-22T13:15:00+05:30",
  },
]

// ─── InPatients ───────────────────────────────────────────────────────────────

export let inpatients: InPatientRow[] = [
  {
    id: "ip-001",
    ipNumber: "IP-0001",
    patientId: "P-0001",
    admissionDate: "2026-09-18",
    dischargeDate: null,
    status: "admitted",
    ward: "Ward A",
    bedNumber: "A-3",
    onDutyDoctors: JSON.stringify(["Dr. Suresh Menon", "Dr. Priya Krishnan"]),
    paymentRecords: JSON.stringify([
      { mode: "Cash", amount: 5000, date: "2026-09-18" },
    ]),
    prescriptions: JSON.stringify([]),
    hospitalId: HOSPITAL_ID,
    createdById: CREATED_BY,
    createdAt: "2026-09-18T10:00:00+05:30",
    firstName: "Rajesh",
    lastName: "Kumar",
    phone: "+919876543210",
    gender: "Male",
  },
  {
    id: "ip-002",
    ipNumber: "IP-0002",
    patientId: "P-0003",
    admissionDate: "2026-09-19",
    dischargeDate: null,
    status: "admitted",
    ward: "Ward B",
    bedNumber: "B-1",
    onDutyDoctors: JSON.stringify(["Dr. Anand Prakash"]),
    paymentRecords: JSON.stringify([]),
    prescriptions: JSON.stringify([]),
    hospitalId: HOSPITAL_ID,
    createdById: CREATED_BY,
    createdAt: "2026-09-19T11:00:00+05:30",
    firstName: "Arun",
    lastName: "Singh",
    phone: "+917654321098",
    gender: "Male",
  },
  {
    id: "ip-003",
    ipNumber: "IP-0003",
    patientId: "P-0005",
    admissionDate: "2026-09-20",
    dischargeDate: null,
    status: "admitted",
    ward: "ICU",
    bedNumber: "ICU-2",
    onDutyDoctors: JSON.stringify(["Dr. Ramesh Iyer", "Dr. Sunita Rao"]),
    paymentRecords: JSON.stringify([
      { mode: "UPI", amount: 15000, date: "2026-09-20" },
    ]),
    prescriptions: JSON.stringify([]),
    hospitalId: HOSPITAL_ID,
    createdById: CREATED_BY,
    createdAt: "2026-09-20T08:30:00+05:30",
    firstName: "Suresh",
    lastName: "Reddy",
    phone: "+918976543210",
    gender: "Male",
  },
  {
    id: "ip-004",
    ipNumber: "IP-0004",
    patientId: "P-0007",
    admissionDate: "2026-09-21",
    dischargeDate: null,
    status: "admitted",
    ward: "Ward A",
    bedNumber: "A-5",
    onDutyDoctors: JSON.stringify(["Dr. Sunita Rao"]),
    paymentRecords: JSON.stringify([]),
    prescriptions: JSON.stringify([]),
    hospitalId: HOSPITAL_ID,
    createdById: CREATED_BY,
    createdAt: "2026-09-21T14:00:00+05:30",
    firstName: "Vikram",
    lastName: "Mehta",
    phone: "+917891234560",
    gender: "Male",
  },
  {
    id: "ip-005",
    ipNumber: "IP-0005",
    patientId: "P-0008",
    admissionDate: "2026-09-22",
    dischargeDate: null,
    status: "admitted",
    ward: "Ward C",
    bedNumber: "C-1",
    onDutyDoctors: JSON.stringify(["Dr. Priya Krishnan"]),
    paymentRecords: JSON.stringify([]),
    prescriptions: JSON.stringify([]),
    hospitalId: HOSPITAL_ID,
    createdById: CREATED_BY,
    createdAt: "2026-09-22T08:00:00+05:30",
    firstName: "Kavitha",
    lastName: "Iyer",
    phone: "+919098765432",
    gender: "Female",
  },
]

// ─── Service templates ─────────────────────────────────────────────────────────

export const serviceTemplates = [
  { id: "svc-001", name: "OPD Consultation", amount: 500, category: "Consultation" },
  { id: "svc-002", name: "Eye Examination", amount: 300, category: "Examination" },
  { id: "svc-003", name: "Refraction", amount: 200, category: "Examination" },
  { id: "svc-004", name: "Slit Lamp Examination", amount: 400, category: "Examination" },
  { id: "svc-005", name: "Fundus Examination", amount: 600, category: "Examination" },
  { id: "svc-006", name: "IOP Measurement", amount: 150, category: "Examination" },
  { id: "svc-007", name: "Visual Field Test", amount: 800, category: "Diagnostic" },
  { id: "svc-008", name: "OCT Scan", amount: 1500, category: "Diagnostic" },
]

// ─── Dropdown options ─────────────────────────────────────────────────────────

export const dropdownOptions = [
  { id: "do-001", fieldName: "patientType", value: "OPD", hospitalId: HOSPITAL_ID },
  { id: "do-002", fieldName: "patientType", value: "Medical", hospitalId: HOSPITAL_ID },
  { id: "do-003", fieldName: "patientType", value: "Follow-up", hospitalId: HOSPITAL_ID },
  { id: "do-004", fieldName: "patientType", value: "Post-op", hospitalId: HOSPITAL_ID },
  { id: "do-005", fieldName: "referredBy", value: "Dr. Anand Prakash", hospitalId: HOSPITAL_ID },
  { id: "do-006", fieldName: "referredBy", value: "Dr. Ramesh Iyer", hospitalId: HOSPITAL_ID },
  { id: "do-007", fieldName: "referredBy", value: "Dr. Sunita Rao", hospitalId: HOSPITAL_ID },
  { id: "do-008", fieldName: "referredBy", value: "Dr. Priya Krishnan", hospitalId: HOSPITAL_ID },
  { id: "do-009", fieldName: "referredBy", value: "Dr. Suresh Menon", hospitalId: HOSPITAL_ID },
]

// ─── Form reference data ──────────────────────────────────────────────────────

export const registrationFormData = {
  serviceTemplates,
  patientTypes: ["OPD", "Medical", "Follow-up", "Post-op"],
  referralSources: [
    "Dr. Anand Prakash",
    "Dr. Ramesh Iyer",
    "Dr. Sunita Rao",
    "Dr. Priya Krishnan",
    "Dr. Suresh Menon",
  ],
}

export const admissionFormData = {
  wards: ["Ward A", "Ward B", "Ward C", "ICU", "Semi-Private", "Private"],
  surgeryTypes: [
    "Cataract Surgery",
    "Glaucoma Surgery",
    "Retinal Detachment Repair",
    "Corneal Transplant",
    "Squint Correction",
    "DCR Surgery",
  ],
  doctors: [
    "Dr. Suresh Menon",
    "Dr. Priya Krishnan",
    "Dr. Anand Prakash",
    "Dr. Ramesh Iyer",
    "Dr. Sunita Rao",
  ],
}
