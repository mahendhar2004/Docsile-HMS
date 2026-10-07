/**
 * Mock fixture data for the Doctor module.
 * Shapes match DoctorQueuePatient / ConsultationPatient / ReferenceData interfaces
 * in web/src/pages/doctor/types.ts exactly.
 *
 * PrescriptionRecord.medicines / investigations are JSON-encoded strings.
 */

// ─── Local row types ─────────────────────────────────────────────────────────

interface QueuePrescriptionRow {
  id: string
  prescriptionDate: string
  status: string
  doctorName: string | null
  createdAt: string
}

interface DoctorQueueRow {
  id: string
  patientId: string
  firstName: string
  lastName: string
  phone: string
  gender: string
  patientType: string
  appointmentDate: string
  status: string
  referredBy: string | null
  eyeReadings: Array<{ id: string; readingDate: string; createdAt: string }>
  prescriptions: QueuePrescriptionRow[]
}

interface PrescriptionRow {
  id: string
  patientId: string
  patientType: string
  status: string
  doctorId: string | null
  doctorName: string | null
  department: string | null
  temperature: number | null
  pulseRate: number | null
  spo2: number | null
  heightCm: number | null
  weightKg: number | null
  presentComplaint: string | null
  previousHistory: string | null
  diagnosis: string | null
  additionalNotes: string | null
  medicines: string | null
  investigations: string | null
  followUpDate: string | null
  notes: string | null
  prescriptionDate: string
  createdAt: string
  updatedAt: string
}

interface MedicineRow {
  id: string
  name: string
  defaultTiming: string | null
  defaultDays: string | null
  category: string | null
  note: string | null
  hospitalId: string
}

// ─── Doctor queue ─────────────────────────────────────────────────────────────

