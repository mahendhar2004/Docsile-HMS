/**
 * Mock fixture data for the Dashboard module.
 * Shapes match the inline TodaySummary / PeriodStats / QuickStats interfaces
 * in web/src/pages/DashboardPage.tsx exactly.
 */

export const todaySummary = {
  date: "2026-09-22",
  newPatientsToday: 14,
  totalPrescriptions: 11,
  totalRevenue: 52400,
  totalCollected: 41200,
  totalDues: 11200,
  activeInpatients: 5,
  pendingWorkup: 4,
}

export const quickStats = {
  ytd: {
    totalPatients: 3841,
    totalRevenue: 9820000,
    totalCollected: 8460000,
  },
  mtd: {
    totalPatients: 312,
    totalRevenue: 784000,
    totalCollected: 660000,
  },
  activeInpatients: 5,
}
