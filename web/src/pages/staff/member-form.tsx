/**
 * staff/member-form.tsx
 *
 * Dialog form for creating or editing a staff member.
 * All 15 API fields are collected: name, email, password (create only),
 * role, employeeId, phone, department, designation, qualifications,
 * joiningDate, address, emergencyContact, bloodGroup, salary, salaryType.
 *
 * Enum values are the verified constants from types.ts (sourced from
 * src/app/(hospital)/staff/components/StaffPage.tsx — not invented).
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
import { TextInput, CurrencyInput } from "@/components/patterns/forms"
import { SingleSelect } from "@/components/patterns/selection"
import { useCreateMember, useUpdateMember } from "./hooks"
import {
  BLOOD_GROUP_OPTIONS,
  DEPARTMENT_OPTIONS,
  SALARY_TYPE_OPTIONS,
  type StaffMember,
  type StaffRole,
} from "./types"

// ─── Props ────────────────────────────────────────────────────────────────────

interface MemberFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** When provided, the form is in edit mode — fields pre-fill from this member. */
  member?: StaffMember | null
  /** Available roles for the role selector. Falls back to default system role names. */
  roles: StaffRole[]
}

// ─── Form state ───────────────────────────────────────────────────────────────

interface FormState {
  name: string
  email: string
  password: string
  role: string
  employeeId: string
  phone: string
  department: string
  designation: string
  qualifications: string
  joiningDate: string
  address: string
  emergencyContact: string
  bloodGroup: string
  salary: number
  salaryType: string
}

const EMPTY_FORM: FormState = {
  name: "",
  email: "",
  password: "",
  role: "RECEPTIONIST",
  employeeId: "",
  phone: "",
  department: "",
  designation: "",
  qualifications: "",
  joiningDate: "",
  address: "",
  emergencyContact: "",
  bloodGroup: "",
  salary: 0,
  salaryType: "",
}

function memberToForm(m: StaffMember): FormState {
  return {
    name: m.fullName,
    email: m.email,
    password: "",
    role: m.role,
    employeeId: m.employeeId ?? "",
    phone: m.phone ?? "",
    department: m.department ?? "",
    designation: m.designation ?? "",
    qualifications: m.qualifications ?? "",
    joiningDate: m.joiningDate ?? "",
    address: m.address ?? "",
    emergencyContact: m.emergencyContact ?? "",
    bloodGroup: m.bloodGroup ?? "",
    salary: m.salary ?? 0,
    salaryType: m.salaryType ?? "",
  }
}

// ─── Validation ───────────────────────────────────────────────────────────────

interface FormErrors {
  name?: string
  email?: string
  password?: string
  role?: string
}

