# Docsile HMS — Business Requirements Document (BRD)

End-to-end, click-by-click, field-by-field documentation of every module as
**actually implemented** in this codebase (branch `feat/react-migration`,
frontend in `web/src`, backend in `supabase/functions`) — not an aspirational
spec. Each module file documents every screen, every button and what it
does, every form field (type, validation, default, data source), every
computed value, and the backend business rule or permission behind it.

Written incrementally, one module (or part of a large module) per pass, due
to the length this requires to be genuinely complete. Status below is kept
up to date after every pass.

## How to read a module file

Each module file follows the same shape:
1. **Overview** — purpose, who uses it, where it sits in the patient/business journey.
2. **Permissions** — every permission key that gates something in this module, and exactly what it gates.
3. **Screens** — one subsection per screen/tab/dialog, each covering:
   - Entry point (how a user gets here)
   - Every field/column shown and its data source (stored vs. computed, and how)
   - Every filter/search/sort control and its exact behavior
   - Every button/action: label, what it does, permission required, confirmation needed, resulting state change
   - Every form: every field (label, type, required?, validation, default, options source), submit behavior, success/error handling
4. **Business rules** — decision logic that isn't obvious from a field list (e.g. "balance due" computation, status-derivation rules, atomic ID generation).
5. **Data model** — the real DB fields/tables involved, named exactly as in the schema.
6. **Integration points** — what this module creates/reads that other modules depend on.
7. **Known deviations from main** — where this port's behavior deliberately differs from the original Next.js app, and why (relevant for a migration project; most other BRDs wouldn't need this section).

## Module status

| # | Module | File | Status |
|---|---|---|---|
| 1 | Patients (OPD) | [01-patients-opd.md](01-patients-opd.md) | ✅ Done |
| 2 | In-Patients (IPD) | — | Not started |
| 3 | Refraction (Workup) | — | Not started |
| 4 | Doctor | — | Not started |
| 5 | Pharmacy | — | Not started |
| 6 | Optical | — | Not started |
| 7 | Labs | — | Not started |
| 8 | Call Logs | — | Not started |
| 9 | Insurance | — | Not started |
| 10 | Dues & Follow-Ups | — | Not started |
| 11 | Expenses | — | Not started |
| 12 | Analytics | — | Not started |
| 13 | Reports | — | Not started |
| 14 | Data Export | — | Not started |
| 15 | License Tracker | — | Not started |
| 16 | Staff | — | Not started |
| 17 | Settings | — | Not started |
| 18 | Dashboard | — | Not started |

Order matches the app's own nav / the existing module-audit queue in
`.claude/TODO.md`. Next up: In-Patients (IPD).
