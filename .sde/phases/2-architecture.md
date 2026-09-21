# Phase 2 — Architecture: docsile-hms Migration Target

**Project:** docsile-hms — Hospital Management System  
**Date:** 2026-09-21  
**Architect:** Staff Software Architect (SDE-5)  
**Phase:** 2 of N (architecture design — tech-agnostic; framework names decided in Phase 3)  
**Scope:** Target architecture for migration away from Next.js App Router. Existing Supabase datastore is retained. This is a frontend/access-layer migration, not a rewrite of clinical business logic.

---

## 1. Architecture Pattern Selection

### 1.1 NFR Conflict Resolution (Required by Phase 1 PRD)

The PRD explicitly flagged: `budget.monthlyInfraTier = free-tier` AND `availability.downtimeImpact = safety-critical`. These signals pull in opposite directions — safety-critical availability normally demands redundancy and HA infrastructure that costs money.

**Resolution**: The architecture delegates availability guarantees to Supabase's managed data tier rather than attempting to self-host redundancy on a $0 budget. Supabase provides:
- Automatic database failover (Postgres primary/replica topology managed by Supabase)
- Daily PITR backups (meets the 60-minute RPO requirement)
- 99.9% uptime SLA on the data layer (source: Supabase SLA)
- Realtime pub/sub built into the same managed service

This means the application layer (the API backend and the SPA frontend) does not need to be highly available in a distributed sense — it can be stateless, redeployable on demand, and benefit from the hosting platform's restart capabilities (typically <30s). Patients are not harmed if the web server restarts briefly; they are harmed only if patient data is lost or permanently inaccessible. Supabase's managed HA addresses the data risk directly. The API layer's availability is a UX concern (brief retry), not a safety concern.

The free-tier budget is preserved by using Supabase (existing subscription) + the SPA frontend hosting platform (Phase 3 decides which, both free tier candidates).

**Data residency note**: The NFR requires India data residency (DPDP compliance). Supabase free tier uses US East region by default. If the current Supabase project is not provisioned in the India region (`ap-south-1`), this is a compliance gap that predates this migration. The architecture design cannot fix it — the project owner must confirm the Supabase project's region. On a paid Supabase plan, the India region is available. This migration should not worsen the residency posture and should include verifying the current Supabase project region as part of the Phase 0 compliance checklist.

### 1.2 Pattern Scoring Table

Scored against: team 2-5 (growing), low RPS, 99.9% SLA, safety-critical, free-tier budget, India-DPDP, steady traffic.

| Pattern | Team Size Fit | Scale Fit | Availability Fit | Compliance Fit | Budget Fit | Ops Complexity Fit | Total |
|---|---|---|---|---|---|---|---|
| **Modular Monolith** | **5** | **5** | **3** | **4** | **5** | **5** | **27** |
| BaaS-Centric (Supabase Fullstack) | 4 | 4 | 5 | 3 | 5 | 5 | 26 |
| Modular Monolith + Async Workers | 4 | 5 | 3 | 4 | 4 | 4 | 24 |
| Serverless / FaaS | 3 | 4 | 3 | 3 | 4 | 4 | 21 |
| Event-Driven | 2 | 3 | 3 | 3 | 2 | 2 | 15 |
| Microservices | 1 | 3 | 5 | 3 | 1 | 1 | 14 |

**Scoring rationale — top two:**

- **Modular Monolith (27)**: Ideal team fit for a 2-5 engineer team onboarding into a new codebase — one deploy artifact, one codebase, one CI pipeline, conventional layering. Compliance fit is 4: all authorization logic lives in application code under the team's full control, RLS policies in Supabase can be added for tenant isolation without adopting Supabase Auth (which preserves the existing custom JWT stack). Availability fit is 3 (not 5) because it still requires Supabase's HA for the data tier, but that HA is already in use. Async workers (for email/export/webhook handling) can be added later as a "graduation" without changing the core pattern.

- **BaaS-Centric (26)**: Availability fit is 5 because Supabase Realtime + RLS + managed Auth eliminates all application-layer auth bugs by construction. However, it requires migrating from custom JWT to Supabase Auth (which alone is a multi-week effort on top of the 18-module migration), and fine-grained RBAC via RLS (30+ permissions, per-role definitions) is significantly harder to write, test, and debug than application-code guards. Compliance fit drops to 3 because: health data is processed in a closed-source managed service with less control over audit trails; and RLS policy bugs in a health system are dangerous (wrong policy = cross-tenant data leak with no application-code safety net). The 1-point difference combined with the simplicity bias resolves to Modular Monolith.

**Winner: Modular Monolith with Managed Data Tier**

One note: The BaaS-Centric score is close (26 vs 27), and the authorization enforcement decision between these two patterns is captured as a standalone ADR (ADR-002) because it is the most consequential implementation-level choice that spans both patterns. The authorization decision (API-layer guard vs DB-layer RLS vs hybrid) is independent of the pattern label and deserves explicit scoring.

**Async workers**: Not included in the baseline architecture. The current scope (migration of existing 229 server actions) does not have a documented background-work need that blocks the migration. Email sending, PDF generation, and webhook processing exist but are currently synchronous. The migration can add async workers as a module-level concern (e.g. a `jobs` module in the same monolith codebase) if specific modules need it during implementation. There is no need to pre-solve this for the pattern selection.

