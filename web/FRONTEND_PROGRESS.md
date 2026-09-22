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
| 2 | Patient Care | `/patients` | `patient-care/*` (patients + inpatients CRUD, search, services, receipt) | ⬜ |
| 3 | Queue | `/queue` | `queue/*` (OPD/workup/inpatient boards, Realtime) | ⬜ |
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
