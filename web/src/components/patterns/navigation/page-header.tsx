import type { ReactNode } from "react"
import { Breadcrumbs, type BreadcrumbItem } from "./breadcrumbs"

// ─── PageToolbar ────────────────────────────────────────────────────────────────

export interface PageToolbarProps {
  children: ReactNode
  className?: string
}

/**
 * Standalone layout wrapper for a page's filter/control bar — spacing and
 * alignment only, deliberately NO background/border/shadow of its own.
 *
 * Every filter control in this design system (Button, IconButton, DatePicker,
 * SearchBar, SingleSelect, etc.) already carries its own --shadow-border/
 * --shadow-card definition. Giving the row a second, outer box around
 * already-boxed controls reads as "boxes inside a box" rather than a clean
 * toolbar — so this stays chrome-less and just arranges children with
 * consistent gap/wrap/alignment. A hand-rolled control with no visual
 * definition of its own (e.g. plain unstyled `<button>` pills) should be
 * replaced with a real component that has one (e.g. `SegmentedControl`)
 * rather than reached for by wrapping it in an outer box here.
 *
 * Exported standalone (not only via `PageHeader`'s `toolbar` prop) because
 * filter state usually lives in a page's child tab/section component, not
 * the top-level page file where `PageHeader` renders — forcing every page
 * to lift that state up just to pass it into `PageHeader` would be a much
 * bigger change than a layout one. Drop `<PageToolbar>` in directly wherever
 * the filter controls already live.
 *
 * Usage:
 * ```tsx
 * <PageToolbar>
 *   <DatePicker value={date} onChange={setDate} />
 *   <SearchBar variant="with-autocomplete" {...searchProps} />
 * </PageToolbar>
 * ```
 */
export function PageToolbar({ children, className = "" }: PageToolbarProps) {
  return (
    <div
      className={["flex flex-wrap items-center gap-3", className].join(" ")}
    >
      {children}
    </div>
  )
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PageHeaderProps {
  /** Required page title — rendered as an `<h1>`. */
  title: string
  /**
   * Optional subtitle rendered below the title. Suitable for a single-sentence
   * summary (e.g. "46 patients admitted this month").
   */
  description?: string
  /**
   * Breadcrumb items preceding the page title. Omit to hide breadcrumbs.
   * Home is always prepended automatically by the Breadcrumbs component.
   */
  breadcrumbs?: BreadcrumbItem[]
  /**
   * Slot for primary action buttons (e.g. "+ New Patient"). Rendered flush
   * right, vertically aligned with the title. Accepts any ReactNode — commonly
   * one or two `<Button>` components from the ui layer.
   */
  actions?: ReactNode
  /**
   * Slot for page-level filters/controls (date navigator, search, status
   * filters, etc.) — a deliberately generic `ReactNode`, not a typed list of
   * filter descriptors, since pages need very different filter combinations.
   * Rendered as its own bordered/shadowed strip below the title row so every
   * page's filter bar gets the same visual treatment instead of each page
   * inventing its own (or none at all). Omit entirely for pages with nothing
   * to filter (e.g. Dashboard, Settings).
   */
  toolbar?: ReactNode
  className?: string
}

// ─── PageHeader ───────────────────────────────────────────────────────────────

/**
 * The standard page toolbar used at the top of every app page.
 *
 * Layout: `[breadcrumbs?]  |  title + description  |  [actions slot]`
 *
 * The breadcrumbs sit above the title, and the actions slot is right-aligned
 * in the same row as the title — so the rendered region always occupies a
 * clean horizontal band without awkward wrapping.
 *
 * Usage:
 * ```tsx
 * <PageHeader
 *   title="Patients"
 *   description="All admitted and outpatient records"
 *   breadcrumbs={[{ label: "Patients" }]}
 *   actions={<Button>+ New Patient</Button>}
 *   toolbar={
 *     <>
 *       <DatePicker value={date} onChange={setDate} />
 *       <SearchBar variant="with-autocomplete" {...searchProps} />
 *     </>
 *   }
 * />
 * ```
 */
export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  toolbar,
  className = "",
}: PageHeaderProps) {
  const hasBreadcrumbs = breadcrumbs && breadcrumbs.length > 0

  return (
    // pl-10 reserves space for the Sidebar's mobile-only hamburger button
    // (fixed top-2 left-2, h-8 w-8) so it doesn't sit on top of the title on
    // small screens — added during final review, main handles this per-page
    // instead of centrally, this does the same job in one place.
    <header className={["pl-10 md:pl-0", className].filter(Boolean).join(" ")}>
      <div className="flex items-start justify-between gap-4">
        {/* Left: breadcrumbs + title + description */}
        <div className="min-w-0 flex-1">
          {hasBreadcrumbs && (
            <div className="mb-1.5">
              <Breadcrumbs items={breadcrumbs} />
            </div>
          )}

          <h1
            className="text-[length:var(--text-title)] font-bold leading-[var(--leading-tight)] tracking-tight truncate text-[var(--color-foreground)]"
          >
            {title}
          </h1>

          {description && (
            <p
              className="mt-1 text-[length:var(--text-body)] leading-[var(--leading-normal)] text-[var(--color-muted-foreground)]"
            >
              {description}
            </p>
          )}
        </div>

        {/* Right: primary actions slot */}
        {actions && (
          <div className="flex items-center gap-2 shrink-0 pt-0.5">
            {actions}
          </div>
        )}
      </div>

      {/* Toolbar: page-level filters/controls — only when the state naturally
          lives at this same page level; otherwise use <PageToolbar> directly
          inside whichever tab/section component owns the filter state. */}
      {toolbar && <PageToolbar className="mt-4">{toolbar}</PageToolbar>}
    </header>
  )
}