**Revisit trigger for this pattern**: Revisit when (a) a single module has a measurably different scaling profile from the rest (e.g. analytics queries blocking patient registration), OR (b) team grows to 6+ engineers who need independent deploy pipelines per domain, OR (c) a compliance regime (e.g. PCI-DSS) requires physical isolation of the billing subsystem.

---

## 2. Architecture Overview

### 2.1 Component Diagram

```
┌───────────────────────────────────────────────────────────────────────┐
│                          CLIENT LAYER                                 │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │                React SPA (Web Application)                      │  │
│  │                                                                 │  │
│  │  Feature modules (18): patient-care | billing | pharmacy |      │  │
│  │    labs | optical | insurance | queue | doctor | staff |        │  │
│  │    settings | analytics | reports | workup | expenses |         │  │
│  │    dues-followups | call-logs | license-tracker | dashboard      │  │
│  │                                                                 │  │
│  │  ┌──────────────────────┐  ┌──────────────────────────────────┐ │  │
│  │  │  Client-side data    │  │  Real-time subscription client   │ │  │
│  │  │  cache layer         │  │  (Supabase Realtime over WS)     │ │  │
│  │  │  (server-state mgr)  │  │  queue | bed | appointment       │ │  │
│  │  └──────────┬───────────┘  └──────────────┬───────────────────┘ │  │
│  └─────────────┼─────────────────────────────┼─────────────────────┘  │
└────────────────┼─────────────────────────────┼────────────────────────┘
                 │ HTTPS/REST (v1/...)          │ WebSocket (wss://)
                 │ JSON API, HTTP-only cookies  │ hospital-scoped channels
┌────────────────┼─────────────────────────────┼────────────────────────┐
│                ▼           API LAYER          │                        │
│                                               │ (managed by Supabase)  │
│  ┌────────────────────────────────────────┐   │                        │
│  │  Mandatory request pipeline            │   │                        │
│  │  (every registered route passes        │   │                        │
│  │  through all three layers — no bypass) │   │                        │
│  │                                        │   │                        │
│  │  1. Auth middleware                    │   │                        │
│  │     - Verify JWT signature             │   │                        │
│  │     - Check jti revocation list        │   │                        │
│  │     - Extract session (user, hospital, │   │                        │
│  │       permissions[], role)             │   │                        │
│  │     - Attach to request context        │   │                        │
│  │                                        │   │                        │
│  │  2. Permission guard                   │   │                        │
│  │     - Every route declares its         │   │                        │
│  │       required permission at           │   │                        │
│  │       registration time                │   │                        │
│  │     - Guard reads declared permission  │   │                        │
│  │       from route metadata — not from   │   │                        │
│  │       the handler itself               │   │                        │
│  │     - Throws 403 if session does not   │   │                        │
│  │       include the required permission  │   │                        │
│  │     - Unregistered permission = 403,   │   │                        │
│  │       never 200                        │   │                        │
│  │                                        │   │                        │
│  │  3. Rate limiter (login: 5/min/IP;     │   │                        │
│  │     API: 100/min/user)                 │   │                        │
│  └────────────────┬───────────────────────┘   │                        │
│                   │                            │                        │
│  ┌────────────────▼───────────────────────┐   │                        │
│  │             Module Layer               │   │                        │
│  │                                        │   │                        │
│  │  patient-care  │  billing  │ pharmacy  │   │                        │
│  │  labs  │  optical  │  insurance        │   │                        │
│  │  queue │  doctor  │  staff │  settings │   │                        │
│  │  analytics │  reports │  workup        │   │                        │
│  │  expenses │  dues-followups            │   │                        │
│  │  call-logs │  license-tracker          │   │                        │
│  │                                        │   │                        │
│  │  Rules:                                │   │                        │
│  │  - No module imports another module's  │   │                        │
│  │    internal files                      │   │                        │
│  │  - Cross-module data: shared kernel    │   │                        │
│  │    functions or inter-module API calls │   │                        │
│  │  - Each module owns its DB tables      │   │                        │
│  └────────────────┬───────────────────────┘   │                        │
│                   │                            │                        │
│  ┌────────────────▼───────────────────────┐   │                        │
│  │            Shared Kernel               │   │                        │
│  │  auth | permissions | hospital-profile │   │                        │
│  │  service-templates | dropdown-options  │   │                        │
│  │  logger (structured + PII-redacting)   │   │                        │
│  │  errors | types | id-generators        │   │                        │
│  │  realtime-helpers | idempotency        │   │                        │
│  └────────────────┬───────────────────────┘   │                        │
└───────────────────┼────────────────────────────┼────────────────────────┘
                    │ Supabase service-role key   │ Supabase anon key
                    │ (API backend → Supabase)    │ (Realtime → client)
┌───────────────────┼────────────────────────────┼────────────────────────┐
│                   ▼      DATA LAYER             ▼                       │
│                       (Supabase — managed)                              │
│  ┌──────────────────────┐  ┌───────────────────┐  ┌──────────────────┐ │
│  │  PostgreSQL (primary) │  │  Supabase Realtime│  │  Object Storage  │ │
│  │                      │  │  (Postgres-backed  │  │  (reports, docs, │ │
│  │  RLS policy scope:   │  │   pub/sub)         │  │   printed PDFs)  │ │
│  │  tenant isolation    │  │                   │  │  Private buckets │ │
│  │  only (hospital_id   │  │  Channels:         │  │  per hospital    │ │
│  │  row filter on all   │  │  hospital:{id}:    │  └──────────────────┘ │
│  │  tables). Fine-grain │  │    queue           │                       │
│  │  RBAC enforced by    │  │    beds            │  External services:   │
│  │  API layer guard,    │  │    appointments    │  Exotel (webhook)     │
│  │  not RLS policies.   │  └───────────────────┘  Gemini (AI)          │
│  └──────────────────────┘                                               │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.2 What the Diagram Communicates

The diagram has three key structural decisions embedded in it:

1. **Authorization is structurally non-bypassable** (addresses C-1): The permission guard reads its required permission from route *metadata* set at registration time, not from code the handler calls. A handler that was registered without declaring a permission cannot be reached at all — the guard will reject it. A new route added to the codebase will not compile/register unless it declares its permission. This is not convention; it is type-system enforcement.

2. **Real-time is a client-side concern** (addresses real-time NFR): The SPA subscribes to Supabase Realtime directly (using the Supabase anon key with hospital-scoped channels). The API layer does not maintain WebSocket connections. When the API layer writes a queue or bed update, Supabase Realtime picks up the Postgres change-data-capture event and delivers it to all subscribers. The API layer remains stateless and restartable without interrupting live clients beyond a brief reconnect (Supabase Realtime client reconnects automatically).

3. **Module boundaries are enforced by rules, not convention** (addresses cross-module coupling): The shared kernel contains the lifted shared functions (hospital-profile, service-templates, dropdown-options — currently duplicated across patients/inpatients/settings). A lint rule (`no-cross-module-imports`) enforces that module code never directly imports another module's internal files. Inter-module data needs are satisfied by shared kernel functions or by calling the other module's public API endpoint.

---

## 3. Module Breakdown and Responsibilities

### 3.1 Structural Rule: What a Module Is

Each module is a self-contained folder with:
- `routes.ts` — API endpoint definitions with permission declarations
- `service.ts` — Business logic (pure functions, no HTTP concerns)
- `repository.ts` — All Supabase DB calls for this module's tables
- `types.ts` — Input/output schemas (validated at request boundary)
- No imports from other modules' internal files

### 3.2 Module Responsibilities

| Module | Owns (DB tables) | Provides (API endpoints) | Depends on (shared kernel / inter-module API) |
|---|---|---|---|
| patient-care | Patient, PatientVisit, Admission, Bed, IpNumber sequences | Patient CRUD, search, admission, discharge, bed-assignment | hospital-profile (shared), dropdown-options (shared) |
| billing | Bill, BillItem, Payment | Create bill, add item, record payment, print receipt | patient-care (patient context), service-templates (shared) |
| pharmacy | MedicineMaster, PharmacyStock, PharmacySale | Stock management, dispensing, billing integration | service-templates (shared), billing (charge posting) |
| labs | LabOrder, LabResult, LabTestMaster | Order tests, record results, print report | patient-care (patient context), billing (charge posting) |
| optical | OpticalOrder, OpticalPrescription | Optical order management, lens tracking | patient-care (patient context), billing (charge posting) |
| insurance | InsuranceClaim, InsuranceCompany | Claim filing, status tracking, TPA management | billing (bill reference) |
| queue | DoctorQueue | Queue add/remove/reorder, real-time state | patient-care (patient lookup) |
| doctor | Doctor, Workup, WorkupTemplate | Doctor CRUD, workup entry, AI assist | patient-care (patient context), analytics (AI context via shared kernel AI helper) |
| staff | StaffMember, Role | Staff CRUD, role assignment | permissions (shared) |
| settings | HospitalConfig, ServiceTemplateConfig, DropdownConfig | Module config, template management | service-templates (shared), dropdown-options (shared) |
| analytics | (read-only views over other modules) | Dashboard aggregates, trends | All modules (read-only, eventually consistent OK) |
| reports | (read-only export) | Generate and store reports as PDFs | All modules (read-only), Object Storage |
| workup | WorkupEntry | Clinical workup CRUD | patient-care, doctor (template lookup) |
| expenses | Expense | Hospital expense tracking | staff (attribution) |
| dues-followups | DueRecord, FollowUp | Dues dashboard, follow-up scheduling | patient-care, billing |
| call-logs | CallLog | Exotel webhook ingestion, call search | patient-care (phone-to-patient match) |
| license-tracker | LicenseRecord | License expiry tracking per hospital | — |
| dashboard | (no DB tables) | Aggregated landing-page stats | Pulls from analytics module API |

### 3.3 Shared Kernel Contents

The shared kernel is the ONLY place that modules may import from outside their own folder. It is not a dumping ground — it contains only functions that are genuinely needed by three or more modules.

| Shared function | Lifted from (current codebase) | Used by modules |
|---|---|---|
| `getHospitalProfile(hospitalId)` | `inpatients/actions.getHospitalProfileForReceipts` (currently duplicated in pharmacy too) | billing, pharmacy, labs, optical, reports |
| `getServiceTemplates(hospitalId, options?)` | `patients/actions.getServiceTemplates` AND `settings/actions.getServiceTemplates` (currently duplicated) | billing, pharmacy, labs, optical |
| `getDropdownOptions(hospitalId, category)` | `patients/actions.getDropdownOptions` | patient-care, settings, workup |
| `verifyToken(cookieValue)` | `lib/jwt.ts` | auth middleware (central use only) |
| `checkPermission(session, permission)` | `lib/permissions.ts` | permission guard (central use only) |
| `nextSequenceValue(sequenceName)` | `lib/id-generators.ts` (currently TOCTOU-unsafe) | patient-care (patient/IP/prescription IDs) |
| `structuredLogger` | (new — replaces console.log calls) | all modules |
| `redactPII(obj, fields)` | (new — for log safety) | logger |
| `idempotencyCheck(key)` | (new) | billing, pharmacy (critical mutations) |

**Note on patients/inpatients merger**: The current `patients` and `inpatients` modules are semantically a single bounded context (patient lifecycle: OPD visit through IPD admission through discharge). The cross-module coupling in the current codebase (10 direct cross-boundary imports, `patients/PatientsPage.tsx` rendering `InPatientAdmissionForm` directly) reflects this. The target architecture merges them into a single `patient-care` module that owns the full patient lifecycle. This is not a controversial decision — it is the correct bounded context. There is no ADR because there is no credible alternative that keeps them separate without immediately recreating the coupling problem.

---

## 4. Critical Data Flow Diagrams

### 4.1 Patient Registration → Billing

```
Client (Reception staff)
    │
    │  POST /v1/patients  { name, phone, type:OPD, ... }
    ▼
