/**
 * patient-care/hooks.ts
 *
 * All data-fetching hooks for the patient-care module.
 *
 * Query hooks:
 *   - useOpdPatients       — offset-paginated list of patients by date
 *   - useIpdInPatients     — offset-paginated inpatient list by date/status
 *   - usePatientDetail     — single patient by ID
 *   - useInPatientDetail   — single inpatient by ID
 *   - usePatientSearch     — debounced autocomplete (plain useQuery, NOT useCursorQuery)
 *   - useDropdownOptions   — dropdown reference data for a field
 *   - useRegistrationForm  — form reference data (service templates, patient types)
 *   - useAdmissionForm     — form reference data (wards, doctors)
 *   - useNextPatientId     — preview the next patient ID
 *   - useNextIpNumber      — preview the next IP number
 *
 * Mutation hooks (return TanStack useMutation result):
 *   - useCreatePatient
 *   - useUpdatePatient
 *   - useDeletePatient
 *   - useUpdatePatientStatus
 *   - useMovePatientDate
 *   - useCreateInPatient
 *   - useUpdateInPatient
 *   - useDeleteInPatient
 *   - useUpdateInPatientStatus
 *   - useAddService
 *   - useCreatePrescriptionWithBilling
 *   - useAddDropdownOption
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import { usePaginatedQuery } from "@/hooks/usePaginatedQuery"
import type {
  Patient,
  InPatient,
  DropdownOption,
  PatientSearchData,
  NextPatientIdData,
  NextIpNumberData,
  RegistrationFormData,
  AdmissionFormData,
  CreatePatientBody,
  UpdatePatientBody,
  UpdatePatientStatusBody,
  MovePatientDateBody,
  CreateInPatientBody,
  UpdateInPatientStatusBody,
  UpdateInPatientBasicInfoBody,
  AddServiceBody,
  CreatePrescriptionWithBillingBody,
  CreatePrescriptionWithBillingResponse,
  PatientReceiptData,
} from "./types"

// ─── Query key factory ────────────────────────────────────────────────────────

export const patientCareKeys = {
  all: ["patient-care"] as const,
  patients: () => [...patientCareKeys.all, "patients"] as const,
  patientList: (date: string) => [...patientCareKeys.patients(), "list", date] as const,
  patientDetail: (id: string) => [...patientCareKeys.patients(), "detail", id] as const,
  patientSearch: (q: string) => [...patientCareKeys.patients(), "search", q] as const,
  inpatients: () => [...patientCareKeys.all, "inpatients"] as const,
  inpatientList: (date: string | null, status: string | null) =>
    [...patientCareKeys.inpatients(), "list", date, status] as const,
  inpatientDetail: (id: string) => [...patientCareKeys.inpatients(), "detail", id] as const,
  dropdownOptions: (fieldName?: string) =>
    [...patientCareKeys.all, "dropdown-options", fieldName ?? "all"] as const,
  registrationForm: () => [...patientCareKeys.all, "registration-form"] as const,
  admissionForm: () => [...patientCareKeys.all, "admission-form"] as const,
  nextPatientId: () => [...patientCareKeys.all, "next-patient-id"] as const,
  nextIpNumber: () => [...patientCareKeys.all, "next-ip-number"] as const,
  receipt: (id: string) => [...patientCareKeys.patients(), "receipt", id] as const,
} as const

// ─── Query hooks ──────────────────────────────────────────────────────────────

/**
 * Offset-paginated OPD patient list for a specific appointment date, with an
 * optional server-side search filter — matches main's PatientsPage, whose
 * "Search by ID, name, phone..." box re-fetches the whole day's list scoped
 * to the search term (ilike across patientId/phone/firstName/lastName).
 * Endpoint: GET /patient-care/patients?date=YYYY-MM-DD&search=&page=N&pageSize=N
 */
export function useOpdPatients(date: string, search = "") {
  return usePaginatedQuery<Patient>({
    queryKey: [...patientCareKeys.patientList(date), search],
    queryFn: ({ page, pageSize }) =>
      apiClient.get<Patient[]>(
        `/patient-care/patients?date=${date}&page=${page}&pageSize=${pageSize}${
          search ? `&search=${encodeURIComponent(search)}` : ""
        }`,
      ),
    initialPageSize: 50,
  })
}

