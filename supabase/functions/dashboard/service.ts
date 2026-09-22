/**
 * Dashboard service — business layer.
 *
 * Thin orchestrators: resolve the session, instantiate the repository, delegate
 * all data-access to it. No DB calls here. No framework concerns here.
 *
 * Permission enforcement (reports:view) is wired structurally in index.ts.
 */

import { getSupabaseClient } from '../_shared/supabase-client.ts';
import { DashboardRepository } from './repository.ts';
import type { Session } from '../_shared/auth.ts';
import type { TodaySummary, QuickStats } from './types.ts';

/**
 * Today's patient + revenue summary.
 * Aggregates across Patient, Prescription, PharmacyBill, LabBill, OpticalBill,
 * InPatient, and EyeReading — all scoped to the caller's hospital.
 */
export async function getSummary(s: Session): Promise<TodaySummary> {
  const repo = new DashboardRepository(getSupabaseClient(), s.hospitalId);
  return repo.getTodaySummary();
}

/**
 * Year-to-date and month-to-date revenue totals + active inpatient count.
 * Aggregates across Prescription, PharmacyBill, LabBill, OpticalBill,
 * and InPatient — all scoped to the caller's hospital.
 */
export async function getQuickStats(s: Session): Promise<QuickStats> {
  const repo = new DashboardRepository(getSupabaseClient(), s.hospitalId);
  return repo.getQuickStats();
}
