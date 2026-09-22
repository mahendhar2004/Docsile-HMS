/**
 * patterns/selection/multi-select.tsx
 *
 * MultiSelect: a searchable multi-choice dropdown. Selected items render as
 * RemovableChip tokens either inside the trigger or below it. Built on
 * ui/combobox.tsx (Popover) + ui/command.tsx (cmdk).
 *
 * Sizes: sm | md (default) | lg
 * States: default | focus | error | disabled
 *
 * Controlled — the parent owns `values` (string[]) and handles `onChange`.
 *
 * Usage:
 *   const options = [
 *     { value: "MALE", label: "Male" },
 *     { value: "FEMALE", label: "Female" },
 *     { value: "OTHER", label: "Other" },
 *   ]
 *   <MultiSelect
 *     options={options}
 *     values={selectedGenders}
 *     onChange={setSelectedGenders}
 *     placeholder="Select genders"
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
import { RemovableChip } from "@/components/patterns/status/removable-chip"

/* ─── Option type ───────────────────────────────────────────────────────────── */

export interface MultiSelectOption {
  value: string
  label: string
  disabled?: boolean
}

/* ─── Trigger variants ──────────────────────────────────────────────────────── */

const triggerWrapperVariants = cva(
  [
    "relative flex w-full flex-wrap items-center gap-1",
    "rounded-[--radius] border border-[--color-border] bg-[--color-surface]",
    "text-[--color-foreground]",
    "cursor-pointer",
    "motion-interactive",
  ].join(" "),
  {
    variants: {
      size: {
        sm: "min-h-8 px-2.5 py-1 text-xs",
        md: "min-h-10 px-3 py-1.5 text-sm",
        lg: "min-h-12 px-4 py-2 text-base",
      },
      error: {
        true: "border-[--color-error]",
        false: "",
      },
      open: {
        true: "ring-2 ring-[--color-ring] ring-offset-1",
        false: "",
      },
      disabled: {
        true: "cursor-not-allowed opacity-50",
        false: "",
      },
    },
    defaultVariants: {
      size: "md",
      error: false,
      open: false,
      disabled: false,
    },
  }
)

/* ─── Props ─────────────────────────────────────────────────────────────────── */

export interface MultiSelectProps
  extends Pick<VariantProps<typeof triggerWrapperVariants>, "size"> {
  options: MultiSelectOption[]
  /** Currently selected values */
  values: string[]
  onChange: (values: string[]) => void
  placeholder?: string
  error?: boolean
  disabled?: boolean
  /** aria-label for the trigger */
  "aria-label"?: string
  searchPlaceholder?: string
  emptyText?: string
  /** Max chips to show inside the trigger before collapsing to "+N more" */
  maxVisibleChips?: number
  className?: string
  /** Where selected chips render: "inline" = inside trigger, "below" = underneath */
  chipPlacement?: "inline" | "below"
}

/* ─── Component ─────────────────────────────────────────────────────────────── */

