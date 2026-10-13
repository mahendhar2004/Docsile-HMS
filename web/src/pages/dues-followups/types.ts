/**
 * dues-followups/types.ts
 *
 * TypeScript types for the dues & follow-ups module.
 * Cross-referenced against:
 *   - .sde/schemas/openapi.yaml  /dues-followups/* paths
 *   - supabase/functions/dues-followups/types.ts   (Zod schemas + interfaces)
 *   - src/app/(hospital)/dues-followups/actions.ts  (DueRecord, FollowUpRecord — old-app ground truth)
 */

// ─── GET /dues-followups/dues ─────────────────────────────────────────────────
// Verified against supabase/functions/dues-followups/types.ts DueRecord AND
// src/app/(hospital)/dues-followups/actions.ts getDues() return shape — they match exactly.

export type DueType = "OPD" | "IPD" | "LAB" | "PHARMACY"

export interface DueRecord {
  id: string
  /** Source module for this outstanding balance. */
  type: DueType
  /** Sequential patient UHID (e.g. "P-001"). */
  patientId: string
  patientName: string
  uhid: string
  phone: string
  /** Human-readable service / item description. */
  services: string
  totalAmount: number
  amountPaid: number
  balanceDue: number
  /** ISO datetime of the originating billing event. */
  date: string
  /** Present only for OPD dues (Prescription). */
  prescriptionNumber?: string
  /** Present only for LAB dues (LabBill). */
  labBillNumber?: string
  /** Present only for PHARMACY dues (PharmacyBill). */
  pharmacyBillNumber?: string
}

// ─── GET /dues-followups/dues/summary ────────────────────────────────────────
// Matches main's DuesTab summary tiles (Total Outstanding + per-type
// OPD/IPD/LAB/PHARMACY count+total), computed server-side over every
// outstanding due, not just one page.

export interface DuesSummary {
  totalOutstanding: number
  opdCount: number
  opdTotal: number
  ipdCount: number
  ipdTotal: number
  labCount: number
  labTotal: number
  pharmacyCount: number
  pharmacyTotal: number
}

// ─── GET /dues-followups/followups ───────────────────────────────────────────
// Verified against supabase/functions/dues-followups/types.ts FollowUpRecord AND
// src/app/(hospital)/dues-followups/actions.ts getFollowUps() return shape — they match exactly.

export type FollowUpType = "OPD" | "IPD"

export interface FollowUpRecord {
  id: string
  type: FollowUpType
  /** Sequential patient UHID (e.g. "P-001"). */
  patientId: string
  patientName: string
  uhid: string
  phone: string
  /** Patient email — null when not on record. */
  email: string | null
  /** ISO datetime of the scheduled follow-up. */
  followUpDate: string
  doctorName: string
  department: string
  diagnosis: string
  /** May be JSON-encoded — use parseAdditionalNotes() before display. */
  additionalNotes: string
  /** ISO datetime of the previous visit. */
  lastVisitDate: string
  /** True when followUpDate is earlier than today (IST). */
  isOverdue: boolean
}

// ─── GET /dues-followups/followups/summary ───────────────────────────────────
// Matches main's FollowUpsTab summary tiles (Today/Tomorrow/Total/Overdue),
// computed server-side over every follow-up record, not just one page.

export interface FollowUpsSummary {
  todayCount: number
  tomorrowCount: number
  totalCount: number
  overdueCount: number
}

// ─── GET /dues-followups/email-templates ─────────────────────────────────────
// Verified against supabase/functions/dues-followups/types.ts EmailTemplate.

export interface EmailTemplate {
  /** Template identifier sent in POST /dues-followups/send-email as templateId. */
  code: string
  name: string
}

// ─── PATCH /dues-followups/dues/{id}/mark-paid ───────────────────────────────
// Verified against supabase/functions/dues-followups/types.ts MarkPaidSchema.
// enum: ["prescription", "inpatient", "labBill", "pharmacyBill"]

export type MarkPaidType = "prescription" | "inpatient" | "labBill" | "pharmacyBill"

export interface MarkPaidBody {
  /** Source module — MUST match MarkPaidSchema enum exactly. */
  type: MarkPaidType
  paymentMode?: string
  amount?: number
}

/**
 * Maps DueRecord.type → MarkPaidBody.type.
 * Verified against supabase/functions/dues-followups/service.ts markPaid() switch statement.
 */
export function dueTypeToMarkPaidType(dueType: DueType): MarkPaidType {
  const map: Record<DueType, MarkPaidType> = {
    OPD: "prescription",
    IPD: "inpatient",
    LAB: "labBill",
    PHARMACY: "pharmacyBill",
  }
  return map[dueType]
}

// ─── POST /dues-followups/send-email ─────────────────────────────────────────
// Verified against supabase/functions/dues-followups/types.ts SendEmailSchema.

export interface SendEmailBody {
  /** Patient UHID (e.g. "P-001"). Backend looks up email from Patient table. */
  patientId: string
  /** Template code from GET /dues-followups/email-templates. */
  templateId: string
  customMessage?: string | null
}
