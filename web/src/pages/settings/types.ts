/**
 * settings/types.ts
 *
 * All TypeScript types for the Settings module.
 * Field names verified against:
 *   - supabase/functions/settings/types.ts (Zod schemas → exact DB column names)
 *   - .sde/schemas/openapi.yaml (component schemas)
 *   - src/app/(hospital)/settings/components/SettingsPage.tsx (old Next.js app)
 */

// ─── Service Templates ────────────────────────────────────────────────────────

/** Service categories verified from old app SettingsPage.tsx `SERVICE_CATEGORIES` const. */
export const SERVICE_CATEGORIES = [
  "Consultation",
  "Diagnostic",
  "Procedure",
  "Optical",
  "Other",
] as const
export type ServiceCategory = (typeof SERVICE_CATEGORIES)[number]

export interface ServiceTemplate {
  id: string
  name: string
  category: string | null
  description?: string | null
  amount: number
  discount?: number
  sortOrder?: number
  isActive: boolean
  hospitalId?: string
  createdAt?: string
  updatedAt?: string
}

export interface ServiceTemplateInput {
  name: string
  category?: string
  description?: string
  amount: number
  discount?: number
  sortOrder?: number
  isActive?: boolean
}

// ─── Hospital Profile ─────────────────────────────────────────────────────────

/** Verified against supabase/functions/settings/types.ts HospitalProfileSchema. */
export interface HospitalProfile {
  id: string
  name: string
  displayName?: string | null
  phone?: string | null
  email?: string | null
  website?: string | null
  registrationNo?: string | null
  gstin?: string | null
  registrationFeeEnabled?: boolean
  registrationFeeAmount?: number | null
  registrationFeeDefaultChecked?: boolean
  tone?: string | null
  departments?: string | null
  /** JSON-encoded settings blob (contains navStyle, defaultPrint, etc.) */
  settings?: string | null
}

export interface HospitalProfileInput {
  name?: string
  displayName?: string | null
  phone?: string | null
  email?: string | null
  website?: string | null
  registrationNo?: string | null
  gstin?: string | null
  registrationFeeEnabled?: boolean
  registrationFeeAmount?: number | null
  registrationFeeDefaultChecked?: boolean
}

// ─── Print Config ─────────────────────────────────────────────────────────────

/** Print item types — verified from src/lib/default-print.ts */
export type DefaultPrintItemType = "cash" | "prescription" | "readings" | "report"
export type ReadingsSubMode = "readings" | "clinical" | "both"

export type DefaultPrintItem =
  | { type: "cash" }
  | { type: "prescription" }
  | { type: "readings"; subMode: ReadingsSubMode }
  | { type: "report" }

export interface DefaultPrintConfig {
  items: DefaultPrintItem[]
}

const ALL_PRINT_ITEM_TYPES: DefaultPrintItemType[] = ["cash", "prescription", "readings", "report"]
const VALID_PRINT_TYPES = new Set(ALL_PRINT_ITEM_TYPES)
const VALID_READINGS_SUBMODES = new Set<ReadingsSubMode>(["readings", "clinical", "both"])

/**
 * Parses the raw `/settings/print-config` response (`{ defaultPrint: { items } }`,
 * loosely typed since it's a free-form JSON blob) into a validated
 * DefaultPrintItem[], dropping anything malformed. Shared by the Settings
 * print-config editor and the quick-print button's `useDefaultPrintConfig` hook
 * — extracted here so both read the exact same parsing rules.
 */
export function parsePrintConfig(raw: Record<string, unknown> | undefined): DefaultPrintItem[] {
  if (!raw) return []
  const dp = raw.defaultPrint as { items?: unknown } | undefined
  if (!dp || !Array.isArray(dp.items)) return []
  const seen = new Set<string>()
  const items: DefaultPrintItem[] = []
  for (const item of dp.items as unknown[]) {
    if (!item || typeof item !== "object") continue
    const t = (item as { type?: unknown }).type
    if (typeof t !== "string" || !VALID_PRINT_TYPES.has(t as DefaultPrintItemType)) continue
    if (seen.has(t)) continue
    if (t === "readings") {
      const sm = (item as { subMode?: unknown }).subMode
      if (typeof sm !== "string" || !VALID_READINGS_SUBMODES.has(sm as ReadingsSubMode)) continue
      items.push({ type: "readings", subMode: sm as ReadingsSubMode })
    } else {
      items.push({ type: t as Exclude<DefaultPrintItemType, "readings"> })
    }
    seen.add(t)
  }
  return items
}

export const DEFAULT_PRINT_LABELS: Record<DefaultPrintItemType, string> = {
  cash: "Cash Receipt",
  prescription: "Prescription",
  readings: "Readings & Findings",
  report: "Full Report",
}

export const READINGS_SUBMODE_LABELS: Record<ReadingsSubMode, string> = {
  readings: "Readings only",
  clinical: "Clinical Findings only",
  both: "Both",
}

// ─── Prescription Templates ───────────────────────────────────────────────────

/**
 * Verified against supabase/functions/settings/types.ts PredefinedTemplateSchema.
 * DB columns: code (UNIQUE), name, presentComplaint, previousHistory,
 * provisionalDiagnosis, medicines (JSON TEXT), investigations (JSON TEXT),
 * followUpDays, additionalNotes, isActive
 */
export interface PrescriptionTemplate {
  id: string
  code: string
  name: string
  presentComplaint?: string | null
  previousHistory?: string | null
  provisionalDiagnosis?: string | null
  /** JSON-encoded array of PrescriptionTemplateMed */
  medicines?: string
  /** JSON-encoded array of strings (investigations/advice) */
  investigations?: string
  followUpDays?: number | null
  additionalNotes?: string | null
  isActive: boolean
  createdAt?: string
  updatedAt?: string
}

