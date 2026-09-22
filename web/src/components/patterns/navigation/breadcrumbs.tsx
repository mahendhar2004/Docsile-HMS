import React from "react"
import { Link } from "react-router-dom"
import { ChevronRight, Home } from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BreadcrumbItem {
  label: string
  /** If omitted, the item renders as plain text (non-link). The last item is
   *  always rendered as plain text regardless of whether href is provided. */
  href?: string
}

export interface BreadcrumbsProps {
  /** Ordered list of crumbs. The last item is always the current page. */
  items: BreadcrumbItem[]
  className?: string
}

// ─── Breadcrumbs ─────────────────────────────────────────────────────────────

/**
 * Renders a `Home > Section > Current Page` breadcrumb trail.
 *
 * - The Home icon links to `/dashboard`.
 * - The last item in `items` is always non-interactive and gets `aria-current="page"`.
 * - Intermediate items with `href` render as navigable links.
 * - Intermediate items without `href` render as plain text.
 */
export function Breadcrumbs({ items, className = "" }: BreadcrumbsProps) {
  if (items.length === 0) return null

  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex flex-wrap items-center gap-1 text-sm">
        {/* Home anchor */}
        <li>
          <Link
            to="/dashboard"
            aria-label="Home"
            className={[
              "flex items-center rounded-[var(--radius-xs)] p-0.5",
              "motion-interactive outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]",
            ].join(" ")}
            style={{ color: "var(--color-muted-foreground)" }}
          >
            <Home size={14} aria-hidden="true" />
          </Link>
        </li>

        {items.map((item, index) => {
          const isLast = index === items.length - 1
          return (
            <React.Fragment key={`${item.label}-${index}`}>
              {/* Separator */}
              <li aria-hidden="true" className="flex items-center">
                <ChevronRight
                  size={14}
                  style={{ color: "var(--color-muted-foreground)" }}
                />
              </li>

              {/* Crumb */}
              <li>
                {isLast || !item.href ? (
                  <span
                    className="font-medium"
                    aria-current={isLast ? "page" : undefined}
                    style={{
                      color: isLast
                        ? "var(--color-foreground)"
                        : "var(--color-muted-foreground)",
                    }}
                  >
                    {item.label}
                  </span>
                ) : (
                  <Link
                    to={item.href}
                    className={[
                      "rounded-[var(--radius-xs)] px-0.5",
                      "motion-interactive outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]",
                      "hover:text-[var(--color-foreground)]",
                    ].join(" ")}
                    style={{ color: "var(--color-muted-foreground)" }}
                  >
                    {item.label}
                  </Link>
                )}
              </li>
            </React.Fragment>
          )
        })}
      </ol>
    </nav>
  )
}
