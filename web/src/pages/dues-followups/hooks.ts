/**
 * dues-followups/hooks.ts
 *
 * All data-fetching hooks for the dues & follow-ups module.
 *
 * Query hooks:
 *   useDues            — GET /dues-followups/dues (offset-paginated)
 *   useDuesSummary     — GET /dues-followups/dues/summary (Total Outstanding + per-type)
 *   useFollowups       — GET /dues-followups/followups (offset-paginated)
 *   useFollowupsSummary — GET /dues-followups/followups/summary (Today/Tomorrow/Total/Overdue)
 *   useDoctors         — GET /dues-followups/doctors (for filter dropdowns)
 *   useDepartments     — GET /dues-followups/departments (for filter dropdowns)
 *   useEmailTemplates  — GET /dues-followups/email-templates
 *   useHospitalName    — GET /dues-followups/hospital-name
 *
 * Mutation hooks:
 *   useMarkPaid        — PATCH /dues-followups/dues/{id}/mark-paid  (dues:edit)
 *   useSendEmail       — POST /dues-followups/send-email            (dues:edit)
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "@/components/ui/sonner"
import { apiClient } from "@/lib/api-client"
import { usePaginatedQuery } from "@/hooks/usePaginatedQuery"
import type {
  DueRecord,
  DuesSummary,
  DueType,
  FollowUpRecord,
  FollowUpType,
  FollowUpsSummary,
  EmailTemplate,
  MarkPaidBody,
  SendEmailBody,
} from "./types"

// ─── Filter param shapes ──────────────────────────────────────────────────────

export interface DuesFilters {
  search?: string
  type?: DueType | "ALL"
  dateFrom?: string
  dateTo?: string
  sortBy?: "date_desc" | "date_asc" | "amount_desc" | "amount_asc"
}

export interface FollowupsFilters {
  notesSearch?: string
  type?: FollowUpType | "ALL"
  doctor?: string
  department?: string
  dateFrom?: string
  dateTo?: string
  includeOverdue?: boolean
}

// ─── Query key factory ────────────────────────────────────────────────────────

export const duesKeys = {
  all: ["dues-followups"] as const,
  dues: (filters?: DuesFilters) => [...duesKeys.all, "dues", filters ?? {}] as const,
  followups: (filters?: FollowupsFilters) => [...duesKeys.all, "followups", filters ?? {}] as const,
  doctors: () => [...duesKeys.all, "doctors"] as const,
  departments: () => [...duesKeys.all, "departments"] as const,
  emailTemplates: () => [...duesKeys.all, "email-templates"] as const,
  hospitalName: () => [...duesKeys.all, "hospital-name"] as const,
} as const

// ─── Query hooks ──────────────────────────────────────────────────────────────

/**
 * Offset-paginated outstanding dues across all modules (OPD / IPD / LAB / PHARMACY).
 * Filters match main's DuesTab filter bar — search / type / date range / sortBy.
 * Endpoint: GET /dues-followups/dues?page=N&pageSize=N&search=&type=&dateFrom=&dateTo=&sortBy=
 * Permission: dues:view
 */
export function useDues(filters: DuesFilters = {}, enabled = true) {
  return usePaginatedQuery<DueRecord>({
    queryKey: duesKeys.dues(filters),
    queryFn: ({ page, pageSize }) => {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
      if (filters.search) params.set("search", filters.search)
      if (filters.type) params.set("type", filters.type)
      if (filters.dateFrom) params.set("dateFrom", filters.dateFrom)
      if (filters.dateTo) params.set("dateTo", filters.dateTo)
      if (filters.sortBy) params.set("sortBy", filters.sortBy)
      return apiClient.get<DueRecord[]>(`/dues-followups/dues?${params}`)
    },
    initialPageSize: 25,
    queryOptions: { enabled },
  })
}

/**
 * Summary tile totals (Total Outstanding + per-type OPD/IPD/LAB/PHARMACY
 * count+total), computed server-side over every outstanding due — not
 * scoped to the currently loaded page or the list's active filters.
 * Endpoint: GET /dues-followups/dues/summary
 * Permission: dues:view
 */
export function useDuesSummary(enabled = true) {
  return useQuery({
    queryKey: [...duesKeys.all, "dues", "summary"],
    queryFn: () =>
      apiClient.get<DuesSummary>("/dues-followups/dues/summary").then((res) => res.data),
    enabled,
  })
}

/**
 * Offset-paginated follow-up list (OPD + IPD, sorted soonest-first).
 * Filters match main's FollowUpsTab filter bar — notes search / type /
 * doctor / department / date range / includeOverdue.
 * Endpoint: GET /dues-followups/followups?page=N&pageSize=N&notesSearch=&type=&doctor=&department=&dateFrom=&dateTo=&includeOverdue=
 * Permission: dues:view
 */
