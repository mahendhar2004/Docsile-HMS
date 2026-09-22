/**
 * analytics/hooks.ts
 *
 * One TanStack Query hook per analytics endpoint (19 total).
 * All hooks accept filter + optional custom date range strings.
 * Endpoint paths verified against .sde/schemas/openapi.yaml /analytics/* entries.
 */

import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type {
  TimeFilter,
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
} from "./types"

// ─── URL helper ───────────────────────────────────────────────────────────────

function analyticsUrl(
  endpoint: string,
  filter: TimeFilter,
  customStart?: string,
  customEnd?: string
): string {
  const params = new URLSearchParams({ filter })
  if (filter === "custom") {
    if (customStart) params.set("customStart", customStart)
    if (customEnd) params.set("customEnd", customEnd)
  }
  return `/analytics/${endpoint}?${params.toString()}`
}

// ─── Shared option defaults ───────────────────────────────────────────────────

const ANALYTICS_STALE = 5 * 60 * 1000 // 5 min — analytics data doesn't change rapidly

// ─── Hooks ───────────────────────────────────────────────────────────────────

export function useAnalyticsOverview(
  filter: TimeFilter,
  customStart?: string,
  customEnd?: string,
  enabled = true
) {
  return useQuery({
    queryKey: ["analytics", "overview", filter, customStart, customEnd] as const,
    queryFn: () =>
      apiClient
        .get<AnalyticsOverview>(analyticsUrl("overview", filter, customStart, customEnd))
        .then((r) => r.data),
    enabled,
    staleTime: ANALYTICS_STALE,
  })
}

export function useGenderDistribution(
  filter: TimeFilter,
  customStart?: string,
  customEnd?: string,
  enabled = true
) {
  return useQuery({
    queryKey: ["analytics", "gender-distribution", filter, customStart, customEnd] as const,
    queryFn: () =>
      apiClient
        .get<GenderDistribution>(analyticsUrl("gender-distribution", filter, customStart, customEnd))
        .then((r) => r.data),
    enabled,
    staleTime: ANALYTICS_STALE,
  })
}

export function useAgeDistribution(
  filter: TimeFilter,
  customStart?: string,
  customEnd?: string,
  enabled = true
) {
  return useQuery({
    queryKey: ["analytics", "age-distribution", filter, customStart, customEnd] as const,
    queryFn: () =>
      apiClient
        .get<AgeGroup[]>(analyticsUrl("age-distribution", filter, customStart, customEnd))
        .then((r) => r.data),
    enabled,
    staleTime: ANALYTICS_STALE,
  })
}

export function useRevenueByCategory(
  filter: TimeFilter,
  customStart?: string,
  customEnd?: string,
  enabled = true
) {
  return useQuery({
    queryKey: ["analytics", "revenue-by-category", filter, customStart, customEnd] as const,
    queryFn: () =>
      apiClient
        .get<RevenueByCategory[]>(analyticsUrl("revenue-by-category", filter, customStart, customEnd))
        .then((r) => r.data),
    enabled,
    staleTime: ANALYTICS_STALE,
  })
}

export function useTimeSeries(
  filter: TimeFilter,
  customStart?: string,
  customEnd?: string,
  enabled = true
) {
  return useQuery({
    queryKey: ["analytics", "time-series", filter, customStart, customEnd] as const,
    queryFn: () =>
      apiClient
        .get<TimeSeriesPoint[]>(analyticsUrl("time-series", filter, customStart, customEnd))
        .then((r) => r.data),
    enabled,
    staleTime: ANALYTICS_STALE,
  })
}

export function useTopServices(
  filter: TimeFilter,
  customStart?: string,
  customEnd?: string,
  enabled = true
) {
  return useQuery({
    queryKey: ["analytics", "top-services", filter, customStart, customEnd] as const,
    queryFn: () =>
      apiClient
        .get<TopService[]>(analyticsUrl("top-services", filter, customStart, customEnd))
        .then((r) => r.data),
    enabled,
    staleTime: ANALYTICS_STALE,
  })
}

export function useExpenseBreakdown(
  filter: TimeFilter,
  customStart?: string,
  customEnd?: string,
  enabled = true
) {
  return useQuery({
    queryKey: ["analytics", "expense-breakdown", filter, customStart, customEnd] as const,
    queryFn: () =>
      apiClient
        .get<ExpenseByCategory[]>(analyticsUrl("expense-breakdown", filter, customStart, customEnd))
        .then((r) => r.data),
    enabled,
    staleTime: ANALYTICS_STALE,
  })
}

export function useFinancialSummary(
  filter: TimeFilter,
  customStart?: string,
  customEnd?: string,
  enabled = true
) {
  return useQuery({
    queryKey: ["analytics", "financial-summary", filter, customStart, customEnd] as const,
    queryFn: () =>
      apiClient
        .get<FinancialSummary>(analyticsUrl("financial-summary", filter, customStart, customEnd))
        .then((r) => r.data),
    enabled,
    staleTime: ANALYTICS_STALE,
  })
}

export function usePaymentModeBreakdown(
  filter: TimeFilter,
  customStart?: string,
  customEnd?: string,
  enabled = true
) {
  return useQuery({
    queryKey: ["analytics", "payment-mode-breakdown", filter, customStart, customEnd] as const,
    queryFn: () =>
      apiClient
        .get<PaymentModeBreakdown[]>(analyticsUrl("payment-mode-breakdown", filter, customStart, customEnd))
        .then((r) => r.data),
    enabled,
    staleTime: ANALYTICS_STALE,
  })
}

