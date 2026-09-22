/**
 * analytics/types.ts
 *
 * Type definitions for all 19 analytics endpoints.
 * Shapes are verified against:
 *   - src/app/(hospital)/analytics/actions.ts  (old Next.js app, ground truth)
 *   - .sde/schemas/openapi.yaml /analytics/* paths
 * Do NOT invent field names — every interface mirrors the old app exactly.
 */

// ─── Filter ───────────────────────────────────────────────────────────────────

export type TimeFilter = "today" | "week" | "month" | "year" | "custom"

// ─── Overview ─────────────────────────────────────────────────────────────────

export interface AnalyticsOverview {
  totalPatients: number
  newPatientsToday: number
  totalRevenue: number
  totalCollected: number
  totalDues: number
  totalExpenses: number
  totalConsultationRevenue: number
  totalLabRevenue: number
  totalPharmacyRevenue: number
  totalOpticalRevenue: number
  totalInpatientRevenue: number
  totalInpatients: number
  activeInpatients: number
  totalSurgeries: number
  patientChange: number
  revenueChange: number
  collectionRate: number
  revenuePerPatient: number
  followUpVisits: number
  avgDailyPatients: number
  surgeryRecommended: number
  surgeryConverted: number
  conversionRate: number
  consultationDiscount: number
  labDiscount: number
  pharmacyDiscount: number
  opticalDiscount: number
  inpatientDiscount: number
  totalDiscount: number
}

// ─── Gender ───────────────────────────────────────────────────────────────────

export interface GenderDistribution {
  male: number
  female: number
  other: number
}

// ─── Age ──────────────────────────────────────────────────────────────────────

export interface AgeGroup {
  label: string
  count: number
}

// ─── Revenue by category ──────────────────────────────────────────────────────

export interface RevenueByCategory {
  category: string
  amount: number
  color: string
}

// ─── Time series ──────────────────────────────────────────────────────────────

export interface TimeSeriesPoint {
  date: string
  patients: number
  revenue: number
  collected: number
  expenses: number
}

// ─── Top services ─────────────────────────────────────────────────────────────

export interface TopService {
  name: string
  count: number
  revenue: number
}

// ─── Expense by category ──────────────────────────────────────────────────────

export interface ExpenseByCategory {
  category: string
  amount: number
  color: string
}

// ─── Financial summary ────────────────────────────────────────────────────────

export interface DailyFinancial {
  date: string
  billed: number
  collected: number
  discount: number
  dues: number
  expenses: number
}

export interface FinancialSummary {
  totalBilled: number
  totalCollected: number
  totalDiscount: number
  totalDues: number
  totalExpenses: number
  netCashFlow: number
  dailyBreakdown: DailyFinancial[]
  discountByModule: {
    consultations: number
    labs: number
    pharmacy: number
    optical: number
    inpatient: number
  }
}

// ─── Payment mode ─────────────────────────────────────────────────────────────

export interface PaymentModeBreakdown {
  mode: string
  amount: number
  percentage: number
}

// ─── Doctor performance ───────────────────────────────────────────────────────

export interface DoctorPerformance {
  name: string
  patients: number
  revenue: number
}

// ─── Status distribution ─────────────────────────────────────────────────────

export interface StatusDistribution {
  status: string
  count: number
}

// ─── Common diagnoses ─────────────────────────────────────────────────────────

export interface CommonDiagnosis {
  diagnosis: string
  count: number
  percentage: number
}

// ─── Common medicines ─────────────────────────────────────────────────────────

export interface CommonMedicine {
  name: string
  count: number
  percentage: number
}

// ─── Common investigations ────────────────────────────────────────────────────

export interface CommonInvestigation {
  name: string
  count: number
  percentage: number
}

// ─── Pharmacy sales ───────────────────────────────────────────────────────────

export interface PharmacySaleStat {
  name: string
  quantity: number
  revenue: number
}

// ─── Lab tests ────────────────────────────────────────────────────────────────

export interface LabTestStat {
  name: string
  count: number
  revenue: number
}

// ─── Surgery breakdown ────────────────────────────────────────────────────────

export interface SurgeryBreakdown {
  name: string
  count: number
}

// ─── Region stats ─────────────────────────────────────────────────────────────

export interface RegionStat {
  region: string
  total: number
  newPatients: number
  returning: number
  percentage: number
}

// ─── Referral stats ───────────────────────────────────────────────────────────

export interface ReferralStat {
  name: string
  count: number
}
