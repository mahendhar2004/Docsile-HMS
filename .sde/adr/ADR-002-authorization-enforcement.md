# ADR-002: Authorization Enforcement Location

**Date:** 2026-09-21  
**Status:** Accepted  
**Deciders:** Mahendhar (project owner), Staff Architect (SDE-5)  
**Phase:** Phase 2 — Architecture Design

---

## Context

Issue C-1 (Critical) in the Phase 0 analysis: `requireServerPermission()` ignores its argument and calls `requireAuth()` — any authenticated user can execute any server action regardless of role. The client-side `usePermissions` hook correctly checks permissions from the JWT payload, creating a false sense of security.

The existing permission model is well-designed: 30+ granular permissions (e.g. `patient:create`, `billing:delete`, `staff:manage`), with role defaults for ADMIN/DOCTOR/RECEPTIONIST/OPTOMETRIST/NURSE defined in `src/lib/permissions.ts`. These permissions are already stored in the JWT payload as `permissions: string[]`.

The core question: where should authorization be enforced such that it is **structurally impossible to silently disable** — not just a convention that a developer can forget, disable, or comment out?

Three credible options exist, each with genuine trade-offs given the NFRs.

---

## Decision

**Hybrid**: API-layer mandatory permission guard (primary) + Supabase RLS tenant-isolation policies (defense-in-depth).

