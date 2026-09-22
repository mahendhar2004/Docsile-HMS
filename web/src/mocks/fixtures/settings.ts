/**
 * Mock fixture data for the Settings module.
 * Covers all 10 sub-scopes (33 endpoints total).
 */

import type {
  ServiceTemplate,
  HospitalProfile,
  PrescriptionTemplate,
  InpatientTemplate,
  PredefinedPackage,
  PredefinedSurgery,
  PredefinedDischarge,
  MedicineMaster,
} from "@/pages/settings/types"

let _seq = 1
export function uid(prefix = "set"): string {
  return `${prefix}-${String(_seq++).padStart(4, "0")}`
}

// ─── Service Templates ─────────────────────────────────────────────────────────

export let serviceTemplates: ServiceTemplate[] = [
  { id: "svc-001", name: "General Consultation", category: "Consultation", description: "Standard OPD consultation", amount: 500, discount: 0, sortOrder: 1, isActive: true, hospitalId: "mock-hospital-id", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: "svc-002", name: "Senior Doctor Consultation", category: "Consultation", description: "Consultation with HOD", amount: 800, discount: 0, sortOrder: 2, isActive: true, hospitalId: "mock-hospital-id", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: "svc-003", name: "Follow-up Consultation", category: "Consultation", description: "Follow-up within 15 days", amount: 250, discount: 0, sortOrder: 3, isActive: true, hospitalId: "mock-hospital-id", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: "svc-004", name: "Visual Acuity Test", category: "Diagnostic", description: "Distance and near vision", amount: 100, discount: 0, sortOrder: 4, isActive: true, hospitalId: "mock-hospital-id", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: "svc-005", name: "Slit Lamp Examination", category: "Diagnostic", description: "Anterior segment exam", amount: 200, discount: 0, sortOrder: 5, isActive: true, hospitalId: "mock-hospital-id", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: "svc-006", name: "IOP Measurement", category: "Diagnostic", description: "Goldmann Applanation Tonometry", amount: 150, discount: 0, sortOrder: 6, isActive: true, hospitalId: "mock-hospital-id", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: "svc-007", name: "OCT Scan - Macula", category: "Diagnostic", description: "Optical Coherence Tomography - macular", amount: 800, discount: 0, sortOrder: 7, isActive: true, hospitalId: "mock-hospital-id", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: "svc-008", name: "Fundus Photography", category: "Diagnostic", description: "Colour fundus photo both eyes", amount: 400, discount: 0, sortOrder: 8, isActive: true, hospitalId: "mock-hospital-id", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: "svc-009", name: "Phacoemulsification (Cataract)", category: "Procedure", description: "Cataract extraction with IOL implant", amount: 35000, discount: 0, sortOrder: 9, isActive: true, hospitalId: "mock-hospital-id", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: "svc-010", name: "Spectacle Fitting", category: "Optical", description: "Frame + lens fitting charges", amount: 200, discount: 0, sortOrder: 10, isActive: true, hospitalId: "mock-hospital-id", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
]

// ─── Hospital Profile ──────────────────────────────────────────────────────────

export let hospitalProfile: HospitalProfile = {
  id: "mock-hospital-id",
  name: "Docsile Eye Hospital",
  displayName: "Docsile Eye & Multi-Specialty Hospital",
  phone: "+914012345678",
  email: "info@docsile.in",
  website: "https://docsile.in",
  registrationNo: "HYD/HOSP/2020/1234",
  gstin: "36AADCD1234E1ZV",
  registrationFeeEnabled: true,
  registrationFeeAmount: 100,
  registrationFeeDefaultChecked: true,
  tone: "professional",
  departments: "Ophthalmology,Optometry,Pharmacy,Lab",
  settings: JSON.stringify({ navStyle: "sidebar", defaultPrint: { items: [{ type: "prescription" }] } }),
}

// ─── Print Config ──────────────────────────────────────────────────────────────

export let printConfig: Record<string, unknown> = {
  items: [
    { type: "prescription" },
    { type: "cash" },
    { type: "readings", subMode: "both" },
  ],
}

// ─── Prescription Templates ────────────────────────────────────────────────────

export let prescriptionTemplates: PrescriptionTemplate[] = [
  {
    id: "pt-001", code: "GLAUCOMA-INIT", name: "Glaucoma Initial",
    presentComplaint: "Blurring of vision, headache",
    previousHistory: "Diabetes mellitus, Hypertension",
    provisionalDiagnosis: "Primary Open Angle Glaucoma",
    medicines: JSON.stringify([
      { name: "Timolol 0.5% Eye Drops", days: "30", timing: "1-0-1", note: "Both eyes" },
      { name: "Latanoprost 0.005% Eye Drops", days: "30", timing: "0-0-1", note: "Bedtime - left eye" },
    ]),
    investigations: JSON.stringify(["HVF - Both Eyes", "OCT RNFL", "IOP Chart"]),
    followUpDays: 30, additionalNotes: "Monitor IOP monthly. Target IOP < 15 mmHg.",
    isActive: true, createdAt: "2026-01-05T08:00:00Z", updatedAt: "2026-01-05T08:00:00Z",
  },
  {
    id: "pt-002", code: "CATARACT-PRE-OP", name: "Cataract Pre-Op",
    presentComplaint: "Progressive blurring of vision",
    previousHistory: null, provisionalDiagnosis: "Nuclear Cataract",
    medicines: JSON.stringify([
      { name: "Ofloxacin 0.3% Eye Drops", days: "3", timing: "1-1-1-1", note: "Before surgery - operated eye" },
    ]),
    investigations: JSON.stringify(["Keratometry", "Axial Length (A-scan)", "CBC", "Blood Sugar - Fasting", "Chest X-Ray PA view", "ECG"]),
    followUpDays: 7, additionalNotes: "Surgery planned. Pre-op work-up as listed.",
    isActive: true, createdAt: "2026-01-06T08:00:00Z", updatedAt: "2026-01-06T08:00:00Z",
  },
  {
    id: "pt-003", code: "CATARACT-POST-OP", name: "Cataract Post-Op",
    presentComplaint: "Post-operative follow-up",
    previousHistory: null, provisionalDiagnosis: "Status post Phacoemulsification",
    medicines: JSON.stringify([
      { name: "Prednisolone 1% Eye Drops", days: "28", timing: "1-1-1-1", note: "Taper over 4 weeks - operated eye" },
      { name: "Ofloxacin 0.3% Eye Drops", days: "14", timing: "1-1-1-1", note: "Operated eye" },
      { name: "Carboxymethylcellulose 0.5% Eye Drops", days: "30", timing: "1-1-1-1", note: "Lubricant as needed" },
    ]),
    investigations: JSON.stringify([]),
    followUpDays: 7, additionalNotes: "Avoid strenuous activity. Do not rub eyes. Wear sunglasses outdoors.",
    isActive: true, createdAt: "2026-01-07T08:00:00Z", updatedAt: "2026-01-07T08:00:00Z",
  },
  {
    id: "pt-004", code: "DRY-EYE", name: "Dry Eye",
    presentComplaint: "Foreign body sensation, burning, watering",
    previousHistory: null, provisionalDiagnosis: "Dry Eye Syndrome",
    medicines: JSON.stringify([
      { name: "Carboxymethylcellulose 0.5% Eye Drops", days: "30", timing: "1-1-1-1", note: "Both eyes 4-6 times/day" },
    ]),
    investigations: JSON.stringify(["Schirmer's Test", "TBUT", "Rose Bengal Staining"]),
    followUpDays: 30, additionalNotes: "Avoid screen time > 2 hrs without breaks. Blink consciously.",
    isActive: true, createdAt: "2026-01-08T08:00:00Z", updatedAt: "2026-01-08T08:00:00Z",
  },
  {
    id: "pt-005", code: "DIABETIC-RETINO", name: "Diabetic Retinopathy Follow-up",
    presentComplaint: "Routine diabetic eye check",
    previousHistory: "Diabetes mellitus Type 2, > 10 years",
    provisionalDiagnosis: "Non-Proliferative Diabetic Retinopathy",
    medicines: JSON.stringify([]),
    investigations: JSON.stringify(["Fundus Photography", "OCT Macula", "HbA1c", "FBS", "BP Monitoring"]),
    followUpDays: 90, additionalNotes: "Strict glycaemic control. Continue systemic medications.",
    isActive: true, createdAt: "2026-01-09T08:00:00Z", updatedAt: "2026-01-09T08:00:00Z",
  },
]

// ─── Inpatient Templates ───────────────────────────────────────────────────────

export let inpatientTemplates: InpatientTemplate[] = [
  {
    id: "it-001", code: "PHACO-STD", name: "Phacoemulsification (Standard)",
    operationName: "Phacoemulsification with IOL Implantation",
    provisionDiagnosis: "Senile Cataract",
    medicines: JSON.stringify([
      { name: "Ofloxacin 0.3% Eye Drops", days: "14", timing: "1-1-1-1", note: "Operated eye" },
      { name: "Prednisolone 1% Eye Drops", days: "28", timing: "1-1-1-1", note: "Taper over 4 weeks" },
      { name: "Carboxymethylcellulose 0.5% Eye Drops", days: "30", timing: "SOS", note: "Lubricant" },
    ]),
    followUpDays: 7, additionalNotes: "Patient stable. Discharged in good condition.",
    isActive: true,
  },
  {
    id: "it-002", code: "TRAB-STD", name: "Trabeculectomy",
    operationName: "Trabeculectomy with Mitomycin C",
    provisionDiagnosis: "Primary Open Angle Glaucoma",
    medicines: JSON.stringify([
      { name: "Prednisolone 1% Eye Drops", days: "30", timing: "1-1-1-1", note: "Operated eye - taper" },
      { name: "Ofloxacin 0.3% Eye Drops", days: "14", timing: "1-1-1-1", note: "Operated eye" },
      { name: "Atropine 1% Eye Drops", days: "7", timing: "0-0-1", note: "Operated eye" },
    ]),
    followUpDays: 5, additionalNotes: "Bleb massage as instructed. Avoid straining.",
    isActive: true,
  },
  {
    id: "it-003", code: "VITREO-STD", name: "Vitrectomy",
    operationName: "Pars Plana Vitrectomy",
    provisionDiagnosis: "Vitreoretinal Disorder",
    medicines: JSON.stringify([
      { name: "Ofloxacin 0.3% Eye Drops", days: "14", timing: "1-1-1-1", note: "Operated eye" },
      { name: "Prednisolone 1% Eye Drops", days: "30", timing: "1-1-1-1", note: "Operated eye" },
    ]),
    followUpDays: 7, additionalNotes: "Posturing instructions given. Avoid flying if gas tamponade used.",
    isActive: true,
  },
]

// ─── Packages ──────────────────────────────────────────────────────────────────

export let packages: PredefinedPackage[] = [
  {
    id: "pkg-001", name: "Cataract Surgery Package (Economy)",
    inclusions: JSON.stringify([
      { name: "Surgery Charges", amount: 25000 },
      { name: "Room Charges", amount: 5000, subItems: [{ itemName: "General Ward (2 days)", quantity: 2, rate: 2500, amount: 5000 }] },
      { name: "Medicine", amount: 5000 },
      { name: "Consumables", amount: 5000 },
      { name: "Doctor Fee", amount: 5000 },
    ]),
    totalAmount: 45000, discount: 0, isActive: true,
  },
  {
    id: "pkg-002", name: "Cataract Surgery Package (Premium IOL)",
    inclusions: JSON.stringify([
      { name: "Surgery Charges", amount: 35000 },
      { name: "Room Charges", amount: 8000 },
      { name: "Medicine", amount: 5000 },
      { name: "Consumables", amount: 5000 },
      { name: "Doctor Fee", amount: 7000 },
    ]),
    totalAmount: 60000, discount: 0, isActive: true,
  },
  {
    id: "pkg-003", name: "Glaucoma Surgery Package",
    inclusions: JSON.stringify([
      { name: "Surgery Charges", amount: 30000 },
      { name: "Room Charges", amount: 10000 },
      { name: "Medicine", amount: 7000 },
      { name: "Consumables", amount: 5000 },
      { name: "Doctor Fee", amount: 8000 },
    ]),
    totalAmount: 60000, discount: 0, isActive: true,
  },
  {
    id: "pkg-004", name: "Vitreoretinal Surgery Package",
    inclusions: JSON.stringify([
      { name: "Surgery Charges", amount: 45000 },
      { name: "Room Charges", amount: 15000 },
      { name: "Medicine", amount: 8000 },
      { name: "Consumables", amount: 7000 },
      { name: "Doctor Fee", amount: 10000 },
    ]),
    totalAmount: 85000, discount: 5000, isActive: true,
  },
  {
    id: "pkg-005", name: "Pterygium Excision Package",
    inclusions: JSON.stringify([
      { name: "Surgery Charges", amount: 15000 },
      { name: "Medicine", amount: 3000 },
      { name: "Doctor Fee", amount: 5000 },
    ]),
    totalAmount: 23000, discount: 0, isActive: true,
  },
]

// ─── Surgeries ─────────────────────────────────────────────────────────────────

export let surgeries: PredefinedSurgery[] = [
  {
    id: "surg-001", name: "Phacoemulsification with IOL", department: "Ophthalmology",
    doctorNames: JSON.stringify(["Dr. Anand Rao", "Dr. Kiran Patel"]),
    onDutyDoctors: JSON.stringify(["Dr. Anand Rao"]),
    provisionDiagnosis: "Senile Cataract",
    operationProcedure: "Phacoemulsification under topical anesthesia with IOL implantation",
    operationDetails: "Peribulbar block, clear corneal incision, capsulorhexis, phaco, cortex aspiration, IOL in the bag",
    isActive: true, sortOrder: 1,
  },
  {
    id: "surg-002", name: "Trabeculectomy", department: "Ophthalmology",
    doctorNames: JSON.stringify(["Dr. Sunita Mehta"]),
    onDutyDoctors: JSON.stringify(["Dr. Sunita Mehta"]),
    provisionDiagnosis: "Primary Open Angle Glaucoma",
    operationProcedure: "Trabeculectomy with Mitomycin C augmentation",
    operationDetails: "Peritomy, scleral flap, sclerostomy, peripheral iridectomy, flap and conjunctival closure",
    isActive: true, sortOrder: 2,
  },
  {
    id: "surg-003", name: "Pars Plana Vitrectomy", department: "Ophthalmology",
    doctorNames: JSON.stringify(["Dr. Kiran Patel"]),
    onDutyDoctors: JSON.stringify(["Dr. Kiran Patel"]),
    provisionDiagnosis: "Epiretinal Membrane / Vitreoretinal Traction",
    operationProcedure: "25G Pars Plana Vitrectomy with Membrane Peeling",
    operationDetails: "Conjunctival peritomy, 3-port vitrectomy, ILM peeling, fluid-air exchange",
    isActive: true, sortOrder: 3,
  },
  {
    id: "surg-004", name: "Pterygium Excision", department: "Ophthalmology",
    doctorNames: JSON.stringify(["Dr. Anand Rao", "Dr. Sunita Mehta"]),
    onDutyDoctors: JSON.stringify(["Dr. Anand Rao"]),
    provisionDiagnosis: "Pterygium",
    operationProcedure: "Pterygium excision with conjunctival autograft",
    operationDetails: "Peeling of pterygium, bare sclera technique, conjunctival autograft sutured",
    isActive: true, sortOrder: 4,
  },
  {
    id: "surg-005", name: "LASIK", department: "Ophthalmology",
    doctorNames: JSON.stringify(["Dr. Anand Rao"]),
    onDutyDoctors: JSON.stringify(["Dr. Anand Rao"]),
    provisionDiagnosis: "Myopia / Astigmatism",
    operationProcedure: "Laser In-Situ Keratomileusis",
    operationDetails: "Femtosecond flap creation, excimer laser ablation, flap repositioning",
    isActive: true, sortOrder: 5,
  },
]

// ─── Discharges ────────────────────────────────────────────────────────────────

export let discharges: PredefinedDischarge[] = [
  {
    id: "disch-001", name: "Post-Cataract Standard Discharge",
    dischargeDiagnosis: "Status post Phacoemulsification with IOL Implantation",
    conditionAtDischarge: "Stable, wound secure, VA improving",
    dischargeMedications: JSON.stringify([
      { name: "Ofloxacin 0.3% Eye Drops", timing: "1-1-1-1", days: "14", note: "Operated eye" },
      { name: "Prednisolone 1% Eye Drops", timing: "1-1-1-1", days: "28", note: "Taper weekly" },
    ]),
    followUpInstructions: "Review after 1 week. Avoid strenuous activities for 4 weeks. Do not rub eyes. Wear dark glasses outdoors.",
    isActive: true, sortOrder: 1,
  },
  {
    id: "disch-002", name: "Post-Trabeculectomy Discharge",
    dischargeDiagnosis: "Post Trabeculectomy with MMC",
    conditionAtDischarge: "Stable, bleb formed, IOP controlled",
    dischargeMedications: JSON.stringify([
      { name: "Prednisolone 1% Eye Drops", timing: "1-1-1-1", days: "30", note: "Taper over 6 weeks" },
      { name: "Ofloxacin 0.3% Eye Drops", timing: "1-1-1-1", days: "14", note: "Operated eye" },
    ]),
    followUpInstructions: "Bleb massage as demonstrated. Report immediately if vision decreases or pain increases.",
    isActive: true, sortOrder: 2,
  },
  {
    id: "disch-003", name: "Post-Vitrectomy Discharge",
    dischargeDiagnosis: "Post Pars Plana Vitrectomy",
    conditionAtDischarge: "Stable, retina flat, fundus clear",
    dischargeMedications: JSON.stringify([
      { name: "Prednisolone 1% Eye Drops", timing: "1-1-1-1", days: "30", note: "Operated eye" },
      { name: "Ofloxacin 0.3% Eye Drops", timing: "1-1-1-1", days: "14", note: "Operated eye" },
    ]),
    followUpInstructions: "Maintain face-down posturing for 1 week. Avoid air travel. Review in 1 week.",
    isActive: true, sortOrder: 3,
  },
]

// ─── Medicine Master ───────────────────────────────────────────────────────────

export let medicineMaster: MedicineMaster[] = [
  { id: "mm-001", name: "Timolol 0.5% Eye Drops", category: "Eye Drop", defaultTiming: "1-0-1", defaultDays: "30", note: "Anti-glaucoma - reduce IOP", sortOrder: 1, isActive: true },
  { id: "mm-002", name: "Latanoprost 0.005% Eye Drops", category: "Eye Drop", defaultTiming: "0-0-1", defaultDays: "30", note: "Prostaglandin analogue - bedtime", sortOrder: 2, isActive: true },
  { id: "mm-003", name: "Ofloxacin 0.3% Eye Drops", category: "Eye Drop", defaultTiming: "1-1-1-1", defaultDays: "7", note: "Antibiotic eye drops", sortOrder: 3, isActive: true },
  { id: "mm-004", name: "Prednisolone 1% Eye Drops", category: "Eye Drop", defaultTiming: "1-1-1-1", defaultDays: "30", note: "Steroid - taper as directed", sortOrder: 4, isActive: true },
  { id: "mm-005", name: "Carboxymethylcellulose 0.5% Eye Drops", category: "Eye Drop", defaultTiming: "1-1-1-1", defaultDays: "30", note: "Lubricant / artificial tear", sortOrder: 5, isActive: true },
  { id: "mm-006", name: "Ciprofloxacin 500mg", category: "Tablet", defaultTiming: "1-0-1", defaultDays: "5", note: "After food", sortOrder: 6, isActive: true },
  { id: "mm-007", name: "Prednisolone 10mg", category: "Tablet", defaultTiming: "1-0-0", defaultDays: "5", note: "Morning after food - taper", sortOrder: 7, isActive: true },
  { id: "mm-008", name: "Paracetamol 500mg", category: "Tablet", defaultTiming: "SOS", defaultDays: "3", note: "For pain/fever", sortOrder: 8, isActive: true },
  { id: "mm-009", name: "Azithromycin 500mg", category: "Tablet", defaultTiming: "OD", defaultDays: "3", note: "Once daily, empty stomach", sortOrder: 9, isActive: true },
  { id: "mm-010", name: "Moxifloxacin 0.5% Eye Drops", category: "Eye Drop", defaultTiming: "1-1-1-1", defaultDays: "7", note: "Broad-spectrum antibiotic", sortOrder: 10, isActive: true },
  { id: "mm-011", name: "Atropine 1% Eye Drops", category: "Eye Drop", defaultTiming: "0-0-1", defaultDays: "7", note: "Cycloplegic - once daily", sortOrder: 11, isActive: true },
  { id: "mm-012", name: "Tropicamide 1% Eye Drops", category: "Eye Drop", defaultTiming: "SOS", defaultDays: "1", note: "For dilation - clinic use", sortOrder: 12, isActive: true },
  { id: "mm-013", name: "Vitamin E Capsule 400 IU", category: "Capsule", defaultTiming: "0-0-1", defaultDays: "30", note: "Antioxidant", sortOrder: 13, isActive: true },
  { id: "mm-014", name: "Dexamethasone 0.1% Eye Drops", category: "Eye Drop", defaultTiming: "1-1-1-1", defaultDays: "14", note: "Steroid", sortOrder: 14, isActive: true },
  { id: "mm-015", name: "Neomycin + Polymyxin Eye Ointment", category: "Ointment", defaultTiming: "0-0-1", defaultDays: "7", note: "Bedtime application", sortOrder: 15, isActive: true },
]
