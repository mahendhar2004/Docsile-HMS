/**
 * The queue module owns no tables — it is a read-aggregation module.
 *
 * Read-only from:
 *   - Patient        — patient demographics + appointmentDate (OPD queue / appointments board)
 *   - Prescription   — today's OPD visits (for OPD queue status computation)
 *   - EyeReading     — today's eye readings (for workup status computation)
 *   - InPatient      — currently admitted (for inpatient bed/status board)
 *   - InvoiceItem    — line items nested inside Prescription (OPD queue only)
 *   - LabBill / LabBillItem / Lab — lab bills nested inside Patient (OPD queue only)
 *
 * OPD and workup queue status is computed in-process from the nested relation data —
 * it is NOT stored in a status field. The three-query merge pattern (appointment +
 * prescription + eye-reading date ranges) matches the old getDoctorQueue /
 * getWorkupQueue behavior exactly.
 *
 * Every query scoped by hospital_id (ADR-007). Supabase service_role key bypasses
 * RLS; the hospital_id WHERE clause is the sole tenant isolation mechanism here.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { OpdQueueEntry, WorkupQueueEntry, InpatientBoardEntry } from './types.ts';

// ─── Private module helpers ────────────────────────────────────────────────────

/**
 * Returns today's date as YYYY-MM-DD string in IST (Asia/Kolkata).
 * Equivalent to the old Next.js `toLocalDateISO()` in src/lib/utils.ts.
 */
function toISTDateISO(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
}

/**
 * Get IST day boundaries for a YYYY-MM-DD date string (or today if omitted).
 * Returns { start, end } as UTC Date objects representing the full IST calendar day.
 * Equivalent to the old Next.js `getISTDayBounds()` in src/lib/utils.ts.
 */
function getISTDayBounds(dateStr?: string): { start: Date; end: Date } {
  const d = dateStr ?? toISTDateISO();
  return {
    start: new Date(`${d}T00:00:00+05:30`),
    end: new Date(`${d}T23:59:59.999+05:30`),
  };
}

/**
 * Compute patient status from actual data — never fetched from the DB.
 * Manual override statuses (MOVED, CANCELLED, NO_SHOW, VISITED) take precedence.
 * Equivalent to the old Next.js `computePatientStatus()` in src/lib/utils.ts.
 *
 * Rules:
 *   - Override (MOVED / CANCELLED / NO_SHOW / VISITED) → return as-is
 *   - workup + doctor prescription → COMPLETED
 *   - workup only → WORKUP_DONE
 *   - doctor prescription only → MEDICAL_ONLY
 *   - neither → REGISTERED
 */
function computeStatus(
  hasWorkup: boolean,
  hasDoctorPrescription: boolean,
  dbStatus?: string | null,
): string {
  if (dbStatus && ['MOVED', 'CANCELLED', 'NO_SHOW', 'VISITED'].includes(dbStatus)) {
    return dbStatus;
  }
  if (hasWorkup && hasDoctorPrescription) return 'COMPLETED';
  if (hasWorkup) return 'WORKUP_DONE';
  if (hasDoctorPrescription) return 'MEDICAL_ONLY';
  return 'REGISTERED';
}

// ─── Repository ───────────────────────────────────────────────────────────────

