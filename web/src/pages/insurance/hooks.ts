/**
 * insurance/hooks.ts
 *
 * All TanStack Query data-fetching and mutation hooks for the Insurance module.
 *
 * Query hooks:
 *   - useInsuranceCompanies        — GET /insurance/companies (paginated)
 *   - useInsuranceCompaniesAll     — GET /insurance/companies?paginated=false (for dropdowns)
 *   - useInsuranceClaims           — GET /insurance/claims (offset-paginated, optional status filter)
 *   - useInsuranceClaim            — GET /insurance/claims/{id}
 *   - useInpatientSearch           — GET /insurance/inpatients/search?q=...
 *
 * Mutation hooks:
 *   - useCreateCompany             — POST /insurance/companies
 *   - useUpdateCompany             — PATCH /insurance/companies/{id}
 *   - useDeleteCompany             — DELETE /insurance/companies/{id}
 *   - useCreateClaim               — POST /insurance/claims
 *   - useUpdateClaimStatus         — PATCH /insurance/claims/{id}/status
 *   - useUpdateClaimDetails        — PATCH /insurance/claims/{id}/details
 *   - useAddClaimPayment           — POST /insurance/claims/{id}/payments
 *
 * Permissions (from openapi.yaml x-permission):
 *   - insurance:view  — all GET endpoints
 *   - insurance:create — POST /insurance/claims
 *   - insurance:edit  — POST/PATCH/DELETE companies; PATCH claims status/details; POST payments
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "@/components/ui/sonner"
import { apiClient } from "@/lib/api-client"
import { usePaginatedQuery } from "@/hooks/usePaginatedQuery"
import type {
  InsuranceCompany,
  InsuranceCompanyListItem,
  InsuranceCompanyBody,
  InsuranceClaim,
  CreateInsuranceClaimBody,
  UpdateClaimStatusBody,
  UpdateClaimDetailsBody,
  AddClaimPaymentBody,
  InpatientSearchResult,
} from "./types"

// ─── Query key factory ────────────────────────────────────────────────────────

export const insuranceKeys = {
  all: ["insurance"] as const,
  companies: () => [...insuranceKeys.all, "companies"] as const,
  companiesList: (page: number, pageSize: number) =>
    [...insuranceKeys.companies(), "list", page, pageSize] as const,
  companiesAll: () => [...insuranceKeys.companies(), "all"] as const,
  claims: () => [...insuranceKeys.all, "claims"] as const,
  claimList: (status: string) => [...insuranceKeys.claims(), "list", status] as const,
  claimDetail: (id: string) => [...insuranceKeys.claims(), "detail", id] as const,
  inpatientSearch: (q: string) => [...insuranceKeys.all, "inpatients", "search", q] as const,
} as const

// ─── Query hooks ──────────────────────────────────────────────────────────────

/**
 * Offset-paginated list of insurance companies.
 * Endpoint: GET /insurance/companies?page=N&pageSize=N
 * Permission: insurance:view
 */
export function useInsuranceCompanies() {
  return usePaginatedQuery<InsuranceCompany>({
    queryKey: insuranceKeys.companies(),
    queryFn: ({ page, pageSize }) =>
      apiClient.get<InsuranceCompany[]>(
        `/insurance/companies?page=${page}&pageSize=${pageSize}`,
      ),
    initialPageSize: 25,
  })
}

/**
 * All insurance companies (unpaginated) for dropdown/select population.
 * Endpoint: GET /insurance/companies?paginated=false
 * Permission: insurance:view
 */
export function useInsuranceCompaniesAll(enabled = true) {
  return useQuery({
    queryKey: insuranceKeys.companiesAll(),
    queryFn: () =>
      apiClient
        .get<InsuranceCompanyListItem[]>("/insurance/companies?paginated=false")
        .then((e) => e.data),
    enabled,
    staleTime: 5 * 60 * 1000, // 5 min — company list changes infrequently
  })
}

/**
 * Offset-paginated list of insurance claims with optional status filter.
 * Endpoint: GET /insurance/claims?page=N&pageSize=N&status=...
 * Permission: insurance:view
 */
export function useInsuranceClaims(statusFilter: string) {
  const statusParam = statusFilter ? `&status=${statusFilter}` : ""
  return usePaginatedQuery<InsuranceClaim>({
    queryKey: insuranceKeys.claimList(statusFilter),
    queryFn: ({ page, pageSize }) =>
      apiClient.get<InsuranceClaim[]>(
        `/insurance/claims?page=${page}&pageSize=${pageSize}${statusParam}`,
      ),
    initialPageSize: 25,
  })
}

/**
 * Single insurance claim detail.
 * Endpoint: GET /insurance/claims/{id}
 * Permission: insurance:view
 */
export function useInsuranceClaim(id: string | null, enabled = true) {
  return useQuery({
    queryKey: insuranceKeys.claimDetail(id ?? ""),
    queryFn: () =>
      apiClient.get<InsuranceClaim>(`/insurance/claims/${id!}`).then((e) => e.data),
    enabled: enabled && id != null,
    staleTime: 30 * 1000,
  })
}

