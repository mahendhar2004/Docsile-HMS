/**
 * Mock fixture data for the Workup module.
 * Shapes match WorkupQueuePatient / WorkupPatient / EyeReadingRecord interfaces
 * in web/src/pages/workup/types.ts exactly.
 *
 * Eye reading JSON fields use the exact structures defined by the factory helpers
 * (emptyARSection, emptyDNSection, emptySRSection, emptyCFSection) in types.ts.
 */

const HOSPITAL_ID = "mock-hospital-id"

// ─── Sample eye reading JSON sections ─────────────────────────────────────────

const SAMPLE_AR = JSON.stringify({
  re: { sph: "-1.25", cyl: "-0.50", axis: "90", va: "6/9", vacph: "6/6" },
  le: { sph: "-1.00", cyl: "-0.25", axis: "85", va: "6/9", vacph: "6/6" },
  pd: "64",
})

const SAMPLE_PGP = JSON.stringify({
  re: {
    d: { sph: "-1.00", cyl: "-0.50", axis: "90", va: "6/12" },
    n: { sph: "+1.50", cyl: "-0.50", axis: "90", va: "N8" },
  },
  le: {
    d: { sph: "-0.75", cyl: "-0.25", axis: "85", va: "6/12" },
    n: { sph: "+1.50", cyl: "-0.25", axis: "85", va: "N8" },
  },
})

const SAMPLE_SR = JSON.stringify({
  re: {
    d: { sph: "-1.25", cyl: "-0.50", axis: "90", va: "6/9" },
    n: { sph: "+1.00", cyl: "-0.50", axis: "90", va: "N6" },
  },
  le: {
    d: { sph: "-1.00", cyl: "-0.25", axis: "85", va: "6/9" },
    n: { sph: "+1.00", cyl: "-0.25", axis: "85", va: "N6" },
  },
  sightType: "Distant/Near",
})

const SAMPLE_CF = JSON.stringify({
  re: {
    lids: "Normal",
    sac: "Clear",
    conjunctiva: "Clear",
    cornea: "Clear",
    ac: "Deep",
    iris: "Normal",
    pupil: "RAPD-",
    lens: "Clear",
    vitreous: "Clear",
    iop: "14",
    iopMethod: "NCT",
    fundus: "Normal",
    cdr: "0.3",
  },
  le: {
    lids: "Normal",
    sac: "Clear",
    conjunctiva: "Clear",
    cornea: "Clear",
    ac: "Deep",
    iris: "Normal",
    pupil: "RAPD-",
    lens: "Clear",
    vitreous: "Clear",
    iop: "15",
    iopMethod: "NCT",
    fundus: "Normal",
    cdr: "0.3",
  },
})

// ─── Completed eye reading records ─────────────────────────────────────────────

export const eyeReadingRecords: Record<string, {
  id: string
  patientId: string
  prescriptionId: string | null
  readingDate: string
  autoRefractometer: string | null
  glassesReading: string | null
  previousPrescription: string | null
  presentPrescription: string | null
  clinicalFindings: string | null
  createdById: string | null
  hospitalId: string
  createdAt: string
}> = {
  "P-0003": {
    id: "er-003",
    patientId: "P-0003",
    prescriptionId: null,
    readingDate: "2026-09-22",
    autoRefractometer: SAMPLE_AR,
    glassesReading: null,
    previousPrescription: SAMPLE_PGP,
    presentPrescription: SAMPLE_SR,
    clinicalFindings: SAMPLE_CF,
    createdById: "mock-admin-id",
    hospitalId: HOSPITAL_ID,
    createdAt: "2026-09-22T10:05:00+05:30",
  },
  "P-0005": {
    id: "er-005",
    patientId: "P-0005",
    prescriptionId: null,
    readingDate: "2026-09-22",
    autoRefractometer: SAMPLE_AR,
    glassesReading: null,
    previousPrescription: null,
    presentPrescription: SAMPLE_SR,
    clinicalFindings: SAMPLE_CF,
    createdById: "mock-admin-id",
    hospitalId: HOSPITAL_ID,
    createdAt: "2026-09-22T10:55:00+05:30",
  },
}

