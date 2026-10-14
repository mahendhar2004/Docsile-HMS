/**
 * InPatientAdmissionForm — faithful 3-step port of main's real admission
 * wizard (src/app/(hospital)/inpatients/components/InPatientAdmissionForm.tsx
 * + Step1Patient/Step2Hospital/Step3Payment). This replaces an earlier,
 * non-faithful 2-step stub that only handled "search existing patient" +
 * ward/bed/on-duty-doctors — missing the entire Hospital Information and
 * Payment & Package steps, and the rich InPatient field set main actually
 * collects (InPatient is a self-contained demographic + admission +
 * operation + billing record in main, not a thin link to a Patient row).
 *
 * Step 1 — Patient Details: optional existing-patient lookup (admit only),
 *          admission/discharge dates, demographics, admission notes.
 * Step 2 — Hospital Information: predefined-surgery template picker,
 *          operation details, surgical team (doctors + on-duty doctors).
 * Step 3 — Payment & Package: predefined-package template picker, package
 *          inclusions, discount, payment records, running balance.
 *
 * Deliberately out of scope (noted, not ported): main's createInPatient
 * server action also auto-creates an InsuranceClaim when a payment record's
 * amountType is "Insurance" — that cross-module side effect is not part of
 * the admission wizard itself and isn't ported here.
 *
 * Permission guard: inpatients:create — caller gates before rendering.
 */

import { useEffect, useMemo, useRef, useState } from "react"
import { Check, Loader2, Plus, RotateCcw, Search, X } from "lucide-react"
import { toast } from "@/components/ui/sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { EditableComboboxWithAdd } from "@/components/ui/editable-combobox"
import {
  DatePicker,
  SegmentedControl,
  PhoneInput,
  CurrencyInput,
  AddressFields,
  type AddressValue,
} from "@/components/patterns"
import { cn, calculateAge, formatCurrency, todayISO } from "@/lib/utils"
import {
  useAdmissionForm,
  useNextIpNumber,
  usePatientSearch,
  useCreateInPatient,
  useAddDropdownOption,
} from "./hooks"
import type {
  InPatient,
  Patient,
  PackageInclusion,
  PaymentRecord,
  PredefinedSurgery,
  PredefinedPackage,
} from "./types"

// ─── Local types ────────────────────────────────────────────────────────────

interface WizardState {
  opPatientId: string
  admissionDate: string
  dischargeDate: string
  name: string
  age: string
  gender: string
  dateOfBirth: string
  phone: string
  address: AddressValue
  guardianName: string
  referredBy: string
  admissionNotes: string
  operationDate: string
  operationName: string
  department: string
  doctorNames: string[]
  onDutyDoctors: string[]
  provisionDiagnosis: string
  operationProcedure: string
  operationDetails: string
  packageInclusions: PackageInclusion[]
  discount: number
  paymentRecords: PaymentRecord[]
}

function nowLocal(): string {
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}

const EMPTY_STATE: WizardState = {
  opPatientId: "",
  admissionDate: nowLocal(),
  dischargeDate: "",
  name: "",
  age: "",
  gender: "",
  dateOfBirth: "",
  phone: "",
  address: {},
  guardianName: "",
  referredBy: "",
  admissionNotes: "",
  operationDate: "",
  operationName: "",
  department: "",
  doctorNames: [""],
  onDutyDoctors: [""],
  provisionDiagnosis: "",
  operationProcedure: "",
  operationDetails: "",
  packageInclusions: [{ name: "", amount: 0 }],
  discount: 0,
  paymentRecords: [],
}

const STEPS = [
  { n: 1, label: "Patient Details" },
  { n: 2, label: "Hospital Information" },
  { n: 3, label: "Payment & Package" },
] as const

const PAYMENT_AMOUNT_TYPES = ["Advance", "Partial", "Final", "Refund", "Insurance"]
const PAYMENT_MODES = ["Cash", "UPI", "Both", "Insurance"]
const GENDER_OPTIONS = [
  { value: "MALE", label: "Male" },
  { value: "FEMALE", label: "Female" },
  { value: "OTHER", label: "Other" },
]

function SectionHeader({
  children,
  hint,
  right,
}: {
  children: React.ReactNode
  hint?: string
  right?: React.ReactNode
}) {
  return (
    <div className="flex items-baseline justify-between px-1 mb-2">
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {children}
      </h3>
      <div className="flex items-center gap-2">
        {hint && <span className="text-[11px] text-muted-foreground/70">{hint}</span>}
        {right}
      </div>
    </div>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <Label className="text-[11px] font-medium text-muted-foreground">{children}</Label>
}

// ─── Component ────────────────────────────────────────────────────────────────

export interface InPatientAdmissionFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (inpatient: InPatient) => void
}

