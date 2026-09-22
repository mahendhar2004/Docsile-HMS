/**
 * OpdTab
 *
 * OPD patient management:
 * - Date navigator to switch between appointment dates
 * - Existing-patient autocomplete search (cursor-based API, useQuery + debounce)
 * - Offset-paginated patient table via PaginatedDataTable
 * - Register new patient (PatientRegistrationForm)
 * - Patient detail panel (PatientDetailPanel / Sheet)
 * - Edit patient (inline edit form)
 * - Delete with ConfirmationModal
 *
 * Permissions:
 *   patients:view    — always required (caller gates the whole tab)
 *   patients:create  — shows Register button
 *   patients:edit    — shows edit actions
 *   patients:delete  — shows delete action
 *   billing:create   — shows Add Service in detail panel
 *   billing:view     — shows Print Receipt in detail panel
 */

import { useState, useEffect, useId } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { format } from "date-fns"
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { IconButton } from "@/components/ui/icon-button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import {
  PaginatedDataTable,
  ColumnDef,
  StatusPill,
  SearchBar,
  DatePicker,
  FormField,
  FormSection,
  TextInput,
  PhoneInput,
  SingleSelect,
  ConfirmationModal,
  EmptyState,
} from "@/components/patterns"
import type { Suggestion } from "@/components/patterns"
import {
  useOpdPatients,
  usePatientSearch,
  useUpdatePatient,
  useDeletePatient,
} from "./hooks"
import { PatientRegistrationForm } from "./patient-registration-form"
import { PatientDetailPanel } from "./patient-detail-panel"
import type { Patient } from "./types"

// ─── Edit form schema ──────────────────────────────────────────────────────────

const editSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phone: z.string().min(7, "Valid phone number required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  gender: z.enum(["Male", "Female", "Other"]),
  dateOfBirth: z.date().optional(),
  address: z.string().optional(),
  patientType: z.string().min(1, "Patient type is required"),
  appointmentDate: z.date(),
  referredBy: z.string().optional(),
})

type EditFormValues = z.infer<typeof editSchema>

const GENDER_OPTIONS = [
  { value: "Male", label: "Male" },
  { value: "Female", label: "Female" },
  { value: "Other", label: "Other" },
]

const PATIENT_TYPE_OPTIONS = [
  { value: "OPD", label: "OPD" },
  { value: "Walk-in", label: "Walk-in" },
  { value: "Referral", label: "Referral" },
]

// ─── PatientEditForm (inline) ─────────────────────────────────────────────────

