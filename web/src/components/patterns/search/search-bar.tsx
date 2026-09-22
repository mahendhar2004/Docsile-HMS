import React, { useCallback, useEffect, useId, useRef, useState } from "react"
import { Search, X } from "lucide-react"
import { cn } from "@/lib/utils"

// ---------------------------------------------------------------------------
// Shared: filter chip type
// ---------------------------------------------------------------------------

/**
 * A single dismissible filter chip shown below the search input in the
 * `with-filter-chips` variant.
 */
export interface FilterChip {
  /** Unique id — used as the React key and passed back to `onChipRemove`. */
  id: string
  /** Human-readable label for the chip. */
  label: string
}

// ---------------------------------------------------------------------------
// Shared: suggestion type for autocomplete
// ---------------------------------------------------------------------------

/**
 * A single autocomplete suggestion item.
 * @template T — extend with domain-specific fields (e.g. `{ id, name, phone }`)
 */
export interface Suggestion<T = unknown> {
  /** Unique id — used as the React key. */
  id: string
  /** Primary display label used as the default renderer and accessibility label. */
  label: string
  /** The original domain object, passed back to `onSuggestionSelect`. */
  value: T
}

// ---------------------------------------------------------------------------
// Variant type
// ---------------------------------------------------------------------------

/**
 * - `standalone`         — just the search input + icon + clear button
 * - `with-filter-chips`  — search input + a row of dismissible filter chips
 * - `with-autocomplete`  — search input + a keyboard-navigable suggestion dropdown
 */
export type SearchBarVariant =
  | "standalone"
  | "with-filter-chips"
  | "with-autocomplete"

// ---------------------------------------------------------------------------
// Props per variant (discriminated union)
// ---------------------------------------------------------------------------

interface SearchBarBaseProps {
  /** Current search value (controlled). */
  value: string
  /** Called on every keystroke with the new value. */
  onChange: (value: string) => void
  /** Input placeholder. Defaults to "Search…" */
  placeholder?: string
  /** Disables the input. */
  disabled?: boolean
  /** Applied to the outermost wrapper. */
  className?: string
  /** Additional classes for the <input> itself. */
  inputClassName?: string
  /** aria-label for the search input. Defaults to "Search". */
  "aria-label"?: string
  /** Name used to identify the form element. */
  name?: string
  /** Auto-submit on Enter (calls `onSearch`). */
  onSearch?: (value: string) => void
}

/**
 * **Standalone** — search input + icon + clear button.
 *
 * The simplest variant. Use when no chips or autocomplete are needed.
 *
 * @example
 * ```tsx
 * const [q, setQ] = useState("")
 *
 * <SearchBar
 *   variant="standalone"
 *   value={q}
 *   onChange={setQ}
 *   placeholder="Search patients…"
 *   onSearch={(v) => runSearch(v)}
 * />
 * ```
 */
interface StandaloneVariant extends SearchBarBaseProps {
  variant: "standalone"
}

/**
 * **With filter chips** — search input + a row of dismissible filter chips.
 *
 * Each chip shows a label and an "×" dismiss button. The parent is responsible
 * for maintaining the chip list; when a chip is dismissed, remove it from
 * the array and pass the updated array back as `chips`.
 *
 * The chip styling is consistent with the design-system theme so it's easy to
 * swap for the dedicated `<RemovableChip>` component once that batch is built.
 *
 * @example
 * ```tsx
 * const [q, setQ] = useState("")
 * const [filters, setFilters] = useState<FilterChip[]>([
 *   { id: "opd", label: "OPD" },
 *   { id: "ipd", label: "IPD" },
 * ])
 *
 * <SearchBar
 *   variant="with-filter-chips"
 *   value={q}
 *   onChange={setQ}
 *   chips={filters}
 *   onChipRemove={(id) => setFilters((f) => f.filter((c) => c.id !== id))}
 * />
 * ```
 */
interface FilterChipsVariant extends SearchBarBaseProps {
  variant: "with-filter-chips"
  /** Active filter chips displayed below the input. */
  chips: FilterChip[]
  /** Called with the chip's `id` when the user clicks the dismiss button. */
  onChipRemove: (id: string) => void
  /** Accessible label for the chips region. Defaults to "Active filters". */
  chipsLabel?: string
}

