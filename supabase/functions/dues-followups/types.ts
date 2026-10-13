import { z } from 'zod';

// ─── Zod schemas (used by index.ts for request validation) ────────────────────

export const DuesListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(50),
});

export const MarkPaidSchema = z.object({
  type: z.enum(['prescription', 'inpatient', 'labBill', 'pharmacyBill']),
  paymentMode: z.string().optional(),
  amount: z.number().positive().optional(),
});

export const SendEmailSchema = z.object({
  patientId: z.string().min(1),
  templateId: z.string().min(1),
  customMessage: z.string().nullable().optional(),
});

// ─── Response shape types ────────────────────────────────────────────────────

/** An outstanding balance record spanning OPD / IPD / LAB / PHARMACY. */
export interface DueRecord {
  id: string;
  type: 'OPD' | 'IPD' | 'LAB' | 'PHARMACY';
  /** Patient UHID (e.g. "P-001"). */
  patientId: string;
  patientName: string;
  uhid: string;
  phone: string;
  services: string;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  date: string;
  prescriptionNumber?: string;
  labBillNumber?: string;
  pharmacyBillNumber?: string;
}

/** A future or overdue follow-up appointment record. */
export interface FollowUpRecord {
  id: string;
  type: 'OPD' | 'IPD';
  /** Patient UHID (e.g. "P-001"). */
  patientId: string;
  patientName: string;
  uhid: string;
  phone: string;
  email: string | null;
  followUpDate: string;
  doctorName: string;
  department: string;
  diagnosis: string;
  additionalNotes: string;
  lastVisitDate: string;
  isOverdue: boolean;
}

/** Email template descriptor returned by getAvailableTemplates (from Sitha). */
export interface EmailTemplate {
  code: string;
  name: string;
}

/**
 * Summary tile totals for the Dues tab, matching main's DuesTab
 * (Total Outstanding + per-type OPD/IPD/LAB/PHARMACY count+total) —
 * computed over every outstanding due record, not just the current page.
 */
export interface DuesSummary {
  totalOutstanding: number;
  opdCount: number;
  opdTotal: number;
  ipdCount: number;
  ipdTotal: number;
  labCount: number;
  labTotal: number;
  pharmacyCount: number;
  pharmacyTotal: number;
}

/**
 * Summary tile counts for the Follow-Ups tab, matching main's
 * FollowUpsTab summary (Today/Tomorrow/Total/Overdue) — computed over every
 * OPD+IPD follow-up record (this backend doesn't restrict getFollowups to a
 * default date window the way main's getFollowUps() does), not just the
 * current page.
 */
export interface FollowUpsSummary {
  todayCount: number;
  tomorrowCount: number;
  totalCount: number;
  overdueCount: number;
}

// ─── Inferred types (for use in service and repository) ──────────────────────

export type DuesListQuery = z.infer<typeof DuesListQuerySchema>;
export type MarkPaidInput = z.infer<typeof MarkPaidSchema>;
export type SendEmailInput = z.infer<typeof SendEmailSchema>;
