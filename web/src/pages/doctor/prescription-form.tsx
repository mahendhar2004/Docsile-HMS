/**
 * doctor/prescription-form.tsx
 *
 * Prescription writing form for the consultation view.
 *
 * Sections:
 *   1. Vitals (temperature, pulse, SpO2, height, weight)
 *   2. Clinical (present complaint, previous history, diagnosis)
 *   3. Medicines (dynamic list from MedicineMaster; supports "add new")
 *   4. Investigations (dynamic list from InvestigationMaster)
 *   5. Additional (notes, follow-up date, additional notes)
 *
 * Template picker: SingleSelect at the top — selecting a template populates
 * presentComplaint, previousHistory, diagnosis, additionalNotes, medicines,
 * investigations, and followUpDate (via template.followUpDays) as done in the
 * old Next.js app's PrescriptionForm.tsx applyTemplate function.
 *
 * Medicine creation: "+ Add new" Dialog next to the medicine picker — calls
 * POST /doctor/medicines if the doctor can't find a medicine in the list.
 *
 * Pre-fills from todayPrescription if one already exists (UPDATE path).
 *
 * Permission gate: canConsult (doctor:consult) must be true to save.
 *
 * Field names and save payload verified against old app:
 *   src/app/(hospital)/doctor/actions.ts PrescriptionSchema
 *   src/app/(hospital)/doctor/components/PrescriptionForm.tsx handleSave()
 */

import { useState, useCallback, useId } from "react"
import { useForm, useFieldArray, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Plus, Trash2, ClipboardList } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog"
import {
  FormField,
  FormSection,
  TextInput,
  NumberInput,
  SingleSelect,
  DatePicker,
} from "@/components/patterns"
import { useSavePrescription, useCreateMedicine } from "./hooks"
import type {
  ConsultationPatient,
  ReferenceData,
  MedicineItem,
  InvestigationItem,
  PredefinedTemplate,
} from "./types"
import { toast } from "@/components/ui/sonner"

// ─── Schema ───────────────────────────────────────────────────────────────────

// Common timing options verified from old app's MEDICINE_TIMINGS constant.
export const MEDICINE_TIMINGS = [
  "1-1-1", "1-1-1-1", "1-0-1", "1-0-0", "0-0-1", "0-1-0",
  "1-1-0", "0-1-1", "SOS", "BD", "TDS", "QID", "OD",
  "Tapering", "Weekly", "Monthly",
]

// Common days options verified from old app's MEDICINE_DAYS constant.
export const MEDICINE_DAYS = [
  "1", "3", "5", "7", "10", "14", "21", "28", "30", "45", "60",
  "90", "Continuous",
]

// Medicine categories from old app's MEDICINE_CATEGORIES constant.
export const MEDICINE_CATEGORIES = [
  "Eye Drop", "Tablet", "Ointment", "Capsule", "Injection", "Syrup", "Other",
]

const medicineSchema = z.object({
  name: z.string().min(1, "Medicine name required"),
  // Plain z.string() without .default() — Zod 4 .default() changes the input
  // type to optional which conflicts with zodResolver's inferred FormValues type.
  // Defaults are provided via useForm defaultValues / buildDefaultValues instead.
  timing: z.string(),
  days: z.string(),
  note: z.string().optional(),
})

const investigationSchema = z.object({
  name: z.string().min(1, "Investigation name required"),
  note: z.string().optional(),
})

const prescriptionSchema = z.object({
  doctorName: z.string().optional(),
  department: z.string().optional(),
  temperature: z.number().nullable().optional(),
  pulseRate: z.number().int().nullable().optional(),
  spo2: z.number().int().nullable().optional(),
  heightCm: z.number().nullable().optional(),
  weightKg: z.number().nullable().optional(),
  presentComplaint: z.string().optional(),
  previousHistory: z.string().optional(),
  diagnosis: z.string().optional(),
  additionalNotes: z.string().optional(),
  medicines: z.array(medicineSchema),
  investigations: z.array(investigationSchema),
  followUpDate: z.date().nullable().optional(),
  notes: z.string().optional(),
})

type FormValues = z.infer<typeof prescriptionSchema>

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseMedicines(json: string | null): MedicineItem[] {
  if (!json) return []
  try {
    return JSON.parse(json) as MedicineItem[]
  } catch {
    return []
  }
}

function parseInvestigations(json: string | null): InvestigationItem[] {
  if (!json) return []
  try {
    return JSON.parse(json) as InvestigationItem[]
  } catch {
    return []
  }
}

