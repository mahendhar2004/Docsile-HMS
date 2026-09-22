# Frontend Pages — Running Progress

Tracks the real-page implementation phase (after the design system, `DESIGN_SYSTEM.md`,
was completed — 9 batches, all components in `web/src/components/{ui,patterns}`).

Legend: ⬜ not started · 🔨 in progress · ✅ done · 👀 needs review

Every page already has a scaffolded stub in `web/src/pages/*.tsx` with a `Phase 7 TODO`
comment listing its exact endpoints and required permissions — those comments are the
source of truth for scope, cross-checked against `.sde/schemas/openapi.yaml`.

Build order follows the clinical flow (a patient's actual path through the hospital),
then admin/ops modules, then analytics/reporting last (they read data the earlier
modules produce).

| # | Page | Route | Endpoints | Status |
|---|------|-------|-----------|--------|
| 1 | Dashboard | `/dashboard` | `GET /dashboard/summary`, `GET /dashboard/quick-stats` | ✅ |
| 2 | Patient Care | `/patients` | `patient-care/*` (patients + inpatients CRUD, search, services, receipt) | ✅ |
| 3 | Queue | `/queue` | `queue/*` (OPD/workup/inpatient boards, Realtime) | ✅ |
| 4 | Workup | `/workup` | `workup/*` (queue, eye readings) | ✅ |
| 5 | Doctor | `/doctor` | `doctor/*` (queue, consultation, prescriptions, AI assist, receipt) | ✅ |
| 6 | Billing | `/billing` | `billing/*` (daily summary, prescriptions, payments) | ✅ |
| 7 | Pharmacy | `/pharmacy` | `pharmacy/*` (medicines, stock, suppliers, purchase orders, bills) | ✅ |
| 8 | Optical | `/optical` | `optical/*` (products, stock, bills, AR reading, settings) | ✅ |
| 9 | Labs | `/labs` | `labs/*` (labs, investigations, patient investigations, bills) | ✅ |
| 10 | Insurance | `/insurance` | `insurance/*` (companies, claims, payments) | ⬜ |
| 11 | Staff | `/staff` | `staff/*` (members, roles, permissions) | ⬜ |
| 12 | Settings | `/settings` | `settings/*` (33 endpoints — hospital profile, templates, master data) | ⬜ |
| 13 | Expenses | `/expenses` | `expenses/*` (categories, expenses by date range) | ⬜ |
| 14 | Dues & Follow-ups | `/dues-followups` | `dues-followups/*` (dues, followups, email templates) | ⬜ |
| 15 | Call Logs | `/call-logs` | `call-logs/*` (list, stats, notes, patient link, sync) | ⬜ |
| 16 | License Tracker | `/license-tracker` | `license-tracker/*` (CRUD + document) | ⬜ |
| 17 | Analytics | `/analytics` | `analytics/*` (19 endpoints) | ⬜ |
| 18 | Reports | `/reports` | `reports/*` (17 endpoints — patient search, summaries, bulk exports) | ⬜ |

Already done: Login (`/login`), App shell/router, session store, API client, query
client, `usePaginatedQuery`/`useCursorQuery`, `usePermissions`.

## Session Log

### Page 1 — Dashboard (`/dashboard`) — 2026-09-22

Replaced placeholder stub with a fully implemented DashboardPage.

**Endpoints consumed:**
- `GET /dashboard/summary` → `TodaySummary` (7 scalar fields: `newPatientsToday`, `totalPrescriptions`, `totalRevenue`, `totalCollected`, `totalDues`, `activeInpatients`, `pendingWorkup`)
- `GET /dashboard/quick-stats` → `QuickStats` (`ytd`/`mtd` period stats + `activeInpatients`)

**What was built:**
- Permission gate via `usePermissions().can("reports:view")` — renders `ErrorState` (access denied) if false; hooks still called unconditionally above the early return.
- Two co-located `useQuery` calls (no separate hooks folder — first page, no existing convention to follow); both gated with `enabled: hasAccess` to avoid fetching when unauthorized.
- Seven `StatCard` tiles in a responsive 2/3/4-col grid: new patients, active inpatients, total revenue, amount collected, outstanding dues, prescriptions issued, pending workup.
- `ThemedDonutChart` inside `ChartContainer` for today's revenue split (collected vs outstanding dues). Chosen because the endpoint returns a two-slice scalar breakdown — the canonical donut case.
- `ThemedBarChart` inside `ChartContainer` for MTD vs YTD patient volume. Two discrete periods warrant a bar chart; line/area charts would require a continuous time axis that this endpoint does not provide.
- Loading skeletons via `StatCard loading` prop and `ChartContainer loading` prop — no layout shift.
- Inline `ErrorState` per query (with `onRetry` wired to `refetch`) so a partial failure shows only the broken section.
- All currency formatted as `en-IN` locale INR (`Intl.NumberFormat`).

**Build:** `tsc -b && vite build` — zero TypeScript errors, successful Vite production build. Chunk size warning for `DashboardPage` is expected (recharts bundled in this route).

### Page 3 — Queue (`/queue`) — 2026-09-22

Replaced placeholder stub with a fully implemented real-time QueuePage.

**Endpoints consumed:**
- `GET /queue/opd` → `OpdQueueEntry[]` (Patient + nested eyeReadings, prescriptions with InvoiceItems, labBills + computed `status`)
- `GET /queue/workup` → `WorkupQueueEntry[]` (Patient + nested eyeReadings, prescriptions (lighter, no billing) + computed `status`)
- `GET /queue/inpatients` → `InpatientEntry[]` (InPatient rows, status != DISCHARGED, ordered admissionDate ASC)

**What was built:**
- `web/src/lib/supabase-client.ts` — new Supabase JS client singleton (anon key, Supabase Auth disabled per ADR-005); used exclusively for Realtime.
- `web/src/pages/queue/types.ts` — explicit TypeScript interfaces for all three queue entry types, cross-referenced against OpenAPI schema and repository.ts field names.
- `web/src/pages/queue/use-queue-realtime.ts` — shared Realtime hook; subscribes to postgres_changes on the given channel+tables, calls `onEvent` on any change (refetch trigger) and `onStatusChange(bool)` on connection status transitions. Callbacks kept in refs to avoid stale closures.
- `web/src/pages/queue/opd-queue-tab.tsx` — OPD queue; 7-column DataTable (token, name, phone, appointment, eye reading icon, prescription icon, StatusPill); channel `hospital:{hospitalId}:queue`.
- `web/src/pages/queue/workup-queue-tab.tsx` — workup queue; 7-column DataTable (token, name, phone, appointment, eye reading icon, referred-by, StatusPill); same channel.
- `web/src/pages/queue/inpatient-board-tab.tsx` — inpatient board; 7-column DataTable (IP number, patient ID, admission date, ward, bed, on-duty doctors, StatusPill); channel `hospital:{hospitalId}:beds`.
- `web/src/pages/QueuePage.tsx` — thin composition: permission gate (`queue:view`), `PageHeader`, `Tabs` with 3 `TabsContent` panels passing `hospitalId` from `useSessionStore`.
- Polling fallback: `refetchInterval: isLive ? false : 10_000` in each tab's `useQuery`; `AlertBanner` (warning) shown while disconnected. Note: `?since=` param mentioned in stub is not yet implemented server-side (QueueQuerySchema only accepts `date`) — polling performs a full today-data refetch.
- ADR-003 PII note: postgres_changes payloads may include patient PII; Supabase column allowlist is not yet configured (accepted limitation). The frontend never reads the payload — change events are refetch triggers only.
- Loading: skeleton rows (Skeleton blocks) per tab. Error: `ErrorState` with retry. Empty: `EmptyState` with context-specific message.

**Build:** `tsc -b && vite build` — zero TypeScript errors, successful Vite production build. `QueuePage` chunk: 223.80 kB / 57.81 kB gzip (includes Supabase JS client — expected).

### Page 2 — Patient Care (`/patients`) — 2026-09-22

Replaced placeholder stub with a fully implemented PatientCarePage.

**File structure:**
```
web/src/pages/PatientCarePage.tsx            — thin composition root (Tabs OPD/IPD)
web/src/pages/patient-care/types.ts          — all API types mirroring openapi.yaml
web/src/pages/patient-care/hooks.ts          — query + mutation hooks
web/src/pages/patient-care/opd-tab.tsx       — OPD: date navigator, patient table, edit form
web/src/pages/patient-care/ipd-tab.tsx       — IPD: filter bar, inpatient table, detail sheet
web/src/pages/patient-care/patient-registration-form.tsx  — Dialog for patient registration
web/src/pages/patient-care/inpatient-admission-form.tsx   — Dialog for inpatient admission
web/src/pages/patient-care/patient-detail-panel.tsx       — Sheet for patient detail + actions
web/src/pages/patient-care/add-services-modal.tsx         — Dialog for adding services
```

**Endpoints consumed:**
- `GET /patient-care/patients?date=YYYY-MM-DD&page=N&pageSize=N` → `Patient[]` (offset)
- `GET /patient-care/inpatients?date=&status=&page=N&pageSize=N` → `InPatient[]` (offset)
- `GET /patient-care/patients/search?q=...&limit=10` → `{ patients, nextCursor }` (plain useQuery + debounce, NOT useCursorQuery — spec returns data object not array with meta.cursor)
- `GET /patient-care/patients/next-id` → `{ nextPatientId }`
- `GET /patient-care/inpatients/next-id` → `{ nextIpNumber }`
- `GET /patient-care/patients/registration-form` → `RegistrationFormData` (service templates)
- `GET /patient-care/inpatients/admission-form` → `AdmissionFormData` (wards, doctors)
- `GET /patient-care/patients/{id}` → `Patient`
- `GET /patient-care/inpatients/{id}` → `InPatient`
- `POST /patient-care/patients` → `Patient` (registration)
- `PATCH /patient-care/patients/{id}` → `Patient` (edit)
- `DELETE /patient-care/patients/{id}`
- `PATCH /patient-care/patients/{id}/status` → `{ status }`
- `PATCH /patient-care/patients/{id}/date` → `{ appointmentDate }`
- `GET /patient-care/patients/{id}/receipt` → opened in new tab (billing:view)
- `POST /patient-care/patients/{id}/services` → `{ serviceTemplateId, paymentMode, amount? }`
- `POST /patient-care/inpatients` → `InPatient` (admission)
- `PATCH /patient-care/inpatients/{id}/status` → `{ status }`
- `DELETE /patient-care/inpatients/{id}`

**Permission keys used:**
`patients:view`, `patients:create`, `patients:edit`, `patients:delete`,
`inpatients:view`, `inpatients:create`, `inpatients:edit`, `inpatients:delete`, `inpatients:discharge`,
`billing:create`, `billing:view`

**Key design decisions:**
- **Single-form registration (not stepper):** The 9-field Patient form splits naturally into two FormSection groups (Personal Info + Visit Info). A Stepper would force artificial step boundaries with no UX benefit.
- **Sheet for patient detail:** Slides from right, preserving the patient list in the background. Contrast with registration/admission forms which use Dialog (focused, blocking task).
- **Autocomplete search via plain useQuery:** The `/patients/search` endpoint returns `data: { patients, nextCursor }` (not `data: Patient[]` with `meta.cursor`), so useCursorQuery does not fit. Debounce is handled by the `enabled: q.length >= 2` gate.
- **Receipt = new tab:** `GET /patient-care/patients/{id}/receipt` is opened via `window.open` — avoids building a dedicated print view for a receipt format that varies by hospital.
- **InPatient name join:** `InPatient` records may be enriched by the backend with `firstName/lastName/phone` fields (typed as optional). The table falls back to truncated UUID if name is not present.

**Build:** `tsc -b && vite build` — zero TypeScript errors, successful Vite production build. PatientCarePage chunk: 277 kB / 79 kB gzip (expected: react-hook-form + zod + date-fns + all form components). Chunk size warning is pre-existing project-level, not new.

### Page 6 — Billing (`/billing`) — 2026-09-22

Replaced placeholder stub with a fully implemented BillingPage.

**File structure:**
```
web/src/pages/BillingPage.tsx                          — thin composition root (permission gate + page shell)
web/src/pages/billing/types.ts                         — all API types mirroring openapi.yaml + repository.ts field names
web/src/pages/billing/hooks.ts                         — query + mutation hooks
web/src/pages/billing/daily-summary.tsx                — date picker + StatCard tiles (DailySummary)
web/src/pages/billing/prescriptions-table.tsx          — PaginatedDataTable for prescriptions list
web/src/pages/billing/prescription-detail-panel.tsx    — Sheet: invoice items, payment history, void action
web/src/pages/billing/record-payment-form.tsx          — RHF+Zod form: CurrencyInput + SingleSelect
```

**Endpoints consumed:**
- `GET /billing/daily?date=YYYY-MM-DD` → `DailySummary` (single-day snapshot, plain `useQuery` — not paginated)
- `GET /billing/prescriptions?date=YYYY-MM-DD&page=N&pageSize=N` → `BillingPrescription[]` (offset-paginated via `usePaginatedQuery`)
- `GET /billing/prescriptions/{id}` → `PrescriptionDetailData` (`{ prescription, invoiceItems, payments }`)
- `POST /billing/prescriptions/{id}/payments` → `{ paymentMode, amount }` body
- `DELETE /billing/prescriptions/{id}/payments/{payId}` — no body

**Permission keys used:**
- `billing:view` — page gate + all reads + controls enabled state
- `billing:create` — gates the "Record Payment" button/form inside the detail panel
- `billing:delete` — gates the void-payment trash button per payment row (admin-only per spec)

**DailySummary response fields** (cross-referenced against `supabase/functions/billing/repository.ts`):
`date, totalPatients, totalPrescriptions, totalBilled, totalCollected, totalDues, totalDiscount`

**BillingPrescription list fields** (from repository.ts `listPrescriptions` select clause):
`id, prescriptionNumber, patientId, patientType, doctorName, department, total, amountPaid, balanceDue, discount, discountReason, status, prescriptionDate, paymentMode, createdAt`

**Payment record fields** (from repository.ts `getPrescriptionById` select + `insertPayment`):
`id, prescriptionId, amount, paymentMode, paymentRef, receivedBy, paymentDate, notes`

**Payment modes** verified against old Next.js app (`PAYMENT_MODES` constant across multiple components):
`Cash, UPI, Card, Cheque, Online, NEFT`

**Build:** `npx tsc --noEmit` — zero TypeScript errors in all billing files. Full `npm run build` fails due to pre-existing errors in concurrently-built `workup/eye-reading-form.tsx` and `doctor/prescription-form.tsx` / `doctor/doctor-queue.tsx` (other agents' in-progress work — out of scope per task instructions).

### Page 4 — Workup (`/workup`) — 2026-09-22

Replaced placeholder stub with a fully implemented WorkupPage.

**File structure:**
```
web/src/pages/WorkupPage.tsx                   — thin composition root
web/src/pages/workup/types.ts                  — API + internal form types
web/src/pages/workup/use-workup.ts             — query/mutation hooks
web/src/pages/workup/workup-queue.tsx          — DataTable queue component
web/src/pages/workup/eye-reading-form.tsx      — Structured 5-section eye-reading form
```

**Endpoints consumed:**
- `GET /workup/queue` → `WorkupQueuePatient[]` (computed status: REGISTERED | WORKUP_DONE | MEDICAL_ONLY | COMPLETED | MOVED | CANCELLED | NO_SHOW | VISITED)
- `GET /workup/patients/{id}` → `WorkupPatient` (same shape; today's eyeReadings + prescriptions nested)
- `POST /workup/patients/{id}/eye-readings` → `EyeReadingRecord` (upsert — create or update; `start` endpoint skipped per deprecation note)

**Eye reading field names / types (from supabase/functions/workup/types.ts + OpenAPI EyeReading schema):**
All five fields are JSON-encoded TEXT stored as `string | null` in the DB:
- `autoRefractometer` — JSON `{ right: { sph, cyl, axis }, left: { sph, cyl, axis } }`
- `glassesReading`    — same shape as autoRefractometer
- `previousPrescription` — JSON `{ right: { sph, cyl, axis, add }, left: { sph, cyl, axis, add } }`
- `presentPrescription`  — same shape as previousPrescription
- `clinicalFindings` — JSON `{ iop: { right, left }, va: { right, left }, remarks }`

The inner JSON structure (SPH/CYL/AXIS/ADD/IOP/VA) is inferred from standard optometry conventions; the spec only specifies the outer field names and their "JSON-encoded" nature.

**What was built:**
- Permission gate via `workup:view` — `ErrorState` access denied page if absent; hooks called unconditionally above the early return.
- `workup:create` permission gates the form's save action (fields are rendered read-only/disabled; a note explains the required permission if absent).
- DataTable queue showing Patient (name + ID), Age/Gender, Appointment (formatted IST), `StatusPill` with status dot, and an "Workup" button per row.
- Right-side Sheet (lg size, 32rem) slides over the queue when a patient is selected — queue remains visible in background.
- Sheet header shows patient name, ID, age, gender, and `StatusPill`.
- `useWorkupPatient` inside `PatientWorkupSheet` (child component mounted only when sheet is open) — `enabled: patientId != null` prevents spurious fetch.
- `EyeReadingForm` pre-fills from `patient.eyeReadings[0]` if an eye reading already exists today (UPDATE path), or initialises blank (INSERT path).
- Five `FormSection` blocks: Auto Refractometer, Glasses Reading, Previous Prescription, Present Prescription, Clinical Findings. `TextInput` for SPH/CYL/ADD (allows +/- clinical notation), `NumberInput` for AXIS (0–180°) and IOP (mmHg ≥ 0), `TextInput` for VA (fraction notation: 6/6, 6/12), `Textarea` for Remarks.
- `useSaveEyeReading` mutation: invalidates queue + patient queries on success; `toast.success` / `toast.error` (Toaster already wired in main.tsx).
- Loading: `Skeleton` rows in queue + sheet. Error: `ErrorState` with retry in both locations. Empty: `EmptyState` in queue with descriptive message.

**Toaster:** Already wired at app root (`web/src/main.tsx`, line 7+17). `toast` imported from `@/components/ui/sonner` — no additional wiring needed.

**Build:** `tsc -b && vite build` — zero TypeScript errors, successful Vite production build. WorkupPage chunk: 12.86 kB / 3.80 kB gzip. Chunk size warnings are pre-existing (shared table/index chunks).

**Review correction (2026-09-22):** Eye-reading field shapes were corrected against `src/app/(hospital)/workup/components/EyeReadingForm.tsx` (the real old-app form). The original types were invented (`right`/`left` keys, missing `pd`/`vacph`, flat prescription without distance/near split, invented `add` field, minimal CF). Fixed shapes: `ARSection { re/le: { sph,cyl,axis,va,vacph }, pd }`, `DNSection { re/le: { d,n: { sph,cyl,axis,va } } }`, `SRSection = DNSection & { sightType }`, `CFSection { re/le: { lids,sac,conjunctiva,cornea,ac,iris,pupil,lens,vitreous,iop,iopMethod,fundus,cdr } }`. Constrained-choice fields now use `SingleSelect` backed by the real option lists from `src/lib/workup-options.ts` (copied to `web/src/lib/workup-options.ts`). Form reorganized to AR / SR / PGP / CF tabs matching the old app's 4-section structure. `glassesReading` correctly omitted from form UI (set to `null` in save payload).

### Page 5 — Doctor (`/doctor`) — 2026-09-22

Replaced placeholder stub with a fully implemented DoctorPage (consultation module).

**File structure:**
```
web/src/pages/DoctorPage.tsx                       — split-pane root (collapsible 272px queue sidebar + main)
web/src/pages/doctor/types.ts                      — all API types verified against OpenAPI + old app
web/src/pages/doctor/hooks.ts                      — query/mutation hooks (queue, consultation, referenceData, savePrescription, createMedicine, addDropdownOption, askSitha)
web/src/pages/doctor/doctor-queue.tsx              — left panel: interactive patient list (not DataTable)
web/src/pages/doctor/consultation-view.tsx         — patient header + eye reading summary + form + AI
web/src/pages/doctor/prescription-form.tsx         — full RHF+Zod prescription form (5 sections + template picker + AddMedicineDialog)
web/src/pages/doctor/ai-assist-panel.tsx           — collapsible Sitha AI panel (conversation history, Ctrl+Enter, accept/dismiss)
```

**Endpoints consumed:**
- `GET /doctor/queue` → `DoctorQueuePatient[]` (refetchInterval 30s; nested eyeReadings + prescriptions for indicators)
- `GET /doctor/patients/{id}/consultation` → `ConsultationPatient` (patient info + todayPrescription + eyeReadings)
- `POST /doctor/patients/{id}/prescriptions` → `PrescriptionRecord` (upsert; patientId = sequential P-XXXX, not UUID)
- `GET /doctor/reference-data` → `ReferenceData` (medicines, investigations, templates, dropdowns; staleTime 10min)
- `POST /doctor/medicines` → `MedicineMasterRecord` (create new medicine inline)
- `POST /doctor/dropdown-options` → void (add custom option to a dropdown group)
- `GET /doctor/patients/{id}/receipt` → opened in new tab via `window.open` (billing:view gated)
- `POST /doctor/ai/ask` → `{ answer: string }` (Sitha AI; conversation history in component state, capped at 6 turns)

**Permission keys used:**
`doctor:view` (page gate + all reads), `doctor:consult` (save, create medicine, add option, AI assist), `doctor:edit` (fallback write permission), `billing:view` (print receipt)

**Key verified field names / constants (from old app `src/app/(hospital)/doctor/`):**
- `MEDICINE_TIMINGS`: 16 entries — "1-1-1", "1-1-1-1", "1-0-1", "1-0-0", "0-0-1", "0-1-0", "1-1-0", "0-1-1", "SOS", "BD", "TDS", "QID", "OD", "Tapering", "Weekly", "Monthly"
- `MEDICINE_DAYS`: "1", "3", "5", "7", "10", "14", "21", "28", "30", "45", "60", "90", "Continuous"
- `MEDICINE_CATEGORIES`: "Eye Drop", "Tablet", "Ointment", "Capsule", "Injection", "Syrup", "Other"
- `PredefinedTemplate` extra fields (not in OpenAPI): `presentComplaint`, `previousHistory`, `provisionalDiagnosis`, `followUpDays: number | null`, `additionalNotes`
- Template `applyTemplate`: `provisionalDiagnosis` → form `diagnosis`; `additionalNotes` → form `notes`; `followUpDays` → computed `followUpDate` (today + N days, IST)
- Save payload: `patientId` (sequential e.g. "P-0005"), `medicines` as JSON-stringified array with `timing`/`days` always strings
- AI: `AskSithaBody { patientId: string, question: string, history: SithaHistoryTurn[] }`, `AskSithaResponse { answer: string }`, history capped at 6 turns per server constraint

**Key architectural decisions:**
- **Split pane (not Sheet):** Queue stays visible while consulting — clinician needs to track queue state while writing a prescription. Sheet would obscure it.
- **Template picker at top of form:** `SingleSelect` value resets to `""` after applying (stateless) — matches old app pattern.
- **zodResolver + no `.default()` on timing/days:** Zod 4 `.default("")` makes the field optionally-undefined in the input type, causing zodResolver type mismatch with `FormValues`. Fix: plain `z.string()` with defaults from `buildDefaultValues`.
- **`NumberInput.onChange` is `ChangeEventHandler<HTMLInputElement>`** (not `(value: number) => void`) — parses `e.target.value` manually.
- **`SingleSelect.value` is `string` (not `string | null`)** — all picker states use `?? ""` fallback.

**Build:** `tsc -b && vite build` — zero TypeScript errors in all doctor/* files. Remaining build errors are in concurrently-built `pharmacy/` files (separate agent, out of scope).

---

### Session: PharmacyPage (page 7/18) — 2026-09-22

**Files created/updated:**
- `web/src/pages/PharmacyPage.tsx` — page shell, permission gate (pharmacy:view), 5-tab layout
- `web/src/pages/pharmacy/types.ts` — all pharmacy interfaces, verified enums/field names
- `web/src/pages/pharmacy/hooks.ts` — TanStack Query hooks for all pharmacy endpoints
- `web/src/pages/pharmacy/medicines-tab.tsx` — medicine master CRUD, DataTable with `key` (not `accessorKey`), ConfirmationModal with `isLoading`/`onOpenChange`
- `web/src/pages/pharmacy/medicine-form.tsx` — Dialog-based create/edit form, SingleSelect with `value: string`
- `web/src/pages/pharmacy/stock-tab.tsx` — stock list with summary cards, filter chips, Badge `variant="error"` for low-stock/expired
- `web/src/pages/pharmacy/stock-form.tsx` — Dialog-based add/edit stock with packs×packSize quantity calculation
- `web/src/pages/pharmacy/suppliers-tab.tsx` — card-grid CRUD with Dialog form, ConfirmationModal (`isLoading`/`onOpenChange`, no `onCancel`)
- `web/src/pages/pharmacy/purchase-orders-tab.tsx` — PO list (expandable cards), Dialog-based create PO + receive items forms, status filter bar
- `web/src/pages/pharmacy/bills-tab.tsx` — full billing: pending medicines, patient/prescription lookup, medicine stock search, bill builder, history table

**Key corrections vs. OpenAPI spec:**
- Stock fields: `mrp`/`costPrice` (not `purchasePrice`/`sellingPrice`)
- PO status: `DRAFT`/`ORDERED`/`PARTIALLY_RECEIVED`/`RECEIVED`/`CANCELLED` (uppercase, not lowercase)
- Billing payment modes: `CASH`/`CARD`/`UPI`/`CREDIT` (uppercase, distinct from main billing module)
- ColumnDef uses `key` (not `accessorKey`); Badge variant `"error"` not `"destructive"`
- ConfirmationModal uses `isLoading` (not `isPending`) and `onOpenChange` (no `onCancel`)
- DataModal is a data-fetching modal only — forms use Dialog/DialogContent/DialogHeader/DialogTitle/DialogFooter
- SingleSelect: `value: string` and `onChange: (v: string) => void` (no null)

**Build:** `npx tsc -b --noEmit` — zero pharmacy-specific TypeScript errors.

---

### Page 8 — Optical (`/optical`) — 2026-09-22

Replaced placeholder stub with a fully implemented OpticalPage (4-tab layout).

**File structure:**
```
web/src/pages/OpticalPage.tsx                        — thin composition root (permission gate + 4-tab layout)
web/src/pages/optical/types.ts                       — all API types, enum constants, SelectOption arrays
web/src/pages/optical/hooks.ts                       — TanStack Query hooks for all optical endpoints
web/src/pages/optical/products-tab.tsx               — product CRUD (DataTable + create/edit/delete)
web/src/pages/optical/product-form.tsx               — Dialog-based create/edit form (category-dependent fields)
web/src/pages/optical/stock-tab.tsx                  — stock + summary cards + add/edit stock forms
web/src/pages/optical/optical-bill-form.tsx          — full bill creation: patient AR lookup, stock search, line items
web/src/pages/optical/bills-tab.tsx                  — paginated bills list + status filter + status update + new bill Sheet
web/src/pages/optical/settings-tab.tsx               — printHeaderKey setting (settings:view/edit gated)
```

**Endpoints consumed:**
- `GET /optical/products` — optical:view
- `POST /optical/products` — optical:edit
- `PATCH /optical/products/{id}` — optical:edit
- `DELETE /optical/products/{id}` — optical:edit
- `GET /optical/stock` — optical:view
- `GET /optical/stock/summary` — optical:view
- `GET /optical/stock/search?q=...` — optical:view (enabled when q >= 2 chars)
- `POST /optical/stock` — optical:edit
- `PATCH /optical/stock/{id}` — optical:edit
- `GET /optical/bills?page=N&pageSize=N&status=...&from=...&to=...` — optical:view (usePaginatedQuery)
- `POST /optical/bills` — optical:create
- `PATCH /optical/bills/{id}/status` — optical:edit
- `GET /optical/patients/{id}/ar-reading` — optical:view (enabled when patientId present)
- `GET /optical/settings` — settings:view
- `PATCH /optical/settings` — settings:edit
- `GET /optical/hospital-profile` — optical:view

**Permission keys used:**
`optical:view` (page gate + all reads), `optical:create` (new bill), `optical:edit` (product/stock/bill-status mutations, settings edit), `settings:view`, `settings:edit`

**Key verified enum/field names (from old app src/app/(hospital)/optical/):**
- Product categories: `Frame`, `Lens`, `Contact Lens`, `Accessory`, `Solution`, `Sunglasses`
- Frame types: `Full Rim`, `Half Rim`, `Rimless`, `Wrap`
- Frame materials: `Metal`, `Plastic`, `TR-90`, `Titanium`, `Acetate`, `Memory Metal`
- Lens types: `Single Vision`, `Bifocal`, `Progressive`, `Photochromic`, `Tinted`
- Lens materials: `CR-39`, `Polycarbonate`, `Glass`, `Trivex`, `Hi-Index`
- Lens coatings: `Anti-Reflection`, `Blue Cut`, `Photochromic`, `Hardcoat`, `Mirror`
- Lens indices: `1.5`, `1.56`, `1.6`, `1.67`, `1.74`
- CL types: `Daily`, `Monthly`, `Yearly`, `Toric`, `Multifocal`
- Optical payment modes: `CASH`, `UPI`, `Card`, `NEFT`, `Credit` (DIFFERENT from main billing: `Cash/UPI/Card/Cheque/Online/NEFT`)
- Optical bill statuses: `COMPLETED`, `ORDERED`, `READY`, `CANCELLED`
- Settings field: `printHeaderKey` (from OpticalConfigTab.tsx)

**Review correction (2026-09-22):** Product-attribute enum constants corrected against `src/app/(hospital)/optical/components/InventoryTab.tsx` (ground truth). The initial implementation had invented plausible-but-wrong values: "Accessories"/"Others" instead of "Accessory"/"Solution"/"Sunglasses"; "Full Frame"/"Half Frame"/"Semi Rimless" instead of "Full Rim"/"Half Rim"/"Wrap"; "TR90"/"Mixed" instead of "TR-90"/"Memory Metal" (Plastic also missing); lens materials incorrectly included index values "1.67"/"1.74" as materials (correct 5th material is "Hi-Index"); coatings were entirely invented ("Anti-Reflective"/"Blue Light Block"/"UV400"/"Scratch Resistant"/"Hydrophobic" → "Anti-Reflection"/"Blue Cut"/"Photochromic"/"Hardcoat"/"Mirror"); indices had spurious trailing zeros ("1.50"/"1.60" → "1.5"/"1.6"); CL types included "Spherical"/"Colored"/"Annual" instead of "Yearly" (no Spherical/Colored in real list). Payment modes and bill-status enums were confirmed correct and untouched. `product-form.tsx` imports all constants from `types.ts` — no inline duplication. Category-dependent field visibility (Frame/Lens/Contact Lens show type+material, Lens additionally shows coating+index, Accessory/Solution/Sunglasses show no category-specific fields) matches old app logic.

**AR reading:** Uses `PatientArReading` type with `autoRefractometer`, `presentPrescription`, `glassesReading` (all `unknown` from server JSON), rendered via `safeReading()` helper + `ReadingRow` component. Shape mirrors `ARSection` from `workup/types.ts`.

**Key TypeScript fixes:**
- `{patient && (...)}` → `{patient != null && (...)}` (PatientArReading is not ReactNode)
- `hasReadings` typed as `boolean` explicitly (`!!(...))`) to avoid `unknown` propagation into JSX
- `TextInput`/`NumberInput` onChange uses `e.target.value` (extends InputProps, not custom handler)
- `CurrencyInput` onChange uses `(v: number) => void` (custom handler)
- `ConfirmationModal` uses `onOpenChange: (v: boolean) => void` (not `onClose`)
- `FormField` has no `description` prop — moved to `FormSection description`
- `PaginatedDataTable` requires `mode="offset"` with `page, pageSize, total, onPageChange`
- `ColumnDef` uses `cell:` (not `render:`) for cell renderers

**Build:** `npx tsc -b 2>&1 | grep optical` — zero optical-specific TypeScript errors.

---

### Page 9 — Labs (`/labs`) — 2026-09-22

Replaced placeholder stub with a fully implemented LabsPage (lab CRUD, investigation master, investigation-to-lab assignment, patient investigation billing, pending queue, bill history).

**File structure:**
```
web/src/pages/LabsPage.tsx                              — thin root: permission gate (labs:view) + Tabs
web/src/pages/labs/types.ts                             — all types + constants verified against old app
web/src/pages/labs/hooks.ts                             — query + mutation hooks (14 endpoints)
web/src/pages/labs/labs-tab.tsx                         — lab CRUD (list, add, edit, delete, configure)
web/src/pages/labs/lab-form.tsx                         — create/edit lab dialog
web/src/pages/labs/investigation-assignment-form.tsx    — full-page investigation assignment with amounts/defaults
web/src/pages/labs/investigations-tab.tsx               — investigation master list + create dialog
web/src/pages/labs/pending-tab.tsx                      — date-filtered pending investigations queue
web/src/pages/labs/bills-tab.tsx                        — bill generation (patient search + bill cards) + paginated history
```

**Endpoints consumed:**
- `GET /labs/labs` → `Lab[]` (x-permission: labs:view)
- `POST /labs/labs` → `Lab` (x-permission: labs:config)
- `GET /labs/labs/{id}` → `LabWithInvestigations` (x-permission: labs:view)
- `PATCH /labs/labs/{id}` → `Lab` (x-permission: labs:config)
- `DELETE /labs/labs/{id}` → void (x-permission: labs:config)
- `GET /labs/labs/{labId}/investigations` → `InvestigationMaster[]` (x-permission: labs:view)
- `PUT /labs/labs/{labId}/investigations` → void (x-permission: labs:config)
- `GET /labs/investigations` → `InvestigationMaster[]` (x-permission: labs:view)
- `POST /labs/investigations` → `InvestigationMaster` (x-permission: labs:config)
- `GET /labs/patients/{patientId}/investigations` → `PatientInvestigationsResponse` (x-permission: labs:view)
- `GET /labs/pending-investigations?date=YYYY-MM-DD` → `PendingPatient[]` (x-permission: labs:view)
- `GET /labs/bills?page=N&pageSize=N&date=YYYY-MM-DD` → `LabBillRow[]` (x-permission: labs:view)
- `GET /labs/bills/{id}` → `LabBillDetailData` (x-permission: labs:view)
- `POST /labs/bills` → void (x-permission: labs:create)

**Permission keys used (cross-checked against OpenAPI x-permission):**
- `labs:view` — page gate, all reads
- `labs:config` — create/edit/delete labs, POST investigations, PUT lab-investigation assignments
- `labs:create` — POST /labs/bills (the "Process Payment" button)
- `labs:edit` — no endpoint uses this in the spec; not wired to any action

**Critical field names verified against supabase/functions/labs/types.ts and old app:**
- `LabBill.total` (NOT `totalAmount` — OpenAPI spec is wrong; DB column is `total`)
- `LabBillItem.amount` (NOT `price` — per explicit supabase types.ts note)
- Investigation assignment body: `{ investigations: [{ investigationId, amount, isDefault }] }` — verified against openapi.yaml corrected description and supabase UpdateLabInvestigationsSchema

**Enums / option lists (all verified against old app source):**
- `PAYMENT_MODES = ["Cash", "UPI", "Card", "Cheque", "Online", "NEFT"]` — from `src/app/(hospital)/labs/components/LabBillCard.tsx`
- `INVESTIGATION_CATEGORIES = ["Lab Test", "Eye Test", "Imaging", "General"]` — from `src/app/(hospital)/labs/components/LabInvestigationConfig.tsx`
- Bill status values `PAID, PARTIAL, PENDING, CANCELLED` — from `LabBillingTab.tsx` STATUS_COLORS keys
- Bill status → badge variant: `PAID→success, PARTIAL→warning, PENDING→muted, CANCELLED→secondary`

**Key architectural decisions:**
- **Four tabs (Bills, Pending, Lab Config, Investigations):** Bills first since that's the primary daily workflow; Config/Investigations last since they're setup tasks.
- **InvestigationAssignmentForm as inline view replacement:** When "Configure" is clicked on a lab, it replaces the labs-tab content (same pattern as old app's LabConfigTab → LabInvestigationConfig). No sheet needed since the form is complex and full-page.
- **Patient search → query trigger:** `usePatientInvestigations` fires when `searchedPatientId` state changes (not on every keystroke). React.useEffect syncs bill form state when new patient data arrives.
- **Bill forms managed as Map:** `Map<labId, BillFormData>` mirrors old app's pattern. Allows independent editing per lab group.
- **POST /labs/bills body construction:** `total = subtotal - discount`, `payment` only sent when `amountPaid > 0`. Matches new API's multi-bill batch format.
- **`GET /labs/bills` pagination:** Uses `usePaginatedQuery` + `PaginatedDataTable mode="offset"`. Only `date` filter supported by the API (not date range or lab/status/patient filters from old app).

**Build:** `tsc -b && vite build` — zero TypeScript errors (full exit code 0), successful Vite production build. LabsPage chunk: 74.91 kB / 19.75 kB gzip (expected: TanStack Query + multiple tabs + billing form logic). Chunk size warnings are pre-existing project-level warnings.
