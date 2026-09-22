/**
 * call-logs/types.ts
 *
 * All types verified against:
 *   - supabase/functions/call-logs/repository.ts  (CallLogRow, PatientSearchRow)
 *   - supabase/functions/call-logs/service.ts     (analytics shape, stats shape, sync shape)
 *   - src/app/(hospital)/call-logs/actions.ts     (CallAnalyticsData — old Next.js ground truth)
 *   - src/app/(hospital)/call-logs/components/CallLogsPage.tsx (STATUS_CONFIG, direction values)
 *   - .sde/schemas/openapi.yaml                   (CallLog schema + endpoint contracts)
 */

// ─── Call Log Record ──────────────────────────────────────────────────────────

/**
 * Exact DB field names from repository.ts CallLogRow.
 * rawResponse is excluded — it's multi-KB Exotel JSON and never rendered in UI.
 */
export interface CallLog {
  id: string
  exotelCallSid: string
  callFrom: string         // caller phone number (E.164 or national)
  callTo: string           // destination phone number
  direction: string        // "inbound" | "outbound"
  status: string           // "completed" | "missed" | "busy" | "failed" | "ringing"
  startTime: string        // ISO datetime
  endTime: string | null
  duration: number | null  // seconds (conversation duration; 0 for missed/busy/failed)
  recordingUrl: string | null
  callerName: string | null  // populated when call linked to a Patient (patient.fullName)
  patientId: string | null   // Patient.id (UUID) when linked
  notes: string | null
  createdAt: string
  updatedAt: string
}

// ─── Stats ────────────────────────────────────────────────────────────────────

/**
 * Response shape from GET /call-logs/stats.
 * Returns today's call volume counts.
 * Verified from service.ts getStats().
 */
export interface CallStats {
  total: number
  completed: number      // answered calls
  missed: number
  busy: number
  failed: number
  inbound: number
  outbound: number
  totalDuration: number  // seconds
  avgDuration: number    // seconds (avg over completed calls only)
}

// ─── Analytics ────────────────────────────────────────────────────────────────

/**
 * Response shape from GET /call-logs/analytics.
 * Verified against both service.ts getAnalytics() and
 * src/app/(hospital)/call-logs/actions.ts CallAnalyticsData.
 */
export interface CallAnalyticsData {
  // ── KPIs ──
  totalCalls: number
  answeredCalls: number
  missedCalls: number
  busyCalls: number
  failedCalls: number
  answerRate: number       // 0–100 (%)
  missedRate: number       // 0–100 (%)
  avgDuration: number      // seconds
  totalTalkTime: number    // seconds (sum of all completed call durations)
  inboundCalls: number
  outboundCalls: number
  linkedCalls: number      // calls with a linked patient

  // ── Period-over-period deltas (% vs previous period) ──
  totalChange: number
  answeredChange: number
  missedChange: number

  // ── Hourly heatmap (24 buckets, indices 0–23) ──
  hourlyDistribution: HourlyBucket[]

  // ── Daily trend (one entry per calendar day in range) ──
  dailyTrend: DailyTrendPoint[]

  // ── Top callers (up to 10, by total call count) ──
  topCallers: TopCaller[]

  // ── Peak / quiet hour (0–23) ──
  peakHour: number
  quietHour: number

  // ── Duration distribution histogram ──
  durationBuckets: DurationBucket[]
}

export interface HourlyBucket {
  hour: number       // 0–23
  answered: number
  missed: number
  busy: number
  total: number
}

export interface DailyTrendPoint {
  date: string       // "YYYY-MM-DD"
  total: number
  answered: number
  missed: number
  avgDuration: number  // seconds
}

export interface TopCaller {
  phone: string          // 10-digit string
  name: string | null    // callerName if linked to patient, else null
  calls: number
  answered: number
  totalDuration: number  // seconds
}

export interface DurationBucket {
  label: string   // "< 30s" | "30s–1m" | "1–2m" | "2–5m" | "5–10m" | "10m+"
  count: number
}

// ─── Patient Search ───────────────────────────────────────────────────────────

/**
 * Patient search result for call-log linkage.
 * From repository.ts PatientSearchRow + service.ts searchPatients.
 * GET /call-logs/patients/search?q=...
 */
export interface PatientSearchResult {
  id: string           // Patient UUID
  fullName: string
  phone: string
  patientId: string    // Sequential display ID e.g. "P-0001"
}

// ─── Sync ─────────────────────────────────────────────────────────────────────

/**
 * Response from POST /call-logs/sync.
 * Verified from service.ts syncExotel().
 */
export interface SyncResponse {
  success: boolean
  synced?: number
  message?: string
  error?: string
}

// ─── Analytics filter ─────────────────────────────────────────────────────────

/**
 * Maps to AnalyticsQuerySchema.filter values.
 * "custom" additionally requires customStart + customEnd dates.
 */
export type AnalyticsFilter = "today" | "week" | "month" | "year"

// ─── Status display config ────────────────────────────────────────────────────

/**
 * Display properties for each Exotel-mapped status value.
 * Status values verified from service.ts mapLeg2Status() and resolveStatusFallback().
 * Label values verified from CallLogsPage.tsx STATUS_CONFIG.
 */
export interface StatusDisplayConfig {
  label: string
  colorClass: string   // Tailwind text color
  bgClass: string      // Tailwind bg + border classes
}

export const CALL_STATUS_CONFIG: Record<string, StatusDisplayConfig> = {
  completed: {
    label: "Answered",
    colorClass: "text-green-700",
    bgClass: "bg-green-50 border-green-200",
  },
  missed: {
    label: "Missed",
    colorClass: "text-red-600",
    bgClass: "bg-red-50 border-red-200",
  },
  busy: {
    label: "Busy",
    colorClass: "text-amber-600",
    bgClass: "bg-amber-50 border-amber-200",
  },
  failed: {
    label: "Failed",
    colorClass: "text-gray-500",
    bgClass: "bg-gray-50 border-gray-200",
  },
  ringing: {
    label: "Ringing",
    colorClass: "text-blue-600",
    bgClass: "bg-blue-50 border-blue-200",
  },
} as const
