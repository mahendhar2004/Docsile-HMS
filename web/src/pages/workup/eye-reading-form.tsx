/**
 * workup/eye-reading-form.tsx
 *
 * Clinical eye-reading form — 4 sections matching the real old-app form:
 *   AR  — Auto Refractometer         → autoRefractometer (ARSection)
 *   SR  — Present Glass Prescription → presentPrescription (SRSection)
 *   PGP — Previous Glass Prescription → previousPrescription (DNSection)
 *   CF  — Clinical Findings          → clinicalFindings (CFSection)
 *
 * Constrained-choice fields use SingleSelect (from @/components/patterns)
 * backed by the authoritative option lists from @/lib/workup-options.
 * Free-text fields (vacph, pd, iop, sac) use the shadcn Input.
 *
 * Data shapes are verified against:
 *   src/app/(hospital)/workup/components/EyeReadingForm.tsx
 */

import * as React from "react"
import { Loader2, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { SingleSelect } from "@/components/patterns"
import type { SelectOption } from "@/components/patterns"
import {
  SPH_OPTIONS,
  CYL_OPTIONS,
  AXIS_OPTIONS,
  VA_OPTIONS,
  NEAR_SPH_OPTIONS,
  SIGHT_TYPE_OPTIONS,
  IOP_METHOD_OPTIONS,
  LIDS_OPTIONS,
  CONJUNCTIVA_OPTIONS,
  CORNEA_OPTIONS,
  AC_OPTIONS,
  IRIS_OPTIONS,
  PUPIL_OPTIONS,
  LENS_OPTIONS,
  VITREOUS_OPTIONS,
  FUNDUS_OPTIONS,
  CDR_OPTIONS,
} from "@/lib/workup-options"
import { useSaveEyeReading } from "./use-workup"
import {
  emptyFormData,
  parseAR,
  parseDN,
  parseSR,
  parseCF,
  type ARRow,
  type EyeRow,
  type DNSection,
  type CFEye,
  type EyeReadingFormData,
  type EyeReadingPayload,
  type EyeReadingRecord,
} from "./types"

// ─── Option helpers ───────────────────────────────────────────────────────────

/** Convert a plain string array to SelectOption[] for SingleSelect */
function strOpts(values: string[]): SelectOption[] {
  return values.map((v) => ({ value: v, label: v }))
}

const SPH_OPTS   = strOpts(SPH_OPTIONS)
const CYL_OPTS   = strOpts(CYL_OPTIONS)
const AXIS_OPTS  = strOpts(AXIS_OPTIONS)
const VA_OPTS    = strOpts(VA_OPTIONS)
// Near SPH: combine "add X" shorthand first, then all standard SPH values
// so a stored computed value (e.g. "-0.50") still resolves in the dropdown.
const NEAR_SPH_OPTS = strOpts([...NEAR_SPH_OPTIONS, ...SPH_OPTIONS])
const IOP_METHOD_OPTS = strOpts(IOP_METHOD_OPTIONS)
const LIDS_OPTS        = strOpts(LIDS_OPTIONS)
const CONJUNCTIVA_OPTS = strOpts(CONJUNCTIVA_OPTIONS)
const CORNEA_OPTS      = strOpts(CORNEA_OPTIONS)
const AC_OPTS          = strOpts(AC_OPTIONS)
const IRIS_OPTS        = strOpts(IRIS_OPTIONS)
const PUPIL_OPTS       = strOpts(PUPIL_OPTIONS)
const LENS_OPTS        = strOpts(LENS_OPTIONS)
const VITREOUS_OPTS    = strOpts(VITREOUS_OPTIONS)
const FUNDUS_OPTS      = strOpts(FUNDUS_OPTIONS)
const CDR_OPTS         = strOpts(CDR_OPTIONS)

// ─── Date helper ──────────────────────────────────────────────────────────────

function todayIST(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date())
}

// ─── Near SPH add-helper ──────────────────────────────────────────────────────

