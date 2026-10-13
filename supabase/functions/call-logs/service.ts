/**
 * Business logic layer for the call-logs module.
 *
 * Responsibilities:
 *  - Translate the ?filter= / customStart / customEnd query params into UTC ISO
 *    date ranges for analytics and stats.
 *  - Aggregate raw DB rows into the analytics + stats response shapes.
 *  - Orchestrate Exotel API calls for the sync flow.
 *  - Process incoming webhook payloads (upsert logic, Leg2Status resolution).
 *
 * PII policy (observability-principles.md):
 *  - Patient names, phone numbers (callFrom / callTo), and callerName are NEVER
 *    passed to the logger — only counts, call SIDs, status strings, and IDs.
 */

import { getSupabaseClient } from '../_shared/supabase-client.ts';
import { CallLogsRepository, type NewCallLogRow } from './repository.ts';
import { NotFoundError, ValidationError } from '../_shared/errors.ts';
import { logger } from '../_shared/logger.ts';
import type { Session } from '../_shared/auth.ts';

// ── Internal helpers ──────────────────────────────────────────────────────────

/**
 * Translate ?filter= (today | week | month | year | custom) plus optional
 * customStart / customEnd dates into an absolute UTC date range.
 */
function resolveDateRange(
  filter?: string,
  customStart?: string,
  customEnd?: string,
): { from: string; to: string } {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  switch (filter) {
    case 'week': {
      const start = new Date(todayStart);
      start.setDate(start.getDate() - 7);
      return { from: start.toISOString(), to: todayEnd.toISOString() };
    }
    case 'month': {
      const start = new Date(todayStart);
      start.setDate(start.getDate() - 30);
      return { from: start.toISOString(), to: todayEnd.toISOString() };
    }
    case 'year': {
      const start = new Date(todayStart);
      start.setDate(start.getDate() - 365);
      return { from: start.toISOString(), to: todayEnd.toISOString() };
    }
    case 'custom': {
      const from = customStart
        ? new Date(`${customStart}T00:00:00`).toISOString()
        : todayStart.toISOString();
      const to = customEnd
        ? new Date(`${customEnd}T23:59:59`).toISOString()
        : todayEnd.toISOString();
      return { from, to };
    }
    case 'today':
    default:
      return { from: todayStart.toISOString(), to: todayEnd.toISOString() };
  }
}

/**
 * Build the Exotel Basic-Auth header.
 * Returns null if any of the three required env vars are absent — the caller
 * must fall back to webhook-payload status resolution in that case.
 */
function getExotelAuth(): { sid: string; authHeader: string } | null {
  const sid = Deno.env.get('EXOTEL_SID');
  const apiKey = Deno.env.get('EXOTEL_API_KEY');
  const apiToken = Deno.env.get('EXOTEL_API_TOKEN');
  if (!sid || !apiKey || !apiToken) return null;
  // btoa() is a Deno global (equivalent to Buffer.from().toString('base64') in Node)
  return { sid, authHeader: `Basic ${btoa(`${apiKey}:${apiToken}`)}` };
}

/**
 * Map Exotel Leg 2 (agent leg) status to our CallLog.status values.
 * Duration of -1 signals "use the actual conversationDuration field".
 *
 * Leg 2 status semantics per Exotel docs:
 *   completed  → agent answered, call ended normally
 *   busy       → agent line was busy
 *   no-answer  → agent did not pick up
 *   failed     → could not connect to agent (invalid number, etc.)
 *   canceled   → call canceled while ringing/queued
 *   null/empty → no agent leg was created (missed)
 */
function mapLeg2Status(leg2: string | null | undefined): { status: string; duration: number } {
  switch ((leg2 ?? '').toLowerCase().trim()) {
    case 'completed':
      return { status: 'completed', duration: -1 };
    case 'busy':
      return { status: 'busy', duration: 0 };
    case 'no-answer':
    case 'noanswer':
      return { status: 'missed', duration: 0 };
    case 'failed':
      return { status: 'failed', duration: 0 };
    case 'canceled':
      return { status: 'missed', duration: 0 };
    default:
      return { status: 'missed', duration: 0 };
  }
}

/**
 * Resolve call status when Exotel credentials are not configured and we must
 * fall back to the status field in the webhook / sync payload.
 *
 * Key insight: Exotel's "Status: completed" just means the call flow finished —
 * NOT that the agent answered. Use ConversationDuration to distinguish.
 */