function validate(form: FormState, isEdit: boolean): FormErrors {
  const errors: FormErrors = {}
  if (!form.name.trim()) errors.name = "Full name is required."
  if (!form.email.trim()) errors.email = "Email is required."
  if (!isEdit && !form.password) errors.password = "Password is required."
  if (!isEdit && form.password && form.password.length < 6)
    errors.password = "Password must be at least 6 characters."
  if (!form.role) errors.role = "Role is required."
  return errors
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MemberForm({ open, onOpenChange, member, roles }: MemberFormProps) {
  const isEdit = member != null

  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [errors, setErrors] = useState<FormErrors>({})

  // Re-populate when member changes or dialog opens
  useEffect(() => {
    if (open) {
      setForm(member ? memberToForm(member) : EMPTY_FORM)
      setErrors({})
    }
  }, [open, member])

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const createMember = useCreateMember(() => onOpenChange(false))
  const updateMember = useUpdateMember(member?.id ?? "", () => onOpenChange(false))

  const isPending = createMember.isPending || updateMember.isPending

  function handleSubmit() {
    const errs = validate(form, isEdit)
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }
    setErrors({})

    if (isEdit) {
      updateMember.mutate({
        name: form.name.trim() || undefined,
        email: form.email.trim() || undefined,
        role: form.role || undefined,
        employeeId: form.employeeId.trim() || null,
        phone: form.phone.trim() || null,
        department: form.department || null,
        designation: form.designation.trim() || null,
        qualifications: form.qualifications.trim() || null,
        joiningDate: form.joiningDate || null,
        address: form.address.trim() || null,
        emergencyContact: form.emergencyContact.trim() || null,
        bloodGroup: form.bloodGroup || null,
        salary: form.salary > 0 ? form.salary : null,
        salaryType: form.salaryType || null,
      })
    } else {
      createMember.mutate({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
        employeeId: form.employeeId.trim() || null,
        phone: form.phone.trim() || null,
        department: form.department || null,
        designation: form.designation.trim() || null,
        qualifications: form.qualifications.trim() || null,
        joiningDate: form.joiningDate || null,
        address: form.address.trim() || null,
        emergencyContact: form.emergencyContact.trim() || null,
        bloodGroup: form.bloodGroup || null,
        salary: form.salary > 0 ? form.salary : null,
        salaryType: form.salaryType || null,
      })
    }
  }

  // Build role options from available roles, or fall back to default system names
  const roleOptions =
    roles.length > 0
      ? roles.map((r) => ({ value: r.name, label: r.displayName }))
      : [
          { value: "ADMIN", label: "Admin" },
          { value: "DOCTOR", label: "Doctor" },
          { value: "RECEPTIONIST", label: "Receptionist" },
          { value: "OPTOMETRIST", label: "Optometrist" },
          { value: "NURSE", label: "Nurse" },
        ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Staff Member" : "Add New Staff Member"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* ── Basic Info ── */}
          <FormSection title="Basic Information">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                label="Full Name"
                htmlFor="staff-name"
                required
                error={errors.name}
              >
                <TextInput
                  id="staff-name"
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="e.g. Dr. Arjun Sharma"
                  hasError={!!errors.name}
                  aria-required="true"
                />
              </FormField>

              <FormField
                label="Email"
                htmlFor="staff-email"
                required
                error={errors.email}
              >
                <TextInput
                  id="staff-email"
                  inputType="email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  placeholder="staff@hospital.com"
                  hasError={!!errors.email}
                  aria-required="true"
                  disabled={isEdit}
                />
              </FormField>

              {!isEdit && (
                <FormField
                  label="Password"
                  htmlFor="staff-password"
                  required
                  helpText="Minimum 6 characters"
                  error={errors.password}
                >
                  <TextInput
                    id="staff-password"
                    inputType="password"
                    value={form.password}
                    onChange={(e) => set("password", e.target.value)}
                    placeholder="Minimum 6 characters"
                    hasError={!!errors.password}
                    aria-required="true"
                  />
                </FormField>
              )}

              <FormField
                label="Role"
                htmlFor="staff-role"
                required
                error={errors.role}
              >
                <SingleSelect
                  options={roleOptions}
                  value={form.role}
                  onChange={(v) => set("role", v)}
                  placeholder="Select role"
                  aria-label="Staff role"
                />
              </FormField>

              <FormField label="Phone" htmlFor="staff-phone">
                <TextInput
                  id="staff-phone"
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  placeholder="e.g. 9876543210"
                />
              </FormField>

              <FormField label="Employee ID" htmlFor="staff-emp-id">
                <TextInput
                  id="staff-emp-id"
                  value={form.employeeId}
                  onChange={(e) => set("employeeId", e.target.value)}
                  placeholder="e.g. EMP-001"
                />
              </FormField>
            </div>
          </FormSection>

          {/* ── Professional Info ── */}
          <FormSection title="Professional Details">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Department" htmlFor="staff-department">
                <SingleSelect
                  options={DEPARTMENT_OPTIONS}
                  value={form.department}
                  onChange={(v) => set("department", v)}
                  placeholder="Select department"
                  clearable
                  aria-label="Department"
                />
              </FormField>

              <FormField label="Designation" htmlFor="staff-designation">
                <TextInput
                  id="staff-designation"
                  value={form.designation}
                  onChange={(e) => set("designation", e.target.value)}
                  placeholder="e.g. Senior Consultant"
                />
              </FormField>

              <FormField label="Qualifications" htmlFor="staff-qualifications">
                <TextInput
                  id="staff-qualifications"
                  value={form.qualifications}
                  onChange={(e) => set("qualifications", e.target.value)}
                  placeholder="e.g. MBBS, MS Ophthalmology"
                />
              </FormField>

              <FormField label="Date of Joining" htmlFor="staff-joining-date">
                <input
                  id="staff-joining-date"
                  type="date"
                  value={form.joiningDate}
                  onChange={(e) => set("joiningDate", e.target.value)}
                  className="flex h-10 w-full rounded-sm border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Date of joining"
                />
              </FormField>
            </div>
          </FormSection>

          {/* ── Personal Info ── */}
          <FormSection title="Personal Information">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Blood Group" htmlFor="staff-blood-group">
                <SingleSelect
                  options={BLOOD_GROUP_OPTIONS}
                  value={form.bloodGroup}
                  onChange={(v) => set("bloodGroup", v)}
                  placeholder="Select blood group"
                  clearable
                  aria-label="Blood group"
                />
              </FormField>

              <FormField label="Emergency Contact" htmlFor="staff-emergency-contact">
                <TextInput
                  id="staff-emergency-contact"
                  value={form.emergencyContact}
                  onChange={(e) => set("emergencyContact", e.target.value)}
                  placeholder="Phone or name"
                />
              </FormField>

              <FormField
                label="Address"
                htmlFor="staff-address"
                className="sm:col-span-2"
              >
                <Textarea
                  id="staff-address"
                  value={form.address}
                  onChange={(e) => set("address", e.target.value)}
                  rows={2}
                  placeholder="Full address"
                />
              </FormField>
            </div>
          </FormSection>

          {/* ── Salary ── */}
          <FormSection title="Compensation">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Salary" htmlFor="staff-salary">
                <CurrencyInput
                  id="staff-salary"
                  value={form.salary}
                  onChange={(v) => set("salary", v)}
                  placeholder="0"
                />
              </FormField>

              <FormField label="Salary Type" htmlFor="staff-salary-type">
                <SingleSelect
                  options={SALARY_TYPE_OPTIONS}
                  value={form.salaryType}
                  onChange={(v) => set("salaryType", v)}
                  placeholder="Select type"
                  clearable
                  aria-label="Salary type"
                />
              </FormField>
            </div>
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
            {isPending ? "Saving…" : isEdit ? "Update Member" : "Add Member"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
