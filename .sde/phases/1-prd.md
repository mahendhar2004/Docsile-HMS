# Phase 1 — PRD: docsile-hms Frontend/Access-Layer Migration

Scope: this PRD covers the **migration initiative** (move off Next.js,
fix the caching/perf pattern, close the authorization gap, adopt a
professional file structure + test/CI standards) layered onto the existing
product described in `.sde/phases/0-idea.md` and `.sde/phases/0-analysis.md`.
It is not a full product PRD for docsile-hms itself (that product already
exists and ships).

## Goals

1. Frontend no longer feels slow on common interactions (opening a modal,
   viewing/editing a patient) — solved via real client-side caching, not
   assumed to be solved by "not being Next.js."
2. New codebase structure is legible to engineers who didn't build it —
   conventional layering (features/shared/lib), no cross-module reach-ins
   like the current `patients` ↔ `inpatients` coupling.
3. Authorization is enforced where it cannot be silently disabled again
   (the current bug: `requireServerPermission()` ignores its argument).
4. Real-time queue/bed/appointment status updates across multiple staff
   screens, without hand-rolling a WebSocket layer.
5. Automated test coverage on business-critical paths (billing, patient
   registration, prescriptions, ID generation) with CI enforcing it on
   every PR.
6. All of the above fits inside the current infra budget (Supabase +
   Vercel free tiers) until customer growth justifies paid tiers.

## Non-Functional Requirements (captured via `/sde-prd`-equivalent
conversational NFR gathering, per `context/nfr-framework.md`)

```json
{
  "scale": {
    "usersMonth6": "a few hospitals, tens of staff users per hospital",
    "usersMonth18": "<20 hospital tenants",
    "peakRPS": "low (10s, not 100s, per hospital at current scale)",
    "avgRPS": "low",
    "trafficPattern": "steady, business-hours-weighted per hospital timezone",
    "dataGrowth": "medium",
    "dataGrowthNotes": "patient records, prescriptions, and billing history accumulate per hospital indefinitely; no current archival strategy"
  },
  "availability": {
    "slaTarget": "99.9",
    "downtimeImpact": "safety-critical",
    "multiRegion": false,
    "regions": ["ap-south-1 / India"],
    "rpoMinutes": 60,
    "rtoMinutes": 60
  },
  "consistency": {
    "strongConsistencyPaths": ["billing", "payments", "pharmacy-inventory-stock", "bed-availability", "appointment-slots", "queue-position"],
    "eventualOkPaths": ["dashboards", "analytics", "reports", "call-logs"]
  },
  "latency": {
    "p95ApiMs": 300,
    "realtimePaths": ["queue-status", "bed-availability", "appointment-board"]
  },
  "compliance": {
    "regimes": ["India-DPDP"],
    "dataResidency": "region-locked (India)",
    "sensitiveDataTypes": ["PII", "health"]
  },
  "budget": {
    "monthlyInfraTier": "free-tier",
    "teamSize": "2-5",
    "growthHorizonMonths": 18
  },
  "capturedAt": "2026-09-21T00:00:00Z",
  "source": "phase-1-prd"
}
```

## Explicit NFR Conflict Flagged

`budget.monthlyInfraTier = free-tier` **and** `teamSize = 2-5 (growing)`
**and** `availability.downtimeImpact = safety-critical` together create real
tension: a safety-critical SLA target normally argues for more redundancy
and a dedicated ops-managed backend, while the free-tier budget argues for
staying on managed services (Supabase) rather than adding a second service
to host, monitor, and keep available. This conflict is carried into Phase 2
(architecture pattern selection) and Phase 3 (stack scoring) rather than
silently resolved here — the architecture must show how it reconciles
"safety-critical" with "free-tier" (most realistic reconciliation: lean on
Supabase's managed HA/backup guarantees rather than trying to self-host
redundancy on a $0 budget).

## Out of Scope (this migration)

- Rewriting clinical/business logic (billing calculation rules, workup
  templates, prescription rules) — behavior is preserved, only the
  transport/caching/structure changes.
- Mobile app (not requested).
- Multi-region deployment (explicitly ruled out by NFR answers).
- Formal SOC2/ISO certification work (not required yet, per NFR answers).

## Acceptance Criteria (high level — detailed criteria per module land in
the implementation plan, not here)

- Every currently-working hospital workflow (registration, OPD/IPD,
  billing, pharmacy, labs, optical, insurance, reports) works end-to-end
  on the new architecture before its corresponding Next.js module is
  retired (strangler-fig, module by module — see Phase 0 risk table).
- The 4 Critical and 6 High issues from `0-analysis.md` are closed in the
  new architecture (not deferred).
- New modules ship with tests from day one; a coverage gate blocks merging
  business-logic code with zero test coverage.