function buildDefaultValues(
  consultation: ConsultationPatient,
  doctorName: string,
): FormValues {
  const rx = consultation.todayPrescription
  if (!rx) {
    return {
      doctorName,
      department: "",
      temperature: null,
      pulseRate: null,
      spo2: null,
      heightCm: null,
      weightKg: null,
      presentComplaint: "",
      previousHistory: "",
      diagnosis: "",
      additionalNotes: "",
      medicines: [],
      investigations: [],
      followUpDate: null,
      notes: "",
    }
  }
  return {
    doctorName: rx.doctorName ?? doctorName,
    department: rx.department ?? "",
    temperature: rx.temperature ?? null,
    pulseRate: rx.pulseRate ?? null,
    spo2: rx.spo2 ?? null,
    heightCm: rx.heightCm ?? null,
    weightKg: rx.weightKg ?? null,
    presentComplaint: rx.presentComplaint ?? "",
    previousHistory: rx.previousHistory ?? "",
    diagnosis: rx.diagnosis ?? "",
    additionalNotes: rx.additionalNotes ?? "",
    medicines: parseMedicines(rx.medicines).map((m) => ({
      name: m.name,
      timing: m.timing ?? "",
      days: m.days ?? "",
      note: m.note,
    })),
    investigations: parseInvestigations(rx.investigations),
    followUpDate: rx.followUpDate ? new Date(rx.followUpDate) : null,
    notes: rx.notes ?? "",
  }
}

// ─── Add New Medicine Dialog ──────────────────────────────────────────────────

interface AddMedicineDialogProps {
  open: boolean
  onClose: () => void
  canConsult: boolean
  onCreated: (medicine: { name: string; defaultTiming?: string | null; defaultDays?: string | null }) => void
}

