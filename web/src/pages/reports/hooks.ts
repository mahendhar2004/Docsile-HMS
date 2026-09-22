/**
 * reports/hooks.ts
 *
 * All data-fetching hooks for the reports module.
 *
 * Patient report hooks (all require reports:view):
 *   - usePatientSearch       — GET /reports/patients/search (cursor-based, useCursorQuery)
 *   - usePatientSummary      — GET /reports/patients/{id}/summary
 *   - usePatientVisits       — GET /reports/patients/{id}/visits
 *   - usePatientPrescriptions— GET /reports/patients/{id}/prescriptions
 *   - usePatientInpatient    — GET /reports/patients/{id}/inpatient
 *   - usePatientLabRecords   — GET /reports/patients/{id}/labs
 *   - usePatientBilling      — GET /reports/patients/{id}/billing
 *
 * Export hooks (all require data:export):
 *   - useExportData          — GET /reports/exports/{endpoint}
 *
 * NOTE: All /reports/patients/{patientId}/* endpoints take the Patient UUID
 * (Patient.id), not the sequential display patientId (Patient.patientId).
 * The service layer resolves the UUID to the display ID where needed for FK joins.
 */

import { useQuery } from "@tanstack/react-query"
import { useCursorQuery } from "@/hooks/usePaginatedQuery"
import { apiClient } from "@/lib/api-client"
import type {
  PatientSearchResult,
  PatientSummary,
  PatientVisit,
  PatientPrescription,
  InpatientRecord,
  LabRecord,
  BillingData,
  ExportEndpoint,
  ExportRow,
} from "./types"

// ─── Query key factory ────────────────────────────────────────────────────────

export const reportsKeys = {
  all: ["reports"] as const,
  patientSearch: (q: string) => [...reportsKeys.all, "patient-search", q] as const,
  patientSummary: (id: string) => [...reportsKeys.all, "summary", id] as const,
  patientVisits: (id: string) => [...reportsKeys.all, "visits", id] as const,
  patientPrescriptions: (id: string) =>
    [...reportsKeys.all, "prescriptions", id] as const,
  patientInpatient: (id: string) => [...reportsKeys.all, "inpatient", id] as const,
  patientLabs: (id: string) => [...reportsKeys.all, "labs", id] as const,
  patientBilling: (id: string) => [...reportsKeys.all, "billing", id] as const,
  export: (endpoint: ExportEndpoint, params: string) =>
    [...reportsKeys.all, "export", endpoint, params] as const,
} as const

// ─── Patient search (cursor-based) ───────────────────────────────────────────

/**
 * Cursor-based patient search for the reports autocomplete.
 * Uses useCursorQuery (useInfiniteQuery wrapper) as mandated by the module spec.
 * Only enabled when q.length >= 2 (matches old PatientSearch debounce guard).
 * Limit defaults to 8 matching the API's existing .limit(8) query.
 */
export function usePatientSearch(q: string, enabled = true) {
  return useCursorQuery<PatientSearchResult>({
    queryKey: reportsKeys.patientSearch(q),
    queryFn: (cursor, limit) =>
      apiClient.get<PatientSearchResult[]>(
        `/reports/patients/search?q=${encodeURIComponent(q)}&limit=${limit}${
          cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""
        }`,
      ),
    limit: 8,
    queryOptions: {
      enabled: enabled && q.length >= 2,
      staleTime: 30 * 1000,
    },
  })
}

// ─── Patient summary ──────────────────────────────────────────────────────────

/**
 * Fetch full patient summary (demographics + billing totals + inpatient flag).
 * @param patientId — Patient UUID (Patient.id), not the display patientId.
 */
export function usePatientSummary(patientId: string | null, enabled = true) {
  return useQuery({
    queryKey: reportsKeys.patientSummary(patientId ?? ""),
    queryFn: () =>
      apiClient
        .get<PatientSummary>(`/reports/patients/${patientId!}/summary`)
        .then((e) => e.data),
    enabled: enabled && patientId != null,
    staleTime: 60 * 1000,
  })
}

// ─── Patient visits ───────────────────────────────────────────────────────────

/**
 * Fetch all visits (prescriptions as visit records) for a patient.
 * @param patientId — Patient UUID.
 */
