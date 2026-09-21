# ADR-006: Edge Function Internal Routing & Layering (Thin Handler / Fat Service)

**Date:** 2026-09-21
**Status:** Accepted
**Deciders:** Mahendhar (project owner), Staff Architect (SDE-5)
**Phase:** Phase 3/4 boundary — resolves a detail Phase 2 (§3.1) left
framework-agnostic ("routes.ts" was named before Edge Functions were locked
as the concrete backend in Phase 3)

---

## Context

Phase 2 (§3.1) already committed to a per-module three-file layering
(`routes.ts` → `service.ts` → `repository.ts`), explicitly so business
logic is isolated from HTTP/framework concerns and easy to debug in
isolation. The project owner reiterated this requirement directly: *"the
calling layer should be very thin... but the business logic should have
its own files and related code so that I can easily figure out and debug
properly."*

What Phase 2 didn't resolve: Supabase Edge Functions have no built-in
router. Each Edge Function is one Deno deployable reached at a single base
path (`/functions/v1/<function-name>`). With 18 modules and ~229 actions
today, the question is how one module's many actions (e.g. `patient-care`
alone covers create/search/admit/discharge/assign-bed — a dozen-plus
operations) map onto that one-deployable-per-function reality without
either (a) collapsing into a fat, everything-in-one-handler function, or
(b) exploding into 229 separately-deployed functions.

## Decision

**One Edge Function per module (18 total), each running a small Hono
router internally**, with the three-file split made concrete:

```
supabase/functions/
├── _shared/
│   ├── auth.ts              # verifySession() — ADR-005
│   ├── permission-guard.ts   # ADR-002's structural guard, as Hono middleware
│   ├── response.ts           # { data, error } envelope helpers
│   ├── logger.ts             # structured, PII-redacting logger
│   └── errors.ts             # typed error classes → HTTP status mapping
├── patient-care/
│   ├── index.ts              # THIN — Hono app: route table only
│   ├── service.ts            # business logic — pure TS, zero HTTP/Hono imports
│   ├── repository.ts         # all Supabase queries for this module's tables
│   └── types.ts              # request/response schemas (Zod), validated at the boundary
├── billing/
│   ├── index.ts
│   ├── service.ts
│   ├── repository.ts
│   └── types.ts
... (one folder per module, same shape)
```

`index.ts` is deliberately small enough to read in one screen. Example
shape (illustrative, not final code):

```typescript
// supabase/functions/patient-care/index.ts — THIN, no business logic
import { Hono } from 'https://esm.sh/hono@4'
import { requireAuth } from '../_shared/auth.ts'
import { requirePermission } from '../_shared/permission-guard.ts'
import * as service from './service.ts'
import { envelope } from '../_shared/response.ts'

const app = new Hono().basePath('/patient-care')
app.use('*', requireAuth)

app.post('/patients', requirePermission('patient:create'), async (c) => {
  const result = await service.registerPatient(c.get('session'), await c.req.json())
  return envelope(c, result)
})

app.get('/patients/:id', requirePermission('patient:view'), async (c) => {
  const result = await service.getPatientById(c.get('session'), c.req.param('id'))
  return envelope(c, result)
})
// ...every route: one line, a declared permission, a call into service.ts

export default app.fetch
```

`service.ts` contains the actual business logic — validation beyond
schema shape, the patient-registration-then-bill-creation transaction,
the ID-generation call, whatever the operation actually does. It imports
`repository.ts` for data access and nothing from Hono/HTTP. This is the
file a developer opens to understand or debug what an operation *does*;
`index.ts` is the file they check only to see *which permission guards
which URL*.

## Alternatives Considered

| Option | Debuggability | Cold-start/Ops | Matches modular-monolith design | Total assessment |
|---|---|---|---|---|
| **One Edge Function per module, Hono router inside — chosen** | High — thin declarative route table, logic isolated in service.ts, testable without HTTP | 18 deployables, each doing related work — reasonable cold-start surface | Matches exactly — one function per module mirrors the module boundary already decided | Best fit |
| One Edge Function per action (~229 functions) | Individual actions trivial to find, but no shared module-level structure — cross-cutting concerns (auth, permission guard) must be re-wired per function or duplicated | 229 deployables — much larger cold-start/deploy surface, harder to reason about as "the billing module" | Fragments the module boundary the whole architecture is built around | Rejected — over-fragmentation for no debugging benefit given the thin/fat split already isolates logic |
| One giant Edge Function for the whole app, manual if/else or path switch | Everything in one file — the exact "hard to debug, hard to find things" problem the owner is trying to avoid | Single deployable, simplest ops | Directly contradicts the modular-monolith / no-cross-module-coupling design | Rejected outright |
| Hand-rolled path parsing (`new URL(req.url).pathname.split('/')`, manual switch) instead of Hono | Works, zero dependencies | Same as chosen option | Same folder shape works either way | Rejected in favor of Hono — hand-rolled routing re-invents what Hono already does well (path params, middleware chaining for the permission guard), and Hono is the standard, widely-used choice for Deno/Edge Function routing, not an exotic dependency |

## Consequences

### Positive
- Directly answers the owner's stated requirement: `index.ts` is provably
  thin (a route table, one line per endpoint), `service.ts` holds 100% of
  the business logic with zero framework imports, so it's trivial to find
  "where does X actually happen" and to unit-test that logic without
  spinning up an HTTP request.
- The permission guard (ADR-002) is a single Hono middleware applied per
  route with its required permission as an explicit argument — a route
  that forgets to call `requirePermission(...)` is visibly missing it in
  a one-screen file, and a lint rule can grep for any `app.<method>(...)`
  call in an `index.ts` that lacks a `requirePermission` argument and fail
  CI (this is what makes ADR-002's "structural, not conventional"
  guarantee concrete for Edge Functions specifically).
- 18 deployables map 1:1 to the 18 modules already defined — no new
  mental model to hold beyond what Phase 2 already established.

### Negative / Trade-offs
- Hono is a new dependency (via esm.sh URL import, per Edge Functions'
  convention — no `package.json` entry needed). It's small, well-maintained,
  and Deno-native; this is a low-risk addition.
- A module with many actions (patient-care, billing) will have a longer
  `index.ts` than a small module (license-tracker), but "longer route
  table" is a different problem than "logic mixed with routing" — the
  route table stays flat and skimmable even as it grows, because it never
  contains logic, only one line per endpoint.

## References

- `.sde/phases/2-architecture.md` §3.1 (original routes/service/repository split)
- `.sde/adr/ADR-002-authorization-enforcement.md` (the permission guard this makes concrete)
- `.sde/adr/ADR-005-edge-function-auth-pattern.md` (the auth verification this composes with)
