# UI Parity with Main Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every page in `feat/react-migration` (React + Vite, `web/`) structurally and visually match its counterpart on `main` (the old Next.js app, `src/app/(hospital)/...`) — same pages, same routes, same tabs in the same order with the same labels, same fields/columns, same layout density, same plain visual skin — while staying pure React/Vite (no Next.js code or patterns reintroduced). `LoginPage` is explicitly exempt: leave it exactly as it is on `feat/react-migration` today.

**Architecture:** This is a parity correction, not new feature work. For every task, the main-branch source (`git show main:<path>`) is the ground truth for exact copy, field lists, and tab labels — read it directly rather than relying on this plan's paraphrase. The migrated branch's own component library (`web/src/components/ui/*`, `web/src/components/patterns/*`) stays as the implementation substrate; only route topology, tab/section structure, field lists, and shared visual tokens change to match main.

**Tech Stack:** React 19 + Vite + TypeScript, React Router v6 (`web/src/router.tsx`), Zustand, TanStack Query, Radix UI primitives under `web/src/components/ui/`, Tailwind v4 (`web/src/index.css` `@theme` tokens).

**Spec:** This plan's spec is the six comparison reports gathered in-session (2026-10-07) by directly reading `main`'s `src/app/(hospital)/**` and `src/components/layout/**` against `feat/react-migration`'s `web/src/pages/**` and `web/src/components/layout/**`. No separate spec doc exists; this plan's Global Constraints section carries the load-bearing facts from those reports.

## Status tracker

*(Updated after every task completes. Full decision log: `.superpowers/sdd/2026-10-07-ui-parity-with-main/progress.md`.)*

| # | Task | Status |
|---|------|--------|
| 1 | Revert shared visual tokens/primitives (radius, Card, Table, Tabs, Button) | ✅ done (005674d) |
| 2 | Rework AppShell + Sidebar (hover-reveal, nav items, logout) | ✅ done |
| 3 | Dashboard module grid | ✅ done |
| 4 | Split Patients → `/patients` + new `/inpatients` | ⚠️ done (backend-limited stat badges, see ledger) |
| 5 | Fold Billing into Patients, delete `/billing` | 🔄 in progress |
| 6 | Delete standalone Queue page | ⬜ not started |
| 7 | Rework Doctor page (queue-table-takeover) | ⬜ not started |
| 8 | Rework Workup page (Refraction) | ⬜ not started |
| 9 | Pharmacy — consolidate to 4 tabs + stat badges | ⬜ not started |
| 10 | Optical — consolidate to 3 tabs + stat badges | ⬜ not started |
| 11 | Labs — consolidate to 2 tabs + stat badge | ⬜ not started |
| 12 | Insurance — remove invented tab structure | ⬜ not started |
| 13 | Dues & Follow-Ups — label fixes | ⬜ not started |
| 14 | Call Logs / Expenses — padding/skin pass | ⬜ not started |
| 15 | Analytics — filter pills, sticky header | ⬜ not started |
| 16 | Split Data Export out of Reports | ⬜ not started |
| 17 | License Tracker / Staff — confirm copy | ⬜ not started |
| 18 | Settings — flatten tabs, add Users, drop Inpatient Templates | ⬜ not started |
| 19 | Add missing Unauthorized page | ⬜ not started |
| 20 | Whole-branch verification sweep | ⬜ not started |

Legend: ⬜ not started · 🔄 in progress · ✅ done · ⚠️ done with a flagged issue

## Global Constraints

- Framework stays React + Vite only. Never reintroduce Next.js (`"use client"`, `next/link`, `next/navigation`, server actions) anywhere.
- `web/src/pages/LoginPage.tsx` and its assets (`web/src/assets/undraw-medicine.svg`) are **untouched** by every task in this plan.
- "No extra pages, no extra fields" is a hard rule: when migrated has a tab/page/field main doesn't, delete it (unless a task explicitly says to keep it, with a reason). When main has a tab/page/field migrated is missing, add it.
- Main's exact copy (titles, subtitles, tab labels, column headers, button text) must be copied verbatim from `git show main:<path>` — do not paraphrase or improve wording.
- Main's base design tokens (`src/app/globals.css`): radius scale `--radius-xs:4px / --radius-sm:6px / --radius:8px / --radius-md:10px / --radius-lg:12px / --radius-xl:16px / --radius-2xl:20px`; shadow scale is plain `--shadow-xs/-sm/-shadow(DEFAULT)/-md/-lg` only (no composite tokens). Main's `Card` is `rounded-lg border bg-card text-card-foreground shadow-sm` — plain border + soft shadow, nothing fancier.
- `web/src/index.css` currently has a *bumped* radius scale (6/8/10/12/14/18/22px) and extra composite shadow tokens (`--shadow-border`, `--shadow-card`, `--shadow-card-hover`, `--shadow-popover`, `--shadow-overlay`) added during an earlier "premium redesign" pass this session. `LoginPage.tsx` depends on `--shadow-border`, `--shadow-card`, and `--radius-xl` — **do not delete these composite tokens**, keep them defined in `index.css` so LoginPage keeps working unchanged. Only stop *using* them in the shared primitives that every other page renders through (Task 1).
- No page-level or component-level automated tests exist for any of these pages today (confirmed: `find web/src/pages -iname "*.test.*"` is empty). Verification for every task in this plan is: `npm run typecheck`, `npm run build`, `npm run lint` all passing, plus a concrete grep/text-presence check against main's exact copy (listed per task) — not invented unit tests.
- Sitha AI's move to a global floating widget (`web/src/components/layout/sitha-widget.tsx`) and the PWA install prompt are **approved, intentional deviations from main** — never revert these, even where main shows an inline "Ask Sitha" toggle instead.
- Run `npm run dev:mock` yourself only if explicitly told to; otherwise assume the person running this plan starts the dev server themselves (standing instruction from earlier in this project).

## Review Focus