/**
 * Full (unpaginated, single-page-of-many) OPD patient list for a date, used
 * only to compute the header's Stats modal (counts + revenue breakdown) —
 * matches main's PatientsPage, which keeps the whole day's (possibly
 * search-filtered) patients in state and reduces over them directly, so a
 * search active on the OPD table also scopes the Stats modal. Disabled
 * until the modal opens, so it doesn't cost an extra request on every page
 * load.
 */
export function useOpdPatientsStats(date: string, enabled: boolean, search = "") {
  return useQuery({
    queryKey: [...patientCareKeys.patientList(date), "stats", search],
    queryFn: () =>
      apiClient
        .get<Patient[]>(
          `/patient-care/patients?date=${date}&page=1&pageSize=1000${
            search ? `&search=${encodeURIComponent(search)}` : ""
          }`,
        )
        .then((res) => res.data),
    enabled,
  })
}

/**
 * Offset-paginated inpatient list, optionally filtered by date and/or status.
 * Endpoint: GET /patient-care/inpatients?date=YYYY-MM-DD&status=admitted|discharged&page=N&pageSize=N
 */
export function useIpdInPatients(
  date: string | null,
  status: string | null,
  recentDischargesOnly = false,
  search = "",
) {
  const params = new URLSearchParams()
  if (date) params.set("date", date)
  if (status) params.set("status", status)
  if (recentDischargesOnly) params.set("recentDischargesOnly", "true")
  if (search) params.set("search", search)

  return usePaginatedQuery<InPatient>({
    queryKey: [...patientCareKeys.inpatientList(date, status), recentDischargesOnly, search],
    queryFn: ({ page, pageSize }) => {
      const qp = new URLSearchParams(params)
      qp.set("page", String(page))
      qp.set("pageSize", String(pageSize))
      return apiClient.get<InPatient[]>(`/patient-care/inpatients?${qp.toString()}`)
    },
    initialPageSize: 50,
  })
}

/**
 * Fetch full patient record by UUID.
 * Endpoint: GET /patient-care/patients/{id}
 */