/**
 * Search inpatients for insurance claim creation.
 * Endpoint: GET /insurance/inpatients/search?q=...
 * Permission: insurance:view
 * Only fires when q has at least 2 characters.
 */
export function useInpatientSearch(q: string, enabled = true) {
  return useQuery({
    queryKey: insuranceKeys.inpatientSearch(q),
    queryFn: () =>
      apiClient
        .get<InpatientSearchResult[]>(`/insurance/inpatients/search?q=${encodeURIComponent(q)}`)
        .then((e) => e.data),
    enabled: enabled && q.trim().length >= 2,
    staleTime: 30 * 1000,
  })
}

// ─── Mutation hooks ───────────────────────────────────────────────────────────

/**
 * Create an insurance company.
 * Endpoint: POST /insurance/companies
 * Permission: insurance:edit
 */
export function useCreateCompany(onSuccess?: () => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: InsuranceCompanyBody) =>
      apiClient.post("/insurance/companies", body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: insuranceKeys.companies() })
      toast.success("Insurance company added.")
      onSuccess?.()
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Failed to add company."
      toast.error(msg)
    },
  })
}

/**
 * Update an insurance company.
 * Endpoint: PATCH /insurance/companies/{id}
 * Permission: insurance:edit
 */
export function useUpdateCompany(onSuccess?: () => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: InsuranceCompanyBody }) =>
      apiClient.patch(`/insurance/companies/${id}`, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: insuranceKeys.companies() })
      toast.success("Company updated.")
      onSuccess?.()
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Failed to update company."
      toast.error(msg)
    },
  })
}

/**
 * Soft-delete an insurance company.
 * Endpoint: DELETE /insurance/companies/{id}
 * Permission: insurance:edit
 */
export function useDeleteCompany(onSuccess?: () => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/insurance/companies/${id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: insuranceKeys.companies() })
      toast.success("Company deactivated.")
      onSuccess?.()
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Failed to deactivate company."
      toast.error(msg)
    },
  })
}

/**
 * Create an insurance claim (linked to an inpatient).
 * Endpoint: POST /insurance/claims
 * Permission: insurance:create
 */
export function useCreateClaim(onSuccess?: (claimNumber: string) => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateInsuranceClaimBody) =>
      apiClient.post<{ claimNumber: string }>("/insurance/claims", body),
    onSuccess: (res) => {
      void qc.invalidateQueries({ queryKey: insuranceKeys.claims() })
      toast.success(`Claim ${res.data.claimNumber} created.`)
      onSuccess?.(res.data.claimNumber)
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Failed to create claim."
      toast.error(msg)
    },
  })
}

/**
 * Update insurance claim status — sends FULL field set (not just status).
 * The backend already accepts the full UpdateClaimStatusSchema which includes
 * notes, amount, rejectionReason, settlementReference, deductions.
 * Endpoint: PATCH /insurance/claims/{id}/status
 * Permission: insurance:edit
 */
export function useUpdateClaimStatus(claimId: string, onSuccess?: () => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: UpdateClaimStatusBody) =>
      apiClient.patch(`/insurance/claims/${claimId}/status`, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: insuranceKeys.claimDetail(claimId) })
      void qc.invalidateQueries({ queryKey: insuranceKeys.claims() })
      toast.success("Claim status updated.")
      onSuccess?.()
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Failed to update claim status."
      toast.error(msg)
    },
  })
}

/**
 * Update insurance claim financial/policy details.
 * Endpoint: PATCH /insurance/claims/{id}/details
 * Permission: insurance:edit
 */
export function useUpdateClaimDetails(claimId: string, onSuccess?: () => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: UpdateClaimDetailsBody) =>
      apiClient.patch(`/insurance/claims/${claimId}/details`, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: insuranceKeys.claimDetail(claimId) })
      void qc.invalidateQueries({ queryKey: insuranceKeys.claims() })
      toast.success("Claim details updated.")
      onSuccess?.()
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Failed to update claim details."
      toast.error(msg)
    },
  })
}

/**
 * Record a patient payment on an insurance claim.
 * Endpoint: POST /insurance/claims/{id}/payments
 * Permission: insurance:edit
 * Payment modes verified from InsuranceClaimDetail.tsx: Cash, UPI, Card, Bank Transfer, Cheque.
 */
export function useAddClaimPayment(claimId: string, onSuccess?: () => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: AddClaimPaymentBody) =>
      apiClient.post(`/insurance/claims/${claimId}/payments`, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: insuranceKeys.claimDetail(claimId) })
      void qc.invalidateQueries({ queryKey: insuranceKeys.claims() })
      toast.success("Patient payment recorded.")
      onSuccess?.()
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Failed to record payment."
      toast.error(msg)
    },
  })
}
