/**
 * Data-access layer for the call-logs module.
 *
 * Tables owned:
 *   CallLog  — Exotel call records, upserted by exotelCallSid
 *
 * Tables read (read-only):
 *   Patient  — for patient search and phone-based auto-linking
 *   HospitalProfile — webhook fallback when X-Hospital-Id header is absent
 *
 * Every query is scoped by hospitalId per ADR-007. PII fields (callerName,
 * callFrom, callTo phone numbers) are never passed to the logger.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

// ── Row types (narrow: only the columns this module needs) ──────────────────

export interface CallLogRow {
  id: string;
  exotelCallSid: string;
  callFrom: string;
  callTo: string;
  direction: string;
  status: string;
  startTime: string;
  endTime: string | null;
  duration: number | null;
  recordingUrl: string | null;
  callerName: string | null;
  patientId: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CallLogAnalyticsRow {
  status: string;
  direction: string;
  duration: number | null;
  startTime: string;
  callFrom: string;
  callTo: string;
  callerName: string | null;
  patientId: string | null;
}

export interface NewCallLogRow {
  exotelCallSid: string;
  callFrom: string;
  callTo: string;
  direction: string;
  status: string;
  startTime: string;
  endTime: string | null;
  duration: number;
  recordingUrl: string | null;
  callerName: string | null;
  patientId: string | null;
  rawResponse: Record<string, unknown>;
  // snake_case: added by the hospital_id backfill migration (20260921110000)
  hospital_id: string;
  createdAt: string;
  updatedAt: string;
}

export interface PatientSearchRow {
  id: string;
  fullName: string;
  phone: string;
  patientId: string;
}

// ── Repository ───────────────────────────────────────────────────────────────

export class CallLogsRepository {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly hospitalId: string,
  ) {}

  /**
   * Fetch all call rows in a time range for analytics aggregation.
   * Ordered ascending so hourly/daily bucketing is deterministic.
   */
  async getCallsInRange(from: string, to: string): Promise<CallLogAnalyticsRow[]> {
    const { data, error } = await this.supabase
      .from('CallLog')
      .select('status, direction, duration, startTime, callFrom, callTo, callerName, patientId')
      .eq('hospital_id', this.hospitalId)
      .gte('startTime', from)
      .lte('startTime', to)
      .order('startTime', { ascending: true });
    if (error) throw new Error(`CallLog analytics query failed: ${error.message}`);
    return (data ?? []) as CallLogAnalyticsRow[];
  }

  /**
   * Fetch only the status column for a range — used for the previous-period
   * comparison in analytics (avoids fetching unneeded columns).
   */
  async getCallsStatusInRange(from: string, to: string): Promise<{ status: string }[]> {
    const { data, error } = await this.supabase
      .from('CallLog')
      .select('status')
      .eq('hospital_id', this.hospitalId)
      .gte('startTime', from)
      .lte('startTime', to);
    if (error) throw new Error(`CallLog previous-period query failed: ${error.message}`);
    return data ?? [];
  }

  /**
   * Paginated list of call logs for the UI. Optional single-date filter.
   * rawResponse is excluded from the select — it can be multi-KB per row
   * and is never rendered in the list view.
   */
  async listCallLogs(
    page: number,
    pageSize: number,
    date?: string,
  ): Promise<{ rows: CallLogRow[]; total: number }> {
    let q = this.supabase
      .from('CallLog')
      .select(
        'id, exotelCallSid, callFrom, callTo, direction, status, startTime, endTime, duration, recordingUrl, callerName, patientId, notes, createdAt, updatedAt',
        { count: 'exact' },
      )
      .eq('hospital_id', this.hospitalId)
      .order('startTime', { ascending: false });

    if (date) {
      q = q.gte('startTime', `${date}T00:00:00.000Z`).lte('startTime', `${date}T23:59:59.999Z`);
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    q = q.range(from, to);

    const { data, error, count } = await q;
    if (error) throw new Error(`CallLog list query failed: ${error.message}`);
    return { rows: (data ?? []) as CallLogRow[], total: count ?? 0 };
  }

  /**
   * Fetch today's call rows (status + direction + duration only) for the
   * /stats endpoint's quick summary.
   */
  async getTodayStats(): Promise<{ status: string; direction: string; duration: number | null }[]> {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();

    const { data, error } = await this.supabase
      .from('CallLog')
      .select('status, direction, duration')
      .eq('hospital_id', this.hospitalId)
      .gte('startTime', from)
      .lte('startTime', to);
    if (error) throw new Error(`CallLog today-stats query failed: ${error.message}`);
    return data ?? [];
  }

  /** Find a single call log by internal UUID. Returns null if not found or belongs to another hospital. */
  async findById(id: string): Promise<{ id: string; status: string } | null> {
    const { data, error } = await this.supabase
      .from('CallLog')
      .select('id, status')
      .eq('id', id)
      .eq('hospital_id', this.hospitalId)
      .maybeSingle();
    if (error) throw new Error(`CallLog findById id="${id}" failed: ${error.message}`);
    return data ?? null;
  }

  /** Update the notes field on a specific call log. Scoped by hospitalId. */
  async updateNotes(id: string, notes: string): Promise<void> {
    const { error } = await this.supabase
      .from('CallLog')
      .update({ notes, updatedAt: new Date().toISOString() })
      .eq('id', id)
      .eq('hospital_id', this.hospitalId);
    if (error) throw new Error(`CallLog updateNotes id="${id}" failed: ${error.message}`);
  }

  /**
   * Link a call log to a patient: sets both patientId and callerName.
   * Scoped by hospitalId.
   */
  async linkPatient(id: string, patientId: string, callerName: string | null): Promise<void> {
    const { error } = await this.supabase
      .from('CallLog')
      .update({ patientId, callerName, updatedAt: new Date().toISOString() })
      .eq('id', id)
      .eq('hospital_id', this.hospitalId);
    if (error) throw new Error(`CallLog linkPatient id="${id}" failed: ${error.message}`);
  }

  /**
   * Search patients by fullName, phone, or patientId for call-log linkage.
   * Returns at most 10 results.
   */
  async searchPatients(q: string): Promise<PatientSearchRow[]> {
    const { data, error } = await this.supabase
      .from('Patient')
      .select('id, fullName, phone, patientId')
      .eq('hospital_id', this.hospitalId)
      .or(`fullName.ilike.%${q}%,phone.ilike.%${q}%,patientId.ilike.%${q}%`)
      .limit(10);
    if (error) throw new Error(`Patient search for call-log linkage failed: ${error.message}`);
    return (data ?? []) as PatientSearchRow[];
  }

  /**
   * Return the set of Exotel CallSids that already exist in the DB.
   * Used during sync to skip calls that were already imported.
   */
  async findExistingSids(sids: string[]): Promise<string[]> {
    if (sids.length === 0) return [];
    const { data } = await this.supabase
      .from('CallLog')
      .select('exotelCallSid')
      .eq('hospital_id', this.hospitalId)
      .in('exotelCallSid', sids);
    return (data ?? []).map((r) => r.exotelCallSid as string);
  }

  /**
   * Batch-lookup patients by last-10 phone digits.
   * Uses a single OR query instead of one query per call.
   */
  async findPatientsByPhoneDigits(
    digitsList: string[],
  ): Promise<{ id: string; fullName: string; phone: string }[]> {
    if (digitsList.length === 0) return [];
    const orFilter = digitsList.map((d) => `phone.ilike.%${d}`).join(',');
    const { data } = await this.supabase
      .from('Patient')
      .select('id, fullName, phone')
      .eq('hospital_id', this.hospitalId)
      .or(orFilter);
    return (data ?? []) as { id: string; fullName: string; phone: string }[];
  }

  /** Bulk-insert new call log rows (for sync). No-op if rows is empty. */
  async insertCallLogs(rows: NewCallLogRow[]): Promise<void> {
    if (rows.length === 0) return;
    const { error } = await this.supabase.from('CallLog').insert(rows);
    if (error) throw new Error(`CallLog bulk insert failed: ${error.message}`);
  }

  // ── Webhook-specific methods ───────────────────────────────────────────────

  /** Find a call log by Exotel CallSid for webhook upsert logic. */
  async findBySid(sid: string): Promise<{ id: string; status: string } | null> {
    const { data, error } = await this.supabase
      .from('CallLog')
      .select('id, status')
      .eq('exotelCallSid', sid)
      .eq('hospital_id', this.hospitalId)
      .maybeSingle();
    if (error) throw new Error(`CallLog findBySid sid="${sid}" failed: ${error.message}`);
    return data ?? null;
  }

  /**
   * Update an existing call log by internal ID.
   * Keys set to `undefined` in `updates` are skipped by Supabase's patch
   * (effectively a no-op for that column), which is used intentionally to
   * avoid overwriting already-linked patient data when no new match is found.
   */
  async updateById(
    id: string,
    updates: {
      status?: string;
      endTime?: string | null;
      duration?: number;
      recordingUrl?: string | null;
      callerName?: string | null;
      patientId?: string | null;
      rawResponse?: Record<string, unknown>;
    },
  ): Promise<void> {
    const { error } = await this.supabase
      .from('CallLog')
      .update({ ...updates, updatedAt: new Date().toISOString() })
      .eq('id', id);
    if (error) throw new Error(`CallLog updateById id="${id}" failed: ${error.message}`);
  }

  /** Insert a single call log row (webhook path). */
  async insertOne(row: NewCallLogRow): Promise<void> {
    const { error } = await this.supabase.from('CallLog').insert(row);
    if (error) {
      throw new Error(
        `CallLog insertOne sid="${row.exotelCallSid}" failed: ${error.message}`,
      );
    }
  }

  /**
   * Find a patient by the last 10 digits of a phone number.
   * Returns the first match or null if no patient matches or the phone
   * string does not yield a valid 10-digit suffix.
   */
  async findPatientByPhone(phone: string): Promise<{ id: string; fullName: string } | null> {
    const digits = phone.replace(/\D/g, '').slice(-10);
    if (digits.length !== 10) return null;
    const { data } = await this.supabase
      .from('Patient')
      .select('id, fullName')
      .eq('hospital_id', this.hospitalId)
      .ilike('phone', `%${digits}`)
      .limit(1)
      .maybeSingle();
    return (data as { id: string; fullName: string } | null) ?? null;
  }
}
