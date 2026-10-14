/**
 * settings/hooks.ts
 *
 * All TanStack Query hooks for the Settings module (33 endpoints across 10 sub-scopes).
 * Permissions: settings:view (all reads) and settings:edit (all writes).
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "@/components/ui/sonner"
import { apiClient } from "@/lib/api-client"
import type {
  ServiceTemplate,
  ServiceTemplateInput,
  HospitalProfile,
  HospitalProfileInput,
  PrescriptionTemplate,
  InpatientTemplate,
  PredefinedPackage,
  PredefinedSurgery,
  PredefinedDischarge,
  MedicineMaster,
  Doctor,
  DefaultPrintItem,
} from "./types"
import { parsePrintConfig } from "./types"

// ─── Query key factory ────────────────────────────────────────────────────────

export const settingsKeys = {
  all: ["settings"] as const,
  serviceTemplates: (includeInactive = false) => [...settingsKeys.all, "service-templates", includeInactive] as const,
  hospitalProfile: () => [...settingsKeys.all, "hospital-profile"] as const,
  printConfig: () => [...settingsKeys.all, "print-config"] as const,
  prescriptionTemplates: (includeInactive = false) => [...settingsKeys.all, "prescription-templates", includeInactive] as const,
  inpatientTemplates: (includeInactive = false) => [...settingsKeys.all, "inpatient-templates", includeInactive] as const,
  packages: (includeInactive = false) => [...settingsKeys.all, "packages", includeInactive] as const,
  surgeries: (includeInactive = false) => [...settingsKeys.all, "surgeries", includeInactive] as const,
  discharges: (includeInactive = false) => [...settingsKeys.all, "discharges", includeInactive] as const,
  medicineMaster: (includeInactive = false) => [...settingsKeys.all, "medicine-master", includeInactive] as const,
  doctors: (includeInactive = false) => [...settingsKeys.all, "doctors", includeInactive] as const,
} as const

// ─── Service Templates ────────────────────────────────────────────────────────

export function useServiceTemplates(includeInactive = false, enabled = true) {
  return useQuery({
    queryKey: settingsKeys.serviceTemplates(includeInactive),
    queryFn: () =>
      apiClient
        .get<ServiceTemplate[]>(`/settings/service-templates?includeInactive=${includeInactive}`)
        .then((e) => e.data),
    enabled,
    staleTime: 2 * 60 * 1000,
  })
}

export function useCreateServiceTemplate(onSuccess?: () => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: ServiceTemplateInput) =>
      apiClient.post("/settings/service-templates", body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...settingsKeys.all, "service-templates"] })
      toast.success("Service template created.")
      onSuccess?.()
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Failed to create service template.")
    },
  })
}

export function useUpdateServiceTemplate(id: string, onSuccess?: () => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Partial<ServiceTemplateInput>) =>
      apiClient.patch(`/settings/service-templates/${id}`, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...settingsKeys.all, "service-templates"] })
      toast.success("Service template updated.")
      onSuccess?.()
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Failed to update service template.")
    },
  })
}

export function useToggleServiceTemplateActive(onSuccess?: () => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiClient.patch(`/settings/service-templates/${id}`, { isActive }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...settingsKeys.all, "service-templates"] })
      onSuccess?.()
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Failed to update service template.")
    },
  })
}

export function useDeleteServiceTemplate(onSuccess?: () => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/settings/service-templates/${id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...settingsKeys.all, "service-templates"] })
      toast.success("Service template deleted.")
      onSuccess?.()
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Failed to delete service template.")
    },
  })
}

// ─── Hospital Profile ─────────────────────────────────────────────────────────

export function useHospitalProfile(enabled = true) {
  return useQuery({
    queryKey: settingsKeys.hospitalProfile(),
    queryFn: () =>
      apiClient.get<HospitalProfile>("/settings/hospital-profile").then((e) => e.data),
    enabled,
    staleTime: 5 * 60 * 1000,
  })
}

export function useUpdateHospitalProfile(onSuccess?: () => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: HospitalProfileInput) =>
      apiClient.patch("/settings/hospital-profile", body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: settingsKeys.hospitalProfile() })
      toast.success("Hospital profile updated.")
      onSuccess?.()
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Failed to update hospital profile.")
    },
  })
}

// ─── Print Config ─────────────────────────────────────────────────────────────

export function usePrintConfig(enabled = true) {
  return useQuery({
    queryKey: settingsKeys.printConfig(),
    queryFn: () =>
      apiClient.get<Record<string, unknown>>("/settings/print-config").then((e) => e.data),
    enabled,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Parsed, validated default-print items for the quick-print button —
 * cross-module convenience wrapper over usePrintConfig + parsePrintConfig
 * so callers outside Settings (Patients OPD table, Doctor consultation)
 * don't need to know the raw `/settings/print-config` response shape.
 */
