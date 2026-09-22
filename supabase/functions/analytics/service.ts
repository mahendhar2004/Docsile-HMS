/**
 * Analytics service — business layer.
 *
 * Responsibilities:
 *   1. Resolve the shared ?filter= query param to a concrete { start, end } date range.
 *   2. Compute the comparison period (previous range) where needed (overview only).
 *   3. Instantiate the repository with the service-role client and the caller's hospitalId.
 *   4. Delegate all aggregation to the repository and return the typed result.
 *
 * No DB calls live here — all data access goes through AnalyticsRepository.
 * No permission logic lives here — requirePermission('reports:view') is wired
 * structurally in index.ts per ADR-002/006.
 */

import { getSupabaseClient } from '../_shared/supabase-client.ts';
import { AnalyticsRepository } from './repository.ts';
import type { Session } from '../_shared/auth.ts';
import type { AnalyticsQuery, TimeFilter } from './types.ts';

// ─── Private date-range helpers ──────────────────────────────────────────────

/**
 * Resolve the ?filter= + ?customStart/customEnd query params to an inclusive
 * { start, end } Date pair. The `end` date is exclusive (start of the day AFTER
 * the intended end) — consistent with the old Next.js behavior and Supabase's
 * `.lt('column', end)` filter convention.
 */
function resolveDateRange(q: AnalyticsQuery): { start: Date; end: Date } {
  const filter = (q.filter ?? 'today') as TimeFilter;
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 86_400_000);

  switch (filter) {
    case 'today':
      return { start: todayStart, end: todayEnd };
    case 'week': {
      const s = new Date(todayStart);
      s.setDate(s.getDate() - 7);
      return { start: s, end: todayEnd };
    }
    case 'month': {
      const s = new Date(todayStart);
      s.setDate(s.getDate() - 30);
      return { start: s, end: todayEnd };
    }
    case 'year': {
      const s = new Date(todayStart);
      s.setFullYear(s.getFullYear() - 1);
      return { start: s, end: todayEnd };
    }
    case 'custom':
      return {
        start: q.customStart ? new Date(q.customStart) : todayStart,
        end: q.customEnd
          ? new Date(new Date(q.customEnd).getTime() + 86_400_000)
          : todayEnd,
      };
    default:
      return { start: todayStart, end: todayEnd };
  }
}

/**
 * Compute the previous comparison period (same duration, immediately before `start`).
 * Used only by getOverview for period-over-period change metrics.
 */
function getPreviousRange(start: Date, end: Date): { start: Date; end: Date } {
  const diff = end.getTime() - start.getTime();
  return {
    start: new Date(start.getTime() - diff),
    end: start,
  };
}

// ─── Service functions ────────────────────────────────────────────────────────

export async function getOverview(s: Session, q: AnalyticsQuery) {
  const { start, end } = resolveDateRange(q);
  const prev = getPreviousRange(start, end);
  const repo = new AnalyticsRepository(getSupabaseClient(), s.hospitalId);
  return repo.getOverview(
    start.toISOString(),
    end.toISOString(),
    prev.start.toISOString(),
    prev.end.toISOString(),
  );
}

export async function getGenderDistribution(s: Session, q: AnalyticsQuery) {
  const { start, end } = resolveDateRange(q);
  const repo = new AnalyticsRepository(getSupabaseClient(), s.hospitalId);
  return repo.getGenderDistribution(start.toISOString(), end.toISOString());
}

export async function getAgeDistribution(s: Session, q: AnalyticsQuery) {
  const { start, end } = resolveDateRange(q);
  const repo = new AnalyticsRepository(getSupabaseClient(), s.hospitalId);
  return repo.getAgeDistribution(start.toISOString(), end.toISOString());
}

export async function getRevenueByCategory(s: Session, q: AnalyticsQuery) {
  const { start, end } = resolveDateRange(q);
  const repo = new AnalyticsRepository(getSupabaseClient(), s.hospitalId);
  return repo.getRevenueByCategory(start.toISOString(), end.toISOString());
}

export async function getTimeSeries(s: Session, q: AnalyticsQuery) {
  const { start, end } = resolveDateRange(q);
  const repo = new AnalyticsRepository(getSupabaseClient(), s.hospitalId);
  return repo.getTimeSeries(start.toISOString(), end.toISOString());
}

