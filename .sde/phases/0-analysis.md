# Phase 0: Codebase Analysis
**Project:** docsile-hms — Hospital Management System  
**Analysis Date:** 2026-09-21  
**Analyst:** Staff Software Architect (SDE-5)  
**Codebase Size:** ~60,000 LOC

---

## 1. Tech Stack (Auto-Detected)

| Category | Technology | Version | Source |
|---|---|---|---|
| Framework | Next.js App Router | 16.1.6 | package.json |
| Runtime | Node.js | (Vercel managed) | infra |
| Language | TypeScript (strict) | ^5 | tsconfig.json |
| React | React 19 | 19.2.3 | package.json |
| Database | Supabase (Postgres) | hosted | admin-client.ts |
| DB Access | supabase-js (direct) | 2.99.1 | package.json |
| ORM | None | — | — |
| Auth | Custom JWT + HTTP cookie | jose 6.2.1 | src/lib/jwt.ts |
| Password Hashing | bcryptjs | ^3.0.3 | package.json |
| Client State | Zustand | ^5.0.11 | package.json |
| Server State | None (no React Query/SWR) | — | codebase scan |
| Forms | React Hook Form + Zod | 7.71.1 / 4.3.6 | package.json |
| UI Components | Radix UI + shadcn/ui | various | package.json |
| Styling | Tailwind CSS 4 + CVA | ^4 | package.json |
| Charts | Recharts | ^3.7.0 | package.json |
| Dev Build | Turbopack | (Next built-in) | package.json scripts |
| Testing | None | — | no config files |
| CI/CD | None | — | no .github/ |
| Infra | Vercel + Supabase hosted | — | vercel.json |
| AI | Gemini REST API | 2.5-flash-lite | src/lib/ai/gemini.ts |
| External Integration | Exotel (call logs) | — | src/app/api/exotel/ |

---

## 2. Directory Structure

```
docsile-hms/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── login/
│   │   │       ├── actions.ts         ← Server action: loginAction
│   │   │       ├── login-form.tsx     ← Client form component
│   │   │       └── page.tsx
│   │   ├── (hospital)/
│   │   │   ├── layout.tsx             ← Auth gate + hospital config fetch per render
│   │   │   ├── analytics/
│   │   │   ├── call-logs/
│   │   │   ├── dashboard/
│   │   │   ├── data/
│   │   │   ├── doctor/
│   │   │   ├── dues-followups/
│   │   │   ├── expenses/
│   │   │   ├── inpatients/
│   │   │   ├── insurance/
│   │   │   ├── labs/
│   │   │   ├── license-tracker/
│   │   │   ├── optical/
│   │   │   ├── patients/
│   │   │   ├── pharmacy/
│   │   │   ├── reports/
│   │   │   ├── settings/
│   │   │   ├── staff/
│   │   │   ├── workup/
│   │   │   └── _module-disabled/
│   │   │
│   │   │   [Each module follows the same shape:]
│   │   │   [  page.tsx → components/<Module>Page.tsx (client) → actions.ts (server)]
│   │   │
│   │   └── api/
│   │       ├── exotel/webhook/route.ts   ← Exotel call-log ingestion
│   │       └── logout/route.ts           ← Cookie-delete logout
│   ├── components/
│   │   ├── layout/            ← Sidebar, TopNavBar, BillingBanner, etc.
│   │   ├── receipts/          ← Print receipt components
│   │   └── ui/                ← shadcn/ui primitives (Radix wrappers)
│   ├── contexts/
│   │   └── UserContext.tsx    ← User context provider (from JWT payload)
│   ├── hooks/
│   │   └── usePermissions.ts  ← Client-side permission hook (correctly checks, but server doesn't)
│   └── lib/
│       ├── admin-client.ts    ← Static config (admin-server integration DISABLED)
│       ├── auth.ts            ← JWT session helpers (requireServerPermission DISABLED)
│       ├── db.ts              ← Hospital profile cache (unstable_cache + React cache)
│       ├── jwt.ts             ← JWT sign/verify (HARDCODED FALLBACK SECRET)
│       ├── permissions.ts     ← Permission definitions (ALL CHECKS DISABLED)
│       ├── supabase/
│       │   ├── server.ts      ← Service role key client (bypasses RLS)
│       │   └── client.ts      ← Anon key client (browser only, used in 1 file)
│       ├── ai/gemini.ts       ← Gemini REST wrapper
│       └── [utilities]
├── scripts/                   ← One-off migration scripts (tsx runner)
├── vercel.json                ← SPA rewrite rules (INCORRECT for Next.js SSR)
├── package.json
├── tsconfig.json
├── next.config.ts             ← Effectively empty (no security headers, no custom config)
└── eslint.config.mjs          ← next/core-web-vitals + next/typescript
```

