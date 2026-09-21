# ADR-003: Real-time Delivery Mechanism

**Date:** 2026-09-21  
**Status:** Accepted  
**Deciders:** Mahendhar (project owner), Staff Architect (SDE-5)  
**Phase:** Phase 2 — Architecture Design

---

## Context

A named NFR: real-time updates for queue-status, bed-availability, and appointment-board across multiple staff screens simultaneously. Multiple reception terminals and doctor screens must see queue changes and bed assignments within ~200ms of a write, without polling.

The existing Next.js system does not implement this — screens require a manual refresh to see queue changes. The new architecture must build this as a first-class feature.

Three delivery mechanisms were credible given the project's NFRs (free tier, 2-5 engineers, Supabase already in use):

---

## Decision

**Supabase Realtime** — the client SPA subscribes to hospital-scoped Realtime channels directly using the Supabase client library. Postgres change-data-capture (logical replication) detects writes to queue/bed/appointment tables and broadcasts the change payload to all subscribed clients on the matching channel. The API backend remains stateless (no persistent WebSocket connections to manage in the API process).

---

## Reasoning

1. **Supabase Realtime is included in the free tier.** There is no additional service to host, pay for, or operate. A WebSocket server or SSE endpoint requires either a dedicated process (which needs hosting) or integration with the API server (which makes it stateful and harder to scale-out or restart).

2. **Postgres change-data-capture means real-time reflects committed state.** When the queue is updated via a Postgres transaction, Supabase Realtime picks up the committed row state and broadcasts it. There is no gap between "the API returned 200" and "the Realtime event fires" — they reflect the same committed state. With a custom WebSocket or SSE solution, the developer must explicitly emit the event after the write, introducing a possible failure mode where the write succeeds but the event is never emitted.

3. **Stateless API layer.** The API backend has no persistent connections to maintain. It writes to Postgres, returns HTTP responses, and is done. Realtime delivery is entirely handled by Supabase's infrastructure. This means the API layer can be restarted, scaled, or redeployed without disrupting active Realtime subscriptions — clients reconnect to Supabase Realtime directly, not to the API server.

4. **Hospital-scoped channels enforce tenant isolation at the broadcast layer.** Each hospital subscribes to `hospital:{hospitalId}:queue`, `hospital:{hospitalId}:beds`, etc. A client subscribed to hospital A's channel cannot receive hospital B's events. Channel naming convention is the first enforcement layer; RLS tenant isolation policies on the underlying tables are the second enforcement layer.

5. **Automatic reconnect and fallback designed in.** The Supabase Realtime client SDK handles reconnection automatically. The architecture specifies a polling fallback (`GET /v1/queue?since=...` every 5 seconds) for the case where Realtime is disconnected for any reason — this ensures staff screens degrade gracefully rather than silently showing stale state.

6. **p95 latency analysis.** Supabase Realtime delivery from Postgres commit to client event is typically 100-300ms in the same region. The India-hosted Supabase project (ap-south-1 or equivalent) means client-to-Supabase RTT is low. The total felt latency (API write + CDC pickup + broadcast + client render) is approximately 200-400ms p95, which satisfies the "sub-200ms feel" NFR for queue/bed/appointment updates.

---

## Alternatives Considered

| Option | Team Fit | Scale Fit | Compliance | Cost | Ecosystem | Ops | Total | Notes |
|--------|---|---|---|---|---|---|---|---|
| **Supabase Realtime (chosen)** | **5** | **4** | **4** | **5** | **5** | **5** | **28** | Free tier, Postgres-backed, stateless API, automatic reconnect, consistent with managed-data-tier pattern |
| Custom WebSocket server | 3 | 5 | 4 | 2 | 4 | 2 | 20 | Requires separate hosted process (costs money or adds Ops complexity); developer must emit events explicitly after writes (reliability risk); API layer becomes stateful |
| Server-Sent Events (SSE) | 4 | 3 | 4 | 3 | 3 | 3 | 20 | Simpler than WebSocket; no persistent server process needed if integrated into API handlers; but: serverless environments (Vercel) have strict connection timeout limits (30-60s) that break long-lived SSE connections; one-directional only (fine for this use case, but no upgrade path to bidirectional); requires developer to emit events after writes (same reliability risk as custom WS) |
| Polling only (no real-time) | 5 | 3 | 5 | 5 | 5 | 5 | 28 | Trivially simple and reliable; but: queue/bed updates at 2-5s polling frequency is perceptibly laggy in a busy clinic; ties with Supabase Realtime on total score but fails the "sub-200ms feel" NFR explicitly — ruled out on functional grounds |