export async function getTopServices(s: Session, q: AnalyticsQuery) {
  const { start, end } = resolveDateRange(q);
  const repo = new AnalyticsRepository(getSupabaseClient(), s.hospitalId);
  return repo.getTopServices(start.toISOString(), end.toISOString());
}

export async function getExpenseBreakdown(s: Session, q: AnalyticsQuery) {
  const { start, end } = resolveDateRange(q);
  const repo = new AnalyticsRepository(getSupabaseClient(), s.hospitalId);
  return repo.getExpenseBreakdown(start.toISOString(), end.toISOString());
}

export async function getFinancialSummary(s: Session, q: AnalyticsQuery) {
  const { start, end } = resolveDateRange(q);
  const repo = new AnalyticsRepository(getSupabaseClient(), s.hospitalId);
  return repo.getFinancialSummary(start.toISOString(), end.toISOString());
}

export async function getPaymentModeBreakdown(s: Session, q: AnalyticsQuery) {
  const { start, end } = resolveDateRange(q);
  const repo = new AnalyticsRepository(getSupabaseClient(), s.hospitalId);
  return repo.getPaymentModeBreakdown(start.toISOString(), end.toISOString());
}

export async function getDoctorPerformance(s: Session, q: AnalyticsQuery) {
  const { start, end } = resolveDateRange(q);
  const repo = new AnalyticsRepository(getSupabaseClient(), s.hospitalId);
  return repo.getDoctorPerformance(start.toISOString(), end.toISOString());
}

export async function getStatusDistribution(s: Session, q: AnalyticsQuery) {
  const { start, end } = resolveDateRange(q);
  const repo = new AnalyticsRepository(getSupabaseClient(), s.hospitalId);
  return repo.getStatusDistribution(start.toISOString(), end.toISOString());
}

export async function getCommonDiagnoses(s: Session, q: AnalyticsQuery) {
  const { start, end } = resolveDateRange(q);
  const repo = new AnalyticsRepository(getSupabaseClient(), s.hospitalId);
  return repo.getCommonDiagnoses(start.toISOString(), end.toISOString());
}

export async function getCommonMedicines(s: Session, q: AnalyticsQuery) {
  const { start, end } = resolveDateRange(q);
  const repo = new AnalyticsRepository(getSupabaseClient(), s.hospitalId);
  return repo.getCommonMedicines(start.toISOString(), end.toISOString());
}

export async function getTopPrescribedInvestigations(s: Session, q: AnalyticsQuery) {
  const { start, end } = resolveDateRange(q);
  const repo = new AnalyticsRepository(getSupabaseClient(), s.hospitalId);
  return repo.getTopPrescribedInvestigations(start.toISOString(), end.toISOString());
}

export async function getTopPharmacySales(s: Session, q: AnalyticsQuery) {
  const { start, end } = resolveDateRange(q);
  const repo = new AnalyticsRepository(getSupabaseClient(), s.hospitalId);
  return repo.getTopPharmacySales(start.toISOString(), end.toISOString());
}

export async function getTopLabTests(s: Session, q: AnalyticsQuery) {
  const { start, end } = resolveDateRange(q);
  const repo = new AnalyticsRepository(getSupabaseClient(), s.hospitalId);
  return repo.getTopLabTests(start.toISOString(), end.toISOString());
}

export async function getReferralStats(s: Session, q: AnalyticsQuery) {
  const { start, end } = resolveDateRange(q);
  const repo = new AnalyticsRepository(getSupabaseClient(), s.hospitalId);
  return repo.getReferralStats(start.toISOString(), end.toISOString());
}

export async function getSurgeryBreakdown(s: Session, q: AnalyticsQuery) {
  const { start, end } = resolveDateRange(q);
  const repo = new AnalyticsRepository(getSupabaseClient(), s.hospitalId);
  return repo.getSurgeryBreakdown(start.toISOString(), end.toISOString());
}

export async function getRegionStats(s: Session, q: AnalyticsQuery) {
  const { start, end } = resolveDateRange(q);
  const repo = new AnalyticsRepository(getSupabaseClient(), s.hospitalId);
  return repo.getRegionStats(start.toISOString(), end.toISOString());
}
