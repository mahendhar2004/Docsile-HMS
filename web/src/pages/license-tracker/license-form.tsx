/**
 * LicenseForm — create / edit dialog.
 *
 * Fields match old app LicenseForm.tsx exactly:
 *   name (required), licenseNumber, issuingBody (label: "Issuing Authority"),
 *   category (SingleSelect from LICENSE_CATEGORIES), issueDate (date, max=today),
 *   expiryDate (date, required), reminderDays (number, default 30), notes (textarea).
 *
 * Source: src/app/(hospital)/license-tracker/components/LicenseForm.tsx
 */

import { useEffect, useState } from "react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { FormField, SingleSelect } from "@/components/patterns"
import type { SelectOption } from "@/components/patterns"
import { todayISO } from "@/lib/utils"
import { useCreateLicense, useUpdateLicense } from "./hooks"
import { LICENSE_CATEGORIES } from "./types"
import type { CreateLicenseBody, License } from "./types"

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_OPTIONS: SelectOption[] = LICENSE_CATEGORIES.map((c) => ({
  value: c,
  label: c,
}))

// ─── Props ────────────────────────────────────────────────────────────────────

interface LicenseFormProps {
  /** When provided, the dialog operates in edit mode (PATCH). Null = create mode (POST). */
  license: License | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Format a date string (or Date) as YYYY-MM-DD in IST — matches old app date inputs. */
function toISTDate(value: string | Date | null | undefined): string {
  if (!value) return ""
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(
    new Date(value as string),
  )
}

// ─── LicenseForm ──────────────────────────────────────────────────────────────

export function LicenseForm({ license, open, onOpenChange }: LicenseFormProps) {
  const isEdit = license != null
  const create = useCreateLicense()
  const update = useUpdateLicense()
  const isPending = create.isPending || update.isPending

  // ── Form state (matches old app local-state pattern exactly) ─────────────────
  const [name, setName] = useState("")
  const [licenseNumber, setLicenseNumber] = useState("")
  const [issuingBody, setIssuingBody] = useState("")
  const [category, setCategory] = useState("")
  const [issueDate, setIssueDate] = useState("")
  const [expiryDate, setExpiryDate] = useState("")
  const [reminderDays, setReminderDays] = useState("30")
  const [notes, setNotes] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Reset form fields whenever the dialog opens (or the target license changes)
  useEffect(() => {
    if (!open) return
    setName(license?.name ?? "")
    setLicenseNumber(license?.licenseNumber ?? "")
    setIssuingBody(license?.issuingBody ?? "")
    setCategory(license?.category ?? "")
    setIssueDate(toISTDate(license?.issueDate))
    setExpiryDate(toISTDate(license?.expiryDate))
    setReminderDays(license?.reminderDays?.toString() ?? "30")
    setNotes(license?.notes ?? "")
    setErrors({})
  }, [open, license])

  // ── Validation ────────────────────────────────────────────────────────────────

  function validate(): boolean {
    const errs: Record<string, string> = {}
    if (!name.trim()) errs.name = "License name is required"
    if (!expiryDate) errs.expiryDate = "Expiry date is required"
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  // ── Submit ───────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    const body: CreateLicenseBody = {
      name: name.trim(),
      licenseNumber: licenseNumber.trim() || undefined,
      issuingBody: issuingBody.trim() || undefined,
      category: category || undefined,
      issueDate: issueDate || undefined,
      expiryDate,
      reminderDays: parseInt(reminderDays, 10) || 30,
      notes: notes.trim() || undefined,
    }

    try {
      if (isEdit) {
        await update.mutateAsync({ id: license.id, body })
        toast.success("License updated successfully")
      } else {
        await create.mutateAsync(body)
        toast.success("License added successfully")
      }
      onOpenChange(false)
    } catch {
      toast.error(isEdit ? "Failed to update license" : "Failed to add license")
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit License" : "Add New License"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2" noValidate>
          {/* License Name */}
          <FormField
            label="License Name"
            htmlFor="lic-name"
            required
            error={errors.name}
          >
            <Input
              id="lic-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setErrors((p) => ({ ...p, name: "" }))
              }}
              placeholder="e.g. Drug License, Fire NOC"
            />
          </FormField>

          {/* License Number */}
          <FormField label="License Number" htmlFor="lic-number">
            <Input
              id="lic-number"
              value={licenseNumber}
              onChange={(e) => setLicenseNumber(e.target.value)}
              placeholder="Enter license/registration number"
            />
          </FormField>

          {/* Issuing Authority (DB field: issuingBody) */}
          <FormField label="Issuing Authority" htmlFor="lic-issuing">
            <Input
              id="lic-issuing"
              value={issuingBody}
              onChange={(e) => setIssuingBody(e.target.value)}
              placeholder="e.g. State Drug Controller, Fire Department"
            />
          </FormField>

          {/* Category */}
          <FormField label="Category" htmlFor="lic-category">
            <SingleSelect
              options={CATEGORY_OPTIONS}
              value={category}
              onChange={setCategory}
              placeholder="Select category"
            />
          </FormField>

          {/* Issue Date + Expiry Date — 2-col grid matching old app */}
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Issue Date" htmlFor="lic-issue-date">
              <Input
                id="lic-issue-date"
                type="date"
                value={issueDate}
                max={todayISO()}
                onChange={(e) => setIssueDate(e.target.value)}
              />
            </FormField>

            <FormField
              label="Expiry Date"
              htmlFor="lic-expiry-date"
              required
              error={errors.expiryDate}
            >
              <Input
                id="lic-expiry-date"
                type="date"
                value={expiryDate}
                onChange={(e) => {
                  setExpiryDate(e.target.value)
                  setErrors((p) => ({ ...p, expiryDate: "" }))
                }}
              />
            </FormField>
          </div>

          {/* Reminder Days */}
          <FormField
            label="Remind Before (days)"
            htmlFor="lic-reminder"
            helpText="A warning is shown this many days before expiry."
          >
            <Input
              id="lic-reminder"
              type="number"
              min={1}
              value={reminderDays}
              onChange={(e) => setReminderDays(e.target.value)}
              placeholder="30"
            />
          </FormField>

          {/* Notes */}
          <FormField label="Notes" htmlFor="lic-notes">
            <Textarea
              id="lic-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional details..."
              rows={3}
            />
          </FormField>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending
                ? "Saving..."
                : isEdit
                  ? "Update License"
                  : "Add License"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