- **Deleting a route/page that still has live internal links pointing at it** (e.g. deleting `/queue` while some other page's "View queue" button still links there) would 404 on click — each deletion task includes a repo-wide grep for the old path before removing the route.
- **Reverting shared shadow/radius tokens breaks LoginPage** if the revert touches the composite tokens it depends on instead of just the primitives that consume them — Task 1 verifies LoginPage's three dependent declarations are untouched after the change.
- **Merging two tabs into one** (e.g. Pharmacy's `stock-tab` + `medicines-tab` → `inventory-tab`) can silently drop a field or action that only existed in one of the two originals — each merge task's verification step diffs the merged tab's field list against main's single tab's field list from the fork reports, not just "it renders."
- **Settings' "Inpatient Templates" tab deletion** has live backend plumbing behind it (`settings/actions.ts`-equivalent CRUD) — deleting the UI tab must not delete the underlying data-fetching hook if anything else (e.g. `InPatientDetailPage`'s template picker) still calls it; Task 20 checks for other call sites before removing files.
- **The hover-reveal Sidebar hides all navigation by default** — a user landing on any page with the mouse away from the left edge sees no way to navigate until they move their mouse there, which is a real accessibility/usability regression risk worth the executor double-checking against main's actual behavior (main does exactly this, confirmed by reading `Sidebar.tsx`), not silently softening it to "always visible" without flagging it back to the person running this plan.

---

## Task 1: Revert shared visual tokens and primitives to match main

**Files:**
- Modify: `web/src/index.css` (radius scale section only)
- Modify: `web/src/components/ui/card.tsx`
- Modify: `web/src/components/ui/table.tsx`
- Modify: `web/src/components/ui/tabs.tsx`
- Modify: `web/src/components/ui/button.tsx`
- Read-only reference: `web/src/pages/LoginPage.tsx` (verify, do not edit)

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: the plain `Card`/`Table`/`Tabs`/`Button` look every later task's pages render through.

- [ ] **Step 1: Revert the radius scale in `web/src/index.css`**

Change the `--radius-*` block to exactly match main's `src/app/globals.css`:
```css
--radius-xs: 4px;
--radius-sm: 6px;
--radius: 8px;
--radius-md: 10px;
--radius-lg: 12px;
--radius-xl: 16px;
--radius-2xl: 20px;
```
Leave `--radius-full` and every shadow token (including the composite ones) untouched — they stay defined for LoginPage's sake.

- [ ] **Step 2: Revert `Card` in `web/src/components/ui/card.tsx` to plain styling**

The root `Card` wrapper's className should resolve to main's equivalent of `rounded-lg border bg-card text-card-foreground shadow-sm` using this codebase's token syntax, i.e. `rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-card-foreground)] shadow-[var(--shadow-sm)]` — remove any use of `shadow-[var(--shadow-card)]` / `shadow-[var(--shadow-card-hover)]` from this file.

- [ ] **Step 3: Revert `Table`'s wrapping container in `web/src/components/ui/table.tsx`**

Remove the `shadow-[var(--shadow-card)]` container treatment added in the premium pass; the outer wrapper should just be `rounded-[var(--radius-lg)] border border-[var(--color-border)]` with a plain `overflow-x-auto`, matching main's unstyled `<table>` wrapped in a bordered div (check `git show main:src/components/ui/table.tsx` for the exact baseline if it exists there — if main has no custom Table wrapper at all, drop back to the simplest bordered-container version).

- [ ] **Step 4: Revert `Tabs`'s underline variant in `web/src/components/ui/tabs.tsx`**

Remove the muted-background strip + docking shadow added in the premium pass for the underline variant; active tab indication should be a simple bottom-border/color-change, matching main's plain underline tab style (`git show main:src/components/ui/tabs.tsx` if present, else match the plain pill/underline look used in `TopNavBar.tsx`/`Sidebar.tsx`'s tab-like active states — simple color + bottom border, no shadow).

- [ ] **Step 5: Revert `Button` shadow tiers in `web/src/components/ui/button.tsx`**

Primary/destructive variants go back to `shadow-[var(--shadow-sm)]` (not `--shadow-card`); secondary/outline variants go back to a plain border, no `--shadow-border` ring treatment.

- [ ] **Step 6: Verify LoginPage is untouched**

Run:
```bash
grep -n "shadow-\[var(--shadow-border)\]\|shadow-\[var(--shadow-card)\]\|radius-xl" web/src/pages/LoginPage.tsx
```
Expected: the same three matches as before this task (lines ~149, ~174, ~192) — identical to pre-change, confirming the composite tokens are still defined and LoginPage's usage is untouched.

- [ ] **Step 7: Typecheck and build**

Run: `cd web && npm run typecheck && npm run build`
Expected: both succeed with no new errors.

- [ ] **Step 8: Commit**

```bash
git add web/src/index.css web/src/components/ui/card.tsx web/src/components/ui/table.tsx web/src/components/ui/tabs.tsx web/src/components/ui/button.tsx
git commit -m "fix: revert shared primitives to main's plain visual tokens (radius/shadow)"
```

---

## Task 2: Rewrite AppShell + Sidebar to match main exactly

**Files:**
- Modify: `web/src/components/patterns/navigation/sidebar.tsx`
- Modify: `web/src/components/layout/app-shell.tsx`
- Create: `web/src/components/layout/user-menu-card.tsx` (avatar + name + role + logout, extracted for reuse/testability)
- Reference (read via `git show main:<path>`): `src/components/layout/Sidebar.tsx`, `src/components/layout/nav-items.ts`, `src/app/(hospital)/layout.tsx`

**Interfaces:**
- Consumes: `useSessionStore` (existing) for the current user's `fullName`/`role`; whatever logout action the session store already exposes (check `web/src/store/session.ts` for a `logout`/`clearSession` method — if none exists, add a minimal one that clears the store and calls the existing `/auth/logout`-equivalent endpoint used by `web/src/mocks/handlers/auth.ts`).
- Produces: `<Sidebar />` behavior and nav structure every page sits inside.

- [ ] **Step 1: Replace the nav group/item list to match main's `nav-items.ts` exactly**

In `sidebar.tsx`, replace `NAV_GROUPS` with main's exact section labels and item order:
```ts
const NAV_GROUPS: NavGroup[] = [
  { items: [{ label: "Dashboard", path: "/dashboard", icon: LayoutDashboard }] },
  { label: "Clinical", items: [
    { label: "Patients",    path: "/patients",   icon: Users,       permission: "patients:view" },
    { label: "Refraction",  path: "/workup",     icon: Eye,         permission: "workup:view" },
    { label: "Doctor",      path: "/doctor",     icon: Stethoscope, permission: "doctor:view" },
    { label: "In-Patients", path: "/inpatients", icon: BedDouble,   permission: "inpatients:view" },
  ]},
  { label: "Services", items: [
    { label: "Pharmacy",  path: "/pharmacy",  icon: Pill,         permission: "pharmacy:view" },
    { label: "Optical",   path: "/optical",   icon: Glasses,      permission: "optical:view" },
    { label: "Labs",      path: "/labs",      icon: FlaskConical, permission: "labs:view" },
    { label: "Call Logs", path: "/call-logs", icon: Phone },
  ]},
  { label: "Finance", items: [
    { label: "Insurance",          path: "/insurance",       icon: Shield,         permission: "insurance:view" },
    { label: "Dues & Follow-Ups",  path: "/dues-followups",  icon: ClipboardList,  permission: "dues:view" },
    { label: "Expenses",           path: "/expenses",        icon: Wallet,         permission: "expenses:view" },
  ]},
  { label: "Insights", items: [
    { label: "Analytics",      path: "/analytics",       icon: BarChart3,   permission: "reports:view" },
    { label: "Reports",        path: "/reports",         icon: FileBarChart, permission: "reports:view" },
    { label: "Data Export",    path: "/data",            icon: DatabaseZap, permission: "data:export" },
    { label: "Licenses",      path: "/license-tracker", icon: ScrollText, permission: "licenses:view" },
    { label: "Staff",          path: "/staff",           icon: UserCog,     permission: "staff:view" },
  ]},
]
```
Remove `queue:view`/`billing:view` permission references and the `Billing`/`Queue` nav items entirely — those routes are deleted in Task 4/5/6. Import the matching `lucide-react` icons (`Eye`, `BedDouble`, `Shield`, `ClipboardList`, `Phone`, `FileBarChart`, `DatabaseZap`, `ScrollText` — same set `nav-items.ts` imports).

