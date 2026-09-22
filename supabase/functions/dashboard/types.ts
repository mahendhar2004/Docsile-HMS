import { z } from 'zod';

// dashboard module is read-only; no request body schemas needed
export const DashboardQuerySchema = z.object({
  date: z.string().date().optional(),
});

// ─── Response types ────────────────────────────────────────────────────────────

/**
 * Today's summary snapshot.
 *
 * Revenue definition (matches analytics/repository.ts and billing/repository.ts):
 *   totalRevenue    = SUM(Prescription.total) + SUM(PharmacyBill.billAmount) +
 *                     SUM(LabBill.total) + SUM(OpticalBill.billAmount) +
 *                     SUM(InPatient.netAmount) — all non-CANCELLED where applicable
 *   totalCollected  = SUM(*.amountPaid / *.paidAmount / *.totalReceivedAmount)
 *   totalDues       = SUM(*.balanceDue / InPatient.balanceAmount)
 */
export interface TodaySummary {
  /** IST calendar date this snapshot covers (YYYY-MM-DD). */
  date: string;
  /** Patients with an appointmentDate in today's IST window. */
  newPatientsToday: number;
  /** Non-cancelled Prescriptions issued today. */
  totalPrescriptions: number;
  /** Aggregate revenue across all billing sources for today. */
  totalRevenue: number;
  /** Aggregate collected amounts for today. */
  totalCollected: number;
  /** Aggregate outstanding dues for today. */
  totalDues: number;
  /** InPatients whose status is not DISCHARGED (across all admission dates). */
  activeInpatients: number;
  /**
   * Approximate count of OPD patients today who have not yet had an eye reading.
   * Computed as max(0, newPatientsToday - eyeReadingsToday).
   */
  pendingWorkup: number;
}

/** Revenue + collection totals for a calendar period. */
export interface PeriodStats {
  /** Patients with an appointmentDate in the period. */
  totalPatients: number;
  /** Aggregate revenue across all billing sources for the period. */
  totalRevenue: number;
  /** Aggregate collected amounts for the period. */
  totalCollected: number;
}

/** Quick stats for the dashboard header widgets. */
export interface QuickStats {
  /** Year-to-date stats (Jan 1 of current year to now). */
  ytd: PeriodStats;
  /** Month-to-date stats (1st of current month to now). */
  mtd: PeriodStats;
  /** InPatients whose status is not DISCHARGED (across all admission dates). */
  activeInpatients: number;
}
