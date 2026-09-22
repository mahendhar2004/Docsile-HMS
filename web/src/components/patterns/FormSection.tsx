import React from "react"
import { cn } from "@/lib/utils"

interface FormSectionProps {
  /** Section heading, displayed above the fields. */
  title?: string
  /** Optional sub-heading for additional context. */
  description?: string
  /** Form fields to render inside the section. */
  children: React.ReactNode
  className?: string
}

/**
 * Tier 2 — FormSection
 *
 * Layout wrapper for grouping related fields in React Hook Form forms.
 * Provides consistent vertical spacing, heading typography, and optional
 * divider between sections. Works with or without RHF's useFormContext.
 *
 * Usage:
 * ```tsx
 * <FormSection title="Patient Details">
 *   <FormField name="name" ... />
 *   <FormField name="phone" ... />
 * </FormSection>
 * ```
 */
export function FormSection({
  title,
  description,
  children,
  className,
}: FormSectionProps) {
  return (
    <fieldset className={cn("space-y-4", className)}>
      {(title || description) && (
        <legend className="space-y-0.5 mb-3">
          {title && (
            <span className="block text-sm font-semibold text-foreground">
              {title}
            </span>
          )}
          {description && (
            <span className="block text-xs text-muted-foreground">
              {description}
            </span>
          )}
        </legend>
      )}
      {children}
    </fieldset>
  )
}

/**
 * Individual field row with label, input, and error message.
 * Use inside FormSection with React Hook Form.
 */
interface FormFieldRowProps {
  label: string
  /** Input element — typically an Input, Select, or Textarea. */
  children: React.ReactNode
  /** RHF error message for this field. */
  error?: string
  required?: boolean
  /** htmlFor to associate the label with the input. */
  htmlFor?: string
  className?: string
}

export function FormFieldRow({
  label,
  children,
  error,
  required,
  htmlFor,
  className,
}: FormFieldRowProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label
        htmlFor={htmlFor}
        className="block text-sm font-medium text-foreground"
      >
        {label}
        {required && (
          <span className="ml-0.5 text-destructive" aria-hidden>
            *
          </span>
        )}
      </label>
      {children}
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