/** Compute near SPH when user selects an "add X.XX" shorthand */
function computeNearSph(distanceSph: string, addValue: string): string {
  const addMatch = addValue.match(/^add\s+([\d.]+)$/i)
  if (!addMatch) return addValue
  const addNum = parseFloat(addMatch[1])
  if (isNaN(addNum)) return addValue
  let distNum = 0
  if (distanceSph && distanceSph !== "PL") {
    distNum = parseFloat(distanceSph)
    if (isNaN(distNum)) distNum = 0
  }
  const result = distNum + addNum
  const sign = result >= 0 ? "+" : ""
  const formatted =
    result % 1 === 0
      ? `${sign}${result}.00`
      : result % 0.5 === 0 && result % 0.25 !== 0
      ? `${sign}${result.toFixed(1)}0`
      : `${sign}${result.toFixed(2)}`
  return formatted
}

// ─── Parse record → form data ─────────────────────────────────────────────────

function readingToFormData(reading: EyeReadingRecord): EyeReadingFormData {
  const parseJson = (raw: string | null): unknown => {
    if (!raw) return null
    try { return JSON.parse(raw) } catch { return null }
  }
  return {
    ar:  parseAR(parseJson(reading.autoRefractometer)),
    pgp: parseDN(parseJson(reading.previousPrescription)),
    sr:  parseSR(parseJson(reading.presentPrescription)),
    cf:  parseCF(parseJson(reading.clinicalFindings)),
  }
}

/** Serialize form data into the API payload */
function formDataToPayload(fd: EyeReadingFormData, patientId: string): EyeReadingPayload {
  return {
    patientId,
    readingDate: todayIST(),
    autoRefractometer:    JSON.stringify(fd.ar),
    glassesReading:       null, // populated by Optical dispensing, not this form
    previousPrescription: JSON.stringify(fd.pgp),
    presentPrescription:  JSON.stringify(fd.sr),
    clinicalFindings:     JSON.stringify(fd.cf),
  }
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-medium text-muted-foreground mb-1">{children}</p>
  )
}

/** 4-field row: SPH / CYL / AXIS / VA with SingleSelect for each */
function EyeRow4({
  row,
  onChange,
  showLabels = false,
  idPrefix,
}: {
  row: EyeRow
  onChange: (field: keyof EyeRow, value: string) => void
  showLabels?: boolean
  idPrefix: string
}) {
  const fields = [
    { key: "sph" as const, label: "SPH", opts: SPH_OPTS },
    { key: "cyl" as const, label: "CYL", opts: CYL_OPTS },
    { key: "axis" as const, label: "AXIS", opts: AXIS_OPTS },
    { key: "va" as const, label: "VA", opts: VA_OPTS },
  ]
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {fields.map(({ key, label, opts }) => (
        <div key={key}>
          {showLabels && <FieldLabel>{label}</FieldLabel>}
          <SingleSelect
            size="sm"
            options={opts}
            value={row[key]}
            onChange={(v) => onChange(key, v)}
            placeholder={label}
            aria-label={`${idPrefix} ${label}`}
            clearable
          />
        </div>
      ))}
    </div>
  )
}

