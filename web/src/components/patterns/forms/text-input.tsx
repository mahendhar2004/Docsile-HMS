import * as React from "react"
import { Eye, EyeOff, Search, X } from "lucide-react"
import { Input, type InputProps } from "@/components/ui/input"
import { IconButton } from "@/components/ui/icon-button"
import { cn } from "@/lib/utils"

export type TextInputType = "text" | "email" | "password" | "search"
export type TextInputSize = "sm" | "md" | "lg"

export interface TextInputProps
  extends Omit<InputProps, "type" | "size"> {
  /** Determines the input variant — password adds show/hide toggle, search adds icon + clear */
  inputType?: TextInputType
  size?: TextInputSize
  hasError?: boolean
  /** Called when the clear button is pressed (search variant only) */
  onClear?: () => void
}

const TextInput = React.forwardRef<HTMLInputElement, TextInputProps>(
  (
    {
      inputType = "text",
      size = "md",
      hasError,
      onClear,
      className,
      value,
      onChange,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = React.useState(false)

    // ─── Password variant ──────────────────────────────────────
    if (inputType === "password") {
      return (
        <div className="relative flex items-center">
          <Input
            ref={ref}
            type={showPassword ? "text" : "password"}
            size={size}
            hasError={hasError}
            value={value}
            onChange={onChange}
            className={cn("pr-10", className)}
            {...props}
          />
          <IconButton
            type="button"
            variant="ghost"
            size="sm"
            aria-label={showPassword ? "Hide password" : "Show password"}
            onClick={() => setShowPassword((v) => !v)}
            tabIndex={-1}
            className="absolute right-1 text-muted-foreground hover:text-foreground"
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Eye className="h-4 w-4" aria-hidden="true" />
            )}
          </IconButton>
        </div>
      )
    }

    // ─── Search variant ────────────────────────────────────────
    if (inputType === "search") {
      const hasValue = Boolean(value)
      return (
        <div className="relative flex items-center">
          <Search
            className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none"
            aria-hidden="true"
          />
          <Input
            ref={ref}
            type="search"
            size={size}
            hasError={hasError}
            value={value}
            onChange={onChange}
            className={cn("pl-9", hasValue ? "pr-10" : "", className)}
            {...props}
          />
          {hasValue && (
            <IconButton
              type="button"
              variant="ghost"
              size="sm"
              aria-label="Clear search"
              onClick={onClear}
              tabIndex={-1}
              className="absolute right-1 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </IconButton>
          )}
        </div>
      )
    }

    // ─── text / email ──────────────────────────────────────────
    return (
      <Input
        ref={ref}
        type={inputType}
        size={size}
        hasError={hasError}
        value={value}
        onChange={onChange}
        className={className}
        {...props}
      />
    )
  }
)
TextInput.displayName = "TextInput"

export { TextInput }