---

## 3. Architecture Pattern

**Pattern: Route-Group-Per-Module Monolith**

The application is a single Next.js App Router deployment, structured as a monolith with 18 functional modules inside the `(hospital)` route group. Each module is effectively a bounded context with:
- A server page component (`page.tsx`)
- A client "page" component inside `components/<Module>Page.tsx`
- A server actions file (`actions.ts`) that owns all DB queries for that module

This pattern is appropriate for the team size and scale target. The monolith is not yet a candidate for microservices decomposition.

**Weakness: Module Boundaries Are Porous**

Cross-module import analysis found 10 direct cross-boundary imports. The most problematic:

| Importing File (Module) | Imported From (Module) | What |
|---|---|---|
| `pharmacy/BillingTab.tsx` | `inpatients/actions` | `getHospitalProfileForReceipts` |
| `pharmacy/InventoryTab.tsx` | `inpatients/actions` | `getHospitalProfileForReceipts` |
| `inpatients/InPatientDetailPage.tsx` | `doctor/actions` | `getMedicineMaster` |
| `inpatients/InPatientDetailPage.tsx` | `settings/actions` | `getInpatientTemplates`, `getPredefinedDischarges` |
| `inpatients/InPatientsPage.tsx` | `doctor/components` | `AskSithaAI` component |
| `inpatients/Step1Patient.tsx` | `patients/actions` | `searchExistingPatients` |
| `settings/SettingsPage.tsx` | `patients/actions` | `getDropdownOptions`, `addDropdownOption` |
| `doctor/ai-actions.ts` | `analytics/actions` | analytics data for AI context |
| `patients/PatientsPage.tsx` | `inpatients/actions` | inpatient admission form data |
| `patients/PatientsPage.tsx` | `inpatients/components` | `InPatientAdmissionForm`, `InPatientStatusBadge`, `InPatientDetailPage` |

**Conclusion:** The `patients` and `inpatients` modules are tightly coupled — they are effectively one module split across two directories. The `doctor` module bleeds into `inpatients`. Shared functionality (hospital profile fetching, dropdown options, AI) needs to be lifted to `src/lib/` rather than living inside a specific module's `actions.ts`.

---

## 4. Issue Analysis

### CRITICAL (4 issues)

---

**C-1: Server-Side Permission Enforcement Completely Disabled**

**File:** `src/lib/auth.ts` lines 124-133; `src/lib/permissions.ts` lines 196-205  
**Risk:** Any authenticated user (regardless of role) can execute any server action in the system.

`requireServerPermission` ignores its argument and calls `requireAuth()` — which only verifies that a JWT cookie exists. A NURSE user can delete patients, manage staff, export all data, and change settings — actions that should be restricted to ADMINs.

```typescript
// src/lib/auth.ts — currently deployed
export async function requireServerPermission(_permission: string): Promise<SessionUser> {
  void _permission   // permission is thrown away
  return requireAuth()  // only checks: "is there a valid JWT?"
}
```

The client-side `usePermissions` hook correctly checks permissions from the JWT payload, creating a false sense of security — the UI hides buttons, but the underlying server actions are completely unguarded.

**Fix:** Re-enable the check. The JWT already carries `permissions: string[]`. `requireServerPermission` should verify `session.permissions.includes(permission)` and throw 403 if not present.

---

**C-2: Hardcoded JWT Signing Secret Fallback**

**File:** `src/lib/jwt.ts` lines 3-5  
**Risk:** If `AUTH_SECRET` is unset in any deployment, JWTs can be forged by anyone who knows the fallback string. An attacker can mint admin tokens and gain full access.

```typescript
const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET || "docsile-dev-secret-key-change-in-production"
)
```

The fallback string is now in the codebase (and thus in any repository clone, any CI log that prints environment variables, etc.).

**Additional concern:** The token TTL is 7 days with no refresh-token rotation. A stolen cookie is valid for the full 7-day window. Security principle requires access token TTL of 15 minutes maximum with a separate refresh token.

