/**
 * dues-followups/hooks.ts
 *
 * All data-fetching hooks for the dues & follow-ups module.
 *
 * Query hooks:
 *   useDues            — GET /dues-followups/dues (offset-paginated)
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
  FollowUpRecord,
  FollowUpsSummary,
  EmailTemplate,
  MarkPaidBody,
  SendEmailBody,
} from "./types"

// ─── Query key factory ────────────────────────────────────────────────────────

export const duesKeys = {
  all: ["dues-followups"] as const,
  dues: () => [...duesKeys.all, "dues"] as const,
  followups: () => [...duesKeys.all, "followups"] as const,
  doctors: () => [...duesKeys.all, "doctors"] as const,
  departments: () => [...duesKeys.all, "departments"] as const,
  emailTemplates: () => [...duesKeys.all, "email-templates"] as const,
  hospitalName: () => [...duesKeys.all, "hospital-name"] as const,
} as const

// ─── Query hooks ──────────────────────────────────────────────────────────────

/**
 * Offset-paginated outstanding dues across all modules (OPD / IPD / LAB / PHARMACY).
 * Endpoint: GET /dues-followups/dues?page=N&pageSize=N
 * Permission: dues:view
 */
export function useDues(enabled = true) {
  return usePaginatedQuery<DueRecord>({
    queryKey: duesKeys.dues(),
    queryFn: ({ page, pageSize }) =>
      apiClient.get<DueRecord[]>(
        `/dues-followups/dues?page=${page}&pageSize=${pageSize}`,
      ),
    initialPageSize: 25,
    queryOptions: { enabled },
  })
}

/**
 * Offset-paginated follow-up list (OPD + IPD, sorted soonest-first).
 * Endpoint: GET /dues-followups/followups?page=N&pageSize=N
 * Permission: dues:view
 */
export function useFollowups(enabled = true) {
  return usePaginatedQuery<FollowUpRecord>({
    queryKey: duesKeys.followups(),
    queryFn: ({ page, pageSize }) =>
      apiClient.get<FollowUpRecord[]>(
        `/dues-followups/followups?page=${page}&pageSize=${pageSize}`,
      ),
    initialPageSize: 25,
    queryOptions: { enabled },
  })
}

/**
 * Summary tile counts (Today/Tomorrow/Total/Overdue), computed server-side
 * over every follow-up record — not scoped to the currently loaded page.
 * Endpoint: GET /dues-followups/followups/summary
 * Permission: dues:view
 */
export function useFollowupsSummary(enabled = true) {
  return useQuery({
    queryKey: [...duesKeys.followups(), "summary"],
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
      void qc.invalidateQueries({ queryKey: duesKeys.dues() })
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
