/**
 * InpatientAdmissionForm
 *
 * Dialog for admitting a patient to in-patient care (POST /patient-care/inpatients).
 * Step 1: Search and select an existing patient.
 * Step 2: Fill in ward/bed/doctor details.
 *
 * Permission guard: inpatients:create — caller must gate before rendering.
 */

import { useState, useEffect, useId } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { format } from "date-fns"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  FormField,
  FormSection,
  TextInput,
  DatePicker,
  SearchBar,
  SingleSelect,
} from "@/components/patterns"
import type { Suggestion } from "@/components/patterns"
import { useCreateInPatient, useNextIpNumber, usePatientSearch, useAdmissionForm } from "./hooks"
import type { InPatient, Patient } from "./types"

// ─── Zod schema ───────────────────────────────────────────────────────────────

const schema = z.object({
  patientId: z.string().min(1, "Patient selection is required"),
  admissionDate: z.date(),
  ward: z.string().optional(),
  bedNumber: z.string().optional(),
  onDutyDoctors: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

// ─── Component ────────────────────────────────────────────────────────────────

export interface InpatientAdmissionFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (inpatient: InPatient) => void
}

export function InpatientAdmissionForm({
  open,
  onOpenChange,
  onSuccess,
}: InpatientAdmissionFormProps) {
  const formId = useId()
  const [searchQ, setSearchQ] = useState("")
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)

  const { data: nextIpData } = useNextIpNumber(open)
  const { data: admissionFormData } = useAdmissionForm()
  const { data: searchData, isLoading: isSearching } = usePatientSearch(searchQ)

  const wardOptions = (admissionFormData?.wards ?? []).map((w) => ({
    value: w,
    label: w,
  }))

  const createInPatient = useCreateInPatient((inpatient) => {
    onSuccess(inpatient)
    onOpenChange(false)
  })

  const {
    register,
    control,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      admissionDate: new Date(),
    },
  })

  // Reset form when dialog opens.
  useEffect(() => {
    if (open) {
      reset({ admissionDate: new Date() })
      setSearchQ("")
      setSelectedPatient(null)
      createInPatient.reset()
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const searchSuggestions: Suggestion<Patient>[] = (
    searchData?.patients ?? []
  ).map((p) => ({
    id: p.id,
    label: `${p.firstName} ${p.lastName}`,
    value: p,
  }))

  function handlePatientSelect(suggestion: Suggestion<Patient>) {
    setSelectedPatient(suggestion.value)
    setValue("patientId", suggestion.value.id, { shouldValidate: true })
    setSearchQ(`${suggestion.value.firstName} ${suggestion.value.lastName} — ${suggestion.value.phone}`)
  }

  function onSubmit(values: FormValues) {
    createInPatient.mutate({
      patientId: values.patientId,
      admissionDate: format(values.admissionDate, "yyyy-MM-dd"),
      status: "admitted",
      ward: values.ward || null,
      bedNumber: values.bedNumber || null,
      onDutyDoctors: values.onDutyDoctors
        ? JSON.stringify(
            values.onDutyDoctors.split(",").map((d) => d.trim()).filter(Boolean),
          )
        : "[]",
      paymentRecords: "[]",
      prescriptions: "[]",
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="xl">
        <DialogHeader>
          <DialogTitle>Admit Inpatient</DialogTitle>
          <DialogDescription>
            {nextIpData
              ? `IP Number: ${nextIpData.nextIpNumber} (assigned on save)`
              : "Search for an existing patient, then fill in ward details."}
          </DialogDescription>
        </DialogHeader>

        <form id={formId} onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-6">
          {/* ── Patient Selection ─────────────────────────────────────────── */}
          <FormSection title="Patient Selection">
            <FormField
              label="Search Patient"
              htmlFor={`${formId}-patient-search`}
              required
              error={errors.patientId?.message}
              helpText="Type name, phone, or patient ID (minimum 2 characters)"
            >
              <SearchBar<Patient>
                variant="with-autocomplete"
                aria-label="Search existing patient"
                value={searchQ}
                onChange={(v) => {
                  setSearchQ(v)
                  if (selectedPatient && v !== `${selectedPatient.firstName} ${selectedPatient.lastName} — ${selectedPatient.phone}`) {
                    setSelectedPatient(null)
                    setValue("patientId", "", { shouldValidate: false })
                  }
                }}
                suggestions={searchSuggestions}
                onSuggestionSelect={handlePatientSelect}
                isLoadingSuggestions={isSearching}
                placeholder="e.g. Ramesh Kumar or 9876543210"
                renderSuggestion={(s) => (
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium text-[var(--color-foreground)]">
                      {s.label}
                    </span>
                    <span className="text-xs text-[var(--color-muted-foreground)]">
                      {s.value.patientId} · {s.value.phone}
                    </span>
                  </div>
                )}
              />
            </FormField>

            {selectedPatient && (
              <div className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-muted)]/30 p-3 text-sm space-y-1">
                <p className="font-medium text-[var(--color-foreground)]">
                  {selectedPatient.firstName} {selectedPatient.lastName}
                </p>
                <p className="text-[var(--color-muted-foreground)]">
                  {selectedPatient.patientId} · {selectedPatient.phone} · {selectedPatient.gender}
                </p>
              </div>
            )}
          </FormSection>

          {/* ── Ward & Bed ───────────────────────────────────────────────── */}
          <FormSection title="Admission Details">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                label="Admission Date"
                htmlFor={`${formId}-admDate`}
                required
                error={errors.admissionDate?.message}
              >
                <Controller
                  name="admissionDate"
                  control={control}
                  render={({ field }) => (
                    <DatePicker
                      id={`${formId}-admDate`}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Select admission date"
                      error={Boolean(errors.admissionDate)}
                      aria-label="Admission date"
                    />
                  )}
                />
              </FormField>

              <FormField
                label="Ward"
                htmlFor={`${formId}-ward`}
                error={errors.ward?.message}
              >
                {wardOptions.length > 0 ? (
                  <Controller
                    name="ward"
                    control={control}
                    render={({ field }) => (
                      <SingleSelect
                        options={wardOptions}
                        value={field.value ?? ""}
                        onChange={field.onChange}
                        placeholder="Select ward (optional)"
                        clearable
                      />
                    )}
                  />
                ) : (
                  <TextInput
                    id={`${formId}-ward`}
                    placeholder="e.g. General Ward"
                    {...register("ward")}
                  />
                )}
              </FormField>

              <FormField
                label="Bed Number"
                htmlFor={`${formId}-bed`}
                error={errors.bedNumber?.message}
              >
                <TextInput
                  id={`${formId}-bed`}
                  placeholder="e.g. B-12 (optional)"
                  {...register("bedNumber")}
                />
              </FormField>

              <FormField
                label="On-Duty Doctors"
                htmlFor={`${formId}-doctors`}
                error={errors.onDutyDoctors?.message}
                helpText="Comma-separated names"
              >
                <TextInput
                  id={`${formId}-doctors`}
                  placeholder="Dr. Sharma, Dr. Patel (optional)"
                  {...register("onDutyDoctors")}
                />
              </FormField>
            </div>
          </FormSection>

          {/* ── Error banner ─────────────────────────────────────────────── */}
          {createInPatient.isError && (
            <p role="alert" className="text-sm text-[var(--color-error)]">
              {createInPatient.error instanceof Error
                ? createInPatient.error.message
                : "Failed to admit patient. Please try again."}
            </p>
          )}
        </form>

        <div className="mt-6 flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={createInPatient.isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form={formId}
            loading={createInPatient.isPending}
          >
            Admit Patient
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
