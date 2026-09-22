/**
 * MSW v2 handlers for the Analytics module — all 19 endpoints.
 * All return static seeded data regardless of the ?filter= param.
 *
 * GET /analytics/overview
 * GET /analytics/gender-distribution
 * GET /analytics/age-distribution
 * GET /analytics/revenue-by-category
 * GET /analytics/time-series
 * GET /analytics/top-services
 * GET /analytics/expense-breakdown
 * GET /analytics/financial-summary
 * GET /analytics/payment-mode-breakdown
 * GET /analytics/doctor-performance
 * GET /analytics/status-distribution
 * GET /analytics/common-diagnoses
 * GET /analytics/common-medicines
 * GET /analytics/top-prescribed-investigations
 * GET /analytics/top-pharmacy-sales
 * GET /analytics/top-lab-tests
 * GET /analytics/referral-stats
 * GET /analytics/surgery-breakdown
 * GET /analytics/region-stats
 */

import { http } from "msw"
import { ok } from "../envelope"
import {
  analyticsOverview,
  genderDistribution,
  ageDistribution,
  revenueByCategory,
  timeSeries,
  topServices,
  expenseBreakdown,
  financialSummary,
  paymentModeBreakdown,
  doctorPerformance,
  statusDistribution,
  commonDiagnoses,
  commonMedicines,
  topPrescribedInvestigations,
  topPharmacySales,
  topLabTests,
  referralStats,
  surgeryBreakdown,
  regionStats,
} from "../fixtures/analytics"

export const analyticsHandlers = [
  http.get("/analytics/overview", () => ok(analyticsOverview)),
  http.get("/analytics/gender-distribution", () => ok(genderDistribution)),
  http.get("/analytics/age-distribution", () => ok(ageDistribution)),
  http.get("/analytics/revenue-by-category", () => ok(revenueByCategory)),
  http.get("/analytics/time-series", () => ok(timeSeries)),
  http.get("/analytics/top-services", () => ok(topServices)),
  http.get("/analytics/expense-breakdown", () => ok(expenseBreakdown)),
  http.get("/analytics/financial-summary", () => ok(financialSummary)),
  http.get("/analytics/payment-mode-breakdown", () => ok(paymentModeBreakdown)),
  http.get("/analytics/doctor-performance", () => ok(doctorPerformance)),
  http.get("/analytics/status-distribution", () => ok(statusDistribution)),
  http.get("/analytics/common-diagnoses", () => ok(commonDiagnoses)),
  http.get("/analytics/common-medicines", () => ok(commonMedicines)),
  http.get("/analytics/top-prescribed-investigations", () => ok(topPrescribedInvestigations)),
  http.get("/analytics/top-pharmacy-sales", () => ok(topPharmacySales)),
  http.get("/analytics/top-lab-tests", () => ok(topLabTests)),
  http.get("/analytics/referral-stats", () => ok(referralStats)),
  http.get("/analytics/surgery-breakdown", () => ok(surgeryBreakdown)),
  http.get("/analytics/region-stats", () => ok(regionStats)),
]