export function usePatientDetail(id: string | null, enabled = true) {
  return useQuery({
    queryKey: patientCareKeys.patientDetail(id ?? ""),
    queryFn: () =>
      apiClient.get<Patient>(`/patient-care/patients/${id!}`).then((e) => e.data),
    enabled: enabled && id != null,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Fetch receipt data (patient + hospital + latest prescription/eye-reading)
 * for the quick-print button. On-demand only — enabled false until a print
 * is actually requested, since this is a heavier nested-join query not
 * needed for the list view itself.
 * Endpoint: GET /patient-care/patients/{id}/receipt
 */
export function usePatientReceipt(id: string | null, enabled = true) {
  return useQuery({
    queryKey: patientCareKeys.receipt(id ?? ""),
    queryFn: () =>
      apiClient.get<PatientReceiptData>(`/patient-care/patients/${id!}/receipt`).then((e) => e.data),
    enabled: enabled && id != null,
  })
}

/**
 * Fetch full inpatient record by UUID.
 * Endpoint: GET /patient-care/inpatients/{id}
 */
export function useInPatientDetail(id: string | null, enabled = true) {
  return useQuery({
    queryKey: patientCareKeys.inpatientDetail(id ?? ""),
    queryFn: () =>
      apiClient.get<InPatient>(`/patient-care/inpatients/${id!}`).then((e) => e.data),
    enabled: enabled && id != null,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Autocomplete patient search (for the existing-patient SearchBar).
 *
 * IMPORTANT: This endpoint returns `data: { patients, nextCursor }` — NOT an
 * array with `meta.cursor`. Use regular useQuery + debounce, not useCursorQuery.
 *
 * Endpoint: GET /patient-care/patients/search?q=...&limit=10
 */
export function usePatientSearch(q: string) {
  return useQuery({
    queryKey: patientCareKeys.patientSearch(q),
    queryFn: () =>
      apiClient
        .get<PatientSearchData>(`/patient-care/patients/search?q=${encodeURIComponent(q)}&limit=10`)
        .then((e) => e.data),
    enabled: q.trim().length >= 2,
    staleTime: 30 * 1000,
  })
}

/**
 * Dropdown options for a specific field (e.g. referredBy, patientType).
 * Endpoint: GET /patient-care/dropdown-options?fieldName=...
 */
export function useDropdownOptions(fieldName?: string) {
  const param = fieldName ? `?fieldName=${encodeURIComponent(fieldName)}` : ""
  return useQuery({
    queryKey: patientCareKeys.dropdownOptions(fieldName),
    queryFn: () =>
      apiClient
        .get<DropdownOption[]>(`/patient-care/dropdown-options${param}`)
        .then((e) => e.data),
    staleTime: 10 * 60 * 1000,
  })
}

/**
 * Registration form reference data (service templates, patient types, etc).
 * Endpoint: GET /patient-care/patients/registration-form
 */
export function useRegistrationForm() {
  return useQuery({
    queryKey: patientCareKeys.registrationForm(),
    queryFn: () =>
      apiClient
        .get<RegistrationFormData>("/patient-care/patients/registration-form")
        .then((e) => e.data),
    staleTime: 10 * 60 * 1000,
  })
}

/**
 * Admission form reference data (wards, surgery types, doctors).
 * Endpoint: GET /patient-care/inpatients/admission-form
 */
export function useAdmissionForm() {
  return useQuery({
    queryKey: patientCareKeys.admissionForm(),
    queryFn: () =>
      apiClient
        .get<AdmissionFormData>("/patient-care/inpatients/admission-form")
        .then((e) => e.data),
    staleTime: 10 * 60 * 1000,
  })
}

/**
 * Preview the next sequential patient ID before submitting the form.
 * Endpoint: GET /patient-care/patients/next-id
 */
export function useNextPatientId(enabled: boolean) {
  return useQuery({
    queryKey: patientCareKeys.nextPatientId(),
    queryFn: () =>
      apiClient
        .get<NextPatientIdData>("/patient-care/patients/next-id")
        .then((e) => e.data),
    enabled,
    staleTime: 0, // Always fresh — consumed on submit
  })
}

/**
 * Preview the next sequential inpatient (IP) number.
 * Endpoint: GET /patient-care/inpatients/next-id
 */
export function useNextIpNumber(enabled: boolean) {
  return useQuery({
    queryKey: patientCareKeys.nextIpNumber(),
    queryFn: () =>
      apiClient
        .get<NextIpNumberData>("/patient-care/inpatients/next-id")
        .then((e) => e.data),
    enabled,
    staleTime: 0,
  })
}

// ─── Mutation hooks ───────────────────────────────────────────────────────────

/**
 * Register a new patient.
 * Endpoint: POST /patient-care/patients
 * Permission: patients:create
 */
export function useCreatePatient(onSuccess?: (patient: Patient) => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreatePatientBody) =>
      apiClient.post<Patient>("/patient-care/patients", body).then((e) => e.data),
    onSuccess: (patient) => {
      void qc.invalidateQueries({ queryKey: patientCareKeys.patients() })
      void qc.invalidateQueries({ queryKey: patientCareKeys.nextPatientId() })
      onSuccess?.(patient)
    },
  })
}

/**
 * Update patient info.
 * Endpoint: PATCH /patient-care/patients/{id}
 * Permission: patients:edit
 */
export function useUpdatePatient(id: string, onSuccess?: (patient: Patient) => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: UpdatePatientBody) =>
      apiClient.patch<Patient>(`/patient-care/patients/${id}`, body).then((e) => e.data),
    onSuccess: (patient) => {
      void qc.invalidateQueries({ queryKey: patientCareKeys.patients() })
      void qc.setQueryData(patientCareKeys.patientDetail(id), patient)
      onSuccess?.(patient)
    },
  })
}

/**
 * Delete a patient record.
 * Endpoint: DELETE /patient-care/patients/{id}
 * Permission: patients:delete
 */
export function useDeletePatient(onSuccess?: () => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/patient-care/patients/${id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: patientCareKeys.patients() })
      onSuccess?.()
    },
  })
}

/**
 * Update a patient's status.
 * Endpoint: PATCH /patient-care/patients/{id}/status
 * Permission: patients:edit
 */
export function useUpdatePatientStatus(onSuccess?: () => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdatePatientStatusBody }) =>
      apiClient.patch(`/patient-care/patients/${id}/status`, body),
    onSuccess: (_, { id }) => {
      void qc.invalidateQueries({ queryKey: patientCareKeys.patients() })
      void qc.invalidateQueries({ queryKey: patientCareKeys.patientDetail(id) })
      onSuccess?.()
    },
  })
}

/**
 * Move a patient to a different appointment date.
 * Endpoint: PATCH /patient-care/patients/{id}/date
 * Permission: patients:edit
 */
export function useMovePatientDate(onSuccess?: () => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: MovePatientDateBody }) =>
      apiClient.patch(`/patient-care/patients/${id}/date`, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: patientCareKeys.patients() })
      onSuccess?.()
    },
  })
}