Auth Middleware
    │  - Verify JWT cookie
    │  - Extract session: { userId, hospitalId, permissions: ["patient:create"] }
    ▼
Permission Guard
    │  - Route requires "patient:create"
    │  - Session has "patient:create" → PASS
    ▼
Rate Limiter → PASS (not login endpoint)
    ▼
patient-care/routes.ts → patient-care/service.ts
    │
    │  1. Validate input (schema validation at boundary)
    │  2. Check phone uniqueness (within hospital)
    │  3. Generate patient ID:
    │     shared-kernel/id-generators.nextSequenceValue("patient_id")
    │     → Postgres: SELECT nextval('patient_id_seq_{hospitalId}')
    │     (atomic, concurrent-safe — H-3 fixed)
    │  4. INSERT Patient row (hospitalId scoped)
    │     → Supabase service-role key
    │     → RLS tenant-isolation policy allows insert for this hospitalId
    ▼
patient-care/service.ts → billing/service.ts (inter-module API call)
    │
    │  POST /v1/billing/bills/initiate  { patientId, billType:OPD }
    │  (internal call from patient-care service, authenticated via service-to-
    │   service internal token — not exposed to client directly)
    │
    │  1. Validate patientId exists (owns the check — reads from patient-care
    │     via public API, not direct DB cross-module import)
    │  2. Fetch service templates:
    │     shared-kernel/getServiceTemplates(hospitalId)
    │     → Cached in server memory (30-min TTL)
    │  3. CREATE Bill row, attach applicable service items
    │  4. Return billId
    ▼
