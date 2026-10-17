# Docsile HMS design system — reference snapshot

This folder is a snapshot of the mockup tool's "Docsile HMS · Design system"
export (`Design System.dc.html` + its supporting files), saved here so a
future update to that mockup can be diffed against what the app actually
implements — not re-derived from scratch each time.

**Workflow**: when a new mockup zip is provided, extract it, diff its
`Design System.dc.html` / `tokens.css` against the copies in this folder,
apply only what's new/changed to `web/src/index.css` and the component
library (`web/src/components/ui/*`), then overwrite the copies here with the
new version so the next diff is against the latest baseline.

## What's in `web/src/index.css` as of this snapshot (2026-10-17)

Token changes made to match this design system:
- `--color-background`: off-white (`#f7f7f8`) → pure white (`#ffffff`).
- `--color-divider` (new): `#e2e8f0` — internal row/section dividers,
  distinct from the stronger `--color-border` (`#cbd5e1`), which is reserved
  for a surface's own outer edge (card/table/popover ring via `--shadow-*`).
- `--color-primary-hover` / `--color-primary-pressed`, `--color-accent-hover`
  / `--color-accent-pressed`, `--color-error-hover` / `--color-error-pressed`
  (new) — named interaction-state tokens for buttons/action chips, pulled
  out of the design system's "Button" variant table instead of leaving them
  as one-off hexes in component files.