- [ ] **Step 2: Replace the footer with main's "Configurations" link + user card**

Keep `SETTINGS_ITEM` but relabel it `"Configurations"` (not `"Settings"`) to match main's bottom link text exactly. Below it, render a user card: avatar with initials (reuse the existing `getInitials` pattern if one exists in `web/src/lib/utils.ts`, else add one matching main's), full name, role (lowercased, capitalized via CSS same as main: `capitalize` on a lowercased string), and a logout icon-button. Extract this into `web/src/components/layout/user-menu-card.tsx` taking `{ fullName: string; role: string }` props plus an `onLogout` callback.

- [ ] **Step 3: Implement main's hover-reveal overlay behavior**

Replace the current always-visible collapsible-rail behavior with main's: the sidebar is translated off-screen (`-translate-x-full`) by default, slides in (`translate-x-0`) when the mouse enters the sidebar's own hover area OR comes within ~6px of the left edge of the viewport (a `mousemove` listener checking `e.clientX <= 6`), and auto-hides 300ms after the mouse leaves the sidebar. Width is fixed `w-64` (not variable/collapsible) — drop the `collapsed`/`onCollapsedChange` prop API entirely along with the `ChevronLeft`/`ChevronRight` toggle button, matching main having no manual collapse toggle. Add a small mobile hamburger button (fixed top-left, `md:hidden`) that also calls the show function, matching main's mobile affordance.

- [ ] **Step 4: Update `app-shell.tsx` for the new Sidebar API and main's main-wrapper layout**

Since the sidebar now overlays rather than occupying permanent width, `app-shell.tsx`'s flex layout no longer needs to reserve space for it — `<main>` should fill the full width. Match main's wrapper classes: outer `<div className="h-screen overflow-hidden bg-[var(--color-background)] flex flex-col">` wrapping the content area, and the content padding should be `px-3 py-4 md:px-4 md:py-6 lg:px-6 lg:pt-6 lg:pb-8` (responsive) instead of each page's own flat `p-6`. Since every page currently self-applies `<main className="p-6 ...">`, either (a) move this padding up into `app-shell.tsx`'s wrapper and strip `p-6`/`p-X` from each page's own `<main>` tag in later tasks, or (b) note this as a follow-up sweep — pick (a) and list every page file needing the `p-6` strip as a checklist here so it isn't lost:

```
web/src/pages/DashboardPage.tsx, PatientCarePage.tsx (→ PatientsPage.tsx), InPatientsPage.tsx (new),
WorkupPage.tsx, DoctorPage.tsx, PharmacyPage.tsx, OpticalPage.tsx, LabsPage.tsx, InsurancePage.tsx,
StaffPage.tsx, SettingsPage.tsx, ExpensesPage.tsx, DuesFollowupsPage.tsx, CallLogsPage.tsx,
LicenseTrackerPage.tsx, AnalyticsPage.tsx, ReportsPage.tsx, DataExportPage.tsx (new)
```
(QueuePage and BillingPage are deleted in later tasks, so skip them here.)

- [ ] **Step 5: Wire logout**

Check `web/src/store/session.ts` for an existing logout/clear method; if present, call it from `user-menu-card.tsx`'s `onLogout` and navigate to `/login`. If absent, add a minimal `logout()` action to the session store that clears the in-memory session and calls whatever auth endpoint `web/src/mocks/handlers/auth.ts` defines for logout (check that file for the exact path/method first).

- [ ] **Step 6: Typecheck and build**

Run: `cd web && npm run typecheck && npm run build`

- [ ] **Step 7: Commit**

```bash
git add web/src/components/patterns/navigation/sidebar.tsx web/src/components/layout/app-shell.tsx web/src/components/layout/user-menu-card.tsx web/src/store/session.ts
git commit -m "fix: rework Sidebar + AppShell to match main's nav, hover-reveal behavior, and logout"
```

*(Padding strip from each page happens inline as each page is touched by its own task below — the dashboard task and every module task after this one should drop its page's own `p-6`/`p-X` wrapper class as part of that task's own edit, now that `app-shell.tsx` owns it.)*

---

## Task 3: Dashboard — match main's module grid exactly

**Files:**
- Modify: `web/src/pages/DashboardPage.tsx`
- Reference: `src/app/(hospital)/dashboard/DashboardClient.tsx` (main)

- [ ] **Step 1: Read main's `DashboardClient.tsx` in full** (`git show main:"src/app/(hospital)/dashboard/DashboardClient.tsx"`) to get the exact section list, item descriptions, `iconBg`/`iconColor` Tailwind classes per item, and the rotating-quote footer.

- [ ] **Step 2: Replace `DashboardPage.tsx`'s module grid** with main's 5 sections in order — Clinical (Patients, Refraction, Doctor Console, In-Patients), Services (Pharmacy, Optical, Labs), Finance (Insurance, Dues & Follow-Ups, Expenses), Insights (Analytics, Reports, Data Export, Licenses), Administration (Staff, Configurations) — using main's exact `label`/`description`/icon per item and matching `iconBg`/`iconColor` pairs (light-tinted background + saturated icon color per module, not the migrated app's current icon treatment).

- [ ] **Step 3: Port the rotating medical-quote footer** (the `quotes` array + interval-based `quoteIndex` state) verbatim from main.

- [ ] **Step 4: Strip the page's own `p-6` wrapper** per Task 2 Step 4 (padding now owned by `app-shell.tsx`).

- [ ] **Step 5: Typecheck and build.**

- [ ] **Step 6: Commit.**

```bash
git add web/src/pages/DashboardPage.tsx
git commit -m "fix: match Dashboard module grid and quote footer to main"
```

---

## Task 4: Split Patients into `/patients` (lightweight) + new `/inpatients` (full) to match main

