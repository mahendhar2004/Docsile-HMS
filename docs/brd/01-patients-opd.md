# Module 1 — Patients (OPD)

Source: `web/src/pages/PatientsPage.tsx`, `web/src/pages/patient-care/{opd-tab,patient-registration-form,patient-detail-page,stats-modal,add-services-modal,hooks,types}.tsx`, `supabase/functions/patient-care/*`.

## 1. Overview

The entry point for every walk-in/out-patient visit. Covers: today's (or
any day's) list of registered OPD patients, registering a brand-new
patient (demographics → services & billing → printed receipt, in one
wizard), looking up an existing patient, editing a patient's details, and
a full patient detail page (info, receipts, visit history, billing,
status, appointment date). This is also where a patient first gets
assigned to a doctor, which later modules (Workup, Doctor) pick up.

Route: `/patients` (list, tab 1 of 2 — the other tab is In-Patients, see
Module 2) and `/patients/:id` (detail page).

## 2. Permissions

| Key | Gates |
|---|---|
| `patients:view` | Whether the Out-Patients tab renders at all (page-level — if neither this nor `inpatients:view` is granted, the whole Patients page shows an "Access denied" state). |
| `patients:create` | The "Add Patient" header button and the empty-state's "Register Patient" button (OPD tab only — on the In-Patients tab the equivalent is `inpatients:create`). |
| `patients:edit` | The row-action menu's "Edit" item; on the detail page, the Status selector, the Move Appointment card, and (indirectly) whether `patients:edit` call sites are shown at all. |
| `patients:delete` | The row-action menu's "Delete" item; on the detail page, the header's Delete (trash) button. |
| `billing:create` | The detail page's "Add Service" button and "Record Payment" button. |
| `billing:view` | The OPD table's per-row quick-print (⚡) column; the detail page's "Print" button (header and per-receipt) and the whole tabbed print modal. |

`patients:view` is required just to see the list; none of the write
permissions imply read — a user with only `patients:edit` but not
`patients:view` would never reach a screen to use it from (not enforced
in UI, just how the permission matrix is structured).

## 3. Screens

### 3.1 Patients list (OPD tab)

**Entry point**: default landing tab of `/patients` (or the "Out-Patients"
tab if both OPD and IPD are visible — `PatientsPage.tsx` auto-selects IPD
instead if the user lacks `patients:view`).

**Page header** (shared with the In-Patients tab — same header, same two
buttons, regardless of which tab is active):
- Title "Patients", description "Registration & management".
- Refresh icon next to the title — re-fetches whichever tab is currently active.
- Center: "Out-Patients" / "In-Patients" tab switcher (only shown if the user has both `patients:view` and `inpatients:view`; otherwise the page just shows whichever one tab the user can see, no switcher).
- Right: **Stats** button (always visible, regardless of tab or permission — opens the Stats modal, §3.5) and **Add Patient** button (label never changes between tabs; on the OPD tab it opens the Registration wizard, on the IPD tab it opens the Admission wizard — gated by `patients:create` / `inpatients:create` respectively).