/** Near-eye row: SPH (with add shorthand) / CYL / AXIS / VA */
function NearEyeRow4({
  row,
  onChange,
  onChangeAll,
  distanceRow,
  showLabels = false,
  idPrefix,
}: {
  row: EyeRow
  onChange: (field: keyof EyeRow, value: string) => void
  onChangeAll: (next: EyeRow) => void
  distanceRow: EyeRow
  showLabels?: boolean
  idPrefix: string
}) {
  function handleSphChange(v: string) {
    const isAdd = /^add\s+/i.test(v)
    const nextSph = computeNearSph(distanceRow.sph, v)
    if (isAdd) {
      onChangeAll({ sph: nextSph, cyl: distanceRow.cyl, axis: distanceRow.axis, va: distanceRow.va })
    } else {
      onChange("sph", nextSph)
    }
  }
  const nearFields = [
    { key: "cyl" as const, label: "CYL", opts: CYL_OPTS },
    { key: "axis" as const, label: "AXIS", opts: AXIS_OPTS },
    { key: "va" as const, label: "VA", opts: VA_OPTS },
  ]
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      <div>
        {showLabels && <FieldLabel>SPH</FieldLabel>}
        <SingleSelect
          size="sm"
          options={NEAR_SPH_OPTS}
          value={row.sph}
          onChange={handleSphChange}
          placeholder="SPH"
          aria-label={`${idPrefix} near SPH`}
          clearable
        />
      </div>
      {nearFields.map(({ key, label, opts }) => (
        <div key={key}>
          {showLabels && <FieldLabel>{label}</FieldLabel>}
          <SingleSelect
            size="sm"
            options={opts}
            value={row[key]}
            onChange={(v) => onChange(key, v)}
            placeholder={label}
            aria-label={`${idPrefix} near ${label}`}
            clearable
          />
        </div>
      ))}
    </div>
  )
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface EyeReadingFormProps {
  patientId: string
  patientName: string
  /** Existing eye reading for today, if any (prefills the form) */
  existingReading: EyeReadingRecord | null
  /** Whether the current user has workup:create permission */
  hasCreate: boolean
  /**
   * When true, hides this form's own Save button — the caller drives saving
   * imperatively via the forwarded ref instead (doctor consultation's single
   * "Save All" button). Matches main's EyeReadingForm `compact` prop.
   */
  compact?: boolean
}

export interface EyeReadingFormHandle {
  save: () => Promise<void>
}

// ─── Main component ───────────────────────────────────────────────────────────