**Fix:** Crash at startup if `AUTH_SECRET` is missing (fail-fast). Validate minimum length of 32 chars. Introduce a shorter-lived access token (15 min) with a refresh mechanism.

---

**C-3: No Rate Limiting on the Login Endpoint**

**File:** `src/app/(auth)/login/actions.ts`  
**Risk:** Password brute-forcing is completely unrestricted. There is no delay, no lockout, no CAPTCHA, no request throttling at any layer.

The login server action accepts unlimited requests. bcrypt's cost factor provides some computational delay, but a distributed attacker with a wordlist can still make practical progress against common passwords.

**Fix:** Add rate limiting at the edge (Vercel middleware or an upstash/redis rate limiter in the server action). Security principle: 5 requests/minute per IP on the login endpoint.

---

**C-4: vercel.json SPA Rewrite Conflicts with Next.js App Router**

**File:** `vercel.json`  
**Risk:** The file contains `{"source": "/(.*)", "destination": "/index.html"}` — a catch-all SPA rewrite. In a Next.js App Router deployment on Vercel, this rewrite intercepts all requests and redirects them to a static HTML file, bypassing the Next.js runtime entirely. This means Server Actions, API routes, Server Components, and server-side session validation may silently fail or return stale/empty responses in production.

**Fix:** Remove the SPA rewrite rules from vercel.json. Next.js App Router handles routing natively on Vercel without this configuration. Verify production build behavior with `next build && next start` after removal.

---

### HIGH (6 issues)

---

**H-1: JWT Tokens Remain Valid After Logout**

**File:** `src/app/api/logout/route.ts`  
**Risk:** Logout only deletes the cookie on the client. The JWT itself remains cryptographically valid for 7 days. Anyone who intercepted the token (XSS, log exfiltration, network capture) can continue using it post-logout.

**Fix:** Maintain a server-side token revocation list (a database table or Redis set keyed by JWT ID / `jti` claim). On logout, insert the `jti`. On every token verification, check against this list. Expires entries after the token's TTL to bound table growth.

---

**H-2: Exotel Webhook Has Conditional (Skippable) Authentication**

**File:** `src/app/api/exotel/webhook/route.ts` lines 149-156  
**Risk:** The webhook authentication check is conditional on the env var being set:
```typescript
if (process.env.EXOTEL_WEBHOOK_TOKEN && webhookToken !== process.env.EXOTEL_WEBHOOK_TOKEN) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
}
```
If `EXOTEL_WEBHOOK_TOKEN` is not configured, the entire `if` block is skipped — the endpoint accepts all POST requests without authentication. Any external party can write arbitrary call log records to the database, potentially poisoning analytics and patient-call associations.

**Fix:** Make the check unconditional. If `EXOTEL_WEBHOOK_TOKEN` is not set, refuse all requests and log a startup warning.

---

**H-3: TOCTOU Race Condition in All Sequential ID Generators**

**Files:** `src/app/(hospital)/patients/actions.ts` (getNextPatientNumber, getNextPrescriptionNumber), `src/app/(hospital)/inpatients/actions.ts` (getNextIpNumber), `src/lib/id-generators.ts`  
**Risk:** Every ID generator follows the pattern: read last ID → increment in JavaScript → insert. Under concurrent requests (two patients registered at the same millisecond), both reads see the same "last ID" and generate the same next ID, causing either a DB error (if there's a unique constraint) or silently duplicate IDs (if there isn't).

**Fix:** Replace all application-side sequences with Postgres sequences (`CREATE SEQUENCE`) and use `nextval()` in the INSERT statement. This is atomic and concurrent-safe. Alternatively, use Supabase's `gen_random_uuid()` where human-readable IDs are not strictly required, and format for display separately.

---

**H-4: No Security Headers Configured**

**File:** `next.config.ts` (effectively empty)  
**Risk:** The application ships without any security headers: no Content-Security-Policy, no HSTS, no X-Frame-Options, no X-Content-Type-Options, no Referrer-Policy. A hospital system handling patient health information should have at minimum:
- `Strict-Transport-Security` (HSTS) to prevent downgrade attacks
- `X-Frame-Options: DENY` to prevent clickjacking
- `X-Content-Type-Options: nosniff` to prevent MIME sniffing
- `Referrer-Policy: strict-origin-when-cross-origin`
- CSP restricting script sources

**Fix:** Add a `headers()` function in `next.config.ts` applying these headers to all routes.

