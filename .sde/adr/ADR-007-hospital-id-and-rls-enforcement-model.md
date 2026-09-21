# ADR-007: Hospital ID Backfill Strategy and RLS Session Variable Mechanism

**Date:** 2026-09-21
**Status:** Accepted
**Deciders:** Mahendhar (project owner), Supabase Staff Engineer (Phase 4)
**Phase:** Phase 4 — Data Model

---

## Context

Phase 4's schema analysis (finding documented in `4-datamodel.md` §4) revealed that
`hospital_id` does **not exist on any table** in the current live database. The schema was
built as a single-tenant design — one HospitalProfile row, no per-row tenant column.

ADR-002 decided: RLS policies enforce tenant isolation (`hospital_id` row filter) as
defense-in-depth, alongside the repository layer's mandatory `WHERE hospital_id = ?` filter.
ADR-002 assumed `hospital_id` already existed. This ADR closes that gap by deciding:

1. **How** to add `hospital_id` to existing tables (all-at-once vs. per-module rollout).
2. **What Postgres mechanism** the RLS policies use to read the current hospital's id
   (given that custom JWT is used, not Supabase Auth, so `auth.uid()` and `auth.jwt()`
   do not carry the hospital context).
3. **Whether** to create a dedicated Postgres role (non-BYPASSRLS) so RLS actually
   applies to Edge Function queries (service_role bypasses RLS entirely).

Two credible alternatives existed for each of the three questions above.

---

## Decisions

### Decision 1: Add hospital_id to all entity tables in one migration

Add `hospital_id TEXT NOT NULL` to all 30+ entity tables in a single migration
(`20260921110000_hospital_id_backfill.sql`) with an immediate backfill from the
existing single HospitalProfile row.

**Rejected alternative: per-module rollout (add hospital_id table-by-table as each module is migrated)**

| Factor | All-at-once | Per-module rollout |
|---|---|---|
| Migration risk | One large migration vs. live DB | Many smaller migrations over weeks |
| Backfill correctness | Trivially correct: single hospital, one value to fill | Identical backfill per table, but spread over multiple PRs |
| Schema consistency | All tables consistent from day one | Some tables have hospital_id, others don't — creates partial-tenant-isolation state |
| RLS policy readiness | Can enable RLS on all tables at once | Must enable RLS table-by-table in lock-step with migration |
| Cross-tenant leak window | Zero — all tables are isolated before any code references hospital_id | Non-zero — tables without hospital_id have no RLS protection during rollout |

**Rationale**: The backfill is deterministic and safe (single hospital, one ID to fill, no ambiguity). The risk of a cross-tenant leak during a multi-week per-module rollout (tables without hospital_id unprotected) outweighs the risk of running one larger migration. The migration is transactional — if any step fails, the whole thing rolls back. Chosen: all-at-once.

---

### Decision 2: Use `current_setting('app.hospital_id', true)` for RLS session variable

RLS policies use `current_setting('app.hospital_id', true)` as the hospital identity expression:

```sql
CREATE POLICY tenant_isolation ON "Patient"
  FOR ALL
  USING (hospital_id = current_setting('app.hospital_id', true));
```

The Edge Function sets this before executing queries (when using a non-service-role context):
```sql
-- Run at the start of each request, before any application query:
SELECT set_config('app.hospital_id', '<verified hospital_id from JWT>', true);
-- true = local to the current transaction
```

**Rejected alternative: Use Supabase's `auth.jwt()` claim to read hospital_id from JWT**

This would require verifying the custom `jose` JWT inside a Postgres function and
extracting the `hospitalId` claim. Specifically:

- Supabase's `auth.jwt()` only works with JWTs issued by Supabase Auth. Our custom JWT
  is issued by `jose` and is not recognized by Supabase's internal JWT validation.
