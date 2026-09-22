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
| 10 | Insurance | `/insurance` | `insurance/*` (companies, claims, payments) | ✅ |
| 11 | Staff | `/staff` | `staff/*` (members, roles, permissions) | ✅ |
| 12 | Settings | `/settings` | `settings/*` (33 endpoints — hospital profile, templates, master data) | ✅ |
| 13 | Expenses | `/expenses` | `expenses/*` (categories, expenses by date range) | ✅ |
| 14 | Dues & Follow-ups | `/dues-followups` | `dues-followups/*` (dues, followups, email templates) | ✅ |
| 15 | Call Logs | `/call-logs` | `call-logs/*` (list, stats, notes, patient link, sync) | ✅ |
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

### Page 10 — Insurance (`/insurance`) — 2026-09-22

Replaced placeholder stub with a fully implemented InsurancePage (2-tab layout: Claims primary, Companies secondary).

**File structure:**
```
web/src/pages/InsurancePage.tsx                        — thin composition root (permission gate + Tabs)
web/src/pages/insurance/types.ts                       — all API types + enum constants + option lists
web/src/pages/insurance/hooks.ts                       — TanStack Query hooks for all 12 insurance endpoints
web/src/pages/insurance/companies-tab.tsx              — company CRUD (PaginatedDataTable + inline add + edit Dialog + deactivate ConfirmationModal)
web/src/pages/insurance/claims-tab.tsx                 — claims list (PaginatedDataTable + status filter + row click detail)
web/src/pages/insurance/claim-detail-panel.tsx         — Sheet: full claim lifecycle (Overview/Financials tabs + timeline + key dates + rejection cards + status change + payment)
web/src/pages/insurance/create-claim-form.tsx          — Dialog: inpatient search + company select + policy fields + preauth amount
web/src/pages/insurance/claim-status-form.tsx          — Dialog: status update with FULL field set per transition
web/src/pages/insurance/payment-form.tsx               — Dialog: patient payment with insurance-specific payment modes
```

**Endpoints consumed:**
- `GET /insurance/companies?page=N&pageSize=N` — insurance:view (paginated list)
- `GET /insurance/companies?paginated=false` — insurance:view (dropdown)
- `POST /insurance/companies` — insurance:edit
- `PATCH /insurance/companies/{id}` — insurance:edit
- `DELETE /insurance/companies/{id}` — insurance:edit (soft-delete)
- `GET /insurance/claims?page=N&pageSize=N&status=...` — insurance:view
- `POST /insurance/claims` — insurance:create
- `GET /insurance/claims/{id}` — insurance:view
- `PATCH /insurance/claims/{id}/status` — insurance:edit (FULL field set: status + notes + amount + rejectionReason + settlementReference + deductions)
- `PATCH /insurance/claims/{id}/details` — insurance:edit
- `POST /insurance/claims/{id}/payments` — insurance:edit
- `GET /insurance/inpatients/search?q=...` — insurance:view

**Permission keys used:**
`insurance:view` (page gate + all reads), `insurance:create` (new claim), `insurance:edit` (all write actions)

**Key verified enum/field values (against old Next.js app):**

- `InsuranceClaimStatus` (13-value enum from `src/lib/types.ts`):
  `PREAUTH_SUBMITTED | PREAUTH_QUERY | PREAUTH_APPROVED | PREAUTH_REJECTED | ENHANCEMENT_CLAIMED | ENHANCEMENT_QUERY | ENHANCEMENT_APPROVED | ENHANCEMENT_REJECTED | FINAL_BILL_SUBMITTED | SETTLED | PARTIALLY_SETTLED | CLAIM_REJECTED | CLOSED`

- Status transitions: verified from `InsuranceStatusBadge.tsx INS_STATUS_TRANSITIONS`

- Status update field logic (from `InsuranceClaimDetail.tsx`):
  - `needsAmount`: PREAUTH_APPROVED | ENHANCEMENT_CLAIMED | ENHANCEMENT_APPROVED | SETTLED | PARTIALLY_SETTLED
  - `needsRejection`: PREAUTH_REJECTED | ENHANCEMENT_REJECTED | CLAIM_REJECTED
  - `needsSettlement` (adds settlementRef + deductions): SETTLED | PARTIALLY_SETTLED
  - Notes: always shown

