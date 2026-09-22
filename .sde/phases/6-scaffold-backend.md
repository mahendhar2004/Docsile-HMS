# Phase 6 — Backend Scaffold: Completion Log

**Date:** 2026-09-22
**Agent:** backend-agent

---

## Summary

All 20 Supabase Edge Function modules scaffolded. Every function follows the
thin `index.ts` / fat `service.ts` pattern (ADR-006), with `_shared/` utilities
shared across all modules.

---

## Files Created

### Shared utilities (6 files)
| File | Purpose |
|------|---------|
| `_shared/auth.ts` | `verifySession`, `requireAuth`, cookie builders (jti check against token_revocation — H-1 fix) |
| `_shared/permission-guard.ts` | `requirePermission(scope)` Hono middleware |
| `_shared/response.ts` | `ok`, `created`, `paginated`, `errorResponse`, `handleError` |
| `_shared/errors.ts` | `AppError` hierarchy: Validation(400), Unauthorized(401), Forbidden(403), NotFound(404), Conflict(409), Unprocessable(422), RateLimit(429), NotImplemented(501), ServiceUnavailable(503) |
| `_shared/logger.ts` | Structured JSON logger with `redactPII()` — name/phone/DOB/diagnosis/tokens never logged |
| `_shared/supabase-client.ts` | Singleton service_role client — throws descriptively if SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing |

### Import map
| File | Purpose |
|------|---------|
| `deno.json` | Pins: hono@4.6.3, jose@5.9.6, zod@3.23.8, @supabase/supabase-js@2.46.1 |

### Module files (20 modules × 4 files = 80 files)

| Module | Routes | Files |
|--------|--------|-------|
| auth | 3 | index.ts, service.ts, repository.ts, types.ts |
| health | 2 | index.ts, service.ts, repository.ts, types.ts |
| patient-care | 28 | index.ts, service.ts, repository.ts, types.ts |
| billing | 5 | index.ts, service.ts, repository.ts, types.ts |
| pharmacy | 21 | index.ts, service.ts, repository.ts, types.ts |
| labs | 14 | index.ts, service.ts, repository.ts, types.ts |
| optical | 16 | index.ts, service.ts, repository.ts, types.ts |
| insurance | 11 | index.ts, service.ts, repository.ts, types.ts |
| queue | 3 | index.ts, service.ts, repository.ts, types.ts |
| doctor | 11 | index.ts, service.ts, repository.ts, types.ts |
| staff | 12 | index.ts, service.ts, repository.ts, types.ts |
| settings | 33 | index.ts, service.ts, repository.ts, types.ts |
| analytics | 19 | index.ts, service.ts, repository.ts, types.ts |
| reports | 17 | index.ts, service.ts, repository.ts, types.ts |
| workup | 4 | index.ts, service.ts, repository.ts, types.ts |
| expenses | 10 | index.ts, service.ts, repository.ts, types.ts |
| dues-followups | 8 | index.ts, service.ts, repository.ts, types.ts |
| call-logs | 8 | index.ts, service.ts, repository.ts, types.ts |
| license-tracker | 6 | index.ts, service.ts, repository.ts, types.ts |
| dashboard | 2 | index.ts, service.ts, repository.ts, types.ts |
| **Total** | **233** | **86 TypeScript files** |

---

## Route Count Parity vs OpenAPI Spec

| Module | Spec §count | Scaffolded | Match |
|--------|-------------|------------|-------|
| auth | 3 | 3 | ✓ |
| health | 2 | 2 | ✓ |
| patient-care | 28 | 28 | ✓ |
| billing | 5 | 5 | ✓ |
| pharmacy | 21 | 21 | ✓ |
| labs | 14 | 14 | ✓ |
| optical | 16 | 16 | ✓ |
| insurance | 11 | 11 | ✓ (spec header says 12 — resolved discrepancy below) |
| queue | 3 | 3 | ✓ |
| doctor | 11 | 11 | ✓ |
| staff | 12 | 12 | ✓ |
| settings | 33 | 33 | ✓ |
| analytics | 19 | 19 | ✓ |
| reports | 17 | 17 | ✓ |
| workup | 4 | 4 | ✓ |
| expenses | 10 | 10 | ✓ |
| dues-followups | 8 | 8 | ✓ |
| call-logs | 8 | 8 | ✓ |
| license-tracker | 6 | 6 | ✓ |
| dashboard | 2 | 2 | ✓ |

