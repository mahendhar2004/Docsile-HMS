import * as React from "react"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

/* ─── FormField ──────────────────────────────────────────────
   Wraps any input with a label, optional help text, and error
   message. Handles id-based aria associations automatically.    */
export interface FormFieldProps {
  label?: string
  htmlFor?: string
  helpText?: string
  error?: string
  required?: boolean
  className?: string
  children: React.ReactNode
}

function FormField({
  label,
  htmlFor,
  helpText,
  error,
  required,
  className,
  children,
}: FormFieldProps) {
  const hasError = Boolean(error)
  const descId = htmlFor ? `${htmlFor}-desc` : undefined
  const errId = htmlFor ? `${htmlFor}-err` : undefined

  const describedBy =
    [helpText && !hasError ? descId : undefined, hasError ? errId : undefined]
      .filter(Boolean)
      .join(" ") || undefined

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <Label htmlFor={htmlFor} required={required}>
          {label}
        </Label>
      )}
      <div aria-describedby={describedBy}>{children}</div>
      {helpText && !hasError && (
        <p id={descId} className="text-[length:var(--text-caption)] text-muted-foreground">
          {helpText}
        </p>
      )}
      {hasError && (
        <p id={errId} role="alert" className="text-[length:var(--text-caption)] text-error">
          {error}
        </p>
      )}
    </div>
  )
}

/* ─── FormFieldRow ───────────────────────────────────────────
   Alias with the same API — gives callers a semantic name that
   reads naturally in form markup (one row = one field).         */
export interface FormFieldRowProps extends FormFieldProps {}

function FormFieldRow(props: FormFieldRowProps) {
  return <FormField {...props} />
}

/* ─── FormSection ────────────────────────────────────────────
   Groups related fields under an optional titled section.      */
export interface FormSectionProps {
  title?: string
  description?: string
  className?: string
  children: React.ReactNode
}

function FormSection({ title, description, className, children }: FormSectionProps) {
  return (
    <section className={cn("space-y-4", className)}>
      {(title || description) && (
        <div className="space-y-0.5 pb-3 border-b border-border">
          {title && (
            <h3 className="text-[length:var(--text-subtitle)] font-semibold text-foreground">{title}</h3>
          )}
          {description && (
            <p className="text-[length:var(--text-caption)] text-muted-foreground">{description}</p>
          )}
        </div>
      )}
      <div className="space-y-4">{children}</div>
    </section>
  )
}

export { FormField, FormFieldRow, FormSection }
