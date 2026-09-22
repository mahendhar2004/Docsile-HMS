/**
 * patterns/status/status-map.ts
 *
 * Maps every known entity status string in the docsile-hms domain to one of
 * five semantic buckets: success | warning | error | info | neutral.
 *
 * REASONING FOR EACH BUCKET:
 *
 *   success  — terminal-positive: the process is complete, payment settled,
 *               patient discharged, claim approved.
 *
 *   warning  — in-flight-attention: the workflow is mid-stream and something
 *               requires the user's attention or is pending the next step.
 *               Examples: pre-op, query raised by insurer, payment partially
 *               received, prescription still a draft.
 *
 *   error    — negative-terminal or urgency: the process ended badly
 *               (cancelled, rejected) or money is owed and overdue (DUE).
 *
 *   info     — active-neutral: the process is in progress and everything is
 *               on-track — no action needed right now. Examples: patient
 *               registered, admitted, preauth submitted (just waiting).
 *
 *   neutral  — terminal-neutral: the record is closed/final but neither a
 *               success nor a failure in a clinical sense. Examples: patient
 *               moved/rescheduled, no-show, insurance case closed.
 *
 * ─── Source enums (from src/lib/types.ts in the old Next.js app) ─────────────
 *
 * PatientStatus:
 *   REGISTERED | IN_WORKUP | WORKUP_DONE | WITH_DOCTOR | VISITED |
 *   COMPLETED | MEDICAL_ONLY | MOVED | CANCELLED | NO_SHOW
 *
 * InPatientStatus:
 *   ADMITTED | PRE_OP | IN_SURGERY | POST_OP |
 *   READY_FOR_DISCHARGE | DISCHARGED
 *
 * InsuranceClaimStatus:
 *   PREAUTH_SUBMITTED | PREAUTH_QUERY | PREAUTH_APPROVED | PREAUTH_REJECTED |
 *   ENHANCEMENT_CLAIMED | ENHANCEMENT_QUERY | ENHANCEMENT_APPROVED |
 *   ENHANCEMENT_REJECTED | FINAL_BILL_SUBMITTED | SETTLED | PARTIALLY_SETTLED |
 *   CLAIM_REJECTED | CLOSED
 *
 * PrescriptionStatus (from actions.ts):
 *   DRAFT | BILLING_ONLY | COMPLETED | CANCELLED
 *
 * Bill status (Pharmacy / Optical / Lab — from their actions.ts):
 *   DRAFT | COMPLETED | DUE | PAID | PENDING | PARTIAL | CANCELLED
 */

export type SemanticBucket = "success" | "warning" | "error" | "info" | "neutral"

export interface StatusEntry {
  bucket: SemanticBucket
  /** Human-readable label rendered inside StatusPill */
  label: string
}

/**
 * Single source of truth for all entity status → semantic bucket mappings.
 * Keys are the exact enum strings stored in the database.
 */