patient-care/service.ts
    │  Compose response: { patient, billId, patientNumber }
    │  201 Created
    ▼
Client
    │  Cache response in client data cache layer
    │  Key: patients:{hospitalId}:{patientId}
    │  Invalidate: patients-list:{hospitalId}
    │
    │  Navigate to patient detail (data already in cache — no second fetch)
```

**Strong consistency guarantee**: The patient INSERT and bill CREATE happen in the same Postgres transaction (or in a two-step with explicit rollback if billing fails). If billing fails, the patient record is also rolled back — no orphaned patient with no bill. This addresses the consistency NFR for billing.

### 4.2 Real-time Queue / Bed Status Path

```
Doctor marks patient as "Seen" (removes from queue)
    │
    │  PATCH /v1/queue/{hospitalId}/entries/{queueEntryId}
    │       { status: "seen" }
    ▼
Auth middleware → permission guard ("queue:update") → rate limiter
    ▼
queue/service.ts
    │  1. UPDATE DoctorQueue SET status='seen', seen_at=now()
    │     WHERE id = queueEntryId AND hospital_id = hospitalId
    │     (tenant isolation enforced both by RLS and by explicit WHERE clause)
    │  2. Return 200 OK with updated entry
    ▼
Postgres (Supabase)
    │  Row update committed
    │  Supabase Realtime (PostgreSQL logical replication / change data capture)
    │  detects the row change on the DoctorQueue table
    ▼
Supabase Realtime broadcasts to channel:
    hospital:{hospitalId}:queue
    │
    │  Payload: { event: "UPDATE", table: "DoctorQueue", new: { id, status: "seen", ... } }
    ▼
All connected clients subscribed to hospital:{hospitalId}:queue
    │  (Reception screen, doctor screen, waiting-room display, any open tab)
    │
    │  Client-side Realtime handler:
    │  1. Receive UPDATE event
    │  2. Find queueEntryId in client cache
    │  3. Patch cached entry: { status: "seen" }
    │  4. React re-renders queue list — removes entry from active queue
    │     (no network fetch required — state change delivered via Realtime)
    │
    │  End-to-end latency:
    │    API write: ~50ms
    │    CDC pickup + broadcast: ~100-200ms (Supabase Realtime SLA)
    │    Client patch + render: ~16ms
    │    Total P95 felt latency: ~200-400ms — satisfies "sub-200ms feel" NFR
    │    (actual numbers depend on India region network path)
    ▼
