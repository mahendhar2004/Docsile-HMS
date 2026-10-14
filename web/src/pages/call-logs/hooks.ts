/**
 * call-logs/hooks.ts
 *
 * All data-fetching and mutation hooks for the call-logs module.
 *
 * Query hooks:
 *   useCallLogsList   — GET /call-logs?page&pageSize&dateFrom&dateTo (offset-paginated)
 *   useCallStats      — GET /call-logs/stats (today's counts)
 *   useCallAnalytics  — GET /call-logs/analytics?filter&customStart&customEnd
 *   usePatientSearch  — GET /call-logs/patients/search?q=... (enabled ≥ 2 chars)
 *
 * Mutation hooks:
 *   useUpdateNotes    — PATCH /call-logs/{id}/notes      (call_logs:edit)
 *   useLinkPatient    — PATCH /call-logs/{id}/patient    (call_logs:edit)
 *   useSyncExotel     — POST  /call-logs/sync            (call_logs:sync)
 *
 * Permission keys cross-checked against OpenAPI x-permission fields.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "@/components/ui/sonner"
import { apiClient } from "@/lib/api-client"
import { usePaginatedQuery } from "@/hooks/usePaginatedQuery"
import type {
  CallLog,
  CallStats,
  CallAnalyticsData,
  PatientSearchResult,
  SyncResponse,
  AnalyticsFilter,
} from "./types"

// ─── Query key factory ────────────────────────────────────────────────────────

export const callLogsKeys = {
  all: ["call-logs"] as const,
  lists: () => [...callLogsKeys.all, "list"] as const,
  list: (date: string | null) => [...callLogsKeys.lists(), date ?? "all"] as const,
  stats: () => [...callLogsKeys.all, "stats"] as const,
  analytics: (filter: string, customStart?: string, customEnd?: string) =>
    [...callLogsKeys.all, "analytics", filter, customStart ?? "", customEnd ?? ""] as const,
  patientSearch: (q: string) => [...callLogsKeys.all, "patient-search", q] as const,
} as const

// ─── Query hooks ──────────────────────────────────────────────────────────────

/**
 * Offset-paginated list of call logs.
 * GET /call-logs?page=N&pageSize=N&date=YYYY-MM-DD
 * x-permission: call_logs:view
 */
export function useCallLogsList(
  dateFrom: string | null,
  dateTo: string | null,
  enabled = true,
  filters?: { status?: string; direction?: string; search?: string },
) {
  const status = filters?.status && filters.status !== "all" ? filters.status : ""
  const direction = filters?.direction && filters.direction !== "all" ? filters.direction : ""
  const search = filters?.search ?? ""

  return usePaginatedQuery<CallLog>({
    queryKey: [...callLogsKeys.list(`${dateFrom ?? ""}:${dateTo ?? ""}`), status, direction, search],
    queryFn: ({ page, pageSize }) => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      })
      if (dateFrom) params.set("dateFrom", dateFrom)
      if (dateTo) params.set("dateTo", dateTo)
      if (status) params.set("status", status)
      if (direction) params.set("direction", direction)
      if (search) params.set("search", search)
      return apiClient.get<CallLog[]>(`/call-logs?${params.toString()}`)
    },
    initialPageSize: 50,
    queryOptions: { enabled },
  })
}

/**
 * Today's call volume stats (no date params — always today).
 * GET /call-logs/stats
 * x-permission: call_logs:view
 */
export function useCallStats(enabled = true) {
  return useQuery({
    queryKey: callLogsKeys.stats(),
    queryFn: () =>
      apiClient.get<CallStats>("/call-logs/stats").then((e) => e.data),
    enabled,
    staleTime: 30_000,
  })
}

/**
 * Analytics aggregates for the selected time period.
 * GET /call-logs/analytics?filter=today|week|month|year
 * x-permission: call_logs:view
 */
export function useCallAnalytics(filter: AnalyticsFilter, enabled = true) {
  return useQuery({
    queryKey: callLogsKeys.analytics(filter),
    queryFn: () =>
      apiClient
        .get<CallAnalyticsData>(`/call-logs/analytics?filter=${filter}`)
        .then((e) => e.data),
    enabled,
    staleTime: 60_000,
  })
}

/**
 * Patient search for call-log linkage (enabled when q >= 2 chars).
 * GET /call-logs/patients/search?q=...
 * x-permission: call_logs:view
 */
export function usePatientSearch(q: string, enabled = true) {
  const trimmed = q.trim()
  return useQuery({
    queryKey: callLogsKeys.patientSearch(trimmed),
    queryFn: () =>
      apiClient
        .get<PatientSearchResult[]>(
          `/call-logs/patients/search?q=${encodeURIComponent(trimmed)}`,
        )
        .then((e) => e.data),
    enabled: enabled && trimmed.length >= 2,
    staleTime: 30_000,
  })
}

// ─── Mutation hooks ───────────────────────────────────────────────────────────

/**
 * Update notes on a call log.
 * PATCH /call-logs/{id}/notes
 * x-permission: call_logs:edit
 */
export function useUpdateNotes() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) =>
      apiClient.patch(`/call-logs/${id}/notes`, { notes }),
    onSuccess: () => {
      toast.success("Notes saved")
      void queryClient.invalidateQueries({ queryKey: callLogsKeys.lists() })
    },
    onError: () => toast.error("Failed to save notes"),
  })
}

/**
 * Link a call log to a patient.
 * PATCH /call-logs/{id}/patient — body: { patientId }
 * Backend auto-populates callerName from Patient.fullName.
 * x-permission: call_logs:edit
 */
export function useLinkPatient() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patientId }: { id: string; patientId: string }) =>
      apiClient.patch(`/call-logs/${id}/patient`, { patientId }),
    onSuccess: () => {
      toast.success("Linked to patient")
      void queryClient.invalidateQueries({ queryKey: callLogsKeys.lists() })
    },
    onError: () => toast.error("Failed to link patient"),
  })
}

/**
 * Manual Exotel sync — pulls recent calls from the Exotel v1 API.
 * POST /call-logs/sync
 * x-permission: call_logs:sync
 *
 * This hits an external API and may be slow; callers should show a loading state.
 * Returns SyncResponse: { success, synced?, message?, error? }
 */
export function useSyncExotel() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => apiClient.post<SyncResponse>("/call-logs/sync"),
    onSuccess: (envelope) => {
      const result = envelope.data
      if (result.success) {
        toast.success(result.message ?? `Synced ${result.synced ?? 0} new call(s) from Exotel`)
        void queryClient.invalidateQueries({ queryKey: callLogsKeys.all })
      } else {
        toast.error(result.error ?? "Sync did not complete successfully")
      }
    },
    onError: () => toast.error("Failed to sync calls from Exotel"),
  })
}
