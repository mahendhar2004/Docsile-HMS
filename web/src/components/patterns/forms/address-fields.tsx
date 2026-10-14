import { FormField } from "./form-section"
import { EditableComboboxWithAdd } from "@/components/ui/editable-combobox"

export interface AddressFieldsProps {
  value: string | null | undefined
  onChange: (value: string) => void
  /** Tenant-editable address list (DropdownOption fieldName="address"), same pattern as Doctor Name/Department — matches main's real registration form exactly. */
  options?: string[]
  onAddOption?: (value: string) => Promise<void>
  className?: string
}

/**
 * AddressFields — a single free-text "Address" field with tenant-editable
 * autocomplete (e.g. "Gachibowli", "Gowlidoddy" typed once reappear as
 * suggestions for every later patient), matching main's real
 * PatientRegistrationStepper exactly: one `EditableComboboxWithAdd` field,
 * not a structured Address Line/Area/City/State/Pincode breakdown.
 */
export function AddressFields({ value, onChange, options = [], onAddOption, className }: AddressFieldsProps) {
  return (
    <FormField label="Address" className={className}>
      <EditableComboboxWithAdd
        options={options}
        value={value ?? ""}
        onValueChange={onChange}
        placeholder="Patient address / region"
        onAddOption={onAddOption}
      />
    </FormField>
  )
}