function resolveStatusFallback(
  rawStatus: string,
  conversationDuration: number,
  totalDuration: number,
): string {
  switch (rawStatus.toLowerCase()) {
    case 'busy':
      return 'busy';
    case 'no-answer':
    case 'noanswer':
      return 'missed';
    case 'failed':
    case 'canceled':
      return 'failed';
    case 'completed':
      return conversationDuration > 0 ? 'completed' : 'missed';
    case 'in-progress':
    case 'ringing':
      return 'ringing';
    default:
      if (totalDuration > 0 && conversationDuration === 0) return 'missed';
      if (conversationDuration > 0) return 'completed';
      return 'ringing';
  }
}

type ExotelCallDetails = {
  leg2Status: string | null;
  leg1Status: string | null;
  conversationDuration: number;
  details: Record<string, unknown>;
};

/**
 * Fetch Exotel call details via the v1 API (?details=true) to get the
 * authoritative Leg2Status. Returns null on network/API failure so the
 * caller can fall back gracefully.
 */
async function fetchExotelCallDetails(
  callSid: string,
  auth: { sid: string; authHeader: string },
  correlationId: string,
): Promise<ExotelCallDetails | null> {
  try {
    const url = `https://api.exotel.com/v1/Accounts/${auth.sid}/Calls/${callSid}?details=true`;
    const response = await fetch(url, { headers: { Authorization: auth.authHeader } });
    if (!response.ok) {
      logger.warn('Exotel call-details fetch returned non-2xx', {
        correlationId, module: 'call-logs', action: 'fetchExotelCallDetails',
        statusCode: response.status,
      }, { callSid });
      return null;
    }
    const result = (await response.json()) as Record<string, unknown>;
    const callData = ((result?.Call ?? result) as Record<string, unknown>);
    const details = ((callData?.Details ?? {}) as Record<string, unknown>);
    return {
      leg1Status: (details.Leg1Status as string) || null,
      leg2Status: (details.Leg2Status as string) || null,
      conversationDuration: parseInt(String(details.ConversationDuration ?? '0'), 10),
      details,
    };
  } catch (err) {
    logger.error('Error fetching Exotel call details', {
      correlationId, module: 'call-logs', action: 'fetchExotelCallDetails',
    }, { callSid, error: err instanceof Error ? err.message : String(err) });
    return null;
  }
}

/**
 * Parse inline leg details from a call object that was fetched with ?details=true.
 * Returns null if Details.Leg1Status / Leg2Status are absent (Exotel sometimes
 * omits the Details block for very recent calls).
 */
function parseInlineDetails(callData: Record<string, unknown>): ExotelCallDetails | null {
  const details = ((callData?.Details ?? {}) as Record<string, unknown>);
  if (!details.Leg2Status && !details.Leg1Status) return null;
  return {
    leg1Status: (details.Leg1Status as string) || null,
    leg2Status: (details.Leg2Status as string) || null,
    conversationDuration: parseInt(String(details.ConversationDuration ?? '0'), 10),
    details,
  };
}

/**
 * When the Exotel webhook does not supply an X-Hospital-Id header (Exotel has
 * no knowledge of our internal hospital IDs), fall back to the single
 * HospitalProfile row. Safe for single-tenant; for multi-tenant the caller must
 * set the header explicitly.
 */
async function resolveHospitalIdForWebhook(provided: string): Promise<string> {
  if (provided) return provided;
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('HospitalProfile')
    .select('id')
    .limit(1)
    .single();
  if (error || !data) {
    throw new ValidationError(
      'Cannot determine hospital context for Exotel webhook: no HospitalProfile row found.',
    );
  }
  return data.id as string;
}

// ── Exported service functions ────────────────────────────────────────────────

/**
 * GET /call-logs/analytics
 *
 * Fetches all calls in the resolved date range plus the equivalent previous
 * period and aggregates them into the analytics response shape.
 */
