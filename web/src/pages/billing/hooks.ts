/**
 * billing/hooks.ts
 *
 * All data-fetching hooks for the billing module.
 *
 * Query hooks:
 *   - useDailySummary       — GET /billing/daily (single-day snapshot, plain useQuery)
 *   - useBillingPrescriptions — GET /billing/prescriptions (offset-paginated)
 *   - usePrescriptionDetail — GET /billing/prescriptions/{id}
 *
 * Mutation hooks:
 *   - useRecordPayment      — POST /billing/prescriptions/{id}/payments
 *   - useVoidPayment        — DELETE /billing/prescriptions/{id}/payments/{payId}
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "@/components/ui/sonner"
import { apiClient } from "@/lib/api-client"
import { usePaginatedQuery } from "@/hooks/usePaginatedQuery"
import type {
  BillingPrescription,
  DailySummary,
  PrescriptionDetailData,
  RecordPaymentBody,
} from "./types"

// ─── Query key factory ────────────────────────────────────────────────────────

export const billingKeys = {
  all: ["billing"] as const,
  daily: (date: string) => [...billingKeys.all, "daily", date] as const,
  prescriptions: () => [...billingKeys.all, "prescriptions"] as const,
  prescriptionList: (date: string | null) =>
    [...billingKeys.prescriptions(), "list", date ?? "all"] as const,
  prescriptionDetail: (id: string) =>
    [...billingKeys.prescriptions(), "detail", id] as const,
} as const

// ─── Query hooks ──────────────────────────────────────────────────────────────

/**
 * Fetch the daily billing summary for a given IST calendar date.
 * /billing/daily returns a single flat object (not paginated).
 * Endpoint: GET /billing/daily?date=YYYY-MM-DD
 */
export function useDailySummary(date: string, enabled = true) {
  return useQuery({
    queryKey: billingKeys.daily(date),
    queryFn: () =>
      apiClient
        .get<DailySummary>(`/billing/daily?date=${date}`)
        .then((e) => e.data),
    enabled,
    staleTime: 60 * 1000, // 1 min — daily summary doesn't change rapidly
  })
}

/**
 * Offset-paginated list of prescriptions with billing amounts.
 * Endpoint: GET /billing/prescriptions?date=YYYY-MM-DD&page=N&pageSize=N
 * When date is null, returns prescriptions across all dates (ordered DESC).
 */
export function useBillingPrescriptions(date: string | null) {
  const dateParam = date ? `&date=${date}` : ""
  return usePaginatedQuery<BillingPrescription>({
    queryKey: billingKeys.prescriptionList(date),
    queryFn: ({ page, pageSize }) =>
      apiClient.get<BillingPrescription[]>(
        `/billing/prescriptions?page=${page}&pageSize=${pageSize}${dateParam}`,
      ),
    initialPageSize: 25,
  })
}

/**
 * Fetch full prescription billing detail: invoice items + payments.
 * Endpoint: GET /billing/prescriptions/{id}
 * Only fires when id is non-null.
 */
export function usePrescriptionDetail(id: string | null, enabled = true) {
  return useQuery({
    queryKey: billingKeys.prescriptionDetail(id ?? ""),
    queryFn: () =>
      apiClient
        .get<PrescriptionDetailData>(`/billing/prescriptions/${id!}`)
        .then((e) => e.data),
    enabled: enabled && id != null,
    staleTime: 30 * 1000,
  })
}

// ─── Mutation hooks ───────────────────────────────────────────────────────────

/**
 * Record an additional payment on a prescription.
 * Endpoint: POST /billing/prescriptions/{id}/payments
 * Permission: billing:create
 * Invalidates both the prescription detail and the prescriptions list on success.
 */
export function useRecordPayment(
  prescriptionId: string,
  onSuccess?: () => void,
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: RecordPaymentBody) =>
      apiClient.post(`/billing/prescriptions/${prescriptionId}/payments`, body),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: billingKeys.prescriptionDetail(prescriptionId),
      })
      void qc.invalidateQueries({ queryKey: billingKeys.prescriptions() })
      void qc.invalidateQueries({ queryKey: billingKeys.all })
      toast.success("Payment recorded successfully.")
      onSuccess?.()
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof Error ? err.message : "Failed to record payment."
      toast.error(msg)
    },
  })
}

/**
 * Void (hard-delete) a payment on a prescription.
 * Endpoint: DELETE /billing/prescriptions/{id}/payments/{payId}
 * Permission: billing:delete (admin-only per spec)
 * Invalidates both the prescription detail and the prescriptions list on success.
 */
export function useVoidPayment(
  prescriptionId: string,
  onSuccess?: () => void,
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payId: string) =>
      apiClient.delete(
        `/billing/prescriptions/${prescriptionId}/payments/${payId}`,
      ),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: billingKeys.prescriptionDetail(prescriptionId),
      })
      void qc.invalidateQueries({ queryKey: billingKeys.prescriptions() })
      void qc.invalidateQueries({ queryKey: billingKeys.all })
      toast.success("Payment voided.")
      onSuccess?.()
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof Error ? err.message : "Failed to void payment."
      toast.error(msg)
    },
  })
}
