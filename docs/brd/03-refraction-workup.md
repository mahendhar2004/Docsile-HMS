# Module 3 — Refraction (Workup)

Source: `web/src/pages/WorkupPage.tsx`, `web/src/pages/workup/{workup-queue,eye-reading-form,use-workup,types}.tsx`, `supabase/functions/workup/*`.

## 1. Overview

The pre-consultation clinical assessment step between patient registration
and the doctor's consultation — an optometrist records auto-refractometer
readings, present/previous glass prescriptions, and clinical findings for
a patient's eyes before the doctor sees them. Labeled "Refraction" in the
app's own UI (not "Workup" — that's only the internal/code name).

Route: `/workup` (no detail sub-route — the whole module is one page that
swaps between a queue view and an inline patient-detail takeover view).

## 2. Permissions

| Key | Gates |
|---|---|
| `workup:view` | The entire page (queue + reading a patient's existing data). Without it, an "Access denied" page shows instead. |
| `workup:create` | Whether the eye-reading form's fields are editable at all and whether the Save button exists. A `workup:view`-only user sees every field as effectively read-only (all inputs `disabled`) and a plain sentence instead of a Save button: "You need the **workup:create** permission to save eye readings." |

## 3. Screens

### 3.1 Workup queue (default view)

**Header**: title "Refraction", description "Pre-consultation assessment". When no patient is selected:
- Refresh icon (re-fetches the queue).
- Four live stat badges computed client-side from the currently-loaded queue: **Total** (every row), **Optometrist** (status `REGISTERED` or `IN_WORKUP` — i.e. still waiting on this step), **Doctor** (status `WORKUP_DONE` or `WITH_DOCTOR` — workup is done, waiting on the doctor), **Completed** (status `COMPLETED` or `MEDICAL_ONLY`).
- A toolbar row: a date navigator (prev/date-pill-with-calendar/next, plus a "Today" shortcut shown only when not already on today) and a search box ("Search by name, ID, or phone…") that filters the **already-loaded** queue client-side as you type (not a server round-trip — unlike the OPD list's two-mode search, this one has no autocomplete-to-navigate behavior, it's pure in-page filtering).

**Table columns**: Token (position-based sequential number, 1-indexed by render order — **not** stable against re-sorting the way OPD's token is, since this table has no column-sort feature at all), Patient ID, Name, Age / Gender, Phone, Status (a pill with its own distinct 2-bucket label scheme — "Optometrist" or "Doctor" or "Completed"/"Medical Only" — deliberately different wording from the generic patient-status pill used elsewhere in the app, see §4), Appointment (date+time, IST-formatted).

**Row click**: opens the inline patient detail takeover (§3.2) for that patient — this is **not** a separate route or a slide-in panel, it replaces the queue in place within the same page.

**Empty state**: "No patients in the workup queue" / "There are no OPD patients with appointments or prescriptions today."

### 3.2 Patient detail (inline takeover)

**Entry point**: clicking any queue row. Replaces the queue + stat badges with: a "← Back to queue" button (where Refresh/stats used to be), and below the header, the patient's name + ID + age/gender + a generic status pill (the normal app-wide one here, not the queue's 2-bucket version), then the Eye Reading Form itself (§3.3) for that one patient.

Going "Back to queue" discards nothing (there's no unsaved-changes warning) — any edits already saved via the form's own Save button persist regardless; anything typed but not yet saved is lost.

### 3.3 Eye Reading Form

The actual clinical data-entry form — also reused, in a different presentation mode, by the **Doctor** module's consultation view (a `compact` prop hides this form's own Save button so the Doctor module's single "Save All" button can drive it via an exposed `save()` ref handle instead — see Module 4).

Four tabs, each independently switchable, all sharing one Save action:

#### AR — Auto Refractometer
Right Eye and Left Eye, each: SPH / CYL / AXIS / VA (all constrained-choice dropdowns, each clearable) + VAC.P.H (free text). A single shared **PD** (pupillary distance) field below both eyes (free text).

#### SR — Present Glass Prescription
For each eye, a **Distance** row (SPH/CYL/AXIS/VA dropdowns, labeled) and a **Near** row below it. The Near row's SPH field is special: its dropdown offers both raw SPH values and "add X.XX" shorthand entries — picking an "add" value computes the actual near SPH as *(the eye's own Distance SPH) + (the add amount)*, formatted to 2 decimals with explicit sign, and writes that computed value into Near SPH (not the literal "add X.XX" string); picking a plain value just sets Near SPH directly, with no connection to Distance. A **Sight Type** checkbox group (multi-select, native checkboxes) only appears on this tab, storing selected labels joined by `/` into one string field.

#### PGP — Previous Glass Prescription
Identical layout to SR (Distance + Near per eye) but with **no** Sight Type section and the Near SPH field has no "add X.XX" shorthand — it's a plain dropdown like every other field here.

#### CF — Clinical Findings
A single collapsible panel (closed by default, click the header to expand/collapse) showing a two-column (Right Eye / Left Eye) grid of 13 rows: Lids, SAC (free text), Conjunctiva, Cornea, A.C., Iris, Pupil, Lens, Vitreous, IOP (free text, mmHg), Method, Fundus, CDR — every row except SAC and IOP is a constrained-choice dropdown.

**Save button**: labeled "Save Reading" for a brand-new reading or "Update Reading" if one already exists for this patient today — both are the exact same upsert call, the label is purely cosmetic. Disabled while saving (shows a spinner + "Saving…") or if the user lacks `workup:create`.

## 4. Business rules

- **One EyeReading record per patient per IST calendar day** — saving is always an upsert keyed on (patient, today's IST date): if a reading already exists for today, saving updates it in place; otherwise a new one is created. There is no history of multiple readings within the same day, and no way to view a *previous* day's reading from this page at all — only ever "today's" (or whatever date the queue is currently navigated to) reading for that patient.
- **Queue membership is a 3-way union, not just "has an appointment today"**: a patient appears in the queue if they have an appointment today, **or** a Prescription written today, **or** an EyeReading saved today — the third condition exists specifically to catch "the appointment was yesterday but the workup is being entered today" (e.g. a late entry). All three checks run as independent queries and are merged by patient, with the appointment-based match taking priority if a patient matches more than one.
- **Status is computed, never stored directly for this purpose**: `REGISTERED` (nothing done yet) → `WORKUP_DONE` (has today's eye reading, no doctor prescription yet) / `MEDICAL_ONLY` (has a doctor prescription but no eye reading — skipped workup entirely) → `COMPLETED` (has both). A manual override status already on the patient record (`MOVED`, `CANCELLED`, `NO_SHOW`, `VISITED`) always wins over this computed logic, regardless of what workup/prescription data exists. The queue's own status pill then re-labels these computed values into just 3 buckets for display: Optometrist (not done), Doctor (workup done, waiting on doctor), Completed (either path finished) — note this computed/queue-display model structurally never actually produces `IN_WORKUP` or `WITH_DOCTOR` as real values, even though the queue's status-pill color mapping defines labels for them too (dead code paths, kept for fidelity with the original app's equivalent logic, not a bug).
- **A deprecated, unused `POST /workup/patients/:id/start` endpoint exists** server-side (explicitly commented `@deprecated no-op — kept for migration compatibility`) — no frontend code calls it. Calling it does nothing but return a success response.
- **The queue's Token column is purely positional** (1-indexed by array order) and has **no** click-to-sort columns anywhere on this table (unlike the OPD list) — so it's always stable in practice (the queue's own ordering doesn't change by sort, only by what the backend returns), but it's a different, fragility-prone mechanism in principle compared to OPD's by-patientId lookup.

## 5. Data model (key fields)

**EyeReading**: `id`, `patientId`, `readingDate` (one row's worth of all 4 sections for one patient on one IST day), `autoRefractometer` (JSON string of the AR section), `previousPrescription` (JSON string of PGP), `presentPrescription` (JSON string of SR, including `sightType`), `clinicalFindings` (JSON string of CF), `glassesReading` (present in the schema but explicitly **not** written by this form — populated later by the Optical module's dispensing flow instead).

Each JSON blob's shape (not enumerated field-by-field here, see the form sections above): AR = `{re: {sph,cyl,axis,va,vacph}, le: {...}, pd}`; SR/PGP = `{re: {d: EyeRow, n: EyeRow}, le: {...}}` (SR's also carries `sightType`); CF = `{re: {13 fields}, le: {13 fields}}`.

## 6. Integration points

- Reads **Patient**/**Prescription** data from Module 1 (OPD) to build the queue.
- The **Eye Reading Form** component itself is shared verbatim with the **Doctor** module (Module 4) in `compact` mode — any change to this form's fields/validation affects both screens identically, by construction (one component, two hosts).
- The saved EyeReading record is read by the **Patient Detail page** (Module 1 §3.4.1 — the "Eye Readings Available" banner) and by **Reports**'s receipt/print paths (readings & findings print tab) — not yet verified in this pass.
- `glassesReading` on the same record is reserved for the **Optical** module to populate, not written here.

## 7. Known deviations from main

- **DateNavigator was a real, non-trivial fix, not a cosmetic addition**: the backend's repository layer already fully supported a `date` parameter on both `getWorkupQueue` and the single-patient fetch — only the HTTP route and service layer had never threaded it through, so the queue was silently hardcoded to "today" even though main's real page has full prev/next/Today navigation. Fixed by wiring the existing parameter through, not by adding new backend capability.
- **The queue's status-pill wording ("Optometrist"/"Doctor"/"Completed"/"Medical Only") is a deliberate, main-matching deviation from the generic patient-status labels** used everywhere else in the app (OPD list, Patient Detail page) — main itself defines this exact same page-local relabeling, reframing status as "which station is this patient waiting at" rather than a generic workflow state.