export function useDefaultPrintConfig(enabled = true): {
  items: DefaultPrintItem[]
  isLoading: boolean
} {
  const { data, isLoading } = usePrintConfig(enabled)
  return { items: parsePrintConfig(data), isLoading }
}

export function useUpdatePrintConfig(onSuccess?: () => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiClient.patch("/settings/print-config", body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: settingsKeys.printConfig() })
      void qc.invalidateQueries({ queryKey: settingsKeys.hospitalProfile() })
      toast.success("Print defaults saved.")
      onSuccess?.()
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Failed to save print config.")
    },
  })
}

// ─── Nav Style ────────────────────────────────────────────────────────────────

export function useUpdateNavStyle(onSuccess?: () => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (navStyle: string) =>
      apiClient.patch("/settings/nav-style", { navStyle }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: settingsKeys.hospitalProfile() })
      toast.success("Navigation style updated — takes effect on next page load.")
      onSuccess?.()
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Failed to update nav style.")
    },
  })
}

// ─── Prescription Templates ───────────────────────────────────────────────────

export function usePrescriptionTemplates(includeInactive = false, enabled = true) {
  return useQuery({
    queryKey: settingsKeys.prescriptionTemplates(includeInactive),
    queryFn: () =>
      apiClient
        .get<PrescriptionTemplate[]>(`/settings/prescription-templates?includeInactive=${includeInactive}`)
        .then((e) => e.data),
    enabled,
    staleTime: 2 * 60 * 1000,
  })
}

export function useCreatePrescriptionTemplate(onSuccess?: () => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Omit<PrescriptionTemplate, "id" | "createdAt" | "updatedAt">) =>
      apiClient.post("/settings/prescription-templates", body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...settingsKeys.all, "prescription-templates"] })
      toast.success("Prescription template created.")
      onSuccess?.()
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Failed to create prescription template.")
    },
  })
}

export function useUpdatePrescriptionTemplate(id: string, onSuccess?: () => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Partial<Omit<PrescriptionTemplate, "id">>) =>
      apiClient.patch(`/settings/prescription-templates/${id}`, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...settingsKeys.all, "prescription-templates"] })
      toast.success("Prescription template updated.")
      onSuccess?.()
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Failed to update prescription template.")
    },
  })
}

export function useTogglePrescriptionTemplateActive(onSuccess?: () => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiClient.patch(`/settings/prescription-templates/${id}`, { isActive }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...settingsKeys.all, "prescription-templates"] })
      onSuccess?.()
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Failed to update prescription template.")
    },
  })
}

export function useDeletePrescriptionTemplate(onSuccess?: () => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/settings/prescription-templates/${id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...settingsKeys.all, "prescription-templates"] })
      toast.success("Prescription template deleted.")
      onSuccess?.()
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Failed to delete prescription template.")
    },
  })
}

// ─── Inpatient Templates ──────────────────────────────────────────────────────

export function useInpatientTemplates(includeInactive = false, enabled = true) {
  return useQuery({
    queryKey: settingsKeys.inpatientTemplates(includeInactive),
    queryFn: () =>
      apiClient
        .get<InpatientTemplate[]>(`/settings/inpatient-templates?includeInactive=${includeInactive}`)
        .then((e) => e.data),
    enabled,
    staleTime: 2 * 60 * 1000,
  })
}

export function useCreateInpatientTemplate(onSuccess?: () => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Omit<InpatientTemplate, "id">) =>
      apiClient.post("/settings/inpatient-templates", body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...settingsKeys.all, "inpatient-templates"] })
      toast.success("Inpatient template created.")
      onSuccess?.()
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Failed to create inpatient template.")
    },
  })
}

export function useUpdateInpatientTemplate(id: string, onSuccess?: () => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Partial<Omit<InpatientTemplate, "id">>) =>
      apiClient.patch(`/settings/inpatient-templates/${id}`, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...settingsKeys.all, "inpatient-templates"] })
      toast.success("Inpatient template updated.")
      onSuccess?.()
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Failed to update inpatient template.")
    },
  })
}