export let doctorQueue: DoctorQueueRow[] = [
  {
    id: "pat-001",
    patientId: "P-0001",
    firstName: "Rajesh",
    lastName: "Kumar",
    phone: "+919876543210",
    gender: "Male",
    patientType: "OPD",
    appointmentDate: "2026-09-22T09:00:00+05:30",
    status: "REGISTERED",
    referredBy: null,
    eyeReadings: [],
    prescriptions: [],
  },
  {
    id: "pat-002",
    patientId: "P-0002",
    firstName: "Priya",
    lastName: "Sharma",
    phone: "+919845678901",
    gender: "Female",
    patientType: "OPD",
    appointmentDate: "2026-09-22T09:30:00+05:30",
    status: "IN_WORKUP",
    referredBy: "Dr. Anand Prakash",
    eyeReadings: [
      { id: "er-002", readingDate: "2026-09-22", createdAt: "2026-09-22T09:15:00+05:30" },
    ],
    prescriptions: [],
  },
  {
    id: "pat-003",
    patientId: "P-0003",
    firstName: "Arun",
    lastName: "Singh",
    phone: "+917654321098",
    gender: "Male",
    patientType: "OPD",
    appointmentDate: "2026-09-22T10:00:00+05:30",
    status: "WORKUP_DONE",
    referredBy: null,
    eyeReadings: [
      { id: "er-003", readingDate: "2026-09-22", createdAt: "2026-09-22T10:05:00+05:30" },
    ],
    prescriptions: [],
  },
  {
    id: "pat-004",
    patientId: "P-0004",
    firstName: "Meena",
    lastName: "Patel",
    phone: "+919123456789",
    gender: "Female",
    patientType: "OPD",
    appointmentDate: "2026-09-22T10:30:00+05:30",
    status: "WITH_DOCTOR",
    referredBy: "Dr. Ramesh Iyer",
    eyeReadings: [
      { id: "er-004", readingDate: "2026-09-22", createdAt: "2026-09-22T10:35:00+05:30" },
    ],
    prescriptions: [],
  },
  {
    id: "pat-005",
    patientId: "P-0005",
    firstName: "Suresh",
    lastName: "Reddy",
    phone: "+918976543210",
    gender: "Male",
    patientType: "OPD",
    appointmentDate: "2026-09-22T11:00:00+05:30",
    status: "VISITED",
    referredBy: null,
    eyeReadings: [
      { id: "er-005", readingDate: "2026-09-22", createdAt: "2026-09-22T10:55:00+05:30" },
    ],
    prescriptions: [
      {
        id: "rx-005",
        prescriptionDate: "2026-09-22",
        status: "ACTIVE",
        doctorName: "Dr. Suresh Menon",
        createdAt: "2026-09-22T11:20:00+05:30",
      },
    ],
  },
  {
    id: "pat-006",
    patientId: "P-0006",
    firstName: "Anjali",
    lastName: "Nair",
    phone: "+919812345678",
    gender: "Female",
    patientType: "OPD",
    appointmentDate: "2026-09-22T11:30:00+05:30",
    status: "COMPLETED",
    referredBy: null,
    eyeReadings: [
      { id: "er-006", readingDate: "2026-09-22", createdAt: "2026-09-22T11:35:00+05:30" },
    ],
    prescriptions: [
      {
        id: "rx-006",
        prescriptionDate: "2026-09-22",
        status: "ACTIVE",
        doctorName: "Dr. Suresh Menon",
        createdAt: "2026-09-22T12:00:00+05:30",
      },
    ],
  },
  {
    id: "pat-007",
    patientId: "P-0007",
    firstName: "Vikram",
    lastName: "Mehta",
    phone: "+917891234560",
    gender: "Male",
    patientType: "OPD",
    appointmentDate: "2026-09-22T12:00:00+05:30",
    status: "REGISTERED",
    referredBy: "Dr. Sunita Rao",
    eyeReadings: [],
    prescriptions: [],
  },
  {
    id: "pat-008",
    patientId: "P-0008",
    firstName: "Kavitha",
    lastName: "Iyer",
    phone: "+919098765432",
    gender: "Female",
    patientType: "OPD",
    appointmentDate: "2026-09-22T12:30:00+05:30",
    status: "IN_WORKUP",
    referredBy: null,
    eyeReadings: [
      { id: "er-008", readingDate: "2026-09-22", createdAt: "2026-09-22T12:15:00+05:30" },
    ],
    prescriptions: [],
  },
  {
    id: "pat-009",
    patientId: "P-0009",
    firstName: "Ramesh",
    lastName: "Joshi",
    phone: "+918765432109",
    gender: "Male",
    patientType: "Medical",
    appointmentDate: "2026-09-22T13:00:00+05:30",
    status: "MEDICAL_ONLY",
    referredBy: null,
    eyeReadings: [],
    prescriptions: [
      {
        id: "rx-009",
        prescriptionDate: "2026-09-22",
        status: "ACTIVE",
        doctorName: "Dr. Priya Krishnan",
        createdAt: "2026-09-22T13:00:00+05:30",
      },
    ],
  },
  {
    id: "pat-010",
    patientId: "P-0010",
    firstName: "Deepa",
    lastName: "Rao",
    phone: "+919654321087",
    gender: "Female",
    patientType: "OPD",
    appointmentDate: "2026-09-22T13:30:00+05:30",
    status: "REGISTERED",
    referredBy: "Dr. Anand Prakash",
    eyeReadings: [],
    prescriptions: [],
  },
]

// ─── Prescription records (in-memory, mutable) ─────────────────────────────────

