/**
 * PatientRegistrationForm
 *
 * Dialog-based form for registering a new patient (POST /patient-care/patients).
 * Organized into two FormSection groups — no stepper; the 9-field form doesn't
 * have a natural multi-step breakpoint and is completed in a single interaction.
 *
 * Permission guard: patients:create — caller must gate before rendering.
 */

import { useEffect, useId } from "react"
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
import { Textarea } from "@/components/ui/textarea"
import {
  FormField,
  FormSection,
  TextInput,
  PhoneInput,
  SingleSelect,
  DatePicker,
} from "@/components/patterns"
import { useCreatePatient, useNextPatientId } from "./hooks"
import type { Patient } from "./types"

// ─── Zod schema ───────────────────────────────────────────────────────────────

const schema = z.object({
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

type FormValues = z.infer<typeof schema>

// ─── Static options ───────────────────────────────────────────────────────────

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

// ─── Component ────────────────────────────────────────────────────────────────

export interface PatientRegistrationFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Pre-fills the appointment date to the currently-viewed OPD date. */
  defaultAppointmentDate: Date
  onSuccess: (patient: Patient) => void
}

export function PatientRegistrationForm({
  open,
  onOpenChange,
  defaultAppointmentDate,
  onSuccess,
}: PatientRegistrationFormProps) {
  const formId = useId()

  // Preview next patient ID for display in the dialog header.
  const { data: nextIdData } = useNextPatientId(open)

  const createPatient = useCreatePatient((patient) => {
    onSuccess(patient)
    onOpenChange(false)
  })

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      gender: "Male",
      patientType: "OPD",
      appointmentDate: defaultAppointmentDate,
    },
  })

  // Reset form and sync appointment date when dialog opens.
  useEffect(() => {
    if (open) {
      reset({
        gender: "Male",
        patientType: "OPD",
        appointmentDate: defaultAppointmentDate,
      })
      createPatient.reset()
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  function onSubmit(values: FormValues) {
    createPatient.mutate({
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
          <DialogTitle>Register New Patient</DialogTitle>
          <DialogDescription>
            {nextIdData ? `Patient ID: ${nextIdData.nextPatientId} (will be assigned on save)` : "Fill in patient details to register."}
          </DialogDescription>
        </DialogHeader>

        <form id={formId} onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-6">
          {/* ── Personal Information ──────────────────────────────────────── */}
          <FormSection title="Personal Information">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                label="First Name"
                htmlFor={`${formId}-firstName`}
                required
                error={errors.firstName?.message}
              >
                <TextInput
                  id={`${formId}-firstName`}
                  placeholder="e.g. Ramesh"
                  hasError={Boolean(errors.firstName)}
                  {...register("firstName")}
                />
              </FormField>

              <FormField
                label="Last Name"
                htmlFor={`${formId}-lastName`}
                required
                error={errors.lastName?.message}
              >
                <TextInput
                  id={`${formId}-lastName`}
                  placeholder="e.g. Kumar"
                  hasError={Boolean(errors.lastName)}
                  {...register("lastName")}
                />
              </FormField>

              <FormField
                label="Phone"
                htmlFor={`${formId}-phone`}
                required
                error={errors.phone?.message}
              >
                <Controller
                  name="phone"
                  control={control}
                  render={({ field }) => (
                    <PhoneInput
                      id={`${formId}-phone`}
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      hasError={Boolean(errors.phone)}
                    />
                  )}
                />
              </FormField>

              <FormField
                label="Email"
                htmlFor={`${formId}-email`}
                error={errors.email?.message}
              >
                <TextInput
                  id={`${formId}-email`}
                  inputType="email"
                  placeholder="patient@example.com (optional)"
                  hasError={Boolean(errors.email)}
                  {...register("email")}
                />
              </FormField>

              <FormField
                label="Gender"
                htmlFor={`${formId}-gender`}
                required
                error={errors.gender?.message}
              >
                <Controller
                  name="gender"
                  control={control}
                  render={({ field }) => (
                    <SingleSelect
                      options={GENDER_OPTIONS}
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      placeholder="Select gender"
                      error={Boolean(errors.gender)}
                    />
                  )}
                />
              </FormField>

              <FormField
                label="Date of Birth"
                htmlFor={`${formId}-dob`}
                error={errors.dateOfBirth?.message}
              >
                <Controller
                  name="dateOfBirth"
                  control={control}
                  render={({ field }) => (
                    <DatePicker
                      id={`${formId}-dob`}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Select date (optional)"
                      toDate={new Date()}
                      aria-label="Date of birth"
                    />
                  )}
                />
              </FormField>
            </div>

            <FormField
              label="Address"
              htmlFor={`${formId}-address`}
              error={errors.address?.message}
            >
              <Textarea
                id={`${formId}-address`}
                placeholder="Street, city, state (optional)"
                rows={2}
                className="resize-none"
                {...register("address")}
              />
            </FormField>
          </FormSection>

          {/* ── Visit Information ─────────────────────────────────────────── */}
          <FormSection title="Visit Information">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                label="Patient Type"
                htmlFor={`${formId}-patientType`}
                required
                error={errors.patientType?.message}
              >
                <Controller
                  name="patientType"
                  control={control}
                  render={({ field }) => (
                    <SingleSelect
                      options={PATIENT_TYPE_OPTIONS}
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      placeholder="Select type"
                      error={Boolean(errors.patientType)}
                    />
                  )}
                />
              </FormField>

              <FormField
                label="Appointment Date"
                htmlFor={`${formId}-apptDate`}
                required
                error={errors.appointmentDate?.message}
              >
                <Controller
                  name="appointmentDate"
                  control={control}
                  render={({ field }) => (
                    <DatePicker
                      id={`${formId}-apptDate`}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Select date"
                      error={Boolean(errors.appointmentDate)}
                      aria-label="Appointment date"
                    />
                  )}
                />
              </FormField>

              <FormField
                label="Referred By"
                htmlFor={`${formId}-referredBy`}
                error={errors.referredBy?.message}
              >
                <TextInput
                  id={`${formId}-referredBy`}
                  placeholder="Doctor or institution name (optional)"
                  {...register("referredBy")}
                />
              </FormField>
            </div>
          </FormSection>

          {/* ── Error banner ─────────────────────────────────────────────── */}
          {createPatient.isError && (
            <p role="alert" className="text-sm text-[var(--color-error)]">
              {createPatient.error instanceof Error
                ? createPatient.error.message
                : "Failed to register patient. Please try again."}
            </p>
          )}
        </form>

        {/* ── Footer actions ────────────────────────────────────────────── */}
        <div className="mt-6 flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={createPatient.isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form={formId}
            loading={createPatient.isPending}
          >
            Register Patient
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