export class QueueRepository {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly hospitalId: string,
  ) {}

  /**
   * Returns today's OPD doctor queue.
   *
   * A patient appears if they have any of:
   *   (A) an appointmentDate in today's IST range, OR
   *   (B) a Prescription written today (inner join on prescriptionDate), OR
   *   (C) an EyeReading saved today (inner join on readingDate).
   * (C) catches the "appointment was yesterday, workup entered today" case.
   *
   * All three queries run in parallel; results are merged by patientId (A wins on
   * collision — it carries the full unfiltered nested data). Nested relations are
   * then filtered to today's range in-process before computing status.
   *
   * Ports `getDoctorQueue` from src/app/(hospital)/doctor/actions.ts.
   */
  async getOpdQueue(date?: string): Promise<OpdQueueEntry[]> {
    const { start, end } = getISTDayBounds(date);
    const startMs = start.getTime();
    const endMs = end.getTime();
    const startISO = start.toISOString();
    const endISO = end.toISOString();

    // Full select including InvoiceItem + LabBill line items (OPD queue needs all data)
    const SELECT_FULL =
      '*, eyeReadings:EyeReading(*), prescriptions:Prescription(*, items:InvoiceItem(*)), labBills:LabBill(*, lab:Lab(name), items:LabBillItem(*))';
    const SELECT_FULL_RX_INNER =
      '*, eyeReadings:EyeReading(*), prescriptions:Prescription!inner(*, items:InvoiceItem(*)), labBills:LabBill(*, lab:Lab(name), items:LabBillItem(*))';
    const SELECT_FULL_ER_INNER =
      '*, eyeReadings:EyeReading!inner(*), prescriptions:Prescription(*, items:InvoiceItem(*)), labBills:LabBill(*, lab:Lab(name), items:LabBillItem(*))';

    const [apptRes, rxRes, erRes] = await Promise.all([
      // (A) patients with an appointment today
      this.supabase
        .from('Patient')
        .select(SELECT_FULL)
        .eq('hospital_id', this.hospitalId)
        .eq('patientType', 'OPD')
        .gte('appointmentDate', startISO)
        .lte('appointmentDate', endISO)
        .order('createdAt', { ascending: true }),
      // (B) patients with a prescription written today
      this.supabase
        .from('Patient')
        .select(SELECT_FULL_RX_INNER)
        .eq('hospital_id', this.hospitalId)
        .eq('patientType', 'OPD')
        .gte('prescriptions.prescriptionDate', startISO)
        .lte('prescriptions.prescriptionDate', endISO)
        .order('createdAt', { ascending: true }),
      // (C) patients with an eye reading saved today
      this.supabase
        .from('Patient')
        .select(SELECT_FULL_ER_INNER)
        .eq('hospital_id', this.hospitalId)
        .eq('patientType', 'OPD')
        .gte('eyeReadings.readingDate', startISO)
        .lte('eyeReadings.readingDate', endISO)
        .order('createdAt', { ascending: true }),
    ]);

    if (apptRes.error) {
      throw new Error(`OPD queue appointment query failed for hospital "${this.hospitalId}": ${apptRes.error.message}`);
    }
    if (rxRes.error) {
      throw new Error(`OPD queue prescription query failed for hospital "${this.hospitalId}": ${rxRes.error.message}`);
    }
    if (erRes.error) {
      throw new Error(`OPD queue eye-reading query failed for hospital "${this.hospitalId}": ${erRes.error.message}`);
    }

    // Merge by patientId — (A) wins on collision (full unfiltered nested data)
    const merged = new Map<string, Record<string, unknown>>();
    for (const p of (apptRes.data ?? [])) {
      merged.set(p.patientId as string, p as Record<string, unknown>);
    }
    for (const p of (rxRes.data ?? [])) {
      if (!merged.has(p.patientId as string)) merged.set(p.patientId as string, p as Record<string, unknown>);
    }
    for (const p of (erRes.data ?? [])) {
      if (!merged.has(p.patientId as string)) merged.set(p.patientId as string, p as Record<string, unknown>);
    }

    function isInDay(dateStr: string): boolean {
      const t = new Date(dateStr).getTime();
      return t >= startMs && t <= endMs;
    }

    return Array.from(merged.values()).map((p) => {
      const rawEyeReadings = (p.eyeReadings as Record<string, unknown>[] | null) ?? [];
      const rawPrescriptions = (p.prescriptions as Record<string, unknown>[] | null) ?? [];
      const rawLabBills = (p.labBills as Record<string, unknown>[] | null) ?? [];

      // Keep only today's eye readings; sort by createdAt desc; take latest 1
      const todayEyeReadings = rawEyeReadings
        .filter((er) => isInDay(er.readingDate as string))
        .sort(
          (a, b) =>
            new Date(b.createdAt as string).getTime() - new Date(a.createdAt as string).getTime(),
        )
        .slice(0, 1);

      // Keep only today's prescriptions; sort by createdAt desc; take latest 1
      const todayPrescriptions = rawPrescriptions
        .filter((rx) => isInDay(rx.prescriptionDate as string))
        .sort(
          (a, b) =>
            new Date(b.createdAt as string).getTime() - new Date(a.createdAt as string).getTime(),
        )
        .slice(0, 1);

      // Keep only today's lab bills (by createdAt — no separate bill date field)
      const todayLabBills = rawLabBills.filter((lb) => isInDay(lb.createdAt as string));

      const hasWorkup = todayEyeReadings.length > 0;
      const hasDoctorPrescription = todayPrescriptions.some(
        (rx) => rx.status !== 'BILLING_ONLY' && rx.doctorName !== null,
      );

      return {
        ...p,
        eyeReadings: todayEyeReadings,
        prescriptions: todayPrescriptions,
        labBills: todayLabBills,
        status: computeStatus(hasWorkup, hasDoctorPrescription, p.status as string | null),
      };
    });
  }

  /**
   * Returns today's workup queue (patients awaiting pre-consultation workup).
   *
   * Uses the same three-query merge pattern as getOpdQueue, but with a lighter
   * prescription select (id, status, prescriptionDate, doctorName, createdAt —
   * no InvoiceItem or LabBill expansion, which the workup screen does not need).
   *
   * Ports `getWorkupQueue` from src/app/(hospital)/workup/actions.ts.
   */
  async getWorkupQueue(date?: string): Promise<WorkupQueueEntry[]> {
    const { start, end } = getISTDayBounds(date);
    const startMs = start.getTime();
    const endMs = end.getTime();
    const startISO = start.toISOString();
    const endISO = end.toISOString();

    // Lighter prescription select — workup screen only needs status/doctor fields
    const SELECT_FULL =
      '*, eyeReadings:EyeReading(*), prescriptions:Prescription(id, status, prescriptionDate, doctorName, createdAt)';
    const SELECT_FULL_RX_INNER =
      '*, eyeReadings:EyeReading(*), prescriptions:Prescription!inner(id, status, prescriptionDate, doctorName, createdAt)';
    const SELECT_FULL_ER_INNER =
      '*, eyeReadings:EyeReading!inner(*), prescriptions:Prescription(id, status, prescriptionDate, doctorName, createdAt)';

    const [apptRes, rxRes, erRes] = await Promise.all([
      // (A) patients with an appointment today
      this.supabase
        .from('Patient')
        .select(SELECT_FULL)
        .eq('hospital_id', this.hospitalId)
        .eq('patientType', 'OPD')
        .gte('appointmentDate', startISO)
        .lte('appointmentDate', endISO)
        .order('createdAt', { ascending: true }),
      // (B) patients with a prescription written today
      this.supabase
        .from('Patient')
        .select(SELECT_FULL_RX_INNER)
        .eq('hospital_id', this.hospitalId)
        .eq('patientType', 'OPD')
        .gte('prescriptions.prescriptionDate', startISO)
        .lte('prescriptions.prescriptionDate', endISO)
        .order('createdAt', { ascending: true }),
      // (C) patients with an eye reading saved today
      this.supabase
        .from('Patient')
        .select(SELECT_FULL_ER_INNER)
        .eq('hospital_id', this.hospitalId)
        .eq('patientType', 'OPD')
        .gte('eyeReadings.readingDate', startISO)
        .lte('eyeReadings.readingDate', endISO)
        .order('createdAt', { ascending: true }),
    ]);

    if (apptRes.error) {
      throw new Error(`Workup queue appointment query failed for hospital "${this.hospitalId}": ${apptRes.error.message}`);
    }
    if (rxRes.error) {
      throw new Error(`Workup queue prescription query failed for hospital "${this.hospitalId}": ${rxRes.error.message}`);
    }
    if (erRes.error) {
      throw new Error(`Workup queue eye-reading query failed for hospital "${this.hospitalId}": ${erRes.error.message}`);
    }

    // Merge by patientId — (A) wins on collision
    const merged = new Map<string, Record<string, unknown>>();
    for (const p of (apptRes.data ?? [])) {
      merged.set(p.patientId as string, p as Record<string, unknown>);
    }
    for (const p of (rxRes.data ?? [])) {
      if (!merged.has(p.patientId as string)) merged.set(p.patientId as string, p as Record<string, unknown>);
    }
    for (const p of (erRes.data ?? [])) {
      if (!merged.has(p.patientId as string)) merged.set(p.patientId as string, p as Record<string, unknown>);
    }

    function isInDay(dateStr: string): boolean {
      const t = new Date(dateStr).getTime();
      return t >= startMs && t <= endMs;
    }

    return Array.from(merged.values()).map((p) => {
      const rawEyeReadings = (p.eyeReadings as Record<string, unknown>[] | null) ?? [];
      const rawPrescriptions = (p.prescriptions as Record<string, unknown>[] | null) ?? [];

      // Keep only today's eye readings; sort by createdAt desc (localeCompare matches
      // old Next.js behavior which used string comparison on ISO timestamps)
      const todayEyeReadings = rawEyeReadings
        .filter((er) => isInDay(er.readingDate as string))
        .sort((a, b) => (b.createdAt as string).localeCompare(a.createdAt as string))
        .slice(0, 1);

      // Keep only today's prescriptions; sort by createdAt desc
      const todayPrescriptions = rawPrescriptions
        .filter((rx) => isInDay(rx.prescriptionDate as string))
        .sort((a, b) => (b.createdAt as string).localeCompare(a.createdAt as string))
        .slice(0, 1);

      const hasWorkup = todayEyeReadings.length > 0;
      const hasDoctorPrescription = todayPrescriptions.some(
        (rx) => rx.status !== 'BILLING_ONLY' && rx.doctorName !== null,
      );

      return {
        ...p,
        eyeReadings: todayEyeReadings,
        prescriptions: todayPrescriptions,
        status: computeStatus(hasWorkup, hasDoctorPrescription, p.status as string | null),
      };
    });
  }

  /**
   * Returns all currently admitted inpatients for the bed/status board.
   *
   * Returns all InPatient rows where status != 'DISCHARGED', ordered by admissionDate
   * ascending (longest-admitted first — natural bed board order). This is the initial
   * full-state fetch; Supabase Realtime CDC on the InPatient table (enabled by migration
   * 20260922010000) delivers incremental updates once the client subscribes to
   * `hospital:{hospitalId}:beds`.
   *
   * This is a new endpoint with no direct old Next.js equivalent. The `getInPatients`
   * action in src/app/(hospital)/inpatients/actions.ts serves the general inpatient list
   * with filters; this endpoint is explicitly the bed board snapshot.
   */
  async getInpatientBoard(): Promise<InpatientBoardEntry[]> {
    const { data, error } = await this.supabase
      .from('InPatient')
      .select('*')
      .eq('hospital_id', this.hospitalId)
      .neq('status', 'DISCHARGED')
      .order('admissionDate', { ascending: true });

    if (error) {
      throw new Error(`Inpatient board query failed for hospital "${this.hospitalId}": ${error.message}`);
    }

    return (data ?? []) as InpatientBoardEntry[];
  }
}
