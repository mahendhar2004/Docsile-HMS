/**
 * labs/hooks.ts
 *
 * Query + mutation hooks for the labs module.
 *
 * Permissions per OpenAPI x-permission:
 *   labs:view   — all GET endpoints (labs, investigations, bills, patient investigations, pending)
 *   labs:config — POST/PATCH/DELETE /labs/labs, POST /labs/investigations, PUT lab investigations
 *   labs:create — POST /labs/bills
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "@/components/ui/sonner"
import { apiClient } from "@/lib/api-client"
import { usePaginatedQuery } from "@/hooks/usePaginatedQuery"
import type {
  Lab,
  LabWithInvestigations,
  InvestigationMaster,
  LabInvestigationMapping,
  PatientInvestigationsResponse,
  PendingPatient,
  LabBillRow,
  LabBillDetailData,
  CreateLabBillsBody,
} from "./types"

// ─── Query key factory ───────────────────────────────────────────────────────

export const labsKeys = {
  all: ["labs"] as const,
  // Labs
  labs: () => [...labsKeys.all, "labs"] as const,
  labList: () => [...labsKeys.labs(), "list"] as const,
  labById: (id: string) => [...labsKeys.labs(), "detail", id] as const,
  labInvestigations: (labId: string) =>
    [...labsKeys.labs(), "lab-investigations", labId] as const,
  // Investigation master
  investigations: () => [...labsKeys.all, "investigations"] as const,
  investigationList: () => [...labsKeys.investigations(), "list"] as const,
  // Patient investigations
  patientInvestigations: (patientId: string) =>
    [...labsKeys.all, "patient-investigations", patientId] as const,
  // Pending
  pending: (date: string) => [...labsKeys.all, "pending", date] as const,
  // Bills
  bills: () => [...labsKeys.all, "bills"] as const,
  billList: (date: string | null) =>
    [...labsKeys.bills(), "list", date ?? "all"] as const,
  billDetail: (id: string) => [...labsKeys.bills(), "detail", id] as const,
} as const

// ─── Lab list ────────────────────────────────────────────────────────────────

/**
 * GET /labs/labs — list all labs.
 * x-permission: labs:view
 */
export function useLabsList(enabled = true) {
  return useQuery({
    queryKey: labsKeys.labList(),
    queryFn: () =>
      apiClient.get<Lab[]>("/labs/labs").then((e) => e.data),
    enabled,
  })
}

/**
 * GET /labs/labs/{id} — lab detail with investigation mappings.
 * x-permission: labs:view
 */
export function useLabById(id: string | null, enabled = true) {
  return useQuery({
    queryKey: labsKeys.labById(id ?? ""),
    queryFn: () =>
      apiClient
        .get<LabWithInvestigations>(`/labs/labs/${id!}`)
        .then((e) => e.data),
    enabled: enabled && id != null,
  })
}

/**
 * GET /labs/labs/{labId}/investigations — investigations assigned to a lab.
 * Returns InvestigationMaster[] per OpenAPI; actual shape may include
 * amount/isDefault from the join — use useLabById for full mapping data.
 * x-permission: labs:view
 */
export function useLabInvestigations(labId: string | null, enabled = true) {
  return useQuery({
    queryKey: labsKeys.labInvestigations(labId ?? ""),
    queryFn: () =>
      apiClient
        .get<InvestigationMaster[]>(`/labs/labs/${labId!}/investigations`)
        .then((e) => e.data),
    enabled: enabled && labId != null,
  })
}

// ─── Lab mutations ───────────────────────────────────────────────────────────

/**
 * POST /labs/labs — create a lab.
 * x-permission: labs:config
 */
export function useCreateLab(onSuccess?: () => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Omit<Lab, "id" | "sortOrder">) =>
      apiClient.post<Lab>("/labs/labs", body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: labsKeys.labList() })
      toast.success("Lab created.")
      onSuccess?.()
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Failed to create lab.")
    },
  })
}

/**
 * PATCH /labs/labs/{id} — update a lab.
 * x-permission: labs:config
 */
export function useUpdateLab(id: string, onSuccess?: () => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Partial<Omit<Lab, "id">>) =>
      apiClient.patch<Lab>(`/labs/labs/${id}`, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: labsKeys.labList() })
      void qc.invalidateQueries({ queryKey: labsKeys.labById(id) })
      toast.success("Lab updated.")
      onSuccess?.()
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Failed to update lab.")
    },
  })
}

/**
 * DELETE /labs/labs/{id} — soft-delete a lab.
 * x-permission: labs:config
 */
export function useDeleteLab(onSuccess?: () => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/labs/labs/${id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: labsKeys.labList() })
      toast.success("Lab deleted.")
      onSuccess?.()
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Failed to delete lab.")
    },
  })
}