export function useDoctorPerformance(
  filter: TimeFilter,
  customStart?: string,
  customEnd?: string,
  enabled = true
) {
  return useQuery({
    queryKey: ["analytics", "doctor-performance", filter, customStart, customEnd] as const,
    queryFn: () =>
      apiClient
        .get<DoctorPerformance[]>(analyticsUrl("doctor-performance", filter, customStart, customEnd))
        .then((r) => r.data),
    enabled,
    staleTime: ANALYTICS_STALE,
  })
}

export function useStatusDistribution(
  filter: TimeFilter,
  customStart?: string,
  customEnd?: string,
  enabled = true
) {
  return useQuery({
    queryKey: ["analytics", "status-distribution", filter, customStart, customEnd] as const,
    queryFn: () =>
      apiClient
        .get<StatusDistribution[]>(analyticsUrl("status-distribution", filter, customStart, customEnd))
        .then((r) => r.data),
    enabled,
    staleTime: ANALYTICS_STALE,
  })
}

export function useCommonDiagnoses(
  filter: TimeFilter,
  customStart?: string,
  customEnd?: string,
  enabled = true
) {
  return useQuery({
    queryKey: ["analytics", "common-diagnoses", filter, customStart, customEnd] as const,
    queryFn: () =>
      apiClient
        .get<CommonDiagnosis[]>(analyticsUrl("common-diagnoses", filter, customStart, customEnd))
        .then((r) => r.data),
    enabled,
    staleTime: ANALYTICS_STALE,
  })
}

export function useCommonMedicines(
  filter: TimeFilter,
  customStart?: string,
  customEnd?: string,
  enabled = true
) {
  return useQuery({
    queryKey: ["analytics", "common-medicines", filter, customStart, customEnd] as const,
    queryFn: () =>
      apiClient
        .get<CommonMedicine[]>(analyticsUrl("common-medicines", filter, customStart, customEnd))
        .then((r) => r.data),
    enabled,
    staleTime: ANALYTICS_STALE,
  })
}

export function useTopPrescribedInvestigations(
  filter: TimeFilter,
  customStart?: string,
  customEnd?: string,
  enabled = true
) {
  return useQuery({
    queryKey: ["analytics", "top-prescribed-investigations", filter, customStart, customEnd] as const,
    queryFn: () =>
      apiClient
        .get<CommonInvestigation[]>(analyticsUrl("top-prescribed-investigations", filter, customStart, customEnd))
        .then((r) => r.data),
    enabled,
    staleTime: ANALYTICS_STALE,
  })
}

export function useTopPharmacySales(
  filter: TimeFilter,
  customStart?: string,
  customEnd?: string,
  enabled = true
) {
  return useQuery({
    queryKey: ["analytics", "top-pharmacy-sales", filter, customStart, customEnd] as const,
    queryFn: () =>
      apiClient
        .get<PharmacySaleStat[]>(analyticsUrl("top-pharmacy-sales", filter, customStart, customEnd))
        .then((r) => r.data),
    enabled,
    staleTime: ANALYTICS_STALE,
  })
}

export function useTopLabTests(
  filter: TimeFilter,
  customStart?: string,
  customEnd?: string,
  enabled = true
) {
  return useQuery({
    queryKey: ["analytics", "top-lab-tests", filter, customStart, customEnd] as const,
    queryFn: () =>
      apiClient
        .get<LabTestStat[]>(analyticsUrl("top-lab-tests", filter, customStart, customEnd))
        .then((r) => r.data),
    enabled,
    staleTime: ANALYTICS_STALE,
  })
}

export function useReferralStats(
  filter: TimeFilter,
  customStart?: string,
  customEnd?: string,
  enabled = true
) {
  return useQuery({
    queryKey: ["analytics", "referral-stats", filter, customStart, customEnd] as const,
    queryFn: () =>
      apiClient
        .get<ReferralStat[]>(analyticsUrl("referral-stats", filter, customStart, customEnd))
        .then((r) => r.data),
    enabled,
    staleTime: ANALYTICS_STALE,
  })
}

export function useSurgeryBreakdown(
  filter: TimeFilter,
  customStart?: string,
  customEnd?: string,
  enabled = true
) {
  return useQuery({
    queryKey: ["analytics", "surgery-breakdown", filter, customStart, customEnd] as const,
    queryFn: () =>
      apiClient
        .get<SurgeryBreakdown[]>(analyticsUrl("surgery-breakdown", filter, customStart, customEnd))
        .then((r) => r.data),
    enabled,
    staleTime: ANALYTICS_STALE,
  })
}

export function useRegionStats(
  filter: TimeFilter,
  customStart?: string,
  customEnd?: string,
  enabled = true
) {
  return useQuery({
    queryKey: ["analytics", "region-stats", filter, customStart, customEnd] as const,
    queryFn: () =>
      apiClient
        .get<RegionStat[]>(analyticsUrl("region-stats", filter, customStart, customEnd))
        .then((r) => r.data),
    enabled,
    staleTime: ANALYTICS_STALE,
  })
}
