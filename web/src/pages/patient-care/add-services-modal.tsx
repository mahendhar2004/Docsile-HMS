/**
 * AddServicesModal
 *
 * Dialog for adding a service to a patient
 * (POST /patient-care/patients/{id}/services).
 *
 * Fetches service templates from registration-form reference data.
 * Permission guard: billing:create — caller must gate before rendering.
 */

import { useEffect, useId } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
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
  CurrencyInput,
  SingleSelect,
} from "@/components/patterns"
import { useAddService, useRegistrationForm } from "./hooks"
import type { Patient } from "./types"

// ─── Zod schema ───────────────────────────────────────────────────────────────

const schema = z.object({
  serviceTemplateId: z.string().min(1, "Service is required"),
  paymentMode: z.string().min(1, "Payment mode is required"),
  amount: z.number({ error: "Enter a valid amount" }).positive("Amount must be positive").optional(),
})

type FormValues = z.infer<typeof schema>

// ─── Static options ───────────────────────────────────────────────────────────

const PAYMENT_MODE_OPTIONS = [
  { value: "Cash", label: "Cash" },
  { value: "Card", label: "Card" },
  { value: "UPI", label: "UPI" },
  { value: "Insurance", label: "Insurance" },
  { value: "Cheque", label: "Cheque" },
]

// ─── Component ────────────────────────────────────────────────────────────────

export interface AddServicesModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  patient: Patient
  onSuccess: () => void
}

export function AddServicesModal({
  open,
  onOpenChange,
  patient,
  onSuccess,
}: AddServicesModalProps) {
  const formId = useId()

  const { data: formData } = useRegistrationForm()
  const addService = useAddService(patient.id, () => {
    onSuccess()
    onOpenChange(false)
  })

  const serviceOptions = (formData?.serviceTemplates ?? []).map((t) => ({
    value: t.id,
    label: `${t.name}${t.amount ? ` — ₹${t.amount}` : ""}`,
  }))

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  // Pre-fill amount when user selects a service template.
  const selectedTemplateId = watch("serviceTemplateId")
  useEffect(() => {
    const template = formData?.serviceTemplates?.find((t) => t.id === selectedTemplateId)
    if (template?.amount) {
      setValue("amount", template.amount)
    }
  }, [selectedTemplateId, formData, setValue])

  // Reset form when dialog opens.
  useEffect(() => {
    if (open) {
      reset()
      addService.reset()
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  function onSubmit(values: FormValues) {
    addService.mutate({
      serviceTemplateId: values.serviceTemplateId,
      paymentMode: values.paymentMode,
      amount: values.amount,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Add Service</DialogTitle>
          <DialogDescription>
            Adding service for {patient.firstName} {patient.lastName} ({patient.patientId})
          </DialogDescription>
        </DialogHeader>

        <form id={formId} onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-5">
          <FormSection>
            <FormField
              label="Service"
              htmlFor={`${formId}-service`}
              required
              error={errors.serviceTemplateId?.message}
            >
              <Controller
                name="serviceTemplateId"
                control={control}
                render={({ field }) => (
                  <SingleSelect
                    options={
                      serviceOptions.length > 0
                        ? serviceOptions
                        : [{ value: "custom", label: "Custom Service" }]
                    }
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    placeholder="Select service template"
                    error={Boolean(errors.serviceTemplateId)}
                  />
                )}
              />
            </FormField>

            <FormField
              label="Payment Mode"
              htmlFor={`${formId}-payMode`}
              required
              error={errors.paymentMode?.message}
            >
              <Controller
                name="paymentMode"
                control={control}
                render={({ field }) => (
                  <SingleSelect
                    options={PAYMENT_MODE_OPTIONS}
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    placeholder="Select payment mode"
                    error={Boolean(errors.paymentMode)}
                  />
                )}
              />
            </FormField>

            <FormField
              label="Amount (₹)"
              htmlFor={`${formId}-amount`}
              error={errors.amount?.message}
              helpText="Leave blank to use the template default"
            >
              <Controller
                name="amount"
                control={control}
                render={({ field }) => (
                  <CurrencyInput
                    id={`${formId}-amount`}
                    value={field.value}
                    onChange={(v) => field.onChange(v)}
                    placeholder="0.00"
                    hasError={Boolean(errors.amount)}
                  />
                )}
              />
            </FormField>
          </FormSection>

          {addService.isError && (
            <p role="alert" className="text-sm text-[var(--color-error)]">
              {addService.error instanceof Error
                ? addService.error.message
                : "Failed to add service. Please try again."}
            </p>
          )}
        </form>

        <div className="mt-6 flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={addService.isPending}
          >
            Cancel
          </Button>
          <Button type="submit" form={formId} loading={addService.isPending}>
            Add Service
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
