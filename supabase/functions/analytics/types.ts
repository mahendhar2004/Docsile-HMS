import { z } from 'zod';

export const AnalyticsQuerySchema = z.object({
  filter: z.string().optional(),
  customStart: z.string().date().optional(),
  customEnd: z.string().date().optional(),
});
export type AnalyticsQuery = z.infer<typeof AnalyticsQuerySchema>;

export type TimeFilter = 'today' | 'week' | 'month' | 'year' | 'custom';

export interface AnalyticsOverview {
  totalPatients: number;
  newPatientsToday: number;
  totalRevenue: number;
  totalCollected: number;
  totalDues: number;
  totalExpenses: number;
  totalConsultationRevenue: number;
  totalLabRevenue: number;
  totalPharmacyRevenue: number;
  totalOpticalRevenue: number;
  totalInpatientRevenue: number;
  totalInpatients: number;
  activeInpatients: number;
  totalSurgeries: number;
  patientChange: number;
  revenueChange: number;
  collectionRate: number;
  revenuePerPatient: number;
  followUpVisits: number;
  avgDailyPatients: number;
  surgeryRecommended: number;
  surgeryConverted: number;
  conversionRate: number;
  consultationDiscount: number;
  labDiscount: number;
  pharmacyDiscount: number;
  opticalDiscount: number;
  inpatientDiscount: number;
  totalDiscount: number;
}

export interface GenderDistribution {
  male: number;
  female: number;
  other: number;
}

export interface AgeGroup {
  label: string;
  count: number;
}

export interface RevenueByCategory {
  category: string;
  amount: number;
  color: string;
}

export interface TimeSeriesPoint {
  date: string;
  patients: number;
  revenue: number;
  collected: number;
  expenses: number;
}

export interface TopService {
  name: string;
  count: number;
  revenue: number;
}

export interface ExpenseByCategory {
  category: string;
  amount: number;
  color: string;
}

export interface DailyFinancial {
  date: string;
  billed: number;
  collected: number;
  discount: number;
  dues: number;
  expenses: number;
}

export interface FinancialSummary {
  totalBilled: number;
  totalCollected: number;
  totalDiscount: number;
  totalDues: number;
  totalExpenses: number;
  netCashFlow: number;
  dailyBreakdown: DailyFinancial[];
  discountByModule: {
    consultations: number;
    labs: number;
    pharmacy: number;
    optical: number;
    inpatient: number;
  };
}

export interface PaymentModeBreakdown {
  mode: string;
  amount: number;
  percentage: number;
}

export interface DoctorPerformance {
  name: string;
  patients: number;
  revenue: number;
}

export interface StatusDistribution {
  status: string;
  count: number;
}

export interface CommonDiagnosis {
  diagnosis: string;
  count: number;
  percentage: number;
}

export interface CommonMedicine {
  name: string;
  count: number;
  percentage: number;
}

export interface CommonInvestigation {
  name: string;
  count: number;
  percentage: number;
}

export interface PharmacySaleStat {
  name: string;
  quantity: number;
  revenue: number;
}

export interface LabTestStat {
  name: string;
  count: number;
  revenue: number;
}

export interface ReferralStat {
  name: string;
  count: number;
}

export interface SurgeryBreakdown {
  name: string;
  count: number;
}

export interface RegionStat {
  region: string;
  total: number;
  newPatients: number;
  returning: number;
  percentage: number;
}