const MultiSelect = React.forwardRef<HTMLDivElement, MultiSelectProps>(
  (
    {
      options,
      values,
      onChange,
      placeholder = "Select…",
      error = false,
      disabled = false,
      size = "md",
      searchPlaceholder = "Search…",
      emptyText = "No options found.",
      maxVisibleChips = 3,
      className,
      chipPlacement = "inline",
      "aria-label": ariaLabel,
    },
    ref
  ) => {
    const [open, setOpen] = React.useState(false)

    const selectedOptions = React.useMemo(
      () => options.filter((opt) => values.includes(opt.value)),
      [options, values]
    )

    const toggleValue = React.useCallback(
      (val: string) => {
        const next = values.includes(val)
          ? values.filter((v) => v !== val)
          : [...values, val]
        onChange(next)
      },
      [values, onChange]
    )

    const removeValue = React.useCallback(
      (val: string) => {
        onChange(values.filter((v) => v !== val))
      },
      [values, onChange]
    )

    const clearAll = React.useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation()
        onChange([])
      },
      [onChange]
    )

    // Chips to show inline vs. collapsed
    const visibleOptions =
      chipPlacement === "inline" ? selectedOptions.slice(0, maxVisibleChips) : []
    const overflowCount =
      chipPlacement === "inline" ? Math.max(0, selectedOptions.length - maxVisibleChips) : 0

    const chipSize = size === "lg" ? "md" : "sm"

    return (
      <div ref={ref} className={cn("flex flex-col gap-1.5", className)}>
        <ComboboxRoot open={open} onOpenChange={disabled ? undefined : setOpen}>
          <ComboboxTrigger asChild>
            <div
              role="combobox"
              tabIndex={disabled ? -1 : 0}
              aria-expanded={open}
              aria-haspopup="listbox"
              aria-label={ariaLabel}
              aria-disabled={disabled}
              onKeyDown={(e) => {
                if (disabled) return
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  setOpen((prev) => !prev)
                }
              }}
              className={cn(
                triggerWrapperVariants({ size, error, open, disabled })
              )}
            >
              {/* Inline chips */}
              {chipPlacement === "inline" && visibleOptions.map((opt) => (
                <RemovableChip
                  key={opt.value}
                  label={opt.label}
                  size={chipSize}
                  disabled={disabled}
                  onRemove={() => removeValue(opt.value)}
                  // Stop the click from toggling the popover
                  onClick={(e) => e.stopPropagation()}
                />
              ))}

              {/* Overflow count */}
              {overflowCount > 0 && (
                <span className="text-[--color-muted-foreground] text-xs font-medium px-1">
                  +{overflowCount} more
                </span>
              )}

              {/* Placeholder when nothing selected */}
              {selectedOptions.length === 0 && (
                <span className="flex-1 text-[--color-muted-foreground] truncate">
                  {placeholder}
                </span>
              )}

              {/* Right-side controls */}
              <span className="ml-auto flex shrink-0 items-center gap-1 pl-1">
                {values.length > 0 && !disabled && (
                  <span
                    role="button"
                    tabIndex={0}
                    aria-label="Clear all selections"
                    onClick={clearAll}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        onChange([])
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
            </div>
          </ComboboxTrigger>

          <ComboboxContent className="w-[var(--radix-popover-trigger-width)]">
            <Command>
              <CommandInput placeholder={searchPlaceholder} />
              <CommandList>
                <CommandEmpty>{emptyText}</CommandEmpty>
                <CommandGroup>
                  {options.map((option) => {
                    const isSelected = values.includes(option.value)
                    return (
                      <CommandItem
                        key={option.value}
                        value={option.value}
                        keywords={[option.label]}
                        disabled={option.disabled}
                        onSelect={toggleValue}
                        aria-selected={isSelected}
                      >
                        {/* Checkbox-style checkmark */}
                        <span
                          aria-hidden="true"
                          className={cn(
                            "mr-2 flex h-4 w-4 shrink-0 items-center justify-center rounded",
                            "border border-[--color-border]",
                            isSelected && "border-[--color-primary] bg-[--color-primary]"
                          )}
                        >
                          <Check
                            className={cn(
                              "h-3 w-3 text-white",
                              isSelected ? "opacity-100" : "opacity-0"
                            )}
                          />
                        </span>
                        {option.label}
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </ComboboxContent>
        </ComboboxRoot>

        {/* Below-trigger chip display */}
        {chipPlacement === "below" && selectedOptions.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {selectedOptions.map((opt) => (
              <RemovableChip
                key={opt.value}
                label={opt.label}
                size={chipSize}
                disabled={disabled}
                onRemove={() => removeValue(opt.value)}
              />
            ))}
          </div>
        )}
      </div>
    )
  }
)
MultiSelect.displayName = "MultiSelect"

export { MultiSelect }