**Files:**
- Modify: `web/src/pages/PatientCarePage.tsx` → rename to `web/src/pages/PatientsPage.tsx`
- Modify: `web/src/pages/patient-care/ipd-tab.tsx` (slim down to main's lightweight inline IPD table)
- Create: `web/src/pages/InPatientsPage.tsx`
- Create: `web/src/pages/inpatients/` directory — move the full admission-wizard content here (stat badges, 3-step wizard, detail page)
- Modify: `web/src/router.tsx` (rename `patients` route element, add `inpatients` route)
- Modify: `web/src/components/patterns/navigation/sidebar.tsx` (already has the `In-Patients` item from Task 2 — just confirm the path matches `/inpatients`)
- Reference: `src/app/(hospital)/patients/page.tsx` + `components/*.tsx`, `src/app/(hospital)/inpatients/page.tsx` + `components/*.tsx` (main)

- [ ] **Step 1: Read main's `PatientsPage.tsx` and `InPatientsPage.tsx` in full** to confirm the lightweight IPD table's exact columns (IP Number, Patient, Doctor(s), Operation, Admission, Status, Balance) versus the full page's stat badges (Admitted/Active/Discharge Ready) + full table + 3-step wizard (`Step1Patient`/`Step2Hospital`/`Step3Payment`) + `InPatientDetailPage`.

- [ ] **Step 2: Rename `PatientCarePage.tsx` → `PatientsPage.tsx`**, title → `"Patients"`, subtitle → `"Registration & management"`, rename the `TabsTrigger` `"OPD Patients"` → `"Out-Patients"` (keep internal tab `value`s as-is, only the visible label changes).

- [ ] **Step 3: Slim `patient-care/ipd-tab.tsx`** down to main's lightweight inline table only (IP Number, Patient, Doctor(s), Operation, Admission, Status, Balance) — remove the full admission-wizard trigger from this tab; it moves to the new page.

- [ ] **Step 4: Create `web/src/pages/InPatientsPage.tsx`** with main's stat badges (Admitted/Active/Discharge Ready), search, full table (same columns as the lightweight one plus whatever extra main's fuller page shows — confirm from source), row click → detail page/drawer, and the 3-step admission wizard. Move `web/src/pages/patient-care/inpatient-admission-form.tsx` into a new `web/src/pages/inpatients/` directory (`inpatient-admission-form.tsx`, split into `step-1-patient.tsx`/`step-2-hospital.tsx`/`step-3-payment.tsx` if main's three-step structure isn't already mirrored — check first, the migrated form may already be a single file covering all three steps internally, in which case just move the file and keep its internal structure).

- [ ] **Step 5: Add the route** in `router.tsx`: `{ path: "inpatients", element: <InPatientsPage /> }`, and keep `{ path: "patients", element: <PatientsPage /> }` (renamed from `PatientCarePage`). Add the lazy import for `InPatientsPage`.

- [ ] **Step 6: Strip `p-6` wrapper** from both pages per Task 2 Step 4.

- [ ] **Step 7: Typecheck and build.**

- [ ] **Step 8: Verify no stale references**

Run: `grep -rn "PatientCarePage" web/src --include="*.tsx" --include="*.ts"` — expected: no matches outside this task's own renamed file history (git mv, not a stray import left behind).

- [ ] **Step 9: Commit.**

```bash
git add web/src/pages/PatientsPage.tsx web/src/pages/patient-care web/src/pages/InPatientsPage.tsx web/src/pages/inpatients web/src/router.tsx
git commit -m "fix: split Patients into lightweight /patients + full /inpatients to match main"
```

---

## Task 5: Fold Billing into Patients, delete the standalone Billing page

