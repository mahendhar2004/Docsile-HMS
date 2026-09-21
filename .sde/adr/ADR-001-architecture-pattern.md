# ADR-001: Architecture Pattern Selection

**Date:** 2026-09-21  
**Status:** Accepted  
**Deciders:** Mahendhar (project owner), Staff Architect (SDE-5)  
**Phase:** Phase 2 — Architecture Design

---

## Context

docsile-hms is a live Hospital Management System (~60K LOC, 18 modules, 229 server-action functions) being migrated off Next.js App Router. The migration goals include: structural authorization enforcement, a real client-side caching layer for modal performance, clean module boundaries, and CI/CD with test coverage.

NFR signals that drive this decision:
- Team: 2-5 engineers (growing from solo)
- Scale: <20 hospital tenants by month 18, low RPS (10s per hospital, not 100s)
- Traffic: steady, business-hours-weighted
- Availability: 99.9% SLA, safety-critical downtime impact
- Budget: free-tier only (Supabase + Vercel)
- Compliance: India-DPDP (PII + health data), region-locked
- Real-time: required for queue/bed/appointment status

There is an explicit NFR conflict: `safety-critical` availability and `free-tier` budget cannot both be satisfied by self-hosted HA infrastructure. The resolution strategy is to lean on Supabase's managed HA rather than attempting to build redundancy on a $0 budget.

Two patterns scored within 1 point of each other on the weighted rubric, requiring this ADR.

---

## Decision

The target architecture uses the **Modular Monolith with Managed Data Tier** pattern: a single deployable API backend organized into 18 domain modules with enforced clean boundaries, a shared kernel for truly shared utilities, and Supabase as the managed data tier (Postgres + Realtime + Storage). A separate React SPA serves as the client layer.

---

## Reasoning

1. A modular monolith is the correct default for a 2-5 engineer team inheriting a new codebase — one deploy artifact, one CI pipeline, one codebase, no distributed-systems failure modes to learn.
2. The safety-critical availability requirement is met by Supabase's managed HA (automatic Postgres failover, PITR backups within 60-minute RPO) rather than by adding self-hosted redundancy — this resolves the NFR conflict within the free-tier constraint.
3. Compliance fit is better in the Modular Monolith: authorization logic lives in TypeScript application code under the team's full control, is testable with standard unit tests, and is auditable by any engineer. RLS policies (the BaaS-Centric alternative) are harder to test comprehensively and harder for new engineers to audit.
4. The BaaS-Centric option requires migrating from custom JWT auth to Supabase Auth (to make auth.uid() available in RLS context). This migration scope is large (rewriting the auth flow + all 229 action-level permission checks → RLS policies) and would substantially extend the migration timeline for a questionable gain given the team size.
5. Simplicity bias: Modular Monolith is simpler operationally than BaaS-Centric when the authorization model is complex (30+ fine-grained permissions with per-role defaults). The two patterns score within 1 point — the bias applies.
6. The Modular Monolith can adopt Supabase Realtime for the real-time requirement without switching to Supabase Auth — the Realtime channel subscription uses the Supabase anon key on the client side, filtered by hospital_id from the validated session.

---

## Alternatives Considered

Scored 1-5 against this project's NFR object. Team Fit and Compliance Fit are the differentiating dimensions.

| Option | Team Fit | Scale Fit | Compliance | Cost | Ecosystem | Ops | Total | Notes |
|--------|---|---|---|---|---|---|---|---|
| **Modular Monolith (chosen)** | **5** | **5** | **4** | **5** | **5** | **5** | **29** | One deploy, one pipeline, conventional layering for growing team |
| BaaS-Centric (Supabase Fullstack) | 4 | 4 | 3 | 5 | 4 | 5 | 25 | Requires Supabase Auth migration; RLS is harder to test/audit for DPDP compliance |
| Modular Monolith + Async Workers | 4 | 5 | 4 | 4 | 5 | 4 | 26 | Premature — no documented background-work bottleneck yet; graduate to this if needed |
| Serverless / FaaS | 3 | 4 | 3 | 4 | 4 | 4 | 22 | Cold-start risk on safety-critical paths; complex local dev; not better than monolith here |
| Event-Driven | 2 | 3 | 3 | 2 | 3 | 2 | 15 | No fan-out requirement — would be a monolith with extra network hops and eventual-consistency bugs |
| Microservices | 1 | 3 | 3 | 1 | 3 | 1 | 12 | Textbook over-engineering for 2-5 engineers on free-tier budget |

Note: Scoring above uses 6 dimensions consistent with profile-registry.md rubric — Team Fit, Scale Fit, Compliance Fit, Cost Fit, Ecosystem Fit, Ops Fit. The "Alternatives Considered" table in the architecture document uses the 7-column pattern table format for the architecture-principles framework; this ADR uses the profile-registry 6-column format as the more comprehensive rubric.

---

## Consequences

### Positive
- New engineers onboard into a single, conventionally-structured codebase — no distributed-systems mental model required.
- Authorization logic is in TypeScript and tested with standard unit tests — auditable and debuggable.
- Supabase Realtime can be adopted without switching auth providers — Realtime works with the anon key client-side.
- If a future module needs async background work (email, PDF generation), a `jobs` module can be added to the same codebase without changing the overall pattern.
- All 18 existing modules map 1:1 to the new module structure — no domain re-learning for the migration team.

### Negative / Trade-offs
- Cannot independently scale or deploy one module without redeploying the whole API layer. Acceptable at current scale; revisit if a specific module becomes a measured bottleneck.
- Authorization bugs in application code are possible (though the permission guard structure makes them harder than the current `requireServerPermission` convention). RLS would have provided a second, DB-level enforcement layer — that layer is only used for tenant isolation in this architecture, not for fine-grained RBAC.
- The Modular Monolith has a ceiling: if the team grows to 6+ engineers who need independent deploy pipelines per module, the pattern must evolve. The clean module boundaries make extraction to separate services tractable when that time comes.

### Neutral
- Supabase continues as the managed data tier — no infra change required for the datastore.
- The existing 30+ permission definitions and role defaults are preserved and re-enabled (not rewritten for RLS).

---

## Revisit When

Revisit this pattern decision when any of the following is true:
- Team grows to 6+ engineers organized into groups that need independent deploy pipelines (the standard inflection point for evaluating microservices).
- A compliance audit requires physical/network isolation of a specific subsystem (e.g. billing data in a separately audited environment).
- A specific module's query load is measured (not assumed) to be impacting other modules — at that point, extract that module as a service.
- The async worker need (emails, PDF exports, webhook retry queues) becomes significant enough that a worker process is clearly needed — upgrade to Modular Monolith + Async Workers, still one codebase, two runtime processes.

---

## Implementation Notes

- The API backend is a single deployable unit. All 18 domain modules live under `src/modules/`.
- The shared kernel is at `src/shared/`. ESLint rule `no-cross-module-imports` enforces that module code does not import from other modules' folders.
- Each module follows: `routes.ts | service.ts | repository.ts | types.ts` — no exceptions.
- The permission guard reads route metadata at registration time. Any route registered without a declared permission causes a startup error, not a silent pass-through.

---

## References

- `.sde/phases/0-analysis.md` — existing architecture pattern analysis
- `.sde/phases/1-prd.md` — NFR conflict documentation
- `.sde/phases/2-architecture.md` — full architecture design
- ADR-002 — Authorization enforcement location (the key differentiator between Modular Monolith and BaaS-Centric)
- `~/.sde-plugin/context/principles/architecture-principles.md` — pattern scoring methodology
