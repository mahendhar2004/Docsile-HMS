/**
 * Mock fixtures for the Analytics module (19 endpoints).
 * All data is static — filter param is ignored, same data returned for all periods.
 */

import type {
  AnalyticsOverview,
  GenderDistribution,
  AgeGroup,
  RevenueByCategory,
  TimeSeriesPoint,
  TopService,
  ExpenseByCategory,
  FinancialSummary,
  PaymentModeBreakdown,
  DoctorPerformance,
  StatusDistribution,
  CommonDiagnosis,
  CommonMedicine,
  CommonInvestigation,
  PharmacySaleStat,
  LabTestStat,
  SurgeryBreakdown,
  RegionStat,
  ReferralStat,
} from "@/pages/analytics/types"

export const analyticsOverview: AnalyticsOverview = {
  totalPatients: 1842,
  newPatientsToday: 14,
  totalRevenue: 2845000,
  totalCollected: 2410000,
  totalDues: 435000,
  totalExpenses: 620000,
  totalConsultationRevenue: 890000,
  totalLabRevenue: 415000,
  totalPharmacyRevenue: 380000,
  totalOpticalRevenue: 290000,
  totalInpatientRevenue: 870000,
  totalInpatients: 78,
  activeInpatients: 12,
  totalSurgeries: 56,
  patientChange: 8.4,
  revenueChange: 12.1,
  collectionRate: 84.7,
  revenuePerPatient: 1544,
  followUpVisits: 312,
  avgDailyPatients: 42,
  surgeryRecommended: 68,
  surgeryConverted: 56,
  conversionRate: 82.4,
  consultationDiscount: 32000,
  labDiscount: 18500,
  pharmacyDiscount: 12000,
  opticalDiscount: 9500,
  inpatientDiscount: 45000,
  totalDiscount: 117000,
}

export const genderDistribution: GenderDistribution = {
  male: 894,
  female: 912,
  other: 36,
}

export const ageDistribution: AgeGroup[] = [
  { label: "0–10", count: 98 },
  { label: "11–20", count: 112 },
  { label: "21–30", count: 185 },
  { label: "31–40", count: 248 },
  { label: "41–50", count: 312 },
  { label: "51–60", count: 421 },
  { label: "61–70", count: 298 },
  { label: "71+", count: 168 },
]

export const revenueByCategory: RevenueByCategory[] = [
  { category: "Consultation", amount: 890000, color: "#3B82F6" },
  { category: "In-Patient", amount: 870000, color: "#10B981" },
  { category: "Lab", amount: 415000, color: "#F59E0B" },
  { category: "Pharmacy", amount: 380000, color: "#EF4444" },
  { category: "Optical", amount: 290000, color: "#8B5CF6" },
]

export const timeSeries: TimeSeriesPoint[] = [
  { date: "2026-09-16", patients: 38, revenue: 185000, collected: 158000, expenses: 62000 },
  { date: "2026-09-17", patients: 44, revenue: 210000, collected: 178000, expenses: 58000 },
  { date: "2026-09-18", patients: 41, revenue: 195000, collected: 166000, expenses: 65000 },
  { date: "2026-09-19", patients: 46, revenue: 225000, collected: 192000, expenses: 61000 },
  { date: "2026-09-20", patients: 32, revenue: 158000, collected: 134000, expenses: 48000 },
  { date: "2026-09-21", patients: 18, revenue: 82000, collected: 70000, expenses: 24000 },
  { date: "2026-09-22", patients: 14, revenue: 68000, collected: 57000, expenses: 19000 },
]

export const topServices: TopService[] = [
  { name: "Cataract Surgery (Phaco)", count: 28, revenue: 616000 },
  { name: "Glaucoma Trabeculectomy", count: 12, revenue: 420000 },
  { name: "Diabetic Retinopathy Laser", count: 34, revenue: 255000 },
  { name: "OCT Scan", count: 118, revenue: 177000 },
  { name: "Retinal Laser Photocoagulation", count: 22, revenue: 154000 },
  { name: "LASIK Surgery", count: 8, revenue: 120000 },
  { name: "Pterygium Excision", count: 14, revenue: 98000 },
  { name: "Visual Field Test", count: 96, revenue: 72000 },
]

