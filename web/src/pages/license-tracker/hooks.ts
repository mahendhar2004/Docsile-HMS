/**
 * License Tracker — TanStack Query hooks.
 *
 * Endpoints consumed (from .sde/schemas/openapi.yaml /license-tracker/* paths):
 *   GET    /license-tracker              → License[]  (licenses:view)
 *   POST   /license-tracker              → License    (licenses:create)
 *   PATCH  /license-tracker/{id}         → void       (licenses:edit)
 *   DELETE /license-tracker/{id}         → void       (licenses:delete)
 *   PATCH  /license-tracker/{id}/document → void      (licenses:edit)  body: { documentUrl }
 *   DELETE /license-tracker/{id}/document → void      (licenses:edit)  server handles storage
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { CreateLicenseBody, License, UpdateLicenseBody } from "./types"

// ─── Query key factory ────────────────────────────────────────────────────────

const QK = {
  list: () => ["license-tracker"] as const,
} as const

// ─── Queries ──────────────────────────────────────────────────────────────────

/**
 * GET /license-tracker — all licenses ordered by expiry date.
 * x-permission: licenses:view
 */
export function useLicenses(enabled = true) {
  return useQuery({
    queryKey: QK.list(),
    queryFn: () =>
      apiClient.get<License[]>("/license-tracker").then((e) => e.data),
    enabled,
  })
}

// ─── Mutations ────────────────────────────────────────────────────────────────

/**
 * POST /license-tracker — create a license.
 * x-permission: licenses:create
 */
export function useCreateLicense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateLicenseBody) =>
      apiClient.post<License>("/license-tracker", body).then((e) => e.data),
    onSuccess: () => void qc.invalidateQueries({ queryKey: QK.list() }),
  })
}

/**
 * PATCH /license-tracker/{id} — update a license.
 * x-permission: licenses:edit
 */
export function useUpdateLicense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateLicenseBody }) =>
      apiClient.patch<void>(`/license-tracker/${id}`, body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: QK.list() }),
  })
}

/**
 * DELETE /license-tracker/{id} — delete a license record.
 * x-permission: licenses:delete
 */
export function useDeleteLicense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiClient.delete<void>(`/license-tracker/${id}`),
    onSuccess: () => void qc.invalidateQueries({ queryKey: QK.list() }),
  })
}

/**
 * PATCH /license-tracker/{id}/document — persist the public URL after
 * the client has uploaded the file to Supabase Storage.
 * x-permission: licenses:edit
 */
export function useSaveDocumentUrl() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, documentUrl }: { id: string; documentUrl: string }) =>
      apiClient.patch<void>(`/license-tracker/${id}/document`, { documentUrl }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: QK.list() }),
  })
}

/**
 * DELETE /license-tracker/{id}/document — remove the document.
 * The server derives the Storage path from the current documentUrl and
 * deletes both the Storage object and clears the DB reference.
 * x-permission: licenses:edit
 */
export function useRemoveDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete<void>(`/license-tracker/${id}/document`),
    onSuccess: () => void qc.invalidateQueries({ queryKey: QK.list() }),
  })
}