export function InPatientAdmissionForm({
  open,
  onOpenChange,
  onSuccess,
}: InPatientAdmissionFormProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [state, setState] = useState<WizardState>(EMPTY_STATE)

  const { data: nextIpData } = useNextIpNumber(open)
  const { data: formData } = useAdmissionForm()
  const [doctorOptions, setDoctorOptions] = useState<string[]>([])
  const [departmentOptions, setDepartmentOptions] = useState<string[]>([])
  const [referralOptions, setReferralOptions] = useState<string[]>([])
  const [cityOptions, setCityOptions] = useState<string[]>([])

  useEffect(() => {
    if (!formData) return
    setDoctorOptions(formData.doctorOptions)
    setDepartmentOptions(formData.departmentOptions)
    setReferralOptions(formData.referralOptions)
    setCityOptions(formData.cityOptions)
  }, [formData])

  const addDropdownOption = useAddDropdownOption()
  const createInPatient = useCreateInPatient((ip) => {
    toast.success("Patient admitted")
    onSuccess(ip)
    onOpenChange(false)
  })

  useEffect(() => {
    if (!open) return
    setStep(1)
    setState(EMPTY_STATE)
  }, [open])

  // ── Step 1: existing-patient search ──────────────────────────────────────
  const [query, setQuery] = useState("")
  const [openResults, setOpenResults] = useState(false)
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { data: searchData, isLoading: isSearching } = usePatientSearch(query)
  const searchResults = query.trim().length >= 2 ? (searchData?.patients ?? []).slice(0, 8) : []

  function pickResult(r: Patient) {
    const fullName = [r.firstName, r.lastName].filter(Boolean).join(" ")
    setState((prev) => ({
      ...prev,
      opPatientId: r.patientId,
      name: fullName,
      age: r.age != null ? String(r.age) : prev.age,
      gender: r.gender ? r.gender.toUpperCase() : prev.gender,
      phone: r.phone ?? prev.phone,
      address: {
        addressLine: r.addressLine ?? prev.address.addressLine,
        area: r.area ?? prev.address.area,
        city: r.city ?? prev.address.city,
        state: r.state ?? prev.address.state,
        pincode: r.pincode ?? prev.address.pincode,
      },
      guardianName: r.guardianName ?? prev.guardianName,
      dateOfBirth: r.dateOfBirth ? r.dateOfBirth.slice(0, 10) : prev.dateOfBirth,
    }))
    setQuery(`${fullName} · ${r.patientId}`)
    setOpenResults(false)
  }

  // ── Step 2: predefined surgery ───────────────────────────────────────────
  const [surgeryQuery, setSurgeryQuery] = useState("")
  const [surgeryOpen, setSurgeryOpen] = useState(false)
  const [surgeryApplied, setSurgeryApplied] = useState(false)
  const surgeryBlur = useRef<ReturnType<typeof setTimeout> | null>(null)
  const predefinedSurgeries = formData?.predefinedSurgeries ?? []

  const filteredSurgeries = useMemo(() => {
    const q = surgeryQuery.trim().toLowerCase()
    if (!q) return predefinedSurgeries.slice(0, 8)
    return predefinedSurgeries
      .filter(
        (s) =>
          s.name.toLowerCase().includes(q) || (s.department?.toLowerCase().includes(q) ?? false),
      )
      .slice(0, 8)
  }, [surgeryQuery, predefinedSurgeries])

  function applySurgery(t: PredefinedSurgery) {
    let docs: string[] = []
    let onDuty: string[] = []
    try {
      docs = JSON.parse(t.doctorNames)
    } catch {
      /* ignore malformed template data */
    }
    try {
      onDuty = JSON.parse(t.onDutyDoctors)
    } catch {
      /* ignore malformed template data */
    }
    setState((prev) => ({
      ...prev,
      operationName: t.name,
      department: t.department ?? prev.department,
      doctorNames: docs.length ? docs : [""],
      onDutyDoctors: onDuty.length ? onDuty : [""],
      provisionDiagnosis: t.provisionDiagnosis ?? "",
      operationProcedure: t.operationProcedure ?? "",
      operationDetails: t.operationDetails ?? "",
    }))
    setSurgeryQuery(t.name)
    setSurgeryOpen(false)
    setSurgeryApplied(true)
  }

  function resetSurgery() {
    setState((prev) => ({
      ...prev,
      operationName: "",
      department: "",
      doctorNames: [""],
      onDutyDoctors: [""],
      provisionDiagnosis: "",
      operationProcedure: "",
      operationDetails: "",
    }))
    setSurgeryQuery("")
    setSurgeryApplied(false)
  }

  function updateDoctorRow(i: number, v: string) {
    setState((p) => ({ ...p, doctorNames: p.doctorNames.map((x, j) => (j === i ? v : x)) }))
  }
  function addDoctorRow() {
    setState((p) => ({ ...p, doctorNames: [...p.doctorNames, ""] }))
  }
  function removeDoctorRow(i: number) {
    setState((p) =>
      p.doctorNames.length > 1 ? { ...p, doctorNames: p.doctorNames.filter((_, j) => j !== i) } : p,
    )
  }
  function updateOnDutyRow(i: number, v: string) {
    setState((p) => ({ ...p, onDutyDoctors: p.onDutyDoctors.map((x, j) => (j === i ? v : x)) }))
  }
  function addOnDutyRow() {
    setState((p) => ({ ...p, onDutyDoctors: [...p.onDutyDoctors, ""] }))
  }
  function removeOnDutyRow(i: number) {
    setState((p) =>
      p.onDutyDoctors.length > 1
        ? { ...p, onDutyDoctors: p.onDutyDoctors.filter((_, j) => j !== i) }
        : p,
    )
  }

  // ── Step 3: predefined package + totals ──────────────────────────────────
  const [packageQuery, setPackageQuery] = useState("")
  const [packageOpen, setPackageOpen] = useState(false)
  const [packageApplied, setPackageApplied] = useState(false)
  const packageBlur = useRef<ReturnType<typeof setTimeout> | null>(null)
  const predefinedPackages = formData?.predefinedPackages ?? []

  const filteredPackages = useMemo(() => {
    const q = packageQuery.trim().toLowerCase()
    if (!q) return predefinedPackages.slice(0, 8)
    return predefinedPackages.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 8)
  }, [packageQuery, predefinedPackages])

  function applyPackage(t: PredefinedPackage) {
    let inclusions: PackageInclusion[] = []
    try {
      inclusions = JSON.parse(t.inclusions)
    } catch {
      /* ignore malformed template data */
    }
    setState((prev) => ({
      ...prev,
      packageInclusions: inclusions.length ? inclusions : [{ name: "", amount: 0 }],
      discount: t.discount ?? 0,
    }))
    setPackageQuery(t.name)
    setPackageOpen(false)
    setPackageApplied(true)
  }

  function resetPackage() {
    setState((prev) => ({ ...prev, packageInclusions: [{ name: "", amount: 0 }], discount: 0 }))
    setPackageQuery("")
    setPackageApplied(false)
  }

  const packageAmount = state.packageInclusions.reduce((s, i) => s + (Number(i.amount) || 0), 0)
  const netAmount = packageAmount - (Number(state.discount) || 0)
  const totalReceived = state.paymentRecords.reduce((s, r) => s + (Number(r.amount) || 0), 0)
  const balance = netAmount - totalReceived

  function updateInclusion(i: number, patch: Partial<PackageInclusion>) {
    setState((p) => ({
      ...p,
      packageInclusions: p.packageInclusions.map((x, j) => (j === i ? { ...x, ...patch } : x)),
    }))
  }
  function addInclusion() {
    setState((p) => ({ ...p, packageInclusions: [...p.packageInclusions, { name: "", amount: 0 }] }))
  }
  function removeInclusion(i: number) {
    setState((p) =>
      p.packageInclusions.length > 1
        ? { ...p, packageInclusions: p.packageInclusions.filter((_, j) => j !== i) }
        : p,
    )
  }

  function updatePayment(i: number, patch: Partial<PaymentRecord>) {
    setState((p) => ({
      ...p,
      paymentRecords: p.paymentRecords.map((r, j) => (j === i ? { ...r, ...patch } : r)),
    }))
  }
  function addPayment() {
    setState((p) => ({
      ...p,
      paymentRecords: [
        ...p.paymentRecords,
        { date: todayISO(), amountType: "Advance", paymentMode: "Cash", amount: 0 },
      ],
    }))
  }
  function removePayment(i: number) {
    setState((p) => ({ ...p, paymentRecords: p.paymentRecords.filter((_, j) => j !== i) }))
  }

  // ── Validation + submit ───────────────────────────────────────────────────
  function validStep1(): boolean {
    return (
      state.name.trim() !== "" &&
      state.age.trim() !== "" &&
      state.gender !== "" &&
      state.phone.trim() !== "" &&
      state.admissionDate !== ""
    )
  }
  function validStep2(): boolean {
    return state.operationName.trim() !== "" && state.doctorNames.some((d) => d.trim() !== "")
  }
  function validStep3(): boolean {
    return state.packageInclusions.length > 0 && state.packageInclusions.some((i) => i.name.trim() !== "")
  }

  async function handleSubmit() {
    if (!validStep1()) {
      toast.error("Please complete Step 1")
      setStep(1)
      return
    }
    if (!validStep2()) {
      toast.error("Please complete Step 2")
      setStep(2)
      return
    }
    if (!validStep3()) {
      toast.error("Please add at least one package inclusion")
      setStep(3)
      return
    }

    try {
      await createInPatient.mutateAsync({
        patientId: state.opPatientId || undefined,
        name: state.name.trim(),
        age: parseInt(state.age, 10),
        gender: state.gender as "MALE" | "FEMALE" | "OTHER",
        phone: state.phone.trim(),
        dateOfBirth: state.dateOfBirth || undefined,
        addressLine: state.address.addressLine?.trim() || undefined,
        area: state.address.area?.trim() || undefined,
        city: state.address.city?.trim() || undefined,
        state: state.address.state?.trim() || undefined,
        pincode: state.address.pincode?.trim() || undefined,
        guardianName: state.guardianName.trim() || undefined,
        referredBy: state.referredBy.trim() || undefined,
        admissionDate: state.admissionDate,
        admissionNotes: state.admissionNotes.trim() || undefined,
        dischargeDate: state.dischargeDate || undefined,
        department: state.department.trim() || undefined,
        doctorNames: state.doctorNames.map((d) => d.trim()).filter(Boolean),
        onDutyDoctors: state.onDutyDoctors.map((d) => d.trim()).filter(Boolean),
        operationName: state.operationName.trim() || undefined,
        operationDate: state.operationDate || undefined,
        operationProcedure: state.operationProcedure.trim() || undefined,
        operationDetails: state.operationDetails.trim() || undefined,
        provisionDiagnosis: state.provisionDiagnosis.trim() || undefined,
        packageAmount,
        packageInclusions: state.packageInclusions.filter((i) => i.name.trim()),
        discount: Number(state.discount) || 0,
        paymentRecords: state.paymentRecords,
      })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to admit patient. Please try again.")
    }
  }

  const submitting = createInPatient.isPending

  return (
    <Dialog open={open} onOpenChange={() => onOpenChange(false)}>
      <DialogContent className="max-w-full h-[100dvh] rounded-none p-0 sm:max-w-3xl sm:h-auto sm:max-h-[90vh] sm:rounded-xl overflow-hidden flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <DialogTitle>Admit In-Patient</DialogTitle>
        </DialogHeader>

        {/* Mobile step counter */}
        <div className="sm:hidden flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <span className="text-xs font-medium text-muted-foreground">Step {step} of 3</span>
          <span className="text-xs font-semibold text-foreground">
            {STEPS[step - 1].label}
          </span>
        </div>

        {/* Step indicator */}
        <div className="hidden sm:flex items-center justify-center gap-2 py-3 border-b border-border/60">
          {STEPS.map((s, idx) => {
            const active = step === s.n
            const complete = s.n < step
            return (
              <div key={s.n} className="flex items-center">
                <span
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors",
                    active && "bg-primary/10 text-primary font-medium",
                    !active && complete && "text-foreground",
                    !active && !complete && "text-muted-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "h-5 w-5 rounded-full text-[11px] font-bold flex items-center justify-center",
                      active && "bg-primary text-white",
                      !active && complete && "bg-primary/20 text-primary",
                      !active && !complete && "bg-muted text-muted-foreground",
                    )}
                  >
                    {complete ? <Check className="h-3 w-3" /> : s.n}
                  </span>
                  {s.label}
                </span>
                {idx < STEPS.length - 1 && (
                  <span className={cn("w-8 h-px mx-1", step > s.n ? "bg-primary/40" : "bg-border")} />
                )}
              </div>
            )
          })}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* Step 1 — Patient Details */}
          {step === 1 && (
            <div className="space-y-5">
              <section>
                <SectionHeader hint="optional">Existing patient lookup</SectionHeader>
                <div className="rounded-xl border border-border bg-surface shadow-[var(--shadow-xs)] p-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={query}
                      onChange={(e) => {
                        setQuery(e.target.value)
                        setOpenResults(true)
                      }}
                      onFocus={() => setOpenResults(true)}
                      onBlur={() => {
                        blurTimer.current = setTimeout(() => setOpenResults(false), 150)
                      }}
                      placeholder="Search by name, phone, or patient ID…"
                      className="pl-9 pr-9 h-9"
                    />
                    {isSearching && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                    {openResults && searchResults.length > 0 && (
                      <div
                        onMouseDown={() => {
                          if (blurTimer.current) clearTimeout(blurTimer.current)
                        }}
                        className="absolute z-10 left-0 right-0 mt-1 bg-surface border border-border rounded-[var(--radius-md)] shadow-[var(--shadow-popover)] max-h-72 overflow-y-auto"
                      >
                        {searchResults.map((r) => (
                          <button
                            key={r.patientId}
                            type="button"
                            onClick={() => pickResult(r)}
                            className="w-full text-left px-3 py-2 hover:bg-muted/60 border-b border-border/40 last:border-0"
                          >
                            <div className="text-sm font-medium text-foreground">
                              {[r.firstName, r.lastName].filter(Boolean).join(" ")}
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              <span className="font-mono">{r.patientId}</span>
                              <span className="mx-1.5">·</span>
                              {r.phone ?? "—"}
                              {r.age != null && (
                                <>
                                  <span className="mx-1.5">·</span>
                                  {r.age}y
                                </>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-2">
                    Pick an existing OPD patient to auto-fill their details, or skip this and enter
                    manually below.
                  </p>
                </div>
              </section>

              <section>
                <SectionHeader>Visit information</SectionHeader>
                <div className="rounded-xl border border-border bg-surface shadow-[var(--shadow-xs)] p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-3">
                    <div>
                      <FieldLabel>IP Number</FieldLabel>
                      <Input
                        value={nextIpData?.nextIpNumber ?? ""}
                        readOnly
                        className="bg-muted/40 font-mono h-9 mt-1"
                      />
                    </div>
                    <div>
                      <FieldLabel>Admission date *</FieldLabel>
                      <Input
                        type="datetime-local"
                        value={state.admissionDate}
                        onChange={(e) =>
                          setState((p) => ({ ...p, admissionDate: e.target.value }))
                        }
                        className="h-9 mt-1"
                      />
                    </div>
                    <div>
                      <FieldLabel>Discharge date</FieldLabel>
                      <DatePicker
                        className="mt-1 w-full"
                        size="md"
                        value={state.dischargeDate ? new Date(state.dischargeDate) : undefined}
                        onChange={(d) =>
                          setState((p) => ({
                            ...p,
                            dischargeDate: d ? d.toISOString().slice(0, 10) : "",
                          }))
                        }
                        fromDate={state.admissionDate ? new Date(state.admissionDate) : undefined}
                      />
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <SectionHeader>Patient demographics</SectionHeader>
                <div className="rounded-xl border border-border bg-surface shadow-[var(--shadow-xs)] p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                    <div className="col-span-2">
                      <FieldLabel>Full name *</FieldLabel>
                      <Input
                        value={state.name}
                        onChange={(e) => setState((p) => ({ ...p, name: e.target.value }))}
                        className="h-9 mt-1"
                      />
                    </div>

                    <div>
                      <FieldLabel>Phone *</FieldLabel>
                      <PhoneInput
                        value={state.phone}
                        onChange={(v) => setState((p) => ({ ...p, phone: v }))}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <FieldLabel>Gender *</FieldLabel>
                      <SegmentedControl
                        options={GENDER_OPTIONS}
                        value={state.gender}
                        onValueChange={(g) => setState((p) => ({ ...p, gender: g }))}
                        aria-label="Gender"
                        className="w-full mt-1 [&>button]:flex-1"
                      />
                    </div>

                    <div>
                      <FieldLabel>Age *</FieldLabel>
                      <Input
                        type="number"
                        value={state.age}
                        onChange={(e) => setState((p) => ({ ...p, age: e.target.value }))}
                        className="h-9 mt-1"
                      />
                    </div>
                    <div>
                      <FieldLabel>Date of birth</FieldLabel>
                      <DatePicker
                        className="mt-1 w-full"
                        size="md"
                        value={state.dateOfBirth ? new Date(state.dateOfBirth) : undefined}
                        onChange={(d) =>
                          setState((p) => {
                            const dob = d ? d.toISOString().slice(0, 10) : ""
                            return {
                              ...p,
                              dateOfBirth: dob,
                              age: dob ? String(calculateAge(dob) ?? p.age) : p.age,
                            }
                          })
                        }
                        toDate={new Date()}
                      />
                    </div>

                    <div className="col-span-2">
                      <AddressFields
                        value={state.address}
                        onChange={(address) => setState((p) => ({ ...p, address }))}
                        cityOptions={cityOptions}
                        onAddCity={async (val) => {
                          await addDropdownOption.mutateAsync({ fieldName: "city", value: val })
                          setCityOptions((prev) => [...prev, val].sort())
                        }}
                      />
                    </div>

                    <div>
                      <FieldLabel>Guardian name</FieldLabel>
                      <Input
                        value={state.guardianName}
                        onChange={(e) =>
                          setState((p) => ({ ...p, guardianName: e.target.value }))
                        }
                        className="h-9 mt-1"
                      />
                    </div>
                    <div>
                      <FieldLabel>Referred by</FieldLabel>
                      <div className="mt-1">
                        <EditableComboboxWithAdd
                          options={referralOptions}
                          value={state.referredBy}
                          onValueChange={(v) => setState((p) => ({ ...p, referredBy: v }))}
                          placeholder="Self, Dr. X, …"
                          onAddOption={async (val) => {
                            await addDropdownOption.mutateAsync({ fieldName: "referredBy", value: val })
                            setReferralOptions((prev) => [...prev, val].sort())
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <SectionHeader hint="optional">Admission notes</SectionHeader>
                <div className="rounded-xl border border-border bg-surface shadow-[var(--shadow-xs)] p-4">
                  <Textarea
                    value={state.admissionNotes}
                    onChange={(e) =>
                      setState((p) => ({ ...p, admissionNotes: e.target.value }))
                    }
                    rows={3}
                    placeholder="Any additional notes about this admission…"
                    className="resize-none"
                  />
                </div>
              </section>
            </div>
          )}

          {/* Step 2 — Hospital Information */}
          {step === 2 && (
            <div className="space-y-5">
              <section>
                <SectionHeader
                  hint="optional"
                  right={
                    surgeryApplied && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={resetSurgery}
                        className="h-6 gap-1 px-2 text-[11px]"
                      >
                        <RotateCcw className="h-3 w-3" /> Reset
                      </Button>
                    )
                  }
                >
                  Predefined surgery
                </SectionHeader>
                <div className="rounded-xl border border-border bg-surface shadow-[var(--shadow-xs)] p-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={surgeryQuery}
                      onChange={(e) => {
                        setSurgeryQuery(e.target.value)
                        setSurgeryOpen(true)
                        setSurgeryApplied(false)
                      }}
                      onFocus={() => setSurgeryOpen(true)}
                      onBlur={() => {
                        surgeryBlur.current = setTimeout(() => setSurgeryOpen(false), 150)
                      }}
                      placeholder="Search predefined operations…"
                      className="pl-9 h-9"
                    />
                    {surgeryOpen && filteredSurgeries.length > 0 && (
                      <div
                        onMouseDown={() => {
                          if (surgeryBlur.current) clearTimeout(surgeryBlur.current)
                        }}
                        className="absolute z-10 left-0 right-0 mt-1 bg-surface border border-border rounded-[var(--radius-md)] shadow-[var(--shadow-popover)] max-h-72 overflow-y-auto"
                      >
                        {filteredSurgeries.map((t) => {
                          let docCount = 0
                          try {
                            docCount = (JSON.parse(t.doctorNames) as string[]).length
                          } catch {
                            /* ignore malformed template data */
                          }
                          return (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => applySurgery(t)}
                              className="w-full text-left px-3 py-2 hover:bg-muted/60 border-b border-border/40 last:border-0"
                            >
                              <div className="text-sm font-medium text-foreground">{t.name}</div>
                              <div className="text-xs text-muted-foreground mt-0.5">
                                {t.department ?? "—"}
                                <span className="mx-1.5">·</span>
                                {docCount} doctor{docCount !== 1 ? "s" : ""}
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-2">
                    Pick a saved template to auto-fill the fields below, or enter them manually.
                  </p>
                </div>
              </section>

              <section>
                <SectionHeader>Operation</SectionHeader>
                <div className="rounded-xl border border-border bg-surface shadow-[var(--shadow-xs)] p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                    <div>
                      <FieldLabel>Operation name *</FieldLabel>
                      <Input
                        value={state.operationName}
                        onChange={(e) =>
                          setState((p) => ({ ...p, operationName: e.target.value }))
                        }
                        placeholder="e.g. Phaco + IOL"
                        className="h-9 mt-1"
                      />
                    </div>
                    <div>
                      <FieldLabel>Operation date</FieldLabel>
                      <Input
                        type="datetime-local"
                        value={state.operationDate}
                        onChange={(e) =>
                          setState((p) => ({ ...p, operationDate: e.target.value }))
                        }
                        className="h-9 mt-1"
                      />
                    </div>

                    <div>
                      <FieldLabel>Department</FieldLabel>
                      <div className="mt-1">
                        <EditableComboboxWithAdd
                          options={departmentOptions}
                          value={state.department}
                          onValueChange={(v) => setState((p) => ({ ...p, department: v }))}
                          placeholder="e.g. Ophthalmology"
                          onAddOption={async (val) => {
                            await addDropdownOption.mutateAsync({ fieldName: "department", value: val })
                            setDepartmentOptions((prev) => [...prev, val].sort())
                          }}
                        />
                      </div>
                    </div>
                    <div>
                      <FieldLabel>Provision diagnosis</FieldLabel>
                      <Input
                        value={state.provisionDiagnosis}
                        onChange={(e) =>
                          setState((p) => ({ ...p, provisionDiagnosis: e.target.value }))
                        }
                        className="h-9 mt-1"
                      />
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <SectionHeader>Surgical team</SectionHeader>
                <div className="rounded-xl border border-border bg-surface shadow-[var(--shadow-xs)] p-4 space-y-4">
                  <RowListField
                    label="Doctors *"
                    rows={state.doctorNames}
                    onUpdate={updateDoctorRow}
                    onAdd={addDoctorRow}
                    onRemove={removeDoctorRow}
                    options={doctorOptions}
                    placeholderFn={(i) => `Doctor ${i + 1}`}
                  />
                  <RowListField
                    label="On-duty doctors"
                    rows={state.onDutyDoctors}
                    onUpdate={updateOnDutyRow}
                    onAdd={addOnDutyRow}
                    onRemove={removeOnDutyRow}
                    options={doctorOptions}
                    placeholderFn={(i) => `On-duty doctor ${i + 1}`}
                  />
                </div>
              </section>

              <section>
                <SectionHeader hint="optional">Procedure & details</SectionHeader>
                <div className="rounded-xl border border-border bg-surface shadow-[var(--shadow-xs)] p-4 space-y-3">
                  <div>
                    <FieldLabel>Operation procedure</FieldLabel>
                    <Textarea
                      value={state.operationProcedure}
                      onChange={(e) =>
                        setState((p) => ({ ...p, operationProcedure: e.target.value }))
                      }
                      rows={3}
                      placeholder="Steps performed…"
                      className="mt-1 resize-none"
                    />
                  </div>
                  <div>
                    <FieldLabel>Operation details</FieldLabel>
                    <Textarea
                      value={state.operationDetails}
                      onChange={(e) =>
                        setState((p) => ({ ...p, operationDetails: e.target.value }))
                      }
                      rows={3}
                      placeholder="Implants, anaesthesia, complications…"
                      className="mt-1 resize-none"
                    />
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* Step 3 — Payment & Package */}
          {step === 3 && (
            <div className="space-y-5">
              <section>
                <SectionHeader
                  hint="optional"
                  right={
                    packageApplied && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={resetPackage}
                        className="h-6 gap-1 px-2 text-[11px]"
                      >
                        <RotateCcw className="h-3 w-3" /> Reset
                      </Button>
                    )
                  }
                >
                  Predefined package
                </SectionHeader>
                <div className="rounded-xl border border-border bg-surface shadow-[var(--shadow-xs)] p-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={packageQuery}
                      onChange={(e) => {
                        setPackageQuery(e.target.value)
                        setPackageOpen(true)
                        setPackageApplied(false)
                      }}
                      onFocus={() => setPackageOpen(true)}
                      onBlur={() => {
                        packageBlur.current = setTimeout(() => setPackageOpen(false), 150)
                      }}
                      placeholder="Search predefined packages…"
                      className="pl-9 h-9"
                    />
                    {packageOpen && filteredPackages.length > 0 && (
                      <div
                        onMouseDown={() => {
                          if (packageBlur.current) clearTimeout(packageBlur.current)
                        }}
                        className="absolute z-10 left-0 right-0 mt-1 bg-surface border border-border rounded-[var(--radius-md)] shadow-[var(--shadow-popover)] max-h-72 overflow-y-auto"
                      >
                        {filteredPackages.map((t) => {
                          let count = 0
                          try {
                            count = (JSON.parse(t.inclusions) as unknown[]).length
                          } catch {
                            /* ignore malformed template data */
                          }
                          return (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => applyPackage(t)}
                              className="w-full text-left px-3 py-2 hover:bg-muted/60 border-b border-border/40 last:border-0"
                            >
                              <div className="text-sm font-medium text-foreground">{t.name}</div>
                              <div className="text-xs text-muted-foreground mt-0.5">
                                {formatCurrency(t.totalAmount)}
                                <span className="mx-1.5">·</span>
                                {count} item{count !== 1 ? "s" : ""}
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </section>

              <section>
                <SectionHeader
                  right={
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={addInclusion}
                      className="h-6 gap-1 px-2 text-[11px]"
                    >
                      <Plus className="h-3 w-3" /> Add inclusion
                    </Button>
                  }
                >
                  Package inclusions
                </SectionHeader>
                <div className="rounded-xl border border-border bg-surface shadow-[var(--shadow-xs)] overflow-hidden">
                  <div className="divide-y divide-border/60">
                    {state.packageInclusions.map((inc, i) => (
                      <div key={i} className="flex items-center gap-2 px-3 py-2 hover:bg-muted/30">
                        <span className="text-[10px] font-medium tabular-nums text-muted-foreground w-5 text-center shrink-0">
                          {i + 1}
                        </span>
                        <Input
                          value={inc.name}
                          onChange={(e) => updateInclusion(i, { name: e.target.value })}
                          placeholder="Item name"
                          className="flex-1 h-9"
                        />
                        <CurrencyInput
                          value={inc.amount || undefined}
                          onChange={(v) => updateInclusion(i, { amount: v })}
                          className="w-32 h-9"
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => removeInclusion(i)}
                          disabled={state.packageInclusions.length === 1}
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive shrink-0"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <div className="bg-muted/30 px-4 py-2.5 space-y-1.5 border-t border-border/60">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Package amount</span>
                      <span className="font-mono font-medium tabular-nums">
                        {formatCurrency(packageAmount)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Discount</span>
                      <CurrencyInput
                        value={state.discount || undefined}
                        onChange={(v) => setState((p) => ({ ...p, discount: v }))}
                        className="w-28 h-7"
                      />
                    </div>
                    <div className="flex items-center justify-between text-sm pt-1.5 border-t border-border/60">
                      <span className="font-semibold text-foreground">Net amount</span>
                      <span className="font-mono font-bold tabular-nums">
                        {formatCurrency(netAmount)}
                      </span>
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <SectionHeader
                  hint="optional"
                  right={
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={addPayment}
                      className="h-6 gap-1 px-2 text-[11px]"
                    >
                      <Plus className="h-3 w-3" /> Add payment
                    </Button>
                  }
                >
                  Payments
                </SectionHeader>
                <div className="rounded-xl border border-border bg-surface shadow-[var(--shadow-xs)] overflow-hidden">
                  {state.paymentRecords.length === 0 ? (
                    <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                      No payments recorded yet.
                    </div>
                  ) : (
                    <div className="divide-y divide-border/60">
                      {state.paymentRecords.map((r, i) => (
                        <div
                          key={i}
                          className="grid grid-cols-12 gap-2 items-center px-3 py-2 hover:bg-muted/30"
                        >
                          <span className="col-span-1 text-[10px] font-medium tabular-nums text-muted-foreground text-center">
                            {i + 1}
                          </span>
                          <Input
                            type="date"
                            value={r.date}
                            onChange={(e) => updatePayment(i, { date: e.target.value })}
                            className="col-span-3 h-9"
                          />
                          <div className="col-span-3">
                            <Select
                              value={r.amountType}
                              onValueChange={(v) => updatePayment(i, { amountType: v })}
                            >
                              <SelectTrigger className="h-9">
                                <SelectValue placeholder="Type" />
                              </SelectTrigger>
                              <SelectContent>
                                {PAYMENT_AMOUNT_TYPES.map((t) => (
                                  <SelectItem key={t} value={t}>
                                    {t}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="col-span-2">
                            <Select
                              value={r.paymentMode}
                              onValueChange={(v) => updatePayment(i, { paymentMode: v })}
                            >
                              <SelectTrigger className="h-9">
                                <SelectValue placeholder="Mode" />
                              </SelectTrigger>
                              <SelectContent>
                                {PAYMENT_MODES.map((m) => (
                                  <SelectItem key={m} value={m}>
                                    {m}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <CurrencyInput
                            value={r.amount || undefined}
                            onChange={(v) => updatePayment(i, { amount: v })}
                            className="col-span-2 h-9"
                          />
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => removePayment(i)}
                            className="col-span-1 h-7 w-7 p-0 text-muted-foreground hover:text-destructive justify-self-end"
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="bg-muted/30 px-4 py-2.5 space-y-1.5 border-t border-border/60">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Total received</span>
                      <span className="font-mono tabular-nums">{formatCurrency(totalReceived)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm pt-1.5 border-t border-border/60">
                      <span className="font-semibold text-foreground">Balance</span>
                      <span
                        className={cn(
                          "font-mono font-bold tabular-nums",
                          balance > 0 ? "text-warning-soft-foreground" : "text-success-soft-foreground",
                        )}
                      >
                        {formatCurrency(balance)}
                      </span>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-border/60 px-6 py-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <div className="flex-1" />
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep((step - 1) as 1 | 2 | 3)} disabled={submitting}>
              Back
            </Button>
          )}
          {step < 3 && (
            <Button onClick={() => setStep((step + 1) as 1 | 2 | 3)} disabled={submitting}>
              Next
            </Button>
          )}
          {step === 3 && (
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Admit
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Multi-row sub-component (doctors / on-duty) ──────────────────────────────

function RowListField({
  label,
  rows,
  onUpdate,
  onAdd,
  onRemove,
  options,
  placeholderFn,
}: {
  label: string
  rows: string[]
  onUpdate: (i: number, v: string) => void
  onAdd: () => void
  onRemove: (i: number) => void
  options: string[]
  placeholderFn: (i: number) => string
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <FieldLabel>{label}</FieldLabel>
        <Button type="button" size="sm" variant="ghost" onClick={onAdd} className="h-6 gap-1 px-2 text-[11px]">
          <Plus className="h-3 w-3" /> Add
        </Button>
      </div>
      <div className="rounded-lg border border-border/60 divide-y divide-border/60 overflow-hidden">
        {rows.map((d, i) => (
          <div key={i} className="flex items-center gap-2 px-2 py-1.5 hover:bg-muted/30">
            <span className="text-[10px] font-medium tabular-nums text-muted-foreground w-5 text-center shrink-0">
              {i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <EditableComboboxWithAdd
                options={options}
                value={d}
                onValueChange={(v) => onUpdate(i, v)}
                placeholder={placeholderFn(i)}
              />
            </div>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => onRemove(i)}
              disabled={rows.length === 1}
              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive shrink-0"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}
