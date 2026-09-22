/**
 * patterns/charts/chart-theme.ts
 *
 * Shared recharts theme configuration derived from design tokens.
 *
 * Color strategy:
 *   All color values are CSS custom property strings (e.g. "var(--color-primary)").
 *   Modern browsers resolve CSS custom properties in SVG presentation attributes
 *   and inline styles — this is the least-surprising approach for a single-page
 *   Vite + React app targeting Chrome / Safari / Firefox.
 *
 * Dataviz decisions (dataviz skill not available; applying solid fundamentals):
 *   - Palette order: blue → amber → slate → green → red.
 *     Blue + amber are distinguishable under deuteranopia, protanopia, and
 *     tritanopia — the most common forms of color blindness. Green/red appear
 *     at positions 4–5 so single- and dual-series charts stay safe.
 *   - Horizontal gridlines only. Vertical gridlines add visual noise without
 *     additional information in the time-series / category charts used here.
 *   - Axis lines use --color-border (not black) for a softer, Apple-style grid.
 *   - Tooltip uses the card surface (--color-card) with border + shadow.
 *   - Legend appears below the chart, icon + label in caption size.
 */

import type * as React from "react"

// ─── Color palette ───────────────────────────────────────────────────────────

/**
 * Multi-series color palette — colorblind-safe ordering.
 * Use CHART_PALETTE[seriesIndex % CHART_PALETTE.length] to cycle colors.
 */
export const CHART_PALETTE = [
  "var(--color-primary)",   // blue  — series 1
  "var(--color-warning)",   // amber — series 2
  "var(--color-neutral)",   // slate — series 3
  "var(--color-success)",   // green — series 4
  "var(--color-error)",     // red   — series 5
] as const

export type ChartPaletteColor = (typeof CHART_PALETTE)[number]

/**
 * Semantic status colors for status-breakdown charts (e.g. claim pipeline donut).
 * Map entity status → bucket → this color.
 */
export const CHART_STATUS_COLORS = {
  success: "var(--color-success)",
  warning: "var(--color-warning)",
  error:   "var(--color-error)",
  info:    "var(--color-primary)",
  neutral: "var(--color-neutral)",
} as const

export type ChartStatusKey = keyof typeof CHART_STATUS_COLORS

// ─── Axis styling ─────────────────────────────────────────────────────────────

/**
 * Tick label style — passed as the `tick` prop on XAxis / YAxis.
 * Recharts spreads these as SVGProps on the generated <text> element.
 */
export const CHART_TICK_STYLE = {
  fill: "var(--color-muted-foreground)",
  fontSize: 12,
  fontFamily: "var(--font-sans)",
} satisfies Record<string, unknown>

/**
 * Axis line / tick line style — passed as `axisLine` and `tickLine` props.
 */
export const CHART_AXIS_LINE_STYLE = {
  stroke: "var(--color-border)",
} satisfies Record<string, unknown>

// ─── Grid ────────────────────────────────────────────────────────────────────

/**
 * CartesianGrid props — horizontal lines only, subtle dashes.
 * Spread onto <CartesianGrid {...CHART_GRID_PROPS} />.
 */
export const CHART_GRID_PROPS = {
  stroke: "var(--color-border)",
  strokeDasharray: "3 3",
  strokeOpacity: 0.6,
  vertical: false,
} as const

// ─── Tooltip ──────────────────────────────────────────────────────────────────

/**
 * Recharts Tooltip styling props.
 * contentStyle / labelStyle / itemStyle are all HTML inline styles —
 * CSS custom properties resolve correctly in inline styles on all browsers.
 */
export const CHART_TOOLTIP_STYLE: {
  contentStyle: React.CSSProperties
  labelStyle: React.CSSProperties
  itemStyle: React.CSSProperties
} = {
  contentStyle: {
    backgroundColor: "var(--color-card)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-lg)",
    boxShadow: "var(--shadow-md)",
    padding: "10px 14px",
    fontFamily: "var(--font-sans)",
    fontSize: 13,
    color: "var(--color-foreground)",
  },
  labelStyle: {
    color: "var(--color-foreground)",
    fontWeight: 600,
    marginBottom: 4,
    fontSize: 12,
  },
  itemStyle: {
    color: "var(--color-muted-foreground)",
    fontSize: 12,
    padding: "1px 0",
  },
}

// ─── Legend ───────────────────────────────────────────────────────────────────

/** Shared Legend wrapperStyle — caption-size, muted text, padded top. */
export const CHART_LEGEND_WRAPPER_STYLE: React.CSSProperties = {
  fontFamily: "var(--font-sans)",
  fontSize: 12,
  color: "var(--color-muted-foreground)",
  paddingTop: 8,
}

// ─── Cursor (tooltip hover highlight) ────────────────────────────────────────

/** Cursor for line / area charts — subtle vertical guide line. */
export const CHART_LINE_CURSOR = {
  stroke: "var(--color-border)",
  strokeWidth: 1,
} as const

/** Cursor for bar charts — soft accent background behind the hovered bar. */
export const CHART_BAR_CURSOR = {
  fill: "var(--color-accent)",
  opacity: 0.5,
} as const

// ─── Layout ───────────────────────────────────────────────────────────────────

/** Default chart outer margin — passed as the `margin` prop to chart roots. */
export const CHART_MARGIN = { top: 8, right: 16, bottom: 4, left: 0 } as const

/** Default chart render height in pixels. */
export const DEFAULT_CHART_HEIGHT = 240

// ─── Shared series type ───────────────────────────────────────────────────────

/**
 * A single data series rendered in a cartesian chart (line, bar, area).
 */
export interface ChartSeries {
  /** The key in each data object to read the value from. */
  dataKey: string
  /** Display name shown in the legend and tooltip. Defaults to dataKey. */
  name?: string
  /** CSS color string (e.g. "var(--color-primary)" or "#2563eb").
   *  Defaults to CHART_PALETTE[seriesIndex]. */
  color?: string
}
