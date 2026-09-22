# docsile-hms Design System — Running Progress Tracker

**Purpose:** track every component, every variant, and every size/state for
the local design-system build before any real frontend page work starts.
Same spirit as `.sde/PROGRESS.md` for the backend — if it's not checked off
here, it isn't done. Update this file in place as work happens, not just at
the end.

**Where this lives:** all components below are real, interactive React
components in `web/src/components/`. They're reviewed via a dev-only route,
`/design-system` (not linked from the real app nav, not published anywhere)
— run `npm run dev` inside `web/` and open it locally.

**Decisions locked in (2026-09-22):**
- Build on and formalize the existing Apple-esque theme already in
  `web/src/index.css` (blue `#2563eb` primary, Apple red destructive) —
  not a fresh visual direction.
- Light mode only for this pass. Dark mode is a deliberate later pass, not
  built now.
- Motion: fast (~100ms) micro-feedback for hover/press/focus, but
  expressive/fluid spring-based easing (~250-350ms) for entrances/exits
  (modals, sheets, page transitions, list changes) — richer than the
  existing 150-200ms linear fades, per explicit owner direction ("more
  expressive/fluid" over "snappy/minimal").
- Nothing here gets used in a real page until the owner reviews the
  `/design-system` route and explicitly approves moving to real frontend
  build-out.

**Legend:**
- ⬜ Not started
- 🔨 In progress
- ✅ Built (component exists, renders correctly in `/design-system`)
- 👀 Reviewed/approved by owner

---

## Foundations

| Item | Status | Notes |
|---|---|---|
| Color tokens (extend existing + full status-color set) | ✅ | Added error/neutral solid + soft (tinted bg) variants for all 5 status colors — soft variants are what StatusPill/chips use |
| Typography scale | ✅ | `--text-display/title/subtitle/body/caption` + leading tokens in index.css |
| Spacing scale | ✅ | Confirmed: using Tailwind's default scale as-is, no override needed |
| Motion tokens | ✅ | `--ease-micro`/`--ease-fluid`/`--ease-spring` + duration tokens + dialog/sheet/list-item/toast keyframes + `.motion-*` utility classes, all CSS-only (no JS animation lib — kept intentional to not add runtime weight) |
| Shadow/elevation scale | ✅ | Confirmed existing xs/sm/md/lg scale is sufficient, no changes |
| Radius scale | ✅ | Confirmed existing scale is sufficient, no changes |

## Buttons

| Component | Variants | Sizes | States | Status |
|---|---|---|---|---|
| Button | primary, secondary, outline, ghost, destructive, link | sm, md, lg | default, hover, active, disabled, loading | ⬜ |
| IconButton | same variants as Button | sm, md, lg | default, hover, active, disabled, loading | ⬜ |

## Inputs & Form Controls

| Component | Variants | Sizes | States | Status |
|---|---|---|---|---|
| TextInput | text, email, password (show/hide toggle), search (icon + clear) | sm, md, lg | default, focus, error, disabled, readonly | ⬜ |
| NumberInput | plain, stepper (min/max) | sm, md, lg | default, focus, error, disabled | ⬜ |
| CurrencyInput | ₹-prefixed, comma-formatted | sm, md, lg | default, focus, error, disabled | ⬜ |
| PhoneInput | India format (+91) | sm, md, lg | default, focus, error, disabled | ⬜ |
| Textarea | — | sm, md, lg | default, focus, error, disabled | ⬜ |
| Checkbox | — | sm, md | default, checked, indeterminate, disabled | ⬜ |
| RadioGroup | — | sm, md | default, checked, disabled | ⬜ |
| Switch | — | sm, md | default, checked, disabled | ⬜ |
| FormField | wraps any of the above with label/help-text/error | — | default, error, required | ⬜ |

## Selection

| Component | Variants | Sizes | States | Status |
|---|---|---|---|---|
| SingleSelect | searchable dropdown | sm, md, lg | default, focus, error, disabled | ⬜ |
| MultiSelect | searchable, selected items as removable chips | sm, md, lg | default, focus, error, disabled | ⬜ |

## Modals & Overlays

| Component | Variants | Sizes | States | Status |
|---|---|---|---|---|
| Dialog | standard | sm, md, lg, xl, fullscreen | — | ⬜ |
| ConfirmationModal | default, destructive, warning | sm, md | — | ⬜ |
| Sheet (side drawer) | left, right | sm, md, lg | — | ⬜ |
| DropdownMenu | — | — | — | ⬜ (theme/variant pass on existing primitive) |
| Popover | — | — | — | ⬜ (theme/variant pass on existing primitive) |
| Tooltip | — | — | — | ⬜ (theme/variant pass on existing primitive) |

## Tables

| Component | Variants | Notes | Status |
|---|---|---|---|
| DataTable | standard, dense/compact, with-row-actions | base rendering | ⬜ |
| PaginatedDataTable | offset pagination, cursor pagination | unifies existing pattern component into the full system | ⬜ |
| Table empty state | — | reuses EmptyState | ⬜ |
| Table loading state | — | reuses Skeleton, row-shaped | ⬜ |

## Search

| Component | Variants | Status |
|---|---|---|
| SearchBar | standalone, with filter chips, with autocomplete suggestions | ⬜ |

## Pills, Chips, Badges, Status

| Component | Variants | Status |
|---|---|---|
| StatusPill | success, warning, error, info, neutral + entity-specific (patient/order/bill status mapping) | ⬜ |
| FilterChip | default, selected | ⬜ |
| RemovableChip | — | ⬜ |
| CountBadge | — | ⬜ (theme/variant pass on existing Badge primitive) |

## Tabs & Toggles

| Component | Variants | Status |
|---|---|---|
| Tabs | underline, pill, vertical | ⬜ (theme/variant pass on existing primitive) |
| SegmentedControl | — | ⬜ |

## Date & Time

| Component | Variants | Status |
|---|---|---|
| DatePicker | single date | ⬜ |
| DateRangePicker | — | ⬜ |
| TimePicker | — | ⬜ |

## Navigation

| Component | Variants | Status |
|---|---|---|
| Sidebar | expanded, collapsed | ⬜ |
| Breadcrumbs | — | ⬜ |
| PageHeader/Toolbar | title + breadcrumb + primary actions | ⬜ |

## Cards & Stats

| Component | Variants | Status |
|---|---|---|
| Card | basic, list-item, clickable | ⬜ (theme/variant pass on existing primitive) |
| StatCard/KPITile | number + label + trend arrow | ⬜ |

## Feedback

| Component | Variants | Status |
|---|---|---|
| Toast | success, warning, error, info | ⬜ (theme/variant pass on existing sonner integration) |
| Alert/Banner | inline, page-level | ⬜ |
| EmptyState | — | ⬜ (theme/variant pass on existing pattern component) |
| Skeleton | text, card, table-row shapes | ⬜ (theme/variant pass on existing primitive) |

## Structured Content

| Component | Variants | Status |
|---|---|---|
| Stepper | horizontal, with validation state per step | ⬜ |
| Accordion | single-open, multi-open | ⬜ |
| Timeline/ActivityLog | — | ⬜ |
| FileUpload/Dropzone | single file, multi file | ⬜ |

## Charts

| Component | Variants | Status |
|---|---|---|
| Chart theme wrapper (recharts) | line, bar, pie/donut | ⬜ — apply `dataviz` skill's palette/design guidance when built |

---

## Session Log

- **2026-09-22** — Tracker created. Full component inventory locked in after
  iterative discussion with the owner (base list → +input variants →
  +MultiSelect/currency/phone/stepper/segmented-control/accordion/timeline/
  page-header/file-upload/chart-theme → +explicit SingleSelect split from
  MultiSelect). Starting build now: foundations first, then buttons/inputs,
  then working down the categories above.