- `PATCH /insurance/claims/{id}/status` body (full, per `UpdateClaimStatusSchema`):
  `{ status, notes?, amount?, rejectionReason?, settlementReference?, deductions? }`

- Insurance payment modes (from `InsuranceClaimDetail.tsx` line 28 `PAYMENT_MODES`):
  `["Cash", "UPI", "Card", "Bank Transfer", "Cheque"]`
  NOTE: "Bank Transfer" not "NEFT"/"Online" — different from billing module.

- Relation to insured (from `InsuranceClaimForm.tsx` `RELATION_OPTIONS`):
  `["Self", "Spouse", "Child", "Parent", "Other"]`

- InsuranceClaim field names verified against `src/lib/types.ts InsuranceClaim`:
  All 40+ fields matched exactly including `doctorNames` (JSON string[]), `statusHistory` (JSON), `packageInclusions` (JSON).

- InsuranceCompany DB fields verified against `supabase/functions/insurance/types.ts`:
  `name, tpaName, contactNumber, email, address, isActive`
  (NOT `contactPerson`/`phone` which appear in OpenAPI but don't exist as DB columns per the supabase types comment)

**Build:** `npx tsc -b` and `npm run build` — zero TypeScript errors in all insurance files. Full production build succeeds. InsurancePage chunk: 39.53 kB / 8.81 kB gzip. Chunk size warnings are pre-existing project-level, not new.

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

---

### Page 11 — Staff (`/staff`) — 2026-09-22

Replaced placeholder stub with a fully implemented StaffPage (Members + Roles & Permissions tabs).

**File structure:**
```
web/src/lib/permissions.ts                   — verbatim copy of src/lib/permissions.ts for web-app import resolution
web/src/pages/StaffPage.tsx                  — thin composition root (permission gate + 2-tab layout)
web/src/pages/staff/types.ts                 — all API types + enum constants verified against real old-app files
web/src/pages/staff/hooks.ts                 — 11 mutation/query hooks covering all /staff/* endpoints
web/src/pages/staff/members-tab.tsx          — members list (DataTable with-row-actions), search/filter, create/edit/deactivate/reset-password
web/src/pages/staff/member-form.tsx          — Dialog: all 15 create/update fields
web/src/pages/staff/roles-tab.tsx            — role sidebar + permission grid (module-level + individual toggles), seed system roles, delete role
web/src/pages/staff/role-form.tsx            — Dialog: create/edit role metadata (name, displayName, description)
```

**Endpoints consumed (11):**
- `GET /staff/members` → `StaffMember[]` — staff:view
- `POST /staff/members` → `StaffMember` — staff:create
- `PATCH /staff/members/{id}` — staff:edit
- `PATCH /staff/members/{id}/active` → `{ isActive: boolean }` — staff:deactivate
- `POST /staff/members/{id}/reset-password` → `{ newPassword }` — staff:edit
- `GET /staff/roles` → `StaffRole[]` — staff:view
- `POST /staff/roles` — staff:manage_roles
- `PATCH /staff/roles/{id}` — staff:manage_roles
- `DELETE /staff/roles/{id}` — staff:manage_roles
- `PATCH /staff/roles/{id}/permissions` → `{ permissions: string[] }` — staff:manage_roles
- `POST /staff/roles/seed` — staff:manage_roles

**Permission keys used:**
`staff:view` (page gate + all reads), `staff:create` (Add Member button), `staff:edit` (edit + reset password),
`staff:deactivate` (toggle active/inactive), `staff:manage_roles` (all role CRUD + permission grid)

**Verified enum constants (read directly from `src/app/(hospital)/staff/components/StaffPage.tsx`):**
- `BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]` — line 84, copied verbatim
- `DEPARTMENTS = ["General", "Ophthalmology", "Optometry", "Pharmacy", "Lab", "Nursing", "Administration", "Front Desk", "Accounts"]` — line 85, copied verbatim
- `SALARY_TYPES = [{ value: "MONTHLY", label: "Monthly" }, { value: "DAILY", label: "Daily" }, { value: "PER_VISIT", label: "Per Visit" }]` — lines 745-748, copied verbatim
- Designation: free-text input (not a select) — verified from old app line 711

**Create/Update field shapes (verified against `supabase/functions/staff/types.ts`):**
- Create body (POST): `name, email, password (min 6), role` [required] + `employeeId, phone, department, designation, qualifications, joiningDate, address, emergencyContact, bloodGroup, salary, salaryType` [optional]
- Update body (PATCH): all same fields, all optional; uses `name` (not `fullName`) as API key
- Response: `fullName` (not `name`) per `StaffMemberResponse`

**Key design decisions:**
- `permissions` field in `StaffRole`: returned as `string[]` (parsed) by the Edge Function per `supabase/functions/staff/types.ts` — NOT JSON-encoded string as OpenAPI spec description implies
- Permission grid: sources from `web/src/lib/permissions.ts` (mirrored copy of root `src/lib/permissions.ts`). Module-level Switch toggles all perms in a module; individual row Switches toggle one key. Both send a full replacement list to `PATCH /staff/roles/{id}/permissions`
- Deactivate uses `ConfirmationModal variant="destructive"` (blocking action); activate is immediate (no confirmation — reversible)
- Reset-password uses a Dialog with password input (needs user input, ConfirmationModal unsuitable) — password min 6 chars validated both client-side and backend
- `modulePerms` from `ALL_PERMISSIONS as const` is a literal-union array; cast to `string[]` before calling `.includes()` to avoid TypeScript's strict overload

**Build:** `npx tsc -b 2>&1 | grep -E "staff|StaffPage|permissions"` — zero errors in all Staff files.

---

### Page 13 — Expenses (`/expenses`) — 2026-09-22

Replaced placeholder stub with a fully implemented ExpensesPage.

**File structure:**
```
web/src/pages/ExpensesPage.tsx                    — thin composition root (permission gate + PageHeader + modal orchestration)
web/src/pages/expenses/types.ts                   — all API types verified against OpenAPI + supabase/functions/expenses/types.ts + old app
web/src/pages/expenses/hooks.ts                   — query + mutation hooks (10 endpoints) + getDateRange helper
web/src/pages/expenses/category-manager.tsx       — Dialog: category CRUD with drag-to-reorder + seed defaults
web/src/pages/expenses/expense-form.tsx           — Dialog: create/edit expense (CurrencyInput + SingleSelect)
web/src/pages/expenses/expenses-section.tsx       — time filter bar + donut chart (left) + expense list with search/filter/sort (right)
```

**Endpoints consumed:**
- `GET /expenses/categories` — expenses:view (staleTime 5min)
- `POST /expenses/categories` — expenses:edit
- `PATCH /expenses/categories/{id}` — expenses:edit
- `DELETE /expenses/categories/{id}` — expenses:edit (409 if expenses linked)
- `PATCH /expenses/categories/reorder` — expenses:edit (body: `{ order: [{ id, sortOrder }] }`)
- `POST /expenses/categories/seed` — expenses:edit (idempotent, button in CategoryManagerDialog)
- `GET /expenses?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD` — expenses:view
- `POST /expenses` — expenses:create
- `PATCH /expenses/{id}` — expenses:edit
- `DELETE /expenses/{id}` — expenses:delete

**Permission keys used (cross-checked against OpenAPI x-permission — "manage" does NOT exist):**
- `expenses:view` — page gate + GET categories + GET expenses
- `expenses:create` — "Add Expense" button
- `expenses:edit` — category CRUD/reorder/seed + edit expense rows
- `expenses:delete` — delete expense rows

**Key verified field names (from old app + supabase/functions/expenses/types.ts):**
- `Expense`: `id, title, categoryId, amount, date (YYYY-MM-DD), reason, paymentMode, hospitalId, createdAt`
- `ExpenseCategory`: `id, name, color, sortOrder, hospitalId`
- `ExpenseWithCategory`: Expense + `category: ExpenseCategory`
- Reorder body: `{ order: [{ id: string, sortOrder: number }] }` — sortOrder derived from array index

**Reorder UI pattern (verified from old CategoryManager.tsx):**
HTML5 drag-and-drop with `GripVertical` icon — NOT up/down buttons. `draggable` + `onDragStart/onDragOver/onDragEnd` handlers. Reorder committed via `PATCH /expenses/categories/reorder` on dragEnd.

**Expense form fields (verified from old ExpenseForm.tsx — paymentMode NOT in form):**
`title` (required), `amount/CurrencyInput` (required, >0), `categoryId/SingleSelect` (required), `date` (required, max=today), `reason/Textarea` (optional). No `paymentMode` field in form — matches old app exactly.

**Layout (matches old app):**
- Time filter button group (today/week/month/custom with native date inputs)
- lg:col-span-1 left: `ThemedDonutChart` inside `ChartContainer` with short total (₹X.XK) as center label + category breakdown list + total card
- lg:col-span-2 right: search input + category Select filter + sort Select + expense rows (inline edit/delete buttons appear on hover)

**Build:** `npx tsc -b 2>&1 | grep -i expenses` — zero TypeScript errors in all expenses files. Remaining build errors are in `settings/` (concurrently built, out of scope).

---

### Page 12 — Settings (`/settings`) — 2026-09-22

Replaced placeholder stub with a fully implemented SettingsPage (sidebar-style section switcher, 10 sub-scopes, 33 endpoints).

**File structure:**
```
web/src/pages/SettingsPage.tsx                              — thin composition root (permission gate + sidebar-style section nav)
web/src/pages/settings/types.ts                             — all TypeScript interfaces + enum constants verified against old app
web/src/pages/settings/hooks.ts                             — TanStack Query hooks for all 10 sub-scopes (query key factory + CRUD hooks)
web/src/pages/settings/service-templates-section.tsx        — full CRUD: list table + create/edit Dialog + delete ConfirmationModal
web/src/pages/settings/hospital-profile-section.tsx         — GET/PATCH hospital profile + PATCH nav-style (integrated)
web/src/pages/settings/print-config-section.tsx             — GET/PATCH print config with item ordering, add/remove receipt types
web/src/pages/settings/prescription-templates-section.tsx   — full CRUD: code+name+clinical notes+medicines array+investigations+followUp
web/src/pages/settings/inpatient-templates-section.tsx      — full CRUD: code+name+operationName+provisionDiagnosis+medicines array
web/src/pages/settings/packages-section.tsx                 — full CRUD: nested inclusions + subItems + auto-computed totalAmount
web/src/pages/settings/surgeries-section.tsx                — full CRUD: doctorNames+onDutyDoctors (JSON-encoded arrays), operationProcedure+Details Textarea
web/src/pages/settings/discharges-section.tsx               — full CRUD: dischargeDiagnosis+conditionAtDischarge+Textarea fields
web/src/pages/settings/medicine-master-section.tsx          — full CRUD: name+category+defaultTiming+defaultDays+defaultNote+sortOrder
```

**Endpoints consumed (33 across 10 sub-scopes):**
- `GET /settings/service-templates`, `POST`, `PATCH /{id}`, `DELETE /{id}` — settings:view / settings:edit
- `GET /settings/hospital-profile`, `PATCH /settings/hospital-profile` — settings:view / settings:edit
- `PATCH /settings/nav-style` — settings:edit (integrated in HospitalProfileSection)
- `GET /settings/print-config`, `PATCH /settings/print-config` — settings:view / settings:edit
- `GET /settings/prescription-templates`, `POST`, `PATCH /{id}`, `DELETE /{id}` — settings:view / settings:edit
- `GET /settings/inpatient-templates`, `POST`, `PATCH /{id}`, `DELETE /{id}` — settings:view / settings:edit
- `GET /settings/packages`, `POST`, `PATCH /{id}`, `DELETE /{id}` — settings:view / settings:edit
- `GET /settings/surgeries`, `POST`, `PATCH /{id}`, `DELETE /{id}` — settings:view / settings:edit
- `GET /settings/discharges`, `POST`, `PATCH /{id}`, `DELETE /{id}` — settings:view / settings:edit
- `GET /settings/medicine-master`, `POST`, `PATCH /{id}`, `DELETE /{id}` — settings:view / settings:edit

**Permission keys used (verified from src/lib/permissions.ts — only 2 exist):**
- `settings:view` — page gate + all reads
- `settings:edit` — all write operations; passed as `canEdit` prop to each section

**Key verified field names and enum constants (all read from real old-app files):**
- Service categories: `["Consultation", "Diagnostic", "Procedure", "Optical", "Other"]` — from old SettingsPage.tsx CATEGORY_OPTIONS
- Medicine categories: `["Eye Drop", "Tablet", "Capsule", "Ointment", "Injection", "Syrup", "Other"]` — from MedicineMasterTab
- Prescription timings: 16 values "1-1-1" through "Monthly" — from MEDICINE_TIMINGS constant
- Prescription days: 13 values "1" through "Continuous" — from MEDICINE_DAYS constant
- Package inclusions: `["Room Charges", "Medicine", "Consumables", "Surgery Charges", "Doctor Fee", "Nursing Care", "Food", "Lab Tests"]` — from PackageDialog
- Print item types: `"cash" | "prescription" | "readings" | "report"` — from DefaultPrintConfig in src/lib/default-print.ts
- Nav style values: `"side"` and `"top"` — verified from handleNavStyleChange in old HospitalTab
- `InpatientTemplate.provisionDiagnosis` — NOT `provisionalDiagnosis`; field name verified from InpatientTemplateRow type in old SettingsPage.tsx
- `doctorNames` and `onDutyDoctors` in Surgeries: returned as JSON-encoded strings by API; parsed via JSON.parse() matching old app behavior

**Key architectural decisions:**
- Sidebar-style vertical secondary nav (not horizontal tabs) — better UX with 10 sections, sections grouped into Templates / Master Data / Hospital Setup
- Nav style integrated in HospitalProfileSection (not its own section) — matches old app's HospitalTab that included both profile and nav style in one form
- Print config: local parsePrintConfig() helper with defensive typing for the free-form JSON blob; item ordering with move-up/move-down buttons; DropdownMenu to add new receipt types
- useMedicineMaster() called inside prescription/inpatient form dialogs for medicine name autocomplete (via plain HTML datalist); safe because hook is called when dialog mounts
- useState initializer pattern for form state (not useEffect reset) — avoids unnecessary re-renders on dialog close

**Build:** `npx tsc -b 2>&1 | grep -i settings` — zero TypeScript errors in all settings files.

---

### Page 14 — Dues & Follow-ups (`/dues-followups`) — 2026-09-22

Replaced placeholder stub with a fully implemented DuesFollowupsPage (2-tab layout).

**File structure:**
```
web/src/pages/DuesFollowupsPage.tsx                    — thin composition root (permission gate + PageHeader + Tabs)
web/src/pages/dues-followups/types.ts                  — all types verified against old app + supabase functions
web/src/pages/dues-followups/hooks.ts                  — 6 query hooks + 2 mutation hooks (8 endpoints total)
web/src/pages/dues-followups/dues-tab.tsx              — paginated dues list + mark-paid ConfirmationModal
web/src/pages/dues-followups/followups-tab.tsx         — paginated follow-ups list + send-email row action
web/src/pages/dues-followups/send-email-form.tsx       — Dialog: template picker (SingleSelect) + send via Sitha AI
```

**Endpoints consumed:**
- `GET /dues-followups/dues?page=N&pageSize=N` → `DueRecord[]` (x-permission: dues:view)
- `GET /dues-followups/followups?page=N&pageSize=N` → `FollowUpRecord[]` (x-permission: dues:view)
- `PATCH /dues-followups/dues/{id}/mark-paid` → body: `{ type, paymentMode?, amount? }` (x-permission: dues:edit)
- `GET /dues-followups/doctors` → `string[]` (x-permission: dues:view)
- `GET /dues-followups/departments` → `string[]` (x-permission: dues:view)
- `GET /dues-followups/email-templates` → `EmailTemplate[]` code+name (x-permission: dues:view)
- `GET /dues-followups/hospital-name` → `string` (x-permission: dues:view)
- `POST /dues-followups/send-email` → body: `{ patientId, templateId, customMessage? }` (x-permission: dues:edit)

**Permission keys used (cross-checked against src/lib/permissions.ts — only dues:view and dues:edit exist):**
- `dues:view` — page gate + all reads
- `dues:edit` — mark-paid action + send-email action

**Key verified field names (read from old app + supabase types — all match exactly):**

DueRecord (from `src/app/(hospital)/dues-followups/actions.ts` + `supabase/functions/dues-followups/types.ts`):
`id, type ("OPD"|"IPD"|"LAB"|"PHARMACY"), patientId, patientName, uhid, phone, services, totalAmount, amountPaid, balanceDue, date, prescriptionNumber?, labBillNumber?, pharmacyBillNumber?`

FollowUpRecord (same sources):
`id, type ("OPD"|"IPD"), patientId, patientName, uhid, phone, email (string|null), followUpDate, doctorName, department, diagnosis, additionalNotes, lastVisitDate, isOverdue`

EmailTemplate (from `supabase/functions/dues-followups/types.ts`):
`code, name`

MarkPaidBody (from `supabase/functions/dues-followups/types.ts` MarkPaidSchema):
`type: "prescription"|"inpatient"|"labBill"|"pharmacyBill"` (NOT the DueRecord.type enum — mapped via dueTypeToMarkPaidType())

SendEmailBody (from `supabase/functions/dues-followups/types.ts` SendEmailSchema):
`patientId (UHID), templateId (template code), customMessage?` — backend resolves patient email from UHID

**Key implementation decisions:**
- **No server-side filters for dues/followups:** The API (`/dues-followups/dues` and `/dues-followups/followups`) only accepts `page` and `pageSize` — no search/type/date/doctor/department filter params. Doctor and department list endpoints are loaded (hooks.ts) but the followups endpoint does not accept those as query params. Filter UI is omitted rather than faking client-side filtering on one page of paginated data.
- **ConfirmationModal variant="warning"** for mark-paid: money-affecting but not destructive (paying off a real debt).
- **additionalNotes JSON parsing:** `parseAdditionalNotes()` in followups-tab.tsx mirrors the old FollowUpsTab.tsx pattern — tries JSON.parse, extracts `.notes` or `.value`, falls back to raw string.
- **Badge variants (verified against old DuesTab.tsx):** OPD→secondary, LAB→info, PHARMACY→warning, IPD→outline. Overdue badge uses `variant="error"` (new app has no "destructive" variant).
- **Send-email patientId:** Sends `FollowUpRecord.patientId` (the UHID, e.g. "P-001") — the backend (service.ts sendEmail()) looks up patient email from DB. Not the email address itself.
- **No summary stat cards:** The API returns `{ data, meta.total }` but no summary aggregates (totalOutstanding, opdCount, etc.). The old app computed these in the server action but the new Edge Function `getDues/getFollowups` services do not. Total record count shown as a text line above the table.

**Build:** `npx tsc -b 2>&1 | grep -i dues` — zero TypeScript errors. Full `npx tsc -b` exit code 0 (no errors project-wide).

---

### Page 15 — Call Logs (`/call-logs`) — 2026-09-22

Replaced placeholder stub with a fully implemented CallLogsPage (2-tab layout: Calls / Analytics).

**File structure:**
```
web/src/pages/CallLogsPage.tsx                       — thin composition root (permission gate + sync button + Tabs)
web/src/pages/call-logs/types.ts                     — CallLog, CallStats, CallAnalyticsData, PatientSearchResult, SyncResponse, CALL_STATUS_CONFIG
web/src/pages/call-logs/hooks.ts                     — query + mutation hooks (7 endpoints)
web/src/pages/call-logs/logs-tab.tsx                 — paginated table + date/status/direction/search filters + CallDetailSheet trigger
web/src/pages/call-logs/call-detail-sheet.tsx        — Sheet: call metadata + recording player + notes (PATCH) + patient link (PATCH)
web/src/pages/call-logs/analytics-tab.tsx            — filter selector + today's StatCard tiles + charts (area, donut, bar) + top callers table
```

**Endpoints consumed:**
- `GET /call-logs?page=N&pageSize=N&date=YYYY-MM-DD` → `CallLog[]` — call_logs:view
- `GET /call-logs/stats` → `CallStats` (today's counts always) — call_logs:view
- `GET /call-logs/analytics?filter=today|week|month|year` → `CallAnalyticsData` — call_logs:view
- `GET /call-logs/patients/search?q=...` → `PatientSearchResult[]` — call_logs:view (enabled ≥ 2 chars)
- `PATCH /call-logs/{id}/notes` → `{ notes }` body — call_logs:edit
- `PATCH /call-logs/{id}/patient` → `{ patientId }` body — call_logs:edit
- `POST /call-logs/sync` → `SyncResponse` — call_logs:sync

**Permission keys (cross-checked against OpenAPI x-permission):**
- `call_logs:view` — page gate + all reads
- `call_logs:edit` — update notes, link patient (both gated in CallDetailSheet)
- `call_logs:sync` — Sync button in PageHeader

**Exact CallLog field names (from repository.ts CallLogRow):**
`id, exotelCallSid, callFrom, callTo, direction, status, startTime, endTime, duration, recordingUrl, callerName, patientId, notes, createdAt, updatedAt`
Note: `rawResponse` is excluded (multi-KB Exotel JSON, never rendered in UI).

**Exact status values (from service.ts mapLeg2Status + resolveStatusFallback):**
`"completed"` (shown as "Answered"), `"missed"`, `"busy"`, `"failed"`, `"ringing"`

**Direction values:** `"inbound"` | `"outbound"`

**Stats response shape (from service.ts getStats()):**
`{ total, completed, missed, busy, failed, inbound, outbound, totalDuration, avgDuration }`

**Analytics response shape (from service.ts getAnalytics() + actions.ts CallAnalyticsData):**
KPIs: `totalCalls, answeredCalls, missedCalls, busyCalls, failedCalls, answerRate, missedRate, avgDuration, totalTalkTime, inboundCalls, outboundCalls, linkedCalls`
Changes: `totalChange, answeredChange, missedChange`
Arrays: `hourlyDistribution[24]: { hour, answered, missed, busy, total }`, `dailyTrend: { date, total, answered, missed, avgDuration }`, `topCallers: { phone, name, calls, answered, totalDuration }`, `durationBuckets: { label, count }`
Scalars: `peakHour, quietHour`

**Patient search response (from repository.ts PatientSearchRow):** `{ id, fullName, phone, patientId }`

**Sync response (from service.ts syncExotel()):** `{ success, synced?, message?, error? }`

**Chart type selection (rationale):**
- `ThemedAreaChart` for daily call trend (answered vs missed series over time — canonical area chart use case: continuous time axis + two overlapping magnitude series; only shown when ≥ 2 data points)
- `ThemedDonutChart` for inbound vs outbound direction split (two-slice proportional breakdown — canonical donut use case)
- `ThemedBarChart` for call duration distribution (discrete labeled histogram buckets — canonical bar chart use case)

**Analytics filter:** `SegmentedControl` with options Today / 7 Days / 30 Days / Year, maps to `?filter=today|week|month|year` on the analytics endpoint.

**Key design decisions:**
- Stats tiles (today's StatCard section) always fetch from `/call-logs/stats` regardless of analytics period filter.
- List API only supports single `date` filter; status/direction/search filters applied client-side on the loaded page.
- Sync button shows `animate-spin` + "Syncing..." during the mutation (external Exotel API call, may be slow). Toast on success shows synced count.
- Patient link flow: input ≥ 2 chars triggers patient search, result list rendered inline in the sheet (no separate Dialog).
- Notes: save button disabled when notes unchanged or empty (backend requires `notes.min(1)`).

**Build:** `tsc -b && vite build` — zero TypeScript errors (exit code 0), successful Vite production build. CallLogsPage chunk: 31.59 kB / 8.36 kB gzip.