export let prescriptionRecords: PrescriptionRow[] = [
  {
    id: "rx-005",
    patientId: "P-0005",
    patientType: "OPD",
    status: "ACTIVE",
    doctorId: null,
    doctorName: "Dr. Suresh Menon",
    department: "Ophthalmology",
    temperature: 37.2,
    pulseRate: 78,
    spo2: 98,
    heightCm: 172,
    weightKg: 74,
    presentComplaint: "Blurred vision, especially for distance",
    previousHistory: "Hypertension — controlled on medication",
    diagnosis: "Myopia OD and OS",
    additionalNotes: null,
    medicines: JSON.stringify([
      { name: "Carboxymethylcellulose 0.5% Eye Drops", days: "30", timing: "TID", note: "1 drop each eye" },
      { name: "Refresh Tears", days: "15", timing: "PRN", note: "" },
    ]),
    investigations: JSON.stringify([]),
    followUpDate: "2026-10-22",
    notes: "Advised glasses correction. Recheck in 1 month.",
    prescriptionDate: "2026-09-22",
    createdAt: "2026-09-22T11:20:00+05:30",
    updatedAt: "2026-09-22T11:25:00+05:30",
  },
  {
    id: "rx-006",
    patientId: "P-0006",
    patientType: "OPD",
    status: "ACTIVE",
    doctorId: null,
    doctorName: "Dr. Suresh Menon",
    department: "Ophthalmology",
    temperature: 36.8,
    pulseRate: 72,
    spo2: 99,
    heightCm: 158,
    weightKg: 55,
    presentComplaint: "Redness and itching in both eyes",
    previousHistory: "Allergic rhinitis",
    diagnosis: "Allergic conjunctivitis",
    additionalNotes: null,
    medicines: JSON.stringify([
      { name: "Olopatadine 0.1% Eye Drops", days: "14", timing: "BID", note: "1 drop each eye" },
      { name: "Naphazoline + Pheniramine Eye Drops", days: "7", timing: "QID", note: "1 drop each eye as needed" },
    ]),
    investigations: JSON.stringify([]),
    followUpDate: "2026-10-06",
    notes: "Avoid rubbing eyes. Cold compresses for relief.",
    prescriptionDate: "2026-09-22",
    createdAt: "2026-09-22T12:00:00+05:30",
    updatedAt: "2026-09-22T12:05:00+05:30",
  },
  {
    id: "rx-009",
    patientId: "P-0009",
    patientType: "Medical",
    status: "ACTIVE",
    doctorId: null,
    doctorName: "Dr. Priya Krishnan",
    department: "Ophthalmology",
    temperature: 37.0,
    pulseRate: 82,
    spo2: 97,
    heightCm: 165,
    weightKg: 80,
    presentComplaint: "Dry eyes — burning sensation",
    previousHistory: "Diabetes Type 2, Hypertension",
    diagnosis: "Dry Eye Syndrome",
    additionalNotes: "Monitor blood sugar levels",
    medicines: JSON.stringify([
      { name: "Sodium Hyaluronate 0.18% Eye Drops", days: "30", timing: "QID", note: "" },
    ]),
    investigations: JSON.stringify([{ name: "Schirmer Test", note: "Both eyes" }]),
    followUpDate: "2026-10-22",
    notes: "Lifestyle modifications — reduce screen time.",
    prescriptionDate: "2026-09-22",
    createdAt: "2026-09-22T13:00:00+05:30",
    updatedAt: "2026-09-22T13:05:00+05:30",
  },
]

let _rxSeq = 10

export function nextPrescriptionId(): string {
  return `rx-${String(_rxSeq++).padStart(3, "0")}`
}

// ─── Consultation data by sequential display patientId ─────────────────────────
// Keyed by patientId (e.g. "P-0001"), matching the real backend's
// GET /doctor/patients/{patientId}/consultation convention — NOT the
// internal UUID `id` this previously (incorrectly) matched on, which
// masked a real patientId-vs-UUID bug in the frontend.