- Fine-grained RBAC (the 30+ permission model) is enforced by a mandatory permission guard in the API middleware layer. "Mandatory" means: routes are registered with a `permission` metadata field; the guard reads that metadata and refuses the request if the session does not have the required permission; a route registered without a `permission` field causes a startup error — it cannot be silently omitted.
- Tenant isolation (hospital A cannot read hospital B's data) is enforced by Supabase RLS policies on every table, as defense-in-depth. The API repository layer also scopes every query to `WHERE hospital_id = session.hospitalId`, so tenant isolation has two independent enforcement points.

---

## Reasoning

1. **The "remember to call it" pattern was broken once and will be broken again.** The current system disabled `requireServerPermission` by changing 5 lines of code. Application-code enforcement that is not structurally required will be disabled again under time pressure. The permission guard must be structural: a route that doesn't declare its permission requirement cannot be reached, not just "might not be checked."

2. **Pure RLS (Option B) requires Supabase Auth migration.** To use `auth.uid()` and JWT claims in RLS policy expressions, the system must use Supabase Auth (or set a custom Postgres session variable on each connection). The current custom JWT auth (`jose`) does not integrate with Supabase's RLS JWT context automatically. Migrating to Supabase Auth is a multi-week project that is orthogonal to the migration of 18 modules. Forcing this migration scope to close C-1 is out of proportion to the risk reduction gained.

3. **RLS is harder to test for health-system compliance.** RLS policies are SQL expressions evaluated at the database layer. They cannot be unit-tested with standard TypeScript testing frameworks — they require integration tests against a real Supabase instance. For a health system handling DPDP-regulated data with 30+ permissions and 5 roles, the policy test surface is very large. Application-code guards are testable with standard `describe/it` unit tests, which the new codebase mandates from day one.

4. **Hybrid gives two independent enforcement points for the highest-risk failure (cross-tenant leak).** Tenant isolation (the failure mode where hospital A reads hospital B's patient data) is the worst possible data breach scenario. Having both the repository layer (explicit `hospital_id` filter) and RLS (DB-level rejection) means a repository bug that forgets the hospital_id filter still doesn't produce a cross-tenant read. Fine-grained RBAC (nurse vs admin permission) does not have the same catastrophic breach scenario, so one structural enforcement point (the API guard) is sufficient.

5. **Custom JWT is preserved.** The existing 7-day token → 15-minute access + refresh rotation design (C-2/H-1 fix) is not disrupted. The API layer verifies the JWT with `jose` exactly as today, but now also checks the jti revocation table and enforces the declared permission. No auth provider migration required.

---

## Alternatives Considered

| Option | Team Fit | Scale Fit | Compliance | Cost | Ecosystem | Ops | Total | Notes |
|--------|---|---|---|---|---|---|---|---|
| **Hybrid (API guard + RLS tenant isolation) — chosen** | **5** | **5** | **5** | **5** | **5** | **5** | **30** | Structural enforcement; no Supabase Auth migration needed; testable; defense-in-depth for worst-case |
| Pure API-layer guard (no RLS) | 5 | 5 | 3 | 5 | 5 | 5 | 28 | Good structural enforcement for RBAC; but cross-tenant isolation depends solely on repository discipline — a single forgotten `hospital_id` filter leaks patient data across hospitals |
| Pure DB-layer RLS (Supabase policies for all 30+ permissions) | 3 | 4 | 4 | 5 | 3 | 4 | 23 | Requires Supabase Auth migration; 30+ policies are hard to test with standard tooling; RLS debug experience is poor (silent policy denial vs. type-checked TypeScript); large migration scope |

---

## Consequences

### Positive
- C-1 (critical: disabled permission enforcement) is closed structurally — not by a code convention but by a type-system constraint on route registration.
- Tenant isolation is defended at two independent layers — repository-level `hospital_id` filter + RLS policy. Cross-tenant data leaks require both to fail simultaneously.
- The existing 30+ permission definitions and role defaults are reused, not rewritten.
- Permission enforcement is testable with standard unit tests: `describe('permission guard', () => { it('rejects NURSE on billing:delete', ...) })`.
- New engineers cannot add an unguarded endpoint accidentally — the framework rejects it at startup.

### Negative / Trade-offs
- The permission guard lives in application code — a sophisticated attacker who can deploy malicious code can still bypass it. This is mitigated by: (a) the code review + CI gate that must pass before any deployment, (b) the RLS tenant isolation defense-in-depth layer, and (c) the fact that service-role DB access itself is not the attack surface — the JWT verification step precedes all business logic.
- RLS policies for tenant isolation must be authored and maintained. This is a smaller policy surface than full RBAC RLS (one policy per table: `hospital_id = [session hospital_id]`), but it is still infra code that must be version-controlled and tested via integration tests.
- The service-role key continues to be used for DB writes (bypassing RLS on writes). This means the repository layer bears the tenant-isolation responsibility for writes. The solution: repository constructors accept a `hospitalId` parameter and include it in every INSERT/UPDATE. A lint rule or type constraint enforces this — a repository that doesn't scope its writes won't compile.

### Neutral
- The Supabase anon key (used for Realtime channel subscriptions on the client side) does not bypass RLS — anon key queries are still subject to RLS policies. The client-side Realtime subscription must use a channel filtered to the hospital's data (the Realtime channel name includes the hospitalId, and the server configures channel broadcast rules accordingly).

---

## Revisit When

- If Supabase Auth is adopted for another reason (e.g. a future mobile app that wants Supabase's built-in OTP/magic-link auth), re-evaluate whether migrating fine-grained RBAC to RLS policies makes sense at that time — the migration cost is lower once Supabase Auth is already in place.
- If a compliance audit (e.g. a DPDP audit or insurance-mandated security assessment) requires demonstrating that authorization cannot be bypassed via application-code deployment — at that point, RLS provides a stronger answer than application-code guards.
- If the team grows to 6+ engineers and the risk of application-code guard bypass increases due to team coordination overhead — adopt RLS for the highest-risk permissions at that point.

---

## Implementation Notes

**API-layer permission guard (structural design)**:
```
// At route registration time (framework-specific syntax chosen in Phase 3):
//
//   routes.register({
//     method: 'DELETE',
//     path: '/v1/patients/:id',
//     permission: 'patient:delete',   // ← required field, typed enum
//     handler: deletePatientHandler,
//   })
//
// The guard:
//   1. Reads permission from route metadata (not from handler code)
//   2. Checks session.permissions.includes(route.permission)
//   3. Returns 403 if false — handler never executes
//   4. Routes with no declared permission cause a startup-time error
```

**RLS tenant isolation policy (pattern — actual SQL in Phase 4)**:
```sql
-- Applied to every table that has a hospital_id column:
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON patients
  FOR ALL
  USING (hospital_id = current_setting('app.hospital_id')::UUID);

-- The API backend sets app.hospital_id at the start of each DB session:
-- SET LOCAL app.hospital_id = '<verified hospital_id from JWT>';
-- This works with service-role key if set explicitly per connection.
```

**Token revocation check (jti)**:
```
-- SELECT 1 FROM token_revocation WHERE jti = $1 AND expires_at > now()
-- If found → 401 Unauthorized (H-1 fix: logout invalidates tokens immediately)
```

---

## References

- `.sde/phases/0-analysis.md` Issue C-1 — disabled permission enforcement
- `.sde/phases/0-analysis.md` Issue H-1 — no token revocation on logout
- `.sde/phases/2-architecture.md` Section 5 — auth flow sequence diagrams
- ADR-001 — architecture pattern (BaaS-Centric was rejected partly because it required RLS for fine-grained RBAC)