Same pattern for bed assignments:
    hospital:{hospitalId}:beds → BedAssignment table changes
    
Same pattern for appointment board:
    hospital:{hospitalId}:appointments → Appointment table changes

Fallback when Realtime disconnects:
    Client detects CHANNEL_ERROR or CLOSED event on Supabase Realtime client
    → Shows "Live updates paused" indicator
    → Falls back to polling: GET /v1/queue/{hospitalId}?since={lastKnownTimestamp}
      every 5 seconds
    → On reconnect: fetches full current state, reconciles with cached state,
      resumes Realtime subscription
```

---

## 5. Auth Flow

```
Sequence: Login
    Client                   API (Auth routes)              Supabase (DB)
      │                             │                             │
      │  POST /v1/auth/login        │                             │
      │  { phone, password }        │                             │
      │─────────────────────────────►                             │
      │                             │  SELECT * FROM staff        │
      │                             │  WHERE phone=? AND          │
      │                             │    hospital_id=?            │
      │                             │─────────────────────────────►
      │                             │◄─────────────────────────────
      │                             │  StaffMember row            │
      │                             │                             │
      │                             │  bcrypt.compare(            │
      │                             │    inputPassword,           │
      │                             │    storedHash)              │
      │                             │  ✓ match                    │
      │                             │                             │
      │                             │  Fetch role permissions     │
      │                             │  from permissions table     │
      │                             │─────────────────────────────►
      │                             │◄─────────────────────────────
      │                             │  permissions: string[]      │
      │                             │                             │
      │                             │  Rate limit check:          │
      │                             │  5 req/min per IP (C-3 fix) │
      │                             │                             │
      │                             │  Sign access token (15 min) │
      │                             │  { sub, hospitalId, role,   │
      │                             │    permissions[], jti,      │
      │                             │    exp }                    │
      │                             │  Must crash on missing      │
      │                             │  AUTH_SECRET (C-2 fix)      │
      │                             │                             │
      │                             │  Sign refresh token (7 days)│
      │                             │  { sub, jti:refreshJti, exp}│
      │                             │                             │
      │                             │  Store refreshJti in        │
      │                             │  token_revocation table     │
      │                             │  (for logout revocation)    │
      │                             │─────────────────────────────►
      │                             │                             │
      │◄─────────────────────────────                             │
      │  Set-Cookie:                │                             │
      │    docsile-session (access) │                             │
      │    docsile-refresh          │                             │
      │    (both: HttpOnly,         │                             │
      │     Secure, SameSite=Strict)│                             │

Sequence: Authenticated request
    Client                   API (Auth Middleware)
      │                             │
      │  GET /v1/patients           │
      │  Cookie: docsile-session    │
      │─────────────────────────────►
      │                             │  verifyToken(cookie)
      │                             │  → check JWT signature
      │                             │  → check exp
      │                             │  → SELECT FROM token_revocation
      │                             │    WHERE jti = token.jti
      │                             │    → not found = valid (H-1 fix)
      │                             │
      │                             │  Permission guard:
      │                             │  route metadata requires "patient:list"
      │                             │  session.permissions includes "patient:list"
      │                             │  → PASS (C-1 fix — structural)
      │                             │
      │  response data              │
      │◄─────────────────────────────

Sequence: Token refresh
    Client                   API (Auth routes)
      │                             │
      │  POST /v1/auth/refresh      │
      │  Cookie: docsile-refresh    │
      │─────────────────────────────►
      │                             │  Verify refresh token
      │                             │  → not in revocation list
      │                             │  → Rotate: revoke old jti,
      │                             │    issue new access + refresh tokens
      │                             │  (refresh token rotation)
      │◄─────────────────────────────
      │  New cookies set            │

Sequence: Logout
    Client                   API (Auth routes)           Supabase (DB)
      │                             │                         │
      │  POST /v1/auth/logout       │                         │
      │  Cookie: docsile-session    │                         │
      │─────────────────────────────►                         │
      │                             │  Extract jti from       │
      │                             │  both tokens            │
      │                             │  INSERT token_revocation│
      │                             │  (access jti, refresh   │
      │                             │   jti, exp timestamps)  │
      │                             │─────────────────────────►
      │                             │                         │
      │◄─────────────────────────────                         │
      │  Clear-Cookie (both)        │                         │
      │  Redirect to /login         │                         │
      │                             │                         │
      │  Token is now DEAD even if  │                         │
      │  the cookie was intercepted │                         │
      │  (H-1 fix)                  │                         │