/** Medicine item inside a prescription template's medicines JSON array. */
export interface PrescriptionTemplateMed {
  name: string
  days: string
  timing: string
  note: string
}

// ─── Inpatient Templates ──────────────────────────────────────────────────────

/**
 * Verified against supabase/functions/settings/types.ts InpatientTemplateSchema.
 * DB columns: code (UNIQUE), name, operationName, provisionDiagnosis (NOT provisionalDiagnosis!),
 * medicines (JSON TEXT), followUpDays, additionalNotes, isActive
 */
export interface InpatientTemplate {
  id: string
  code: string
  name: string
  operationName?: string | null
  /** Field name is provisionDiagnosis (verified from old app InpatientTemplateRow type) */
  provisionDiagnosis?: string | null
  /** JSON-encoded array of InpatientTemplateMed */
  medicines?: string
  followUpDays?: number | null
  additionalNotes?: string | null
  isActive: boolean
}

/** Medicine item inside an inpatient template's medicines JSON array. */
export interface InpatientTemplateMed {
  name: string
  days: string
  timing: string
  note: string
}

// ─── Packages ─────────────────────────────────────────────────────────────────

/**
 * Verified against supabase/functions/settings/types.ts PredefinedPackageSchema.
 * DB columns: name, inclusions (JSON TEXT), totalAmount, discount, isActive
 */
export interface PredefinedPackage {
  id: string
  name: string
  /** JSON-encoded array of PackageInclusion */
  inclusions?: string
  totalAmount: number
  discount?: number
  isActive: boolean
}

/** Verified from src/lib/types.ts PackageInclusion. */
export interface PackageInclusion {
  name: string
  amount: number
  subItems?: {
    itemName: string
    quantity: number
    rate: number
    amount: number
  }[]
}

/** Inclusion category options — verified from old app PackagesTab `INCLUSION_OPTIONS`. */
export const INCLUSION_OPTIONS = [
  "Room Charges",
  "Medicine",
  "Consumables",
  "Surgery Charges",
  "Doctor Fee",
  "Nursing Care",
  "Food",
  "Lab Tests",
] as const

// ─── Surgeries ────────────────────────────────────────────────────────────────

/**
 * Verified against supabase/functions/settings/types.ts PredefinedSurgerySchema.
 * DB columns: name, department, doctorNames (JSON TEXT), onDutyDoctors (JSON TEXT),
 * provisionDiagnosis, operationProcedure, operationDetails, isActive, sortOrder
 * API returns doctorNames / onDutyDoctors as JSON-encoded strings (old app uses JSON.parse).
 */
export interface PredefinedSurgery {
  id: string
  name: string
  department?: string | null
  /** JSON-encoded string[] returned from API (old app JSON.parses this) */
  doctorNames?: string
  /** JSON-encoded string[] returned from API (old app JSON.parses this) */
  onDutyDoctors?: string
  provisionDiagnosis?: string | null
  operationProcedure?: string | null
  operationDetails?: string | null
  isActive?: boolean
  sortOrder?: number
}

// ─── Discharges ───────────────────────────────────────────────────────────────

/**
 * Verified against supabase/functions/settings/types.ts PredefinedDischargeSchema.
 * DB columns: name, dischargeDiagnosis, conditionAtDischarge,
 * dischargeMedications, followUpInstructions, isActive, sortOrder
 * Note: dischargeMedications can be JSON-encoded array or plain text.
 */
export interface PredefinedDischarge {
  id: string
  name: string
  dischargeDiagnosis?: string | null
  conditionAtDischarge?: string | null
  dischargeMedications?: string | null
  followUpInstructions?: string | null
  isActive?: boolean
  sortOrder?: number
}

// ─── Medicine Master ──────────────────────────────────────────────────────────

/**
 * Verified against supabase/functions/settings/types.ts MedicineMasterSchema.
 * DB columns: name (UNIQUE within hospital), category, defaultTiming, defaultDays,
 * note, sortOrder, isActive
 */
export interface MedicineMaster {
  id: string
  name: string
  category?: string | null
  defaultTiming?: string | null
  defaultDays?: string | null
  note?: string | null
  sortOrder?: number
  isActive: boolean
}

/**
 * Medicine categories — verified from old app SettingsPage.tsx `MEDICINE_CATEGORIES_LIST`.
 */
export const MEDICINE_CATEGORIES = [
  "Eye Drop",
  "Tablet",
  "Capsule",
  "Ointment",
  "Injection",
  "Syrup",
  "Other",
] as const

/**
 * Prescription timings — verified from old app SettingsPage.tsx `PRESCRIPTION_TIMINGS`.
 */
export const PRESCRIPTION_TIMINGS = [
  "1-1-1",
  "1-1-1-1",
  "1-0-1",
  "1-0-0",
  "0-0-1",
  "0-1-0",
  "1-1-0",
  "0-1-1",
  "SOS",
  "BD",
  "TDS",
  "QID",
  "OD",
  "Tapering",
  "Weekly",
  "Monthly",
] as const

/**
 * Prescription days — verified from old app SettingsPage.tsx `PRESCRIPTION_DAYS`.
 */
export const PRESCRIPTION_DAYS = [
  "1",
  "3",
  "5",
  "7",
  "10",
  "14",
  "21",
  "28",
  "30",
  "45",
  "60",
  "90",
  "Continuous",
] as const
