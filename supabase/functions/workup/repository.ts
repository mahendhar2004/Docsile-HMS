/**
 * Tables owned by the workup module:
 *   - EyeReading   — auto-refractometer readings (upsert per patient per IST day)
 *
 * Read-only from:
 *   - Patient      — patient demographics + appointmentDate (workup queue)
 *   - Prescription — today's prescriptions (workup queue + prescription linking)
 *
 * Note: workup status is computed from data (eye reading existence for today's
 * prescription) — it is NOT stored in a status field. The /start endpoint is
 * a deprecated no-op kept only for migration compatibility.
 *
 * Every query scoped by hospital_id (ADR-007). Supabase service_role key bypasses
 * RLS; the hospital_id WHERE clause is the sole tenant isolation mechanism here.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

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
 * Compute patient workup status from actual data — never fetched from the DB.
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

export class WorkupRepository {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly hospitalId: string,
  ) {}

  /**
   * Returns today's workup queue (patients awaiting pre-consultation workup).
   *
   * A patient appears if they have any of:
   *   (A) an appointmentDate in today's IST range, OR
   *   (B) a Prescription written today (inner join on prescriptionDate), OR
   *   (C) an EyeReading saved today (inner join on readingDate).
   * (C) catches the "appointment was yesterday, workup entered today" case.
   *
   * All three queries run in parallel; results merged by patientId (A wins on
   * collision). Nested relations filtered to today's range in-process before
   * computing status. Uses a lighter prescription select than the OPD doctor
   * queue — workup screen only needs status/doctor fields, not InvoiceItem etc.
   *
   * Ports `getWorkupQueue` from src/app/(hospital)/workup/actions.ts.
   * Pattern identical to queue module's getWorkupQueue (verified reference).
   */
  async getWorkupQueue(date?: string): Promise<Record<string, unknown>[]> {
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
      throw new Error(
        `Workup queue appointment query failed for hospital "${this.hospitalId}": ${apptRes.error.message}`,
      );
    }
    if (rxRes.error) {
      throw new Error(
        `Workup queue prescription query failed for hospital "${this.hospitalId}": ${rxRes.error.message}`,
      );
    }
    if (erRes.error) {
      throw new Error(
        `Workup queue eye-reading query failed for hospital "${this.hospitalId}": ${erRes.error.message}`,
      );
    }

    // Merge by patientId — (A) wins on collision (full unfiltered nested data)
    const merged = new Map<string, Record<string, unknown>>();
    for (const p of (apptRes.data ?? [])) {
      merged.set(p.patientId as string, p as Record<string, unknown>);
    }
    for (const p of (rxRes.data ?? [])) {
      if (!merged.has(p.patientId as string)) {
        merged.set(p.patientId as string, p as Record<string, unknown>);
      }
    }
    for (const p of (erRes.data ?? [])) {
      if (!merged.has(p.patientId as string)) {
        merged.set(p.patientId as string, p as Record<string, unknown>);
      }
    }

    function isInDay(dateStr: string): boolean {
      const t = new Date(dateStr).getTime();
      return t >= startMs && t <= endMs;
    }

    return Array.from(merged.values()).map((p) => {
      const rawEyeReadings = (p.eyeReadings as Record<string, unknown>[] | null) ?? [];
      const rawPrescriptions = (p.prescriptions as Record<string, unknown>[] | null) ?? [];

      // Keep only today's eye readings; sort by createdAt desc (localeCompare matches
      // old Next.js behavior — both used string comparison on ISO timestamps); take latest 1
      const todayEyeReadings = rawEyeReadings
        .filter((er) => isInDay(er.readingDate as string))
        .sort((a, b) => (b.createdAt as string).localeCompare(a.createdAt as string))
        .slice(0, 1);

      // Keep only today's prescriptions; sort by createdAt desc; take latest 1
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
   * Returns a single patient's data for the workup screen.
   * Includes all eye readings and prescriptions, then filters them to today in-process.
   * Returns null if the patient is not found (404 handled in the service layer).
   *
   * Ports `getPatientForWorkup` from src/app/(hospital)/workup/actions.ts.
   */
  async getPatientForWorkup(
    patientId: string,
    date?: string,
  ): Promise<Record<string, unknown> | null> {
    const { start, end } = getISTDayBounds(date);
    const startMs = start.getTime();
    const endMs = end.getTime();

    function isInDay(dateStr: string): boolean {
      const t = new Date(dateStr).getTime();
      return t >= startMs && t <= endMs;
    }

    const { data: patient, error } = await this.supabase
      .from('Patient')
      .select('*, eyeReadings:EyeReading(*), prescriptions:Prescription(id, prescriptionDate)')
      .eq('hospital_id', this.hospitalId)
      .eq('patientId', patientId)
      .single();

    if (error) return null;

    const filteredEyeReadings = ((patient.eyeReadings as Record<string, unknown>[] | null) ?? [])
      .filter((er) => isInDay(er.readingDate as string))
      .sort((a, b) => (b.createdAt as string).localeCompare(a.createdAt as string));

    // Old code keeps all today's eye readings (no .slice(0, 1)) but only the latest prescription
    const filteredPrescriptions = ((patient.prescriptions as Record<string, unknown>[] | null) ?? [])
      .filter((rx) => isInDay(rx.prescriptionDate as string))
      .sort((a, b) => (b.createdAt as string).localeCompare(a.createdAt as string))
      .slice(0, 1);

    return {
      ...patient,
      eyeReadings: filteredEyeReadings,
      prescriptions: filteredPrescriptions,
    };
  }

  /**
   * Find an existing EyeReading for the patient on a given IST day.
   * Used to determine whether to UPDATE (existing) or INSERT (new) on saveEyeReading.
   *
   * Note: old code used .single() which throws when no row exists — using .maybeSingle()
   * here for the explicit null-on-not-found contract needed by the upsert logic.
   */
  async findTodayEyeReading(
    patientId: string,
    startISO: string,
    endISO: string,
  ): Promise<{ id: string } | null> {
    const { data } = await this.supabase
      .from('EyeReading')
      .select('id')
      .eq('hospital_id', this.hospitalId)
      .eq('patientId', patientId)
      .gte('readingDate', startISO)
      .lte('readingDate', endISO)
      .limit(1)
      .maybeSingle();

    return (data as { id: string } | null) ?? null;
  }

  /**
   * Find today's Prescription for the patient that does not yet have an EyeReading linked.
   *
   * EyeReading.prescriptionId is a UNIQUE FK to Prescription.id. Since Prescription does
   * NOT have an eyeReadingId column (despite the old code querying .is("eyeReadingId", null) —
   * that filter silently failed, yielding null, and effectively disabled linking in the old
   * code), we determine linkability by fetching today's prescriptions and checking which ones
   * already have an EyeReading pointing at them via a second query on EyeReading.prescriptionId.
   *
   * Returns the first unlinked prescription (most recent first), or null if none exist.
   * Called only on the INSERT path of saveEyeReading.
   */
  async findUnlinkedPrescription(
    patientId: string,
    startISO: string,
    endISO: string,
  ): Promise<{ id: string } | null> {
    // Get today's prescriptions for this patient, newest first
    const { data: prescriptions } = await this.supabase
      .from('Prescription')
      .select('id')
      .eq('hospital_id', this.hospitalId)
      .eq('patientId', patientId)
      .gte('prescriptionDate', startISO)
      .lte('prescriptionDate', endISO)
      .order('createdAt', { ascending: false });

    if (!prescriptions || prescriptions.length === 0) return null;

    const prescriptionIds = prescriptions.map((p) => p.id as string);

    // Find which of these prescriptions already have an EyeReading linked to them
    const { data: linkedReadings } = await this.supabase
      .from('EyeReading')
      .select('prescriptionId')
      .in('prescriptionId', prescriptionIds);

    const linkedIds = new Set<string>(
      (linkedReadings ?? []).map((er) => er.prescriptionId as string),
    );

    // Return the first (most recent) prescription that is not yet linked
    const unlinked = prescriptions.find((p) => !linkedIds.has(p.id as string));
    return (unlinked as { id: string } | undefined) ?? null;
  }

  /**
   * Insert a new EyeReading row.
   * Always sets status = 'COMPLETED' (matching old code behavior).
   */
  async insertEyeReading(row: {
    patientId: string;
    readingDate: string;
    autoRefractometer: string | null;
    glassesReading: string | null;
    previousPrescription: string | null;
    presentPrescription: string | null;
    clinicalFindings: string | null;
    createdById: string;
    hospital_id: string;
    prescriptionId?: string;
  }): Promise<Record<string, unknown>> {
    const { data, error } = await this.supabase
      .from('EyeReading')
      .insert({ ...row, status: 'COMPLETED' })
      .select()
      .single();

    if (error) {
      throw new Error(
        `Failed to insert EyeReading for patient "${row.patientId}" in hospital "${row.hospital_id}": ${error.message}`,
      );
    }

    return data as Record<string, unknown>;
  }

  /**
   * Update an existing EyeReading row by id.
   * Records the updater's user id in the updatedBy column.
   * hospital_id is included in the WHERE clause per ADR-007 (found missing
   * during review and fixed before commit -- EyeReading does carry
   * hospital_id since the Phase 4 backfill migration, so there is no excuse
   * for this query to skip it; the id alone is not sufficient tenant
   * isolation given the service_role key bypasses RLS).
   */
  async updateEyeReading(
    id: string,
    fields: {
      autoRefractometer: string | null;
      glassesReading: string | null;
      previousPrescription: string | null;
      presentPrescription: string | null;
      clinicalFindings: string | null;
      updatedBy: string;
    },
  ): Promise<Record<string, unknown>> {
    const { data, error } = await this.supabase
      .from('EyeReading')
      .update(fields)
      .eq('id', id)
      .eq('hospital_id', this.hospitalId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update EyeReading "${id}": ${error.message}`);
    }

    return data as Record<string, unknown>;
  }
}
