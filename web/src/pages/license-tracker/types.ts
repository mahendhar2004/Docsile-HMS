/**
 * License Tracker — types and helpers.
 *
 * Field names verified against:
 *   - src/app/(hospital)/license-tracker/components/LicenseForm.tsx   (LICENSE_CATEGORIES, form fields)
 *   - supabase/functions/license-tracker/types.ts                      (LicenseSchema)
 *   - .sde/schemas/openapi.yaml                                        (License schema, /license-tracker/* paths)
 *
 * Permission keys (from src/lib/permissions.ts + openapi x-permission):
 *   licenses:view    — GET /license-tracker
 *   licenses:create  — POST /license-tracker
 *   licenses:edit    — PATCH /license-tracker/{id}, PATCH/DELETE /license-tracker/{id}/document
 *   licenses:delete  — DELETE /license-tracker/{id}
 */

import { differenceInDays } from "date-fns"

// ─── LICENSE_CATEGORIES ───────────────────────────────────────────────────────
// Copied verbatim from src/app/(hospital)/license-tracker/components/LicenseForm.tsx
// lines 16–28. Do NOT rename or reorder.

export const LICENSE_CATEGORIES = [
  "Medical Registration",
  "Drug License",
  "Fire Safety",
  "Trade License",
  "NABH Accreditation",
  "Bio-Medical Waste",
  "Pollution Control",
  "AERB (Radiology)",
  "Lift License",
  "Building Compliance",
  "Other",
] as const

// ─── License record shape ─────────────────────────────────────────────────────

export interface License {
  id: string
  name: string
  licenseNumber: string | null
  /** DB field name: issuingBody — label in old app: "Issuing Authority" */
  issuingBody: string | null
  category: string | null
  /** YYYY-MM-DD or ISO string */
  issueDate: string | null
  /** YYYY-MM-DD or ISO string — required */
  expiryDate: string
  /**
   * Days before expiry to begin showing a warning.
   * Per-license configurable — NOT a fixed global threshold.
   * Default: 30 (from old LicenseForm.tsx, line 67).
   */
  reminderDays: number
  status: string | null
  documentUrl: string | null
  notes: string | null
  hospitalId: string
  createdBy: string
  createdAt: string
  updatedAt: string
}

// ─── Request bodies ───────────────────────────────────────────────────────────

export interface CreateLicenseBody {
  name: string
  licenseNumber?: string
  issuingBody?: string
  category?: string
  issueDate?: string
  expiryDate: string
  reminderDays?: number
  notes?: string
}

export type UpdateLicenseBody = Partial<CreateLicenseBody>

// ─── Status computation ───────────────────────────────────────────────────────

export type LicenseStatusLabel = "Active" | "Expiring Soon" | "Expired"

/**
 * Derives the display status from a license's expiry date and per-license
 * reminderDays threshold.
 *
 * Logic matches old app getLicenseStatus() EXACTLY
 * (src/app/(hospital)/license-tracker/components/LicenseTrackerPage.tsx, lines 46–53):
 *   daysLeft < 0            → "Expired"
 *   daysLeft <= reminderDays → "Expiring Soon"
 *   else                    → "Active"
 *
 * The "expiring soon" threshold is per-license (reminderDays), NOT a fixed global value.
 */
export function getLicenseStatus(
  expiryDate: string,
  reminderDays: number,
): { label: LicenseStatusLabel; daysLeft: number } {
  const now = new Date()
  const expiry = new Date(expiryDate)
  const daysLeft = differenceInDays(expiry, now)
  if (daysLeft < 0) return { label: "Expired", daysLeft }
  if (daysLeft <= reminderDays) return { label: "Expiring Soon", daysLeft }
  return { label: "Active", daysLeft }
}

// ─── Storage helpers ──────────────────────────────────────────────────────────
// Mirrored from src/lib/storage.ts (same logic, web-local copy so we don't
// cross the Next.js / Vite module boundary).

/** Supabase Storage bucket for license document files. */
export const LICENSE_STORAGE_BUCKET = "license-documents"

/**
 * Builds the storage path for a license document.
 * Pattern: licenses/{licenseId}/{timestamp}-{safeName}
 */
export function getLicenseFilePath(licenseId: string, filename: string): string {
  const timestamp = Date.now()
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_")
  return `licenses/${licenseId}/${timestamp}-${safeName}`
}
