import { FormField } from "./form-section"
import { TextInput } from "./text-input"
import { SingleSelect } from "@/components/patterns/selection/single-select"
import { EditableComboboxWithAdd } from "@/components/ui/editable-combobox"
import { cn } from "@/lib/utils"

/** India's 28 states + 8 union territories — a genuinely closed, fixed list. */
const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya",
  "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim",
  "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir",
  "Ladakh", "Lakshadweep", "Puducherry",
] as const

const STATE_OPTIONS = INDIAN_STATES.map((s) => ({ value: s, label: s }))

/**
 * Structured address value — replaces the plain free-text address blob
 * everywhere the system collects a patient's address, so city/state/pincode
 * are real, separately queryable fields for future "where are patients
 * coming from" analytics. All fields optional (an address is never required
 * to register a patient).
 */
export interface AddressValue {
  addressLine?: string | null
  area?: string | null
  city?: string | null
  state?: string | null
  pincode?: string | null
}

export interface AddressFieldsProps {
  value: AddressValue
  onChange: (value: AddressValue) => void
  /** Tenant-editable city list (DropdownOption fieldName="city"), same pattern as Doctor Name/Department. */
  cityOptions?: string[]
  onAddCity?: (city: string) => Promise<void>
  className?: string
}

/**
 * AddressFields — a labeled group of Address Line / Area / City / State /
 * Pincode inputs, styled with this app's own form primitives (FormField +
 * TextInput) so it matches every other form field, not a one-off look.
 */
export function AddressFields({ value, onChange, cityOptions = [], onAddCity, className }: AddressFieldsProps) {
  function set<K extends keyof AddressValue>(key: K, v: string) {
    onChange({ ...value, [key]: v })
  }

  return (
    <div className={cn("grid grid-cols-1 sm:grid-cols-2 gap-4", className)}>
      <FormField label="Address Line" className="sm:col-span-2">
        <TextInput
          value={value.addressLine ?? ""}
          onChange={(e) => set("addressLine", e.target.value)}
          placeholder="Street / house / building"
        />
      </FormField>
      <FormField label="Area">
        <TextInput
          value={value.area ?? ""}
          onChange={(e) => set("area", e.target.value)}
          placeholder="Locality / area"
        />
      </FormField>
      <FormField label="City">
        <EditableComboboxWithAdd
          options={cityOptions}
          value={value.city ?? ""}
          onValueChange={(v) => set("city", v)}
          placeholder="City"
          onAddOption={onAddCity}
          autoUpperCase
        />
      </FormField>
      <FormField label="State">
        <SingleSelect
          options={STATE_OPTIONS}
          value={value.state ?? ""}
          onChange={(v) => set("state", v)}
          placeholder="Select state"
        />
      </FormField>
      <FormField label="Pincode">
        <TextInput
          value={value.pincode ?? ""}
          onChange={(e) => set("pincode", e.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="6-digit pincode"
          inputMode="numeric"
        />
      </FormField>
    </div>
  )
}