**Toolbar** (directly under the header, no gap):
- Gear/Settings icon button (left) — navigates to `/settings`. (Historical note: main puts this on the right as part of a "filters" area; this port moved it to the far left per an explicit user request, with Date+Search pushed to the far right instead — a deliberate, acknowledged deviation from main's literal layout, not a parity gap.)
- Date navigator (right side): `‹` / date pill (click opens a calendar popover) / `›`, plus a "Today" shortcut that only appears when the selected date isn't today. Changing the date always resets the table to page 1.
- Search box (far right, max-width constrained): type-ahead autocomplete against existing patients (debounced query to the search endpoint, by name/phone/ID). Two distinct behaviors:
  - **Selecting a suggestion** from the dropdown navigates straight to that patient's detail page (`/patients/:id`) — regardless of what date is currently selected in the list.
  - **Pressing Enter with no suggestion highlighted** instead re-queries the *current day's list itself* (server-side `ilike` filter on patientId/phone/firstName/lastName) and resets to page 1 — it does **not** navigate anywhere; it narrows the table you're looking at. This filtered state is also fed back up to the parent page so the **Stats** modal reflects only the filtered subset, not the whole day, while a filter is active.

**Table columns** (left to right), one row per patient, newest-registered-first by default:
1. **Token** — a per-day, per-tenant sequential number (not stored — reconstructed client-side from `total`/`page`/`pageSize` so it survives pagination and column sorting; looked up by `patientId`, not row position, so re-sorting the table by another column never changes an already-rendered row's token). Rendered as a dashed-bordered badge.
2. **Time** — `createdAt` formatted `hh:mm a`. Sortable (click header).
3. **ID** — the human `patientId` (e.g. `0118`), monospace. Sortable.
4. **Name** — first + last name. Sortable (by first+last name concatenated).
5. **Age / Gender** — computed age from `dateOfBirth` if present, else just gender alone.
6. **Phone**.
7. **Doctor** — the first prescription's `doctorName` for that visit (prefixed `Dr.` if the stored name doesn't already start with "Dr"); shown as `—` if no prescription/doctor yet.
8. **Type** — `patientType` (e.g. "OPD").
9. **Status** — a colored status pill (see §4 for the full status model). Sortable.
10. **Services** — the first billed service's name as a chip, plus a `+N` chip if more than one; hovering shows a tooltip listing every service on that visit's prescription.
11. **Receipt** — that visit's prescription total, with a "Due: ₹X" sub-line in orange if `balanceDue > 0`; `—` if no prescription yet.
12. **Referred By** — free text, `—` if empty.
13. **(icon-only, `billing:view` only)** — a lightning-bolt quick-print button, only rendered at all for rows whose status is `COMPLETED`. Disabled (greyed, tooltipped "Configure defaults in Settings → Print Defaults") until at least one receipt type has a default template configured in Settings → Print Defaults. Clicking it fetches that patient's receipt data and immediately opens the browser print dialog with the hospital's configured default receipt layout — no modal, no preview, one click to print.

**Row interaction**: clicking anywhere on a row (not a button) navigates to that patient's detail page. A hover-revealed "⋮" menu on the right of each row (only rendered if the user has `patients:edit` or `patients:delete`) offers:
- **Edit** (`patients:edit`) — opens the Edit Patient dialog in place (§3.3), does not navigate away.
- **Delete** (`patients:delete`) — opens a destructive confirmation modal ("Delete {name} ({patientId})? This cannot be undone."); confirming calls the delete endpoint and refetches the list.

**Pagination**: server-side offset pagination, page-size selector (25/50/100), "X–Y of Z" summary, prev/next page-number buttons.

**Empty state**: "No patients today" / "No patients have been registered for {date}." with a "Register Patient" call-to-action button (only if `patients:create`).

### 3.2 Register Patient wizard

**Entry point**: "Add Patient" header button, or the empty-state's "Register Patient" button. A 3-step modal dialog; cannot be skipped or reordered.

A real Patient row is created the moment you click **Next** on Step 1 — closing the dialog after that point does **not** undo the patient creation (if you re-open and go through Step 1 again having already created one this session, it updates that same record instead of creating a duplicate).

#### Step 1 — Patient Info

| Field | Type | Required | Notes |
|---|---|---|---|
| Date | Date picker | — | Defaults to whatever date the OPD list is currently viewing (not always today). This becomes the patient's `appointmentDate`. |
| Patient ID | Read-only, monospace | — | Auto-populated from a **non-consuming preview** of the next sequence value the instant the dialog opens (re-fetched every time the dialog opens). Does **not** advance the real ID sequence just by opening the dialog — only the actual save at Step 1 does. |
| Name | Text | ✅ | Auto-uppercased as you type. Split on whitespace into `firstName`/`lastName` at save. |
| Guardian | Text | — | |
| Date of Birth | Date picker (max = today) | — | Editing this recomputes Age automatically. |
| Age | Number | — | Editing this recomputes DOB to `{currentYear − age}-01-01` (an approximation, not a real birth date) — the two fields are two-way bound, each overwrites the other. |
| Gender | Segmented control (Male / Female / Other) | ✅ | |
| Phone | Phone input (10-digit, +91 fixed prefix) | ✅ | Validated ≥10 digits before Next is allowed. |
| Email | Text (email type) | — | |
| Address | Tenant-editable autocomplete combobox | — | Suggestions come from every address value any staff member has ever typed for this hospital; typing a new one and confirming adds it to that shared list for next time. Single free-text field (explicitly simplified from an earlier structured Address-Line/Area/City/State/Pincode design per direct user request — "one address field is enough... when I enter gachibowli first time and try gachibowli next time it should appear in the dropdown"). |
| Patient Type | Tenant-editable combobox, default "Regular" | — | Same add-new-value pattern as Address. |
| Doctor Name | Tenant-editable combobox, sourced from the real Doctor master list (Settings → Doctors) | — | Has a star icon to "set as default" (persisted in this browser's `localStorage` only, not server-side) — a starred value auto-fills this field the next time *any* registration dialog is opened on this device. Typing a brand-new name and confirming creates a new bare-name row in the Doctor master list (visible afterward in Settings → Doctors for an admin to fill in department/fee/phone). |
| Department | Tenant-editable combobox | — | Same "set as default" star behavior as Doctor Name. |
| Referred By | Tenant-editable combobox | — | Same "set as default" star behavior. |

**Next button**: validates (Name, Gender, Phone ≥10 digits, Appointment Date all required) — shows an error toast naming the first missing/invalid field and does not advance if any fail. On success, creates the Patient record (or updates it, if you'd already created one and came back to Step 1), then moves to Step 2.

**Cancel**: closes the dialog entirely without confirmation (even if a patient was already created at this point — that created record is **not** rolled back).

#### Step 2 — Services & Payment

- **Registration Fee** toggle (only shown at all if the hospital has a registration fee configured in Settings → Hospital Profile): a checkbox row showing the configured fee amount; defaults checked/unchecked per that same hospital-wide setting. Checking it adds a synthetic "Registration Fee" line item (always pinned first in the list); unchecking removes it. This line item cannot have its quantity or price edited directly — only its on/off state.
- **Search services** box + **category filter** dropdown (All / Consultation / Diagnostic / Procedure / Medicine / Other) — filters the list of selectable service templates below by name and/or category.
- **Service template list**: every active Service Template from Settings, each a clickable row showing name, category chip, price, and a green "-₹X" badge if that template carries a configured discount. Clicking a template:
  - Adds it to the "Added" list above (qty 1, unit price = the template's price) **if not already added**.
  - If a discount is configured on that template, that discount amount is automatically added to the running Discount total.
  - **Clicking an already-added template's row again removes it** (and subtracts its discount back out) — this is a toggle, not an incremental add.
- **Add custom service**: an inline "+ Add custom service" link expands to a one-off row (name text, category dropdown, amount) with its own Add/Cancel buttons — adds a line item not tied to any template (so toggling it off later via the template list doesn't apply; it must be removed via its own ✕).
- **Added services list**: each line shows description, category, an inline editable qty×price (both independently editable, auto-recomputing that line's amount), the line total, and a hover-revealed ✕ to remove.
- **Totals block** (only shown once at least one service is added):
  - Subtotal = sum of all line amounts.
  - Discount — a free-form currency input (pre-populated by template discounts above, but the user can edit it to anything, including overriding to 0 or a different number).
  - Total = Subtotal − Discount.
  - Payment Mode — dropdown (Cash / UPI / Card / Cheque / Online / NEFT), defaults Cash.
  - Received — currency input, **auto-set to equal Total every time Total changes** (so by default a visit is marked as fully paid; the user has to manually reduce "Received" to record a partial payment).
  - Balance = Total − Received, shown in red if positive.

**Back button**: returns to Step 1 without losing any Step-2 state already entered.

**Confirm & Register**: requires at least one service line (error toast "Add at least one service" otherwise). Creates one Prescription record bundling every selected line item as an InvoiceItem, plus a Payment record **only if** Received > 0. On success, advances to Step 3 and reports the new patient back to the caller (which refetches the OPD list).

#### Step 3 — Receipt

A live, screen-rendered Cash Receipt (hospital letterhead, patient identity, doctor, line items, totals, payment mode, amount received/due) using the same component the real print output uses.

- **Print** button — opens the browser print dialog with exactly what's on screen.
- **Done** button — closes the wizard entirely (does not reset anything; next open starts a brand-new registration from Step 1).

### 3.3 Edit Patient dialog

**Entry point**: row-action "Edit" (`patients:edit`), from the OPD list only (the detail page has no Edit action at all — see §3.4).

A simpler single-step form (react-hook-form + Zod), fields: First Name*, Last Name*, Phone* (≥7 chars), Email (optional, validated as an email if given), Gender* (dropdown), Date of Birth (date picker, max today), Address (plain text — not the tenant-editable combobox Step 1 uses, since this older form has no options-fetching wired up for it), Patient Type* (dropdown: OPD / Walk-in / Referral — a fixed enum here, unlike the free-text combobox in the Registration wizard), Appointment Date* (date picker), Referred By (plain text).

"Save Changes" submits a PATCH; "Cancel" discards. Errors (e.g. a failed save) render inline below the form as plain text.

### 3.4 Patient Detail page

**Entry point**: clicking any OPD table row, or selecting a search suggestion. URL: `/patients/:id`.

**"← Back to Patients"** link at the top returns to the list (not browser-back specifically — always the list).

**Header card**: a 1px-high colored status bar along the top (color keyed to status — green for COMPLETED, blue for VISITED/MEDICAL_ONLY, red for CANCELLED/NO_SHOW, amber for MOVED, default primary-blue otherwise), then:
- Avatar (initials) + full name + status pill.
- A row of: patient ID (monospace chip), phone, age/gender, doctor name (only the ones that have a value are shown — no "—" placeholders here, unlike the Info tab).
- Right side: a colored balance badge — red "Balance Due ₹X" if any prescription on this patient has `balanceDue > 0`, green "No Dues" if there's at least one billed prescription and none are unpaid, or nothing at all if the patient has no billed prescriptions yet.
- **Print** button (`billing:view`) — opens the tabbed print modal (§3.4.4).
- **Delete** button (`patients:delete`, icon-only, destructive-red) — opens a confirmation modal ("This will permanently delete {name} ({patientId}) and all associated records. This cannot be undone."); confirming deletes the patient and navigates back to the list.

*(No Edit action exists on this page at all — a deliberate, acknowledged gap: main's own detail view has no Edit either, so this isn't a missing feature so much as a faithful match; the list's own Edit dialog, §3.3, is the only way to edit a patient's core fields.)*

#### 3.4.1 Info tab (default)

A 2–3 column grid of read-only fields: Phone, Age/Gender, Date of Birth, Appointment (date), Doctor, Department, Referred By, Guardian (name + relation in parentheses if both present), Patient Type. Every empty field shows `—` rather than being hidden.

Below the grid, three conditional sections (only rendered if the data exists):
- **Address** — joins structured address parts (Address Line, Area, City, State, Pincode) if present, falling back to the legacy single `address` string.
- **Notes** — free text.
- **Eye Readings Available** — a small banner noting the date of the most recent eye reading on file (a pointer into the Workup module's data, not editable here).

#### 3.4.2 Receipts tab

One card per prescription that actually has a total > 0 (prescriptions with zero billing, e.g. a pure workup visit with no services yet, don't appear here), newest first. Each card: prescription number + date in the header, a Paid/Due pill, a per-card print icon (`billing:view`), then every line item with its amount, a subtotal/discount/received breakdown, and the payment mode used. Empty state: "No receipts yet — Add services to generate receipts."

#### 3.4.3 History tab

A vertical timeline, one dot+entry per prescription (status label, date, prescription number if any, total + a red "Due: ₹X" chip if unpaid), connected by a single vertical line. Dot color: green = COMPLETED, blue = BILLING_ONLY, primary-blue = everything else. Newest at the top. Empty state: a clock icon + "No history."

#### 3.4.4 Right-side action cards

- **Billing — Today's Visit** (`billing:view`): lists every *billed* prescription for this visit (collapsed by default; click to expand). Expanding a row shows its total/paid/due breakdown and, if `billing:create` and that prescription still has a balance due, a "Record Payment" button that opens an inline payment-amount form (submits against the same balance, reduces it, does not need a page reload to reflect). Below the list, an always-visible "+ Add Service" button (`billing:create`) opens the Add Services modal (§3.4.5). If there are no billed prescriptions at all yet, this card just says so in plain text.
- **Status** (`patients:edit`): a single dropdown of every possible patient status (Registered / In Workup / Workup Done / With Doctor / Visited / Completed / Medical Only / Moved / Cancelled / No Show) — selecting a new value immediately PATCHes it, no separate save step.
- **Move Appointment** (`patients:edit`): shows the current appointment date in plain text with a "Move" button; clicking it swaps in a date picker + Move/Cancel buttons. "Move" is disabled until a new date is actually picked.

#### 3.4.5 Add Services modal

Fields: Service (a `SingleSelect` of every active Service Template — picking one auto-fills the Amount field below with that template's price, which stays editable afterward), Payment Mode* (Cash/Card/UPI/Insurance/Cheque), Amount (optional — a positive number if given). Submits a single new billed line against this patient; the detail page's Billing card and Receipts tab both refresh to reflect it.

### 3.5 Stats modal

**Entry point**: the "Stats" header button — available regardless of which tab (OPD/IPD) is active, and its data is **always OPD-scoped** even when you're looking at the In-Patients tab (an intentional quirk carried over from the original app, not a bug). Also respects whatever text is currently in the list's search/filter box — i.e. if you've filtered the OPD list down to a few patients, Stats shows numbers for just that filtered subset, not the whole day.

Four tiles, computed client-side from the same patient list the table itself renders (no separate backend stats endpoint):
- **Total Patients** — count of all patients matching the current date/filter.
- **Registered** — count with status exactly `REGISTERED`.
- **In Progress** — count with status `IN_WORKUP`, `WORKUP_DONE`, or `WITH_DOCTOR`.
- **Visited** — count with status `VISITED`, `COMPLETED`, or `MEDICAL_ONLY`.

Below the tiles, a **Revenue** section: "Collected Today" = sum of every prescription's `amountPaid` across the list, broken down into per-payment-mode chips (Cash ₹X, UPI ₹Y, …) derived from the underlying Payment records — only modes with a nonzero sum are shown, sorted highest-first. A second line shows total outstanding balance due across the same set.

## 4. Business rules

- **Patient status** is a single enum field driving both the list's color-coded pill and this Stats modal's bucketing: `REGISTERED`, `IN_WORKUP`, `WORKUP_DONE`, `WITH_DOCTOR`, `VISITED`, `COMPLETED`, `MEDICAL_ONLY`, `MOVED`, `CANCELLED`, `NO_SHOW`. It's set automatically as the patient moves through Workup/Doctor (see those modules' BRDs), or manually via the detail page's Status card.
- **Patient ID generation is a two-function split, deliberately**: a real Postgres sequence (`next_patient_number()`) is advanced only at actual patient creation; a separate **non-consuming peek function** (`peek_patient_number()`) is used everywhere the ID is only being *previewed* (e.g. every time the Registration dialog opens) so that opening-and-abandoning the dialog repeatedly never burns real sequence values or creates gaps in patient numbering. This was a real bug fix mid-project — opening the dialog used to advance the real sequence every time.
- **Token numbering** (the list's leftmost column) is a pure display artifact — not stored anywhere — recomputed as `total − ((page−1)×pageSize + rowIndex)`, keyed by `patientId` so it survives client-side column sorting without becoming wrong.
- **Balance due** at every level (a single prescription's `balanceDue`, the detail page header's aggregate badge, the Stats modal's total) is always `total − amountPaid` on the underlying Prescription record — never independently recomputed from line items at display time.
- **"Add Service" vs. the Registration wizard's Step 2 are two different code paths** that both ultimately create InvoiceItems against a Prescription, but Add Service always creates exactly one line against whatever the *currently open* unbilled/partially-billed prescription is, while the Registration wizard can batch many lines into one Prescription in a single submit.
- The **Doctor Name** field (wizard, Edit dialog has no doctor field, detail page's Status/Move cards don't touch it) is the one place in this module that reaches outside Patients into the shared Doctor master list (see the Settings/Doctors BRD once written) — selecting/adding a doctor here is visible immediately in every other module's doctor pickers (Workup, Doctor console, Predefined Surgeries) and vice versa.

## 5. Data model (key fields)

**Patient**: `id` (uuid, internal), `patientId` (human-readable sequence string), `firstName`, `lastName`, `dateOfBirth`, `age`, `gender`, `phone`, `email`, `address` (legacy single field) / `addressLine`/`area`/`city`/`state`/`pincode` (structured, both kept), `guardianName`, `guardianRelation`, `referredBy`, `doctorName` (a plain string snapshot, not a foreign key to the Doctor table), `department`, `patientCategory`, `patientType`, `appointmentDate`, `status`, `notes`, `createdAt`.

**Prescription** (one per billed visit): `id`, `patientId`, `prescriptionNumber`, `prescriptionDate`, `status`, `subtotal`, `discount`, `total`, `amountPaid`, `balanceDue`, `paymentMode`, `doctorName`.

**InvoiceItem**: `id`, `prescriptionId`, `description`, `category`, `quantity`, `unitPrice`, `amount`, `sortOrder`.

**Payment**: `id`, `prescriptionId`, `amount`, `paymentMode`, `createdAt`.

**DropdownOption**: `fieldName` (`address`, `patientCategory`, `department`, `referredBy` — NOT `doctorName`, which moved to the real Doctor table), `value`, per-hospital.

## 6. Integration points

- Creates the Patient and Prescription/InvoiceItem/Payment records that the **Workup**, **Doctor**, **Reports**, **Analytics**, **Dues & Follow-Ups**, and **Dashboard** modules all read from.
- The chosen **Doctor Name** is the same shared free-text-but-master-backed value used by the IPD Admission wizard and Predefined Surgeries (Settings) — see the Settings/Doctors module once documented.
- `appointmentDate` is the field every other module's "today's queue" (Workup, Doctor) filters patients by.

## 7. Known deviations from main

- **Address**: single free-text tenant-editable field (matches main's actual real design — an earlier pass in this project had briefly over-built a structured Address Line/Area/City/State/Pincode form before reverting back to match main, per explicit user instruction).
- **Patients-list toolbar layout**: gear/filters icon on the left, Date+Search pushed to the far right — main itself puts Date+Search on the left. Explicit user-requested layout deviation, not a parity gap.
- **Patient Detail page has no Edit action** — matches main's real behavior exactly (main's own detail view doesn't have one either); the perception of "missing" only exists relative to this port's now-removed older slide-in panel, which had incorrectly added one.
- **Doctor Name is now backed by a real Doctor master entity** (Settings → Doctors) instead of main's free-text-only `DropdownOption` — a deliberate, explicit, user-requested deviation from main (see `docs/design-system/` session notes for when/why), not a parity gap.