// Main's own toggle (src/app/(hospital)/settings/components/SettingsPage.tsx
// `updateInpatientTemplate(tmpl.id, { isActive: !tmpl.isActive })`) has no
// equivalent UI here — this port's Inpatient Templates tab had no Deactivate/
// Activate button at all, even though the backend's updateInpatientTemplate
// already fully supports isActive. Added to match.
export function useToggleInpatientTemplateActive(onSuccess?: () => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiClient.patch(`/settings/inpatient-templates/${id}`, { isActive }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...settingsKeys.all, "inpatient-templates"] })
      onSuccess?.()
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Failed to update inpatient template.")
    },
  })
}

export function useDeleteInpatientTemplate(onSuccess?: () => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/settings/inpatient-templates/${id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...settingsKeys.all, "inpatient-templates"] })
      toast.success("Inpatient template deleted.")
      onSuccess?.()
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Failed to delete inpatient template.")
    },
  })
}

// ─── Packages ─────────────────────────────────────────────────────────────────

export function usePackages(includeInactive = false, enabled = true) {
  return useQuery({
    queryKey: settingsKeys.packages(includeInactive),
    queryFn: () =>
      apiClient
        .get<PredefinedPackage[]>(`/settings/packages?includeInactive=${includeInactive}`)
        .then((e) => e.data),
    enabled,
    staleTime: 2 * 60 * 1000,
  })
}

export function useCreatePackage(onSuccess?: () => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Omit<PredefinedPackage, "id">) =>
      apiClient.post("/settings/packages", body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...settingsKeys.all, "packages"] })
      toast.success("Package created.")
      onSuccess?.()
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Failed to create package.")
    },
  })
}

/**
 * Toggles a package's isActive flag — main's PackagesTab lets admins click
 * the Status badge directly rather than going through the edit dialog.
 */
export function useTogglePackageActive(onSuccess?: () => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiClient.patch(`/settings/packages/${id}`, { isActive }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...settingsKeys.all, "packages"] })
      onSuccess?.()
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Failed to update package.")
    },
  })
}

export function useUpdatePackage(id: string, onSuccess?: () => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Partial<Omit<PredefinedPackage, "id">>) =>
      apiClient.patch(`/settings/packages/${id}`, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...settingsKeys.all, "packages"] })
      toast.success("Package updated.")
      onSuccess?.()
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Failed to update package.")
    },
  })
}

export function useDeletePackage(onSuccess?: () => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/settings/packages/${id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...settingsKeys.all, "packages"] })
      toast.success("Package deleted.")
      onSuccess?.()
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Failed to delete package.")
    },
  })
}

// ─── Surgeries ────────────────────────────────────────────────────────────────

export function useSurgeries(includeInactive = false, enabled = true) {
  return useQuery({
    queryKey: settingsKeys.surgeries(includeInactive),
    queryFn: () =>
      apiClient
        .get<PredefinedSurgery[]>(`/settings/surgeries?includeInactive=${includeInactive}`)
        .then((e) => e.data),
    enabled,
    staleTime: 2 * 60 * 1000,
  })
}

export function useCreateSurgery(onSuccess?: () => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Omit<PredefinedSurgery, "id">) =>
      apiClient.post("/settings/surgeries", body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...settingsKeys.all, "surgeries"] })
      toast.success("Surgery template created.")
      onSuccess?.()
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Failed to create surgery template.")
    },
  })
}

export function useUpdateSurgery(id: string, onSuccess?: () => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Partial<Omit<PredefinedSurgery, "id">>) =>
      apiClient.patch(`/settings/surgeries/${id}`, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...settingsKeys.all, "surgeries"] })
      toast.success("Surgery template updated.")
      onSuccess?.()
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Failed to update surgery template.")
    },
  })
}

export function useDeleteSurgery(onSuccess?: () => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/settings/surgeries/${id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...settingsKeys.all, "surgeries"] })
      toast.success("Surgery template deleted.")
      onSuccess?.()
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Failed to delete surgery template.")
    },
  })
}

// ─── Discharges ───────────────────────────────────────────────────────────────

export function useDischarges(includeInactive = false, enabled = true) {
  return useQuery({
    queryKey: settingsKeys.discharges(includeInactive),
    queryFn: () =>
      apiClient
        .get<PredefinedDischarge[]>(`/settings/discharges?includeInactive=${includeInactive}`)
        .then((e) => e.data),
    enabled,
    staleTime: 2 * 60 * 1000,
  })
}