- `--text-overline` (new): `0.65rem` (~11px at this app's 17px root) — the
  small-caps table-header / kbd-shortcut size, the one role size not already
  covered by the existing `--text-display/title/subtitle/body/caption` scale.
- Added `.type-*` utility classes (`type-display`, `type-title`,
  `type-subtitle`, `type-body`, `type-body-strong`, `type-caption`,
  `type-overline`, `type-mono-id`, `type-mono-kbd`) — one per named role in
  the design system's "Typography" section, composing family/size/weight/
  line-height/color in one class.
- Everything else (`--color-border`, `--radius-*`, `--shadow-*`, status
  colors, the base `--text-*` scale, the 17px root font-size) already
  matched this design system when it was generated — this mockup was built
  by reading the live `web/src/index.css`, not the other way around.

## What's in `web/src/components/ui/*` as of this snapshot

Swept the "Base components" section's documented variants/states against
each existing component and fixed real mismatches:
- **Button**: radius now `--radius` (8px, not the smaller 6px), every
  variant has a real named hover/pressed color (not an opacity tint), added
  a new `soft` variant, focus is a 3px/35%-opacity glow (not Tailwind's
  default `ring-2 ring-offset-2`).
- **Input / Textarea / Select**: radius `--radius`, focus is a border-color
  change + 3px/15%-opacity glow (softer than buttons, since the border
  itself already signals focus), disabled dims to 60% opacity (not 50%).
- **Checkbox / Radio**: disabled fills with `--color-muted` (not just a
  dimmed white), focus glow, disabled opacity 50% (confirmed against the
  design system's own data — distinct from the 45% buttons use).
- **Switch**: off-track uses `--color-border` (not `--color-muted`, which
  was nearly invisible against the page).
- **Card**: uses `--shadow-card` (hairline ring + soft shadow composited as
  one box-shadow) instead of a literal `border` + separate `shadow-sm`.
- **Table**: header/row/footer rules use `--color-divider`, not
  `--color-border`; selected-row background uses `--color-accent` (the
  design system's documented "selected row" color), not `--color-muted`.
- **IconButton / AlertDialog actions / ConfirmationModal**: same
  radius/hover/pressed/focus treatment as Button, for consistency.
- **Separator, `.filter-divider`, Command's internal rules**: switched to
  `--color-divider`.
- **Kbd** (new component) and **Progress** (new component, extracted from
  ad hoc progress-bar markup in `pages/staff/roles-tab.tsx`) — both named
  "base components" in the design system that didn't exist in the library.
- **Tabs**: segmented-active shadow corrected to `--shadow-sm` (was
  `--shadow-xs`) per the design system's "Segmented active" spec.

Badge, Avatar, AlertBanner (Banner), Dialog, Popover, Dropdown-menu,
Tooltip, Sheet, Stepper were checked and already matched — no changes
needed.

## Building blocks pass (same day, follow-up)

Went through the design system's "Building blocks" section against the real
components that implement each one (not a blind rebuild from the swatch
page):

- **Shell/Sidebar**: internal header/footer separators in
  `patterns/navigation/sidebar.tsx` switched to `--color-divider` (its own
  outer edge keeps the dedicated `--color-sidebar-border` token).
- **Combobox**: `editable-combobox.tsx`'s dropdown panel was using a literal
  `border` + generic `shadow-md` instead of the `--shadow-popover` composite
  every other popover surface uses (`combobox.tsx`, `popover.tsx`,
  `dropdown-menu.tsx`) — fixed, plus its "+ Add '...' to list" row separator
  switched to `--color-divider`.
- **QueueRow / Pagination**: `patterns/tables/paginated-data-table.tsx`'s
  page-number buttons, "Load more" button, and retry button were literal
  `border + bg-white` boxes — switched to the `shadow-card` chip treatment
  the design system's Pagination spec shows (no literal border), with the
  focus glow composed onto the resting shadow correctly. Its two footer
  separators and the rows-per-page `<select>` (radius + focus treatment)
  fixed to match Input/Select's conventions.
- **RefractionGrid**: `pages/workup/eye-reading-form.tsx` had 4 panel
  containers styled as `bg-gray-50 border border-border` — the design
  system's spec is a borderless `background: var(--color-muted)` card;
  fixed, plus 7 internal section-divider lines switched to
  `--color-divider`.
- **DetailDrawer**: `insurance/claim-detail-panel.tsx`'s header separator
  switched to `--color-divider` (`call-detail-sheet.tsx` and the shared
  `Sheet` primitive were already correct).
- **VisitTimeline**: `patient-care/patient-detail-page.tsx`'s History tab
  connector line switched from `--color-border` to `--color-divider`,
  matching the design system's timeline-connector spec exactly.
- **PatientBanner / SlotPicker / a global ⌘K search bar / a multi-select
  "bulk action bar"**: none of these exist as real components or features
  in the app today — not built in this pass. `SlotPicker` was separately,
  explicitly deferred by the user earlier in this project ("keep that in
  your memory, we'll talk about that later"); the other three are net-new
  feature surfaces, not styling fixes, and weren't asked for.
- **PrescriptionRow/TemplatePicker, BillTable**: checked — both already use
  this app's own established UI pattern (a `SingleSelect` template picker
  instead of inline pill chips; a Dialog-based "add new medicine" flow
  instead of an inline dashed-border row), which earlier main-parity passes
  verified deliberately. Left as-is rather than redesigned to match the
  mockup's literal layout, since that's a structural/UX choice, not a
  color/token mismatch.
- **Icons**: the design system's icon-to-concept mapping (Users→Patients,
  Stethoscope→Doctor, etc.) already matches — same Lucide icon set, no
  changes needed.

**Found but explicitly NOT swept**: `border-border` (the Tailwind utility
generated from `--color-border`) is used in ~44 files across the app,
conflating "this surface's own outer edge" (correctly `--color-border`) with
"an internal row/section divider" (should be `--color-divider`) in ways that
can't be told apart by a blind find-and-replace — each needs the same
read-the-file judgment call made throughout this pass. Only fixed where a
file was already being touched for one of the building blocks above; the
other ~40 files are a real, separate follow-up opportunity, not done here.

## Deliberately NOT done at all

Charts, Receipt documents, Accordion/menu, Empty/error/skeleton states,
"Form anatomy" and "WizardDialog" are listed in the design system's own
sidebar nav but have no actual rendered section in `Design System.dc.html`
(the file ends after Icons) — there's nothing concrete yet to diff against
for those. They may be defined in the actual mockup screens saved in
`mockup-screens/` (`Dashboard Mockups.dc.html`, `HMS Mockups.dc.html`,
`HMS Prototype Desktop.dc.html`, `HMS Prototype Tablet.dc.html`), which
have **not been reviewed against the app at all** — that's the next pass.
