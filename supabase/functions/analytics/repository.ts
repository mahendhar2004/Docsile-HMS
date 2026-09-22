/**
 * Analytics repository — read-only aggregation layer.
 *
 * Owns no tables. Reads from:
 *   Patient, Prescription, InPatient, Expense, ExpenseCategory
 *   PharmacyBill, PharmacyBillItem, LabBill, LabBillItem, OpticalBill, InvoiceItem
 *
 * Every query is scoped by hospital_id (ADR-007). The supabase client uses the
 * service_role key which bypasses RLS, so hospital_id scoping is mandatory here.
 *
 * Private module helpers (fmt, normalizePaymentMode, topCountMap) are kept
 * module-local — they are not candidates for the shared kernel (used by this
 * module only, not by 3+ modules per the boundary rule).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  AnalyticsOverview,
  GenderDistribution,
  AgeGroup,
  RevenueByCategory,
  TimeSeriesPoint,
  TopService,
  ExpenseByCategory,
  FinancialSummary,
  DailyFinancial,
  PaymentModeBreakdown,
  DoctorPerformance,
  StatusDistribution,
  CommonDiagnosis,
  CommonMedicine,
  CommonInvestigation,
  PharmacySaleStat,
  LabTestStat,
  ReferralStat,
  SurgeryBreakdown,
  RegionStat,
} from './types.ts';

// ─── Private module helpers ──────────────────────────────────────────────────

/** Format a Date or ISO string to YYYY-MM-DD. */
function fmt(d: Date | string): string {
  return new Date(d).toISOString().split('T')[0];
}

/**
 * Normalize a raw payment mode DB value to a display label.
 * Shared by getPaymentModeBreakdown only — module-local.
 */
function normalizePaymentMode(raw: string | null | undefined): string {
  if (!raw) return 'Cash';
  const s = raw.trim().toUpperCase();
  if (s === 'CASH') return 'Cash';
  if (s === 'UPI') return 'UPI';
  if (s === 'CARD') return 'Card';
  if (s === 'CHEQUE' || s === 'NEFT' || s === 'BANK TRANSFER' || s === 'ONLINE') return 'Cheque/NEFT';
  if (s === 'INSURANCE') return 'Insurance';
  return 'Others';
}

/**
 * Build a frequency map from an array of string values.
 * Shared by getCommonDiagnoses and getCommonMedicines to count occurrences.
 */
function buildCountMap(values: string[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const v of values) {
    const key = v.trim();
    if (key) map.set(key, (map.get(key) ?? 0) + 1);
  }
  return map;
}

// ─── Repository ──────────────────────────────────────────────────────────────