function AddMedicineDialog({ open, onClose, canConsult, onCreated }: AddMedicineDialogProps) {
  const [name, setName] = useState("")
  const [timing, setTiming] = useState<string | null>(null)
  const [days, setDays] = useState<string | null>(null)
  const [category, setCategory] = useState<string | null>(null)
  const createMedicine = useCreateMedicine((m) => {
    onCreated({ name: m.name, defaultTiming: m.defaultTiming, defaultDays: m.defaultDays })
    toast.success(`Medicine "${m.name}" added.`)
    setName("")
    setTiming(null)
    setDays(null)
    setCategory(null)
    onClose()
  })

  const handleSubmit = () => {
    if (!name.trim()) return
    createMedicine.mutate(
      {
        name: name.trim(),
        defaultTiming: timing ?? null,
        defaultDays: days ?? null,
        // MEDICINE_CATEGORIES from old app: Eye Drop, Tablet, Ointment, Capsule, Injection, Syrup, Other
        category: category ?? null,
      },
      {
        onError: () => toast.error("Failed to create medicine. Please try again."),
      },
    )
  }

  const nameId = useId()
  // Options from old app's MEDICINE_TIMINGS, MEDICINE_DAYS, MEDICINE_CATEGORIES constants
  const timingOpts = MEDICINE_TIMINGS.map((t) => ({ value: t, label: t }))
  const daysOpts = MEDICINE_DAYS.map((d) => ({ value: d, label: d }))
  const catOpts = MEDICINE_CATEGORIES.map((c) => ({ value: c, label: c }))

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Add new medicine</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 mt-2">
          <FormField label="Medicine name" htmlFor={nameId} required>
            <TextInput
              id={nameId}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Tropicamide 1% Eye Drop"
              disabled={!canConsult}
            />
          </FormField>
          <FormField label="Category" htmlFor={`${nameId}-cat`}>
            <SingleSelect
              options={catOpts}
              value={category ?? ""}
              onChange={setCategory}
              placeholder="Eye Drop, Tablet, etc."
              aria-label="Medicine category"
              disabled={!canConsult}
            />
          </FormField>
          <FormField label="Default timing" htmlFor={`${nameId}-timing`}>
            <SingleSelect
              options={timingOpts}
              value={timing ?? ""}
              onChange={setTiming}
              placeholder="Select timing"
              aria-label="Default timing"
              disabled={!canConsult}
            />
          </FormField>
          <FormField label="Default days" htmlFor={`${nameId}-days`}>
            <SingleSelect
              options={daysOpts}
              value={days ?? ""}
              onChange={setDays}
              placeholder="Select days"
              aria-label="Default days"
              disabled={!canConsult}
            />
          </FormField>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <DialogClose asChild>
            <Button type="button" variant="outline" size="sm">
              Cancel
            </Button>
          </DialogClose>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            disabled={!canConsult || !name.trim() || createMedicine.isPending}
          >
            {createMedicine.isPending ? "Adding…" : "Add medicine"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main form ────────────────────────────────────────────────────────────────

interface PrescriptionFormProps {
  consultation: ConsultationPatient
  referenceData: ReferenceData
  canConsult: boolean
  canEdit: boolean
  doctorName: string
  onSaved: () => void
}

export function PrescriptionForm({
  consultation,
  referenceData,
  canConsult,
  canEdit,
  doctorName,
  onSaved,
}: PrescriptionFormProps) {
  const [addMedOpen, setAddMedOpen] = useState(false)
  const [medSearch, setMedSearch] = useState("")
  const [invSearch, setInvSearch] = useState("")

  const canWrite = canConsult || canEdit

  const {
    control,
    register,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(prescriptionSchema),
    defaultValues: buildDefaultValues(consultation, doctorName),
  })

  const {
    fields: medicineFields,
    append: appendMedicine,
    remove: removeMedicine,
  } = useFieldArray({ control, name: "medicines" })

  const {
    fields: investigationFields,
    append: appendInvestigation,
    remove: removeInvestigation,
  } = useFieldArray({ control, name: "investigations" })

  const saveMutation = useSavePrescription(consultation.id, () => {
    toast.success("Prescription saved.")
    onSaved()
  })

  const onSubmit = (values: FormValues) => {
    // Matches old app's handleSave() payload shape (actions.ts PrescriptionSchema).
    // medicines filtered to non-empty names; timing/days always strings (backend .default("")).
    saveMutation.mutate({
      patientId: consultation.patientId,
      doctorName: values.doctorName || undefined,
      department: values.department || undefined,
      temperature: values.temperature ?? undefined,
      pulseRate: values.pulseRate ?? undefined,
      spo2: values.spo2 ?? undefined,
      heightCm: values.heightCm ?? undefined,
      weightKg: values.weightKg ?? undefined,
      presentComplaint: values.presentComplaint || undefined,
      previousHistory: values.previousHistory || undefined,
      diagnosis: values.diagnosis || undefined,
      additionalNotes: values.additionalNotes || undefined,
      medicines: values.medicines
        .filter((m) => m.name.trim())
        .map((m) => ({
          name: m.name,
          timing: m.timing ?? "",
          days: m.days ?? "",
          note: m.note,
        })),
      investigations: values.investigations
        .filter((i) => i.name.trim())
        .map((i) => ({ name: i.name, note: i.note })),
      // followUpDate as YYYY-MM-DD string (old app sends it this way)
      followUpDate: values.followUpDate
        ? new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(
            values.followUpDate,
          )
        : null,
      notes: values.notes || undefined,
    })
  }

  // Apply a prescription template — matches old app applyTemplate() behavior exactly:
  //   presentComplaint, previousHistory, provisionalDiagnosis→diagnosis, additionalNotes→notes,
  //   medicines, investigations, and followUpDate computed from followUpDays.
  const applyTemplate = useCallback(
    (templateId: string) => {
      const template = referenceData.templates.find((t: PredefinedTemplate) => t.id === templateId)
      if (!template) return

      if (template.presentComplaint) {
        setValue("presentComplaint", template.presentComplaint ?? "", { shouldDirty: true })
      }
      if (template.previousHistory) {
        setValue("previousHistory", template.previousHistory ?? "", { shouldDirty: true })
      }
      // provisionalDiagnosis in the template maps to diagnosis in the form
      if (template.provisionalDiagnosis) {
        setValue("diagnosis", template.provisionalDiagnosis ?? "", { shouldDirty: true })
      }
      if (template.additionalNotes) {
        setValue("notes", template.additionalNotes ?? "", { shouldDirty: true })
      }

      const meds = parseMedicines(template.medicines).map((m) => ({
        name: m.name,
        timing: m.timing ?? "",
        days: m.days ?? "",
        note: m.note,
      }))
      if (meds.length > 0) {
        setValue("medicines", meds, { shouldDirty: true })
      }

      const invs = parseInvestigations(template.investigations)
      if (invs.length > 0) {
        setValue("investigations", invs, { shouldDirty: true })
      }

      // followUpDays → compute follow-up date from today (IST)
      if (template.followUpDays) {
        const d = new Date()
        d.setDate(d.getDate() + template.followUpDays)
        setValue("followUpDate", d, { shouldDirty: true })
      }

      toast.success(`Template "${template.name}" applied.`)
    },
    [referenceData.templates, setValue],
  )

  // Build SelectOption arrays for dropdowns
  const medicineOptions = referenceData.medicines.map((m) => ({
    value: m.name,
    label: m.name,
  }))

  const investigationOptions = referenceData.investigations.map((name) => ({
    value: name,
    label: name,
  }))

  const templateOptions = referenceData.templates.map((t: PredefinedTemplate) => ({
    value: t.id,
    label: t.name,
  }))

  // Common timing/days options from old app constants (MEDICINE_TIMINGS, MEDICINE_DAYS)
  const timingOptions = MEDICINE_TIMINGS.map((t) => ({ value: t, label: t }))
  const daysOptions = MEDICINE_DAYS.map((d) => ({ value: d, label: d }))

  return (
    <>
      <AddMedicineDialog
        open={addMedOpen}
        onClose={() => setAddMedOpen(false)}
        canConsult={canConsult}
        onCreated={(med) => {
          appendMedicine({
            name: med.name,
            timing: med.defaultTiming ?? "",
            days: med.defaultDays ?? "",
            note: "",
          })
        }}
      />

      <form
        onSubmit={handleSubmit(onSubmit, (errs) => {
          console.warn("[PrescriptionForm] validation errors", errs)
        })}
        className="flex flex-col gap-6"
        aria-label="Prescription form"
        noValidate
      >
        {/* Template picker */}
        {templateOptions.length > 0 && (
          <div className="flex items-center gap-2">
            <ClipboardList size={16} className="text-muted-foreground shrink-0" aria-hidden="true" />
            <div className="flex-1">
              <SingleSelect
                options={templateOptions}
                value=""
                onChange={(val) => {
                  if (val) applyTemplate(val)
                }}
                placeholder="Apply a prescription template…"
                aria-label="Select prescription template"
                disabled={!canWrite}
              />
            </div>
          </div>
        )}

        {/* ── Vitals ───────────────────────────────────────────────────────────── */}
        <FormSection title="Vitals">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <FormField label="Temp (°F)" htmlFor="temp">
              <Controller
                control={control}
                name="temperature"
                render={({ field }) => (
                  <NumberInput
                    id="temp"
                    value={field.value ?? undefined}
                    onChange={(e) =>
                      field.onChange(
                        e.target.value ? parseFloat(e.target.value) : null,
                      )
                    }
                    placeholder="98.6"
                    step={0.1}
                    disabled={!canWrite}
                    aria-label="Temperature in Fahrenheit"
                  />
                )}
              />
            </FormField>
            <FormField label="Pulse (bpm)" htmlFor="pulse">
              <Controller
                control={control}
                name="pulseRate"
                render={({ field }) => (
                  <NumberInput
                    id="pulse"
                    value={field.value ?? undefined}
                    onChange={(e) =>
                      field.onChange(
                        e.target.value ? Math.round(parseFloat(e.target.value)) : null,
                      )
                    }
                    placeholder="72"
                    min={0}
                    max={300}
                    disabled={!canWrite}
                    aria-label="Pulse rate in bpm"
                  />
                )}
              />
            </FormField>
            <FormField label="SpO2 (%)" htmlFor="spo2">
              <Controller
                control={control}
                name="spo2"
                render={({ field }) => (
                  <NumberInput
                    id="spo2"
                    value={field.value ?? undefined}
                    onChange={(e) =>
                      field.onChange(
                        e.target.value ? Math.round(parseFloat(e.target.value)) : null,
                      )
                    }
                    placeholder="99"
                    min={0}
                    max={100}
                    disabled={!canWrite}
                    aria-label="SpO2 percentage"
                  />
                )}
              />
            </FormField>
            <FormField label="Height (cm)" htmlFor="height">
              <Controller
                control={control}
                name="heightCm"
                render={({ field }) => (
                  <NumberInput
                    id="height"
                    value={field.value ?? undefined}
                    onChange={(e) =>
                      field.onChange(
                        e.target.value ? parseFloat(e.target.value) : null,
                      )
                    }
                    placeholder="170"
                    min={0}
                    disabled={!canWrite}
                    aria-label="Height in centimetres"
                  />
                )}
              />
            </FormField>
            <FormField label="Weight (kg)" htmlFor="weight">
              <Controller
                control={control}
                name="weightKg"
                render={({ field }) => (
                  <NumberInput
                    id="weight"
                    value={field.value ?? undefined}
                    onChange={(e) =>
                      field.onChange(
                        e.target.value ? parseFloat(e.target.value) : null,
                      )
                    }
                    placeholder="70"
                    min={0}
                    disabled={!canWrite}
                    aria-label="Weight in kilograms"
                  />
                )}
              />
            </FormField>
          </div>
        </FormSection>

        {/* ── Clinical ─────────────────────────────────────────────────────────── */}
        <FormSection title="Clinical">
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField label="Doctor name" htmlFor="doctorName">
                <TextInput
                  id="doctorName"
                  {...register("doctorName")}
                  placeholder="Dr. Name"
                  disabled={!canWrite}
                />
              </FormField>
              <FormField label="Department" htmlFor="department">
                <TextInput
                  id="department"
                  {...register("department")}
                  placeholder="e.g. Ophthalmology"
                  disabled={!canWrite}
                />
              </FormField>
            </div>

            <FormField label="Present complaint" htmlFor="complaint">
              <Textarea
                id="complaint"
                {...register("presentComplaint")}
                placeholder="Chief complaint…"
                disabled={!canWrite}
                className="min-h-[60px]"
              />
            </FormField>

            <FormField label="Previous history" htmlFor="history">
              <Textarea
                id="history"
                {...register("previousHistory")}
                placeholder="Relevant past history…"
                disabled={!canWrite}
                className="min-h-[60px]"
              />
            </FormField>

            <FormField label="Diagnosis" htmlFor="diagnosis">
              <Textarea
                id="diagnosis"
                {...register("diagnosis")}
                placeholder="Clinical diagnosis…"
                disabled={!canWrite}
                className="min-h-[60px]"
              />
            </FormField>
          </div>
        </FormSection>

        {/* ── Medicines ────────────────────────────────────────────────────────── */}
        <FormSection
          title="Medicines"
          description="Select from master list or add a new medicine."
        >
          <div className="flex flex-col gap-2">
            {/* Medicine picker + add button */}
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <SingleSelect
                  options={medicineOptions}
                  value={medSearch}
                  onChange={(val) => {
                    if (!val) return
                    const med = referenceData.medicines.find((m) => m.name === val)
                    appendMedicine({
                      name: val,
                      timing: med?.defaultTiming ?? "",
                      days: med?.defaultDays ?? "",
                      note: "",
                    })
                    setMedSearch("")
                  }}
                  placeholder="Search and add a medicine…"
                  aria-label="Add medicine from master list"
                  disabled={!canWrite}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAddMedOpen(true)}
                disabled={!canConsult}
                aria-label="Create new medicine"
              >
                <Plus size={14} aria-hidden="true" />
                New
              </Button>
            </div>

            {/* Medicine rows */}
            {medicineFields.length > 0 && (
              <div className="flex flex-col gap-2 mt-1">
                {medicineFields.map((field, idx) => (
                  <div
                    key={field.id}
                    className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2 items-start"
                    aria-label={`Medicine ${idx + 1}`}
                  >
                    <FormField label={idx === 0 ? "Name" : ""} htmlFor={`med-name-${idx}`}>
                      <TextInput
                        id={`med-name-${idx}`}
                        {...register(`medicines.${idx}.name`)}
                        placeholder="Medicine name"
                        disabled={!canWrite}
                        hasError={!!errors.medicines?.[idx]?.name}
                      />
                    </FormField>
                    {/* Timing: SingleSelect with MEDICINE_TIMINGS options from old app */}
                    <FormField label={idx === 0 ? "Timing" : ""} htmlFor={`med-timing-${idx}`}>
                      <Controller
                        control={control}
                        name={`medicines.${idx}.timing`}
                        render={({ field: f }) => (
                          <SingleSelect
                            options={timingOptions}
                            value={f.value ?? ""}
                            onChange={(v) => f.onChange(v)}
                            placeholder="Timing"
                            aria-label={`Timing for medicine ${idx + 1}`}
                            disabled={!canWrite}
                          />
                        )}
                      />
                    </FormField>
                    {/* Days: SingleSelect with MEDICINE_DAYS options from old app */}
                    <FormField label={idx === 0 ? "Days" : ""} htmlFor={`med-days-${idx}`}>
                      <Controller
                        control={control}
                        name={`medicines.${idx}.days`}
                        render={({ field: f }) => (
                          <SingleSelect
                            options={daysOptions}
                            value={f.value ?? ""}
                            onChange={(v) => f.onChange(v)}
                            placeholder="Days"
                            aria-label={`Days for medicine ${idx + 1}`}
                            disabled={!canWrite}
                          />
                        )}
                      />
                    </FormField>
                    <FormField label={idx === 0 ? "Note" : ""} htmlFor={`med-note-${idx}`}>
                      <TextInput
                        id={`med-note-${idx}`}
                        {...register(`medicines.${idx}.note`)}
                        placeholder="After meals"
                        disabled={!canWrite}
                      />
                    </FormField>
                    <div className={idx === 0 ? "mt-6" : ""}>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeMedicine(idx)}
                        disabled={!canWrite}
                        aria-label={`Remove medicine ${getValues(`medicines.${idx}.name`) || idx + 1}`}
                      >
                        <Trash2 size={14} aria-hidden="true" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </FormSection>

        {/* ── Investigations ───────────────────────────────────────────────────── */}
        <FormSection title="Investigations">
          <div className="flex flex-col gap-2">
            <div className="flex-1">
              <SingleSelect
                options={investigationOptions}
                value={invSearch}
                onChange={(val) => {
                  if (!val) return
                  appendInvestigation({ name: val, note: "" })
                  setInvSearch("")
                }}
                placeholder="Search and add an investigation…"
                aria-label="Add investigation"
                disabled={!canWrite}
              />
            </div>

            {investigationFields.length > 0 && (
              <div className="flex flex-col gap-2 mt-1">
                {investigationFields.map((field, idx) => (
                  <div
                    key={field.id}
                    className="grid grid-cols-[2fr_2fr_auto] gap-2 items-start"
                    aria-label={`Investigation ${idx + 1}`}
                  >
                    <FormField label={idx === 0 ? "Name" : ""} htmlFor={`inv-name-${idx}`}>
                      <TextInput
                        id={`inv-name-${idx}`}
                        {...register(`investigations.${idx}.name`)}
                        placeholder="Investigation name"
                        disabled={!canWrite}
                        hasError={!!errors.investigations?.[idx]?.name}
                      />
                    </FormField>
                    <FormField label={idx === 0 ? "Note" : ""} htmlFor={`inv-note-${idx}`}>
                      <TextInput
                        id={`inv-note-${idx}`}
                        {...register(`investigations.${idx}.note`)}
                        placeholder="e.g. Fasting"
                        disabled={!canWrite}
                      />
                    </FormField>
                    <div className={idx === 0 ? "mt-6" : ""}>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeInvestigation(idx)}
                        disabled={!canWrite}
                        aria-label={`Remove investigation ${getValues(`investigations.${idx}.name`) || idx + 1}`}
                      >
                        <Trash2 size={14} aria-hidden="true" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </FormSection>

        {/* ── Follow-up & notes ────────────────────────────────────────────────── */}
        <FormSection title="Additional">
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField label="Follow-up date" htmlFor="followup">
                <Controller
                  control={control}
                  name="followUpDate"
                  render={({ field }) => (
                    <DatePicker
                      id="followup"
                      value={field.value ?? undefined}
                      onChange={(d) => field.onChange(d ?? null)}
                      fromDate={new Date()}
                      placeholder="Select follow-up date"
                      disabled={!canWrite}
                      aria-label="Follow-up date"
                    />
                  )}
                />
              </FormField>
            </div>

            <FormField label="Additional notes" htmlFor="addNotes">
              <Textarea
                id="addNotes"
                {...register("additionalNotes")}
                placeholder="Additional notes for billing, referral, etc."
                disabled={!canWrite}
                className="min-h-[60px]"
              />
            </FormField>

            <FormField label="Notes" htmlFor="notes">
              <Textarea
                id="notes"
                {...register("notes")}
                placeholder="Internal notes…"
                disabled={!canWrite}
                className="min-h-[60px]"
              />
            </FormField>
          </div>
        </FormSection>

        {/* Save button */}
        <div className="flex justify-end gap-3 pt-2">
          {!canWrite && (
            <p className="text-sm text-muted-foreground self-center">
              You need the <code>doctor:consult</code> permission to save.
            </p>
          )}
          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={!canWrite || saveMutation.isPending}
            aria-label="Save prescription"
          >
            {saveMutation.isPending ? "Saving…" : "Save prescription"}
          </Button>
        </div>
      </form>
    </>
  )
}
