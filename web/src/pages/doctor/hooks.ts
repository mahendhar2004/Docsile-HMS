/**
 * doctor/hooks.ts
 *
 * All data-fetching and mutation hooks for the doctor module.
 *
 * Query hooks:
 *   - useDoctorQueue     — GET /doctor/queue (today's patients)
 *   - useConsultation    — GET /doctor/patients/{id}/consultation
 *   - useReferenceData   — GET /doctor/reference-data (medicines, investigations, templates, dropdowns)
 *
 * Mutation hooks:
 *   - useSavePrescription    — POST /doctor/patients/{id}/prescriptions (upsert)
 *   - useCreateMedicine      — POST /doctor/medicines
 *   - useAddDropdownOption   — POST /doctor/dropdown-options
 *   - useAskSitha            — POST /doctor/ai/ask
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type {
  DoctorQueuePatient,
  ConsultationPatient,
  ReferenceData,
  SavePrescriptionBody,
  PrescriptionRecord,
  MedicineMasterRecord,
  CreateMedicineBody,
  AddDropdownOptionBody,
  AskSithaBody,
  AskSithaResponse,
} from "./types"

// ─── Query key factory ────────────────────────────────────────────────────────

export const doctorKeys = {
  all: ["doctor"] as const,
  queue: () => [...doctorKeys.all, "queue"] as const,
  consultation: (id: string) => [...doctorKeys.all, "consultation", id] as const,
  referenceData: () => [...doctorKeys.all, "reference-data"] as const,
} as const

// ─── Query hooks ──────────────────────────────────────────────────────────────

/**
 * Today's doctor queue (all OPD patients visible from the doctor view).
 * Endpoint: GET /doctor/queue
 * Permission: doctor:view
 */
export function useDoctorQueue(enabled = true) {
  return useQuery({
    queryKey: doctorKeys.queue(),
    queryFn: () =>
      apiClient
        .get<DoctorQueuePatient[]>("/doctor/queue")
        .then((e) => e.data),
    enabled,
    refetchInterval: 30_000, // soft-poll every 30s
    staleTime: 10_000,
  })
}

/**
 * Full consultation data for a specific patient.
 * Endpoint: GET /doctor/patients/{id}/consultation
 * Permission: doctor:view
 */
export function useConsultation(patientId: string | null, enabled = true) {
  return useQuery({
    queryKey: doctorKeys.consultation(patientId ?? ""),
    queryFn: () =>
      apiClient
        .get<ConsultationPatient>(`/doctor/patients/${patientId!}/consultation`)
        .then((e) => e.data),
    enabled: enabled && patientId != null,
    staleTime: 30_000,
  })
}

/**
 * Bundled reference data for the prescription form.
 * Endpoint: GET /doctor/reference-data
 * Permission: doctor:view
 */
export function useReferenceData(enabled = true) {
  return useQuery({
    queryKey: doctorKeys.referenceData(),
    queryFn: () =>
      apiClient.get<ReferenceData>("/doctor/reference-data").then((e) => e.data),
    enabled,
    staleTime: 10 * 60 * 1000, // reference data changes rarely
  })
}

// ─── Mutation hooks ───────────────────────────────────────────────────────────

/**
 * Save/upsert prescription for a patient.
 * Endpoint: POST /doctor/patients/{patientId}/prescriptions
 * Permission: doctor:consult
 */
export function useSavePrescription(
  patientId: string,
  onSuccess?: (prescription: PrescriptionRecord) => void,
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: SavePrescriptionBody) =>
      apiClient
        .post<PrescriptionRecord>(
          `/doctor/patients/${patientId}/prescriptions`,
          body,
        )
        .then((e) => e.data),
    onSuccess: (prescription) => {
      void qc.invalidateQueries({ queryKey: doctorKeys.queue() })
      void qc.invalidateQueries({ queryKey: doctorKeys.consultation(patientId) })
      onSuccess?.(prescription)
    },
  })
}

/**
 * Create a new medicine from the doctor workflow.
 * Endpoint: POST /doctor/medicines
 * Permission: doctor:consult
 */
export function useCreateMedicine(
  onSuccess?: (medicine: MedicineMasterRecord) => void,
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateMedicineBody) =>
      apiClient
        .post<MedicineMasterRecord>("/doctor/medicines", body)
        .then((e) => e.data),
    onSuccess: (medicine) => {
      // Refresh the reference data so the new medicine appears in the dropdown.
      void qc.invalidateQueries({ queryKey: doctorKeys.referenceData() })
      onSuccess?.(medicine)
    },
  })
}

/**
 * Add a doctor-scoped dropdown option (idempotent on the server side).
 * Endpoint: POST /doctor/dropdown-options
 * Permission: doctor:consult
 */
export function useAddDropdownOption(onSuccess?: () => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: AddDropdownOptionBody) =>
      apiClient.post("/doctor/dropdown-options", body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: doctorKeys.referenceData() })
      onSuccess?.()
    },
  })
}

/**
 * Ask Sitha AI (Gemini-backed clinical/analytics assistant).
 * Endpoint: POST /doctor/ai/ask
 * Permission: doctor:consult
 *
 * This is a plain useMutation — conversation history is managed by the
 * calling component.
 */
export function useAskSitha() {
  return useMutation({
    mutationFn: (body: AskSithaBody) =>
      apiClient
        .post<AskSithaResponse>("/doctor/ai/ask", body)
        .then((e) => e.data),
  })
}