export function buildConsultation(patientId: string) {
  const queueEntry = doctorQueue.find((p) => p.patientId === patientId)
  if (!queueEntry) return null

  const todayRx = prescriptionRecords.find(
    (rx) => rx.patientId === patientId && rx.prescriptionDate === "2026-09-22",
  ) ?? null

  const pastRx = prescriptionRecords.filter(
    (rx) => rx.patientId === patientId && rx.prescriptionDate !== "2026-09-22",
  )

  const allRx = prescriptionRecords.filter((rx) => rx.patientId === patientId)

  // Build ConsultationEyeReading[] from the queue entry's eyeReadings
  const consultEyeReadings = queueEntry.eyeReadings.map((er) => ({
    id: er.id,
    readingDate: er.readingDate,
    autoRefractometer: null as string | null,
    presentPrescription: null as string | null,
    clinicalFindings: null as string | null,
    createdAt: er.createdAt,
  }))

  return {
    id: queueEntry.id,
    patientId: queueEntry.patientId,
    firstName: queueEntry.firstName,
    lastName: queueEntry.lastName,
    phone: queueEntry.phone,
    gender: queueEntry.gender,
    dateOfBirth: null as string | null,
    patientType: queueEntry.patientType,
    status: queueEntry.status,
    appointmentDate: queueEntry.appointmentDate,
    referredBy: queueEntry.referredBy ?? null,
    eyeReadings: consultEyeReadings,
    prescriptions: allRx,
    todayPrescription: todayRx,
    pastPrescriptions: pastRx,
  }
}

// ─── Reference data ───────────────────────────────────────────────────────────

export let medicines: MedicineRow[] = [
  { id: "med-001", name: "Carboxymethylcellulose 0.5% Eye Drops", defaultTiming: "TID", defaultDays: "30", category: "Lubricants", note: "1 drop each eye", hospitalId: "mock-hospital-id" },
  { id: "med-002", name: "Sodium Hyaluronate 0.18% Eye Drops", defaultTiming: "QID", defaultDays: "30", category: "Lubricants", note: "", hospitalId: "mock-hospital-id" },
  { id: "med-003", name: "Olopatadine 0.1% Eye Drops", defaultTiming: "BID", defaultDays: "14", category: "Antihistamines", note: "1 drop each eye", hospitalId: "mock-hospital-id" },
  { id: "med-004", name: "Timolol 0.5% Eye Drops", defaultTiming: "BID", defaultDays: "30", category: "Anti-glaucoma", note: "", hospitalId: "mock-hospital-id" },
  { id: "med-005", name: "Latanoprost 0.005% Eye Drops", defaultTiming: "OD", defaultDays: "30", category: "Anti-glaucoma", note: "Apply at night", hospitalId: "mock-hospital-id" },
  { id: "med-006", name: "Tobramycin 0.3% Eye Drops", defaultTiming: "QID", defaultDays: "7", category: "Antibiotics", note: "", hospitalId: "mock-hospital-id" },
  { id: "med-007", name: "Prednisolone 1% Eye Drops", defaultTiming: "QID", defaultDays: "7", category: "Steroids", note: "Taper as directed", hospitalId: "mock-hospital-id" },
  { id: "med-008", name: "Moxifloxacin 0.5% Eye Drops", defaultTiming: "TID", defaultDays: "5", category: "Antibiotics", note: "", hospitalId: "mock-hospital-id" },
  { id: "med-009", name: "Atropine 1% Eye Drops", defaultTiming: "OD", defaultDays: "5", category: "Mydriatics", note: "Caution: blurred vision", hospitalId: "mock-hospital-id" },
  { id: "med-010", name: "Refresh Tears", defaultTiming: "PRN", defaultDays: "30", category: "Lubricants", note: "", hospitalId: "mock-hospital-id" },
  { id: "med-011", name: "Naphazoline + Pheniramine Eye Drops", defaultTiming: "QID", defaultDays: "7", category: "Decongestants", note: "", hospitalId: "mock-hospital-id" },
  { id: "med-012", name: "Vitamin C 500mg Tablet", defaultTiming: "OD", defaultDays: "30", category: "Supplements", note: "After food", hospitalId: "mock-hospital-id" },
]

let _medSeq = 13

export function nextMedicineId(): string {
  return `med-${String(_medSeq++).padStart(3, "0")}`
}