export async function getAnalytics(
  session: Session,
  q: { filter?: string; customStart?: string; customEnd?: string },
): Promise<unknown> {
  const correlationId = crypto.randomUUID();
  const { from, to } = resolveDateRange(q.filter, q.customStart, q.customEnd);

  // Previous period: same duration, ending 1 ms before the current period starts
  const diffMs = new Date(to).getTime() - new Date(from).getTime() + 1;
  const prevToMs = new Date(from).getTime() - 1;
  const prevFromMs = prevToMs - diffMs + 1;

  const repo = new CallLogsRepository(getSupabaseClient(), session.hospitalId);
  const [calls, prevCalls] = await Promise.all([
    repo.getCallsInRange(from, to),
    repo.getCallsStatusInRange(new Date(prevFromMs).toISOString(), new Date(prevToMs).toISOString()),
  ]);

  logger.info('Call analytics aggregated', {
    correlationId, hospitalId: session.hospitalId, userId: session.id,
    module: 'call-logs', action: 'getAnalytics',
  }, { callCount: calls.length, filter: q.filter ?? 'today' });

  // ── KPIs ──
  const totalCalls = calls.length;
  const answeredCalls = calls.filter((c) => c.status === 'completed').length;
  const missedCalls = calls.filter((c) => c.status === 'missed').length;
  const busyCalls = calls.filter((c) => c.status === 'busy').length;
  const failedCalls = calls.filter((c) => c.status === 'failed').length;
  const inboundCalls = calls.filter((c) => c.direction === 'inbound').length;
  const outboundCalls = calls.filter((c) => c.direction === 'outbound').length;
  const linkedCalls = calls.filter((c) => c.patientId).length;

  const totalDuration = calls.reduce((s, c) => s + (c.duration ?? 0), 0);
  const answerRate = totalCalls > 0 ? Math.round((answeredCalls / totalCalls) * 100) : 0;
  const missedRate = totalCalls > 0 ? Math.round((missedCalls / totalCalls) * 100) : 0;
  const avgDuration = answeredCalls > 0 ? Math.round(totalDuration / answeredCalls) : 0;

  // ── Period-over-period changes ──
  const prevTotal = prevCalls.length;
  const prevAnswered = prevCalls.filter((c) => c.status === 'completed').length;
  const prevMissed = prevCalls.filter((c) => c.status === 'missed').length;
  const totalChange = prevTotal > 0 ? Math.round(((totalCalls - prevTotal) / prevTotal) * 100) : 0;
  const answeredChange = prevAnswered > 0
    ? Math.round(((answeredCalls - prevAnswered) / prevAnswered) * 100)
    : 0;
  const missedChange = prevMissed > 0
    ? Math.round(((missedCalls - prevMissed) / prevMissed) * 100)
    : 0;

  // ── Hourly distribution ──
  const hourlyMap = Array.from({ length: 24 }, (_, h) => ({
    hour: h, answered: 0, missed: 0, busy: 0, total: 0,
  }));
  for (const c of calls) {
    if (!c.startTime) continue;
    const h = new Date(c.startTime).getHours();
    hourlyMap[h].total++;
    if (c.status === 'completed') hourlyMap[h].answered++;
    else if (c.status === 'missed') hourlyMap[h].missed++;
    else if (c.status === 'busy') hourlyMap[h].busy++;
  }
  const peakHour = hourlyMap.reduce(
    (max, h) => (h.total > max.total ? h : max),
    hourlyMap[0],
  ).hour;
  const activeHours = hourlyMap.filter((h) => h.total > 0);
  const quietHour = activeHours.length > 0
    ? activeHours.reduce((min, h) => (h.total < min.total ? h : min), activeHours[0]).hour
    : 0;

  // ── Daily trend ──
  const dailyMap = new Map<
    string,
    { total: number; answered: number; missed: number; duration: number; answeredCount: number }
  >();
  for (const c of calls) {
    if (!c.startTime) continue;
    const day = c.startTime.split('T')[0];
    const existing = dailyMap.get(day) ??
      { total: 0, answered: 0, missed: 0, duration: 0, answeredCount: 0 };
    existing.total++;
    if (c.status === 'completed') {
      existing.answered++;
      existing.answeredCount++;
      existing.duration += c.duration ?? 0;
    } else if (c.status === 'missed') {
      existing.missed++;
    }
    dailyMap.set(day, existing);
  }
  const dailyTrend = Array.from(dailyMap.entries())
    .map(([date, d]) => ({
      date,
      total: d.total,
      answered: d.answered,
      missed: d.missed,
      avgDuration: d.answeredCount > 0 ? Math.round(d.duration / d.answeredCount) : 0,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // ── Top callers — phone digit key only (name included in response but never logged) ──
  const callerMap = new Map<
    string,
    { name: string | null; calls: number; answered: number; totalDuration: number }
  >();
  for (const c of calls) {
    const phone = c.direction === 'inbound' ? c.callFrom : c.callTo;
    if (!phone) continue;
    const digits = phone.replace(/\D/g, '').slice(-10);
    const existing = callerMap.get(digits) ??
      { name: c.callerName, calls: 0, answered: 0, totalDuration: 0 };
    existing.calls++;
    if (!existing.name && c.callerName) existing.name = c.callerName;
    if (c.status === 'completed') {
      existing.answered++;
      existing.totalDuration += c.duration ?? 0;
    }
    callerMap.set(digits, existing);
  }
  const topCallers = Array.from(callerMap.entries())
    .map(([phone, d]) => ({ phone, ...d }))
    .sort((a, b) => b.calls - a.calls)
    .slice(0, 10);

  // ── Duration buckets ──
  const buckets = [
    { label: '< 30s', min: 0, max: 30, count: 0 },
    { label: '30s–1m', min: 30, max: 60, count: 0 },
    { label: '1–2m', min: 60, max: 120, count: 0 },
    { label: '2–5m', min: 120, max: 300, count: 0 },
    { label: '5–10m', min: 300, max: 600, count: 0 },
    { label: '10m+', min: 600, max: Infinity, count: 0 },
  ];
  for (const c of calls) {
    if (c.status !== 'completed' || !c.duration) continue;
    const bucket = buckets.find((b) => (c.duration ?? 0) >= b.min && (c.duration ?? 0) < b.max);
    if (bucket) bucket.count++;
  }

  return {
    totalCalls,
    answeredCalls,
    missedCalls,
    busyCalls,
    failedCalls,
    answerRate,
    missedRate,
    avgDuration,
    totalTalkTime: totalDuration,
    inboundCalls,
    outboundCalls,
    linkedCalls,
    totalChange,
    answeredChange,
    missedChange,
    hourlyDistribution: hourlyMap,
    dailyTrend,
    topCallers,
    peakHour,
    quietHour,
    durationBuckets: buckets.map(({ label, count }) => ({ label, count })),
  };
}

/**
 * GET /call-logs
 *
 * Paginated list of call logs, ordered newest-first. rawResponse is stripped
 * from each row (multi-KB per row, unused by the list UI).
 */
export async function listCallLogs(
  session: Session,
  q: {
    page: number;
    pageSize: number;
    date?: string;
    status?: string;
    direction?: string;
    search?: string;
  },
): Promise<{ data: unknown[]; total: number }> {
  const correlationId = crypto.randomUUID();
  const repo = new CallLogsRepository(getSupabaseClient(), session.hospitalId);
  const { rows, total } = await repo.listCallLogs(
    q.page,
    q.pageSize,
    q.date,
    q.status,
    q.direction,
    q.search,
  );

  logger.info('Call logs listed', {
    correlationId, hospitalId: session.hospitalId, userId: session.id,
    module: 'call-logs', action: 'listCallLogs',
  }, {
    count: rows.length, total, page: q.page, pageSize: q.pageSize,
    hasDateFilter: !!q.date,
  });

  return {
    data: rows.map((r) => ({ ...r, rawResponse: null })),
    total,
  };
}

/**
 * GET /call-logs/stats
 *
 * Returns today's call volume by status and direction.
 */
export async function getStats(session: Session): Promise<unknown> {
  const correlationId = crypto.randomUUID();
  const repo = new CallLogsRepository(getSupabaseClient(), session.hospitalId);
  const rows = await repo.getTodayStats();

  const stats = {
    total: rows.length,
    completed: 0,
    missed: 0,
    busy: 0,
    failed: 0,
    inbound: 0,
    outbound: 0,
    totalDuration: 0,
    avgDuration: 0,
  };

  for (const r of rows) {
    if (r.status === 'completed') stats.completed++;
    else if (r.status === 'missed') stats.missed++;
    else if (r.status === 'busy') stats.busy++;
    else if (r.status === 'failed') stats.failed++;

    if (r.direction === 'inbound') stats.inbound++;
    else if (r.direction === 'outbound') stats.outbound++;

    stats.totalDuration += r.duration ?? 0;
  }

  stats.avgDuration = stats.completed > 0
    ? Math.round(stats.totalDuration / stats.completed)
    : 0;

  logger.info('Today call stats fetched', {
    correlationId, hospitalId: session.hospitalId, userId: session.id,
    module: 'call-logs', action: 'getStats',
  }, { total: stats.total });

  return stats;
}

/**
 * PATCH /call-logs/:id/notes
 *
 * Validates the call log exists and belongs to this hospital, then updates notes.
 */
export async function updateNotes(
  session: Session,
  id: string,
  notes: string,
): Promise<void> {
  const correlationId = crypto.randomUUID();
  const repo = new CallLogsRepository(getSupabaseClient(), session.hospitalId);

  const existing = await repo.findById(id);
  if (!existing) throw new NotFoundError('CallLog', id);

  await repo.updateNotes(id, notes);

  logger.info('Call log notes updated', {
    correlationId, hospitalId: session.hospitalId, userId: session.id,
    module: 'call-logs', action: 'updateNotes',
  }, { callLogId: id });
}

/**
 * PATCH /call-logs/:id/patient
 *
 * Links a call log to a patient. Fetches the patient's fullName to populate
 * the callerName field (same as the old Next.js linkCallToPatient action).
 */
export async function linkPatient(
  session: Session,
  id: string,
  patientId: string,
): Promise<void> {
  const correlationId = crypto.randomUUID();
  const repo = new CallLogsRepository(getSupabaseClient(), session.hospitalId);

  // Verify call log exists and belongs to this hospital
  const existing = await repo.findById(id);
  if (!existing) throw new NotFoundError('CallLog', id);

  // Fetch patient to populate callerName
  const { data: patient, error: patientErr } = await getSupabaseClient()
    .from('Patient')
    .select('id, fullName')
    .eq('id', patientId)
    .eq('hospital_id', session.hospitalId)
    .maybeSingle();
  if (patientErr) throw new Error(`Patient lookup failed: ${patientErr.message}`);
  if (!patient) throw new NotFoundError('Patient', patientId);

  await repo.linkPatient(id, patientId, patient.fullName as string);

  logger.info('Call log linked to patient', {
    correlationId, hospitalId: session.hospitalId, userId: session.id,
    module: 'call-logs', action: 'linkPatient',
  }, { callLogId: id, patientId });
}

/**
 * GET /call-logs/patients/search
 *
 * Returns an empty array for blank queries rather than a full-table scan.
 */
export async function searchPatients(session: Session, q?: string): Promise<unknown[]> {
  const correlationId = crypto.randomUUID();
  if (!q || q.trim().length === 0) return [];

  const repo = new CallLogsRepository(getSupabaseClient(), session.hospitalId);
  const results = await repo.searchPatients(q.trim());

  logger.info('Patient search for call linkage', {
    correlationId, hospitalId: session.hospitalId, userId: session.id,
    module: 'call-logs', action: 'searchPatients',
  }, { resultCount: results.length });

  return results;
}

/**
 * POST /call-logs/sync
 *
 * Pulls recent calls from the Exotel v1 API, resolves their true status
 * via Leg2Status (same logic as the webhook), matches callers to patients
 * by phone digits, and bulk-inserts any calls not already in the DB.
 *
 * Exotel auth: EXOTEL_SID + EXOTEL_API_KEY + EXOTEL_API_TOKEN env vars,
 * composed into a Basic Authorization header via btoa() (Deno global).
 */
export async function syncExotel(session: Session): Promise<unknown> {
  const correlationId = crypto.randomUUID();
  const auth = getExotelAuth();

  if (!auth) {
    logger.warn('Exotel credentials not configured — sync skipped', {
      correlationId, hospitalId: session.hospitalId, userId: session.id,
      module: 'call-logs', action: 'syncExotel',
    });
    return { success: false, error: 'Exotel API credentials not configured' };
  }

  const repo = new CallLogsRepository(getSupabaseClient(), session.hospitalId);

  try {
    const v1Url = `https://api.exotel.com/v1/Accounts/${auth.sid}/Calls.json?details=true`;
    const response = await fetch(v1Url, { headers: { Authorization: auth.authHeader } });

    if (!response.ok) {
      const body = await response.text();
      logger.error('Exotel API returned error during sync', {
        correlationId, hospitalId: session.hospitalId, userId: session.id,
        module: 'call-logs', action: 'syncExotel', statusCode: response.status,
      }, { preview: body.slice(0, 200) });
      return { success: false, error: `Exotel API error: ${response.status}` };
    }

    const result = (await response.json()) as Record<string, unknown>;

    // Exotel's call list shape varies — normalise to an array of call objects
    let rawCalls: Record<string, unknown>[] = [];
    const rawCallsData = result?.Calls;
    if (Array.isArray(rawCallsData)) {
      rawCalls = rawCallsData.map(
        (c) => ((c as Record<string, unknown>)?.Call ?? c) as Record<string, unknown>,
      );
    } else if (rawCallsData && typeof rawCallsData === 'object') {
      const callField = (rawCallsData as Record<string, unknown>).Call;
      if (Array.isArray(callField)) {
        rawCalls = callField as Record<string, unknown>[];
      } else if (callField) {
        rawCalls = [callField as Record<string, unknown>];
      }
    }

    // Only process parent calls (child/leg calls have ParentCallSid set)
    const calls = rawCalls.filter((c) => !c.ParentCallSid);

    logger.info('Exotel sync: call list received', {
      correlationId, hospitalId: session.hospitalId, userId: session.id,
      module: 'call-logs', action: 'syncExotel',
    }, { totalFromExotel: rawCalls.length, parentCalls: calls.length });

    if (calls.length === 0) {
      return { success: true, synced: 0, message: 'No calls to sync' };
    }

    // Skip already-synced calls
    const allSids = calls.map((c) => c.Sid as string).filter(Boolean);
    const existingSids = new Set(await repo.findExistingSids(allSids));
    const newCalls = calls.filter((c) => c.Sid && !existingSids.has(c.Sid as string));

    logger.info('Exotel sync: new calls to import', {
      correlationId, hospitalId: session.hospitalId, userId: session.id,
      module: 'call-logs', action: 'syncExotel',
    }, { existing: existingSids.size, newCount: newCalls.length });

    if (newCalls.length === 0) {
      return { success: true, synced: 0, message: 'All calls already synced' };
    }

    // ── Step 1: Parse inline details (no extra I/O) ──
    interface ParsedCall {
      callSid: string;
      callFrom: string;
      callTo: string;
      direction: string;
      startTimeRaw: string | null;
      endTimeRaw: string | null;
      recordingUrl: string | null;
      status: string;      // '' = needs detail fetch
      displayDuration: number;
      callDetails: ExotelCallDetails | null;
      digits: string;
      rawCall: Record<string, unknown>;
    }

    const parsedCalls: ParsedCall[] = newCalls.map((call) => {
      const callSid = call.Sid as string;
      const callFrom = (call.From ?? '') as string;
      const callTo = (call.To ?? '') as string;
      const direction = ((call.Direction ?? 'inbound') as string).toLowerCase().includes('out')
        ? 'outbound'
        : 'inbound';
      const startTimeRaw = (call.StartTime ?? call.DateCreated ?? null) as string | null;
      const endTimeRaw = (call.EndTime ?? null) as string | null;
      const recordingUrl = (call.RecordingUrl ?? null) as string | null;

      const callDetails = parseInlineDetails(call);
      let status = '';
      let displayDuration = 0;

      if (callDetails && callDetails.leg2Status !== null) {
        const mapped = mapLeg2Status(callDetails.leg2Status);
        status = mapped.status;
        displayDuration = mapped.duration === -1
          ? callDetails.conversationDuration
          : mapped.duration;
      }

      const phoneToSearch = direction === 'inbound' ? callFrom : callTo;
      const digits = phoneToSearch.replace(/\D/g, '').slice(-10);

      return {
        callSid, callFrom, callTo, direction, startTimeRaw, endTimeRaw,
        recordingUrl, status, displayDuration, callDetails, digits, rawCall: call,
      };
    });

    // ── Step 2: Fetch details for calls without inline leg data (batched) ──
    const needsFetch = parsedCalls.filter((c) => c.status === '');
    if (needsFetch.length > 0) {
      logger.info('Exotel sync: fetching individual leg details', {
        correlationId, hospitalId: session.hospitalId, userId: session.id,
        module: 'call-logs', action: 'syncExotel',
      }, { count: needsFetch.length });

      const BATCH = 5;
      for (let i = 0; i < needsFetch.length; i += BATCH) {
        const batch = needsFetch.slice(i, i + BATCH);
        const results = await Promise.all(
          batch.map((c) => fetchExotelCallDetails(c.callSid, auth, correlationId)),
        );
        for (let j = 0; j < batch.length; j++) {
          const d = results[j];
          if (d && d.leg2Status !== null) {
            const mapped = mapLeg2Status(d.leg2Status);
            batch[j].status = mapped.status;
            batch[j].displayDuration = mapped.duration === -1 ? d.conversationDuration : mapped.duration;
            batch[j].callDetails = d;
          } else {
            batch[j].status = 'missed';
            batch[j].displayDuration = 0;
          }
        }
      }
    }

    // ── Step 3: Batch patient lookup by phone digits ──
    const uniqueDigits = [
      ...new Set(parsedCalls.map((c) => c.digits).filter((d) => d.length === 10)),
    ];
    const patientMap = new Map<string, { id: string; fullName: string }>();

    if (uniqueDigits.length > 0) {
      const patients = await repo.findPatientsByPhoneDigits(uniqueDigits);
      for (const p of patients) {
        const pDigits = (p.phone ?? '').replace(/\D/g, '').slice(-10);
        if (pDigits.length === 10 && !patientMap.has(pDigits)) {
          patientMap.set(pDigits, { id: p.id, fullName: p.fullName });
        }
      }
    }

    // ── Step 4: Bulk insert ──
    const nowStr = new Date().toISOString();
    const toInsert: NewCallLogRow[] = parsedCalls.map((c) => {
      const patient = c.digits.length === 10 ? patientMap.get(c.digits) : null;
      return {
        exotelCallSid: c.callSid,
        callFrom: c.callFrom,
        callTo: c.callTo,
        direction: c.direction,
        status: c.status || 'missed',
        startTime: c.startTimeRaw ? new Date(c.startTimeRaw).toISOString() : nowStr,
        endTime: c.endTimeRaw ? new Date(c.endTimeRaw).toISOString() : null,
        duration: c.displayDuration,
        recordingUrl: c.recordingUrl,
        callerName: patient?.fullName ?? null,
        patientId: patient?.id ?? null,
        rawResponse: {
          ...c.rawCall,
          _details: c.callDetails?.details ?? {},
          _leg2Status: c.callDetails?.leg2Status ?? null,
        },
        hospital_id: session.hospitalId,
        createdAt: nowStr,
        updatedAt: nowStr,
      };
    });

    await repo.insertCallLogs(toInsert);

    logger.info('Exotel sync completed', {
      correlationId, hospitalId: session.hospitalId, userId: session.id,
      module: 'call-logs', action: 'syncExotel',
    }, { synced: toInsert.length });

    return {
      success: true,
      synced: toInsert.length,
      message: `${toInsert.length} new call${toInsert.length === 1 ? '' : 's'} synced`,
    };
  } catch (err) {
    logger.error('Exotel sync failed', {
      correlationId, hospitalId: session.hospitalId, userId: session.id,
      module: 'call-logs', action: 'syncExotel',
    }, { error: err instanceof Error ? err.message : String(err) });
    return { success: false, error: 'Failed to sync calls from Exotel' };
  }
}

/**
 * POST /call-logs/webhook/exotel
 *
 * Called by index.ts after token validation and body parsing. Upserts the
 * call into the CallLog table. If Exotel API credentials are available,
 * fetches Leg2Status for the authoritative outcome; otherwise falls back to
 * the status field in the webhook payload + ConversationDuration heuristic.
 *
 * Upsert logic (matches original Next.js route.ts):
 *  - If the row already exists and the incoming status is final, update it.
 *  - If the row already exists with a final status, skip (avoid overwriting
 *    a closed call with an intermediate webhook event).
 *  - If the row does not exist, insert it.
 *
 * hospitalIdHeader: value of the X-Hospital-Id request header (may be '').
 * Falls back to the single HospitalProfile row when absent.
 */
export async function processWebhook(hospitalIdHeader: string, payload: unknown): Promise<void> {
  const correlationId = crypto.randomUUID();
  const data = (payload as Record<string, string>);

  const callSid = data.CallSid ?? data.callSid ?? data.sid ?? '';
  if (!callSid) {
    logger.warn('Webhook payload missing CallSid', {
      correlationId, module: 'call-logs', action: 'processWebhook',
    });
    throw new ValidationError('Webhook payload is missing the CallSid field.');
  }

  const hospitalId = await resolveHospitalIdForWebhook(hospitalIdHeader);
  const repo = new CallLogsRepository(getSupabaseClient(), hospitalId);

  // Extract fields — handle both PascalCase (Exotel Status Callback) and
  // camelCase (some integrations normalise to camelCase before forwarding)
  const callFrom = data.CallFrom ?? data.callFrom ?? data.From ?? data.from ?? '';
  const callTo = data.CallTo ?? data.callTo ?? data.To ?? data.to ?? '';
  const direction = (data.Direction ?? data.direction ?? data.CallType ?? 'inbound')
    .toLowerCase()
    .includes('out')
    ? 'outbound'
    : 'inbound';
  const startTime = data.StartTime ?? data.startTime ?? data.CurrentTime ?? null;
  const endTime = data.EndTime ?? data.endTime ?? null;
  const recordingUrl = data.RecordingUrl ?? data.recordingUrl ?? null;
  const conversationDuration = parseInt(
    data.ConversationDuration ?? data.conversationDuration ?? '0',
    10,
  );
  const totalDuration = parseInt(data.Duration ?? data.duration ?? '0', 10);

  const now = new Date().toISOString();

  // Resolve status — prefer Leg2Status from Exotel API, fall back to payload
  const auth = getExotelAuth();
  let status: string;
  let displayDuration: number;
  let rawResponse: Record<string, unknown> = { ...data };

  if (auth) {
    const callDetails = await fetchExotelCallDetails(callSid, auth, correlationId);
    if (callDetails && callDetails.leg2Status !== null) {
      const mapped = mapLeg2Status(callDetails.leg2Status);
      status = mapped.status;
      displayDuration = mapped.duration === -1
        ? callDetails.conversationDuration
        : mapped.duration;
      rawResponse = { ...data, _details: callDetails.details, _leg2Status: callDetails.leg2Status };
    } else {
      const rawStatus = (data.Status ?? data.status ?? '').toLowerCase();
      status = resolveStatusFallback(rawStatus, conversationDuration, totalDuration);
      displayDuration = conversationDuration || totalDuration;
    }
  } else {
    const rawStatus = (data.Status ?? data.status ?? '').toLowerCase();
    status = resolveStatusFallback(rawStatus, conversationDuration, totalDuration);
    displayDuration = conversationDuration || totalDuration;
  }

  // Auto-link caller to a patient by phone number (best-effort)
  const phoneToSearch = direction === 'inbound' ? callFrom : callTo;
  const patient = phoneToSearch ? await repo.findPatientByPhone(phoneToSearch) : null;

  logger.info('Webhook processed', {
    correlationId, hospitalId, module: 'call-logs', action: 'processWebhook',
  }, { callSid, status, direction });

  // Upsert by Exotel CallSid
  const existing = await repo.findBySid(callSid);
  if (existing) {
    const isFinalStatus = ['completed', 'missed', 'busy', 'failed'].includes(status);
    const existingIsFinal = ['completed', 'missed', 'busy', 'failed'].includes(existing.status);

    if (isFinalStatus || !existingIsFinal) {
      await repo.updateById(existing.id, {
        status: isFinalStatus ? status : existing.status,
        endTime: endTime ? new Date(endTime).toISOString() : null,
        duration: conversationDuration || totalDuration,
        // undefined skips the field — avoids clearing previously linked patient data
        recordingUrl: recordingUrl || undefined,
        callerName: patient?.fullName || undefined,
        patientId: patient?.id || undefined,
        rawResponse,
      });
    }
  } else {
    await repo.insertOne({
      exotelCallSid: callSid,
      callFrom,
      callTo,
      direction,
      status,
      startTime: startTime ? new Date(startTime).toISOString() : now,
      endTime: endTime ? new Date(endTime).toISOString() : null,
      duration: displayDuration,
      recordingUrl,
      callerName: patient?.fullName ?? null,
      patientId: patient?.id ?? null,
      rawResponse,
      hospital_id: hospitalId,
      createdAt: now,
      updatedAt: now,
    });
  }
}