export function useCreateDischarge(onSuccess?: () => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Omit<PredefinedDischarge, "id">) =>
      apiClient.post("/settings/discharges", body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...settingsKeys.all, "discharges"] })
      toast.success("Discharge template created.")
      onSuccess?.()
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Failed to create discharge template.")
    },
  })
}

export function useUpdateDischarge(id: string, onSuccess?: () => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Partial<Omit<PredefinedDischarge, "id">>) =>
      apiClient.patch(`/settings/discharges/${id}`, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...settingsKeys.all, "discharges"] })
      toast.success("Discharge template updated.")
      onSuccess?.()
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Failed to update discharge template.")
    },
  })
}

export function useDeleteDischarge(onSuccess?: () => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/settings/discharges/${id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...settingsKeys.all, "discharges"] })
      toast.success("Discharge template deleted.")
      onSuccess?.()
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Failed to delete discharge template.")
    },
  })
}

// ─── Medicine Master ──────────────────────────────────────────────────────────

export function useMedicineMaster(includeInactive = false, enabled = true) {
  return useQuery({
    queryKey: settingsKeys.medicineMaster(includeInactive),
    queryFn: () =>
      apiClient
        .get<MedicineMaster[]>(`/settings/medicine-master?includeInactive=${includeInactive}`)
        .then((e) => e.data),
    enabled,
    staleTime: 2 * 60 * 1000,
  })
}

export function useCreateMedicineMaster(onSuccess?: () => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Omit<MedicineMaster, "id">) =>
      apiClient.post("/settings/medicine-master", body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...settingsKeys.all, "medicine-master"] })
      toast.success("Medicine added.")
      onSuccess?.()
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Failed to add medicine.")
    },
  })
}

export function useUpdateMedicineMaster(id: string, onSuccess?: () => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Partial<Omit<MedicineMaster, "id">>) =>
      apiClient.patch(`/settings/medicine-master/${id}`, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...settingsKeys.all, "medicine-master"] })
      toast.success("Medicine updated.")
      onSuccess?.()
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Failed to update medicine.")
    },
  })
}

export function useToggleMedicineMasterActive(onSuccess?: () => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiClient.patch(`/settings/medicine-master/${id}`, { isActive }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...settingsKeys.all, "medicine-master"] })
      onSuccess?.()
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Failed to update medicine.")
    },
  })
}

export function useDeleteMedicineMaster(onSuccess?: () => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/settings/medicine-master/${id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...settingsKeys.all, "medicine-master"] })
      toast.success("Medicine deleted.")
      onSuccess?.()
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Failed to delete medicine.")
    },
  })
}

// ─── Doctor ────────────────────────────────────────────────────────────────────
// Net-new master entity (migration 20260922070000) — replaces the old
// DropdownOption(fieldName="doctorName") free-text list as the real source
// of truth for "doctor name" everywhere it's picked app-wide (Patient
// Registration, IPD Admission, Predefined Surgeries below).

export function useDoctors(includeInactive = false, enabled = true) {
  return useQuery({
    queryKey: settingsKeys.doctors(includeInactive),
    queryFn: () =>
      apiClient
        .get<Doctor[]>(`/settings/doctors?includeInactive=${includeInactive}`)
        .then((e) => e.data),
    enabled,
    staleTime: 2 * 60 * 1000,
  })
}

export function useCreateDoctor(onSuccess?: () => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Omit<Doctor, "id" | "isActive">) =>
      apiClient.post("/settings/doctors", body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...settingsKeys.all, "doctors"] })
      toast.success("Doctor added.")
      onSuccess?.()
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Failed to add doctor.")
    },
  })
}

export function useUpdateDoctor(id: string, onSuccess?: () => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Partial<Omit<Doctor, "id">>) =>
      apiClient.patch(`/settings/doctors/${id}`, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...settingsKeys.all, "doctors"] })
      toast.success("Doctor updated.")
      onSuccess?.()
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Failed to update doctor.")
    },
  })
}

export function useToggleDoctorActive(onSuccess?: () => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiClient.patch(`/settings/doctors/${id}`, { isActive }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...settingsKeys.all, "doctors"] })
      onSuccess?.()
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Failed to update doctor.")
    },
  })
}

export function useDeleteDoctor(onSuccess?: () => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/settings/doctors/${id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...settingsKeys.all, "doctors"] })
      toast.success("Doctor deleted.")
      onSuccess?.()
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Failed to delete doctor.")
    },
  })
}

