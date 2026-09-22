# Phase 6 — Scaffold Frontend (React + Vite SPA)

**Date:** 2026-09-22
**Author:** Frontend Agent (SDE-5)
**Status:** Complete
**Build result:** PASS — `npm run build` exits 0 in `web/`
**Test harness:** PASS — `npm run test` exits 0 with zero test files (passWithNoTests: true)

---

## 1. What Was Created

### 1.1 Project root (`web/`)

| File | Purpose |
|---|---|
| `package.json` | React 19.2.3, react-router-dom 6.26, @tanstack/react-query 5.59, Zustand 5, RHF 7, Zod 4, Tailwind 4 — versions locked to Phase 3 spec |
| `vite.config.ts` | Vite 5 + @vitejs/plugin-react + @tailwindcss/vite (Tailwind 4 Vite integration) + vitest inline config with passWithNoTests |
| `tsconfig.json` | References tsconfig.app.json and tsconfig.node.json |
| `tsconfig.app.json` | Strict TypeScript, ESNext module, @/* path alias → ./src/* |
| `tsconfig.node.json` | Config for vite.config.ts and playwright.config.ts |
| `index.html` | SPA entry point, mounts #root |
| `.env.example` | VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_API_BASE_URL |
| `playwright.config.ts` | Playwright config, e2e/ directory, chromium project |
| `postcss.config.mjs` | Empty PostCSS config that shadows the parent directory's config (required because @tailwindcss/vite handles Tailwind processing — PostCSS is not needed) |

### 1.2 Source files (`web/src/`)

**Infrastructure**
- `vite-env.d.ts` — `/// <reference types="vite/client" />` for ImportMeta.env
- `index.css` — Tailwind 4 `@import "tailwindcss"` + `@theme {}` block with all CSS variables from globals.css, animations, and utility classes
- `main.tsx` — ReactDOM.createRoot, QueryClientProvider, AppRouter, Toaster
- `router.tsx` — createBrowserRouter with ProtectedRoute wrapper + all 19 routes
- `store/session.ts` — Zustand session store (user, isAuthenticated, setUser, clearSession)
- `lib/utils.ts` — cn(), formatDate(), formatCurrency(), todayISO(), etc.
- `lib/api-client.ts` — fetch wrapper: base URL env, credentials: 'include', envelope unwrapping, 401 → refresh → retry → /login redirect
- `lib/query-client.ts` — QueryClient: 5-min staleTime, no retry on ApiError
- `hooks/usePermissions.ts` — can(), canAny(), canAll() — ADMIN role bypasses all checks
- `hooks/usePaginatedQuery.ts` — usePaginatedQuery (offset) + useCursorQuery (cursor/infinite)
- `test/setup.ts` — @testing-library/jest-dom import

---

## 2. Routes (19 total = 18 modules + login)

| Route | Component | Notes |
|---|---|---|
| `/login` | LoginPage | Public — no ProtectedRoute |
| `/dashboard` | DashboardPage | GET /dashboard/summary + /quick-stats |
| `/patients` | PatientCarePage | Merged patients + inpatients (patient-care module) |
| `/billing` | BillingPage | billing module |
| `/pharmacy` | PharmacyPage | pharmacy module |
| `/labs` | LabsPage | labs module |
| `/optical` | OpticalPage | optical module |
| `/insurance` | InsurancePage | insurance module |
| `/queue` | QueuePage | queue module + Supabase Realtime |
| `/doctor` | DoctorPage | doctor module |
| `/workup` | WorkupPage | workup module |
| `/staff` | StaffPage | staff module |
| `/settings` | SettingsPage | settings module (33 endpoints) |
| `/expenses` | ExpensesPage | expenses module |
| `/dues-followups` | DuesFollowupsPage | dues-followups module |
| `/call-logs` | CallLogsPage | call-logs module |
| `/license-tracker` | LicenseTrackerPage | license-tracker module |
| `/analytics` | AnalyticsPage | analytics module (19 endpoints) |
| `/reports` | ReportsPage | reports module (17 endpoints) |

Root `/` redirects to `/dashboard`. Unknown paths redirect to `/dashboard`. All routes except `/login` are wrapped in ProtectedRoute (redirects to `/login` if `isAuthenticated` is false in the Zustand store).

All page components are lazy-loaded via `React.lazy()` for route-level code splitting.

---

## 3. Tier 1 Primitives Port

All 25 files from `src/components/ui/*.tsx` were examined for Next.js imports before porting.

**Files with no Next.js imports (copied as-is, 24 files):**
alert-dialog, avatar, badge, button, card, checkbox, combobox, command, dialog, dropdown-menu, input, label, popover, radio-group, scroll-area, select, separator, sheet, skeleton, switch, table, tabs, textarea, tooltip

**Files requiring adaptation (1 file):**
- `sonner.tsx` — imported `useTheme` from `next-themes`. Adapted: removed the import, defaulted `theme` to `"system"` (passed as a prop with default, so callers can override). Component logic unchanged; only the import adaptation was made. The `"use client"` directive was left as a harmless string literal (standard practice in framework-agnostic React components).

No component logic was changed. The `@/lib/utils` and `@/components/ui/*` imports in all components resolve correctly via the `@` alias configured in `tsconfig.app.json` and `vite.config.ts`.

---

## 4. Tier 2 Pattern Components (`web/src/components/patterns/`)

All four patterns are real, working implementations — not stubs.

| Component | File | What it does |
|---|---|---|
| `DataModal` | `DataModal.tsx` | Sheet or Dialog wrapper driven by a TanStack Query `UseQueryResult`. Owns loading skeleton, ErrorState, and EmptyState. Content rendered via render prop `children(data)` — only called when data is non-null. Variants: sheet (default, slides right) and dialog (centered). |
| `PaginatedDataTable` | `PaginatedDataTable.tsx` | Wraps Tier 1 Table. Accepts `OffsetPaginationResult` from `usePaginatedQuery`. Owns loading skeleton rows, EmptyState, ErrorState, and pagination controls (prev/next, page-size selector, `x–y of total` counter). Column definition via `ColumnDef<TRow>[]`. |
| `FormSection` + `FormFieldRow` | `FormSection.tsx` | `FormSection` is a `<fieldset>` wrapper with optional title/description legend. `FormFieldRow` wraps label + input + RHF error message in consistent spacing. Both work with or without `useFormContext`. |
| `EmptyState` | `EmptyState.tsx` | Centered empty state: optional icon, heading, description, optional CTA button. `role="status"` for accessibility. |
| `ErrorState` | `ErrorState.tsx` | Centered error display: AlertTriangle icon, "Something went wrong" heading, error message extraction (`Error.message` or string), optional retry button. `role="alert"` for screen-reader announcement. |

Supporting hook:
- `usePaginatedQuery` — offset pagination (keepPreviousData, page/pageSize state)
- `useCursorQuery` — cursor/infinite pagination (useInfiniteQuery, flat data array)

---

## 5. Build Result

```
vite v5.4.21 building for production...
✓ 1821 modules transformed.
✓ built in 1.02s

19 JS chunks (one per lazy page + one shared vendor bundle)
CSS bundle: 40.70 kB (7.96 kB gzip)
Main bundle: 358.58 kB (111.15 kB gzip)
```

Exit code: **0**

## 6. Test Harness Result

```
vitest run v2.1.9
No test files found, exiting with code 0
```

Exit code: **0** (passWithNoTests: true)

---

## 7. What Was NOT Modified

- Nothing under `src/**` was touched. The old Next.js app is completely untouched.
- No `.sde/` files were modified except this new file.
- The parent project's `package.json`, `tsconfig.json`, and all other config files are unchanged.
