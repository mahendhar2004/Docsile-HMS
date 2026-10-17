# Module 4 — Doctor

Source: `web/src/pages/DoctorPage.tsx`, `web/src/pages/doctor/{doctor-queue,consultation-view,consultation-history,prescription-form,hooks,types}.tsx`, `web/src/pages/workup/eye-reading-form.tsx` (shared, see Module 3), `supabase/functions/doctor/*`.

## 1. Overview

Where the doctor actually sees a patient: reviews today's queue, opens a
consultation (reusing the Workup module's eye-reading form alongside a
dedicated prescription form), writes vitals/diagnosis/medicines, and saves
both at once. Labeled "Doctor Console" in the UI.

Route: `/doctor` (single page, queue ⇄ consultation takeover, same
information-architecture pattern as Refraction/Workup — no sub-routes).

## 2. Permissions

| Key | Gates |
|---|---|
| `doctor:view` | The whole page: queue, opening a consultation, reference data (medicines/investigations/templates). |
| `doctor:consult` | Saving a prescription, creating a new medicine on the fly, adding a dropdown option, and (per the backend route) is the **only** permission that actually authorizes `POST .../prescriptions` — see §4 for a real discrepancy with `doctor:edit` below. |
| `doctor:edit` | *Intended* as a fallback that should also allow saving a prescription when `doctor:consult` is absent (per this module's own code comments) — the frontend form does treat it this way (`canWrite = canConsult || canEdit`), but the backend's actual save endpoint does **not** honor it (gated on `doctor:consult` alone). See §4. |
| `billing:view` | The queue's per-row quick-print column and the consultation header's "Print receipt" button. |

## 3. Screens

### 3.1 Doctor queue (default view)

**Header**: title "Doctor Console", description "Patient queue & consultation". When no patient is selected: a Refresh icon, a single "{N} in queue" stat badge, and a search box ("Search by name, ID, or phone…") that filters the already-fetched queue client-side (no backend round-trip — the whole queue is always fetched in full; there's no date filter on this queue at all, see §4).

**Table columns**: Token # (position-based, 1-indexed, not stable against sorting since there's no sort here either), Patient ID, Name (with two small inline indicators: "Eye ✓" if an eye reading exists for this patient, "Rx ✓" if a prescription already exists — both purely informational, not clickable), Age / Gender, Phone, Type, Appointment (time only), Doctor (today's prescription's doctor name, falling back to the patient's assigned-at-registration doctor if no prescription doctor yet), Services (first service name as a chip + "+N" overflow, full list as hover title text), Total (right-aligned; red/bold if that prescription has a balance due, plain otherwise; `—` if no billed prescription), Status (a queue-specific 2-bucket-style pill, same "Optometrist"/"Doctor"/"Visited"/"Completed"/"Medical Only" relabeling as Workup's queue — see Module 3 §4), and (only with `billing:view`) an icon-only quick-print button per row.

**Row click**: opens the consultation view for that patient (not a new route — an in-page takeover, same pattern as Workup). The currently-open patient's row is highlighted (`bg-primary/8`) if you click back out without deselecting... actually the selected row only highlights while `selectedId` is set, which happens while the consultation is open and the queue isn't rendered — this highlight class has no visible effect since the table and consultation view are never both on screen at once (a harmless vestigial prop, not a bug).

**Empty states**: "No matches" / "Try a different name, ID, or phone number" when a search is active and nothing matches; "No patients yet" / "Today's OPD queue is empty. Patients will appear as they register." otherwise.

### 3.2 Consultation view

**Entry point**: clicking a queue row. Replaces the queue with a "← Back to queue" button where the stat badge used to be, then:

**Patient info header**: name + a generic (not queue-style) status pill, then patient ID / phone / gender / patient type, and — if `billing:view` — a "Print receipt" button (disabled until a default print template is configured in Settings → Print Defaults; fetches and immediately prints that patient's receipt with no preview step, same quick-print mechanism used throughout the app).

**Two-column body**:
- **Left (main)**: a card with two tabs — **Workup Data** and **Prescription** — and a single **Save All** button in the tab-bar header (not per-tab). Both tabs are always mounted (`forceMount`, just visually hidden when inactive) specifically so Save All can save whichever tab isn't currently showing too — clicking Save All always attempts to save *both* forms simultaneously (`Promise.all`), regardless of which tab you're looking at.
  - **Workup Data tab**: the exact same `EyeReadingForm` component documented in Module 3 §3.3, rendered in `compact` mode (hides its own Save button, exposes a `save()` handle instead that this page's Save All calls). Its own `hasCreate` gate is `workup:create`, **not** any Doctor-module permission — a doctor without `workup:create` sees this tab fully read-only even if they have full `doctor:consult` rights.
  - **Prescription tab**: the Prescription Form, §3.3 below.
- **Right (sticky sidebar, "History")**: today's AR (auto-refractometer) reading in a compact read-only table (SPH/CYL/AXIS/VA per eye + PD), shown only if one exists — pulled from the same EyeReading record the Workup tab edits, not a separate fetch — followed by a card per past prescription (date, doctor, chief-complaint/history/diagnosis lines, up to 5 medicines with a "+N more" overflow, investigation chips). If there's neither an AR reading nor any past prescriptions: "No previous prescription history."

**Save All**: calls both the Workup form's `save()` and the Prescription form's `save()` concurrently; a validation failure or permission block in either one is caught and logged to the console, not surfaced as a toast at this combined level (each individual form's own save path still shows its own success/error toast).

### 3.3 Prescription Form (the "Prescription" tab's content)

**Template picker** (shown only if at least one Prescription Template exists in Settings): a dropdown above everything else — picking one overwrites Present Complaint / Previous History / Diagnosis / Additional Notes / Medicines / Investigations with the template's values, but **only for fields the template actually has a non-empty value for** (an empty template field never clears out something you'd already typed); Medicines and Investigations are a full replace if the template has any. Follow-up Date is computed from the template's configured `followUpDays` offset from today (IST) — only set if the template specifies one.

**Vitals**: Temp (°F), Pulse (bpm, integer 0–300), SpO2 (%, integer 0–100), Height (cm), Weight (kg) — all optional numeric fields.

**Clinical**: Doctor name (free text, pre-filled with the logged-in doctor's own name but editable), Department (free text), Present Complaint / Previous History / Diagnosis (three separate textareas).

**Medicines**: a search-and-add `SingleSelect` against the full Medicine Master list — picking one appends a new row and **auto-fills that row's Timing and Days from the medicine's configured defaults** (not just the name). A "+ New" button (`doctor:consult` only) opens a dialog to create a brand-new Medicine Master entry on the fly (Name\*, Category, Default Timing, Default Days) — on success it's immediately appended as a medicine row using the values just entered. Each medicine row is independently editable afterward: Name (text), Timing (dropdown, same `MEDICINE_TIMINGS` list app-wide), Days (dropdown, same `MEDICINE_DAYS` list), Note (text), and a remove button. Rows with a blank name are silently dropped at save time (no validation error shown for them).

**Investigations**: same search-and-add pattern against Investigation Master, each row: Name, Note, remove button. Same blank-name-dropped-at-save behavior.

**Additional**: Follow-up Date (date picker, can't be before today), Additional Notes (free text — placeholder suggests "for billing, referral, etc."), Notes (a *separate* free-text field — placeholder suggests internal-only use; these are two distinct schema fields, easy to conflate at a glance).

This form has **no Save button of its own** — it's only ever saved via the consultation view's single Save All button (see §3.2), matching the original app's design exactly, not a missing feature.

## 4. Business rules

- **The queue has no date filter at all** — `GET /doctor/queue` genuinely has no `date` parameter in its API contract (confirmed against the schema), always server-side "today." A date navigator was deliberately **not** added here (unlike Workup, where the same-looking gap turned out to be a wiring bug, not a real limitation) — this one actually is a real backend constraint, verified before concluding so.
- **A real, found-but-unfixed permission discrepancy**: the Prescription Form's own code intends `doctor:edit` to work as a fallback permission for saving when `doctor:consult` is absent (its `canWrite = canConsult || canEdit` check, and the module's own header-comment documentation, both say so) — but the actual backend route, `POST /doctor/patients/:patientId/prescriptions`, is gated on `requirePermission('doctor:consult')` alone. A user granted only `doctor:edit` (not `doctor:consult`) would see a fully-enabled, editable prescription form whose Save would 403 at the last step. Not fixed as part of writing this BRD — flagged as a genuine finding for a future bug-fix pass.
- **Sitha AI integration is effectively dead code on this page**: `POST /doctor/ai/ask` is a real, implemented backend route, but the "Ask Sitha" button was removed from this page's UI (and from the floating global widget app-wide) in an earlier pass per explicit user instruction — nothing in the current UI calls this endpoint anymore.
- **The eye-reading data shown/edited in the "Workup Data" tab is the exact same record Module 3 manages** — there is no separate "doctor's copy" of a patient's eye reading; editing it here and editing it from the Refraction queue both read/write the identical EyeReading row for that patient/day.
- **A prescription is per-patient-per-day, upserted** — `todayPrescription` on the consultation payload determines whether the form starts blank (new) or pre-filled (editing today's existing one); there's no UI to view or edit a *different* day's prescription from this page (only today's, plus the read-only History sidebar for past ones).

## 5. Data model (key fields)

**Prescription** (written here; see also Module 1 §5): adds, on top of the billing fields OPD writes, this module's own clinical fields: `temperature`, `pulseRate`, `spo2`, `heightCm`, `weightKg`, `presentComplaint`, `previousHistory`, `diagnosis`, `additionalNotes`, `notes`, `medicines` (JSON array of `{name, timing, days, note}`), `investigations` (JSON array of `{name, note}`), `followUpDate`, `doctorName`, `department`.

**MedicineMaster** / **InvestigationMaster**: read as reference data for the pickers; MedicineMaster can be appended to directly from this page via the "+ New" dialog.

**PredefinedTemplate** (Prescription Templates, managed in Settings): read-only here, applied in bulk via the template picker.

## 6. Integration points

- Shares the **EyeReadingForm** component and its underlying EyeReading record verbatim with Module 3 (Refraction/Workup) — any change to that form affects both modules identically.
- Reads **MedicineMaster**, **InvestigationMaster**, and **Prescription Templates** from Settings (Module 17).
- Writes to the same **Prescription**/billing data model OPD (Module 1) reads from for its Receipt/Status/Total columns.
- The quick-print "Print receipt" button uses the identical receipt-rendering pipeline (`QuickPrintRenderer` + `printReceiptsHtml` + Settings → Print Defaults) as every other quick-print button in the app (OPD list, this module's own queue column).

## 7. Known deviations from main

- **The queue's Doctor/Services/Total/Print columns were a real, fixed data-availability bug, not a missing-feature gap**: the backend's `getQueue()` had always returned the full Prescription (with InvoiceItems) and doctor-name data — the frontend had simply never typed or rendered it, based on an incorrect code comment claiming the data wasn't available. Fixed by adding the columns, not by changing the backend.
- **Main's 29 user-customizable, server-persisted queue columns are not ported** — this backend has no column-preference-persistence endpoint to support it; the fixed default-column set shown here matches main's own `DEFAULT_COLUMNS`, just without the customization popover on top.
- **The queue's status-pill relabeling ("Optometrist"/"Doctor"/etc.) is main's own real design**, faithfully ported as a page-local override — not a deviation.