export const expenseBreakdown: ExpenseByCategory[] = [
  { category: "Staff Salaries", amount: 347000, color: "#F59E0B" },
  { category: "Medicines & Supplies", amount: 148000, color: "#3B82F6" },
  { category: "Equipment Maintenance", amount: 62000, color: "#10B981" },
  { category: "Utilities", amount: 42000, color: "#EF4444" },
  { category: "Housekeeping", amount: 21000, color: "#8B5CF6" },
]

export const financialSummary: FinancialSummary = {
  totalBilled: 2845000,
  totalCollected: 2410000,
  totalDiscount: 117000,
  totalDues: 435000,
  totalExpenses: 620000,
  netCashFlow: 1790000,
  dailyBreakdown: [
    { date: "2026-09-16", billed: 185000, collected: 158000, discount: 12000, dues: 27000, expenses: 62000 },
    { date: "2026-09-17", billed: 210000, collected: 178000, discount: 14000, dues: 32000, expenses: 58000 },
    { date: "2026-09-18", billed: 195000, collected: 166000, discount: 13000, dues: 29000, expenses: 65000 },
    { date: "2026-09-19", billed: 225000, collected: 192000, discount: 16000, dues: 33000, expenses: 61000 },
    { date: "2026-09-20", billed: 158000, collected: 134000, discount: 10000, dues: 24000, expenses: 48000 },
    { date: "2026-09-21", billed: 82000, collected: 70000, discount: 5000, dues: 12000, expenses: 24000 },
    { date: "2026-09-22", billed: 68000, collected: 57000, discount: 4000, dues: 11000, expenses: 19000 },
  ],
  discountByModule: {
    consultations: 32000,
    labs: 18500,
    pharmacy: 12000,
    optical: 9500,
    inpatient: 45000,
  },
}

export const paymentModeBreakdown: PaymentModeBreakdown[] = [
  { mode: "Cash", amount: 965000, percentage: 40.1 },
  { mode: "UPI", amount: 722000, percentage: 29.9 },
  { mode: "Card", amount: 481000, percentage: 20.0 },
  { mode: "Bank Transfer", amount: 192000, percentage: 8.0 },
  { mode: "Insurance", amount: 50000, percentage: 2.0 },
]

export const doctorPerformance: DoctorPerformance[] = [
  { name: "Dr. Anand Krishnan", patients: 312, revenue: 845000 },
  { name: "Dr. Priya Sharma", patients: 278, revenue: 720000 },
  { name: "Dr. Ramesh Kumar", patients: 245, revenue: 615000 },
  { name: "Dr. Meena Patel", patients: 198, revenue: 480000 },
  { name: "Dr. Suresh Iyer", patients: 156, revenue: 385000 },
]

export const statusDistribution: StatusDistribution[] = [
  { status: "PAID", count: 1240 },
  { status: "BILLED", count: 286 },
  { status: "PARTIAL", count: 198 },
  { status: "DRAFT", count: 82 },
  { status: "CANCELLED", count: 36 },
]

export const commonDiagnoses: CommonDiagnosis[] = [
  { diagnosis: "Cataract", count: 312, percentage: 16.9 },
  { diagnosis: "Glaucoma", count: 248, percentage: 13.5 },
  { diagnosis: "Diabetic Retinopathy", count: 198, percentage: 10.8 },
  { diagnosis: "Dry Eye Disease", count: 186, percentage: 10.1 },
  { diagnosis: "Refractive Error", count: 172, percentage: 9.3 },
  { diagnosis: "Macular Degeneration", count: 128, percentage: 7.0 },
  { diagnosis: "Uveitis", count: 94, percentage: 5.1 },
  { diagnosis: "Pterygium", count: 82, percentage: 4.5 },
  { diagnosis: "Corneal Ulcer", count: 68, percentage: 3.7 },
  { diagnosis: "Squint (Strabismus)", count: 56, percentage: 3.0 },
]