interface PatientEditFormProps {
  patient: Patient
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

function PatientEditForm({ patient, open, onOpenChange, onSuccess }: PatientEditFormProps) {
  const formId = useId()
  const updatePatient = useUpdatePatient(patient.id, () => {
    onSuccess()
    onOpenChange(false)
  })

  const { register, control, handleSubmit, reset, formState: { errors } } = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
  })

  useEffect(() => {
    if (open) {
      reset({
        firstName: patient.firstName,
        lastName: patient.lastName,
        phone: patient.phone,
        email: patient.email ?? "",
        gender: patient.gender,
        dateOfBirth: patient.dateOfBirth ? new Date(patient.dateOfBirth) : undefined,
        address: patient.address ?? "",
        patientType: patient.patientType,
        appointmentDate: new Date(patient.appointmentDate),
        referredBy: patient.referredBy ?? "",
      })
      updatePatient.reset()
    }
  }, [open, patient]) // eslint-disable-line react-hooks/exhaustive-deps

  function onSubmit(values: EditFormValues) {
    updatePatient.mutate({
      firstName: values.firstName,
      lastName: values.lastName,
      phone: values.phone,
      email: values.email || null,
      gender: values.gender,
      dateOfBirth: values.dateOfBirth ? format(values.dateOfBirth, "yyyy-MM-dd") : null,
      address: values.address || null,
      patientType: values.patientType,
      appointmentDate: format(values.appointmentDate, "yyyy-MM-dd"),
      referredBy: values.referredBy || null,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="xl">
        <DialogHeader>
          <DialogTitle>Edit Patient — {patient.patientId}</DialogTitle>
          <DialogDescription>Update patient details below.</DialogDescription>
        </DialogHeader>
        <form id={formId} onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-6">
          <FormSection title="Personal Information">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="First Name" htmlFor={`${formId}-fn`} required error={errors.firstName?.message}>
                <TextInput id={`${formId}-fn`} hasError={Boolean(errors.firstName)} {...register("firstName")} />
              </FormField>
              <FormField label="Last Name" htmlFor={`${formId}-ln`} required error={errors.lastName?.message}>
                <TextInput id={`${formId}-ln`} hasError={Boolean(errors.lastName)} {...register("lastName")} />
              </FormField>
              <FormField label="Phone" htmlFor={`${formId}-ph`} required error={errors.phone?.message}>
                <Controller name="phone" control={control} render={({ field }) => (
                  <PhoneInput id={`${formId}-ph`} value={field.value ?? ""} onChange={field.onChange} hasError={Boolean(errors.phone)} />
                )} />
              </FormField>
              <FormField label="Email" htmlFor={`${formId}-em`} error={errors.email?.message}>
                <TextInput id={`${formId}-em`} inputType="email" hasError={Boolean(errors.email)} {...register("email")} />
              </FormField>
              <FormField label="Gender" htmlFor={`${formId}-gd`} required error={errors.gender?.message}>
                <Controller name="gender" control={control} render={({ field }) => (
                  <SingleSelect options={GENDER_OPTIONS} value={field.value ?? ""} onChange={field.onChange} placeholder="Select gender" error={Boolean(errors.gender)} />
                )} />
              </FormField>
              <FormField label="Date of Birth" htmlFor={`${formId}-dob`}>
                <Controller name="dateOfBirth" control={control} render={({ field }) => (
                  <DatePicker id={`${formId}-dob`} value={field.value} onChange={field.onChange} toDate={new Date()} aria-label="Date of birth" />
                )} />
              </FormField>
            </div>
            <FormField label="Address" htmlFor={`${formId}-addr`}>
              <Textarea id={`${formId}-addr`} rows={2} className="resize-none" {...register("address")} />
            </FormField>
          </FormSection>
          <FormSection title="Visit Information">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Patient Type" htmlFor={`${formId}-pt`} required error={errors.patientType?.message}>
                <Controller name="patientType" control={control} render={({ field }) => (
                  <SingleSelect options={PATIENT_TYPE_OPTIONS} value={field.value ?? ""} onChange={field.onChange} placeholder="Select type" error={Boolean(errors.patientType)} />
                )} />
              </FormField>
              <FormField label="Appointment Date" htmlFor={`${formId}-ad`} required error={errors.appointmentDate?.message}>
                <Controller name="appointmentDate" control={control} render={({ field }) => (
                  <DatePicker id={`${formId}-ad`} value={field.value} onChange={field.onChange} error={Boolean(errors.appointmentDate)} aria-label="Appointment date" />
                )} />
              </FormField>
              <FormField label="Referred By" htmlFor={`${formId}-rb`}>
                <TextInput id={`${formId}-rb`} {...register("referredBy")} />
              </FormField>
            </div>
          </FormSection>
          {updatePatient.isError && (
            <p role="alert" className="text-sm text-[var(--color-error)]">
              {updatePatient.error instanceof Error ? updatePatient.error.message : "Update failed."}
            </p>
          )}
        </form>
        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={updatePatient.isPending}>
            Cancel
          </Button>
          <Button type="submit" form={formId} loading={updatePatient.isPending}>
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Table columns ─────────────────────────────────────────────────────────────

const columns: ColumnDef<Patient>[] = [
  {
    key: "patientId",
    header: "ID",
    cell: (p) => <span className="font-mono text-xs">{p.patientId}</span>,
  },
  {
    key: "name",
    header: "Name",
    cell: (p) => (
      <span className="font-medium">
        {p.firstName} {p.lastName}
      </span>
    ),
  },
  {
    key: "phone",
    header: "Phone",
    cell: (p) => p.phone,
  },
  {
    key: "patientType",
    header: "Type",
    cell: (p) => p.patientType,
  },
  {
    key: "status",
    header: "Status",
    cell: (p) => <StatusPill status={p.status ?? "REGISTERED"} size="sm" />,
  },
  {
    key: "referredBy",
    header: "Referred By",
    cell: (p) => p.referredBy ?? "—",
  },
]

// ─── OpdTab component ─────────────────────────────────────────────────────────

export interface OpdTabProps {
  canCreate: boolean
  canEdit: boolean
  canDelete: boolean
  canAddServices: boolean
  canViewReceipt: boolean
}

export function OpdTab({
  canCreate,
  canEdit,
  canDelete,
  canAddServices,
  canViewReceipt,
}: OpdTabProps) {
  const [viewDate, setViewDate] = useState<Date>(new Date())
  const [searchQ, setSearchQ] = useState("")
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null)
  const [showDetail, setShowDetail] = useState(false)
  const [showRegister, setShowRegister] = useState(false)
  const [editPatient, setEditPatient] = useState<Patient | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Patient | null>(null)

  const dateStr = format(viewDate, "yyyy-MM-dd")

  // Offset-paginated OPD list for the selected date.
  const {
    data,
    total,
    page,
    pageSize,
    isLoading,
    isFetching,
    isError,
    error,
    setPage,
    setPageSize,
    refetch,
  } = useOpdPatients(dateStr)

  // Autocomplete search using the cursor-based search endpoint.
  const { data: searchData, isLoading: isSearching } = usePatientSearch(searchQ)

  const deletePatient = useDeletePatient(() => {
    setDeleteTarget(null)
    void refetch()
  })

  const searchSuggestions: Suggestion<Patient>[] = (searchData?.patients ?? []).map((p) => ({
    id: p.id,
    label: `${p.firstName} ${p.lastName}`,
    value: p,
  }))

  function handleSearchSelect(suggestion: Suggestion<Patient>) {
    setSearchQ(`${suggestion.value.firstName} ${suggestion.value.lastName} — ${suggestion.value.phone}`)
    setSelectedPatientId(suggestion.value.id)
    setShowDetail(true)
  }

  function navigateDate(direction: -1 | 1) {
    setViewDate((d) => {
      const next = new Date(d)
      next.setDate(next.getDate() + direction)
      return next
    })
    setPage(1)
  }

  return (
    <div className="space-y-4">
      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        {/* Date navigator */}
        <div className="flex items-center gap-1" role="group" aria-label="Appointment date navigation">
          <IconButton
            aria-label="Previous day"
            size="sm"
            variant="outline"
            onClick={() => navigateDate(-1)}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </IconButton>
          <DatePicker
            value={viewDate}
            onChange={(d) => {
              if (d) { setViewDate(d); setPage(1) }
            }}
            placeholder="Select date"
            aria-label="View date"
          />
          <IconButton
            aria-label="Next day"
            size="sm"
            variant="outline"
            onClick={() => navigateDate(1)}
          >
            <ChevronRight className="h-4 w-4" aria-hidden />
          </IconButton>
        </div>

        {/* Existing patient search */}
        <div className="flex-1 max-w-sm">
          <SearchBar<Patient>
            variant="with-autocomplete"
            value={searchQ}
            onChange={setSearchQ}
            suggestions={searchSuggestions}
            onSuggestionSelect={handleSearchSelect}
            isLoadingSuggestions={isSearching}
            placeholder="Search patient by name, phone, ID…"
            aria-label="Search existing patients"
            renderSuggestion={(s) => (
              <div className="flex flex-col gap-0.5">
                <span className="font-medium">{s.label}</span>
                <span className="text-xs text-[var(--color-muted-foreground)]">
                  {s.value.patientId} · {s.value.phone}
                </span>
              </div>
            )}
          />
        </div>

        {/* Register new patient */}
        {canCreate && (
          <Button onClick={() => setShowRegister(true)} className="ml-auto">
            <Plus className="h-4 w-4 mr-1.5" aria-hidden />
            Register Patient
          </Button>
        )}
      </div>

      {/* ── Patient table ─────────────────────────────────────────────────── */}
      <PaginatedDataTable<Patient>
        mode="offset"
        data={data}
        columns={columns}
        variant={canEdit || canDelete ? "with-row-actions" : "standard"}
        isLoading={isLoading}
        isFetching={isFetching}
        isError={isError}
        error={error}
        onRetry={refetch}
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        showPageSizeSelector
        aria-label="OPD patients table"
        onRowClick={(patient) => {
          setSelectedPatientId(patient.id)
          setShowDetail(true)
        }}
        rowActions={(patient) => (
          <div className="flex items-center gap-1 justify-end">
            {canEdit && (
              <IconButton
                size="sm"
                variant="ghost"
                aria-label={`Edit ${patient.firstName} ${patient.lastName}`}
                onClick={(e) => {
                  e.stopPropagation()
                  setEditPatient(patient)
                }}
              >
                <Pencil className="h-3.5 w-3.5" aria-hidden />
              </IconButton>
            )}
            {canDelete && (
              <IconButton
                size="sm"
                variant="ghost"
                aria-label={`Delete ${patient.firstName} ${patient.lastName}`}
                onClick={(e) => {
                  e.stopPropagation()
                  setDeleteTarget(patient)
                }}
              >
                <Trash2 className="h-3.5 w-3.5 text-[var(--color-error)]" aria-hidden />
              </IconButton>
            )}
          </div>
        )}
        emptyState={
          <EmptyState
            title="No patients today"
            description={`No patients have been registered for ${format(viewDate, "dd MMM yyyy")}.`}
            action={
              canCreate
                ? { label: "Register Patient", onClick: () => setShowRegister(true) }
                : undefined
            }
          />
        }
      />

      {/* ── Patient detail panel ──────────────────────────────────────────── */}
      <PatientDetailPanel
        patientId={selectedPatientId}
        open={showDetail}
        onOpenChange={setShowDetail}
        onDeleted={refetch}
        canEdit={canEdit}
        canDelete={canDelete}
        canAddServices={canAddServices}
        canViewReceipt={canViewReceipt}
        onEdit={(patient) => {
          setEditPatient(patient)
          setShowDetail(false)
        }}
      />

      {/* ── Patient registration form ─────────────────────────────────────── */}
      <PatientRegistrationForm
        open={showRegister}
        onOpenChange={setShowRegister}
        defaultAppointmentDate={viewDate}
        onSuccess={() => void refetch()}
      />

      {/* ── Patient edit form ─────────────────────────────────────────────── */}
      {editPatient && (
        <PatientEditForm
          patient={editPatient}
          open={editPatient !== null}
          onOpenChange={(open) => { if (!open) setEditPatient(null) }}
          onSuccess={() => void refetch()}
        />
      )}

      {/* ── Delete confirmation ───────────────────────────────────────────── */}
      {deleteTarget && (
        <ConfirmationModal
          open={deleteTarget !== null}
          onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}
          variant="destructive"
          title="Delete Patient"
          description={`Delete ${deleteTarget.firstName} ${deleteTarget.lastName} (${deleteTarget.patientId})? This cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={() => deletePatient.mutate(deleteTarget.id)}
          isLoading={deletePatient.isPending}
        />
      )}
    </div>
  )
}