/**
 * **With autocomplete** — search input + a keyboard-navigable suggestion dropdown.
 *
 * Keyboard navigation:
 * - `ArrowDown` / `ArrowUp` — move highlighted suggestion
 * - `Enter` — select highlighted suggestion (or fire `onSearch` if none highlighted)
 * - `Escape` — close the dropdown and return focus to the input
 *
 * The dropdown closes on outside click and on blur (with a small delay to
 * allow click events on suggestions to register first).
 *
 * @template T — domain type of the suggestion value. Inferred from `suggestions`.
 *
 * @example
 * ```tsx
 * const [q, setQ] = useState("")
 * const suggestions = patients
 *   .filter((p) => p.name.toLowerCase().includes(q.toLowerCase()))
 *   .slice(0, 8)
 *   .map((p) => ({ id: p.id, label: p.name, value: p }))
 *
 * <SearchBar
 *   variant="with-autocomplete"
 *   value={q}
 *   onChange={setQ}
 *   suggestions={suggestions}
 *   onSuggestionSelect={(p) => navigate(`/patients/${p.id}`)}
 *   renderSuggestion={(s) => (
 *     <div>
 *       <span className="font-medium">{s.label}</span>
 *       <span className="text-muted-foreground ml-2 text-xs">{s.value.phone}</span>
 *     </div>
 *   )}
 * />
 * ```
 */
interface AutocompleteVariant<T = unknown> extends SearchBarBaseProps {
  variant: "with-autocomplete"
  /** The suggestion items to display in the dropdown. */
  suggestions: Suggestion<T>[]
  /**
   * Called when the user selects a suggestion (click or keyboard Enter).
   * @param suggestion — the selected `Suggestion<T>`
   */
  onSuggestionSelect: (suggestion: Suggestion<T>) => void
  /**
   * Custom renderer for each suggestion row in the dropdown.
   * Defaults to rendering `suggestion.label`.
   */
  renderSuggestion?: (suggestion: Suggestion<T>) => React.ReactNode
  /** Whether to show the dropdown. Defaults to `suggestions.length > 0`. */
  open?: boolean
  /** Loading state for async suggestion fetching. */
  isLoadingSuggestions?: boolean
  /** Message shown when no suggestions match. Defaults to "No results found". */
  noResultsMessage?: string
}

export type SearchBarProps<T = unknown> =
  | StandaloneVariant
  | FilterChipsVariant
  | AutocompleteVariant<T>

// ---------------------------------------------------------------------------
// Shared: InputCore — the search input + icon + clear button
// ---------------------------------------------------------------------------

interface InputCoreProps {
  id: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  disabled: boolean
  ariaLabel: string
  name?: string
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void
  onFocus?: () => void
  onBlur?: () => void
  inputRef?: React.Ref<HTMLInputElement>
  inputClassName?: string
  "aria-activedescendant"?: string
  "aria-expanded"?: boolean
  "aria-haspopup"?: boolean | "listbox"
  "aria-autocomplete"?: "list" | "inline" | "both" | "none"
  role?: string
  onSearch?: (value: string) => void
}

