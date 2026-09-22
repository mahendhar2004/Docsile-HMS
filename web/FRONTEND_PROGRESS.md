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
| 4 | Workup | `/workup` | `workup/*` (queue, eye readings) | ⬜ |
| 5 | Doctor | `/doctor` | `doctor/*` (queue, consultation, prescriptions, AI assist, receipt) | ⬜ |
| 6 | Billing | `/billing` | `billing/*` (daily summary, prescriptions, payments) | ⬜ |
| 7 | Pharmacy | `/pharmacy` | `pharmacy/*` (medicines, stock, suppliers, purchase orders, bills) | ⬜ |
| 8 | Optical | `/optical` | `optical/*` (products, stock, bills, AR reading, settings) | ⬜ |
| 9 | Labs | `/labs` | `labs/*` (labs, investigations, patient investigations, bills) | ⬜ |
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