---

**H-5: No Centralized Auth Middleware — Routes Can Be Added Without Protection**

**Confirmed:** No `src/middleware.ts` exists.  
**Risk:** Auth enforcement happens per-layout (`src/app/(hospital)/layout.tsx` calls `getSession()`) and per-action (`requireServerPermission()`). A new route added inside `(hospital)/` relies on the developer remembering to also call `requireAuth()`. The layout guard is the primary protection, but it does not protect API routes or direct server-action calls.

**Fix:** Add `src/middleware.ts` that checks the JWT cookie on all `/(hospital)/**` and `/api/**` paths (except `/api/logout` and the Exotel webhook which have their own auth). This creates a mandatory, forgettable-proof auth layer for navigation. Per-action `requireAuth` calls remain as defense-in-depth.

---

**H-6: No Pagination on Unbounded Patient List Queries**

**File:** `src/app/(hospital)/patients/actions.ts` — `getPatients()` without date filter  
**Risk:** When no date filter is provided, the query returns all patients of a given type with no LIMIT clause: `.from("Patient").select(SELECT_FULL)...`. As patient count grows (thousands → tens of thousands), this query will either time out or return megabytes of JSON, causing the patients page to become unusable.

The same pattern exists in `getDoctorQueue()` (also returns all patients) and several analytics queries.

**Fix:** Add server-side pagination (offset-based for admin/list UIs is acceptable at current scale). Add a `LIMIT`/`OFFSET` clause to all list queries and return a count alongside data. Update client components to use paginated results.

---

### MEDIUM (6 issues)

---

**M-1: useEffect + Server Action + No Cache — Root Cause of Slow Modal**

**Confirmed root cause (per coordinator context)**  
**Affected components:** PatientActionsModal, ReportPrintModal, SendEmailModal, InsuranceCompanyManager, LabRecordsTab, PrescriptionsTab, VisitHistoryTab, InpatientRecordsTab, DuesTab, FollowUpsTab (~20 total)

Every modal open triggers at minimum one, often two, fresh Server Action round trips. Server Actions serialize to HTTP requests even in App Router — they incur a full network + server execution latency on every open. With no client-side cache (no React Query, no SWR), closing and reopening the same modal repeats the full round trip.

**Example pattern (PatientActionsModal.tsx):**
```typescript
useEffect(() => {
  if (!open || !patientId) return
  setLoading(true)
  Promise.all([getPatientById(patientId), getServiceTemplates()]).then(...)
}, [open, patientId])
```

**Fix:**  
- Introduce TanStack Query (React Query v5) or SWR as the data-fetching layer.  
- Key data by resource ID. First modal open fetches; subsequent opens within a stale window return cached data instantly.  
- For data that rarely changes (service templates, hospital profile), prefetch at layout level and pass as props.

---

**M-2: getServiceTemplates Duplicated Across Two Modules**