function InputCore({
  id,
  value,
  onChange,
  placeholder,
  disabled,
  ariaLabel,
  name,
  onKeyDown,
  onFocus,
  onBlur,
  inputRef,
  inputClassName,
  onSearch,
  ...ariaProps
}: InputCoreProps) {
  const hasClearButton = value.length > 0

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && onSearch) {
      e.preventDefault()
      onSearch(value)
    }
    onKeyDown?.(e)
  }

  return (
    <div className="relative flex items-center">
      {/* Search icon */}
      <Search
        className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-muted-foreground)] pointer-events-none"
        aria-hidden
      />

      {/* Input */}
      <input
        ref={inputRef}
        id={id}
        type="search"
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={onFocus}
        onBlur={onBlur}
        placeholder={placeholder}
        disabled={disabled}
        aria-label={ariaLabel}
        autoComplete="off"
        spellCheck={false}
        className={cn(
          "w-full h-9",
          "pl-9 pr-8 py-2",
          "rounded-[var(--radius-sm)]",
          "border border-[var(--color-border)]",
          "bg-[var(--color-surface)] text-sm text-[var(--color-foreground)]",
          "placeholder:text-[var(--color-muted-foreground)]",
          "transition-colors duration-[var(--duration-micro)] ease-[var(--ease-micro)]",
          "focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)] focus:border-[var(--color-ring)]",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          // Hide browser's native clear button (we render our own)
          "[&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden",
          inputClassName,
        )}
        {...ariaProps}
      />

      {/* Clear button */}
      {hasClearButton && !disabled && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          tabIndex={-1}
          className={cn(
            "absolute right-2.5 top-1/2 -translate-y-1/2",
            "flex items-center justify-center",
            "h-4 w-4 rounded-full",
            "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]",
            "transition-colors duration-[var(--duration-micro)]",
            "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-ring)]",
          )}
        >
          <X className="h-3 w-3" aria-hidden />
        </button>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Variant: Standalone
// ---------------------------------------------------------------------------

function StandaloneSearchBar({
  value,
  onChange,
  placeholder = "Search…",
  disabled = false,
  className,
  inputClassName,
  "aria-label": ariaLabel = "Search",
  name,
  onSearch,
}: StandaloneVariant) {
  const id = useId()

  return (
    <div className={cn("w-full", className)}>
      <InputCore
        id={id}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        ariaLabel={ariaLabel}
        name={name}
        inputClassName={inputClassName}
        onSearch={onSearch}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Variant: With filter chips
// ---------------------------------------------------------------------------

function FilterChipsSearchBar({
  value,
  onChange,
  placeholder = "Search…",
  disabled = false,
  className,
  inputClassName,
  "aria-label": ariaLabel = "Search",
  name,
  onSearch,
  chips,
  onChipRemove,
  chipsLabel = "Active filters",
}: FilterChipsVariant) {
  const id = useId()
  const hasChips = chips.length > 0

  return (
    <div className={cn("w-full space-y-2", className)}>
      <InputCore
        id={id}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        ariaLabel={ariaLabel}
        name={name}
        inputClassName={inputClassName}
        onSearch={onSearch}
      />

      {hasChips && (
        <div
          role="group"
          aria-label={chipsLabel}
          className="flex flex-wrap gap-1.5"
        >
          {chips.map((chip) => (
            <span
              key={chip.id}
              className={cn(
                "inline-flex items-center gap-1 h-6 max-w-[200px]",
                "px-2 rounded-[var(--radius-full)]",
                "bg-[var(--color-accent)] text-[var(--color-accent-foreground)]",
                "text-xs font-medium",
                "border border-[var(--color-primary)]/20",
              )}
            >
              <span className="truncate">{chip.label}</span>
              <button
                type="button"
                onClick={() => onChipRemove(chip.id)}
                aria-label={`Remove filter: ${chip.label}`}
                disabled={disabled}
                className={cn(
                  "flex-shrink-0 flex items-center justify-center",
                  "h-3.5 w-3.5 rounded-full",
                  "text-[var(--color-accent-foreground)]/70",
                  "hover:text-[var(--color-accent-foreground)] hover:bg-[var(--color-primary)]/10",
                  "transition-colors duration-[var(--duration-micro)]",
                  "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-ring)]",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                )}
              >
                <X className="h-2.5 w-2.5" aria-hidden />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Variant: With autocomplete
// ---------------------------------------------------------------------------

function AutocompleteSearchBar<T = unknown>({
  value,
  onChange,
  placeholder = "Search…",
  disabled = false,
  className,
  inputClassName,
  "aria-label": ariaLabel = "Search",
  name,
  onSearch,
  suggestions,
  onSuggestionSelect,
  renderSuggestion,
  open: controlledOpen,
  isLoadingSuggestions = false,
  noResultsMessage = "No results found",
}: AutocompleteVariant<T>) {
  const inputId = useId()
  const listboxId = useId()

  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const [activeIndex, setActiveIndex] = useState(-1)
  const [isInternalOpen, setIsInternalOpen] = useState(false)

  // The dropdown is open when there is a value typed AND (either controlled or internal open)
  const isOpen =
    controlledOpen !== undefined
      ? controlledOpen
      : isInternalOpen && value.length > 0

  // Reset active index when suggestions change
  useEffect(() => {
    setActiveIndex(-1)
  }, [suggestions])

  // Scroll active suggestion into view
  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const item = listRef.current.children[activeIndex] as HTMLElement | undefined
      item?.scrollIntoView({ block: "nearest" })
    }
  }, [activeIndex])

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsInternalOpen(false)
        setActiveIndex(-1)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleSelect = useCallback(
    (suggestion: Suggestion<T>) => {
      onSuggestionSelect(suggestion)
      setIsInternalOpen(false)
      setActiveIndex(-1)
    },
    [onSuggestionSelect],
  )

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!isOpen) {
      if (e.key === "ArrowDown" && suggestions.length > 0) {
        setIsInternalOpen(true)
        setActiveIndex(0)
        e.preventDefault()
      }
      return
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault()
        setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1))
        break
      case "ArrowUp":
        e.preventDefault()
        setActiveIndex((i) => Math.max(i - 1, -1))
        break
      case "Enter":
        e.preventDefault()
        if (activeIndex >= 0 && suggestions[activeIndex]) {
          handleSelect(suggestions[activeIndex])
        } else if (onSearch) {
          onSearch(value)
          setIsInternalOpen(false)
        }
        break
      case "Escape":
        e.preventDefault()
        setIsInternalOpen(false)
        setActiveIndex(-1)
        inputRef.current?.focus()
        break
      case "Tab":
        setIsInternalOpen(false)
        setActiveIndex(-1)
        break
    }
  }

  const activeDescendant =
    activeIndex >= 0 ? `${listboxId}-item-${activeIndex}` : undefined

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <InputCore
        id={inputId}
        value={value}
        onChange={(v) => {
          onChange(v)
          setIsInternalOpen(true)
          setActiveIndex(-1)
        }}
        placeholder={placeholder}
        disabled={disabled}
        ariaLabel={ariaLabel}
        name={name}
        inputClassName={inputClassName}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (value.length > 0) setIsInternalOpen(true)
        }}
        onSearch={onSearch}
        inputRef={inputRef}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-autocomplete="list"
        aria-activedescendant={activeDescendant}
        role="combobox"
      />

      {/* Dropdown */}
      {isOpen && (
        <div
          className={cn(
            "absolute z-50 top-full left-0 right-0 mt-1",
            "rounded-[var(--radius-md)]",
            "border border-[var(--color-border)]",
            "bg-[var(--color-surface)] shadow-[var(--shadow-md)]",
            "overflow-hidden",
            "animate-slide-in-top",
          )}
        >
          {isLoadingSuggestions ? (
            <div className="px-3 py-6 text-center text-sm text-[var(--color-muted-foreground)]">
              <span
                className="inline-block h-4 w-4 rounded-full border-2 border-[var(--color-primary)] border-t-transparent animate-spin"
                aria-label="Loading suggestions"
                role="status"
              />
            </div>
          ) : suggestions.length === 0 ? (
            <div
              className="px-3 py-4 text-center text-sm text-[var(--color-muted-foreground)]"
              role="status"
              aria-live="polite"
            >
              {noResultsMessage}
            </div>
          ) : (
            <ul
              ref={listRef}
              id={listboxId}
              role="listbox"
              aria-label={ariaLabel}
              className="max-h-60 overflow-y-auto py-1"
            >
              {suggestions.map((suggestion, index) => (
                <li
                  key={suggestion.id}
                  id={`${listboxId}-item-${index}`}
                  role="option"
                  aria-selected={index === activeIndex}
                  onMouseDown={(e) => {
                    // Prevent blur from firing before click registers
                    e.preventDefault()
                    handleSelect(suggestion)
                  }}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={cn(
                    "px-3 py-2 cursor-pointer select-none",
                    "text-sm text-[var(--color-foreground)]",
                    "transition-colors duration-[var(--duration-micro)] ease-[var(--ease-micro)]",
                    index === activeIndex
                      ? "bg-[var(--color-accent)] text-[var(--color-accent-foreground)]"
                      : "hover:bg-[var(--color-muted)]",
                  )}
                >
                  {renderSuggestion ? renderSuggestion(suggestion) : suggestion.label}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// SearchBar — public entry point (routes to the right variant)
// ---------------------------------------------------------------------------

/**
 * Tier 2 — SearchBar
 *
 * A unified search input component with three variants selectable via the
 * `variant` prop. All variants are fully accessible, keyboard-navigable,
 * and themed via design-system CSS variables.
 *
 * | Variant              | Description |
 * |----------------------|-------------|
 * | `standalone`         | Input + search icon + clear button |
 * | `with-filter-chips`  | Input + row of dismissible filter chips |
 * | `with-autocomplete`  | Input + keyboard-navigable suggestion dropdown |
 *
 * See the per-variant interfaces (`StandaloneVariant`, `FilterChipsVariant`,
 * `AutocompleteVariant`) for the full prop API of each.
 */
export function SearchBar<T = unknown>(props: SearchBarProps<T>) {
  switch (props.variant) {
    case "standalone":
      return <StandaloneSearchBar {...props} />
    case "with-filter-chips":
      return <FilterChipsSearchBar {...props} />
    case "with-autocomplete":
      return <AutocompleteSearchBar<T> {...(props as AutocompleteVariant<T>)} />
  }
}