/**
 * PUT /labs/labs/{labId}/investigations — replace all investigation assignments.
 *
 * Request body: { investigations: { investigationId, amount, isDefault }[] }
 *
 * This is a replace-all operation — the backend removes existing links and
 * creates new ones carrying per-investigation pricing and default flags.
 *
 * Shape verified against:
 *   - openapi.yaml (corrected post-Phase-5 description)
 *   - supabase/functions/labs/types.ts UpdateLabInvestigationsSchema
 *   - src/app/(hospital)/labs/components/LabInvestigationConfig.tsx (handleSave)
 *
 * x-permission: labs:config
 */
export function useUpdateLabInvestigations(
  labId: string,
  onSuccess?: () => void,
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (investigations: LabInvestigationMapping[]) =>
      apiClient.put(`/labs/labs/${labId}/investigations`, { investigations }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: labsKeys.labById(labId) })
      void qc.invalidateQueries({
        queryKey: labsKeys.labInvestigations(labId),
      })
      toast.success("Investigation mappings saved.")
      onSuccess?.()
    },
    onError: (err: unknown) => {
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to save investigation mappings.",
      )
    },
  })
}

// ─── Investigation master ────────────────────────────────────────────────────

/**
 * GET /labs/investigations — all investigation master records.
 * x-permission: labs:view
 */
export function useInvestigationsList(enabled = true) {
  return useQuery({
    queryKey: labsKeys.investigationList(),
    queryFn: () =>
      apiClient
        .get<InvestigationMaster[]>("/labs/investigations")
        .then((e) => e.data),
    enabled,
    staleTime: 5 * 60 * 1000, // 5 min — master data changes rarely
  })
}

/**
 * POST /labs/investigations — create an investigation master record.
 * x-permission: labs:config
 */
export function useCreateInvestigation(onSuccess?: () => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { name: string; category?: string | null }) =>
      apiClient.post<InvestigationMaster>("/labs/investigations", body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: labsKeys.investigationList() })
      toast.success("Investigation added.")
      onSuccess?.()
    },
    onError: (err: unknown) => {
      toast.error(
        err instanceof Error ? err.message : "Failed to add investigation.",
      )
    },
  })
}

// ─── Patient investigations ──────────────────────────────────────────────────

/**
 * GET /labs/patients/{patientId}/investigations
 * Returns patient info, prescription, lab groups, unassigned investigations,
 * and existing bills for that prescription.
 * Only fires when patientId is non-null.
 * x-permission: labs:view
 */
export function usePatientInvestigations(patientId: string | null) {
  return useQuery({
    queryKey: labsKeys.patientInvestigations(patientId ?? ""),
    queryFn: () =>
      apiClient
        .get<PatientInvestigationsResponse>(
          `/labs/patients/${patientId!}/investigations`,
        )
        .then((e) => e.data),
    enabled: patientId != null,
    // Don't cache stale patient data — always refetch when switching patients
    staleTime: 0,
  })
}

// ─── Pending investigations ──────────────────────────────────────────────────

/**
 * GET /labs/pending-investigations — patients with ordered but unresulted
 * lab investigations for a given date.
 * x-permission: labs:view
 */
export function usePendingInvestigations(date: string, enabled = true) {
  return useQuery({
    queryKey: labsKeys.pending(date),
    queryFn: () =>
      apiClient
        .get<PendingPatient[]>(
          `/labs/pending-investigations?date=${date}`,
        )
        .then((e) => e.data),
    enabled,
  })
}

// ─── Lab bills ───────────────────────────────────────────────────────────────

/**
 * GET /labs/bills?page=N&pageSize=N&date=YYYY-MM-DD — paginated lab bills.
 * x-permission: labs:view
 */
export function useLabBills(date: string | null) {
  const dateParam = date ? `&date=${date}` : ""
  return usePaginatedQuery<LabBillRow>({
    queryKey: labsKeys.billList(date),
    queryFn: ({ page, pageSize }) =>
      apiClient.get<LabBillRow[]>(
        `/labs/bills?page=${page}&pageSize=${pageSize}${dateParam}`,
      ),
    initialPageSize: 25,
  })
}

/**
 * GET /labs/bills/{id} — single lab bill with items and payments.
 * x-permission: labs:view
 */
export function useLabBillDetail(id: string | null, enabled = true) {
  return useQuery({
    queryKey: labsKeys.billDetail(id ?? ""),
    queryFn: () =>
      apiClient
        .get<LabBillDetailData>(`/labs/bills/${id!}`)
        .then((e) => e.data),
    enabled: enabled && id != null,
  })
}

/**
 * POST /labs/bills — create one or more lab bills in one request.
 * Request body: { bills: [{ bill, items, payment? }] }
 * x-permission: labs:create
 */
export function useCreateLabBills(onSuccess?: (data: unknown) => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateLabBillsBody) =>
      apiClient.post("/labs/bills", body).then((e) => e.data),
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: labsKeys.bills() })
      toast.success("Lab bill(s) created.")
      onSuccess?.(data)
    },
    onError: (err: unknown) => {
      toast.error(
        err instanceof Error ? err.message : "Failed to create lab bill(s).",
      )
    },
  })
}
