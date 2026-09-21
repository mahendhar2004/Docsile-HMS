# Phase 3 — Tech Stack Decision

## Scope Steer (explicit, from project owner, 2026-09-21)

Before scoring, the owner gave a direct steer that narrows this decision:
- **Backend must live inside Supabase's free tier** — Edge Functions, not a
  separately-hosted service. "Nothing new to host."
- **Keep the existing custom JWT auth (`jose`) as-is for now.** Do not
  migrate to Supabase Auth. Only fix concrete bugs in it (the ones already
  named in `0-analysis.md`: hardcoded secret fallback, no rate limiting,
  no token revocation) — this is bug-fixing, not an auth-model redesign.
- **Main task is the frontend migration** — mapping the existing 229
  server-action functions onto the new backend shape (Edge Functions)
  correctly, not rewriting business logic or re-architecting auth.

This is compatible with ADR-002 from Phase 2 (hybrid authorization: app-layer
permission guard as primary enforcement, RLS as tenant-isolation defense in
depth only — not full RLS-based RBAC, so no Supabase Auth migration is
required for that decision either). Nothing here contradicts Phase 2; it
resolves the one item Phase 2 explicitly deferred to Phase 3.

## Step 1: Profile Scoring (for the record — the steer above already
determines the winner, but the scoring is shown per the plugin's rule that
conclusions are never asserted silently)

| Profile | Team Fit | Scale Fit | Compliance | Cost | Ecosystem | Ops | Total |
|---|---|---|---|---|---|---|---|
| **supabase-fullstack (Edge Functions)** | 4 | 4 | 4 | **5** | 4 | **5** | **26** |
| nestjs-postgres | 5 | 5 | 4 | 2 | 5 | 3 | 24 |
| python-fastapi-postgres | 3 | 4 | 4 | 2 | 4 | 3 | 20 |
| nextjs-fullstack | — | — | — | — | — | — | (ruled out — this is the thing being migrated away from) |

`supabase-fullstack` wins primarily on **Cost Fit** (free-tier requirement
is explicit and non-negotiable right now) and **Ops Fit** (a 2-5 person team
does not need to operate a second service). `nestjs-postgres` scores higher
on Team/Scale/Ecosystem in the abstract, but those advantages don't matter
against an explicit "must stay free tier" constraint — this is exactly the
kind of case the profile registry's rubric is built to surface honestly
rather than defaulting to the "best general" profile.

## Step 2: Deviations Within the Profile

| Trigger | Deviation from `supabase-fullstack` default | Reason |
|---|---|---|
| Keep existing auth | Edge Functions verify the existing custom JWT (`jose`, HttpOnly cookie) instead of `supabase.auth.getUser()` | Owner's explicit instruction — do not migrate to Supabase Auth now. Documented below as its own pattern since it deviates from this profile's default Edge Function template. |
| Realtime scope | Supabase Realtime used only for the 3 named live-update paths (queue status, bed availability, appointment board) — not a general realtime-everything pattern | Matches the NFR (`realtimePaths` in `1-prd.md`), avoids overusing a live channel for data that's fine at a 2-15 min cache TTL |
| RLS scope | RLS policies enforce **tenant isolation only** (`hospital_id` row filter) — not per-role RBAC | Per ADR-002 (Phase 2) and the owner's "keep auth as-is" steer — RBAC stays in the Edge Function permission guard, testable in TypeScript |
| Frontend package versions | Keep the versions already in the codebase (React 19.2.3, Tailwind 4, Zustand 5, React Hook Form 7.71, Zod 4) rather than the profile's generic pinned defaults (React Router 6/Tailwind 3/Zustand 4 etc., which predate this codebase) | This is a migration of an existing, already-modern codebase — downgrading working dependencies would be pure churn |

Both the auth deviation and the RLS-scope deviation are direct continuations
of ADR-002; no new ADR needed for them. A new ADR is written below only for
the Edge-Function-auth pattern itself, since it's a concrete implementation
choice with a real alternative (see ADR-005).

## Step 3: Locked Stack