export function usePatientVisits(patientId: string | null, enabled = true) {
  return useQuery({
    queryKey: reportsKeys.patientVisits(patientId ?? ""),
    queryFn: () =>
      apiClient
        .get<PatientVisit[]>(`/reports/patients/${patientId!}/visits`)
        .then((e) => e.data),
    enabled: enabled && patientId != null,
    staleTime: 60 * 1000,
  })
}

// ─── Patient prescriptions ────────────────────────────────────────────────────

/**
 * Fetch all prescriptions with medicines + investigations for a patient.
 * @param patientId — Patient UUID.
 */
export function usePatientPrescriptions(patientId: string | null, enabled = true) {
  return useQuery({
    queryKey: reportsKeys.patientPrescriptions(patientId ?? ""),
    queryFn: () =>
      apiClient
        .get<PatientPrescription[]>(`/reports/patients/${patientId!}/prescriptions`)
        .then((e) => e.data),
    enabled: enabled && patientId != null,
    staleTime: 60 * 1000,
  })
}

// ─── Patient inpatient record ─────────────────────────────────────────────────

/**
 * Fetch inpatient record for a patient. Returns null when no admission exists.
 * @param patientId — Patient UUID (used directly as InPatient FK).
 */
export function usePatientInpatient(patientId: string | null, enabled = true) {
  return useQuery({
    queryKey: reportsKeys.patientInpatient(patientId ?? ""),
    queryFn: () =>
      apiClient
        .get<InpatientRecord | null>(`/reports/patients/${patientId!}/inpatient`)
        .then((e) => e.data),
    enabled: enabled && patientId != null,
    staleTime: 60 * 1000,
  })
}

// ─── Patient lab records ──────────────────────────────────────────────────────

/**
 * Fetch all lab bills + items + payments for a patient.
 * @param patientId — Patient UUID.
 */
export function usePatientLabRecords(patientId: string | null, enabled = true) {
  return useQuery({
    queryKey: reportsKeys.patientLabs(patientId ?? ""),
    queryFn: () =>
      apiClient
        .get<LabRecord[]>(`/reports/patients/${patientId!}/labs`)
        .then((e) => e.data),
    enabled: enabled && patientId != null,
    staleTime: 60 * 1000,
  })
}

// ─── Patient billing overview ─────────────────────────────────────────────────

/**
 * Fetch billing overview: OPD + lab + inpatient summaries and payment history.
 * @param patientId — Patient UUID.
 */
export function usePatientBilling(patientId: string | null, enabled = true) {
  return useQuery({
    queryKey: reportsKeys.patientBilling(patientId ?? ""),
    queryFn: () =>
      apiClient
        .get<BillingData>(`/reports/patients/${patientId!}/billing`)
        .then((e) => e.data),
    enabled: enabled && patientId != null,
    staleTime: 60 * 1000,
  })
}

// ─── Bulk export ──────────────────────────────────────────────────────────────

export interface ExportQueryParams {
  search?: string
  dateFrom?: string
  dateTo?: string
}

function buildExportUrl(endpoint: ExportEndpoint, params: ExportQueryParams): string {
  const parts: string[] = []
  if (params.dateFrom || params.dateTo) {
    // Use custom filter when date range is provided
    parts.push("filter=custom")
    if (params.dateFrom) parts.push(`customStart=${params.dateFrom}`)
    if (params.dateTo) parts.push(`customEnd=${params.dateTo}`)
  }
  if (params.search?.trim()) {
    parts.push(`search=${encodeURIComponent(params.search.trim())}`)
  }
  const qs = parts.length ? `?${parts.join("&")}` : ""
  return `/reports/exports/${endpoint}${qs}`
}

/**
 * Fetch export data for a given endpoint + filter params.
 * Rate-limited at 10 req/min per user (API-enforced).
 * Gated by data:export permission in the consuming component.
 */
export function useExportData(
  endpoint: ExportEndpoint,
  params: ExportQueryParams,
  enabled: boolean,
) {
  const paramsKey = JSON.stringify(params)
  return useQuery({
    queryKey: reportsKeys.export(endpoint, paramsKey),
    queryFn: () =>
      apiClient
        .get<ExportRow[]>(buildExportUrl(endpoint, params))
        .then((e) => e.data),
    enabled,
    staleTime: 0,    // always re-fetch when key changes
    gcTime: 5 * 60 * 1000,
  })
}
