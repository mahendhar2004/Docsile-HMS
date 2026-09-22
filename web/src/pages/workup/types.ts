/**
 * workup/types.ts — type definitions for the Workup module.
 *
 * Outer API shapes match the EyeReading table / OpenAPI EyeReading schema.
 * Internal form shapes exactly match the JSON stored by the clinical eye-reading
 * form — verified against src/app/(hospital)/workup/components/EyeReadingForm.tsx.
 */

// ─── API response shapes ─────────────────────────────────────────────────────

/**
 * Eye reading record returned by the backend.
 * The optical-measurement data is stored as JSON-encoded TEXT strings.
 */
export interface EyeReadingRecord {
  id: string
  patientId: string
  prescriptionId: string | null
  readingDate: string
  /** JSON-encoded ARSection */
  autoRefractometer: string | null
  /** JSON-encoded — populated by the Optical dispensing module, NOT this form */
  glassesReading: string | null
  /** JSON-encoded DNSection */
  previousPrescription: string | null
  /** JSON-encoded SRSection (DNSection + sightType) */
  presentPrescription: string | null
  /** JSON-encoded CFSection */
  clinicalFindings: string | null
  createdById: string | null
  hospitalId: string
  createdAt: string
}

/** Prescription row nested inside queue/patient responses */
export interface PrescriptionRecord {
  id: string
  status: string
  prescriptionDate: string
  doctorName: string | null
  createdAt: string
}

/**
 * A patient row returned by GET /workup/queue.
 * `status` is computed server-side from eye reading and prescription existence:
 *   REGISTERED | WORKUP_DONE | MEDICAL_ONLY | COMPLETED | MOVED | CANCELLED | NO_SHOW | VISITED
 */
export interface WorkupQueuePatient {
  patientId: string
  name: string
  age: number | null
  gender: string | null
  phone: string | null
  appointmentDate: string | null
  /** Computed workup status */
  status: string
  /** Today's eye readings (0 or 1 element) */
  eyeReadings: EyeReadingRecord[]
  /** Today's prescriptions (0 or 1 element) */
  prescriptions: PrescriptionRecord[]
}

/** Patient returned by GET /workup/patients/{patientId} — same shape */
export type WorkupPatient = WorkupQueuePatient

// ─── API request shape ───────────────────────────────────────────────────────

/**
 * POST /workup/patients/{id}/eye-readings request body.
 * Matches supabase/functions/workup/types.ts EyeReadingSchema.
 */
export interface EyeReadingPayload {
  patientId: string
  readingDate: string
  autoRefractometer: string | null
  glassesReading: string | null
  previousPrescription: string | null
  presentPrescription: string | null
  clinicalFindings: string | null
}

// ─── Internal form shapes ─────────────────────────────────────────────────────
//
// Verified against: src/app/(hospital)/workup/components/EyeReadingForm.tsx
//
// Re, Le keys match the real backend JSON (not right/left).
// All values are strings — clinical notation uses +/- prefixes and fractions.
// Empty string ("") = un-entered field.

// ── Auto Refractometer (AR) ───────────────────────────────────────────────────

/** One eye's AR row: SPH / CYL / AXIS / VA / VAC.P.H */
export type ARRow = {
  sph: string
  cyl: string
  axis: string
  va: string
  vacph: string
}

/** Full AR section: right eye + left eye + pupillary distance */
export type ARSection = { re: ARRow; le: ARRow; pd: string }

// ── Prescription / prescription sections (PGP + SR) ──────────────────────────

/** One eye's distance-or-near row: SPH / CYL / AXIS / VA */
export type EyeRow = { sph: string; cyl: string; axis: string; va: string }

/** Distance + Near pair for one eye */
export type EyeDN = { d: EyeRow; n: EyeRow }

/** One prescription section (PGP — Previous Glass Prescription) */
export type DNSection = { re: EyeDN; le: EyeDN }

/**
 * Present Glass Prescription (SR) — extends DNSection with sightType.
 * sightType is a slash-delimited string: e.g. "Distant/Near" or "Progressive".
 */
export type SRSection = DNSection & { sightType: string }

// ── Clinical Findings (CF) ────────────────────────────────────────────────────

/** Clinical exam fields for one eye */
export type CFEye = {
  lids: string
  sac: string
  conjunctiva: string
  cornea: string
  ac: string
  iris: string
  pupil: string
  lens: string
  vitreous: string
  iop: string
  iopMethod: string
  fundus: string
  cdr: string
}

/** Full CF section: right eye + left eye */
export type CFSection = { re: CFEye; le: CFEye }

// ── Composite form state ──────────────────────────────────────────────────────