| Layer | Choice | Version |
|---|---|---|
| Backend | Supabase Edge Functions (Deno) | Supabase CLI-managed |
| API auth | Custom JWT (`jose`), HttpOnly cookie, verified per-function | jose ^6.2.1 (kept) |
| Database | Supabase Postgres | kept |
| DB access | `supabase-js` (service-role key, server-only, inside Edge Functions) | ^2.99.1 (kept) |
| Tenant isolation | Postgres RLS (`hospital_id` filter) — new | — |
| Realtime | Supabase Realtime (Postgres CDC → channel broadcast) | built-in |
| Frontend framework | React (SPA, no meta-framework) | 19.2.3 (kept) |
| Frontend build tool | Vite | ^5.4.x |
| Frontend routing | React Router | ^6.26.x |
| Server-state / cache | TanStack Query | ^5.59.x — this is the direct fix for the M-1 modal-slowness root cause |
| Client state | Zustand | 5.0.11 (kept) |
| Forms | React Hook Form + Zod | 7.71.1 / 4.3.6 (kept) |
| Styling | Tailwind CSS 4 + Radix UI + shadcn/ui + CVA | kept as-is |
| Testing (frontend) | Vitest + React Testing Library + Playwright (e2e) | new |
| Testing (Edge Functions) | Deno's built-in test runner | new |
| CI/CD | GitHub Actions (lint, typecheck, test on PR) | new |
| Hosting | Vercel (static SPA build) + Supabase (Edge Functions, DB, Realtime, Storage) | kept, both free tier |

## Package Additions (frontend)

```json
{
  "dependencies": {
    "react-router-dom": "^6.26.2",
    "@tanstack/react-query": "^5.59.0",
    "@tanstack/react-query-devtools": "^5.59.0"
  },
  "devDependencies": {
    "vite": "^5.4.8",
    "@vitejs/plugin-react": "^4.3.2",
    "vitest": "^2.1.2",
    "@testing-library/react": "^16.0.1",
    "@testing-library/jest-dom": "^6.5.0",
    "@testing-library/user-event": "^14.5.2",
    "jsdom": "^25.0.1",
    "@playwright/test": "^1.48.0"
  }
}
```

Dropped (Next.js-specific, no longer needed): `next`, `eslint-config-next`,
`next-themes` (replace with a plain CSS-variable/`prefers-color-scheme`
toggle or a framework-agnostic equivalent).

## ADR-005: Edge Function Auth Verification Pattern

**Status:** Accepted

**Context:** `supabase-fullstack`'s default Edge Function template verifies
requests via `supabase.auth.getUser()`, which assumes Supabase Auth issued
the JWT. This project keeps its existing custom JWT (`jose`-signed, HttpOnly
cookie `docsile-session`), by explicit owner decision (see Scope Steer
above and ADR-002).

**Decision:** Every Edge Function verifies the request with a shared
`verifySession(req)` helper (in the Edge Functions shared kernel,
`supabase/functions/_shared/auth.ts`) that:
1. Reads the `docsile-session` cookie from the request headers (Edge
   Functions receive raw HTTP requests, so cookies must be parsed manually
   — there is no framework cookie-jar).
2. Verifies it with `jose.jwtVerify()` using `AUTH_SECRET` (an Edge Function
   secret, set via `supabase secrets set` — never a hardcoded fallback,
   closing C-2).
3. Checks the token's `jti` against a `token_revocation` table (closing H-1).
4. Returns the session (id, role, permissions) or a 401 — before any
   business logic runs, matching this profile's "auth first" rule.
5. The Edge Function's own service-role Supabase client is then used for
   the actual query, scoped further by the mandatory permission-guard
   check from the route's declared required permission (ADR-002's
   structural, non-bypassable enforcement — implemented here as a
   wrapper every Edge Function's handler is required to call, with a
   startup/deploy-time check that no exported handler skips it).

**Alternatives considered:**
- *Migrate to Supabase Auth now* — rejected per explicit owner steer; also
  would force the RLS-based-RBAC path Phase 2 already rejected (ADR-002).
- *Verify JWT in Postgres RLS policies directly* (RLS reading a custom JWT
  claim) — rejected: couples every RLS policy to the custom JWT shape,
  making future auth changes harder, and still needs the same verification
  code duplicated in Postgres SQL; keeping verification in one shared
  TypeScript helper is simpler to test and change.

**Consequences:** Slightly more code per Edge Function than the profile's
default template (manual cookie parsing instead of relying on
`supabase.auth.getUser()`), in exchange for zero auth-model migration risk
and full reuse of the existing, already-understood JWT logic.
