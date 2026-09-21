# ADR-005: Edge Function Auth Verification Pattern

**Date:** 2026-09-21
**Status:** Accepted
**Deciders:** Mahendhar (project owner), Staff Architect (SDE-5)
**Phase:** Phase 3 — Tech Stack

---

## Context

Phase 3 locked the backend as Supabase Edge Functions (see `3-stack.md`),
driven by the owner's explicit free-tier constraint. The `supabase-fullstack`
profile's default Edge Function template verifies requests via
`supabase.auth.getUser()`, which assumes Supabase Auth issued the session.

This project's auth is, by explicit owner decision, staying as-is: a custom
JWT (`jose`-signed) in an HttpOnly cookie (`docsile-session`), not Supabase
Auth. ADR-002 (Phase 2) already decided authorization enforcement is a
hybrid of an API-layer permission guard (primary) plus RLS tenant isolation
(defense-in-depth) — that decision assumed *some* API layer would exist to
host the guard; this ADR fixes what verifies the JWT inside that layer now
that the layer is concretely Edge Functions.

## Decision

Every Edge Function verifies the session via a shared `verifySession(req)`
helper in `supabase/functions/_shared/auth.ts`, instead of
`supabase.auth.getUser()`:

1. Parse the `docsile-session` cookie manually from the request's `Cookie`
   header (Edge Functions get a raw `Request`; there is no cookie-jar).
2. Verify it with `jose.jwtVerify()` against `AUTH_SECRET`, set via
   `supabase secrets set AUTH_SECRET=...` (an Edge Function secret — no
   hardcoded fallback ever ships; closes C-2).
3. Reject if the token's `jti` appears in the `token_revocation` table
   (closes H-1 — logout is immediate, not "valid until expiry").
4. Return `{ id, role, permissions, hospitalId }` or produce a 401 — before
   any handler business logic runs.
5. The route's declared required permission (ADR-002's structural guard)
   is checked immediately after — implemented as a wrapper every exported
   Edge Function handler must call; a CI check greps for any
   `serve(...)` call not wrapped by the guard and fails the build.

## Alternatives Considered

| Option | Team Fit | Compliance | Cost | Ecosystem | Ops | Total | Notes |
|---|---|---|---|---|---|---|---|
| **Shared `verifySession()` helper (jose) — chosen** | **5** | **5** | **5** | 4 | **5** | **24** | Reuses existing, already-understood auth code; zero migration risk; testable in Deno's test runner |
| Migrate to Supabase Auth, use `supabase.auth.getUser()` | 3 | 4 | 4 | 5 | 4 | 20 | Matches the profile default exactly, but is an auth-model migration the owner explicitly ruled out for this phase of work — out of scope, not merely lower-scored |
| Verify JWT claims inside RLS policies (custom Postgres JWT claim function) | 2 | 3 | 4 | 2 | 2 | 13 | Couples every RLS policy to the custom JWT's shape; duplicates verification logic in SQL; harder to unit test; rejected in ADR-002 already for the RBAC case, rejected again here for the same reason |

## Consequences

### Positive
- No auth-model migration risk added to an already large frontend migration.
- The existing JWT/session code (`src/lib/jwt.ts`, `src/lib/auth.ts` logic)
  ports almost directly into the shared Edge Function helper — this is
  "map the backend correctly," not "rewrite the backend."
- Auth verification is unit-testable with Deno's test runner without
  spinning up a real Supabase Auth flow.

### Negative / Trade-offs
- Slightly more code per Edge Function than the profile's default template
  (manual cookie parsing + jose verification vs. one `getUser()` call).
- The team forgoes Supabase Auth features (magic links, OAuth providers,
  built-in MFA) unless/until a future decision revisits this — acceptable
  since none of those are currently in use or requested.

## Revisit When

- If a future mobile app or OAuth/social-login requirement makes Supabase
  Auth's built-in providers valuable enough to justify the migration —
  re-evaluate alongside ADR-002's "Revisit When" conditions.

## References

- `.sde/adr/ADR-002-authorization-enforcement.md`
- `.sde/phases/3-stack.md` — Scope Steer section (owner's explicit instruction)
- `.sde/phases/0-analysis.md` — C-2 (hardcoded JWT secret), H-1 (no token revocation)