export function useFollowups(filters: FollowupsFilters = {}, enabled = true) {
  return usePaginatedQuery<FollowUpRecord>({
    queryKey: duesKeys.followups(filters),
    queryFn: ({ page, pageSize }) => {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
      if (filters.notesSearch) params.set("notesSearch", filters.notesSearch)
      if (filters.type) params.set("type", filters.type)
      if (filters.doctor) params.set("doctor", filters.doctor)
      if (filters.department) params.set("department", filters.department)
      if (filters.dateFrom) params.set("dateFrom", filters.dateFrom)
      if (filters.dateTo) params.set("dateTo", filters.dateTo)
      if (filters.includeOverdue) params.set("includeOverdue", "true")
      return apiClient.get<FollowUpRecord[]>(`/dues-followups/followups?${params}`)
    },
    initialPageSize: 25,
    queryOptions: { enabled },
  })
}

/**
 * Summary tile counts (Today/Tomorrow/Total/Overdue), computed server-side
 * over every follow-up record — not scoped to the currently loaded page or
 * the list's active filters (same deliberately-global design as useDuesSummary).
 * Endpoint: GET /dues-followups/followups/summary
 * Permission: dues:view
 */
export function useFollowupsSummary(enabled = true) {
  return useQuery({
    queryKey: [...duesKeys.all, "followups", "summary"],
    queryFn: () =>
      apiClient
        .get<FollowUpsSummary>("/dues-followups/followups/summary")
        .then((res) => res.data),
    enabled,
  })
}

/**
 * Unique doctor names from Prescription table (for follow-up filter dropdowns).
 * Endpoint: GET /dues-followups/doctors
 * Permission: dues:view
 */
export function useDoctors(enabled = true) {
  return useQuery({
    queryKey: duesKeys.doctors(),
    queryFn: () =>
      apiClient.get<string[]>("/dues-followups/doctors").then((e) => e.data),
    enabled,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Unique department names from Prescription table (for follow-up filter dropdowns).
 * Endpoint: GET /dues-followups/departments
 * Permission: dues:view
 */
export function useDepartments(enabled = true) {
  return useQuery({
    queryKey: duesKeys.departments(),
    queryFn: () =>
      apiClient.get<string[]>("/dues-followups/departments").then((e) => e.data),
    enabled,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Available email templates from the Sitha AI service.
 * Endpoint: GET /dues-followups/email-templates
 * Permission: dues:view
 */
export function useEmailTemplates(enabled = true) {
  return useQuery({
    queryKey: duesKeys.emailTemplates(),
    queryFn: () =>
      apiClient
        .get<EmailTemplate[]>("/dues-followups/email-templates")
        .then((e) => e.data),
    enabled,
    staleTime: 60 * 1000,
  })
}

/**
 * Hospital display name (used in the send-email dialog for context).
 * Endpoint: GET /dues-followups/hospital-name
 * Permission: dues:view
 */
export function useHospitalName(enabled = true) {
  return useQuery({
    queryKey: duesKeys.hospitalName(),
    queryFn: () =>
      apiClient
        .get<string>("/dues-followups/hospital-name")
        .then((e) => e.data),
    enabled,
    staleTime: 10 * 60 * 1000,
  })
}

// ─── Mutation hooks ───────────────────────────────────────────────────────────

/**
 * Mark a due as fully paid.
 * Endpoint: PATCH /dues-followups/dues/{id}/mark-paid
 * Permission: dues:edit
 */
export function useMarkPaid(onSuccess?: () => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: MarkPaidBody }) =>
      apiClient.patch(`/dues-followups/dues/${id}/mark-paid`, body),
    onSuccess: () => {
      // Prefix-invalidate every dues query regardless of active filters —
      // duesKeys.dues(filters) embeds the filter object as its last segment,
      // so invalidating with a specific (or empty) filters value would only
      // exact/prefix-match that one variant, not every other filter combo.
      void qc.invalidateQueries({ queryKey: [...duesKeys.all, "dues"] })
      toast.success("Due marked as paid.")
      onSuccess?.()
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof Error ? err.message : "Failed to mark due as paid."
      toast.error(msg)
    },
  })
}

/**
 * Send a follow-up email to a patient via the Sitha AI email service.
 * The backend resolves the patient's email from their UHID.
 * Endpoint: POST /dues-followups/send-email
 * Permission: dues:edit
 */
export function useSendEmail(onSuccess?: () => void) {
  return useMutation({
    mutationFn: (body: SendEmailBody) =>
      apiClient.post("/dues-followups/send-email", body),
    onSuccess: () => {
      toast.success("Email sent successfully.")
      onSuccess?.()
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof Error ? err.message : "Failed to send email."
      toast.error(msg)
    },
  })
}