// ─── Workup queue patients ─────────────────────────────────────────────────────

function ageFromDob(dob: string): number {
  const birth = new Date(dob)
  const today = new Date("2026-09-22")
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

export const workupQueuePatients = [
  {
    patientId: "P-0001",
    name: "Rajesh Kumar",
    age: ageFromDob("1980-04-15"),
    gender: "Male",
    phone: "+919876543210",
    appointmentDate: "2026-09-22",
    status: "REGISTERED",
    eyeReadings: [],
    prescriptions: [],
  },
  {
    patientId: "P-0002",
    name: "Priya Sharma",
    age: ageFromDob("1995-07-22"),
    gender: "Female",
    phone: "+919845678901",
    appointmentDate: "2026-09-22",
    status: "IN_WORKUP",
    eyeReadings: [
      {
        id: "er-002",
        patientId: "P-0002",
        prescriptionId: null,
        readingDate: "2026-09-22",
        autoRefractometer: SAMPLE_AR,
        glassesReading: null,
        previousPrescription: null,
        presentPrescription: null,
        clinicalFindings: null,
        createdById: "mock-admin-id",
        hospitalId: HOSPITAL_ID,
        createdAt: "2026-09-22T09:15:00+05:30",
      },
    ],
    prescriptions: [],
  },
  {
    patientId: "P-0003",
    name: "Arun Singh",
    age: ageFromDob("1972-11-03"),
    gender: "Male",
    phone: "+917654321098",
    appointmentDate: "2026-09-22",
    status: "WORKUP_DONE",
    eyeReadings: [eyeReadingRecords["P-0003"]],
    prescriptions: [],
  },
  {
    patientId: "P-0007",
    name: "Vikram Mehta",
    age: ageFromDob("1978-06-12"),
    gender: "Male",
    phone: "+917891234560",
    appointmentDate: "2026-09-22",
    status: "REGISTERED",
    eyeReadings: [],
    prescriptions: [],
  },
  {
    patientId: "P-0008",
    name: "Kavitha Iyer",
    age: ageFromDob("2001-02-28"),
    gender: "Female",
    phone: "+919098765432",
    appointmentDate: "2026-09-22",
    status: "IN_WORKUP",
    eyeReadings: [
      {
        id: "er-008",
        patientId: "P-0008",
        prescriptionId: null,
        readingDate: "2026-09-22",
        autoRefractometer: SAMPLE_AR,
        glassesReading: null,
        previousPrescription: null,
        presentPrescription: null,
        clinicalFindings: null,
        createdById: "mock-admin-id",
        hospitalId: HOSPITAL_ID,
        createdAt: "2026-09-22T12:15:00+05:30",
      },
    ],
    prescriptions: [],
  },
  {
    patientId: "P-0010",
    name: "Deepa Rao",
    age: ageFromDob("1985-08-14"),
    gender: "Female",
    phone: "+919654321087",
    appointmentDate: "2026-09-22",
    status: "REGISTERED",
    eyeReadings: [],
    prescriptions: [],
  },
]

// ─── Per-patient workup detail (same shape, keyed by patientId) ───────────────

export const workupPatientDetail: Record<string, typeof workupQueuePatients[0]> = {
  "P-0001": workupQueuePatients[0],
  "P-0002": workupQueuePatients[1],
  "P-0003": workupQueuePatients[2],
  "P-0007": workupQueuePatients[3],
  "P-0008": workupQueuePatients[4],
  "P-0010": workupQueuePatients[5],
}

// ─── In-memory eye reading counter ────────────────────────────────────────────

let _erSeq = 20

export function nextEyeReadingId(): string {
  return `er-${String(_erSeq++).padStart(3, "0")}`
}
