# Phase 0 — Idea: Frontend/Stack Migration of docsile-hms

This project did not start from a blank idea (`/sde-idea` normally applies to
new projects). docsile-hms is an existing, shipping Hospital Management
System (see `.sde/phases/0-analysis.md` for the full existing-codebase audit).
This document adapts Phase 0 to a **migration initiative** inside an existing
product, so the phase gate for `/sde-architect` has the artifacts it expects.

## Problem Statement

The current Next.js App Router frontend feels slow to hospital staff during
everyday interactions (opening a modal, viewing a patient record). Root
cause analysis (Phase 0 analysis) traced this to the data-fetching pattern
(Server Actions called on-demand with zero client-side caching), not to
Next.js as a rendering engine per se — but the owner has decided, independent
of that single finding, to move the frontend to a plain React SPA with a
clean, layered structure ("MNC-grade" file/folder structure, proper test
coverage, CI/CD) ahead of onboarding 2-5 engineers over the next 6-12 months.
The existing codebase also carries 4 Critical and 6 High security issues
(disabled permission enforcement, hardcoded JWT fallback secret, no rate
limiting, no RLS, etc. — see `0-analysis.md`) that will be carried into and
fixed as part of the rebuilt system rather than patched twice.

## Target Users

| User | Need |
|---|---|
| Hospital front-desk/reception staff | Fast patient registration, search, billing — used continuously all day |
| Doctors | Fast access to patient history, workup, prescriptions during consults |
| Pharmacy/lab/optical staff | Fast order entry and status updates, often on shared terminals |
| Hospital admin/owner (tenant) | Configure modules, staff, billing, reports for their hospital |
| docsile (product owner) | Onboard new hospital customers (multi-tenant SaaS), onboard 2-5 engineers, keep infra cost near zero at current scale |

## Value Proposition

A React SPA + properly layered backend access pattern that (a) removes the
per-interaction network-round-trip feel via real client-side caching, (b)
gives new engineers a conventional, well-documented structure to onboard
into instead of a 60K-LOC Next.js monolith with leaking module boundaries,
and (c) closes the currently-disabled authorization gap as a first-class
part of the new architecture (not a patch).

## Constraints

- **Must keep infra cost near zero** at current scale: Supabase (already in
  use) + Vercel, both on free tiers today; the owner will only pay once
  hospital customers grow.
- **Multi-tenant SaaS**: already serves >1 hospital conceptually (module
  gating + subscription/billing fields exist in the admin-config shape),
  expected to grow to <20 hospital tenants by month 18.
- **Safety-critical availability**: downtime during active patient care is
  a safety issue, not just an inconvenience.
- **India DPDP Act** applies (health records = sensitive personal data);
  no formal SOC2/ISO certification required yet.
- **Team growing** from solo to 2-5 engineers in the next 6-12 months —
  the new structure must be legible to people who didn't build it.
- **Strict consistency required** for billing/payments, pharmacy/inventory
  stock, and bed/appointment/queue availability — no double-booking, no
  silently-stale stock counts.
- **Live updates required** across staff screens for queue/bed status
  (sub-200ms-feel, multi-client real-time sync), not just fast page loads.
- Existing custom JWT auth, Supabase service-role access pattern, and 229
  server-action functions across 18 modules must all be accounted for in
  the migration — this is a rebuild of the frontend/access-layer, not a
  green-field rewrite of the domain logic.

## Assumptions

- The owner is willing to treat this as a real architectural migration
  (weeks, not days) given the codebase size (~60K LOC) and the number of
  affected modules (18).
- Supabase remains the datastore; the open question is *how* the frontend
  talks to it (through Server Actions equivalent, a dedicated backend API,
  or directly via `supabase-js` + RLS) — resolved in Phase 2/3.
- Security fixes (permission enforcement, JWT secret handling, rate
  limiting, RLS) are carried into the new architecture rather than being
  patched in the current Next.js app first (owner's explicit choice).

## Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Full rewrite of 229 server actions introduces regressions in billing/clinical logic | High | High | Strangler-fig migration per module, not a big-bang cutover; test coverage gate before each module is considered done |
| Moving authorization into RLS (if that path is chosen) is a bigger conceptual shift than expected for a small team | Medium | High | Architecture phase must produce a concrete, reviewable auth flow before implementation starts |
| "Free tier only" budget collides with needing a separate backend host | Medium | Medium | Stack scoring (Phase 3) must weight budget/ops fit heavily given the explicit free-tier constraint |
| Real-time (queue/bed status) requirement adds complexity if the chosen stack doesn't have it built in | Medium | Medium | Architecture phase must explicitly design the real-time data flow, not treat it as an afterthought |

## Project Type

Existing web application (multi-tenant SaaS, B2B/internal-per-hospital),
migrating frontend architecture and (pending Phase 2/3) its data-access
layer. Not mobile, not a new product.
