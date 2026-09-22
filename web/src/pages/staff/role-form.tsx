/**
 * staff/role-form.tsx
 *
 * Dialog for creating or editing a role's metadata (name, displayName, description).
 * Permission management (toggling individual permissions per role) is handled
 * separately in roles-tab.tsx via the permission grid.
 */

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { FormField, FormSection } from "@/components/patterns/forms"
import { TextInput } from "@/components/patterns/forms"
import { useCreateRole, useUpdateRole } from "./hooks"
import type { StaffRole } from "./types"

// ─── Props ────────────────────────────────────────────────────────────────────

interface RoleFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** When provided, the form is in edit mode. */
  role?: StaffRole | null
}

// ─── Form state ───────────────────────────────────────────────────────────────

interface FormState {
  name: string
  displayName: string
  description: string
}

const EMPTY: FormState = { name: "", displayName: "", description: "" }

function roleToForm(r: StaffRole): FormState {
  return {
    name: r.name,
    displayName: r.displayName,
    description: r.description ?? "",
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function RoleForm({ open, onOpenChange, role }: RoleFormProps) {
  const isEdit = role != null

  const [form, setForm] = useState<FormState>(EMPTY)
  const [errors, setErrors] = useState<Partial<FormState>>({})

  useEffect(() => {
    if (open) {
      setForm(role ? roleToForm(role) : EMPTY)
      setErrors({})
    }
  }, [open, role])

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const createRole = useCreateRole(() => onOpenChange(false))
  const updateRole = useUpdateRole(role?.id ?? "", () => onOpenChange(false))

  const isPending = createRole.isPending || updateRole.isPending

  function handleSubmit() {
    const errs: Partial<FormState> = {}
    if (!isEdit && !form.name.trim()) errs.name = "Role name is required."
    if (!form.displayName.trim()) errs.displayName = "Display name is required."
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }
    setErrors({})

    if (isEdit) {
      updateRole.mutate({
        displayName: form.displayName.trim(),
        description: form.description.trim() || null,
      })
    } else {
      createRole.mutate({
        name: form.name.trim().toUpperCase().replace(/\s+/g, "_"),
        displayName: form.displayName.trim(),
        description: form.description.trim() || null,
        permissions: [],
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Role" : "Create New Role"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <FormSection>
            {!isEdit && (
              <FormField
                label="Role Name"
                htmlFor="role-name"
                required
                helpText="Uppercase identifier, no spaces (e.g. LAB_TECHNICIAN). Cannot be changed after creation."
                error={errors.name}
              >
                <TextInput
                  id="role-name"
                  value={form.name}
                  onChange={(e) =>
                    set("name", e.target.value.toUpperCase().replace(/\s+/g, "_"))
                  }
                  placeholder="e.g. LAB_TECHNICIAN"
                  hasError={!!errors.name}
                  aria-required="true"
                />
              </FormField>
            )}

            <FormField
              label="Display Name"
              htmlFor="role-display-name"
              required
              error={errors.displayName}
            >
              <TextInput
                id="role-display-name"
                value={form.displayName}
                onChange={(e) => set("displayName", e.target.value)}
                placeholder="e.g. Lab Technician"
                hasError={!!errors.displayName}
                aria-required="true"
              />
            </FormField>

            <FormField label="Description" htmlFor="role-description">
              <Textarea
                id="role-description"
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder="Brief description of what this role does"
                rows={2}
              />
            </FormField>
          </FormSection>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Saving…" : isEdit ? "Update Role" : "Create Role"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
