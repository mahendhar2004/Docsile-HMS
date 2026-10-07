import { type ReactNode, useState, useCallback } from "react"
import { useLocation } from "react-router-dom"
import { RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import { BackToDashboard } from "@/components/layout/back-to-dashboard"
import { Breadcrumbs, type BreadcrumbItem } from "./breadcrumbs"

// ─── PageToolbar ────────────────────────────────────────────────────────────────
// Matches main's FilterBar exactly (src/components/layout/header.tsx) — a
// second sticky bar directly under PageHeader, lighter/more-transparent
// than it, bleeding full-width via the same negative-margin trick against
// AppShell's own padding.

export interface PageToolbarProps {
  children: ReactNode
  className?: string
}

export function PageToolbar({ children, className = "" }: PageToolbarProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 sm:gap-3 flex-wrap sm:flex-nowrap",
        "bg-white/60 backdrop-blur-sm border-b border-border/40",
        "px-3 sm:px-6 py-2 sm:py-2.5 -mx-3 sm:-mx-6 mb-3 sm:mb-5 sm:sticky sm:top-16 z-10",
        className,
      )}
    >
      {children}
    </div>
  )
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PageHeaderProps {
  /** Required page title — rendered as an `<h1>`. */
  title: string
  /** Optional subtitle rendered below the title (hidden below sm, matching main). */
  description?: string
  /**
   * Breadcrumb items preceding the page title. Omit to hide breadcrumbs.
   * Home is always prepended automatically by the Breadcrumbs component.
   */
  breadcrumbs?: BreadcrumbItem[]
  /**
   * Slot for primary action buttons (e.g. "+ New Patient"). Rendered
   * alongside Back-to-Dashboard on the right, matching main's `children`
   * slot in PageHeader.
   */
  actions?: ReactNode
  /**
   * Slot embedded directly in the header bar, between the title and the
   * actions — used where main embeds a page-level Tabs switcher in the
   * header itself rather than below it (e.g. Patients' Out-Patients/
   * In-Patients switch). Omit on pages whose tabs sit below the header.
   */
  center?: ReactNode
  /**
   * Slot for page-level filters/controls (date navigator, search, status
   * filters, etc.) — rendered as a second sticky bar (PageToolbar, matching
   * main's FilterBar) directly under the header row. Omit entirely for
   * pages with nothing to filter (e.g. Dashboard, Settings).
   */
  toolbar?: ReactNode
  /**
   * Shows main's circular refresh button (spins while pending) next to the
   * title. Wire this to whichever query this page's data primarily depends
   * on. Omit on pages with no single natural refetch to attach it to.
   */
  onRefresh?: () => void | Promise<void>
  className?: string
}

// ─── PageHeader ───────────────────────────────────────────────────────────────

/**
 * The standard sticky page header, matching main's PageHeader exactly
 * (src/components/layout/header.tsx) — a semi-transparent, backdrop-blurred
 * bar that bleeds full-width via negative margins against AppShell's own
 * padding and sticks to the top of the scroll container. Back-to-Dashboard
 * renders automatically on every page except Dashboard itself (route-based,
 * matching main's `pathname !== "/dashboard"` check) — no per-page wiring
 * needed.
 */
export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  center,
  toolbar,
  onRefresh,
  className = "",
}: PageHeaderProps) {
  const hasBreadcrumbs = breadcrumbs && breadcrumbs.length > 0
  const location = useLocation()
  const showBack = location.pathname !== "/dashboard"

  const [spinning, setSpinning] = useState(false)
  const handleRefresh = useCallback(() => {
    if (!onRefresh || spinning) return
    setSpinning(true)
    Promise.resolve(onRefresh()).finally(() => setSpinning(false))
  }, [onRefresh, spinning])

  return (
    // A real wrapper, not a Fragment: every page renders this as one item
    // inside its own `space-y-*` flow, and a Fragment would hoist the
    // header and toolbar as two separate flow children, picking up an
    // unwanted `space-y` gap between them that breaks the sticky
    // top-0/top-16 stacking this is built to match in main.
    <div>
      <header
        className={cn(
          "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4",
          "bg-white/80 backdrop-blur-md border-b border-border/60",
          "pl-12 md:pl-6 pr-3 sm:pr-6 py-2.5 sm:py-4 -mx-3 sm:-mx-6 -mt-3 sm:-mt-6 sticky top-0 z-20",
          className,
        )}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="min-w-0 flex-1">
            {hasBreadcrumbs && (
              <div className="mb-1.5">
                <Breadcrumbs items={breadcrumbs} />
              </div>
            )}
            <h1 className="text-base sm:text-lg font-semibold text-foreground tracking-tight leading-tight sm:leading-none truncate">
              {title}
            </h1>
            {description && (
              <p className="hidden sm:block text-[13px] text-muted-foreground mt-1.5 leading-none">
                {description}
              </p>
            )}
          </div>
          {onRefresh && (
            <button
              type="button"
              onClick={handleRefresh}
              disabled={spinning}
              title="Refresh"
              aria-label="Refresh"
              className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors disabled:opacity-50 shrink-0"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", spinning && "animate-spin")} aria-hidden="true" />
            </button>
          )}
        </div>

        {center && <div className="flex md:justify-center">{center}</div>}

        {(actions || showBack) && (
          <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap sm:flex-nowrap sm:shrink-0 [&>*]:min-w-0">
            {actions}
            {showBack && <BackToDashboard />}
          </div>
        )}
      </header>

      {/* Sibling, not nested — matches main's PageHeader+FilterBar being two
          separate elements in the page's own JSX, which the sticky-position
          stacking (top-0 then top-16) depends on. */}
      {toolbar && <PageToolbar>{toolbar}</PageToolbar>}
    </div>
  )
}