**Files:**
- Delete: `web/src/pages/BillingPage.tsx`, `web/src/pages/billing/` (after step 1's triage)
- Modify: `web/src/pages/patient-care/patient-detail-panel.tsx` (add inline payment recording)
- Modify: `web/src/router.tsx` (remove `billing` route + lazy import)
- Modify: `web/src/components/patterns/navigation/sidebar.tsx` (confirm no `Billing` item remains — already removed in Task 2)
- Reference: `src/app/(hospital)/patients/components/PatientDetail.tsx` (main)

**Interfaces:**
- Consumes: `web/src/pages/billing/record-payment-form.tsx`'s existing mutation/hook logic (port the logic, not necessarily the file as-is).

- [ ] **Step 1: Triage `billing/daily-summary.tsx` and `billing/prescriptions-table.tsx`**

Check whether `web/src/pages/reports/billing-tab.tsx` (which does have a main counterpart, `reports/components/BillingTab.tsx`) already covers daily/summary billing reporting. Run:
```bash
diff <(git show main:"src/app/(hospital)/reports/components/BillingTab.tsx") web/src/pages/reports/billing-tab.tsx
```
If Reports' billing tab already has equivalent coverage, delete `billing/daily-summary.tsx` and `billing/prescriptions-table.tsx` as dead weight. If Reports' billing tab is missing something only present in these two files, port that missing piece into `reports/billing-tab.tsx` first, then delete.

- [ ] **Step 2: Port payment recording into `patient-care/patient-detail-panel.tsx`**

Read main's `PatientDetail.tsx` for the exact inline billing UI: billed prescriptions list, payment mode/amount recording, balance due display, receipt printing trigger. Port `billing/record-payment-form.tsx`'s mutation logic and `billing/prescription-detail-panel.tsx`'s prescription list rendering into `patient-detail-panel.tsx` as inline sections (not a separate route/sheet), matching main's single-page drawer layout.

- [ ] **Step 3: Delete `web/src/pages/BillingPage.tsx` and the `billing` route** in `router.tsx` (remove the lazy import and the `{ path: "billing", ... }` entry).

- [ ] **Step 4: Delete now-unused files** under `web/src/pages/billing/` (whatever remains after Steps 1–2 ported their logic elsewhere).

- [ ] **Step 5: Verify no stale references**

Run: `grep -rn "\"/billing\"\|BillingPage\|pages/billing" web/src --include="*.tsx" --include="*.ts"` — expected: no matches.

- [ ] **Step 6: Typecheck and build.**

- [ ] **Step 7: Commit.**

```bash
git add -A web/src/pages/billing web/src/pages/BillingPage.tsx web/src/pages/patient-care/patient-detail-panel.tsx web/src/pages/reports/billing-tab.tsx web/src/router.tsx
git commit -m "fix: fold standalone Billing page into Patients' inline payment recording, matching main"
```

---

## Task 6: Delete the standalone Queue page

**Files:**
- Delete: `web/src/pages/QueuePage.tsx`, `web/src/pages/queue/`
- Modify: `web/src/router.tsx` (remove `queue` route + lazy import)
- Modify: `web/src/pages/doctor/doctor-queue.tsx`, `web/src/pages/workup/workup-queue.tsx`, `web/src/pages/patient-care/opd-tab.tsx` (port any unique logic first)

- [ ] **Step 1: Diff for unique logic before deleting**

Compare `web/src/pages/queue/opd-queue-tab.tsx` against `web/src/pages/patient-care/opd-tab.tsx` — if `opd-queue-tab.tsx` has any realtime/websocket logic (`use-queue-realtime.ts`) not present in `opd-tab.tsx` that's actually needed (check whether main's `/patients` or `/doctor` pages poll/realtime-update their own queues — if main just does plain refetch-on-interval or manual refresh, do NOT port websocket realtime logic in, since that would itself be an invented feature beyond main's parity), decide based on what main actually does. Same check for `workup-queue-tab.tsx` vs `web/src/pages/workup/workup-queue.tsx`, and `inpatient-board-tab.tsx` vs `patient-care/ipd-tab.tsx` / the new `InPatientsPage.tsx` from Task 4.

- [ ] **Step 2: Delete `web/src/pages/QueuePage.tsx` and `web/src/pages/queue/`** entirely once Step 1 confirms nothing unique needs porting (or after porting what's needed).

- [ ] **Step 3: Remove the `queue` route** from `router.tsx` (lazy import + route entry) and the `queue:view` permission from `sidebar.tsx` if any reference remains.

- [ ] **Step 4: Verify no stale references**

Run: `grep -rn "\"/queue\"\|QueuePage\|pages/queue\|queue:view" web/src --include="*.tsx" --include="*.ts"` — expected: no matches.

- [ ] **Step 5: Typecheck and build.**

- [ ] **Step 6: Commit.**

```bash
git add -A web/src/pages/queue web/src/pages/QueuePage.tsx web/src/router.tsx
git commit -m "fix: delete fabricated standalone Queue page, not present in main"
```

---

## Task 7: Rework Doctor page to match main's queue-table-takeover IA

**Files:**
- Modify: `web/src/pages/DoctorPage.tsx`
- Create: `web/src/pages/doctor/doctor-queue-table.tsx` (replaces the sidebar-list `doctor-queue.tsx`)
- Modify: `web/src/pages/doctor/consultation-view.tsx` (add Tabs: "Workup Data" / "Prescription", History card, Save All)
- Reference: `src/app/(hospital)/doctor/page.tsx` + `components/*.tsx` (main)

- [ ] **Step 1: Read main's `DoctorPage.tsx` in full** for the exact queue-table-takeover layout: sticky header (refresh, in-queue count badge, Ask-Sitha toggle — skip porting the inline Sitha toggle itself since the global widget supersedes it, but DO port the rest of the header), filter bar (`DateNavigator` prev/next/today, `SearchInput` by name/ID/phone), a Columns customizer popover exposing the ~29-field show/hide list (Patient/Visit/Receipt/Actions groups), and a print-settings gear linking to `/settings?tab=print-config`. Row actions: quick-print (Zap icon) + full Print Receipts modal. Status badges mapping backend status → stage label (Optometrist/Doctor/Visited/Completed/Medical Only) with a colored dot.

- [ ] **Step 2: Build `doctor/doctor-queue-table.tsx`** as a `DataTable`-based replacement for the current fixed sidebar list, with the DateNavigator + SearchInput + Columns popover + print actions + status-stage badges from Step 1. Reuse existing `DataTable`/`DateNavigator`/`SearchInput`/column-picker patterns components already in `web/src/components/patterns/` if they exist (check `web/src/components/patterns/index.ts` for a column-picker or similar before building one from scratch).

- [ ] **Step 3: Rewrite `DoctorPage.tsx`'s layout** to be the queue-table (full width when no patient selected) that "takes over" into a two-column inline detail view when a row is clicked — left column: `BreadcrumbHeader` ("Doctor Console › {patient name}") + a `Tabs` wrapper with "Workup Data" (the editable `EyeReadingForm`, hidden if the refraction module is disabled) and "Prescription" tabs, with a single "Save All" button saving both tabs together; right column: a History card (past prescriptions + AR-reading summary). Drop the current fixed 260px sidebar entirely.

- [ ] **Step 4: Update `consultation-view.tsx`** to host the new Tabs ("Workup Data" pulling in `web/src/pages/workup/eye-reading-form.tsx`, "Prescription" keeping the existing `PrescriptionForm`), add the History card (past prescriptions list + AR-reading summary — check main's exact fields), and the combined "Save All" button replacing the current separate save flow. The existing `useAiContext` effect (setting Sitha's patient context) stays exactly as-is.

- [ ] **Step 5: Strip `p-6` wrapper** per Task 2 Step 4.

- [ ] **Step 6: Typecheck and build.**

- [ ] **Step 7: Commit.**

```bash
git add web/src/pages/DoctorPage.tsx web/src/pages/doctor
git commit -m "fix: rework Doctor page to match main's queue-table-takeover layout"
```

---

## Task 8: Rework Workup page to match main's "Refraction" layout

**Files:**
- Modify: `web/src/pages/WorkupPage.tsx`
- Modify: `web/src/pages/workup/workup-queue.tsx`
- Modify: `web/src/pages/workup/eye-reading-form.tsx` (confirm `SightTypePicker`-equivalent is present)
- Reference: `src/app/(hospital)/workup/page.tsx` + `components/*.tsx` (main)

- [ ] **Step 1: Read main's `WorkupPage.tsx`** for the exact title ("Refraction" / "Pre-consultation eye assessment with refraction and clinical findings" — confirm exact subtitle text from source), DateNavigator, SearchInput, stat badges (Total / Optometrist / Doctor / Completed), and the inline-takeover detail pattern (not a Sheet) combining `EyeReadingForm` + `SightTypePicker`.

- [ ] **Step 2: Rewrite `WorkupPage.tsx`'s title/subtitle** to match main exactly, add the 4 stat badges, add DateNavigator + SearchInput to the toolbar.

- [ ] **Step 3: Replace the current right-side Sheet detail** with an inline takeover (queue table replaced by the detail view in the same pane, same pattern as Doctor's Task 7), reusing `workup-queue.tsx` for the table and `eye-reading-form.tsx` for the detail.

- [ ] **Step 4: Confirm `SightTypePicker` is ported** — check `eye-reading-form.tsx` for an equivalent control; if genuinely absent, read main's `SightTypePicker.tsx` and add it as a small new component used inside `eye-reading-form.tsx`.

- [ ] **Step 5: Strip `p-6` wrapper** per Task 2 Step 4.

- [ ] **Step 6: Typecheck and build.**

- [ ] **Step 7: Commit.**

```bash
git add web/src/pages/WorkupPage.tsx web/src/pages/workup
git commit -m "fix: rework Workup page to match main's Refraction layout (stat badges, inline detail)"
```

---

## Task 9: Pharmacy — consolidate to main's 4 tabs

**Files:**
- Modify: `web/src/pages/PharmacyPage.tsx`
- Create: `web/src/pages/pharmacy/inventory-tab.tsx` (merge of `stock-tab.tsx` + `medicines-tab.tsx`)
- Delete: `web/src/pages/pharmacy/stock-tab.tsx`, `web/src/pages/pharmacy/medicines-tab.tsx` (after merge)
- Create: `web/src/components/patterns/status/stat-badge.tsx` (shared across Task 9/10/11/12 — build once here, reuse after)
- Reference: `src/app/(hospital)/pharmacy/page.tsx` + `components/*.tsx` (main)

- [ ] **Step 1: Build the shared `StatBadge` pattern component** (`web/src/components/patterns/status/stat-badge.tsx`): small pill showing a value + label with a variant color (`destructive`/`warning`/`info`/`default`), matching main's header stat badges across Pharmacy/Optical/Labs/Insurance. Export it from `web/src/components/patterns/index.ts`.

- [ ] **Step 2: Read main's `PharmacyPage.tsx` and `InventoryTab.tsx`** for the exact 4-tab order (`Billing`, `Inventory`, `Suppliers`, `Purchase Orders`, default `Billing`) and the Inventory tab's two-stacked-table layout (medicine-master CRUD: name, generic, manufacturer, category, strength, HSN, GST%, unit, schedule — plus stock/batch entry: batch, expiry, qty, MRP, purchase price, supplier — plus a shelf-check print view).

- [ ] **Step 3: Create `pharmacy/inventory-tab.tsx`** combining `stock-tab.tsx` + `medicines-tab.tsx`'s content into the two-stacked-table layout under one tab, keeping every field from both originals (don't drop fields during the merge — cross-check against the Step 2 field list).

- [ ] **Step 4: Rewrite `PharmacyPage.tsx`'s tab list** to exactly `Billing, Inventory, Suppliers, Purchase Orders` in that order, default `billing`, and add the header `StatBadge` row (Low Stock / Near Expiry / Items in Stock) wired to the existing summary hook in `pharmacy/hooks.ts`.

- [ ] **Step 5: Delete `stock-tab.tsx` and `medicines-tab.tsx`** once their content is fully merged into `inventory-tab.tsx`.

- [ ] **Step 6: Strip `p-6` wrapper** per Task 2 Step 4.

- [ ] **Step 7: Typecheck and build.**

- [ ] **Step 8: Commit.**

```bash
git add web/src/pages/PharmacyPage.tsx web/src/pages/pharmacy web/src/components/patterns/status/stat-badge.tsx web/src/components/patterns/index.ts
git commit -m "fix: consolidate Pharmacy to main's 4 tabs, add stat badges"
```

---

## Task 10: Optical — consolidate to main's 3 tabs

**Files:**
- Modify: `web/src/pages/OpticalPage.tsx`
- Create: `web/src/pages/optical/inventory-tab.tsx` (merge of `products-tab.tsx` + `stock-tab.tsx`)
- Delete: `web/src/pages/optical/products-tab.tsx`, `web/src/pages/optical/stock-tab.tsx` (after merge)
- Rename: `web/src/pages/optical/bills-tab.tsx` label → "Billing"; `web/src/pages/optical/settings-tab.tsx` label → "Configuration"
- Reference: `src/app/(hospital)/optical/page.tsx` + `components/*.tsx` (main)

**Interfaces:**
- Consumes: `web/src/components/patterns/status/stat-badge.tsx` (Task 9).

- [ ] **Step 1: Read main's `OpticalPage.tsx` and `InventoryTab.tsx`** for the exact 3-tab order (`Billing`, `Inventory`, `Configuration`, default `Billing`) and the combined Inventory tab's field list (frames/lenses/contact-lens stock in one tab).

- [ ] **Step 2: Create `optical/inventory-tab.tsx`** merging `products-tab.tsx` + `stock-tab.tsx`, preserving every field from both.

- [ ] **Step 3: Rewrite `OpticalPage.tsx`'s tab list** to `Billing, Inventory, Configuration` in that order, default `billing`, rename the `bills-tab.tsx` trigger label to `"Billing"` and `settings-tab.tsx` trigger label to `"Configuration"`, add the header `StatBadge` row (Low Stock / Items in Stock).

- [ ] **Step 4: Delete `products-tab.tsx` and `stock-tab.tsx`** once merged.

- [ ] **Step 5: Strip `p-6` wrapper** per Task 2 Step 4.

- [ ] **Step 6: Typecheck and build.**

- [ ] **Step 7: Commit.**

```bash
git add web/src/pages/OpticalPage.tsx web/src/pages/optical
git commit -m "fix: consolidate Optical to main's 3 tabs, add stat badges"
```

---

## Task 11: Labs — consolidate to main's 2 tabs

**Files:**
- Modify: `web/src/pages/LabsPage.tsx`
- Create: `web/src/pages/labs/billing-tab.tsx` (merge of `bills-tab.tsx` + `pending-tab.tsx`)
- Create: `web/src/pages/labs/config-tab.tsx` (merge of `labs-tab.tsx` + `investigations-tab.tsx`)
- Delete: `web/src/pages/labs/bills-tab.tsx`, `pending-tab.tsx`, `labs-tab.tsx`, `investigations-tab.tsx` (after merges)
- Reference: `src/app/(hospital)/labs/page.tsx` + `components/*.tsx` (main)

**Interfaces:**
- Consumes: `web/src/components/patterns/status/stat-badge.tsx` (Task 9).

- [ ] **Step 1: Read main's `LabsPage.tsx`, `LabBillingTab.tsx`, `LabConfigTab.tsx`** for the exact 2-tab labels (`"Lab Billing & History"`, `"Lab Configuration"`, default the billing tab) and each tab's combined field list.

- [ ] **Step 2: Create `labs/billing-tab.tsx`** merging `bills-tab.tsx` + `pending-tab.tsx` into main's single billing+history view.

- [ ] **Step 3: Create `labs/config-tab.tsx`** merging `labs-tab.tsx` + `investigations-tab.tsx` into main's single configuration view.

- [ ] **Step 4: Rewrite `LabsPage.tsx`'s tab list** to exactly 2 tabs with main's exact labels, add the header `StatBadge` (Active Labs).

- [ ] **Step 5: Delete the 4 now-merged original tab files.**

- [ ] **Step 6: Strip `p-6` wrapper** per Task 2 Step 4.

- [ ] **Step 7: Typecheck and build.**

- [ ] **Step 8: Commit.**

```bash
git add web/src/pages/LabsPage.tsx web/src/pages/labs
git commit -m "fix: consolidate Labs to main's 2 tabs (Billing & History, Configuration)"
```

---

## Task 12: Insurance — remove invented tab structure

**Files:**
- Modify: `web/src/pages/InsurancePage.tsx` (remove `Tabs`/`TabsList` wrapper)
- Modify: `web/src/pages/insurance/claims-tab.tsx` (add stat badges + search; render directly as page body)
- Modify: `web/src/pages/insurance/companies-tab.tsx` (convert to modal/Sheet content, triggered from claims-tab's toolbar)
- Reference: `src/app/(hospital)/insurance/page.tsx` + `components/*.tsx` (main)

**Interfaces:**
- Consumes: `web/src/components/patterns/status/stat-badge.tsx` (Task 9).

- [ ] **Step 1: Read main's `InsurancePage.tsx`** for the exact header (3 `StatBadge`s: Active / Preauth Pending / Awaiting Settlement), toolbar (search input + status-filter pill buttons + Refresh + "Companies" button opening a modal + "+ New Claim" button), and the 10-column claims table (Claim No, Patient/IP, Insurance Company, Total Claimed, Preauth, Enhancement, Total Approved, Settled, Patient Due, Status).

- [ ] **Step 2: Remove `InsurancePage.tsx`'s `Tabs`/`TabsList` wrapper**, rendering `claims-tab.tsx`'s content directly as the page body (no tab switching).

- [ ] **Step 3: Add the 3 stat badges + search input to `claims-tab.tsx`'s toolbar**, alongside the existing status filter (keep as a dropdown for now unless time allows converting to pill buttons — note either is acceptable, pill buttons are main's exact look but functional parity matters more here).

- [ ] **Step 4: Convert `companies-tab.tsx` into modal/Sheet content** triggered by a "Companies" button added to `claims-tab.tsx`'s toolbar — delete its `TabsContent` registration, keep the component's internal table (Company Name, TPA, Contact, Status) as-is.

- [ ] **Step 5: Verify `claim-detail-panel.tsx` renders full-page** (breadcrumb back-nav replacing the list), not as a side sheet — check its current mount point in `InsurancePage.tsx`/`claims-tab.tsx` and convert if it's currently a Sheet/Dialog.

- [ ] **Step 6: Strip `p-6` wrapper** per Task 2 Step 4.

- [ ] **Step 7: Typecheck and build.**

- [ ] **Step 8: Commit.**

```bash
git add web/src/pages/InsurancePage.tsx web/src/pages/insurance
git commit -m "fix: remove invented Insurance tabs, match main's single-list + modal pattern"
```

---

## Task 13: Dues & Follow-Ups — label fixes

**Files:**
- Modify: `web/src/pages/DuesFollowupsPage.tsx` (line ~52: `"Follow-ups"` → `"Follow-Ups"`)
- Modify: `web/src/pages/dues-followups/followups-tab.tsx` (line ~143: column header `"Notes"` → `"Additional Notes"`)

- [ ] **Step 1: Fix the tab label casing** in `DuesFollowupsPage.tsx`: `"Follow-ups"` → `"Follow-Ups"`.

- [ ] **Step 2: Fix the column header** in `followups-tab.tsx`: `"Notes"` → `"Additional Notes"`.

- [ ] **Step 3: Strip `p-6` wrapper** per Task 2 Step 4.

- [ ] **Step 4: Typecheck and build.**

- [ ] **Step 5: Commit.**

```bash
git add web/src/pages/DuesFollowupsPage.tsx web/src/pages/dues-followups/followups-tab.tsx
git commit -m "fix: correct Dues & Follow-Ups tab/column labels to match main"
```

---

## Task 14: Call Logs and Expenses — visual-skin pass only

**Files:**
- Modify: `web/src/pages/CallLogsPage.tsx`, `web/src/pages/ExpensesPage.tsx` (and their sub-files, only to strip `p-6` wrapper and pick up Task 1's reverted primitives — no structural change, both already match main)

- [ ] **Step 1: Strip `p-6` wrapper** from both pages per Task 2 Step 4.

- [ ] **Step 2: Visually spot-check** both pages after Task 1's primitive revert lands — no action needed if `Card`/`Table`/`Button` already look right from Task 1's global change.

- [ ] **Step 3: Typecheck and build.**

- [ ] **Step 4: Commit.**

```bash
git add web/src/pages/CallLogsPage.tsx web/src/pages/ExpensesPage.tsx
git commit -m "chore: strip page-level padding from Call Logs and Expenses (now owned by AppShell)"
```

---

## Task 15: Analytics — visual-skin pass (filter pills, sticky header)

**Files:**
- Modify: `web/src/pages/AnalyticsPage.tsx`

- [ ] **Step 1: Read main's `AnalyticsPage.tsx` header** — a sticky white bar with pill-style filter buttons (Today/Week/Month/Year/Custom) instead of a `SingleSelect` dropdown, and underline-style tabs.

- [ ] **Step 2: Replace the `SingleSelect` filter** in `AnalyticsPage.tsx`'s `PageHeader.toolbar` with a pill-button group (reuse `SegmentedControl` if it supports 5 options cleanly, else a simple button row) matching main's filter pills, keeping the `DateRangePicker` for the Custom option as-is.

- [ ] **Step 3: Strip `p-6` wrapper** per Task 2 Step 4.

- [ ] **Step 4: Typecheck and build.**

- [ ] **Step 5: Commit.**

```bash
git add web/src/pages/AnalyticsPage.tsx
git commit -m "fix: switch Analytics filter from dropdown to pill buttons, matching main"
```

---

## Task 16: Split Data Export out of Reports into its own page

**Files:**
- Modify: `web/src/pages/ReportsPage.tsx` (remove the "Bulk Data Export" section)
- Create: `web/src/pages/DataExportPage.tsx`
- Move: `web/src/pages/reports/export-section.tsx` (+ its hooks/types) → `web/src/pages/data-export/`
- Modify: `web/src/router.tsx` (add `data` route + lazy import)
- Modify: `web/src/components/patterns/navigation/sidebar.tsx` (confirm `Data Export` item from Task 2 points at `/data`)
- Reference: `src/app/(hospital)/reports/page.tsx`, `src/app/(hospital)/data/page.tsx` + `components/DataExportPage.tsx` (main)

- [ ] **Step 1: Read main's `DataExportPage.tsx`** for the exact 9 export-type tab strip (Patients, Prescriptions, Eye Readings, In-Patients, Insurance, Lab Bills, Pharmacy Bills, Optical Bills, Expenses), each with column-level CSV/Excel export, search, date range, checkbox column picker.

- [ ] **Step 2: Move `web/src/pages/reports/export-section.tsx`** (and any dedicated hooks/types it uses) into a new `web/src/pages/data-export/` directory, expanding it if needed to cover all 9 export types main has (confirm the migrated version already covers all 9 — if it only covers a subset, port the missing export types' logic from main, which likely shares a generic "pick columns, pick date range, export CSV/Excel" pattern across types).

- [ ] **Step 3: Create `web/src/pages/DataExportPage.tsx`** rendering the moved content as its own page (title "Data Export" matching main).

- [ ] **Step 4: Remove the Bulk Data Export section from `ReportsPage.tsx`** — Reports keeps only its original 5 tabs (Visits, Prescriptions, Inpatient, Lab Records, Billing & Dues).

- [ ] **Step 5: Add the route** in `router.tsx`: lazy import `DataExportPage`, `{ path: "data", element: <DataExportPage /> }`.

- [ ] **Step 6: Strip `p-6` wrapper** from both pages per Task 2 Step 4.

- [ ] **Step 7: Typecheck and build.**

- [ ] **Step 8: Commit.**

```bash
git add web/src/pages/ReportsPage.tsx web/src/pages/DataExportPage.tsx web/src/pages/data-export web/src/router.tsx
git commit -m "fix: split Data Export into its own page, matching main's separate /data route"
```

---

## Task 17: License Tracker and Staff — confirm/minor fixes only

**Files:**
- Modify: `web/src/pages/StaffPage.tsx` (confirm title "Staff Management"; tab labels "Staff Members"/"Roles & Permissions")
- Modify: `web/src/pages/LicenseTrackerPage.tsx` (strip `p-6` wrapper only)

- [ ] **Step 1: Confirm `StaffPage.tsx`'s title is exactly `"Staff Management"`** and its two `TabsTrigger` labels are exactly `"Staff Members"` and `"Roles & Permissions"` (internal `value` props can stay as `"members"`/`"roles"` — only the visible label text must match main).

- [ ] **Step 2: Strip `p-6` wrapper** from both pages per Task 2 Step 4.

- [ ] **Step 3: Typecheck and build.**

- [ ] **Step 4: Commit.**

```bash
git add web/src/pages/StaffPage.tsx web/src/pages/LicenseTrackerPage.tsx
git commit -m "chore: confirm Staff/License Tracker copy matches main, strip page padding"
```

---

## Task 18: Settings — flatten tabs to main's exact 9, add Users, remove Inpatient Templates

**Files:**
- Modify: `web/src/pages/SettingsPage.tsx` (flatten grouped tabs to one flat pill row, URL-synced tab state)
- Delete: `web/src/pages/settings/inpatient-templates-section.tsx` (after confirming no other call site needs its hook)
- Rename: `web/src/pages/settings/medicine-master-section.tsx` tab label → "Medicine Templates"
- Create: `web/src/pages/settings/users-section.tsx`
- Reference: `src/app/(hospital)/settings/page.tsx` + `components/*.tsx` (main)

- [ ] **Step 1: Read main's `SettingsPage.tsx`** for the exact flat 9-tab order: Service Templates, Prescription Templates, Medicine Templates, IPD Packages, Predefined Surgeries, Discharge Templates, Hospital Profile, Print Defaults, Users — pill-style tab bar, no grouping, tab state synced to `?tab=` query param. Also read main's `UsersTab` (whatever file defines it — search `src/app/(hospital)/settings/components/` or inline in `SettingsPage.tsx`) for its exact field list (name/email/role/department/status, Add User button, active/inactive toggle).

- [ ] **Step 2: Check for other call sites of the "Inpatient Templates" hook** before deleting

Run: `grep -rn "inpatientTemplate\|InpatientTemplate" web/src --include="*.tsx" --include="*.ts" | grep -v "settings/inpatient-templates-section"`. If `InPatientDetailPage`'s (or its migrated equivalent, the inpatients admission form from Task 4) template-picker dropdown uses this hook, keep the hook/query function but delete only the Settings UI tab and its section file — the data-fetching logic stays alive for that other consumer.

- [ ] **Step 3: Delete the "Inpatient Templates" tab** from `SettingsPage.tsx` and delete `settings/inpatient-templates-section.tsx` (keeping the underlying hook per Step 2 if still needed elsewhere).

- [ ] **Step 4: Rename "Medicine Master" → "Medicine Templates"** — update the `TabsTrigger` label in `SettingsPage.tsx` (file name `medicine-master-section.tsx` can stay as-is, only the visible label changes, to minimize churn).

- [ ] **Step 5: Create `settings/users-section.tsx`** — a simple user list (name/email/role/department/status table) + "Add User" button + active/inactive toggle, matching main's `UsersTab` exactly. This is distinct from the full Staff Members CRUD on `/staff` — keep it simple, matching main's simpler surface (confirm this distinction from main's source, don't just copy Staff's roles-tab).

- [ ] **Step 6: Flatten the tab bar** — remove the "Templates"/"Master Data"/"Hospital Setup" visual grouping, render one flat pill row in main's exact order: Service Templates, Prescription Templates, Medicine Templates, IPD Packages, Predefined Surgeries, Discharge Templates, Hospital Profile, Print Defaults, Users. Sync the active tab to a `?tab=` URL query param (read via `useSearchParams` from `react-router-dom`) matching main's URL-synced behavior.

- [ ] **Step 7: Strip `p-6` wrapper** per Task 2 Step 4.

- [ ] **Step 8: Typecheck and build.**

- [ ] **Step 9: Commit.**

```bash
git add web/src/pages/SettingsPage.tsx web/src/pages/settings
git commit -m "fix: flatten Settings tabs to main's exact 9 (add Users, remove Inpatient Templates)"
```

---

## Task 19: Add the missing Unauthorized page

**Files:**
- Create: `web/src/pages/UnauthorizedPage.tsx`
- Modify: `web/src/router.tsx` (add `unauthorized` route + lazy import)
- Reference: `src/app/(hospital)/unauthorized/page.tsx` (main)

- [ ] **Step 1: Read main's `unauthorized/page.tsx`** for its exact copy and layout (likely a simple centered "Access denied" / "This module is not enabled for your hospital" message with a link back to Dashboard).

- [ ] **Step 2: Create `UnauthorizedPage.tsx`** matching main's copy/layout, add the route in `router.tsx`.

- [ ] **Step 3: Typecheck and build.**

- [ ] **Step 4: Commit.**

```bash
git add web/src/pages/UnauthorizedPage.tsx web/src/router.tsx
git commit -m "feat: add Unauthorized page, matching main's /unauthorized route"
```

---

## Task 20: Whole-branch verification sweep

**Files:** none new — verification only.

- [ ] **Step 1: Full typecheck, lint, build**

```bash
cd web && npm run typecheck && npm run lint && npm run build
```

- [ ] **Step 2: Route/nav parity check**

```bash
grep -oP '(?<=path: ")[a-z-]+' web/src/router.tsx | sort
```
Compare the output against main's full route list (`/dashboard /patients /inpatients /workup /doctor /pharmacy /optical /labs /call-logs /insurance /dues-followups /expenses /analytics /reports /data /license-tracker /staff /settings /unauthorized /login`) — expected: identical sets (order doesn't matter), no `/queue`, no `/billing`.

- [ ] **Step 3: Dead-reference sweep**

```bash
grep -rn "QueuePage\|BillingPage\|PatientCarePage\|queue:view\|billing:view" web/src --include="*.tsx" --include="*.ts"
```
Expected: no matches.

- [ ] **Step 4: LoginPage untouched sanity check**

```bash
git diff main..HEAD -- web/src/pages/LoginPage.tsx
```
(This compares against main, which never had this file — expected to show the whole file as "added," which is fine; the real check is confirming `git log --oneline -- web/src/pages/LoginPage.tsx` shows no new commits from this plan's tasks.)

- [ ] **Step 5: Report to the person running this plan**

Summarize what changed, what was deleted, and flag the one open call from Review Focus (the hover-reveal Sidebar's discoverability trade-off) explicitly, since it's a user-facing behavior change worth a conscious yes/no even though it was executed per main's actual behavior.