/** Complete structured form state (before JSON serialization for API) */
export interface EyeReadingFormData {
  /** autoRefractometer field */
  ar: ARSection
  /** previousPrescription field */
  pgp: DNSection
  /** presentPrescription field (includes sightType) */
  sr: SRSection
  /** clinicalFindings field */
  cf: CFSection
}

// ─── Factory helpers ─────────────────────────────────────────────────────────

export function emptyARRow(): ARRow {
  return { sph: "", cyl: "", axis: "", va: "", vacph: "" }
}

export function emptyARSection(): ARSection {
  return { re: emptyARRow(), le: emptyARRow(), pd: "" }
}

export function emptyEyeRow(): EyeRow {
  return { sph: "", cyl: "", axis: "", va: "" }
}

export function emptyEyeDN(): EyeDN {
  return { d: emptyEyeRow(), n: emptyEyeRow() }
}

export function emptyDNSection(): DNSection {
  return { re: emptyEyeDN(), le: emptyEyeDN() }
}

export function emptySRSection(): SRSection {
  return { re: emptyEyeDN(), le: emptyEyeDN(), sightType: "" }
}

export function emptyCFEye(): CFEye {
  return {
    lids: "", sac: "", conjunctiva: "", cornea: "",
    ac: "", iris: "", pupil: "", lens: "", vitreous: "",
    iop: "", iopMethod: "", fundus: "", cdr: "",
  }
}

export function emptyCFSection(): CFSection {
  return { re: emptyCFEye(), le: emptyCFEye() }
}

export function emptyFormData(): EyeReadingFormData {
  return {
    ar: emptyARSection(),
    pgp: emptyDNSection(),
    sr: emptySRSection(),
    cf: emptyCFSection(),
  }
}

// ─── Parse helpers ────────────────────────────────────────────────────────────

/** Parse the autoRefractometer JSON field into ARSection */
export function parseAR(raw: unknown): ARSection {
  const d = raw as { re?: Partial<ARRow>; le?: Partial<ARRow>; pd?: string } | null
  return {
    re: { sph: d?.re?.sph ?? "", cyl: d?.re?.cyl ?? "", axis: d?.re?.axis ?? "", va: d?.re?.va ?? "", vacph: d?.re?.vacph ?? "" },
    le: { sph: d?.le?.sph ?? "", cyl: d?.le?.cyl ?? "", axis: d?.le?.axis ?? "", va: d?.le?.va ?? "", vacph: d?.le?.vacph ?? "" },
    pd: d?.pd ?? "",
  }
}

/** Parse a previousPrescription/presentPrescription JSON field into DNSection */
export function parseDN(raw: unknown): DNSection {
  const d = raw as { re?: { d?: Partial<EyeRow>; n?: Partial<EyeRow> }; le?: { d?: Partial<EyeRow>; n?: Partial<EyeRow> } } | null
  const row = (r: Partial<EyeRow> | undefined): EyeRow =>
    ({ sph: r?.sph ?? "", cyl: r?.cyl ?? "", axis: r?.axis ?? "", va: r?.va ?? "" })
  return {
    re: { d: row(d?.re?.d), n: row(d?.re?.n) },
    le: { d: row(d?.le?.d), n: row(d?.le?.n) },
  }
}

/** Parse the presentPrescription JSON field into SRSection (includes sightType) */
export function parseSR(raw: unknown): SRSection {
  const base = parseDN(raw)
  const d = raw as { sightType?: string } | null
  return { ...base, sightType: d?.sightType ?? "" }
}

/** Parse the clinicalFindings JSON field into CFSection */
export function parseCF(raw: unknown): CFSection {
  const d = raw as { re?: Partial<CFEye>; le?: Partial<CFEye> } | null
  const eye = (e: Partial<CFEye> | undefined): CFEye => ({
    lids: e?.lids ?? "", sac: e?.sac ?? "", conjunctiva: e?.conjunctiva ?? "",
    cornea: e?.cornea ?? "", ac: e?.ac ?? "", iris: e?.iris ?? "",
    pupil: e?.pupil ?? "", lens: e?.lens ?? "", vitreous: e?.vitreous ?? "",
    iop: e?.iop ?? "", iopMethod: e?.iopMethod ?? "", fundus: e?.fundus ?? "", cdr: e?.cdr ?? "",
  })
  return { re: eye(d?.re), le: eye(d?.le) }
}

// ─── JSON utilities ───────────────────────────────────────────────────────────

/** Safely parse a JSON field, returning defaultValue on null/parse error */
export function parseJsonField<T>(json: string | null, defaultValue: T): T {
  if (json == null || json === "") return defaultValue
  try {
    return JSON.parse(json) as T
  } catch {
    return defaultValue
  }
}
