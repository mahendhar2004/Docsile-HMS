# Module 2 — In-Patients (IPD)

Source: `web/src/pages/InPatientsPage.tsx`, `web/src/pages/patient-care/{ipd-tab,inpatient-admission-form,hooks,types}.tsx`, `supabase/functions/patient-care/*` (same edge function as Module 1 — IPD and OPD share one backend service).

## 1. Overview

Manages admitted/discharged in-patients. Two distinct surfaces exist for
the same underlying data, matching the original app exactly:
- A **lightweight, view-only tab** embedded inside the Patients page (next to Out-Patients) — quick glance only, no admission, no filters.
- A **separate, fuller page** at `/inpatients` — the only place admission happens, with search/status filters and real stat badges.

An `InPatient` record in this app is a **self-contained record**, not a
thin pointer to a `Patient` row — it carries its own full demographic copy
(name, age, gender, phone, DOB, address, guardian) independent of any OPD
Patient record, even though the admission wizard *can* optionally copy
those fields in from an existing OPD patient at creation time as a
convenience. Editing a Patient afterward does not retroactively change
an already-created InPatient's copy of that data, and vice versa.

## 2. Permissions

| Key | Gates |
|---|---|
| `inpatients:view` | Whether either IPD surface renders at all. |
| `inpatients:create` | The "Admit Patient" button (on both the embedded tab's parent header and the standalone page's toolbar). |
| `inpatients:edit` | The Status dropdown in the detail sheet (shared with `inpatients:discharge` — either permission alone is enough to see it). |
| `inpatients:delete` | The Delete button in the detail sheet. |
| `inpatients:discharge` | Also shows the Status dropdown (see note in §4 — the dedicated discharge-specific backend endpoint this permission is named after is **not actually called** by any current UI). |

## 3. Screens

### 3.1 Embedded IPD tab (on `/patients`)

**Entry point**: the "In-Patients" tab next to Out-Patients on the Patients page (see Module 1 §3.1 for the shared page header/tab-switcher). Renders **no toolbar and no filters at all** — just the table, scoped server-side to currently-admitted patients **plus** anyone discharged in the last 2 days (today or yesterday, IST) — a deliberate "recent discharges only" narrowing so old discharge history doesn't clutter this quick-glance view (see §4).

**Table columns**: IP No. (monospace), Patient (name + age/gender/phone sub-line, or just a bare `name` field if the InPatient has no linked structured names), Doctor(s) (comma-joined from the JSON-array field, `—` if empty), Operation (or "Not assigned" in italic), Admitted (date), Ward, Bed, Status (colored pill), Balance (right-aligned, orange if > 0 else green).

**Row click**: opens the detail sheet (§3.3) — same component used by the standalone page.

**Admit Patient** button lives one level up, in `PatientsPage.tsx`'s shared header (see Module 1 §3.1) — not inside this tab itself.

### 3.2 Standalone In-Patients page (`/inpatients`)

**Entry point**: direct route, typically reached via the main nav, not from within the Patients page.

**Header**: title "In-Patients", description "Admission & ward management", a Refresh icon, and two real stat badges computed from the same list endpoint's own total count (not a separate stats call): **Admitted** (info-blue) and **Discharged** (success-green) — each is literally `GET .../inpatients?status=admitted` / `?status=discharged`'s own `meta.total`, so they're always accurate, just not broken down further.

**Toolbar**:
- Search box ("Search by name, IP number, phone...") — Enter-to-submit (not live-as-you-type), server-side `ilike` across IP number, guardian name, operation name, and the linked patient's name/phone.
- Status filter — a segmented control: All / Admitted / Discharged.
- "Admit Patient" button (`inpatients:create`, far right) — opens the Admission wizard (§3.4).

**Table**: identical columns to the embedded tab (§3.1), but **unfiltered by recency** — shows every inpatient record ever created, not just recent ones, since this is the "real" management view.

**Empty state**: "No inpatients found" / "Try adjusting the filters above" if a filter is active, else "Admitted patients will appear here" — with an "Admit Patient" action button if `inpatients:create`.

### 3.3 Inpatient Detail sheet (shared by both surfaces)

A right-side slide-in panel, identical component regardless of which surface it was opened from.

