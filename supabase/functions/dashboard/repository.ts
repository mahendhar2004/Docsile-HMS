/**
 * Data-access layer for the dashboard module.
 *
 * This module owns no tables — it is a read-aggregation layer.
 *
 * Tables queried:
 *   Patient, Prescription, InPatient, EyeReading       — patient + workup counts
 *   Prescription, PharmacyBill, LabBill, OpticalBill   — revenue / collection figures
 *   InPatient                                           — inpatient billing + active count
 *
 * Revenue field names are sourced directly from analytics/repository.ts
 * and billing/repository.ts — identical column names, no invented aliases:
 *   Prescription:  total, amountPaid, balanceDue          (status != 'CANCELLED')
 *   PharmacyBill:  billAmount, paidAmount, balanceDue     (status != 'CANCELLED')
 *   LabBill:       total, amountPaid, balanceDue          (no status filter)
 *   OpticalBill:   billAmount, paidAmount, balanceDue     (status != 'CANCELLED')
 *   InPatient:     netAmount, totalReceivedAmount, balanceAmount
 *
 * IST-correct day bounds for today's summary match the helper in billing/repository.ts.
 * YTD/MTD boundaries use UTC midnight to match the analytics/service.ts convention.
 *
 * Every query is scoped by hospital_id per ADR-007. The client is the service-role
 * client (bypasses RLS); hospital_id scoping is the sole isolation mechanism here.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { TodaySummary, QuickStats } from './types.ts';

// ─── Private helpers ──────────────────────────────────────────────────────────

/**
 * Return the current date in IST (UTC+5:30) as a YYYY-MM-DD string.
 * Used so that "today" means today in Indian Standard Time, not UTC.
 */