export class AnalyticsRepository {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly hospitalId: string,
  ) {}

  // ── 1. Overview ────────────────────────────────────────────────────────────

  async getOverview(
    from: string,
    to: string,
    prevFrom: string,
    prevTo: string,
  ): Promise<AnalyticsOverview> {
    const hid = this.hospitalId;

    // Compute today's boundaries for the newPatientsToday sub-metric.
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 86_400_000);
    const todayFrom = todayStart.toISOString();
    const todayTo = todayEnd.toISOString();

    const [
      totalPatientsRes,
      prevPatientsRes,
      newPatientsTodayRes,
      prescriptionsRes,
      prevPrescriptionsRes,
      expensesRes,
      labBillsRes,
      pharmacyBillsRes,
      opticalBillsRes,
      totalInpatientsRes,
      activeInpatientsRes,
      surgeriesRes,
      inpatientBillingRes,
      prevLabBillsRes,
      prevPharmacyBillsRes,
      prevOpticalBillsRes,
      prevInpatientRes,
    ] = await Promise.all([
      // Patients in current period
      this.supabase.from('Patient').select('*', { count: 'exact', head: true })
        .eq('hospital_id', hid).gte('appointmentDate', from).lt('appointmentDate', to),
      // Patients in previous period
      this.supabase.from('Patient').select('*', { count: 'exact', head: true })
        .eq('hospital_id', hid).gte('appointmentDate', prevFrom).lt('appointmentDate', prevTo),
      // New patients today (always today, independent of filter)
      this.supabase.from('Patient').select('*', { count: 'exact', head: true })
        .eq('hospital_id', hid).gte('appointmentDate', todayFrom).lt('appointmentDate', todayTo),
      // Prescriptions in current period
      this.supabase.from('Prescription')
        .select('patientId, total, amountPaid, balanceDue, discount')
        .eq('hospital_id', hid).gte('prescriptionDate', from).lt('prescriptionDate', to)
        .neq('status', 'CANCELLED'),
      // Prescriptions in previous period (total only)
      this.supabase.from('Prescription').select('total')
        .eq('hospital_id', hid).gte('prescriptionDate', prevFrom).lt('prescriptionDate', prevTo)
        .neq('status', 'CANCELLED'),
      // Expenses
      this.supabase.from('Expense').select('amount')
        .eq('hospital_id', hid).gte('date', from).lt('date', to),
      // Lab bills current
      this.supabase.from('LabBill').select('total, amountPaid, balanceDue, discount')
        .eq('hospital_id', hid).gte('createdAt', from).lt('createdAt', to),
      // Pharmacy bills current
      this.supabase.from('PharmacyBill').select('billAmount, paidAmount, balanceDue, discountAmount')
        .eq('hospital_id', hid).gte('billDate', from).lt('billDate', to).neq('status', 'CANCELLED'),
      // Optical bills current
      this.supabase.from('OpticalBill').select('billAmount, paidAmount, balanceDue, discountAmount')
        .eq('hospital_id', hid).gte('billDate', from).lt('billDate', to).neq('status', 'CANCELLED'),
      // Total inpatients admitted in period
      this.supabase.from('InPatient').select('*', { count: 'exact', head: true })
        .eq('hospital_id', hid).gte('admissionDate', from).lt('admissionDate', to),
      // Currently active inpatients (not discharged, across all time)
      this.supabase.from('InPatient').select('*', { count: 'exact', head: true })
        .eq('hospital_id', hid).neq('status', 'DISCHARGED'),
      // Surgeries in period
      this.supabase.from('InPatient').select('id')
        .eq('hospital_id', hid).gte('operationDate', from).lt('operationDate', to)
        .not('operationName', 'is', null),
      // Inpatient billing in period
      this.supabase.from('InPatient').select('netAmount, totalReceivedAmount, balanceAmount, discount')
        .eq('hospital_id', hid).gte('admissionDate', from).lt('admissionDate', to),
      // Previous lab bills
      this.supabase.from('LabBill').select('total')
        .eq('hospital_id', hid).gte('createdAt', prevFrom).lt('createdAt', prevTo),
      // Previous pharmacy bills
      this.supabase.from('PharmacyBill').select('billAmount')
        .eq('hospital_id', hid).gte('billDate', prevFrom).lt('billDate', prevTo).neq('status', 'CANCELLED'),
      // Previous optical bills
      this.supabase.from('OpticalBill').select('billAmount')
        .eq('hospital_id', hid).gte('billDate', prevFrom).lt('billDate', prevTo).neq('status', 'CANCELLED'),
      // Previous inpatient billing
      this.supabase.from('InPatient').select('netAmount')
        .eq('hospital_id', hid).gte('admissionDate', prevFrom).lt('admissionDate', prevTo),
    ]);

    const totalPatients = totalPatientsRes.count ?? 0;
    const prevPatients = prevPatientsRes.count ?? 0;
    const newPatientsToday = newPatientsTodayRes.count ?? 0;

    const rxRows = prescriptionsRes.data ?? [];
    const rxTotal = rxRows.reduce((s, r) => s + (r.total ?? 0), 0);
    const rxPaid = rxRows.reduce((s, r) => s + (r.amountPaid ?? 0), 0);
    const rxDues = rxRows.reduce((s, r) => s + (r.balanceDue ?? 0), 0);
    const rxDiscount = rxRows.reduce((s, r) => s + (r.discount ?? 0), 0);
    const prevRxTotal = (prevPrescriptionsRes.data ?? []).reduce((s, r) => s + (r.total ?? 0), 0);

    const expensesTotal = (expensesRes.data ?? []).reduce((s, r) => s + (r.amount ?? 0), 0);

    const labRows = labBillsRes.data ?? [];
    const labTotal = labRows.reduce((s, r) => s + (r.total ?? 0), 0);
    const labPaid = labRows.reduce((s, r) => s + (r.amountPaid ?? 0), 0);
    const labDues = labRows.reduce((s, r) => s + (r.balanceDue ?? 0), 0);
    const labDiscount = labRows.reduce((s, r) => s + (r.discount ?? 0), 0);
    const prevLabTotal = (prevLabBillsRes.data ?? []).reduce((s, r) => s + (r.total ?? 0), 0);

    const pharmaRows = pharmacyBillsRes.data ?? [];
    const pharmaTotal = pharmaRows.reduce((s, r) => s + (r.billAmount ?? 0), 0);
    const pharmaPaid = pharmaRows.reduce((s, r) => s + (r.paidAmount ?? 0), 0);
    const pharmaDues = pharmaRows.reduce((s, r) => s + (r.balanceDue ?? 0), 0);
    const pharmaDiscount = pharmaRows.reduce((s, r) => s + (r.discountAmount ?? 0), 0);
    const prevPharmaTotal = (prevPharmacyBillsRes.data ?? []).reduce((s, r) => s + (r.billAmount ?? 0), 0);

    const optRows = opticalBillsRes.data ?? [];
    const optTotal = optRows.reduce((s, r) => s + (r.billAmount ?? 0), 0);
    const optPaid = optRows.reduce((s, r) => s + (r.paidAmount ?? 0), 0);
    const optDues = optRows.reduce((s, r) => s + (r.balanceDue ?? 0), 0);
    const optDiscount = optRows.reduce((s, r) => s + (r.discountAmount ?? 0), 0);
    const prevOptTotal = (prevOpticalBillsRes.data ?? []).reduce((s, r) => s + (r.billAmount ?? 0), 0);

    const totalInpatients = totalInpatientsRes.count ?? 0;
    const activeInpatients = activeInpatientsRes.count ?? 0;
    const totalSurgeries = (surgeriesRes.data ?? []).length;

    const ipRows = inpatientBillingRes.data ?? [];
    const ipTotal = ipRows.reduce((s, r) => s + (r.netAmount ?? 0), 0);
    const ipPaid = ipRows.reduce((s, r) => s + (r.totalReceivedAmount ?? 0), 0);
    const ipDues = ipRows.reduce((s, r) => s + (r.balanceAmount ?? 0), 0);
    const ipDiscount = ipRows.reduce((s, r) => s + (r.discount ?? 0), 0);
    const prevIpTotal = (prevInpatientRes.data ?? []).reduce((s, r) => s + (r.netAmount ?? 0), 0);

    const totalRevenue = rxTotal + labTotal + pharmaTotal + optTotal + ipTotal;
    const totalCollected = rxPaid + labPaid + pharmaPaid + optPaid + ipPaid;
    const totalDues = rxDues + labDues + pharmaDues + optDues + ipDues;
    const totalDiscount = rxDiscount + labDiscount + pharmaDiscount + optDiscount + ipDiscount;
    const prevRevenue = prevRxTotal + prevLabTotal + prevPharmaTotal + prevOptTotal + prevIpTotal;

    const patientChange = prevPatients > 0
      ? Math.round(((totalPatients - prevPatients) / prevPatients) * 100) : 0;
    const revenueChange = prevRevenue > 0
      ? Math.round(((totalRevenue - prevRevenue) / prevRevenue) * 100) : 0;
    const collectionRate = totalRevenue > 0
      ? Math.round((totalCollected / totalRevenue) * 100) : 0;
    const revenuePerPatient = totalPatients > 0
      ? Math.round(totalRevenue / totalPatients) : 0;

    const daysInPeriod = Math.max(
      1,
      Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86_400_000),
    );
    const avgDailyPatients = Math.round(totalPatients / daysInPeriod);

    // Follow-up visits: current-period patients who had a prior prescription.
    const currentPatientIds = [...new Set(rxRows.map(r => r.patientId).filter(Boolean) as string[])];
    let followUpVisits = 0;
    if (currentPatientIds.length > 0) {
      const { count } = await this.supabase.from('Prescription')
        .select('patientId', { count: 'exact', head: true })
        .eq('hospital_id', hid)
        .lt('prescriptionDate', from)
        .in('patientId', currentPatientIds);
      followUpVisits = Math.min(count ?? 0, currentPatientIds.length);
    }

    // Surgery conversion: prescriptions with "surgery" in additionalNotes → converted to inpatient.
    const { data: surgeryRxData } = await this.supabase.from('Prescription')
      .select('patientId')
      .eq('hospital_id', hid)
      .gte('prescriptionDate', from).lt('prescriptionDate', to)
      .neq('status', 'CANCELLED')
      .ilike('additionalNotes', '%surgery%');

    const surgeryPatientIds = [
      ...new Set((surgeryRxData ?? []).map(r => r.patientId as string).filter(Boolean)),
    ];
    const surgeryRecommended = surgeryPatientIds.length;

    let surgeryConverted = 0;
    if (surgeryPatientIds.length > 0) {
      const { count } = await this.supabase.from('InPatient')
        .select('patientId', { count: 'exact', head: true })
        .eq('hospital_id', hid)
        .in('patientId', surgeryPatientIds);
      surgeryConverted = count ?? 0;
    }
    const conversionRate = surgeryRecommended > 0
      ? Math.round((surgeryConverted / surgeryRecommended) * 100) : 0;

    return {
      totalPatients,
      newPatientsToday,
      totalRevenue,
      totalCollected,
      totalDues,
      totalExpenses: expensesTotal,
      totalConsultationRevenue: rxTotal,
      totalLabRevenue: labTotal,
      totalPharmacyRevenue: pharmaTotal,
      totalOpticalRevenue: optTotal,
      totalInpatientRevenue: ipTotal,
      totalInpatients,
      activeInpatients,
      totalSurgeries,
      patientChange,
      revenueChange,
      collectionRate,
      revenuePerPatient,
      followUpVisits,
      avgDailyPatients,
      surgeryRecommended,
      surgeryConverted,
      conversionRate,
      consultationDiscount: rxDiscount,
      labDiscount,
      pharmacyDiscount: pharmaDiscount,
      opticalDiscount: optDiscount,
      inpatientDiscount: ipDiscount,
      totalDiscount,
    };
  }

  // ── 2. Gender distribution ─────────────────────────────────────────────────

  async getGenderDistribution(from: string, to: string): Promise<GenderDistribution> {
    const hid = this.hospitalId;
    const [maleRes, femaleRes, totalRes] = await Promise.all([
      this.supabase.from('Patient').select('*', { count: 'exact', head: true })
        .eq('hospital_id', hid).gte('appointmentDate', from).lt('appointmentDate', to)
        .eq('gender', 'MALE'),
      this.supabase.from('Patient').select('*', { count: 'exact', head: true })
        .eq('hospital_id', hid).gte('appointmentDate', from).lt('appointmentDate', to)
        .eq('gender', 'FEMALE'),
      this.supabase.from('Patient').select('*', { count: 'exact', head: true })
        .eq('hospital_id', hid).gte('appointmentDate', from).lt('appointmentDate', to),
    ]);
    const male = maleRes.count ?? 0;
    const female = femaleRes.count ?? 0;
    const total = totalRes.count ?? 0;
    return { male, female, other: total - male - female };
  }

  // ── 3. Age distribution ────────────────────────────────────────────────────

  async getAgeDistribution(from: string, to: string): Promise<AgeGroup[]> {
    const { data } = await this.supabase.from('Patient').select('age')
      .eq('hospital_id', this.hospitalId)
      .gte('appointmentDate', from).lt('appointmentDate', to);

    const groups: Record<string, number> = {
      '0-10': 0, '11-20': 0, '21-30': 0, '31-40': 0,
      '41-50': 0, '51-60': 0, '61-70': 0, '71+': 0,
    };
    for (const p of data ?? []) {
      const age = (p.age as number) ?? 0;
      if (age <= 10) groups['0-10']++;
      else if (age <= 20) groups['11-20']++;
      else if (age <= 30) groups['21-30']++;
      else if (age <= 40) groups['31-40']++;
      else if (age <= 50) groups['41-50']++;
      else if (age <= 60) groups['51-60']++;
      else if (age <= 70) groups['61-70']++;
      else groups['71+']++;
    }
    return Object.entries(groups).map(([label, count]) => ({ label, count }));
  }

  // ── 4. Revenue by category ─────────────────────────────────────────────────

  async getRevenueByCategory(from: string, to: string): Promise<RevenueByCategory[]> {
    const hid = this.hospitalId;
    const [rxRes, labRes, pharmaRes, optRes, ipRes] = await Promise.all([
      this.supabase.from('Prescription').select('total')
        .eq('hospital_id', hid).gte('prescriptionDate', from).lt('prescriptionDate', to)
        .neq('status', 'CANCELLED'),
      this.supabase.from('LabBill').select('total')
        .eq('hospital_id', hid).gte('createdAt', from).lt('createdAt', to),
      this.supabase.from('PharmacyBill').select('billAmount')
        .eq('hospital_id', hid).gte('billDate', from).lt('billDate', to).neq('status', 'CANCELLED'),
      this.supabase.from('OpticalBill').select('billAmount')
        .eq('hospital_id', hid).gte('billDate', from).lt('billDate', to).neq('status', 'CANCELLED'),
      this.supabase.from('InPatient').select('netAmount')
        .eq('hospital_id', hid).gte('admissionDate', from).lt('admissionDate', to),
    ]);
    return [
      {
        category: 'Consultations',
        amount: (rxRes.data ?? []).reduce((s, r) => s + (r.total ?? 0), 0),
        color: '#3b82f6',
      },
      {
        category: 'Labs',
        amount: (labRes.data ?? []).reduce((s, r) => s + (r.total ?? 0), 0),
        color: '#14b8a6',
      },
      {
        category: 'Pharmacy',
        amount: (pharmaRes.data ?? []).reduce((s, r) => s + (r.billAmount ?? 0), 0),
        color: '#10b981',
      },
      {
        category: 'Optical',
        amount: (optRes.data ?? []).reduce((s, r) => s + (r.billAmount ?? 0), 0),
        color: '#8b5cf6',
      },
      {
        category: 'In-Patient',
        amount: (ipRes.data ?? []).reduce((s, r) => s + (r.netAmount ?? 0), 0),
        color: '#f59e0b',
      },
    ];
  }

  // ── 5. Time series ─────────────────────────────────────────────────────────

  async getTimeSeries(from: string, to: string): Promise<TimeSeriesPoint[]> {
    const hid = this.hospitalId;
    const [patientsRes, rxRes, expensesRes] = await Promise.all([
      this.supabase.from('Patient').select('appointmentDate')
        .eq('hospital_id', hid).gte('appointmentDate', from).lt('appointmentDate', to),
      this.supabase.from('Prescription').select('prescriptionDate, total, amountPaid')
        .eq('hospital_id', hid).gte('prescriptionDate', from).lt('prescriptionDate', to)
        .neq('status', 'CANCELLED'),
      this.supabase.from('Expense').select('date, amount')
        .eq('hospital_id', hid).gte('date', from).lt('date', to),
    ]);

    const patients = patientsRes.data ?? [];
    const prescriptions = rxRes.data ?? [];
    const expenses = expensesRes.data ?? [];

    // Build per-day buckets spanning the full range.
    const startDate = new Date(from);
    const endDate = new Date(to);
    const points: TimeSeriesPoint[] = [];
    const cursor = new Date(startDate);

    while (cursor < endDate) {
      const key = fmt(cursor);
      const dayPatients = patients.filter(p => fmt(p.appointmentDate as string) === key).length;
      const dayRx = prescriptions.filter(p => fmt(p.prescriptionDate as string) === key);
      const dayExp = expenses.filter(e => fmt(e.date as string) === key);
      points.push({
        date: key,
        patients: dayPatients,
        revenue: dayRx.reduce((s, r) => s + (r.total ?? 0), 0),
        collected: dayRx.reduce((s, r) => s + (r.amountPaid ?? 0), 0),
        expenses: dayExp.reduce((s, e) => s + (e.amount ?? 0), 0),
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    return points;
  }

  // ── 6. Top services ────────────────────────────────────────────────────────

  async getTopServices(from: string, to: string): Promise<TopService[]> {
    const hid = this.hospitalId;

    // Step 1: get prescription IDs in the date range for this hospital.
    const { data: rxData } = await this.supabase.from('Prescription')
      .select('id')
      .eq('hospital_id', hid)
      .gte('prescriptionDate', from).lt('prescriptionDate', to)
      .neq('status', 'CANCELLED');

    const rxIds = (rxData ?? []).map(r => r.id as string);
    if (rxIds.length === 0) return [];

    // Step 2: aggregate InvoiceItem for those prescriptions.
    const { data } = await this.supabase.from('InvoiceItem')
      .select('description, amount')
      .in('prescriptionId', rxIds);

    const map = new Map<string, { count: number; revenue: number }>();
    for (const item of data ?? []) {
      const key = (item.description as string) ?? '';
      if (!key) continue;
      const existing = map.get(key) ?? { count: 0, revenue: 0 };
      existing.count++;
      existing.revenue += (item.amount as number) ?? 0;
      map.set(key, existing);
    }

    return Array.from(map.entries())
      .map(([name, d]) => ({ name, ...d }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }

  // ── 7. Expense breakdown ───────────────────────────────────────────────────

  async getExpenseBreakdown(from: string, to: string): Promise<ExpenseByCategory[]> {
    const { data } = await this.supabase.from('Expense')
      .select('amount, category:ExpenseCategory(name, color)')
      .eq('hospital_id', this.hospitalId)
      .gte('date', from).lt('date', to);

    const map = new Map<string, { amount: number; color: string }>();
    for (const exp of data ?? []) {
      const cat = exp.category as { name: string; color: string } | null;
      if (!cat) continue;
      const existing = map.get(cat.name) ?? { amount: 0, color: cat.color };
      existing.amount += (exp.amount as number) ?? 0;
      map.set(cat.name, existing);
    }

    return Array.from(map.entries())
      .map(([category, d]) => ({ category, ...d }))
      .sort((a, b) => b.amount - a.amount);
  }

  // ── 8. Financial summary ───────────────────────────────────────────────────

  async getFinancialSummary(from: string, to: string): Promise<FinancialSummary> {
    const hid = this.hospitalId;
    const [rxRes, expRes, labRes, pharmaRes, optRes, ipRes] = await Promise.all([
      this.supabase.from('Prescription')
        .select('prescriptionDate, total, amountPaid, balanceDue, discount')
        .eq('hospital_id', hid).gte('prescriptionDate', from).lt('prescriptionDate', to)
        .neq('status', 'CANCELLED'),
      this.supabase.from('Expense').select('date, amount')
        .eq('hospital_id', hid).gte('date', from).lt('date', to),
      this.supabase.from('LabBill').select('total, amountPaid, balanceDue, discount')
        .eq('hospital_id', hid).gte('createdAt', from).lt('createdAt', to),
      this.supabase.from('PharmacyBill').select('billAmount, paidAmount, balanceDue, discountAmount')
        .eq('hospital_id', hid).gte('billDate', from).lt('billDate', to).neq('status', 'CANCELLED'),
      this.supabase.from('OpticalBill').select('billAmount, paidAmount, balanceDue, discountAmount')
        .eq('hospital_id', hid).gte('billDate', from).lt('billDate', to).neq('status', 'CANCELLED'),
      this.supabase.from('InPatient')
        .select('netAmount, totalReceivedAmount, balanceAmount, discount')
        .eq('hospital_id', hid).gte('admissionDate', from).lt('admissionDate', to),
    ]);

    const rx = rxRes.data ?? [];
    const exp = expRes.data ?? [];
    const lab = labRes.data ?? [];
    const pharma = pharmaRes.data ?? [];
    const opt = optRes.data ?? [];
    const ip = ipRes.data ?? [];

    const rxBilled = rx.reduce((s, r) => s + (r.total ?? 0), 0);
    const rxCollected = rx.reduce((s, r) => s + (r.amountPaid ?? 0), 0);
    const rxDiscount = rx.reduce((s, r) => s + (r.discount ?? 0), 0);
    const rxDues = rx.reduce((s, r) => s + (r.balanceDue ?? 0), 0);

    const labBilled = lab.reduce((s, r) => s + (r.total ?? 0), 0);
    const labCollected = lab.reduce((s, r) => s + (r.amountPaid ?? 0), 0);
    const labDiscount = lab.reduce((s, r) => s + (r.discount ?? 0), 0);
    const labDues = lab.reduce((s, r) => s + (r.balanceDue ?? 0), 0);

    const pharmaBilled = pharma.reduce((s, r) => s + (r.billAmount ?? 0), 0);
    const pharmaCollected = pharma.reduce((s, r) => s + (r.paidAmount ?? 0), 0);
    const pharmaDiscount = pharma.reduce((s, r) => s + (r.discountAmount ?? 0), 0);
    const pharmaDues = pharma.reduce((s, r) => s + (r.balanceDue ?? 0), 0);

    const optBilled = opt.reduce((s, r) => s + (r.billAmount ?? 0), 0);
    const optCollected = opt.reduce((s, r) => s + (r.paidAmount ?? 0), 0);
    const optDiscount = opt.reduce((s, r) => s + (r.discountAmount ?? 0), 0);
    const optDues = opt.reduce((s, r) => s + (r.balanceDue ?? 0), 0);

    const ipBilled = ip.reduce((s, r) => s + (r.netAmount ?? 0), 0);
    const ipCollected = ip.reduce((s, r) => s + (r.totalReceivedAmount ?? 0), 0);
    const ipDiscount = ip.reduce((s, r) => s + (r.discount ?? 0), 0);
    const ipDues = ip.reduce((s, r) => s + (r.balanceAmount ?? 0), 0);

    const totalBilled = rxBilled + labBilled + pharmaBilled + optBilled + ipBilled;
    const totalCollected = rxCollected + labCollected + pharmaCollected + optCollected + ipCollected;
    const totalDiscount = rxDiscount + labDiscount + pharmaDiscount + optDiscount + ipDiscount;
    const totalDues = rxDues + labDues + pharmaDues + optDues + ipDues;
    const totalExpenses = exp.reduce((s, e) => s + (e.amount ?? 0), 0);

    // Build per-day breakdown across the date range.
    const dayMap = new Map<string, DailyFinancial>();
    const cursor = new Date(from);
    const end = new Date(to);
    while (cursor < end) {
      const key = fmt(cursor);
      dayMap.set(key, { date: key, billed: 0, collected: 0, discount: 0, dues: 0, expenses: 0 });
      cursor.setDate(cursor.getDate() + 1);
    }

    for (const r of rx) {
      const day = dayMap.get(fmt(r.prescriptionDate as string));
      if (day) {
        day.billed += r.total ?? 0;
        day.collected += r.amountPaid ?? 0;
        day.discount += r.discount ?? 0;
        day.dues += r.balanceDue ?? 0;
      }
    }
    for (const e of exp) {
      const day = dayMap.get(fmt(e.date as string));
      if (day) day.expenses += e.amount ?? 0;
    }

    return {
      totalBilled,
      totalCollected,
      totalDiscount,
      totalDues,
      totalExpenses,
      netCashFlow: totalCollected - totalExpenses,
      dailyBreakdown: Array.from(dayMap.values()).sort((a, b) => b.date.localeCompare(a.date)),
      discountByModule: {
        consultations: rxDiscount,
        labs: labDiscount,
        pharmacy: pharmaDiscount,
        optical: optDiscount,
        inpatient: ipDiscount,
      },
    };
  }

  // ── 9. Payment mode breakdown ──────────────────────────────────────────────

  async getPaymentModeBreakdown(from: string, to: string): Promise<PaymentModeBreakdown[]> {
    const hid = this.hospitalId;
    const [rxRes, labRes, pharmaRes, optRes, ipRes] = await Promise.all([
      this.supabase.from('Prescription').select('paymentMode, amountPaid')
        .eq('hospital_id', hid).gte('prescriptionDate', from).lt('prescriptionDate', to)
        .neq('status', 'CANCELLED'),
      this.supabase.from('LabBill').select('paymentMode, amountPaid')
        .eq('hospital_id', hid).gte('createdAt', from).lt('createdAt', to),
      this.supabase.from('PharmacyBill').select('paymentMode, paidAmount')
        .eq('hospital_id', hid).gte('billDate', from).lt('billDate', to).neq('status', 'CANCELLED'),
      this.supabase.from('OpticalBill').select('paymentMode, paidAmount')
        .eq('hospital_id', hid).gte('billDate', from).lt('billDate', to).neq('status', 'CANCELLED'),
      this.supabase.from('InPatient').select('paymentRecords')
        .eq('hospital_id', hid).gte('admissionDate', from).lt('admissionDate', to),
    ]);

    const map = new Map<string, number>();
    const add = (mode: string | null | undefined, amount: number | null | undefined) => {
      const key = normalizePaymentMode(mode);
      map.set(key, (map.get(key) ?? 0) + (amount ?? 0));
    };

    for (const r of rxRes.data ?? []) add(r.paymentMode as string, r.amountPaid as number);
    for (const r of labRes.data ?? []) add(r.paymentMode as string, r.amountPaid as number);
    for (const r of pharmaRes.data ?? []) add(r.paymentMode as string, r.paidAmount as number);
    for (const r of optRes.data ?? []) add(r.paymentMode as string, r.paidAmount as number);

    for (const row of ipRes.data ?? []) {
      try {
        const records: { paymentMode?: string; amount?: number }[] =
          JSON.parse((row.paymentRecords as string) ?? '[]');
        for (const rec of records) add(rec.paymentMode, rec.amount);
      } catch { /* skip malformed JSON */ }
    }

    const total = [...map.values()].reduce((s, v) => s + v, 0);
    const ORDER = ['Cash', 'UPI', 'Card', 'Cheque/NEFT', 'Insurance', 'Others'];

    return ORDER
      .filter(m => (map.get(m) ?? 0) > 0)
      .map(m => ({
        mode: m,
        amount: map.get(m) ?? 0,
        percentage: total > 0 ? Math.round(((map.get(m) ?? 0) / total) * 100) : 0,
      }));
  }

  // ── 10. Doctor performance ─────────────────────────────────────────────────

  async getDoctorPerformance(from: string, to: string): Promise<DoctorPerformance[]> {
    const { data } = await this.supabase.from('Prescription')
      .select('doctorName, total')
      .eq('hospital_id', this.hospitalId)
      .gte('prescriptionDate', from).lt('prescriptionDate', to)
      .neq('status', 'CANCELLED')
      .not('doctorName', 'is', null);

    const map = new Map<string, { patients: number; revenue: number }>();
    for (const r of data ?? []) {
      const key = (r.doctorName as string) ?? 'Unknown';
      const existing = map.get(key) ?? { patients: 0, revenue: 0 };
      existing.patients++;
      existing.revenue += (r.total as number) ?? 0;
      map.set(key, existing);
    }

    return Array.from(map.entries())
      .map(([name, d]) => ({ name, ...d }))
      .sort((a, b) => b.patients - a.patients);
  }

  // ── 11. Status distribution ────────────────────────────────────────────────

  async getStatusDistribution(from: string, to: string): Promise<StatusDistribution[]> {
    const { data } = await this.supabase.from('Patient')
      .select('status')
      .eq('hospital_id', this.hospitalId)
      .gte('appointmentDate', from).lt('appointmentDate', to);

    const map = new Map<string, number>();
    for (const p of data ?? []) {
      const key = (p.status as string) ?? 'UNKNOWN';
      map.set(key, (map.get(key) ?? 0) + 1);
    }

    return Array.from(map.entries()).map(([status, count]) => ({ status, count }));
  }

  // ── 12. Common diagnoses ───────────────────────────────────────────────────

  async getCommonDiagnoses(from: string, to: string): Promise<CommonDiagnosis[]> {
    const { data } = await this.supabase.from('Prescription')
      .select('diagnosis')
      .eq('hospital_id', this.hospitalId)
      .gte('prescriptionDate', from).lt('prescriptionDate', to)
      .neq('status', 'CANCELLED')
      .not('diagnosis', 'is', null);

    const map = buildCountMap((data ?? []).map(r => r.diagnosis as string).filter(Boolean));
    const sorted = [...map.entries()].sort((a, b) => b[1] - a[1]);
    const total = sorted.reduce((s, [, c]) => s + c, 0);
    const top = sorted.slice(0, 5);
    const othersCount = sorted.slice(5).reduce((s, [, c]) => s + c, 0);

    const result: CommonDiagnosis[] = top.map(([diagnosis, count]) => ({
      diagnosis,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    }));
    if (othersCount > 0) {
      result.push({
        diagnosis: 'Others',
        count: othersCount,
        percentage: total > 0 ? Math.round((othersCount / total) * 100) : 0,
      });
    }
    return result;
  }

  // ── 13. Common medicines ───────────────────────────────────────────────────

  async getCommonMedicines(from: string, to: string): Promise<CommonMedicine[]> {
    const { data } = await this.supabase.from('Prescription')
      .select('medicines')
      .eq('hospital_id', this.hospitalId)
      .gte('prescriptionDate', from).lt('prescriptionDate', to)
      .neq('status', 'CANCELLED');

    const names: string[] = [];
    for (const row of data ?? []) {
      try {
        const meds: { name?: string }[] = JSON.parse((row.medicines as string) ?? '[]');
        for (const m of meds) if (m.name) names.push(m.name);
      } catch { /* skip malformed JSON */ }
    }

    const map = buildCountMap(names);
    const sorted = [...map.entries()].sort((a, b) => b[1] - a[1]);
    const total = sorted.reduce((s, [, c]) => s + c, 0);
    const top = sorted.slice(0, 5);
    const othersCount = sorted.slice(5).reduce((s, [, c]) => s + c, 0);

    const result: CommonMedicine[] = top.map(([name, count]) => ({
      name,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    }));
    if (othersCount > 0) {
      result.push({
        name: 'Others',
        count: othersCount,
        percentage: total > 0 ? Math.round((othersCount / total) * 100) : 0,
      });
    }
    return result;
  }

  // ── 14. Top prescribed investigations ─────────────────────────────────────

  async getTopPrescribedInvestigations(from: string, to: string): Promise<CommonInvestigation[]> {
    const { data } = await this.supabase.from('Prescription')
      .select('investigations')
      .eq('hospital_id', this.hospitalId)
      .gte('prescriptionDate', from).lt('prescriptionDate', to)
      .neq('status', 'CANCELLED');

    const names: string[] = [];
    for (const row of data ?? []) {
      try {
        const invs: { name?: string }[] = JSON.parse((row.investigations as string) ?? '[]');
        for (const inv of invs) if (inv.name) names.push(inv.name);
      } catch { /* skip malformed JSON */ }
    }

    const map = buildCountMap(names);
    const sorted = [...map.entries()].sort((a, b) => b[1] - a[1]);
    const total = sorted.reduce((s, [, c]) => s + c, 0);
    const top = sorted.slice(0, 8);

    return top.map(([name, count]) => ({
      name,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    }));
  }

  // ── 15. Top pharmacy sales ─────────────────────────────────────────────────

  async getTopPharmacySales(from: string, to: string): Promise<PharmacySaleStat[]> {
    const hid = this.hospitalId;

    const { data: billData } = await this.supabase.from('PharmacyBill')
      .select('id')
      .eq('hospital_id', hid)
      .gte('billDate', from).lt('billDate', to)
      .neq('status', 'CANCELLED')
      .neq('status', 'RETURNED');

    const billIds = (billData ?? []).map(b => b.id as string);
    if (billIds.length === 0) return [];

    const { data } = await this.supabase.from('PharmacyBillItem')
      .select('medicineName, quantity, amount')
      .in('billId', billIds);

    const map = new Map<string, { quantity: number; revenue: number }>();
    for (const item of data ?? []) {
      const key = ((item.medicineName as string) ?? '').trim();
      if (!key) continue;
      const existing = map.get(key) ?? { quantity: 0, revenue: 0 };
      existing.quantity += (item.quantity as number) ?? 0;
      existing.revenue += (item.amount as number) ?? 0;
      map.set(key, existing);
    }

    return Array.from(map.entries())
      .map(([name, d]) => ({ name, ...d }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);
  }

  // ── 16. Top lab tests ──────────────────────────────────────────────────────

  async getTopLabTests(from: string, to: string): Promise<LabTestStat[]> {
    const hid = this.hospitalId;

    const { data: billData } = await this.supabase.from('LabBill')
      .select('id')
      .eq('hospital_id', hid)
      .gte('createdAt', from).lt('createdAt', to)
      .neq('status', 'CANCELLED');

    const billIds = (billData ?? []).map(b => b.id as string);
    if (billIds.length === 0) return [];

    const { data } = await this.supabase.from('LabBillItem')
      .select('name, amount')
      .in('labBillId', billIds);

    const map = new Map<string, { count: number; revenue: number }>();
    for (const item of data ?? []) {
      const key = ((item.name as string) ?? '').trim();
      if (!key) continue;
      const existing = map.get(key) ?? { count: 0, revenue: 0 };
      existing.count++;
      existing.revenue += (item.amount as number) ?? 0;
      map.set(key, existing);
    }

    return Array.from(map.entries())
      .map(([name, d]) => ({ name, ...d }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);
  }

  // ── 17. Referral stats ─────────────────────────────────────────────────────

  async getReferralStats(from: string, to: string): Promise<ReferralStat[]> {
    const { data } = await this.supabase.from('Patient')
      .select('referredBy')
      .eq('hospital_id', this.hospitalId)
      .gte('appointmentDate', from).lt('appointmentDate', to)
      .not('referredBy', 'is', null);

    const map = new Map<string, number>();
    for (const p of data ?? []) {
      const key = (p.referredBy as string) ?? 'Direct';
      map.set(key, (map.get(key) ?? 0) + 1);
    }

    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  // ── 18. Surgery breakdown ──────────────────────────────────────────────────

  async getSurgeryBreakdown(from: string, to: string): Promise<SurgeryBreakdown[]> {
    const { data } = await this.supabase.from('InPatient')
      .select('operationName')
      .eq('hospital_id', this.hospitalId)
      .gte('admissionDate', from).lt('admissionDate', to)
      .not('operationName', 'is', null);

    const map = new Map<string, number>();
    for (const row of data ?? []) {
      const key = ((row.operationName as string) ?? '').trim();
      if (key) map.set(key, (map.get(key) ?? 0) + 1);
    }

    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }

  // ── 19. Region stats ───────────────────────────────────────────────────────

  async getRegionStats(from: string, to: string): Promise<RegionStat[]> {
    const hid = this.hospitalId;

    // Patients in the date range who have an address.
    const { data: periodPatients } = await this.supabase.from('Patient')
      .select('id, address')
      .eq('hospital_id', hid)
      .gte('appointmentDate', from).lt('appointmentDate', to)
      .not('address', 'is', null);

    if (!periodPatients || periodPatients.length === 0) return [];

    // All-time visits for this hospital (up to `to`) to classify new vs returning.
    const { data: allVisits } = await this.supabase.from('Patient')
      .select('id')
      .eq('hospital_id', hid)
      .lt('appointmentDate', to);

    const visitCountById = new Map<string, number>();
    for (const v of allVisits ?? []) {
      const id = v.id as string;
      visitCountById.set(id, (visitCountById.get(id) ?? 0) + 1);
    }

    const regionMap = new Map<string, { total: number; newPatients: number; returning: number }>();
    for (const p of periodPatients) {
      const key = ((p.address as string) ?? '').trim();
      if (!key) continue;
      const existing = regionMap.get(key) ?? { total: 0, newPatients: 0, returning: 0 };
      existing.total++;
      const totalVisits = visitCountById.get(p.id as string) ?? 1;
      if (totalVisits <= 1) existing.newPatients++;
      else existing.returning++;
      regionMap.set(key, existing);
    }

    const sorted = Array.from(regionMap.entries())
      .map(([region, stats]) => ({ region, ...stats }))
      .sort((a, b) => b.total - a.total);

    const grandTotal = sorted.reduce((s, r) => s + r.total, 0);
    return sorted.map(r => ({
      ...r,
      percentage: grandTotal > 0 ? Math.round((r.total / grandTotal) * 100) : 0,
    }));
  }
}
