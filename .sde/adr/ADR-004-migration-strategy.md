# ADR-004: Migration Strategy (Strangler-Fig vs Big-Bang Rewrite)

**Date:** 2026-09-21  
**Status:** Accepted  
**Deciders:** Mahendhar (project owner), Staff Architect (SDE-5)  
**Phase:** Phase 2 — Architecture Design

---

## Context

docsile-hms is a live, production Hospital Management System with:
- 18 modules in active use across real hospital tenants
- ~60,000 LOC (229 server-action functions across 17 action files)
- Safety-critical downtime impact — downtime during patient care is a safety risk
- 4 Critical and 6 High security issues that must be closed in the new architecture
- A 2-5 engineer team (currently solo) performing the migration

The migration goal is to move from Next.js App Router (Server Actions, no separate API) to a decoupled React SPA + dedicated API backend. This is a full frontend/access-layer rebuild.

Two migration strategies are credible:

**Big-bang rewrite**: Build the entire new system in parallel, then cut all 18 modules over in a single release event. Hospital tenants experience the new system all at once.

**Strangler-fig (module-by-module)**: The new system runs alongside the old system. Modules are migrated one at a time. A routing layer directs traffic for each module to either the old (Next.js) handler or the new (API backend) handler, module by module. The old system is decommissioned progressively as each new module passes acceptance criteria.

---

## Decision

**Strangler-fig migration, module by module**, with the old Next.js system remaining live until all modules have passed acceptance criteria on the new architecture.

Modules are migrated in risk order: low-risk, read-heavy modules first (analytics, call-logs, reports); patient-care and queue next; transactional safety-critical modules last (billing, pharmacy).

---

## Reasoning

1. **The safety-critical availability NFR rules out big-bang.** A big-bang cutover of 229 server-action functions, 18 modules, and the auth layer simultaneously carries an extremely high regression risk. A regression in billing or pharmacy-inventory on a live hospital system is not a "we rolled back" situation — patient care may have proceeded based on incorrect data between the bad deploy and the rollback. The RPO is 60 minutes — meaning billing data created in the 60 minutes before a required rollback may be lost.

2. **No test infrastructure exists.** The codebase has 0% test coverage (L-1). Building tests is a deliverable of the migration itself (part of Wave 1). Without existing tests, a big-bang cutover has no automated regression gate — acceptance testing would be entirely manual, which is insufficient for 18 modules.

3. **The strangler-fig pattern aligns with the acceptance criteria in the PRD.** The PRD states: "Every currently-working hospital workflow works end-to-end on the new architecture before its corresponding Next.js module is retired." This is literally a description of the strangler-fig acceptance gate.

4. **Module migrations can proceed concurrently once the shared kernel is in place.** The shared kernel (auth middleware, permissions, logger, types, shared-lib functions) is built in Wave 1. After that, up to 2-3 engineers can migrate different modules in parallel, each working within their module's clean boundary. Big-bang forces all engineers to converge on a single "all done" gate before any user-visible progress is available.

5. **The 4 Critical security fixes can be deployed earlier in strangler-fig.** The new auth middleware (JWT 15-min tokens, jti revocation, permission guard) can be deployed in Wave 1 and covers all new-system endpoints. The old Next.js endpoints remain on the old auth during the migration window. When a module migrates to the new API, it automatically gains the fixed auth. Big-bang would require either (a) fixing the old system first (patching twice, as the PRD says the owner does not want to do) or (b) waiting until the full rewrite is complete.

6. **Big-bang's one genuine advantage (single cutover event, shorter parallel-systems period) does not outweigh the risks** for a system with safety-critical impact, no existing tests, and a small team. The parallel-systems period (old Next.js + new API running simultaneously) is a cost the strangler-fig approach accepts — it is bounded by the migration timeline (~18 weeks) and manageable with the proposed module-by-module wave plan.

---

## Alternatives Considered

| Option | Team Fit | Scale Fit | Compliance | Cost | Ecosystem | Ops | Total | Notes |
|--------|---|---|---|---|---|---|---|---|
| **Strangler-fig, module by module (chosen)** | **5** | **5** | **5** | **4** | **5** | **4** | **28** | Continuous delivery of working software; each module tested before old system decommissioned; critical fixes deployed early; regression risk bounded to one module at a time |
| Big-bang rewrite | 3 | 4 | 2 | 5 | 4 | 5 | 23 | Single cutover is simpler operationally (no parallel systems); but: extremely high regression risk for safety-critical system with 0% existing test coverage; any bug in billing/pharmacy at cutover is a patient-safety incident |
| Strangler-fig + shadow mode (run both and compare) | 4 | 4 | 4 | 2 | 4 | 3 | 21 | More thorough validation (compare old vs new outputs for the same request); too complex for a 2-5 engineer team without dedicated infra tooling; cost of running parallel DB writes is non-trivial; compliance issue (writing real patient data twice to two systems) |

