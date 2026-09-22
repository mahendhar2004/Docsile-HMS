/**
 * patterns/selection/single-select.tsx
 *
 * SingleSelect: a searchable single-choice dropdown built on
 * ui/combobox.tsx (Popover) + ui/command.tsx (cmdk).
 *
 * Sizes: sm | md (default) | lg
 * States: default | focus | error | disabled
 *
 * Controlled — the parent owns `value` and handles `onChange`.
 *
 * Usage:
 *   const options = [
 *     { value: "OPD", label: "Out-Patient" },
 *     { value: "IPD", label: "In-Patient" },
 *   ]
 *   <SingleSelect
 *     options={options}
 *     value={patientType}
 *     onChange={setPatientType}
 *     placeholder="Select patient type"
 *   />
 */

import * as React from "react"
import { Check, ChevronsUpDown, X } from "lucide-react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import {
  ComboboxContent,
  ComboboxRoot,
  ComboboxTrigger,
} from "@/components/ui/combobox"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"

/* ─── Option type ───────────────────────────────────────────────────────────── */

export interface SelectOption {
  value: string
  label: string
  /** Optional: disable this specific option */
  disabled?: boolean
}

/* ─── Trigger size variants ─────────────────────────────────────────────────── */

const triggerVariants = cva(
  [
    // Layout
    "flex w-full items-center justify-between gap-2 whitespace-nowrap",
    // Surface
    "rounded-[--radius] border border-[--color-border] bg-[--color-surface]",
    "text-[--color-foreground]",
    // Focus (passed via data attr from Popover.Trigger)
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-[--color-ring] focus-visible:ring-offset-1",
    // Disabled
    "disabled:cursor-not-allowed disabled:opacity-50",
    // Motion
    "motion-interactive",
  ].join(" "),
  {
    variants: {
      size: {
        sm: "h-8 px-2.5 text-xs",
        md: "h-10 px-3 text-sm",
        lg: "h-12 px-4 text-base",
      },
      error: {
        true: "border-[--color-error] focus-visible:ring-[--color-error]",
        false: "",
      },
    },
    defaultVariants: {
      size: "md",
      error: false,
    },
  }
)

/* ─── Props ─────────────────────────────────────────────────────────────────── */

export interface SingleSelectProps
  extends Pick<VariantProps<typeof triggerVariants>, "size"> {
  options: SelectOption[]
  /** Currently selected value — pass empty string for "nothing selected" */
  value: string
  onChange: (value: string) => void
  placeholder?: string
  /** Renders trigger with error ring */
  error?: boolean
  disabled?: boolean
  /** Allow clearing the selection via a × button */
  clearable?: boolean
  /** aria-label for the trigger button */
  "aria-label"?: string
  /** Text shown in search input placeholder */
  searchPlaceholder?: string
  /** Text shown when no options match the search */
  emptyText?: string
  className?: string
  /** Width of the dropdown (defaults to "match" → match trigger width) */
  contentWidth?: "match" | "auto"
}

/* ─── Component ─────────────────────────────────────────────────────────────── */

const SingleSelect = React.forwardRef<HTMLButtonElement, SingleSelectProps>(
  (
    {
      options,
      value,
      onChange,
      placeholder = "Select…",
      error = false,
      disabled = false,
      clearable = false,
      size = "md",
      searchPlaceholder = "Search…",
      emptyText = "No options found.",
      className,
      contentWidth = "match",
      "aria-label": ariaLabel,
    },
    ref
  ) => {
    const [open, setOpen] = React.useState(false)

    const selectedOption = options.find((opt) => opt.value === value) ?? null

    const handleSelect = React.useCallback(
      (selectedValue: string) => {
        onChange(selectedValue === value ? "" : selectedValue)
        setOpen(false)
      },
      [onChange, value]
    )

    const handleClear = React.useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation()
        onChange("")
      },
      [onChange]
    )

    return (
      <ComboboxRoot open={open} onOpenChange={setOpen}>
        <ComboboxTrigger asChild>
          <button
            ref={ref}
            type="button"
            role="combobox"
            aria-expanded={open}
            aria-haspopup="listbox"
            aria-label={ariaLabel}
            disabled={disabled}
            className={cn(triggerVariants({ size, error }), className)}
          >
            <span
              className={cn(
                "flex-1 truncate text-left",
                !selectedOption && "text-[--color-muted-foreground]"
              )}
            >
              {selectedOption ? selectedOption.label : placeholder}
            </span>

            <span className="flex shrink-0 items-center gap-1">
              {clearable && selectedOption && (
                <span
                  role="button"
                  tabIndex={0}
                  aria-label="Clear selection"
                  onClick={handleClear}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault()
                      onChange("")
                    }
                  }}
                  className={cn(
                    "flex h-4 w-4 items-center justify-center rounded-full",
                    "text-[--color-muted-foreground] hover:text-[--color-foreground]",
                    "motion-interactive"
                  )}
                >
                  <X className="h-3 w-3" aria-hidden="true" />
                </span>
              )}
              <ChevronsUpDown className="h-4 w-4 text-[--color-muted-foreground]" aria-hidden="true" />
            </span>
          </button>
        </ComboboxTrigger>

        <ComboboxContent
          className={cn(
            contentWidth === "match" && "w-[var(--radix-popover-trigger-width)]",
            "shadow-[--shadow-popover] rounded-[--radius-md]"
          )}
        >
          <Command>
            <CommandInput placeholder={searchPlaceholder} />
            <CommandList>
              <CommandEmpty>{emptyText}</CommandEmpty>
              <CommandGroup>
                {options.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    keywords={[option.label]}
                    disabled={option.disabled}
                    onSelect={handleSelect}
                    aria-selected={option.value === value}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4 shrink-0",
                        option.value === value ? "opacity-100" : "opacity-0"
                      )}
                      aria-hidden="true"
                    />
                    {option.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </ComboboxContent>
      </ComboboxRoot>
    )
  }
)
SingleSelect.displayName = "SingleSelect"

export { SingleSelect }
