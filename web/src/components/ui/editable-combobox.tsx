/**
 * ui/editable-combobox.tsx
 *
 * Ported from main's `src/components/ui/combobox.tsx` (`EditableComboboxWithAdd`)
 * — a free-text input with a fuzzy-matched suggestion dropdown, inline
 * "add new option to list" affordance, and an optional "set as default"
 * star toggle per option. Used by the patient registration wizard's
 * Address/Patient Type/Doctor Name/Department/Referred By fields, all of
 * which are open, tenant-editable lists backed by the DropdownOption table
 * rather than fixed enums.
 */

import * as React from "react"
import * as PopoverPrimitive from "@radix-ui/react-popover"
import { Loader2, Plus, Star } from "lucide-react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"

function normalize(s: string): string {
  return s.toUpperCase().replace(/\s+/g, " ").trim()
}

function scoreMatch(option: string, query: string): number {
  const o = normalize(option)
  const q = normalize(query)
  if (!q) return 0
  if (o === q) return 100
  if (o.startsWith(q)) return 80

  const oWords = o.split(" ")
  const qWords = q.split(" ")
  const allWordsMatch = qWords.every((qw) => oWords.some((ow) => ow.startsWith(qw)))
  if (allWordsMatch) return 60
  if (o.includes(q)) return 40

  const anyWordMatch = qWords.some((qw) => oWords.some((ow) => ow.includes(qw)))
  if (anyWordMatch) return 20
  return 0
}

function isDuplicate(value: string, options: string[]): boolean {
  const n = normalize(value)
  return options.some((o) => normalize(o) === n)
}

interface EditableComboboxWithAddProps {
  options: string[]
  value?: string
  onValueChange?: (value: string) => void
  onAddOption?: (value: string) => Promise<void>
  onSetDefault?: (value: string) => void
  defaultValue?: string
  placeholder?: string
  className?: string
  disabled?: boolean
  autoUpperCase?: boolean
}

export function EditableComboboxWithAdd({
  options,
  value,
  onValueChange,
  onAddOption,
  onSetDefault,
  defaultValue,
  placeholder = "Type or select...",
  className,
  disabled = false,
  autoUpperCase = false,
}: EditableComboboxWithAddProps) {
  const [open, setOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState(value ?? "")
  const [adding, setAdding] = React.useState(false)
  const [activeIndex, setActiveIndex] = React.useState(0)
  const listRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    setInputValue(value ?? "")
  }, [value])

  const filtered = React.useMemo(() => {
    if (!inputValue) return options.slice(0, 50)
    const scored = options
      .map((o) => ({ option: o, score: scoreMatch(o, inputValue) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score || a.option.localeCompare(b.option))
    return scored.map((x) => x.option).slice(0, 50)
  }, [options, inputValue])

  const isNewValue = inputValue.trim() !== "" && !isDuplicate(inputValue.trim(), options)

  function handleInputChange(v: string) {
    const val = autoUpperCase ? v.toUpperCase() : v
    setInputValue(val)
    onValueChange?.(val)
    setOpen(true)
  }

  function handleSelect(val: string) {
    setInputValue(val)
    onValueChange?.(val)
    setOpen(false)
  }

  async function handleAdd() {
    if (!isNewValue || !onAddOption) return
    setAdding(true)
    const val = autoUpperCase ? inputValue.trim().toUpperCase() : inputValue.trim()
    await onAddOption(val)
    setAdding(false)
    setOpen(false)
  }

  const showDropdown = open && (filtered.length > 0 || isNewValue)
  const totalItems = filtered.length + (isNewValue && onAddOption ? 1 : 0)
  const addRowIndex = isNewValue && onAddOption ? filtered.length : -1

  React.useEffect(() => {
    setActiveIndex(0)
  }, [inputValue, open])

  React.useEffect(() => {
    if (!showDropdown) return
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${activeIndex}"]`)
    el?.scrollIntoView({ block: "nearest" })
  }, [activeIndex, showDropdown])

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setOpen(true)
      e.preventDefault()
      return
    }
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, Math.max(totalItems - 1, 0)))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === "Enter" && showDropdown) {
      if (activeIndex === addRowIndex) {
        e.preventDefault()
        void handleAdd()
      } else if (filtered[activeIndex]) {
        e.preventDefault()
        handleSelect(filtered[activeIndex])
      }
    } else if (e.key === "Escape") {
      setOpen(false)
    }
  }

  return (
    <PopoverPrimitive.Root open={showDropdown} onOpenChange={setOpen}>
      <PopoverPrimitive.Anchor asChild>
        <div className={cn("relative w-full", className)}>
          <Input
            value={inputValue}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 200)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className="w-full"
          />
        </div>
      </PopoverPrimitive.Anchor>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          sideOffset={4}
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => {
            const target = e.target as HTMLElement
            if (target.closest("input")) e.preventDefault()
          }}
          style={{ width: "var(--radix-popover-trigger-width)" }}
          className="z-[200] overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-popover)] text-[var(--color-popover-foreground)] shadow-md"
        >
          <div ref={listRef} className="p-1 max-h-48 overflow-y-auto">
            {filtered.map((option, idx) => (
              <div
                key={option}
                data-idx={idx}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActiveIndex(idx)}
                className={cn(
                  "group flex items-center rounded-sm",
                  idx === activeIndex && "bg-accent text-accent-foreground",
                )}
              >
                <div
                  onClick={() => handleSelect(option)}
                  className={cn(
                    "flex-1 cursor-default select-none flex items-center gap-1.5 px-2 py-1.5 text-sm outline-none rounded-sm hover:bg-accent hover:text-accent-foreground",
                    inputValue === option && "bg-accent text-accent-foreground",
                  )}
                >
                  {option}
                  {defaultValue === option && (
                    <span className="text-[10px] font-medium text-amber-600 bg-amber-50 border border-amber-200 rounded px-1 leading-4 shrink-0">
                      default
                    </span>
                  )}
                </div>
                {onSetDefault && (
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                    }}
                    onClick={(e) => {
                      e.stopPropagation()
                      onSetDefault(option)
                    }}
                    title={defaultValue === option ? "Remove default" : "Set as default"}
                    className={cn(
                      "p-1 mr-0.5 rounded shrink-0 transition-colors",
                      defaultValue === option
                        ? "text-amber-400 hover:text-amber-300"
                        : "opacity-0 group-hover:opacity-100 text-muted-foreground/40 hover:text-muted-foreground",
                    )}
                  >
                    <Star className="h-3 w-3" fill={defaultValue === option ? "currentColor" : "none"} />
                  </button>
                )}
              </div>
            ))}
            {isNewValue && onAddOption && (
              <div
                data-idx={addRowIndex}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActiveIndex(addRowIndex)}
                onClick={() => void handleAdd()}
                className={cn(
                  "flex cursor-pointer items-center gap-1.5 rounded-sm px-2 py-1.5 text-sm text-primary hover:bg-primary/10",
                  filtered.length > 0 && "mt-1 border-t border-border",
                  activeIndex === addRowIndex && "bg-primary/10",
                )}
              >
                {adding ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Plus className="h-3.5 w-3.5" />
                )}
                Add &ldquo;{autoUpperCase ? inputValue.trim().toUpperCase() : inputValue.trim()}&rdquo; to list
              </div>
            )}
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}