---

## Consequences

### Positive
- Each module is fully tested and accepted before the old system's module is retired. Zero risk of a "whole-system regression on cutover day."
- Critical security fixes (C-1, C-2, C-3, H-1, H-2) are deployed on the new API as Wave 1 completes — before any module migration completes. The security posture improves continuously, not only on big-bang day.
- Hospital tenants see incremental improvements (faster modals, real-time queue) as each module migrates. They do not wait 18 weeks for all improvements simultaneously.
- Engineers work in parallel on different modules once the shared kernel is in place — the migration timeline is bounded by the slowest sequential dependency (patient-care), not by the sum of all module timelines.
- A regression in one module during migration does not affect other modules — the old system continues to serve the unaffected modules.

### Negative / Trade-offs
- **Parallel systems period**: both the old Next.js system and the new API backend must be deployed and maintained simultaneously for ~14-18 weeks. Two systems to monitor, two deploy pipelines to maintain during the transition.
- **Routing complexity**: a mechanism is needed to direct traffic for each module to either the old or new handler. This can be as simple as: new modules at `/v1/...` (new API), old modules at `/...` (Next.js), with the SPA routing updated as each module migrates. No complex feature-flag routing infrastructure required.
- **Data consistency during parallel operation**: during the migration, both systems write to the same Supabase database. This is safe because: the new API and the old Next.js system both use the Supabase service-role key, both write to the same tables, and the old system's endpoints are retired module by module rather than running in duplicate. There is no dual-write scenario — at any point in time, each module's writes go to exactly one system (old or new).
- **Longer total migration timeline** vs. big-bang. Estimated 18 weeks for full completion vs. ~10-12 weeks for a concentrated big-bang effort. The risk reduction justifies the extended timeline for a safety-critical system.

### Neutral
- The database schema does not change in the migration — only the access layer. This means both old and new systems read/write the same schema without conflict.

---

## Migration Wave Plan (Summary)

| Wave | Weeks | Modules | Risk Level |
|---|---|---|---|
| Wave 1 | 1-4 | Shared kernel, auth middleware, permission guard, RLS policies, call-logs, license-tracker, analytics | Low |
| Wave 2 | 5-10 | patient-care (patients + inpatients merged), staff, settings, doctor, queue (real-time) | Medium |
| Wave 3 | 11-16 | billing, pharmacy, labs, optical, insurance, dues-followups, expenses | High (safety-critical) |
| Wave 4 | 17-18 | reports, dashboard, final decommission of Next.js app | Low |

Each module exits Wave N only after:
1. All business-logic functions tested at >80% coverage
2. End-to-end workflow verified against real (or realistic staging) hospital data
3. Critical/high security issues for that module confirmed closed
4. Old Next.js module decommissioned and Next.js routing updated

---

## Revisit When

This decision does not have a revisit condition — the migration is a bounded, time-limited project. Once complete, the old Next.js system is decommissioned and this ADR is historical. If a future migration (e.g. from the new API backend to a different framework) is needed, start a new architecture phase.

---

## Implementation Notes

**Routing during migration** (no complex feature-flag infrastructure needed):
- New API backend runs at a separate origin (e.g. `api.docsile.in` or a separate Vercel deployment).
- The React SPA is the single client for all modules. As each module migrates, the SPA's data-fetching layer is updated to call `/v1/<module>` on the new API instead of the old Server Action.
- Old Next.js pages remain deployed and functional for unmigrated modules — accessible by navigating to the old URL directly (for rollback safety during migration).
- Once a module's SPA integration is complete and accepted, the old Next.js page for that module is removed from the Next.js codebase.

**Acceptance gate checklist per module**:
```
[ ] All server-action functions replaced by API endpoints
[ ] Permission guard declared on every endpoint
[ ] Business-logic service functions tested at >80% coverage
[ ] End-to-end workflow tested: happy path + error path + permission boundary
[ ] PII redacted from all log lines in this module
[ ] Old Next.js module routes removed from Next.js app
[ ] Monitoring alerts confirmed working for this module's endpoints
```

---

## References

- `.sde/phases/0-idea.md` — risk table: "Full rewrite of 229 server actions: High risk, High impact. Mitigation: strangler-fig."
- `.sde/phases/1-prd.md` — acceptance criteria: "every currently-working workflow works end-to-end on the new architecture before its corresponding Next.js module is retired"
- `.sde/phases/0-analysis.md` — L-1: zero test infrastructure; issues by severity
- `.sde/phases/2-architecture.md` Section 12 — implementation order (wave plan)
