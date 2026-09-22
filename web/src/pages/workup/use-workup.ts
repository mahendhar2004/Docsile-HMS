/**
 * workup/use-workup.ts — React Query hooks for the Workup module.
 *
 * Three hooks:
 *   useWorkupQueue      — GET /workup/queue
 *   useWorkupPatient    — GET /workup/patients/{id}
 *   useSaveEyeReading   — POST /workup/patients/{id}/eye-readings (upsert)
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import { toast } from "@/components/ui/sonner"
import type {
  EyeReadingPayload,
  EyeReadingRecord,
  WorkupPatient,
  WorkupQueuePatient,
} from "./types"

// ─── Query keys ──────────────────────────────────────────────────────────────

export const workupKeys = {
  all: ["workup"] as const,
  queue: () => [...workupKeys.all, "queue"] as const,
  patient: (patientId: string) => [...workupKeys.all, "patient", patientId] as const,
} as const

// ─── Hooks ───────────────────────────────────────────────────────────────────

/**
 * Fetches today's workup queue.
 * Returns patients sorted by appointment time (server-side).
 */
export function useWorkupQueue() {
  return useQuery({
    queryKey: workupKeys.queue(),
    queryFn: () =>
      apiClient
        .get<WorkupQueuePatient[]>("/workup/queue")
        .then((e) => e.data),
  })
}

/**
 * Fetches a single patient's data for the workup screen.
 * Includes today's eye readings and prescriptions (nested, filtered server-side).
 *
 * Only fires when patientId is non-null.
 */
export function useWorkupPatient(patientId: string | null) {
  return useQuery({
    queryKey: workupKeys.patient(patientId ?? ""),
    queryFn: () =>
      apiClient
        .get<WorkupPatient>(`/workup/patients/${patientId!}`)
        .then((e) => e.data),
    enabled: patientId != null,
  })
}

/**
 * Mutation: save (upsert) an eye reading for a patient.
 *
 * On success:
 *   - Invalidates the workup queue so the table reflects the new status
 *   - Invalidates the individual patient query so the sheet re-reads fresh data
 *   - Shows a success toast
 *
 * On error:
 *   - Shows an error toast with the server message
 */
export function useSaveEyeReading(patientId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: EyeReadingPayload) =>
      apiClient
        .post<EyeReadingRecord>(
          `/workup/patients/${patientId}/eye-readings`,
          payload,
        )
        .then((e) => e.data),

    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: workupKeys.queue() })
      void queryClient.invalidateQueries({
        queryKey: workupKeys.patient(patientId),
      })
      toast.success("Eye reading saved", {
        description: "The reading has been recorded for this patient.",
      })
    },

    onError: (err: unknown) => {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred."
      toast.error("Failed to save eye reading", { description: message })
    },
  })
}
