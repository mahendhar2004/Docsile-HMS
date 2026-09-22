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
  not a fresh visual direction. (Theme/tokens only — see below, this does
  NOT extend to the component code itself.)
- Light mode only for this pass. Dark mode is a deliberate later pass, not
  built now.
- Motion: fast (~100ms) micro-feedback for hover/press/focus, but
  expressive/fluid spring-based easing (~250-350ms) for entrances/exits
  (modals, sheets, page transitions, list changes) — richer than the
  existing 150-200ms linear fades, per explicit owner direction ("more
  expressive/fluid" over "snappy/minimal").
- **Clean-slate component rebuild (added 2026-09-22):** every component,
  INCLUDING the Tier 1 primitives already sitting in `web/src/components/ui/`
  (copied over from the old Next.js app during Phase 6 scaffolding), is
  rewritten from scratch. No component file is extended in place or used
  as a reference for structure/styling — old files get deleted and
  replaced, not edited. Real business data (status enums, field shapes)
  is still fair game to reference for correctness; old component *code*
  is not.
- Nothing here gets used in a real page until the owner reviews the
  `/design-system` route and explicitly approves moving to real frontend
  build-out.

**File structure (locked in 2026-09-22 — "SDE-5" organization: domain-grouped,
barrel-exported, consistent kebab-case naming throughout, fixing the
previous `ui/` kebab-case vs `patterns/` PascalCase inconsistency):**

```
web/src/components/
├── ui/                       # Tier 1 — primitives (flat files, kebab-case)
│   ├── button.tsx, icon-button.tsx
│   ├── input.tsx, textarea.tsx, checkbox.tsx, radio-group.tsx, switch.tsx, label.tsx
│   ├── select.tsx, combobox.tsx, command.tsx
│   ├── badge.tsx
│   ├── dialog.tsx, alert-dialog.tsx, sheet.tsx, popover.tsx, tooltip.tsx, dropdown-menu.tsx
│   ├── table.tsx, tabs.tsx
│   ├── card.tsx, avatar.tsx, separator.tsx, scroll-area.tsx, skeleton.tsx, sonner.tsx
│   └── index.ts                            # barrel export of all of the above
│
├── patterns/                 # Tier 2 — composite, domain-grouped subfolders
│   ├── forms/            {text-input, number-input, currency-input, phone-input, form-section}.tsx + index.ts
│   ├── selection/         {single-select, multi-select}.tsx + index.ts
│   ├── status/            {status-pill, status-map(.ts), filter-chip, removable-chip}.tsx + index.ts
│   ├── modals/            {confirmation-modal, data-modal}.tsx + index.ts
│   ├── tables/            {data-table, paginated-data-table}.tsx + index.ts
│   ├── search/            {search-bar}.tsx + index.ts
│   ├── toggles/           {segmented-control}.tsx + index.ts
│   ├── date-time/         {date-picker, date-range-picker, time-picker}.tsx + index.ts
│   ├── navigation/        {sidebar, breadcrumbs, page-header}.tsx + index.ts
│   ├── cards/             {stat-card}.tsx + index.ts
│   ├── feedback/          {empty-state, error-state, alert-banner}.tsx + index.ts
│   ├── structured-content/ {stepper, accordion, timeline, file-upload}.tsx + index.ts
│   ├── charts/            {chart-theme(.ts), line-chart, bar-chart, donut-chart}.tsx + index.ts
│   └── index.ts                            # re-exports every category above
│
└── index.ts                                # top-level: re-exports ui + patterns
```

Every folder's `index.ts` is a plain barrel (`export * from './x'` or named exports) —
no logic lives in an index file.

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
| Button | primary, secondary, outline, ghost, destructive, link | sm, md, lg | default, hover, active, disabled, loading | ✅ |
| IconButton | same variants as Button | sm, md, lg | default, hover, active, disabled, loading | ✅ |

## Inputs & Form Controls

| Component | Variants | Sizes | States | Status |
|---|---|---|---|---|
| TextInput | text, email, password (show/hide toggle), search (icon + clear) | sm, md, lg | default, focus, error, disabled, readonly | ✅ |
| NumberInput | plain, stepper (min/max) | sm, md, lg | default, focus, error, disabled | ✅ |
| CurrencyInput | ₹-prefixed, comma-formatted | sm, md, lg | default, focus, error, disabled | ✅ |
| PhoneInput | India format (+91) | sm, md, lg | default, focus, error, disabled | ✅ |
| Textarea | — | sm, md, lg | default, focus, error, disabled | ✅ |
| Checkbox | — | sm, md | default, checked, indeterminate, disabled | ✅ |
| RadioGroup | — | sm, md | default, checked, disabled | ✅ |
| Switch | — | sm, md | default, checked, disabled | ✅ |
| FormField | wraps any of the above with label/help-text/error | — | default, error, required | ✅ |

## Selection

| Component | Variants | Sizes | States | Status |
|---|---|---|---|---|
| SingleSelect | searchable dropdown | sm, md, lg | default, focus, error, disabled | ✅ |
| MultiSelect | searchable, selected items as removable chips | sm, md, lg | default, focus, error, disabled | ✅ |

## Modals & Overlays

| Component | Variants | Sizes | States | Status |
|---|---|---|---|---|
| Dialog | standard | sm, md, lg, xl, fullscreen | — | ✅ |
| AlertDialog | — (primitive for ConfirmationModal) | sm, md | — | ✅ |
| ConfirmationModal | default, destructive, warning | sm, md | loading confirm button | ✅ |
| DataModal | — (TanStack Query-driven render-prop modal) | sm, md, lg, xl, fullscreen | loading/error/empty internally | ✅ |
| Sheet (side drawer) | left, right | sm, md, lg | — | ✅ |
| DropdownMenu | — | — | — | ✅ |
| Popover | — | — | — | ✅ |
| Tooltip | — | — | — | ✅ |

## Tables

| Component | Variants | Notes | Status |
|---|---|---|---|
| DataTable | standard, dense/compact, with-row-actions | base rendering | ✅ |
| PaginatedDataTable | offset pagination, cursor pagination | rebuilt from scratch as data-table.tsx + paginated-data-table.tsx | ✅ |
| Table empty state | — | accepts `emptyState?: React.ReactNode` slot; default "No records found" message built-in | ✅ |
| Table loading state | — | row-shaped Skeleton rows, count matches `skeletonRows` prop | ✅ |

## Search

| Component | Variants | Status |
|---|---|---|
| SearchBar | standalone, with filter chips, with autocomplete suggestions | ✅ |

## Pills, Chips, Badges, Status

| Component | Variants | Status |
|---|---|---|
| StatusPill | success, warning, error, info, neutral + entity-specific (patient/order/bill status mapping) | ✅ |
| FilterChip | default, selected | ✅ |
| RemovableChip | — | ✅ |
| CountBadge | — | ✅ |

## Tabs & Toggles

| Component | Variants | Status |
|---|---|---|
| Tabs | underline, pill, vertical | ✅ |
| SegmentedControl | — | ✅ |

## Date & Time

| Component | Variants | Status |
|---|---|---|
| DatePicker | single date, sm/md/lg, default/focus/error/disabled | ✅ |
| DateRangePicker | range mode, two-month calendar, sm/md/lg, default/focus/error/disabled | ✅ |
| TimePicker | inline HH:MM stepper (24 h, 15-min step default), sm/md/lg, default/error/disabled | ✅ |

## Navigation

| Component | Variants | Status |
|---|---|---|
| Sidebar | expanded, collapsed | ✅ |
| Breadcrumbs | — | ✅ |
| PageHeader/Toolbar | title + breadcrumb + primary actions | ✅ |

## Cards & Stats

| Component | Variants | Status |
|---|---|---|
| Card | flat (bordered), elevated (shadow), interactive (clickable) | ✅ |
| StatCard/KPITile | number + label + optional icon + optional trend arrow | ✅ |

## Feedback

| Component | Variants | Status |
|---|---|---|
| Toast | success, warning, error, info | ⬜ |
| Alert/Banner | inline, page-level | ⬜ |
| EmptyState | — | ⬜ |
| Skeleton | text, card, table-row shapes | ⬜ |

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

- **2026-09-22** — Batch 2 complete: Selection dropdowns + Pills/Chips/Badges/Status.
  All old ui/select.tsx, combobox.tsx, command.tsx, badge.tsx deleted and rewritten
  from scratch. New files: ui/{command,combobox,select,badge}.tsx + patterns/selection/
  {single-select,multi-select,index}.ts + patterns/status/{status-map,status-pill,
  filter-chip,removable-chip,index}.ts. Build: zero compile errors.

  **Status → color-bucket mapping table:**

  | Entity | Status values | Bucket |
  |---|---|---|
  | PatientStatus | REGISTERED, IN_WORKUP, WITH_DOCTOR, MEDICAL_ONLY | info |
  | PatientStatus | WORKUP_DONE, VISITED | warning |
  | PatientStatus | COMPLETED | success |
  | PatientStatus | CANCELLED | error |
  | PatientStatus | MOVED, NO_SHOW | neutral |
  | InPatientStatus | ADMITTED, POST_OP | info |
  | InPatientStatus | PRE_OP, IN_SURGERY | warning |
  | InPatientStatus | READY_FOR_DISCHARGE, DISCHARGED | success |
  | InsuranceClaimStatus | PREAUTH_SUBMITTED, ENHANCEMENT_CLAIMED, FINAL_BILL_SUBMITTED | info |
  | InsuranceClaimStatus | PREAUTH_QUERY, ENHANCEMENT_QUERY, PARTIALLY_SETTLED | warning |
  | InsuranceClaimStatus | PREAUTH_APPROVED, ENHANCEMENT_APPROVED, SETTLED | success |
  | InsuranceClaimStatus | PREAUTH_REJECTED, ENHANCEMENT_REJECTED, CLAIM_REJECTED | error |
  | InsuranceClaimStatus | CLOSED | neutral |
  | PrescriptionStatus | BILLING_ONLY | info |
  | PrescriptionStatus | DRAFT | warning |
  | PrescriptionStatus | COMPLETED, PAID | success |
  | PrescriptionStatus | CANCELLED, DUE | error |
  | Bill status | PENDING, PARTIAL | warning |

- **2026-09-22 (Batch 3)** — Modals & Overlays + Tabs & Toggles built from
  scratch (clean-slate rebuild — old shadcn/radix-ui copy-paste files deleted
  first). Built: Dialog (5 sizes, entrance + exit CSS animations via React 19
  `<style>` hoisting + Radix animationend detection), AlertDialog (no
  click-outside-to-dismiss primitive), Sheet (left/right × 3 sizes, per-side
  spring/fluid slide animations), Popover, Tooltip, DropdownMenu (with
  CheckboxItem, RadioItem, SubMenu, Shortcut), Tabs (underline/pill/vertical
  variants via context propagation), ConfirmationModal (default/destructive/
  warning — each has its own icon badge + accent color scheme, async-aware
  confirm button with spinner), DataModal (TanStack Query render-prop modal —
  owns loading/error/empty state, only gives data to the render prop),
  SegmentedControl (Radix Tabs under the hood for a11y, pill-group visual
  with sm/md/lg sizes). `npm run build` → zero errors.
- **2026-09-22** — Batch 1 complete (Buttons + Inputs & Form Controls). All
  old Next.js-copied ui/ files deleted and rewritten from scratch. New
  structure: `ui/{button,icon-button,input,textarea,checkbox,radio-group,
  switch,label}.tsx` + `patterns/forms/{text-input,number-input,
  currency-input,phone-input,form-section}.tsx`. Key decisions: CVA for all
  variants/sizes; Radix UI primitives for checkbox/radio/switch/label; no
  `any` types; loading state on Button/IconButton via `loading` prop +
  aria-busy; password show/hide and search clear/icon in TextInput;
  ₹-prefix + focus-raw/blur-formatted in CurrencyInput; +91 prefix + 10-
  digit length validation in PhoneInput; NumberInput stepper fires native
  change event for controlled consumers. LoginPage.tsx import path updated
  (FormFieldRow moved to patterns/forms/form-section). tsc --noEmit: zero
  errors.
- **2026-09-22 (Batch 5)** — Built date-time picker suite from scratch:
  `DatePicker` (single, react-day-picker v10 "single" mode, Popover, 3 sizes,
  clear button, full keyboard nav), `DateRangePicker` (range mode, 2-month
  calendar, partial-selection arrow indicator, same trigger pattern),
  `TimePicker` (inline HH:MM stepper — no react-day-picker needed; 24 h
  format, 15-min step default with `minuteStep` override, digit-buffer keyboard
  entry, hospital scheduling UX). All themed via CSS variable classNames prop
  on react-day-picker. Both `popover.tsx` and `input.tsx` were present from
  parallel batches; Popover was used directly. `input.tsx` was not needed (the
  trigger is a styled button, not a text input). Components compile cleanly;
  pre-existing build errors (patterns/index.ts → missing DataModal/FormSection
  files, navigation/sidebar unused React import, LoginPage import) are from
  other batches and do not involve the date-time module.
- **2026-09-22 (Batch 6)** — Built navigation suite from scratch:
  `Sidebar` (expanded/collapsed toggle via `--ease-spring` width transition,
  all 19 nav items — Dashboard + 18 modules — grouped into 4 sections with
  section labels in expanded mode and dividers in collapsed, permission-aware
  via `usePermissions().can()`, ADMIN bypasses all checks, Settings pinned
  at footer, NavLink active state uses `rgba(37,99,235,0.06)` bg +
  `--color-sidebar-active-foreground` blue on icon/text, controlled or
  uncontrolled collapse), `Breadcrumbs` (Home icon anchor + chevron-separated
  crumbs, last item gets `aria-current="page"`, links for intermediate crumbs
  with href), `PageHeader` (h1 title + optional description/subtitle + optional
  breadcrumbs above title + right-side actions slot). All files in
  `patterns/navigation/`, barrel-exported from `index.ts`. Zero new TypeScript
  errors introduced.
- **2026-09-22 (Batch 7)** — Cards & Stats built from scratch.
  Deleted old shadcn-derived `ui/{card,avatar,separator,scroll-area,skeleton}.tsx`
  and rewrote all five from scratch with design tokens. New files:
  `ui/card.tsx` (Card/CardHeader/CardTitle/CardDescription/CardContent/CardFooter;
  `variant` = elevated (shadow-sm, default) | flat (border only); `interactive`
  prop adds `.motion-interactive` + hover tint + focus-ring for clickable tiles),
  `ui/avatar.tsx` (Avatar/AvatarImage/AvatarFallback via @radix-ui/react-avatar;
  sm/md/lg sizes; size passed via context to Fallback so font scales automatically;
  fallback uses --color-muted bg + uppercase initials),
  `ui/separator.tsx` (thin @radix-ui/react-separator wrapper; --color-border;
  horizontal h-px / vertical w-px),
  `ui/scroll-area.tsx` (thin @radix-ui/react-scroll-area wrapper; themed thumb
  --color-muted-foreground 40% opacity; `orientation` prop = vertical/horizontal/both),
  `ui/skeleton.tsx` (pulsing div; --color-muted bg; aria-hidden; general-purpose
  — does NOT replace inline skeleton rows in DataTable/DataModal).
  New Tier 2: `patterns/cards/stat-card.tsx` (StatCard: label + display-size value +
  optional icon in accent-tinted square badge + optional TrendBadge + loading skeleton).
  Trend direction decisions: "up" → success green (--color-success-soft-foreground),
  "down" → error red (--color-error-soft-foreground), "neutral" → muted gray
  (--color-neutral-soft-foreground). Trend icons: TrendingUp/TrendingDown/Minus from
  lucide-react. Loading state renders three Skeleton blocks instead of the real content
  (no spinner). `onClick` prop makes the card interactive via Card's `interactive` prop.
  `patterns/cards/index.ts` barrel-exports StatCard + types.

- **2026-09-22 (Batch 4)** — Built tables + search from scratch.
  Deleted `ui/table.tsx` (old shadcn copy) and `patterns/PaginatedDataTable.tsx`
  (old single-mode component). New files: `ui/table.tsx` (fresh semantic Table/
  TableHeader/TableBody/TableFooter/TableRow/TableHead/TableCell/TableCaption, all
  CSS-variable themed), `patterns/tables/data-table.tsx` (generic `DataTable<T>`,
  standard/dense/with-row-actions variants, rowActions render-prop, keyboard-
  accessible row click), `patterns/tables/paginated-data-table.tsx` (wraps
  DataTable; discriminated union on `mode="offset"|"cursor"` — see API notes
  below; owns skeleton loading + inline error with retry + emptyState slot;
  cursor mode supports both load-more and prev/next-by-cursor sub-patterns),
  `patterns/search/search-bar.tsx` (standalone / with-filter-chips / with-
  autocomplete variants; autocomplete is ARIA combobox + listbox, full keyboard
  nav: ArrowUp/Down/Enter/Escape). All barrel-exported. `npm run build`: zero
  errors (1824 modules, 1.02 s).