function getISTDateStr(): string {
  const istMs = Date.now() + 5.5 * 60 * 60 * 1000;
  const d = new Date(istMs);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

/**
 * Convert a YYYY-MM-DD IST calendar date to UTC ISO range bounds.
 * Matches the identical helper in billing/repository.ts.
 *   IST midnight → UTC 18:30 of the previous calendar day
 *   IST 23:59:59.999 → UTC 18:29:59.999 of the same calendar day
 *
 * Only correct for columns whose value is populated by Postgres itself
 * (`DEFAULT CURRENT_TIMESTAMP`, e.g. billDate, createdAt) — those are always
 * naive UTC-clock digits, so a real UTC-converted bound compares correctly.
 */
function istDayBounds(dateStr: string): { from: string; to: string } {
  return {
    from: new Date(`${dateStr}T00:00:00.000+05:30`).toISOString(),
    to:   new Date(`${dateStr}T23:59:59.999+05:30`).toISOString(),
  };
}

/**
 * Raw (non-UTC-converted) IST day bounds, for columns the APPLICATION writes
 * directly (appointmentDate, prescriptionDate, admissionDate, readingDate —
 * all TIMESTAMP-without-timezone, written as naive IST-clock digits by
 * patient-care/doctor/workup's service layers). Postgres ignores any offset
 * on a literal cast to that column type, so these raw strings — not
 * `new Date(...).toISOString()`, which performs a real UTC conversion and
 * shifts the bound back by 5.5 hours — compare correctly against them.
 */
function istDayBoundsRaw(dateStr: string): { from: string; to: string } {
  return {
    from: `${dateStr}T00:00:00.000+05:30`,
    to: `${dateStr}T23:59:59.999+05:30`,
  };
}

// Row shapes returned from individual Supabase queries (select-specific columns).
// Using explicit interfaces avoids `any` casts while keeping the types narrow.
interface RxRow    { total: number | null; amountPaid: number | null; balanceDue: number | null }
interface PharmaRow { billAmount: number | null; paidAmount: number | null; balanceDue: number | null }
interface LabRow   { total: number | null; amountPaid: number | null; balanceDue: number | null }
interface OptRow   { billAmount: number | null; paidAmount: number | null; balanceDue: number | null }
interface IpRow    { netAmount: number | null; totalReceivedAmount: number | null; balanceAmount: number | null }
interface RxSumRow { total: number | null; amountPaid: number | null }
interface PharmaSumRow { billAmount: number | null; paidAmount: number | null }
interface LabSumRow    { total: number | null; amountPaid: number | null }
interface OptSumRow    { billAmount: number | null; paidAmount: number | null }
interface IpSumRow     { netAmount: number | null; totalReceivedAmount: number | null }

function sumRevColl<T extends { [K in RF | CF]: number | null }, RF extends string, CF extends string>(
  rows: T[],
  rf: RF,
  cf: CF,
): { revenue: number; collected: number } {
  return {
    revenue:   rows.reduce((s, r) => s + (r[rf]  ?? 0), 0),
    collected: rows.reduce((s, r) => s + (r[cf]  ?? 0), 0),
  };
}

function sumRevCollDues<T extends { [K in RF | CF | DF]: number | null }, RF extends string, CF extends string, DF extends string>(
  rows: T[],
  rf: RF,
  cf: CF,
  df: DF,
): { revenue: number; collected: number; dues: number } {
  return {
    revenue:   rows.reduce((s, r) => s + (r[rf]  ?? 0), 0),
    collected: rows.reduce((s, r) => s + (r[cf]  ?? 0), 0),
    dues:      rows.reduce((s, r) => s + (r[df]  ?? 0), 0),
  };
}

// ─── Repository ───────────────────────────────────────────────────────────────

export class DashboardRepository {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly hospitalId: string,
  ) {}

  /**
   * Aggregate today's patient + revenue stats.
   *
   * Fires 8 queries in parallel (all scoped by hospital_id):
   *   1. Patient count for today (IST)
   *   2. Prescription rows today — total, amountPaid, balanceDue
   *   3. PharmacyBill rows today — billAmount, paidAmount, balanceDue
   *   4. LabBill rows today     — total, amountPaid, balanceDue
   *   5. OpticalBill rows today — billAmount, paidAmount, balanceDue
   *   6. InPatient billing today (by admissionDate) — netAmount, totalReceivedAmount, balanceAmount
   *   7. Active InPatient count (status != 'DISCHARGED', all time)
   *   8. EyeReading count for today (for pendingWorkup estimate)
   */
  async getTodaySummary(): Promise<TodaySummary> {
    const hid = this.hospitalId;
    const dateStr = getISTDateStr();
    const { from, to } = istDayBounds(dateStr);
    const { from: fromRaw, to: toRaw } = istDayBoundsRaw(dateStr);

    const [
      patientsRes,
      rxRes,
      pharmaRes,
      labRes,
      optRes,
      ipBillingRes,
      activeIpRes,
      eyeReadingsRes,
    ] = await Promise.all([
      // 1. Patients with appointment today (IST)
      this.supabase
        .from('Patient')
        .select('*', { count: 'exact', head: true })
        .eq('hospital_id', hid)
        .gte('appointmentDate', fromRaw)
        .lte('appointmentDate', toRaw),

      // 2. Prescriptions today — non-CANCELLED (matches billing module getDailySummary)
      this.supabase
        .from('Prescription')
        .select('total, amountPaid, balanceDue')
        .eq('hospital_id', hid)
        .gte('prescriptionDate', fromRaw)
        .lte('prescriptionDate', toRaw)
        .neq('status', 'CANCELLED'),

      // 3. PharmacyBills today — non-CANCELLED (field names from analytics/repository.ts)
      this.supabase
        .from('PharmacyBill')
        .select('billAmount, paidAmount, balanceDue')
        .eq('hospital_id', hid)
        .gte('billDate', from)
        .lte('billDate', to)
        .neq('status', 'CANCELLED'),

      // 4. LabBills today — no status filter (analytics/repository.ts convention)
      this.supabase
        .from('LabBill')
        .select('total, amountPaid, balanceDue')
        .eq('hospital_id', hid)
        .gte('createdAt', from)
        .lte('createdAt', to),

      // 5. OpticalBills today — non-CANCELLED
      this.supabase
        .from('OpticalBill')
        .select('billAmount, paidAmount, balanceDue')
        .eq('hospital_id', hid)
        .gte('billDate', from)
        .lte('billDate', to)
        .neq('status', 'CANCELLED'),

      // 6. InPatient billing admitted today (matches analytics/repository.ts)
      this.supabase
        .from('InPatient')
        .select('netAmount, totalReceivedAmount, balanceAmount')
        .eq('hospital_id', hid)
        .gte('admissionDate', fromRaw)
        .lte('admissionDate', toRaw),

      // 7. Currently active inpatients (not discharged, any admission date)
      this.supabase
        .from('InPatient')
        .select('*', { count: 'exact', head: true })
        .eq('hospital_id', hid)
        .neq('status', 'DISCHARGED'),

      // 8. Eye readings today — pendingWorkup = patients - eyeReadings (approx)
      this.supabase
        .from('EyeReading')
        .select('*', { count: 'exact', head: true })
        .eq('hospital_id', hid)
        .gte('readingDate', fromRaw)
        .lte('readingDate', toRaw),
    ]);

    if (patientsRes.error)  throw new Error(`dashboard.summary patients query failed: ${patientsRes.error.message}`);
    if (rxRes.error)        throw new Error(`dashboard.summary prescriptions query failed: ${rxRes.error.message}`);
    if (pharmaRes.error)    throw new Error(`dashboard.summary pharmacy query failed: ${pharmaRes.error.message}`);
    if (labRes.error)       throw new Error(`dashboard.summary labs query failed: ${labRes.error.message}`);
    if (optRes.error)       throw new Error(`dashboard.summary optical query failed: ${optRes.error.message}`);
    if (ipBillingRes.error) throw new Error(`dashboard.summary inpatient billing query failed: ${ipBillingRes.error.message}`);
    if (activeIpRes.error)  throw new Error(`dashboard.summary active-inpatients query failed: ${activeIpRes.error.message}`);
    if (eyeReadingsRes.error) throw new Error(`dashboard.summary eye-readings query failed: ${eyeReadingsRes.error.message}`);

    const newPatientsToday = patientsRes.count ?? 0;
    const eyeReadingsToday = eyeReadingsRes.count ?? 0;

    const rx     = sumRevCollDues(rxRes.data as RxRow[] ?? [],         'total',      'amountPaid',         'balanceDue');
    const pharma = sumRevCollDues(pharmaRes.data as PharmaRow[] ?? [], 'billAmount', 'paidAmount',         'balanceDue');
    const lab    = sumRevCollDues(labRes.data as LabRow[] ?? [],       'total',      'amountPaid',         'balanceDue');
    const opt    = sumRevCollDues(optRes.data as OptRow[] ?? [],       'billAmount', 'paidAmount',         'balanceDue');
    const ip     = sumRevCollDues(ipBillingRes.data as IpRow[] ?? [],  'netAmount',  'totalReceivedAmount', 'balanceAmount');

    return {
      date:              dateStr,
      newPatientsToday,
      totalPrescriptions: (rxRes.data ?? []).length,
      totalRevenue:      rx.revenue    + pharma.revenue    + lab.revenue    + opt.revenue    + ip.revenue,
      totalCollected:    rx.collected  + pharma.collected  + lab.collected  + opt.collected  + ip.collected,
      totalDues:         rx.dues       + pharma.dues       + lab.dues       + opt.dues       + ip.dues,
      activeInpatients:  activeIpRes.count ?? 0,
      // Approximate: patients today without a corresponding eye reading today.
      // Exact per-patient join is deferred to the workup queue endpoint.
      pendingWorkup:     Math.max(0, newPatientsToday - eyeReadingsToday),
    };
  }

  /**
   * Return YTD and MTD revenue totals, patient counts, and the current active
   * inpatient count.
   *
   * Date boundary convention: UTC midnight (matches analytics/service.ts).
   * Fires 13 queries in parallel — all scoped by hospital_id per ADR-007.
   */
  async getQuickStats(): Promise<QuickStats> {
    const hid = this.hospitalId;
    const now     = new Date();
    const today   = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today.getTime() + 86_400_000);

    // UTC midnight at the start of the relevant period
    const ytdStart = new Date(now.getFullYear(), 0, 1).toISOString();
    const mtdStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const end      = tomorrow.toISOString();

    const [
      ytdPatientsRes, mtdPatientsRes,
      ytdRxRes,       mtdRxRes,
      ytdPharmaRes,   mtdPharmaRes,
      ytdLabRes,      mtdLabRes,
      ytdOptRes,      mtdOptRes,
      ytdIpRes,       mtdIpRes,
      activeIpRes,
    ] = await Promise.all([
      // Patients YTD / MTD (by appointmentDate)
      this.supabase.from('Patient').select('*', { count: 'exact', head: true })
        .eq('hospital_id', hid).gte('appointmentDate', ytdStart).lt('appointmentDate', end),
      this.supabase.from('Patient').select('*', { count: 'exact', head: true })
        .eq('hospital_id', hid).gte('appointmentDate', mtdStart).lt('appointmentDate', end),

      // Prescriptions YTD / MTD (by prescriptionDate, non-CANCELLED)
      this.supabase.from('Prescription').select('total, amountPaid')
        .eq('hospital_id', hid).gte('prescriptionDate', ytdStart).lt('prescriptionDate', end).neq('status', 'CANCELLED'),
      this.supabase.from('Prescription').select('total, amountPaid')
        .eq('hospital_id', hid).gte('prescriptionDate', mtdStart).lt('prescriptionDate', end).neq('status', 'CANCELLED'),

      // PharmacyBills YTD / MTD (by billDate, non-CANCELLED)
      this.supabase.from('PharmacyBill').select('billAmount, paidAmount')
        .eq('hospital_id', hid).gte('billDate', ytdStart).lt('billDate', end).neq('status', 'CANCELLED'),
      this.supabase.from('PharmacyBill').select('billAmount, paidAmount')
        .eq('hospital_id', hid).gte('billDate', mtdStart).lt('billDate', end).neq('status', 'CANCELLED'),

      // LabBills YTD / MTD (by createdAt)
      this.supabase.from('LabBill').select('total, amountPaid')
        .eq('hospital_id', hid).gte('createdAt', ytdStart).lt('createdAt', end),
      this.supabase.from('LabBill').select('total, amountPaid')
        .eq('hospital_id', hid).gte('createdAt', mtdStart).lt('createdAt', end),

      // OpticalBills YTD / MTD (by billDate, non-CANCELLED)
      this.supabase.from('OpticalBill').select('billAmount, paidAmount')
        .eq('hospital_id', hid).gte('billDate', ytdStart).lt('billDate', end).neq('status', 'CANCELLED'),
      this.supabase.from('OpticalBill').select('billAmount, paidAmount')
        .eq('hospital_id', hid).gte('billDate', mtdStart).lt('billDate', end).neq('status', 'CANCELLED'),

      // InPatient billing YTD / MTD (by admissionDate)
      this.supabase.from('InPatient').select('netAmount, totalReceivedAmount')
        .eq('hospital_id', hid).gte('admissionDate', ytdStart).lt('admissionDate', end),
      this.supabase.from('InPatient').select('netAmount, totalReceivedAmount')
        .eq('hospital_id', hid).gte('admissionDate', mtdStart).lt('admissionDate', end),

      // Currently active inpatients (not discharged, all time)
      this.supabase.from('InPatient').select('*', { count: 'exact', head: true })
        .eq('hospital_id', hid).neq('status', 'DISCHARGED'),
    ]);

    const allResults = [
      ytdPatientsRes, mtdPatientsRes,
      ytdRxRes, mtdRxRes, ytdPharmaRes, mtdPharmaRes,
      ytdLabRes, mtdLabRes, ytdOptRes, mtdOptRes,
      ytdIpRes, mtdIpRes, activeIpRes,
    ];
    for (const res of allResults) {
      if (res.error) throw new Error(`dashboard.quick-stats query failed: ${res.error.message}`);
    }

    function agg(
      rxRows: RxSumRow[],
      pharmaRows: PharmaSumRow[],
      labRows: LabSumRow[],
      optRows: OptSumRow[],
      ipRows: IpSumRow[],
    ): { totalRevenue: number; totalCollected: number } {
      const rx     = sumRevColl(rxRows,     'total',      'amountPaid');
      const pharma = sumRevColl(pharmaRows, 'billAmount', 'paidAmount');
      const lab    = sumRevColl(labRows,    'total',      'amountPaid');
      const opt    = sumRevColl(optRows,    'billAmount', 'paidAmount');
      const ip     = sumRevColl(ipRows,     'netAmount',  'totalReceivedAmount');
      return {
        totalRevenue:   rx.revenue   + pharma.revenue   + lab.revenue   + opt.revenue   + ip.revenue,
        totalCollected: rx.collected + pharma.collected + lab.collected + opt.collected + ip.collected,
      };
    }

    const ytdAgg = agg(
      (ytdRxRes.data    ?? []) as RxSumRow[],
      (ytdPharmaRes.data ?? []) as PharmaSumRow[],
      (ytdLabRes.data    ?? []) as LabSumRow[],
      (ytdOptRes.data    ?? []) as OptSumRow[],
      (ytdIpRes.data     ?? []) as IpSumRow[],
    );
    const mtdAgg = agg(
      (mtdRxRes.data    ?? []) as RxSumRow[],
      (mtdPharmaRes.data ?? []) as PharmaSumRow[],
      (mtdLabRes.data    ?? []) as LabSumRow[],
      (mtdOptRes.data    ?? []) as OptSumRow[],
      (mtdIpRes.data     ?? []) as IpSumRow[],
    );

    return {
      ytd: {
        totalPatients:  ytdPatientsRes.count ?? 0,
        totalRevenue:   ytdAgg.totalRevenue,
        totalCollected: ytdAgg.totalCollected,
      },
      mtd: {
        totalPatients:  mtdPatientsRes.count ?? 0,
        totalRevenue:   mtdAgg.totalRevenue,
        totalCollected: mtdAgg.totalCollected,
      },
      activeInpatients: activeIpRes.count ?? 0,
    };
  }
}