- **Header**: "IP: {ipNumber}" and "Patient ID: {patientId}".
- **Status row**: a colored status pill plus — if the user has `inpatients:edit` **or** `inpatients:discharge` — a dropdown (Admitted / Discharged). Changing it PATCHes immediately, no confirmation. *(See §4 — this is the generic status endpoint, not the dedicated discharge endpoint.)*
- **Admission Details** section: IP Number, Patient ID, Patient Name (only if present), Phone (only if present), Admission Date, Discharge Date (only if the record has one), Ward, Bed.
- **On-Duty Doctors** section (only rendered if the JSON array isn't empty): a plain bulleted list of names.
- **Footer**: a Delete (trash icon, destructive) button, `inpatients:delete` only — opens a confirmation modal ("Delete inpatient record {ipNumber}? This cannot be undone.").

No Edit action exists on this sheet at all — admission-time fields (operation, surgical team, package, payments) are **write-once at creation**; there is no UI anywhere in this module to go back and edit them after the fact (see §7).

### 3.4 Admit In-Patient wizard

**Entry point**: "Admit Patient" button on either IPD surface. A 3-step modal dialog, matching the structure of (and reusing many of the same shared pattern components as) the OPD Registration wizard, but admitting creates **one single API call at the very end** — unlike OPD's wizard, which creates the Patient at the end of Step 1 and the billing separately at the end of Step 2. Nothing is persisted until "Admit" on Step 3 is clicked; closing the dialog at any earlier point discards everything.

#### Step 1 — Patient Details

- **Existing patient lookup** (optional): a live search box (≥2 characters triggers a debounced query) against OPD patients by name/phone/ID. Picking a result auto-fills Name, Age, Gender, Phone, Address, Guardian Name, and Date of Birth from that patient's record (and remembers their `patientId` to send along, linking this InPatient back to that Patient record) — every field stays individually editable afterward, so picking a result is a starting point, not a lock.
- **Visit information**: IP Number (read-only, auto-populated from a non-consuming sequence preview — same peek-vs-consume pattern as OPD's Patient ID, see Module 1 §4), Admission date* (datetime picker, defaults to right now), Discharge date (date picker, optional, cannot be earlier than the admission date).
- **Patient demographics**: Full name*, Phone*, Gender* (segmented Male/Female/Other), Age* (number — editing Date of Birth auto-recomputes this), Date of Birth (date picker, max today), Address (same tenant-editable combobox as OPD), Guardian name, Referred by (tenant-editable combobox).
- **Admission notes** (optional): free-text textarea.

**Validation to leave Step 1**: Name, Age, Gender, Phone, and Admission Date must all be non-empty — "Next" is still clickable even if invalid, but clicking **Admit** on Step 3 will bounce you back to whichever earlier step first fails validation with an error toast (validation is only actually enforced at final submit, not per-step).

#### Step 2 — Hospital Information

- **Predefined surgery** (optional): a live search box against every Predefined Surgery template (Settings), filtered by name or department. Picking one auto-fills Operation Name, Department, Doctors, On-Duty Doctors, Provision Diagnosis, Operation Procedure, and Operation Details all at once; a "Reset" link appears afterward to clear everything the template filled back to blank. Typing anything into the search box after applying a template silently clears the "applied" indicator (so the Reset link disappears) without undoing the filled values — they just stop being tracked as "from a template."
- **Operation**: Operation name* (plain text, not a combobox — distinct from the Predefined-Surgery search above), Operation date (optional datetime), Department (tenant-editable combobox), Provision diagnosis (plain text).
- **Surgical team**: two independent dynamic row-lists —
  - **Doctors\*** — at least one non-empty entry required to leave this step; each row is a tenant-editable combobox backed by the real Doctor master list (Settings → Doctors), with an "Add 'X' to list" affordance that creates a new bare-name Doctor record on the fly (same mechanism as OPD's wizard, see Module 1 §4).
  - **On-duty doctors** — same combobox pattern, optional, no minimum.
  Both support adding/removing rows freely (minimum 1 row always kept, the last row can't be removed, only cleared).
- **Procedure & details** (optional): a free-text textarea for operation procedure, and a separate one for operation details (implants, anaesthesia, complications).

**Validation to leave Step 2**: Operation Name non-empty AND at least one Doctors row non-empty.

#### Step 3 — Payment & Package

- **Predefined package** (optional): a live search box against every Predefined Package template (Settings), by name. Picking one replaces the entire Package Inclusions list below with that template's inclusions and sets Discount to the template's configured discount; a "Reset" link clears back to one blank inclusion row and zero discount.
- **Package inclusions**: a dynamic row-list (name + currency amount per row, minimum 1 row), each individually editable regardless of whether it came from a template. "Package amount" = the sum of every row's amount, shown read-only.
- **Discount**: a free-form currency input (pre-filled by a template if one was applied, otherwise defaults to 0, always independently editable).
- **Net amount** = Package amount − Discount (read-only, computed).
- **Payments** (optional, can admit with zero payment records): a dynamic table, each row: Date (date input), Amount Type (dropdown: Advance / Partial / Final / Refund / Insurance), Payment Mode (dropdown: Cash / UPI / Both / Insurance), Amount (currency). Rows can be freely added/removed, no minimum.
- **Total received** = sum of every payment row's amount (read-only).
- **Balance** = Net amount − Total received (read-only; amber if positive, green if zero or negative — i.e. overpaid still shows green, not a separate warning state).

**Validation to submit**: at least one Package Inclusion row must have a non-empty name (an amount of 0 is allowed — only the name is checked).

**Footer buttons** (all three steps): Cancel (discards everything, no confirmation), Back (steps 2–3 only), Next (steps 1–2 only), **Admit** (step 3 only — re-validates all three steps in order, bouncing back to the first one that fails with an error toast; on success, creates the InPatient record in one call, shows a "Patient admitted" toast, and closes the dialog).

## 4. Business rules

- **Admission is one atomic create** — unlike OPD, there is no partial/draft state once you click Admit; either the whole wizard's data saves as one InPatient record or nothing does.
- **"recentDischargesOnly" (embedded tab only)**: the server-side filter is "status ≠ DISCHARGED, **or** (status = DISCHARGED **and** dischargeDate ≥ yesterday, IST)" — i.e. every currently-admitted patient plus anyone discharged in roughly the last 24–48 hours (IST calendar days, not a rolling 24-hour window). The standalone `/inpatients` page has no such filter — it always shows every record regardless of age.
- **IP Number generation** uses the same peek-vs-consume sequence split as OPD's Patient ID (Module 1 §4): opening the Admit dialog previews the next number non-destructively; only the actual "Admit" submit advances the real sequence.
- **A dedicated backend discharge endpoint exists but is unused**: `POST /patient-care/inpatients/:id/discharge` (gated by its own `inpatients:discharge` permission, accepting `dischargeDate`, an optional `dischargeSummary`, and an optional `finalAmount`) is a real, implemented route — but **no frontend UI currently calls it**. The only way to mark a patient discharged from this UI is the generic Status dropdown (`PATCH .../status`, body `{status: "discharged"}`), which does **not** collect a discharge summary or a final amount, and does not set `dischargeDate` to anything specific via that path (worth confirming server-side what, if anything, that PATCH does to `dischargeDate` when flipping status — not verified in this pass). This is a genuine, real gap between what the permission system implies is possible and what the UI actually offers.
- **No edit path for admission-time fields**: operation details, surgical team, package inclusions, and payment records are captured once at admission and have no corresponding "edit" screen anywhere in this module — the only two things that can change after admission are the Admitted/Discharged status (via the dropdown above) and the record's existence (via Delete).
- **Linking to an OPD Patient at admission time is optional and one-directional**: if "existing patient lookup" is used, the created InPatient stores that patient's `patientId` as a reference, but the OPD Patient record itself is never modified or notified — there's no "this patient is now an inpatient" flag written back onto the Patient row.

## 5. Data model (key fields)

**InPatient**: `id`, `ipNumber`, `patientId` (optional link to an OPD Patient, by its human ID — not a required foreign key), `name`, `firstName`/`lastName` (only populated when linked from an existing OPD patient — a bare manually-entered admission only has `name`), `age`, `gender`, `phone`, `dateOfBirth`, `address`, `guardianName`, `referredBy`, `admissionDate`, `admissionNotes`, `dischargeDate`, `status` (`ADMITTED` | `DISCHARGED` in the DB, exposed to the frontend as lowercase `admitted`/`discharged`), `department`, `doctorNames` (JSON string array), `onDutyDoctors` (JSON string array), `operationName`, `operationDate`, `operationProcedure`, `operationDetails`, `provisionDiagnosis`, `packageAmount`, `packageInclusions` (JSON array of `{name, amount}`), `discount`, `balanceAmount` (derived: package amount − discount − payments received), `ward`, `bedNumber` (both exist in the schema but are not collected anywhere in the Admission wizard — see §7).

**Payment records** are submitted as part of the single admission payload (`paymentRecords: [{date, amountType, paymentMode, amount}]`) — stored as part of the InPatient's own billing trail, a separate concept from OPD's `Prescription`/`InvoiceItem`/`Payment` tables.

## 6. Integration points

- Reads **Predefined Surgery** and **Predefined Package** templates from Settings (Module 17 once documented).
- Reads/writes the same shared **Doctor** master list and **DropdownOption** (department/referredBy/address) tables as OPD (Module 1).
- Can optionally link to an existing OPD **Patient** record (read-only lookup, one-directional).
- Feeds `InPatientsPage`'s own stat badges and (presumably) **Reports**'s inpatient-records tab and **Analytics** — not yet verified in this pass.

## 7. Known gaps / deviations from main

- **Ward and Bed are real schema fields, shown as table columns, but never collected anywhere in the Admission wizard** — every inpatient's Ward/Bed shows "—" unless set by some other means not found in this pass (possibly edited directly via a backend/admin tool, or simply unused). Worth a follow-up to confirm whether main collects these at admission and this port genuinely dropped the fields, or whether they were always vestigial.
- **Stat badges are intentionally simplified from main**: main's richer 5-category breakdown (Pre-Op / In Surgery / Post-Op / Ready-for-Discharge / etc.) needs a richer status enum this backend doesn't have (only `admitted`/`discharged` exist) — a conscious, documented decision from an earlier pass, not an oversight.
- **The dedicated discharge endpoint (`POST .../discharge`) being unused by any UI** (see §4) is flagged here as a BRD-writing finding, not yet fixed — a candidate follow-up if the intent is for discharge to actually capture a summary/final amount.
