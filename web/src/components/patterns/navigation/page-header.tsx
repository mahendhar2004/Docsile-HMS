import type { ReactNode } from "react"
import { Breadcrumbs, type BreadcrumbItem } from "./breadcrumbs"

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
    <header className={`pb-6 ${className}`}>
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

      {/* Toolbar: page-level filters/controls, own bordered+shadowed strip */}
      {toolbar && (
        <div
          className={[
            "mt-4 flex flex-col sm:flex-row sm:items-center gap-3",
            "rounded-[var(--radius-lg)] bg-[var(--color-card)]",
            "shadow-[var(--shadow-card)] px-4 py-3",
          ].join(" ")}
        >
          {toolbar}
        </div>
      )}
    </header>
  )
}