```

---

## 6. Failure Mode Analysis

### FM-1: Supabase Postgres slow or down

**Detection**: API requests to Supabase time out or return 5xx.

**Impact by path**:
- Patient registration, billing, pharmacy stock deduction: blocked — these are strong-consistency paths. API returns 503 with `Retry-After: 30` header. Client shows: "System temporarily unavailable. Please retry in 30 seconds." Staff must not proceed without confirmation — a partial patient record or a missing billing event is worse than a retry message.
- Queue status, bed status: Supabase Realtime will also be unavailable if Postgres is down. Clients fall back to the last known cached state plus a "Data may be stale" banner.
- Analytics, reports, call-logs: tolerate staleness (eventual consistency OK). Cache serves last known state. Users see a staleness indicator.

**Recovery**: Supabase HA typically restores within 60 seconds (within RTO of 60 minutes). PITR backups within RPO of 60 minutes. No manual action required from the engineering team for brief outages. For extended outages (>15 min), the on-call engineer investigates Supabase status page.

**Safety note**: Because billing and pharmacy stock deduction block on Postgres, no "phantom" charges or double-dispenses are created during an outage. The safety risk is *failure to record*, not *recording incorrectly*. Staff must be trained: if the system is unavailable, use the paper-based backup process, then reconcile once the system is back.

### FM-2: Supabase Realtime channel drops

**Detection**: Supabase Realtime client fires `CHANNEL_ERROR` or the subscription state transitions to `CLOSED`.

**Client behavior**:
1. Show "Live updates paused — reconnecting..." banner on queue/bed/appointment screens.
2. Begin polling fallback: `GET /v1/queue/{hospitalId}?since={lastEventTimestamp}` every 5 seconds.
3. On Supabase Realtime reconnect: unsubscribe from polling, re-subscribe to channel, fetch full current state and reconcile with cached state.

**Patient care impact**: Staff can still register patients, update queue, assign beds — all via HTTP API. Real-time broadcast is a display optimization; the underlying state is always in Postgres. Other screens will miss live updates until reconnect, but those updates are recovered on the next poll cycle (5s maximum staleness during fallback).

### FM-3: Client goes offline mid-modal-edit

**Detection**: `navigator.onLine` fires false, or `fetch()` throws a network error.

**Behavior by data criticality**:
- **Critical data (billing amounts, prescription doses, bed assignment)**: Show "You are offline — changes not saved" warning. Do NOT auto-submit when connectivity returns without explicit user action. The user must click "Save" again while online — this prevents accidental double-submission after reconnect.
- **Non-critical data (notes, optional fields, search state)**: Optimistic update in the client cache. On reconnect, background-sync retries the write with an idempotency key. If the server returns 409 (idempotency conflict — the write already succeeded on a prior attempt), the client discards the retry silently and keeps the server's version.

**Idempotency key pattern**: All critical POST/PATCH mutations accept an `Idempotency-Key` header. The API stores `(key, result)` in a short-lived table (TTL: 24 hours). Retries with the same key return the original result without re-executing side effects. This covers the "retry on network error" case safely.

### FM-4: API layer process restart or crash

**Detection**: Client receives connection error (ECONNREFUSED or 502 from hosting platform).

**Recovery**:
- The API layer is stateless — all session state is in the JWT cookie, all data state is in Supabase. A process restart recovers in <30 seconds with zero data loss.
- The hosting platform's load balancer health-checks the API and redirects traffic to the healthy instance during restart.
- Clients get a brief (1-2 retry) error, then succeed on the next request. The client-side retry logic (built into the data cache layer) handles this transparently for most operations.
- Rate-limiter state (currently in-memory for simple implementations) is reset on restart. This is acceptable — a 30-second window where rate limits are not enforced is not a material security risk. If it becomes one, move rate-limiter state to Supabase (a lightweight solution) or a Redis instance on the same free tier.

### FM-5: Auth token forged / compromised (JWT secret breach or cookie theft)

**Detection**: Unusual access patterns (wrong hospital data, unexpected permission levels) trigger anomaly alerts. Token revocation on logout is in place for normal flows.

**Response**:
1. Emergency: rotate `AUTH_SECRET` in environment variables and redeploy API layer. All existing tokens become invalid simultaneously (brute revocation — all active sessions are invalidated). Users must log in again.
2. For targeted compromise: if a specific token's jti is known, INSERT it into `token_revocation` immediately — takes effect on the next request without requiring a full secret rotation.
3. The 15-minute access token TTL (C-2 fix) means that even a stolen token expires quickly. The 7-day refresh token is HTTP-only, Secure, SameSite=Strict — not accessible from JavaScript, not sent on cross-origin requests.

**Architecture note**: The current codebase (C-2) uses a 7-day access token with no refresh mechanism. The new architecture uses 15-minute access tokens + 7-day refresh tokens with rotation. This reduces the window from 7 days to 15 minutes for a stolen access token, and rotation means a stolen refresh token is also invalidated on the next legitimate use.

---

## 7. Data Fetching and Caching Architecture (M-1 Fix)

### 7.1 Problem Being Fixed

The current codebase: 20+ modal components use `useEffect` keyed on `open` to trigger Server Action calls with zero caching. Every open of the same modal re-fetches the same data from Supabase. Modal slowness is a direct consequence.

### 7.2 Target Architecture

The client layer includes a **server-state manager** (a client-side data cache) as a first-class architectural layer, not an optional library. Its job:
- Deduplicate in-flight requests (two components asking for the same patient ID simultaneously get one request, not two)
- Cache responses keyed by resource ID
- Serve cached data instantly on subsequent requests within the stale window
- Background-refresh stale data without blocking the UI
- Invalidate specific cache keys when mutations succeed (not the whole cache)

### 7.3 Caching Strategy Table

| Data Type | Cache Location | Stale-While-Revalidate TTL | Invalidation Trigger |
|---|---|---|---|
| Hospital profile | Client cache | 30 min | Hospital settings mutation succeeds |
| Service templates | Client cache | 60 min | Service template edit mutation succeeds |
| Dropdown options | Client cache | 60 min | Dropdown edit mutation succeeds |
| Patient list (paginated) | Client cache | 5 min | Patient create/update mutation succeeds |
| Individual patient | Client cache keyed by patientId | 10 min | Patient update mutation succeeds |
| Bill details | Client cache keyed by billId | 5 min | Bill update/payment mutation succeeds |
| Queue state | Client store (Realtime-backed) | No TTL — event-driven | Supabase Realtime UPDATE/DELETE event |
| Bed availability | Client store (Realtime-backed) | No TTL — event-driven | Supabase Realtime UPDATE event |
| Appointment board | Client store (Realtime-backed) | No TTL — event-driven | Supabase Realtime event |
| Pharmacy stock | Client cache | 2 min | Stock mutation succeeds |
| Lab results | Client cache keyed by orderId | 15 min | Lab result update mutation succeeds |
| Analytics/dashboard stats | Client cache | 15 min | Manual refresh or background refetch |
| Report PDFs | Object Storage (Supabase) | No TTL — fetch-once | Explicit report regeneration |
| Auth token | HTTP-only cookie | 15 min (access token) | Refresh flow, logout |

### 7.4 Modal-Specific Fix

Modals that previously triggered useEffect fetches:
- First open: fetch triggered, cached, modal renders with data
- Subsequent opens (within stale window, e.g. 10 min): data returned instantly from cache, zero network round trip — modal feels instant
- After stale window: background refetch triggers; modal renders with cached data immediately, then updates silently when fresh data arrives

Data that is the same for all modals within a session (hospital profile, service templates) is prefetched at app initialization and held in cache. No modal ever needs to fetch these — they are always available from cache on modal open.

---

## 8. Module Boundary Enforcement

### 8.1 Cross-Module Coupling Fixed

Current coupling → target resolution:

| Current cross-module import | Root cause | Resolution |
|---|---|---|
| `pharmacy` → `inpatients/actions.getHospitalProfileForReceipts` | Shared need, wrong ownership | Lift to `shared-kernel/getHospitalProfile` |
| `inpatients` → `doctor/actions.getMedicineMaster` | Wrong module ownership | Move `getMedicineMaster` to `pharmacy` module (it owns medicines) |
| `inpatients` → `settings/actions.getInpatientTemplates` | Shared need | Lift to `shared-kernel/getServiceTemplates` with category filter |
| `inpatients` → `patients/actions.searchExistingPatients` | Same bounded context | Merge into `patient-care` module — same module, not cross-module |
| `settings` → `patients/actions.getDropdownOptions` | Shared need | Lift to `shared-kernel/getDropdownOptions` |
| `doctor/ai-actions` → `analytics/actions` | AI context assembly | Create `shared-kernel/ai-context-builder` that assembles AI context without reaching into analytics module internals |
| `patients` → `inpatients/actions` | Same bounded context | Merge into `patient-care` module |
| `patients` → `inpatients/components` | Same bounded context | Merge into `patient-care` module |

After the merge of patients + inpatients into `patient-care`, and the lifts to shared kernel, the remaining 18-module layout should have zero cross-module imports outside the shared kernel.

### 8.2 Lint Rule

An ESLint rule enforces: `src/modules/<module-A>/**` may not import from `src/modules/<module-B>/**`. The only allowed external imports from module code are:
- `src/shared/**` (shared kernel)
- `src/config/**`
- NPM packages

This makes cross-module coupling a CI failure, not a code-review catch.

---

## 9. Database Design Overview

### 9.1 Bounded Context → Table Ownership

Each module owns its tables. No module may query another module's tables directly in SQL — all cross-module data access is through the shared kernel or inter-module API calls.

| Bounded context | Tables owned |
|---|---|
| patient-care | Patient, PatientVisit, Admission, BedAssignment, DoctorQueue, IpAdmission |
| billing | Bill, BillItem, Payment, Receipt, ServiceTemplate (billing-specific view) |
| pharmacy | MedicineMaster, PharmacyStock, PharmacyTransaction, PharmacyBill |
| labs | LabOrder, LabResult, LabTestMaster |
| optical | OpticalOrder, OpticalPrescription, LensInventory |
| insurance | InsuranceClaim, InsuranceCompany, TPA |
| doctor | Doctor, WorkupTemplate, WorkupEntry |
| staff | StaffMember, Role, RolePermission |
| settings | HospitalConfig, DropdownOption, ServiceTemplateDefinition |
| analytics | (materialized views — read-only, no tables owned) |
| reports | ReportExport (metadata row), PDF in Object Storage |
| expenses | Expense |
| dues-followups | DueRecord, FollowUp |
| call-logs | CallLog |
| license-tracker | LicenseRecord |

### 9.2 Tenant Isolation (RLS Policy Scope)

Every table has a `hospital_id UUID NOT NULL` column. Supabase RLS policies on each table enforce: `hospital_id = auth.jwt() -> hospitalId` (or equivalent, depending on how the Supabase session context is set).

**Important**: The API backend currently uses the `service_role` key which bypasses RLS entirely. In the target architecture:
- The API layer still uses the service_role key for writes (to avoid RLS overhead on the write path and to allow complex transactions)
- BUT the API layer is responsible for enforcing hospital-scoped queries by always including `WHERE hospital_id = session.hospitalId` in every query — this is enforced by the repository pattern (the repository constructor takes a `hospitalId` and appends it to every query)
- RLS is enabled and configured as a *defense-in-depth* layer for the case where a repository bug forgets to scope by hospital_id — RLS catches the leak at the DB level
- The combination of repository-level scoping + RLS defense-in-depth provides structural tenant isolation without relying solely on developer discipline

### 9.3 Strong Consistency Paths

For the paths requiring strong consistency (billing, pharmacy stock, bed-availability, queue-position):
- All writes go through Postgres transactions
- No client-side optimistic updates for these paths — the UI waits for server confirmation
- Idempotency keys prevent double-writes on retry
- For concurrent contention (two nurses trying to assign the last bed): use `SELECT FOR UPDATE` on the bed row inside the transaction, or a `UNIQUE` constraint on active bed assignments, to guarantee exactly-one assignment

### 9.4 Schema Typing

The `src/lib/supabase/types.ts` file exists but is currently unused (M-4). In the new architecture, all DB types are generated via `supabase gen types typescript` from the actual schema, imported by every repository file. The `any` casts in current actions.ts files are eliminated — schema drift becomes a TypeScript compile error, not a runtime surprise.

---

## 10. Observability Plan

### 10.1 Structured Logging

Every log line emits structured JSON with:
```json
{
  "timestamp": "ISO8601",
  "level": "info|warn|error",
  "correlationId": "req_<uuid>",
  "hospitalId": "hosp_<uuid>",
  "userId": "user_<uuid>",
  "module": "patient-care",
  "action": "createPatient",
  "durationMs": 47,
  "statusCode": 201,
  "message": "Patient created"
}
```

PII fields (patient name, phone, DOB, health data) are never logged. The `redactPII` shared kernel function strips these fields from any log payload before emission.

The current 58 `console.log/console.error` calls (L-4) are replaced entirely by the structured logger. `console.log` is banned by ESLint rule.

### 10.2 Error Monitoring

All unhandled exceptions are captured by an error monitoring integration (specific provider chosen in Phase 3). Every captured error includes the `correlationId` so the error can be linked to the corresponding log lines without a separate search.

### 10.3 Metrics and Alerts

| Metric | Alert threshold | Severity |
|---|---|---|
| API p95 latency (per endpoint) | > 500ms for 5 consecutive minutes | Warning |
| API error rate (5xx) | > 1% of requests for 2 minutes | Critical |
| Supabase Realtime disconnected sessions | > 10% of active sessions | Warning |
| Login failure rate | > 20 failures/minute from single IP | Critical (possible brute force) |
| Database connection pool saturation | > 80% pool used for 5 minutes | Warning |
| External uptime check failure | 2 consecutive failures (2-minute gap) | Critical |
| Token revocation table growth | > 10,000 rows (cleanup job not running) | Warning |

### 10.4 Business Health Signals

The following are tracked as data-level health signals (anomalies suggest data integrity issues, not just user complaints):
- Patient registrations per day per hospital (drop > 50% from 7-day average → alert)
- Billing transactions per day per hospital
- Pharmacy stock deductions per day
- Failed login attempts per hospital

---

## 11. ADR Index

The following Architecture Decision Records were written for this phase. Each covers a decision where ≥2 credible options existed given the project's NFRs.

| ADR | Decision | Status |
|---|---|---|
| ADR-001 | Architecture Pattern Selection (Modular Monolith vs BaaS-Centric) | Accepted |
| ADR-002 | Authorization Enforcement Location (API-layer guard vs DB-layer RLS vs hybrid) | Accepted |
| ADR-003 | Real-time Delivery Mechanism (Supabase Realtime vs WebSocket vs SSE) | Accepted |
| ADR-004 | Migration Strategy (Strangler-fig vs Big-bang rewrite) | Accepted |

---

## 12. Implementation Order (for Phase 4+)

Modules are migrated in risk order — lowest risk first, safety-critical last. Within each module, the critical fixes (C-1, C-2, C-3, H-1, H-2) are applied as part of the new module, not as a separate patch to the old system.

**Wave 1 — Infrastructure + low-risk modules (weeks 1-4)**:
- Shared kernel (auth, permissions, logger, types, id-generators)
- Mandatory auth middleware + permission guard (structural C-1 fix)
- JWT 15-min access + refresh rotation (C-2 fix, H-1 fix)
- Rate limiter on login (C-3 fix)
- RLS tenant isolation policies on all tables
- Modules: call-logs, license-tracker, analytics (read-only, no safety-critical writes)

**Wave 2 — Core data modules (weeks 5-10)**:
- patient-care (merged patients + inpatients) — largest module, highest coupling to fix
- staff, settings, doctor
- queue (real-time) + Supabase Realtime channel wiring

**Wave 3 — Transactional modules (weeks 11-16)**:
- billing (strong consistency, most business-critical)
- pharmacy (strong consistency, stock management)
- labs, optical, insurance
- dues-followups, expenses

**Wave 4 — Reports, cleanup (weeks 17-18)**:
- reports, dashboard
- Delete old Next.js modules as each new module passes acceptance criteria
- Final decommission of Next.js app

Each module passes acceptance before its Next.js counterpart is decommissioned: existing behavior preserved, C-1/H-1 fixes verified, test coverage gate (>80% on business-logic service functions) met.