export const EyeReadingForm = React.forwardRef<EyeReadingFormHandle, EyeReadingFormProps>(
function EyeReadingForm({
  patientId,
  patientName,
  existingReading,
  hasCreate,
  compact = false,
}, ref) {
  const saveMutation = useSaveEyeReading(patientId)

  const [fd, setFd] = React.useState<EyeReadingFormData>(() =>
    existingReading != null ? readingToFormData(existingReading) : emptyFormData()
  )

  // Sync when existingReading changes (e.g., after a successful save)
  React.useEffect(() => {
    setFd(existingReading != null ? readingToFormData(existingReading) : emptyFormData())
  }, [existingReading])

  const isDisabled = !hasCreate || saveMutation.isPending

  // ── Setters ──────────────────────────────────────────────────────────────────

  function setARField(eye: "re" | "le", field: keyof ARRow, value: string) {
    setFd((p) => ({ ...p, ar: { ...p.ar, [eye]: { ...p.ar[eye], [field]: value } } }))
  }

  function setDNField(
    section: "pgp" | "sr",
    eye: "re" | "le",
    dn: "d" | "n",
    field: keyof EyeRow,
    value: string,
  ) {
    setFd((p) => ({
      ...p,
      [section]: {
        ...p[section],
        [eye]: { ...p[section][eye], [dn]: { ...p[section][eye][dn], [field]: value } },
      },
    }))
  }

  function setDNRow(
    section: "pgp" | "sr",
    eye: "re" | "le",
    dn: "d" | "n",
    next: EyeRow,
  ) {
    setFd((p) => ({
      ...p,
      [section]: { ...p[section], [eye]: { ...p[section][eye], [dn]: next } },
    }))
  }

  function setCFField(eye: "re" | "le", field: keyof CFEye, value: string) {
    setFd((p) => ({ ...p, cf: { ...p.cf, [eye]: { ...p.cf[eye], [field]: value } } }))
  }

  function toggleSightType(label: string, checked: boolean) {
    setFd((p) => {
      const current = p.sr.sightType ? p.sr.sightType.split("/").filter(Boolean) : []
      const next = checked
        ? current.includes(label) ? current : [...current, label]
        : current.filter((v) => v !== label)
      return { ...p, sr: { ...p.sr, sightType: next.join("/") } }
    })
  }

  // ── Submit ────────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!hasCreate) return
    const payload = formDataToPayload(fd, patientId)
    await saveMutation.mutateAsync(payload)
  }

  React.useImperativeHandle(ref, () => ({ save: handleSave }))

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    void handleSave()
  }

  // ── Section renderers ─────────────────────────────────────────────────────────

  function renderAR() {
    return (
      <div className="space-y-4">
        {/* Right Eye */}
        <div>
          <h4 className="text-sm font-medium text-foreground mb-2">Right Eye :</h4>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {(["sph", "cyl", "axis", "va"] as const).map((f, i) => (
              <div key={f}>
                <FieldLabel>{["SPH", "CYL", "AXIS", "VA"][i]}</FieldLabel>
                <SingleSelect
                  size="sm"
                  options={f === "sph" ? SPH_OPTS : f === "cyl" ? CYL_OPTS : f === "axis" ? AXIS_OPTS : VA_OPTS}
                  value={fd.ar.re[f]}
                  onChange={(v) => setARField("re", f, v)}
                  placeholder={["SPH", "CYL", "AXIS", "VA"][i]}
                  aria-label={`AR right eye ${["SPH", "CYL", "AXIS", "VA"][i]}`}
                  clearable
                  disabled={isDisabled}
                />
              </div>
            ))}
            <div>
              <FieldLabel>VAC.P.H</FieldLabel>
              <Input
                value={fd.ar.re.vacph}
                onChange={(e) => setARField("re", "vacph", e.target.value)}
                placeholder="—"
                disabled={isDisabled}
                aria-label="AR right eye VAC.P.H"
                className="h-8 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Left Eye */}
        <div>
          <h4 className="text-sm font-medium text-foreground mb-2">Left Eye :</h4>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {(["sph", "cyl", "axis", "va"] as const).map((f) => (
              <SingleSelect
                key={f}
                size="sm"
                options={f === "sph" ? SPH_OPTS : f === "cyl" ? CYL_OPTS : f === "axis" ? AXIS_OPTS : VA_OPTS}
                value={fd.ar.le[f]}
                onChange={(v) => setARField("le", f, v)}
                placeholder={f.toUpperCase()}
                aria-label={`AR left eye ${f.toUpperCase()}`}
                clearable
                disabled={isDisabled}
              />
            ))}
            <Input
              value={fd.ar.le.vacph}
              onChange={(e) => setARField("le", "vacph", e.target.value)}
              placeholder="—"
              disabled={isDisabled}
              aria-label="AR left eye VAC.P.H"
              className="h-8 text-sm"
            />
          </div>
        </div>

        {/* PD */}
        <div className="flex items-center gap-3 pt-3 border-t border-divider">
          <p className="text-xs font-semibold text-muted-foreground w-8">PD</p>
          <Input
            value={fd.ar.pd}
            onChange={(e) => setFd((p) => ({ ...p, ar: { ...p.ar, pd: e.target.value } }))}
            placeholder="Pupillary distance"
            disabled={isDisabled}
            aria-label="Pupillary distance"
            className="h-8 text-sm w-36"
          />
        </div>
      </div>
    )
  }

  function renderDNSection(section: "pgp" | "sr", data: DNSection) {
    const s =
      (eye: "re" | "le", dn: "d" | "n") =>
      (field: keyof EyeRow, value: string) =>
        setDNField(section, eye, dn, field, value)
    const sAll =
      (eye: "re" | "le", dn: "d" | "n") =>
      (next: EyeRow) =>
        setDNRow(section, eye, dn, next)
    const useNear = section === "sr" // SR uses the add-shorthand NearEyeRow

    return (
      <div className="space-y-4">
        {/* Right Eye — Distance */}
        <div>
          <h4 className="text-sm font-medium text-foreground mb-2">Right Eye - Distance :</h4>
          <EyeRow4 row={data.re.d} onChange={s("re", "d")} showLabels idPrefix={`${section}-re-d`} />
        </div>
        <div>
          <h4 className="text-sm font-medium text-foreground mb-2">Near :</h4>
          {useNear ? (
            <NearEyeRow4
              row={data.re.n}
              onChange={s("re", "n")}
              onChangeAll={sAll("re", "n")}
              distanceRow={data.re.d}
              idPrefix={`${section}-re-n`}
            />
          ) : (
            <EyeRow4 row={data.re.n} onChange={s("re", "n")} idPrefix={`${section}-re-n`} />
          )}
        </div>

        {/* Left Eye — Distance */}
        <div className="pt-4 border-t border-divider">
          <h4 className="text-sm font-medium text-foreground mb-2">Left Eye - Distance :</h4>
          <EyeRow4 row={data.le.d} onChange={s("le", "d")} showLabels idPrefix={`${section}-le-d`} />
        </div>
        <div>
          <h4 className="text-sm font-medium text-foreground mb-2">Near :</h4>
          {useNear ? (
            <NearEyeRow4
              row={data.le.n}
              onChange={s("le", "n")}
              onChangeAll={sAll("le", "n")}
              distanceRow={data.le.d}
              idPrefix={`${section}-le-n`}
            />
          ) : (
            <EyeRow4 row={data.le.n} onChange={s("le", "n")} idPrefix={`${section}-le-n`} />
          )}
        </div>

        {/* Sight Type — only for SR section */}
        {section === "sr" && (
          <div className="pt-3 border-t border-divider">
            <h4 className="text-sm font-medium text-foreground mb-2">Sight Type:</h4>
            <div className="flex flex-wrap gap-4">
              {SIGHT_TYPE_OPTIONS.map((option) => {
                const currentValues = fd.sr.sightType
                  ? fd.sr.sightType.split("/").filter(Boolean)
                  : []
                const checked = currentValues.includes(option.label)
                return (
                  <label key={option.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={isDisabled}
                      onChange={(e) => toggleSightType(option.label, e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <span className="text-sm text-muted-foreground">{option.label}</span>
                  </label>
                )
              })}
            </div>
          </div>
        )}
      </div>
    )
  }

  const CF_FIELDS: { key: keyof CFEye; label: string; opts: SelectOption[] | null }[] = [
    { key: "lids",        label: "Lids",       opts: LIDS_OPTS },
    { key: "sac",         label: "SAC",         opts: null },           // free text
    { key: "conjunctiva", label: "Conjunctiva", opts: CONJUNCTIVA_OPTS },
    { key: "cornea",      label: "Cornea",      opts: CORNEA_OPTS },
    { key: "ac",          label: "A.C.",        opts: AC_OPTS },
    { key: "iris",        label: "Iris",        opts: IRIS_OPTS },
    { key: "pupil",       label: "Pupil",       opts: PUPIL_OPTS },
    { key: "lens",        label: "Lens",        opts: LENS_OPTS },
    { key: "vitreous",    label: "Vitreous",    opts: VITREOUS_OPTS },
    { key: "iop",         label: "IOP",         opts: null },           // free text (mmHg)
    { key: "iopMethod",   label: "Method",      opts: IOP_METHOD_OPTS },
    { key: "fundus",      label: "Fundus",      opts: FUNDUS_OPTS },
    { key: "cdr",         label: "CDR",         opts: CDR_OPTS },
  ]

  const [cfOpen, setCfOpen] = React.useState(false)

  function renderCF() {
    return (
      <div className="bg-muted rounded-lg overflow-hidden">
        <button
          type="button"
          onClick={() => setCfOpen((o) => !o)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-100 transition-colors"
          aria-expanded={cfOpen}
        >
          <h3 className="text-sm font-semibold text-foreground">Clinical Findings (CF)</h3>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform duration-200",
              cfOpen && "rotate-180",
            )}
          />
        </button>

        {cfOpen && (
          <div className="px-4 pb-4 border-t border-divider">
            <div className="grid grid-cols-[110px_1fr_1fr] gap-3 mt-3 mb-2">
              <div />
              <p className="text-xs font-semibold text-foreground text-center">Right Eye (RE)</p>
              <p className="text-xs font-semibold text-foreground text-center">Left Eye (LE)</p>
            </div>
            <div className="space-y-2">
              {CF_FIELDS.map(({ key, label, opts }) => (
                <div key={key} className="grid grid-cols-[110px_1fr_1fr] gap-3 items-center">
                  <span className="text-xs text-muted-foreground">{label}</span>
                  {opts !== null ? (
                    <>
                      <SingleSelect
                        size="sm"
                        options={opts}
                        value={fd.cf.re[key]}
                        onChange={(v) => setCFField("re", key, v)}
                        placeholder="RE"
                        aria-label={`CF right eye ${label}`}
                        clearable
                        disabled={isDisabled}
                      />
                      <SingleSelect
                        size="sm"
                        options={opts}
                        value={fd.cf.le[key]}
                        onChange={(v) => setCFField("le", key, v)}
                        placeholder="LE"
                        aria-label={`CF left eye ${label}`}
                        clearable
                        disabled={isDisabled}
                      />
                    </>
                  ) : (
                    <>
                      <Input
                        value={fd.cf.re[key]}
                        onChange={(e) => setCFField("re", key, e.target.value)}
                        placeholder="RE"
                        disabled={isDisabled}
                        aria-label={`CF right eye ${label}`}
                        className="h-8 text-sm"
                      />
                      <Input
                        value={fd.cf.le[key]}
                        onChange={(e) => setCFField("le", key, e.target.value)}
                        placeholder="LE"
                        disabled={isDisabled}
                        aria-label={`CF left eye ${label}`}
                        className="h-8 text-sm"
                      />
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── Layout ────────────────────────────────────────────────────────────────────

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4"
      aria-label={`Eye reading for ${patientName}`}
    >
      <Tabs defaultValue="ar" variant="pill">
        <TabsList>
          <TabsTrigger value="ar">AR</TabsTrigger>
          <TabsTrigger value="sr">SR</TabsTrigger>
          <TabsTrigger value="pgp">PGP</TabsTrigger>
          <TabsTrigger value="cf">CF</TabsTrigger>
        </TabsList>

        <TabsContent value="ar" className="mt-4">
          <div className="bg-muted rounded-lg p-4">
            <h3 className="text-sm font-semibold text-foreground mb-4 pb-2 border-b border-divider">
              Auto Refractometer (AR)
            </h3>
            {renderAR()}
          </div>
        </TabsContent>

        <TabsContent value="sr" className="mt-4">
          <div className="bg-muted rounded-lg p-4">
            <h3 className="text-sm font-semibold text-foreground mb-4 pb-2 border-b border-divider">
              Present Glass Prescription (SR)
            </h3>
            {renderDNSection("sr", fd.sr)}
          </div>
        </TabsContent>

        <TabsContent value="pgp" className="mt-4">
          <div className="bg-muted rounded-lg p-4">
            <h3 className="text-sm font-semibold text-foreground mb-4 pb-2 border-b border-divider">
              Previous Glass Prescription (PGP)
            </h3>
            {renderDNSection("pgp", fd.pgp)}
          </div>
        </TabsContent>

        <TabsContent value="cf" className="mt-4">
          {renderCF()}
        </TabsContent>
      </Tabs>

      {/* Save action — hidden in compact mode; caller drives saving via ref */}
      {!compact && (
        hasCreate ? (
          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              disabled={isDisabled}
              aria-label="Save eye reading"
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Saving…
                </>
              ) : existingReading != null ? (
                "Update Reading"
              ) : (
                "Save Reading"
              )}
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground pt-2">
            You need the <span className="font-medium">workup:create</span> permission to save eye readings.
          </p>
        )
      )}
    </form>
  )
})
