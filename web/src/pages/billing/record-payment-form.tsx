/**
 * billing/record-payment-form.tsx
 *
 * Form for recording an additional payment on a prescription.
 * Uses react-hook-form + zod for validation.
 * Controlled via CurrencyInput (amount) and SingleSelect (payment mode).
 * Permission gate: billing:create — caller must check before rendering.
 */

import { useCallback } from "react"
import { useForm, Controller } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  FormSection,
  FormField,
  CurrencyInput,
  SingleSelect,
} from "@/components/patterns"
import { PAYMENT_MODE_OPTIONS } from "./types"

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  paymentMode: z.string().min(1, "Payment mode is required"),
  amount: z.number().min(0.01, "Amount must be greater than zero"),
})

type FormValues = z.infer<typeof schema>

// ─── Props ────────────────────────────────────────────────────────────────────

interface RecordPaymentFormProps {
  /** Outstanding balance — shown as hint and used for validation ceiling. */
  balanceDue: number
  isSubmitting: boolean
  onSubmit: (values: { paymentMode: string; amount: number }) => void
  onCancel: () => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export function RecordPaymentForm({
  balanceDue,
  isSubmitting,
  onSubmit,
  onCancel,
}: RecordPaymentFormProps) {
  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      paymentMode: "",
      amount: 0,
    },
  })

  const handleCancel = useCallback(() => {
    reset()
    onCancel()
  }, [reset, onCancel])

  function handleFormSubmit(values: FormValues) {
    onSubmit({ paymentMode: values.paymentMode, amount: values.amount })
  }

  const paymentModeOptions = [...PAYMENT_MODE_OPTIONS]

  return (
    <form
      onSubmit={handleSubmit(handleFormSubmit)}
      noValidate
      aria-label="Record payment form"
    >
      <FormSection title="Record Additional Payment">
        {/* Payment mode */}
        <FormField
          label="Payment Mode"
          htmlFor="record-payment-mode"
          required
          error={errors.paymentMode?.message}
        >
          <Controller
            name="paymentMode"
            control={control}
            render={({ field }) => (
              <SingleSelect
                options={paymentModeOptions}
                value={field.value}
                onChange={field.onChange}
                placeholder="Select payment mode"
                error={!!errors.paymentMode}
                aria-label="Payment mode"
              />
            )}
          />
        </FormField>

        {/* Amount */}
        <FormField
          label="Amount"
          htmlFor="record-payment-amount"
          required
          helpText={
            balanceDue > 0
              ? `Outstanding balance: ${new Intl.NumberFormat("en-IN", {
                  style: "currency",
                  currency: "INR",
                  maximumFractionDigits: 0,
                }).format(balanceDue)}`
              : undefined
          }
          error={errors.amount?.message}
        >
          <Controller
            name="amount"
            control={control}
            render={({ field }) => (
              <CurrencyInput
                id="record-payment-amount"
                value={field.value}
                onChange={field.onChange}
                hasError={!!errors.amount}
                aria-label="Payment amount in rupees"
              />
            )}
          />
        </FormField>
      </FormSection>

      {/* Actions */}
      <div className="flex justify-end gap-3 mt-4">
        <Button
          type="button"
          variant="outline"
          onClick={handleCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
          )}
          {isSubmitting ? "Recording…" : "Record Payment"}
        </Button>
      </div>
    </form>
  )
}