- Extracting the claim would require either: (a) calling `auth.jwt()` after passing the
  custom JWT as the PostgREST Authorization header (requires telling PostgREST to accept
  the custom JWT's signing secret — possible but adds config complexity), or (b) writing
  a custom Postgres function that calls `jose` via a PL/v8 or pg_jsonb_path extension
  to verify and decode the JWT (fragile, hard to test, requires custom Postgres extensions).
- Coupling the RLS policy to the JWT shape makes future JWT structure changes also
  require RLS policy changes — tight coupling across two systems.
- `current_setting('app.hospital_id', true)` is simpler, testable, and decouples
  JWT structure from DB policy.

**Chosen: `current_setting('app.hospital_id', true)`**

The `true` parameter (missing-ok flag): if `app.hospital_id` is not set in the current
session (e.g., a direct PostgREST query without the session variable set), the function
returns NULL instead of raising an error. `hospital_id = NULL` is always false (SQL
three-value logic), so uninitialized sessions are denied by default.

---

### Decision 3: Keep service_role key in Edge Functions (RLS bypassed for Edge Function queries)

Edge Functions continue using the Supabase service_role key. The Postgres `service_role`
role has `BYPASSRLS = TRUE`, meaning RLS policies do NOT apply to Edge Function queries.

**Rejected alternative: Create a dedicated `app_api` Postgres role without BYPASSRLS**

This approach would:
1. Create `CREATE ROLE app_api; GRANT ALL ON ALL TABLES ... TO app_api;`
2. Edge Functions connect with service_role, then run `SET LOCAL ROLE app_api; SET LOCAL app.hospital_id = X;` in each transaction.
3. Within that transaction, RLS applies because `app_api` is not BYPASSRLS.

| Factor | service_role (keep) | app_api role (new) |
|---|---|---|
| RLS enforcement from Edge Functions | None (bypassed by BYPASSRLS) | Full — catches repository bugs |
| Repository-layer WHERE clause | Required (primary enforcement) | Redundant but still good practice |
| Implementation complexity | Zero (no change) | Moderate: each Edge Function transaction must `SET LOCAL ROLE` + `SET LOCAL app.hospital_id` |
| Transaction overhead | None | One extra SQL statement per request |
| Risk of misconfiguration | Low | Moderate: if `SET LOCAL ROLE` is forgotten in one function, that function reverts to service_role which bypasses RLS — silent failure |
| Testing | No change needed | Must add integration tests for each function's role-switching behavior |

**Rationale**: The project is currently at 0% test coverage (L-1). Adding a role-switching
mechanism that fails silently (reverts to BYPASSRLS if forgotten) would create a false sense
of security without the test infrastructure to verify it works. The safer path is:
- Keep service_role + mandatory explicit WHERE hospital_id = ? (repository pattern enforces this)
- RLS provides defense-in-depth for the anon-key paths (Realtime, any direct PostgREST access)
- Revisit app_api role when: (a) test infrastructure is in place (Phase 6 mandates Vitest + Deno test runner), AND (b) the team has verified that `SET LOCAL ROLE` is called correctly in every Edge Function

**Consequence**: The RLS policies in `20260921120000` protect against:
- Direct PostgREST calls with anon key (uninitialized `app.hospital_id` = default-deny)
- Direct `psql` access with the anon or authenticated role

They do NOT protect against:
- Edge Function queries using service_role (bypassed by BYPASSRLS)

Cross-tenant isolation for Edge Function queries depends solely on the repository pattern:
every repository constructor accepts `hospitalId` from the verified JWT and appends
`WHERE hospital_id = ?` to every query. A repository that skips this will not be caught
by RLS, only by a code review or integration test.

---

## Revisit When

- Test infrastructure reaches sufficient coverage to verify `SET LOCAL ROLE` behavior
  in integration tests (likely Phase 6 or 7, per implementation order in §12 of Phase 2).
- The team adds a second hospital tenant and wants an independent audit of the
  tenant isolation implementation before enabling the second hospital.
- A compliance audit (DPDP) requires demonstrating DB-level enforcement of tenant isolation
  independent of application code.

---

## References

- ADR-002: Authorization enforcement (hybrid model, RLS for tenant isolation)
- Phase 2 §9: Database design overview (hospital_id on every table)
- Phase 4 §4: Schema analysis finding — hospital_id absent from all tables
- Migration `20260921110000`: hospital_id backfill
- Migration `20260921120000`: RLS tenant isolation policies
