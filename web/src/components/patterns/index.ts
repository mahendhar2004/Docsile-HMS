// Tier 2 — composite, business-agnostic pattern components (barrel export)

export { EmptyState } from "./EmptyState"
export { ErrorState } from "./ErrorState"

// Forms
export { FormField, FormFieldRow, FormSection } from "./forms"
export type { FormFieldProps, FormFieldRowProps, FormSectionProps } from "./forms"
export { TextInput, NumberInput, CurrencyInput, PhoneInput } from "./forms"
export type {
  TextInputProps,
  TextInputType,
  TextInputSize,
  NumberInputProps,
  NumberInputVariant,
  NumberInputSize,
  CurrencyInputProps,
  CurrencyInputSize,
  PhoneInputProps,
  PhoneInputSize,
} from "./forms"

// Selection
export { SingleSelect, MultiSelect } from "./selection"
export type { SingleSelectProps, SelectOption, MultiSelectProps, MultiSelectOption } from "./selection"

// Status, chips & badges
export { StatusPill, FilterChip, RemovableChip, STATUS_MAP, resolveStatus } from "./status"
export type { StatusPillProps, FilterChipProps, RemovableChipProps, SemanticBucket, StatusEntry } from "./status"

// Modals & overlays
export { ConfirmationModal, DataModal } from "./modals"
export type { ConfirmationModalProps, ConfirmationVariant, DataModalProps } from "./modals"

// Toggles
export { SegmentedControl } from "./toggles"
export type { SegmentedControlProps, SegmentOption } from "./toggles"

// Date & time
export * from "./date-time"

// Navigation
export { Sidebar, Breadcrumbs, PageHeader } from "./navigation"
export type { SidebarProps, BreadcrumbsProps, BreadcrumbItem, PageHeaderProps } from "./navigation"

// Tables
export { DataTable, PaginatedDataTable } from "./tables"
export type { ColumnDef, DataTableVariant, DataTableProps, PaginatedDataTableProps } from "./tables"

// Search
export { SearchBar } from "./search"
export type { SearchBarProps, SearchBarVariant, Suggestion } from "./search"
export type { FilterChip as SearchFilterChip } from "./search"
