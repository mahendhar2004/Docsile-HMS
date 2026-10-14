/**
 * send-email-form.tsx
 *
 * Dialog for sending a follow-up email to a patient.
 * Fetches available templates from GET /dues-followups/email-templates (lazy,
 * only when the dialog is open). The backend (POST /dues-followups/send-email)
 * resolves the patient's email from their UHID — we do not send the email
 * address in the request body.
 *
 * Permission gate: dues:edit (enforced at the call site — button hidden when absent).
 */

import { useState } from "react"
import { Mail } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { SingleSelect } from "@/components/patterns"
import type { SelectOption } from "@/components/patterns"
import { useEmailTemplates, useSendEmail } from "./hooks"
import type { FollowUpRecord } from "./types"

interface SendEmailFormProps {
  /** The follow-up record whose patient will receive the email. */
  record: FollowUpRecord
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SendEmailForm({ record, open, onOpenChange }: SendEmailFormProps) {
  const [templateId, setTemplateId] = useState("")

  // Fetch templates lazily — only when the dialog is open.
  const { data: templates = [], isLoading: templatesLoading } = useEmailTemplates(open)

  const sendEmail = useSendEmail(() => {
    setTemplateId("")
    onOpenChange(false)
  })

  const templateOptions: SelectOption[] = templates.map((t) => ({
    value: t.code,
    label: t.name,
  }))

  function handleSend() {
    if (!templateId) return
    sendEmail.mutate({
      patientId: record.patientId,
      templateId,
      followUpDate: record.followUpDate,
    })
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setTemplateId("")
    }
    onOpenChange(nextOpen)
  }

  const canSend = templateId !== "" && record.email != null && !sendEmail.isPending

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            Send Email to {record.patientName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Recipient */}
          <div>
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">To: </span>
              {record.email != null ? (
                record.email
              ) : (
                <span className="text-red-600">
                  No email on record — update the patient before sending.
                </span>
              )}
            </p>
          </div>

          {/* Template picker */}
          <div className="space-y-1.5">
            <Label htmlFor="email-template-select">Template</Label>
            {templatesLoading ? (
              <p className="text-sm text-muted-foreground">Loading templates…</p>
            ) : templates.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No email templates available. Configure them in the Sitha AI service.
              </p>
            ) : (
              <SingleSelect
                options={templateOptions}
                value={templateId}
                onChange={setTemplateId}
                placeholder="Select a template"
                aria-label="Email template"
                disabled={record.email == null}
              />
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={sendEmail.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={!canSend}
          >
            {sendEmail.isPending ? "Sending…" : "Send Email"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