export const referenceData = {
  medicines,
  investigations: [
    "Schirmer Test",
    "Corneal Topography",
    "Optical Coherence Tomography (OCT)",
    "Visual Field Test (Perimetry)",
    "Fluorescein Angiography",
    "B-Scan Ultrasound",
    "Gonioscopy",
    "Pachymetry",
    "HbA1c",
    "Complete Blood Count",
    "Blood Pressure",
    "Fasting Blood Sugar",
  ],
  complaintOptions: [
    "Blurred vision",
    "Redness of eyes",
    "Watering of eyes",
    "Itching in eyes",
    "Pain in eyes",
    "Foreign body sensation",
    "Photophobia",
    "Floaters",
    "Double vision",
    "Headache",
    "Difficulty reading",
    "Dry eyes",
  ],
  previousHistoryOptions: [
    "Diabetes Type 2",
    "Hypertension",
    "Cataract surgery",
    "Glaucoma",
    "Allergic rhinitis",
    "Thyroid disorder",
    "Myopia",
    "Hyperopia",
    "Astigmatism",
    "No significant history",
  ],
  diagnosisOptions: [
    "Myopia",
    "Hyperopia",
    "Astigmatism",
    "Presbyopia",
    "Cataract",
    "Glaucoma",
    "Diabetic Retinopathy",
    "Age-related Macular Degeneration",
    "Dry Eye Syndrome",
    "Allergic Conjunctivitis",
    "Blepharitis",
    "Corneal Ulcer",
    "Pterygium",
    "Retinal Detachment",
  ],
  additionalNotesOptions: [
    "Advised glasses correction",
    "Review after 1 month",
    "Avoid rubbing eyes",
    "Reduce screen time",
    "Use lubricating drops frequently",
    "Follow up if symptoms worsen",
    "Lifestyle modifications advised",
    "Monitor blood sugar",
  ],
  templates: [
    {
      id: "tpl-001",
      code: "DRY-EYE",
      name: "Dry Eye Protocol",
      medicines: JSON.stringify([
        { name: "Sodium Hyaluronate 0.18% Eye Drops", days: "30", timing: "QID", note: "" },
        { name: "Carboxymethylcellulose 0.5% Eye Drops", days: "30", timing: "TID", note: "At night" },
      ]),
      investigations: JSON.stringify([{ name: "Schirmer Test", note: "Both eyes" }]),
      presentComplaint: "Dry eyes — burning sensation",
      previousHistory: null,
      provisionalDiagnosis: "Dry Eye Syndrome",
      additionalNotes: "Lifestyle modifications — reduce screen time.",
      followUpDays: 30,
      hospitalId: "mock-hospital-id",
    },
    {
      id: "tpl-002",
      code: "ALLERGY",
      name: "Allergic Conjunctivitis Protocol",
      medicines: JSON.stringify([
        { name: "Olopatadine 0.1% Eye Drops", days: "14", timing: "BID", note: "1 drop each eye" },
      ]),
      investigations: JSON.stringify([]),
      presentComplaint: "Redness and itching in both eyes",
      previousHistory: null,
      provisionalDiagnosis: "Allergic Conjunctivitis",
      additionalNotes: "Avoid rubbing eyes.",
      followUpDays: 14,
      hospitalId: "mock-hospital-id",
    },
    {
      id: "tpl-003",
      code: "MYOPIA",
      name: "Myopia Management",
      medicines: JSON.stringify([
        { name: "Carboxymethylcellulose 0.5% Eye Drops", days: "30", timing: "TID", note: "1 drop each eye" },
      ]),
      investigations: JSON.stringify([]),
      presentComplaint: "Blurred vision for distance",
      previousHistory: null,
      provisionalDiagnosis: "Myopia",
      additionalNotes: "Advised glasses correction.",
      followUpDays: 30,
      hospitalId: "mock-hospital-id",
    },
  ],
}

// ─── Doctor dropdown options ───────────────────────────────────────────────────

export let doctorDropdownOptions: Array<{ fieldName: string; value: string }> = [
  { fieldName: "complaintOptions", value: "Blurred vision" },
  { fieldName: "complaintOptions", value: "Redness of eyes" },
  { fieldName: "diagnosisOptions", value: "Myopia" },
  { fieldName: "diagnosisOptions", value: "Dry Eye Syndrome" },
]