/**
 * Admit a new inpatient.
 * Endpoint: POST /patient-care/inpatients
 * Permission: inpatients:create
 */
export function useCreateInPatient(onSuccess?: (inpatient: InPatient) => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateInPatientBody) =>
      apiClient.post<InPatient>("/patient-care/inpatients", body).then((e) => e.data),
    onSuccess: (inpatient) => {
      void qc.invalidateQueries({ queryKey: patientCareKeys.inpatients() })
      void qc.invalidateQueries({ queryKey: patientCareKeys.nextIpNumber() })
      onSuccess?.(inpatient)
    },
  })
}

/**
 * Update an inpatient record (full update).
 * Endpoint: PATCH /patient-care/inpatients/{id}
 * Permission: inpatients:edit
 */
export function useUpdateInPatient(id: string, onSuccess?: () => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Partial<CreateInPatientBody>) =>
      apiClient.patch(`/patient-care/inpatients/${id}`, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: patientCareKeys.inpatients() })
      void qc.invalidateQueries({ queryKey: patientCareKeys.inpatientDetail(id) })
      onSuccess?.()
    },
  })
}

/**
 * Delete an inpatient record.
 * Endpoint: DELETE /patient-care/inpatients/{id}
 * Permission: inpatients:delete
 */
export function useDeleteInPatient(onSuccess?: () => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/patient-care/inpatients/${id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: patientCareKeys.inpatients() })
      onSuccess?.()
    },
  })
}

/**
 * Update inpatient basic info (ward, bed, doctors).
 * Endpoint: PATCH /patient-care/inpatients/{id}/basic-info
 * Permission: inpatients:edit
 */
export function useUpdateInPatientBasicInfo(id: string, onSuccess?: () => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: UpdateInPatientBasicInfoBody) =>
      apiClient.patch(`/patient-care/inpatients/${id}/basic-info`, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: patientCareKeys.inpatientDetail(id) })
      onSuccess?.()
    },
  })
}

/**
 * Update inpatient status (admitted / discharged).
 * Endpoint: PATCH /patient-care/inpatients/{id}/status
 * Permission: inpatients:edit
 */
export function useUpdateInPatientStatus(onSuccess?: () => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateInPatientStatusBody }) =>
      apiClient.patch(`/patient-care/inpatients/${id}/status`, body),
    onSuccess: (_, { id }) => {
      void qc.invalidateQueries({ queryKey: patientCareKeys.inpatients() })
      void qc.invalidateQueries({ queryKey: patientCareKeys.inpatientDetail(id) })
      onSuccess?.()
    },
  })
}

/**
 * Add a service to a patient (creates invoice item + payment).
 * Endpoint: POST /patient-care/patients/{id}/services
 * Permission: billing:create
 */
export function useAddService(patientId: string, onSuccess?: () => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: AddServiceBody) =>
      apiClient.post(`/patient-care/patients/${patientId}/services`, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: patientCareKeys.patientDetail(patientId) })
      onSuccess?.()
    },
  })
}

/**
 * Create (or roll into today's existing) prescription with an arbitrary set
 * of billed line items + one payment — the registration wizard's Step 2
 * ("Services & Payment") uses this generic endpoint rather than /services
 * (which only accepts one ServiceTemplate at a time).
 * Endpoint: POST /patient-care/patients/{id}/prescriptions
 * Permission: billing:create
 */
export function useCreatePrescriptionWithBilling(patientId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreatePrescriptionWithBillingBody) =>
      apiClient
        .post<CreatePrescriptionWithBillingResponse>(
          `/patient-care/patients/${patientId}/prescriptions`,
          body,
        )
        .then((e) => e.data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: patientCareKeys.patients() })
      void qc.invalidateQueries({ queryKey: patientCareKeys.patientDetail(patientId) })
    },
  })
}

/**
 * Add a new value to an open, tenant-editable dropdown list (Doctor Name,
 * Department, Referred By, Address, Patient Type) — the registration
 * wizard's "Add '<value>' to list" affordance on each EditableComboboxWithAdd.
 * Endpoint: POST /patient-care/dropdown-options
 */
export function useAddDropdownOption() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { fieldName: string; value: string }) =>
      apiClient.post("/patient-care/dropdown-options", body),
    onSuccess: (_, { fieldName }) => {
      void qc.invalidateQueries({ queryKey: patientCareKeys.dropdownOptions(fieldName) })
      void qc.invalidateQueries({ queryKey: patientCareKeys.registrationForm() })
    },
  })
}