Polling is scored equal to Supabase Realtime on the rubric but is excluded because it does not satisfy the stated real-time latency NFR. The real-time delivery mechanism is a functional requirement, not a nice-to-have.

---

## Consequences

### Positive
- Queue/bed/appointment updates are visible across all staff screens within ~200-400ms of a write, with no manual refresh.
- API backend is fully stateless — no persistent WebSocket connections to manage, no state lost on API restart.
- Supabase Realtime is included in the free tier — zero additional infra cost.
- Developers do not need to explicitly emit events after writes — Postgres CDC handles detection automatically, eliminating the "write succeeded but event never fired" failure mode.
- The client-side Realtime subscription and the HTTP data-fetching cache are separate concerns — the Realtime events patch the client cache, not the other way around. This means offline clients (no Realtime connection) still work via HTTP polling; the Realtime channel is an optimization layer, not a dependency.

### Negative / Trade-offs
- **Supabase Realtime is a managed dependency.** If Supabase Realtime is unavailable (independent of Postgres being available), the polling fallback takes over at 5-second intervals. This degraded mode is visible to staff (the "live updates paused" indicator) but does not block patient care operations.
- **Filtering is coarser than custom WebSocket.** Supabase Realtime broadcasts the full row change to all channel subscribers. If the broadcast payload contains columns with patient PII, those fields must be carefully controlled (either via a view that excludes PII columns, or by filtering the payload server-side using Supabase's `columns` broadcast filter). The implementation must never broadcast raw patient records on a Realtime channel — only status fields (queue position, bed status, appointment slot status) that are non-PII.
- **Free tier Realtime connection limits.** Supabase free tier has a limit on concurrent Realtime connections (200 as of current documentation). At <20 hospitals with tens of staff per hospital, total concurrent connections are well within this limit. Monitor and upgrade to paid tier if approaching the limit.
- **Realtime is Supabase-specific.** If the project ever migrates away from Supabase, the Realtime integration must be replaced. The architecture isolates this concern in a `shared-kernel/realtime-helpers` module so the Supabase-specific subscription code is not scattered across all feature modules.

### Neutral
- The Supabase Realtime channel uses the Supabase anon key on the client side (not the service-role key). RLS policies apply to anon key queries, enforcing tenant isolation at the broadcast subscription level.

---

## Revisit When

- If Supabase Realtime concurrent connection limits are approached at scale (>150 concurrent sessions across all hospitals).
- If a real-time feature requires bidirectional messaging or server-push to trigger a client action (not just state broadcast) — at that point, evaluate whether Supabase Realtime's broadcast model is sufficient or whether a more capable WebSocket solution is needed.
- If the project migrates away from Supabase as the primary data store — the Realtime integration is then moot and a replacement mechanism is needed.

---

## Implementation Notes

**Channel naming convention**:
```
hospital:{hospitalId}:queue        → DoctorQueue table changes
hospital:{hospitalId}:beds         → BedAssignment table changes
hospital:{hospitalId}:appointments → Appointment table changes
```

**PII filtering** — only non-PII status fields are broadcast. Configure Supabase Realtime with column filtering:
```
-- Only broadcast status, updated_at, and non-PII keys
-- Never broadcast: patient_name, phone, diagnosis, notes
-- Configuration: in Supabase dashboard, set broadcast column allowlist per table
```

**Client-side integration** (in shared-kernel/realtime-helpers, framework-specific wiring in Phase 3):
```
subscribe(channel) {
  client.channel(channel)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'DoctorQueue' },
        (payload) => patchClientCache(payload))
    .subscribe((status) => {
      if (status === 'CHANNEL_ERROR' || status === 'CLOSED') {
        showRealtimePausedBanner()
        startPollingFallback()
      }
    })
}
```

**Polling fallback endpoint**:
```
GET /v1/queue/{hospitalId}?since={ISO8601 timestamp}
→ Returns only entries updated since the given timestamp
→ Used as fallback when Realtime is disconnected
→ Client polls every 5 seconds, reconciles with cached state
```

---

## References

- `.sde/phases/0-idea.md` — "Live updates required across staff screens for queue/bed status"
- `.sde/context.json` — `nfr.latency.realtimePaths: ["queue-status", "bed-availability", "appointment-board"]`
- `.sde/phases/2-architecture.md` Section 4.2 — real-time queue/bed data flow diagram
- ADR-001 — Modular Monolith pattern preserves stateless API layer (required for Supabase Realtime approach to work without API-side WS management)