export const commonMedicines: CommonMedicine[] = [
  { name: "Timolol 0.5% Eye Drops", count: 418, percentage: 22.7 },
  { name: "Carboxymethylcellulose 0.5% (Lubricant)", count: 356, percentage: 19.3 },
  { name: "Prednisolone Acetate 1% Eye Drops", count: 298, percentage: 16.2 },
  { name: "Moxifloxacin 0.5% Eye Drops", count: 244, percentage: 13.3 },
  { name: "Latanoprost 0.005% Eye Drops", count: 188, percentage: 10.2 },
  { name: "Dorzolamide + Timolol (Cosopt)", count: 144, percentage: 7.8 },
  { name: "Tropicamide 1% Eye Drops", count: 128, percentage: 7.0 },
  { name: "Dexamethasone + Tobramycin Drops", count: 64, percentage: 3.5 },
]

export const topPrescribedInvestigations: CommonInvestigation[] = [
  { name: "OCT (Optical Coherence Tomography)", count: 312, percentage: 28.4 },
  { name: "Visual Field Test (Perimetry)", count: 248, percentage: 22.6 },
  { name: "Fundus Photography", count: 196, percentage: 17.9 },
  { name: "Fluorescein Angiography", count: 128, percentage: 11.7 },
  { name: "Corneal Topography", count: 96, percentage: 8.8 },
  { name: "B-Scan Ultrasonography", count: 62, percentage: 5.7 },
  { name: "Electroretinography", count: 36, percentage: 3.3 },
  { name: "Pachymetry", count: 20, percentage: 1.8 },
]

export const topPharmacySales: PharmacySaleStat[] = [
  { name: "Timolol 0.5% Eye Drops", quantity: 418, revenue: 62700 },
  { name: "Carboxymethylcellulose Lubricant", quantity: 356, revenue: 28480 },
  { name: "Moxifloxacin 0.5% Eye Drops", quantity: 244, revenue: 53680 },
  { name: "Latanoprost 0.005% Eye Drops", quantity: 188, revenue: 56400 },
  { name: "Prednisolone Acetate 1%", quantity: 298, revenue: 41720 },
  { name: "Dorzolamide + Timolol (Cosopt)", quantity: 144, revenue: 72000 },
]

export const topLabTests: LabTestStat[] = [
  { name: "OCT Scan", count: 312, revenue: 468000 },
  { name: "Visual Field Test", count: 248, revenue: 186000 },
  { name: "Fundus Photography", count: 196, revenue: 98000 },
  { name: "Fluorescein Angiography", count: 128, revenue: 256000 },
  { name: "Corneal Topography", count: 96, revenue: 67200 },
  { name: "HbA1c", count: 188, revenue: 33840 },
  { name: "Fasting Blood Sugar", count: 224, revenue: 22400 },
]

export const referralStats: ReferralStat[] = [
  { name: "Self / Walk-in", count: 612 },
  { name: "Dr. Anand Krishnan", count: 248 },
  { name: "General Practitioner", count: 186 },
  { name: "Online Booking", count: 164 },
  { name: "Apollo Hospitals", count: 98 },
  { name: "Dr. Priya Sharma", count: 88 },
  { name: "Diabetic Clinic", count: 76 },
  { name: "Other", count: 370 },
]

export const surgeryBreakdown: SurgeryBreakdown[] = [
  { name: "Cataract (Phacoemulsification)", count: 28 },
  { name: "Glaucoma (Trabeculectomy)", count: 12 },
  { name: "LASIK / Refractive", count: 8 },
  { name: "Pterygium Excision", count: 5 },
  { name: "Vitreoretinal", count: 3 },
]

export const regionStats: RegionStat[] = [
  { region: "Chennai", total: 648, newPatients: 128, returning: 520, percentage: 35.2 },
  { region: "Tambaram", total: 312, newPatients: 64, returning: 248, percentage: 16.9 },
  { region: "Kancheepuram", total: 248, newPatients: 56, returning: 192, percentage: 13.5 },
  { region: "Chengalpattu", total: 196, newPatients: 48, returning: 148, percentage: 10.6 },
  { region: "Vellore", total: 148, newPatients: 36, returning: 112, percentage: 8.0 },
  { region: "Villupuram", total: 124, newPatients: 32, returning: 92, percentage: 6.7 },
  { region: "Other Tamil Nadu", total: 88, newPatients: 24, returning: 64, percentage: 4.8 },
  { region: "Outside Tamil Nadu", total: 78, newPatients: 22, returning: 56, percentage: 4.2 },
]