**Grand total: 233 operations** (spec description says 234 — resolved discrepancy below).

---

## Resolved Discrepancies

### Insurance route count (12 → 11)
Phase 5 §2 table listed 12 routes for the insurance module. The openapi.yaml
`§insurance` description states that `/insurance/companies/all` was **merged
into** `GET /insurance/companies?paginated=false` per the API design principle
that "filtering result quantity is a query parameter, not a distinct resource
path." The scaffolded count of 11 routes follows openapi.yaml, which is
authoritative.

### Grand total operations (234 → 233)
The openapi.yaml info.description states "234 operations." The actual count from
all path entries is 233. The discrepancy is exactly 1, consistent with the
insurance `/companies/all` merge reducing the total. Scaffolded count is 233.

---

## Security Properties Implemented

| Requirement | Implementation |
|-------------|---------------|
| AUTH_SECRET no hardcoded fallback | `auth.ts` line: `const secret = Deno.env.get('AUTH_SECRET'); if (!secret) throw new ServiceUnavailableError(...)` |
| H-1 jti revocation check | `auth.ts` `verifySession` queries `token_revocation` table on every auth'd request |
| H-2 webhook fail-closed | `call-logs/index.ts`: EXOTEL_WEBHOOK_TOKEN absence → 401 immediately |
| PII redaction | `logger.ts` `redactPII()` — 15 PII fields stripped from all log payloads |
| No business logic in index.ts | All service stubs throw NotImplementedError(501) — no logic until Phase 7 |
| hospital_id tenant isolation | All repository constructors take `hospitalId`; every query will be scoped (Phase 7) |

---

## Static vs Parameterized Route Ordering

All modules with both static and parameterized routes define static routes first
to prevent Hono from matching a static suffix as the `:id` parameter. Key
examples:
- `patient-care`: `/patients/search`, `/patients/next-id`, `/patients/registration-form` before `/patients/:id`
- `pharmacy`: `/stock/summary`, `/stock/search` before `/stock/:id`; `/purchase-orders` before `/:id/receive`
- `labs`: `/labs/labs`, `/labs/investigations`, `/labs/pending-investigations`, `/labs/bills` before parameterized
- `staff`: `/roles/seed` (POST) before `/roles/:id` (PATCH/DELETE)
- `expenses`: `/categories/seed` (POST) and `/categories/reorder` (PATCH) before `/categories/:id`
- `call-logs`: `/analytics`, `/stats`, `/patients/search`, `/sync`, `/webhook/exotel` before `/:id/notes`, `/:id/patient`
- `reports`: `/patients/search` before `/patients/:patientId/...`

---

## Deno Check Result

Deno is not installed in this CI/sandbox environment (`deno not found in PATH`).
Type correctness cannot be verified locally. All imports use the pinned versions
from `deno.json`. Type errors (if any) will surface during the first `supabase
functions deploy` or when a developer runs `deno check` locally.

Recommendation for Phase 7: run `deno check supabase/functions/**/*.ts` before
first deployment.

---

## What Phase 7 Must Do

1. Replace every `throw new NotImplementedError(...)` in service files with real
   Supabase query logic via the corresponding repository.
2. Implement all repository class methods with `hospitalId`-scoped queries.
3. Add `auth/repository.ts` token_revocation insert/check logic (partially
   scaffolded — jti check is wired, insert on logout still a stub).
4. Add unit test stubs for each service and entry layer per the profile spec.
5. Run `deno check` and fix any type errors before deployment.
6. Register new permissions (`billing:*`, `call_logs:*`, `queue:view`) in the
   seed data / role definitions.