**Files:** `src/app/(hospital)/patients/actions.ts` and `src/app/(hospital)/settings/actions.ts`  
**Risk:** Two versions of the same function exist. Schema changes or new fields must be applied to both. They currently differ slightly (one has `includeInactive` parameter, one doesn't), which will diverge further over time.

**Fix:** Lift to `src/lib/service-templates.ts` as a single server-side utility function, imported by both modules' actions files.

---

**M-3: Webhook Logs Raw PII**

**File:** `src/app/api/exotel/webhook/route.ts` line 178  
```typescript
console.log("[Exotel Webhook] Raw data:", JSON.stringify(data))
```
The raw webhook payload contains `CallFrom` and `CallTo` — patient phone numbers. These are logged in plain text to the console/log aggregator. A hospital system likely has HIPAA-adjacent obligations (India: DISHA/DPDP Act) around health information and contact data.

**Fix:** Remove raw payload logging or redact phone number fields before logging. Use a structured logger that supports field-level redaction.

---

**M-4: TypeScript `any` Scattered Throughout Actions**

**Files:** Multiple `actions.ts` files (patients, inpatients, doctor, pharmacy)  
**Risk:** Explicit `any` casts in query result mappings bypass TypeScript's safety net. If Supabase schema changes (column added, type changed), TypeScript will not catch the mismatch — runtime errors surface instead.

**Fix:** Generate typed Supabase types from the schema (`supabase gen types typescript`) and use them throughout. The `src/lib/supabase/types.ts` file exists but appears unused based on file contents.

---

**M-5: Permissions Infrastructure Is Built but Disabled**

**Related to C-1.** The permission definitions in `src/lib/permissions.ts` are well-structured: 30+ granular permissions across all modules, with role defaults for ADMIN/DOCTOR/RECEPTIONIST/OPTOMETRIST/NURSE. The client-side `usePermissions()` hook reads from the JWT payload correctly.

The server-side enforcement was explicitly commented out ("Permissions are currently disabled"). This is not a design problem — it is a partially-complete feature. Re-enabling it is a matter of changing ~5 lines across two files, but it requires testing all user journeys for each role.

---

**M-6: Gemini API Key in API URL (Minor Risk)**

**File:** `src/lib/ai/gemini.ts` line 36  
```typescript
const url = `${GEMINI_API_BASE}/models/${model}:generateContent?key=${apiKey}`
```
The API key is passed as a query parameter. Depending on Vercel log configuration, query parameters may appear in access logs. This is a lower-risk issue since this code runs server-side only, but it is non-standard — most Google API clients use the `Authorization: Bearer` header.

**Fix:** Pass the key as `Authorization: Bearer ${apiKey}` header instead of query param, or confirm Vercel's log configuration redacts `key=` parameters.

---

### LOW (4 issues)

---

**L-1: Zero Test Infrastructure and 0% Coverage**

No test framework (jest, vitest, playwright) is configured. No test files exist. The codebase has no automated regression protection — changes to billing calculation logic, auth flows, or medication prescription logic cannot be verified automatically.

**Priority areas for initial test coverage:**
- Auth: login success/failure, JWT sign/verify, session expiry
- Patient creation: validation, ID generation, billing calculation
- Permission enforcement (once re-enabled)
- Critical server actions: createPrescriptionWithBilling, deletePatient

---

**L-2: No CI/CD Pipeline**

No `.github/workflows/` directory. No automated lint, type-check, or test runs on pull requests. Code is pushed and deployed without automated quality gates.

---

**L-3: Admin Server Integration Temporarily Disabled**

`src/lib/admin-client.ts` returns a static config object (hospital type hardcoded to `"EYE"`, all modules enabled, no subscription/billing enforcement). The real admin server integration is commented out in `src/app/(hospital)/layout.tsx`. This means:
- Hospital type "EYE" is hardcoded even for general hospitals
- Subscription/billing enforcement is silently bypassed
- Module gating is non-functional (all modules always enabled)

---

**L-4: No Structured Logging or Observability**

All logging uses `console.error()` and `console.log()`. There are 58 occurrences across 23 files. No:
- Correlation IDs (cannot trace a request across multiple server action calls)
- Structured JSON fields (log aggregators cannot filter on patient ID, action name, etc.)
- Error monitoring (no Sentry or equivalent)
- Performance metrics (no response time tracking)

---

## 5. Five-Phase Improvement Plan

### Phase 0: Security Hardening (Weeks 1-3 — IMMEDIATE)
**Goal:** Close all 4 Critical and the 2 most dangerous High issues before any new features.

| Task | Effort | Severity Closed |
|---|---|---|
| Crash on missing `AUTH_SECRET`; remove fallback | 30 min | C-2 |
| Re-enable `requireServerPermission` enforcement | 4 hours | C-1 |
| Add rate limiting to login endpoint (Upstash Redis or middleware) | 4 hours | C-3 |
| Fix/remove vercel.json SPA rewrite; verify prod build | 2 hours | C-4 |
| Add security headers to next.config.ts | 2 hours | H-4 |
| Make Exotel webhook auth unconditional | 1 hour | H-2 |
| Add `src/middleware.ts` for centralized JWT check | 4 hours | H-5 |

**Deliverable:** A production deployment where no authenticated user can exceed their role's permissions, with verified auth on every entry point.

---

### Phase 1: Testing Infrastructure (Weeks 4-6)
**Goal:** Establish test coverage on critical business logic paths. Target: 40% on core modules.

| Task | Effort |
|---|---|
| Configure Vitest + Testing Library | 1 day |
| Auth flow unit tests (JWT sign/verify, login action, permission check) | 2 days |
| Patient creation + billing calculation tests | 2 days |
| Server action integration tests (mock Supabase client) | 3 days |
| ID generator concurrency tests | 1 day |
| ESLint rule: no unguarded server action exports | 1 day |

---

### Phase 2: Performance — Data Fetching Layer (Weeks 7-10)
**Goal:** Eliminate the useEffect + Server Action pattern (the slow-modal root cause). Every data fetch should be cached and deduped.

| Task | Effort |
|---|---|
| Install and configure TanStack Query (React Query v5) | 1 day |
| Refactor PatientActionsModal to use useQuery | 2 days |
| Refactor all ~20 useEffect + server-action components | 1 week |
| Prefetch service templates at layout level (pass as prop) | 1 day |
| Add LIMIT/OFFSET pagination to getPatients, getDoctorQueue | 2 days |
| Fix all 5 TOCTOU ID generators (Postgres sequences) | 2 days |

---

### Phase 3: Architecture Clean-Up (Weeks 11-14)
**Goal:** Harden module boundaries, eliminate duplication, restore admin integration.

| Task | Effort |
|---|---|
| Extract shared functions to src/lib/ (hospital profile fetch, service templates, dropdown options) | 3 days |
| Break patients/inpatients cross-module coupling (shared lib or merge modules) | 1 week |
| Implement token revocation list (Supabase table + check in verifyToken) | 2 days |
| Restore or formally remove admin-server integration | 2 days |
| Enable Supabase typed schema generation | 1 day |
| Add JWT `jti` claim and 15-min TTL with refresh token | 3 days |

---

### Phase 4: Observability + CI/CD (Weeks 15-17)
**Goal:** Make the system debuggable at 3am and protected from regressions.

| Task | Effort |
|---|---|
| Integrate Sentry (error monitoring with source maps) | 1 day |
| Add structured logging (pino or equivalent, correlation IDs) | 2 days |
| Redact PII from webhook logs | 2 hours |
| GitHub Actions CI: lint + type-check + test on PR | 1 day |
| GitHub Actions CD: preview deploys on PR, prod on merge to main | 1 day |
| Uptime monitoring (Vercel analytics or external ping) | half day |

---

## 6. Risk Summary Matrix

| Issue | Severity | Effort to Fix | Impact |
|---|---|---|---|
| Permissions disabled | Critical | 4h | Any user = admin access |
| JWT fallback secret | Critical | 30m | Token forgery possible |
| No login rate limit | Critical | 4h | Brute force attacks |
| vercel.json SPA rewrite | Critical | 2h | SSR/Server Actions may break in prod |
| No token revocation | High | 2d | 7-day post-logout attack window |
| Exotel webhook auth | High | 1h | Data poisoning |
| ID generator race | High | 2d | Duplicate patient/prescription IDs |
| No security headers | High | 2h | XSS / clickjacking surface |
| No middleware.ts | High | 4h | Auth can be skipped on new routes |
| No pagination | High | 2d | OOM / timeout at scale |
| useEffect + no cache (modals) | Medium | 1w | Confirmed user-facing perf issue |
| Code duplication | Medium | 1d | Divergence risk |
| PII in logs | Medium | 2h | Compliance risk |
| TypeScript any | Medium | 3d | Schema drift undetected |
| Permissions half-built | Medium | — | See C-1 |
| Gemini key in URL | Medium | 1h | Log exposure risk |
| 0% test coverage | Low | 2w | No regression protection |
| No CI/CD | Low | 2d | No quality gates |
| Admin integration disabled | Low | 2d | Silent feature bypass |
| No structured logging | Low | 3d | 3am debuggability poor |

---

## 7. Confirmed Context (from Coordinator)

The following items were pre-established by the coordinator and confirmed by direct code inspection:

- Custom JWT-cookie auth (`jose`), NOT Supabase Auth. Cookie: `docsile-session`. Confirmed in `src/lib/jwt.ts` and `src/lib/auth.ts`.
- Supabase accessed server-side via SERVICE ROLE KEY only. Confirmed in `src/lib/supabase/server.ts`. RLS bypassed entirely.
- 121 `"use client"` files, 20 `actions.ts` files with 229 exported functions. Confirmed by glob.
- No `middleware.ts`. Auth per layout. Confirmed by directory scan.
- PatientActionsModal slow-modal root cause confirmed: `useEffect` keyed on `open`, two parallel Server Action calls, zero caching. Pattern found in ~20 additional components.
- Admin-client disabled and replaced with static config. Confirmed in `src/lib/admin-client.ts` lines 1-4 + comment in `layout.tsx`.