export const STATUS_MAP: Record<string, StatusEntry> = {
  // ── PatientStatus ──────────────────────────────────────────────────────────
  // REGISTERED: patient is in reception queue — active, no action needed
  REGISTERED: { bucket: "info", label: "Registered" },
  // IN_WORKUP: being examined by optometrist — still info (active, on-track)
  IN_WORKUP: { bucket: "info", label: "In Workup" },
  // WORKUP_DONE: workup complete, waiting for doctor slot — warning because
  // the patient is now queued and waiting (needs attention to schedule)
  WORKUP_DONE: { bucket: "warning", label: "Workup Done" },
  // WITH_DOCTOR: currently in the consultation room — active, info
  WITH_DOCTOR: { bucket: "info", label: "With Doctor" },
  // VISITED: doctor seen but visit not yet marked complete (billing pending?)
  VISITED: { bucket: "warning", label: "Visited" },
  // COMPLETED: full OPD workflow done, billing settled — positive terminal
  COMPLETED: { bucket: "success", label: "Completed" },
  // MEDICAL_ONLY: prescription issued without optical billing — info (no issue)
  MEDICAL_ONLY: { bucket: "info", label: "Medical Only" },
  // MOVED: patient rescheduled/moved to another date — neutral (not an error)
  MOVED: { bucket: "neutral", label: "Moved" },
  // CANCELLED: appointment cancelled by staff/patient — negative terminal
  CANCELLED: { bucket: "error", label: "Cancelled" },
  // NO_SHOW: patient didn't arrive — terminal but not a clinical error
  NO_SHOW: { bucket: "neutral", label: "No Show" },

  // ── InPatientStatus ────────────────────────────────────────────────────────
  // ADMITTED: patient is in a bed, stable — info (active, on-track)
  ADMITTED: { bucket: "info", label: "Admitted" },
  // PRE_OP: preparing for surgery — warning (heightened clinical attention)
  PRE_OP: { bucket: "warning", label: "Pre-Op" },
  // IN_SURGERY: currently in the operating theatre — warning (critical moment)
  IN_SURGERY: { bucket: "warning", label: "In Surgery" },
  // POST_OP: surgery done, in recovery — info (active monitoring, stable)
  POST_OP: { bucket: "info", label: "Post-Op" },
  // READY_FOR_DISCHARGE: clinical team has cleared discharge — positive
  READY_FOR_DISCHARGE: { bucket: "success", label: "Ready for Discharge" },
  // DISCHARGED: patient has left — positive terminal
  DISCHARGED: { bucket: "success", label: "Discharged" },

  // ── InsuranceClaimStatus ───────────────────────────────────────────────────
  // PREAUTH_SUBMITTED: submitted to TPA/insurer, waiting — info
  PREAUTH_SUBMITTED: { bucket: "info", label: "Preauth Submitted" },
  // PREAUTH_QUERY: insurer raised a query — warning (action required)
  PREAUTH_QUERY: { bucket: "warning", label: "Preauth Query" },
  // PREAUTH_APPROVED: pre-authorization approved — success
  PREAUTH_APPROVED: { bucket: "success", label: "Preauth Approved" },
  // PREAUTH_REJECTED: pre-auth denied — error
  PREAUTH_REJECTED: { bucket: "error", label: "Preauth Rejected" },
  // ENHANCEMENT_CLAIMED: enhancement amount submitted — info (waiting)
  ENHANCEMENT_CLAIMED: { bucket: "info", label: "Enhancement Claimed" },
  // ENHANCEMENT_QUERY: insurer queried the enhancement — warning
  ENHANCEMENT_QUERY: { bucket: "warning", label: "Enhancement Query" },
  // ENHANCEMENT_APPROVED: enhancement approved — success
  ENHANCEMENT_APPROVED: { bucket: "success", label: "Enhancement Approved" },
  // ENHANCEMENT_REJECTED: enhancement denied — error
  ENHANCEMENT_REJECTED: { bucket: "error", label: "Enhancement Rejected" },
  // FINAL_BILL_SUBMITTED: final claim submitted, waiting settlement — info
  FINAL_BILL_SUBMITTED: { bucket: "info", label: "Final Bill Submitted" },
  // SETTLED: claim fully paid — positive terminal
  SETTLED: { bucket: "success", label: "Settled" },
  // PARTIALLY_SETTLED: some amount received but balance outstanding — warning
  PARTIALLY_SETTLED: { bucket: "warning", label: "Partially Settled" },
  // CLAIM_REJECTED: insurer rejected the final claim — error
  CLAIM_REJECTED: { bucket: "error", label: "Claim Rejected" },
  // CLOSED: case is closed (could be administrative closure) — neutral
  CLOSED: { bucket: "neutral", label: "Closed" },

  // ── PrescriptionStatus ─────────────────────────────────────────────────────
  // DRAFT: prescription not yet finalised — warning (incomplete)
  DRAFT: { bucket: "warning", label: "Draft" },
  // BILLING_ONLY: optical billing only, no doctor prescription written
  BILLING_ONLY: { bucket: "info", label: "Billing Only" },
  // (COMPLETED and CANCELLED are shared with PatientStatus above)

  // ── Bill Status (Pharmacy / Optical / Lab) ─────────────────────────────────
  // PAID: bill fully paid — success
  PAID: { bucket: "success", label: "Paid" },
  // DUE: money is owed and outstanding — error (needs immediate attention)
  DUE: { bucket: "error", label: "Due" },
  // PENDING: payment not yet received — warning
  PENDING: { bucket: "warning", label: "Pending" },
  // PARTIAL: partially paid, balance remaining — warning
  PARTIAL: { bucket: "warning", label: "Partial" },
}

/**
 * Look up a status string and return its semantic bucket + display label.
 * Falls back to neutral with a humanized label for unknown status strings.
 */
export function resolveStatus(status: string): StatusEntry {
  const entry = STATUS_MAP[status]
  if (entry) return entry

  // Humanize unknown status: "SOME_STATUS" → "Some Status"
  const label = status
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())

  return { bucket: "neutral", label }
}
