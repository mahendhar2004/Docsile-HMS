/**
 * PatientRegistrationForm — ported from main's real
 * PatientRegistrationStepper (src/app/(hospital)/patients/components/
 * PatientRegistrationStepper.tsx), a 3-step wizard. The initial React port
 * was a flat single-step demographics-only form missing most of main's
 * actual fields and the entire Services & Payment / Receipt steps — this
 * replaces it with a faithful port.
 *
 * Step 1 — Patient Info: creates the Patient row immediately on "Next".
 * Step 2 — Services & Payment: creates/rolls-into-today's Prescription +
 *          InvoiceItems + Payment via POST .../prescriptions.
 * Step 3 — Receipt: print-preview using the existing CashReceipt component.
 *
 * Deliberate simplification from main: the "set as default" doctor/
 * department/referredBy persistence is localStorage-only here, not also
 * synced to a server-side user-preferences endpoint (main's
 * getUserPreferences/updateUserPreferences) — this app has no such endpoint,
 * and the visible behavior (star icon, default badge, auto-fill next time
 * on this device) is unaffected.
 *
 * Styling: uses this app's own shared form primitives (FormField/
 * FormSection/TextInput/PhoneInput/CurrencyInput/SegmentedControl, token-
 * themed throughout) rather than main's literal one-off Tailwind classes —
 * main's fields/steps/logic are ported exactly, but the chrome matches every
 * other dialog in this app, not main's own bespoke palette, per explicit
 * user request for UI consistency across all forms.
 *
 * Permission guard: patients:create — caller gates before rendering.
 */

import { useEffect, useMemo, useRef, useState } from "react"
import { Check, ChevronRight, Loader2, Plus, Printer, Search, X } from "lucide-react"
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
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
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
  FormField,
  FormSection,
  TextInput,
  PhoneInput,
  CurrencyInput,
  SegmentedControl,
  AddressFields,
  type AddressValue,
} from "@/components/patterns"
import { CashReceipt } from "@/components/receipts/CashReceipt"
import { printReceiptsHtml } from "@/lib/print-receipts"
import { cn, calculateAge, formatCurrency, toLocalDateISO } from "@/lib/utils"
import {
  useRegistrationForm,
  useNextPatientId,
  useCreatePatient,
  useUpdatePatient,
  useCreatePrescriptionWithBilling,
  useAddDropdownOption,
} from "./hooks"
import type { Patient } from "./types"

// ─── Local types ────────────────────────────────────────────────────────────

interface ServiceItem {
  id: string
  description: string
  category: string
  quantity: number
  unitPrice: number
  amount: number
}

interface PatientFormData {
  patientId: string
  fullName: string
  dateOfBirth: string
  age: string
  gender: string
  phone: string
  email: string
  address: AddressValue
  guardianName: string
  referredBy: string
  doctorName: string
  department: string
  patientCategory: string
  appointmentDate: string
}

interface ReceiptData {
  prescriptionNumber: string | null
  patientId: string
  patientName: string
  age: string
  gender: string
  doctorName: string
  appointmentDate: string
  services: ServiceItem[]
  subtotal: number
  discount: number
  total: number
  amountPaid: number
  balanceDue: number
  paymentMode: string
}

const STEPS = [
  { num: 1, label: "Patient Info" },
  { num: 2, label: "Services & Payment" },
  { num: 3, label: "Receipt" },
]

const CATEGORIES = ["All", "Consultation", "Diagnostic", "Procedure", "Medicine", "Other"]
const PAYMENT_MODES = ["Cash", "UPI", "Card", "Cheque", "Online", "NEFT"]
const REGISTRATION_FEE_ID = "__registration_fee__"

function parseISODate(s: string): Date | undefined {
  if (!s) return undefined
  const [y, m, d] = s.split("-").map(Number)
  if (!y || !m || !d) return undefined
  return new Date(y, m - 1, d)
}

const GENDER_OPTIONS = [
  { value: "Male", label: "Male" },
  { value: "Female", label: "Female" },
  { value: "Other", label: "Other" },
]

/** Joins the structured address fields into one display line (receipts, etc). */
function formatAddress(a: AddressValue): string {
  return [a.addressLine, a.area, a.city, a.state, a.pincode].filter(Boolean).join(", ")
}

// ─── Component ────────────────────────────────────────────────────────────────

export interface PatientRegistrationFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Pre-fills the appointment date to the currently-viewed OPD date. */
  defaultAppointmentDate: Date
  onSuccess: (patient: Patient) => void
}

export function PatientRegistrationForm({
  open,
  onOpenChange,
  defaultAppointmentDate,
  onSuccess,
}: PatientRegistrationFormProps) {
  const [step, setStep] = useState(1)
  const [createdPatientId, setCreatedPatientId] = useState<string | null>(null)
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null)
  const printRef = useRef<HTMLDivElement>(null)

  const [patientData, setPatientData] = useState<PatientFormData>({
    patientId: "",
    fullName: "",
    dateOfBirth: "",
    age: "",
    gender: "",
    phone: "",
    email: "",
    address: {},
    guardianName: "",
    referredBy: "",
    doctorName: "",
    department: "",
    patientCategory: "Regular",
    appointmentDate: toLocalDateISO(defaultAppointmentDate),
  })

  // ── Reference data ──────────────────────────────────────────────────────
  const { data: formData } = useRegistrationForm()
  const { data: nextIdData } = useNextPatientId(open)
  const hospitalProfile = formData?.hospitalProfile ?? null
  const serviceTemplates = formData?.serviceTemplates ?? []
  const [doctorOptions, setDoctorOptions] = useState<string[]>([])
  const [departmentOptions, setDepartmentOptions] = useState<string[]>([])
  const [referredByOptions, setReferredByOptions] = useState<string[]>([])
  const [patientCategoryOptions, setPatientCategoryOptions] = useState<string[]>(["Regular"])
  const [cityOptions, setCityOptions] = useState<string[]>([])

  useEffect(() => {
    if (!formData) return
    setDoctorOptions(formData.doctorOptions)
    setDepartmentOptions(formData.departmentOptions)
    setReferredByOptions(formData.referralOptions)
    setPatientCategoryOptions(["Regular", ...formData.patientCategoryOptions.filter((o) => o !== "Regular")])
    setCityOptions(formData.cityOptions)
  }, [formData])

  // ── Per-field "set as default" (localStorage-only — see file header) ──────
  const [fieldDefaults, setFieldDefaults] = useState({ doctorName: "", department: "", referredBy: "" })

  useEffect(() => {
    setFieldDefaults({
      doctorName: localStorage.getItem("docsile_default_doctorName") ?? "",
      department: localStorage.getItem("docsile_default_department") ?? "",
      referredBy: localStorage.getItem("docsile_default_referredBy") ?? "",
    })
  }, [])

  function toggleDefault(field: "doctorName" | "department" | "referredBy", value: string) {
    const isClearing = fieldDefaults[field] === value
    const nextValue = isClearing ? "" : value
    if (isClearing) localStorage.removeItem(`docsile_default_${field}`)
    else localStorage.setItem(`docsile_default_${field}`, value)
    setFieldDefaults((prev) => ({ ...prev, [field]: nextValue }))
    toast.success(isClearing ? "Default cleared" : `"${value}" set as default`)
  }

  const addDropdownOption = useAddDropdownOption()

  // ── Step 2 state ─────────────────────────────────────────────────────────
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [serviceSearch, setServiceSearch] = useState("")
  const [selectedServices, setSelectedServices] = useState<ServiceItem[]>([])
  const [showCustom, setShowCustom] = useState(false)
  const [customService, setCustomService] = useState({ name: "", category: "Consultation", amount: "" })
  const [paymentMode, setPaymentMode] = useState("Cash")
  const [discount, setDiscount] = useState(0)
  const [amountPaid, setAmountPaid] = useState(0)

  const regFeeConfig = {
    enabled: !!hospitalProfile?.registrationFeeEnabled,
    amount: Number(hospitalProfile?.registrationFeeAmount ?? 0) || 0,
    defaultChecked: hospitalProfile?.registrationFeeDefaultChecked ?? true,
  }
  const showRegistrationFee = regFeeConfig.enabled
  const [regFeeChecked, setRegFeeChecked] = useState(false)
  const regFeeInitialized = useRef(false)

  useEffect(() => {
    if (regFeeInitialized.current) return
    if (!hospitalProfile) return
    if (showRegistrationFee) setRegFeeChecked(regFeeConfig.defaultChecked)
    regFeeInitialized.current = true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hospitalProfile])

  useEffect(() => {
    if (!showRegistrationFee) {
      setSelectedServices((prev) => prev.filter((s) => s.id !== REGISTRATION_FEE_ID))
      return
    }
    if (regFeeChecked) {
      setSelectedServices((prev) => {
        const without = prev.filter((s) => s.id !== REGISTRATION_FEE_ID)
        return [
          {
            id: REGISTRATION_FEE_ID,
            description: "Registration Fee",
            category: "Registration",
            quantity: 1,
            unitPrice: regFeeConfig.amount,
            amount: regFeeConfig.amount,
          },
          ...without,
        ]
      })
    } else {
      setSelectedServices((prev) => prev.filter((s) => s.id !== REGISTRATION_FEE_ID))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regFeeChecked, showRegistrationFee, regFeeConfig.amount])

  const subtotal = selectedServices.reduce((s, item) => s + item.amount, 0)
  const total = subtotal - discount
  const balanceDue = total - amountPaid

  useEffect(() => {
    if (total >= 0) setAmountPaid(total)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total])

  // ── Reset on open ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return
    setStep(1)
    setCreatedPatientId(null)
    setSelectedServices([])
    setDiscount(0)
    setAmountPaid(0)
    setSelectedCategory("All")
    setReceiptData(null)
    setRegFeeChecked(false)
    regFeeInitialized.current = false

    const savedDoctor = localStorage.getItem("docsile_default_doctorName") ?? ""
    const savedDept = localStorage.getItem("docsile_default_department") ?? ""
    const savedRef = localStorage.getItem("docsile_default_referredBy") ?? ""
    setFieldDefaults({ doctorName: savedDoctor, department: savedDept, referredBy: savedRef })
    setPatientData({
      patientId: "",
      fullName: "",
      dateOfBirth: "",
      age: "",
      gender: "",
      phone: "",
      email: "",
      address: {},
      guardianName: "",
      referredBy: savedRef,
      doctorName: savedDoctor,
      department: savedDept,
      patientCategory: "Regular",
      appointmentDate: toLocalDateISO(defaultAppointmentDate),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    if (nextIdData) setPatientData((prev) => ({ ...prev, patientId: nextIdData.nextPatientId }))
  }, [nextIdData])

  // ── Mutations ────────────────────────────────────────────────────────────
  const createPatient = useCreatePatient()
  const updatePatient = useUpdatePatient(createdPatientId ?? "")
  const createBilling = useCreatePrescriptionWithBilling(createdPatientId ?? "")

  // ── Age <-> DOB cross-sync (editing one overwrites the other) ───────────
  function handleDobChange(dob: string) {
    setPatientData((prev) => {
      const age = dob ? String(calculateAge(dob) ?? "") : ""
      return { ...prev, dateOfBirth: dob, age }
    })
  }

  function handleAgeChange(age: string) {
    setPatientData((prev) => {
      let dob = prev.dateOfBirth
      if (age) {
        const year = new Date().getFullYear() - parseInt(age, 10)
        if (!isNaN(year)) dob = `${year}-01-01`
      }
      return { ...prev, age, dateOfBirth: dob }
    })
  }

  function validateStep1(): string | null {
    if (!patientData.fullName.trim()) return "Full name is required"
    if (!patientData.gender) return "Gender is required"
    if (!patientData.phone.trim()) return "Phone is required"
    if (patientData.phone.length < 10) return "Enter a valid 10-digit phone number"
    if (!patientData.appointmentDate) return "Appointment date is required"
    return null
  }

  async function handleStep1Next() {
    const err = validateStep1()
    if (err) {
      toast.error(err)
      return
    }

    const parts = patientData.fullName.trim().split(/\s+/)
    const firstName = parts[0] ?? ""
    const lastName = parts.slice(1).join(" ") || undefined

    const payload = {
      firstName,
      lastName,
      dateOfBirth: patientData.dateOfBirth || undefined,
      age: patientData.age ? parseInt(patientData.age, 10) : undefined,
      gender: patientData.gender as Patient["gender"],
      phone: patientData.phone.trim(),
      email: patientData.email.trim() || undefined,
      addressLine: patientData.address.addressLine?.trim() || undefined,
      area: patientData.address.area?.trim() || undefined,
      city: patientData.address.city?.trim() || undefined,
      state: patientData.address.state?.trim() || undefined,
      pincode: patientData.address.pincode?.trim() || undefined,
      guardianName: patientData.guardianName.trim() || undefined,
      referredBy: patientData.referredBy.trim() || undefined,
      doctorName: patientData.doctorName.trim() || undefined,
      department: patientData.department.trim() || undefined,
      patientCategory: patientData.patientCategory.trim() || "Regular",
      patientType: "OPD",
      appointmentDate: patientData.appointmentDate,
    }

    try {
      if (createdPatientId) {
        // Already created — user went back and re-edited Step 1.
        await updatePatient.mutateAsync(payload)
      } else {
        const created = await createPatient.mutateAsync(payload)
        setCreatedPatientId(created.id)
        setPatientData((prev) => ({ ...prev, patientId: created.patientId }))
      }
      setStep(2)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save patient. Please try again.")
    }
  }

  // ── Step 2 helpers ───────────────────────────────────────────────────────
  function addService(template: { id: string; name: string; category: string; amount: number; discount: number }) {
    if (selectedServices.find((s) => s.description === template.name)) {
      removeService(template.id)
      return
    }
    setSelectedServices((prev) => [
      ...prev,
      {
        id: template.id,
        description: template.name,
        category: template.category,
        quantity: 1,
        unitPrice: template.amount,
        amount: template.amount,
      },
    ])
    if (template.discount > 0) setDiscount((prev) => prev + template.discount)
  }

  function removeService(id: string) {
    if (id === REGISTRATION_FEE_ID) {
      setRegFeeChecked(false)
      return
    }
    const template = serviceTemplates.find((t) => t.id === id)
    if (template && template.discount > 0) setDiscount((prev) => Math.max(0, prev - template.discount))
    setSelectedServices((prev) => prev.filter((s) => s.id !== id))
  }

  function updateService(id: string, field: "quantity" | "unitPrice", value: number) {
    setSelectedServices((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s
        const qty = field === "quantity" ? value : s.quantity
        const price = field === "unitPrice" ? value : s.unitPrice
        return { ...s, [field]: value, amount: qty * price }
      }),
    )
  }

  function addCustomService() {
    if (!customService.name.trim() || !customService.amount) return
    setSelectedServices((prev) => [
      ...prev,
      {
        id: `custom-${Date.now()}`,
        description: customService.name.trim(),
        category: customService.category,
        quantity: 1,
        unitPrice: parseFloat(customService.amount),
        amount: parseFloat(customService.amount),
      },
    ])
    setCustomService({ name: "", category: "Consultation", amount: "" })
    setShowCustom(false)
  }

  async function handleRegister() {
    if (selectedServices.length === 0) {
      toast.error("Add at least one service")
      return
    }
    if (!createdPatientId) {
      toast.error("Patient not registered yet")
      return
    }

    try {
      const result = await createBilling.mutateAsync({
        prescription: { discount },
        invoiceItems: selectedServices.map((s) => ({
          description: s.description,
          category: s.category,
          quantity: s.quantity,
          unitPrice: s.unitPrice,
          amount: s.amount,
        })),
        payment: amountPaid > 0 ? { paymentMode, amount: amountPaid } : undefined,
      })

      setReceiptData({
        prescriptionNumber: result.prescriptionNumber,
        patientId: patientData.patientId,
        patientName: patientData.fullName.trim(),
        age: patientData.age,
        gender: patientData.gender,
        doctorName: patientData.doctorName,
        appointmentDate: patientData.appointmentDate,
        services: selectedServices,
        subtotal,
        discount,
        total,
        amountPaid,
        balanceDue,
        paymentMode,
      })
      onSuccess({ id: createdPatientId, patientId: patientData.patientId } as Patient)
      setStep(3)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to register billing. Please try again.")
    }
  }

  function handlePrintReceipt() {
    if (!printRef.current || !receiptData) return
    printReceiptsHtml({ title: `Receipt — ${receiptData.patientName}`, contentHtml: printRef.current.innerHTML })
  }

  const filteredTemplates = useMemo(
    () =>
      serviceTemplates.filter((s) => {
        const matchesCategory = selectedCategory === "All" || s.category === selectedCategory
        const matchesSearch = !serviceSearch || s.name.toLowerCase().includes(serviceSearch.toLowerCase())
        return matchesCategory && matchesSearch
      }),
    [serviceTemplates, selectedCategory, serviceSearch],
  )

  const savingPatient = createPatient.isPending || updatePatient.isPending
  const submitting = createBilling.isPending

  return (
    <Dialog open={open} onOpenChange={() => onOpenChange(false)}>
      <DialogContent className="max-w-full h-[100dvh] rounded-none p-0 sm:max-w-4xl sm:h-auto sm:max-h-[90vh] sm:rounded-xl overflow-hidden flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <DialogTitle>Register Out-Patient</DialogTitle>

          <div className="hidden sm:flex items-center gap-0 mt-3">
            {STEPS.map((s, i) => (
              <div key={s.num} className="flex items-center">
                <div
                  className={cn(
                    "flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full transition-all",
                    step === s.num
                      ? "bg-primary text-primary-foreground"
                      : step > s.num
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground",
                  )}
                >
                  {step > s.num ? <Check className="h-3 w-3" /> : <span>{s.num}</span>}
                  <span>{s.label}</span>
                </div>
                {i < STEPS.length - 1 && <ChevronRight className="h-3.5 w-3.5 mx-1 text-muted-foreground" />}
              </div>
            ))}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* Step 1 */}
          {step === 1 && (
            <div className="space-y-6">
              <FormSection title="Patient Information">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <FormField label="Date">
                    <DatePicker
                      className="w-full"
                      value={parseISODate(patientData.appointmentDate)}
                      onChange={(d) =>
                        setPatientData((prev) => ({
                          ...prev,
                          appointmentDate: d ? toLocalDateISO(d) : "",
                        }))
                      }
                      aria-label="Appointment date"
                    />
                  </FormField>
                  <FormField label="Patient ID">
                    <TextInput value={patientData.patientId} readOnly className="font-mono bg-muted" />
                  </FormField>
                  <FormField label="Name" required>
                    <TextInput
                      value={patientData.fullName}
                      onChange={(e) =>
                        setPatientData((prev) => ({ ...prev, fullName: e.target.value.toUpperCase() }))
                      }
                      placeholder="Full name"
                    />
                  </FormField>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <FormField label="Guardian">
                    <TextInput
                      value={patientData.guardianName}
                      onChange={(e) => setPatientData((prev) => ({ ...prev, guardianName: e.target.value }))}
                      placeholder="Guardian name"
                    />
                  </FormField>
                  <FormField label="Date of Birth">
                    <DatePicker
                      className="w-full"
                      value={parseISODate(patientData.dateOfBirth)}
                      onChange={(d) => handleDobChange(d ? toLocalDateISO(d) : "")}
                      toDate={new Date()}
                      aria-label="Date of birth"
                    />
                  </FormField>
                  <FormField label="Age">
                    <Input
                      type="number"
                      value={patientData.age}
                      onChange={(e) => handleAgeChange(e.target.value)}
                      placeholder="Age"
                    />
                  </FormField>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <FormField label="Gender" required>
                    <SegmentedControl
                      options={GENDER_OPTIONS}
                      value={patientData.gender}
                      onValueChange={(v) => setPatientData((prev) => ({ ...prev, gender: v }))}
                      aria-label="Gender"
                      className="w-full [&>button]:flex-1"
                    />
                  </FormField>
                  <FormField label="Phone" required>
                    <PhoneInput
                      value={patientData.phone}
                      onChange={(v) => setPatientData((prev) => ({ ...prev, phone: v }))}
                    />
                  </FormField>
                  <FormField label="Email">
                    <TextInput
                      inputType="email"
                      value={patientData.email}
                      onChange={(e) => setPatientData((prev) => ({ ...prev, email: e.target.value }))}
                      placeholder="email@example.com"
                    />
                  </FormField>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <FormField label="Patient Type">
                    <EditableComboboxWithAdd
                      options={patientCategoryOptions}
                      value={patientData.patientCategory}
                      onValueChange={(v) => setPatientData((prev) => ({ ...prev, patientCategory: v }))}
                      placeholder="Regular"
                      onAddOption={async (val) => {
                        await addDropdownOption.mutateAsync({ fieldName: "patientCategory", value: val })
                        setPatientCategoryOptions((prev) => (prev.includes(val) ? prev : [...prev, val].sort()))
                      }}
                    />
                  </FormField>
                </div>

                <AddressFields
                  value={patientData.address}
                  onChange={(address) => setPatientData((prev) => ({ ...prev, address }))}
                  cityOptions={cityOptions}
                  onAddCity={async (val) => {
                    await addDropdownOption.mutateAsync({ fieldName: "city", value: val })
                    setCityOptions((prev) => [...prev, val].sort())
                  }}
                />
              </FormSection>

              <FormSection title="Doctor Information">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <FormField label="Doctor Name">
                    <EditableComboboxWithAdd
                      options={doctorOptions}
                      value={patientData.doctorName}
                      onValueChange={(v) => setPatientData((prev) => ({ ...prev, doctorName: v }))}
                      placeholder="Assigned doctor"
                      defaultValue={fieldDefaults.doctorName}
                      onSetDefault={(v) => toggleDefault("doctorName", v)}
                      onAddOption={async (val) => {
                        await addDropdownOption.mutateAsync({ fieldName: "doctorName", value: val })
                        setDoctorOptions((prev) => [...prev, val].sort())
                      }}
                    />
                  </FormField>
                  <FormField label="Department">
                    <EditableComboboxWithAdd
                      options={departmentOptions}
                      value={patientData.department}
                      onValueChange={(v) => setPatientData((prev) => ({ ...prev, department: v }))}
                      placeholder="e.g. Ophthalmology"
                      defaultValue={fieldDefaults.department}
                      onSetDefault={(v) => toggleDefault("department", v)}
                      onAddOption={async (val) => {
                        await addDropdownOption.mutateAsync({ fieldName: "department", value: val })
                        setDepartmentOptions((prev) => [...prev, val].sort())
                      }}
                    />
                  </FormField>
                  <FormField label="Referred By">
                    <EditableComboboxWithAdd
                      options={referredByOptions}
                      value={patientData.referredBy}
                      onValueChange={(v) => setPatientData((prev) => ({ ...prev, referredBy: v }))}
                      placeholder="Self / Doctor name"
                      defaultValue={fieldDefaults.referredBy}
                      onSetDefault={(v) => toggleDefault("referredBy", v)}
                      onAddOption={async (val) => {
                        await addDropdownOption.mutateAsync({ fieldName: "referredBy", value: val })
                        setReferredByOptions((prev) => [...prev, val].sort())
                      }}
                    />
                  </FormField>
                </div>
              </FormSection>
            </div>
          )}

          {/* Step 2 — Services & Payment */}
          {step === 2 && (
            <div className="space-y-5">
              {showRegistrationFee && (
                <label
                  htmlFor="__reg_fee_toggle"
                  className={cn(
                    "flex items-center justify-between gap-4 rounded-[var(--radius-lg)] border p-4 cursor-pointer transition-colors",
                    regFeeChecked ? "bg-primary/5 border-primary/30" : "bg-surface border-border hover:bg-muted/30",
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Checkbox
                      id="__reg_fee_toggle"
                      checked={regFeeChecked}
                      onCheckedChange={(v) => setRegFeeChecked(v === true)}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">Registration Fee</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        One-time fee for new patient registration
                      </p>
                    </div>
                  </div>
                  <span
                    className={cn(
                      "text-sm font-semibold tabular-nums shrink-0",
                      regFeeChecked ? "text-primary" : "text-muted-foreground",
                    )}
                  >
                    {formatCurrency(regFeeConfig.amount)}
                  </span>
                </label>
              )}

              {selectedServices.length > 0 && (
                <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Added ({selectedServices.length})
                    </p>
                    <p className="text-sm font-semibold">{formatCurrency(subtotal)}</p>
                  </div>
                  <div className="space-y-0 divide-y divide-border">
                    {selectedServices.map((service) => (
                      <div key={service.id} className="flex items-center justify-between py-2.5 group">
                        <div className="flex-1 min-w-0 mr-3">
                          <p className="text-sm font-medium truncate">{service.description}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-muted-foreground">{service.category}</span>
                            {service.quantity > 1 && (
                              <span className="text-xs text-muted-foreground">Qty: {service.quantity}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="flex items-center gap-1 border border-transparent group-hover:border-border rounded-[var(--radius-sm)] transition-colors">
                            <Input
                              type="number"
                              value={service.quantity}
                              onChange={(e) => updateService(service.id, "quantity", parseInt(e.target.value) || 1)}
                              className="h-7 w-10 text-center px-0 border-0 shadow-none focus-visible:ring-0 text-xs"
                              min={1}
                            />
                            <span className="text-muted-foreground text-xs px-0.5">x</span>
                            <Input
                              type="number"
                              value={service.unitPrice}
                              onChange={(e) =>
                                updateService(service.id, "unitPrice", parseFloat(e.target.value) || 0)
                              }
                              className="h-7 w-16 text-right px-1 border-0 shadow-none focus-visible:ring-0 text-xs"
                            />
                          </div>
                          <span className="text-sm font-semibold w-20 text-right tabular-nums">
                            {formatCurrency(service.amount)}
                          </span>
                          <button
                            onClick={() => removeService(service.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-[var(--radius-sm)] hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <TextInput
                    placeholder="Search services..."
                    value={serviceSearch}
                    onChange={(e) => setServiceSearch(e.target.value)}
                    className="pl-8 h-9"
                  />
                </div>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-36 h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {filteredTemplates.length > 0 ? (
                <div className="rounded-[var(--radius-md)] border border-border bg-muted/30 overflow-hidden max-h-52 overflow-y-auto">
                  {filteredTemplates.map((template, i) => {
                    const isSelected = selectedServices.some((s) => s.description === template.name)
                    return (
                      <button
                        key={template.id}
                        onClick={() => addService(template)}
                        className={cn(
                          "flex items-center justify-between w-full px-3 py-2.5 text-left transition-colors",
                          i > 0 && "border-t border-border",
                          isSelected ? "bg-primary/5" : "hover:bg-surface",
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={cn(
                              "h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
                              isSelected ? "border-primary bg-primary" : "border-border",
                            )}
                          >
                            {isSelected && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                          </div>
                          <span
                            className={cn(
                              "text-sm truncate",
                              isSelected ? "font-medium text-primary" : "text-foreground",
                            )}
                          >
                            {template.name}
                          </span>
                          <span className="text-xs text-muted-foreground shrink-0">{template.category}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 ml-3">
                          <span className="text-sm font-medium tabular-nums">{formatCurrency(template.amount)}</span>
                          {template.discount > 0 && (
                            <span className="text-[10px] bg-success-soft text-success-soft-foreground px-1.5 py-0.5 rounded-full font-medium">
                              -{formatCurrency(template.discount)}
                            </span>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  No services found.{" "}
                  <button
                    className="text-primary hover:underline"
                    onClick={() => {
                      setSelectedCategory("All")
                      setServiceSearch("")
                    }}
                  >
                    Clear filters
                  </button>
                </div>
              )}

              {!showCustom ? (
                <button
                  onClick={() => setShowCustom(true)}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add custom service
                </button>
              ) : (
                <div className="rounded-[var(--radius-md)] border border-dashed border-border bg-muted/30 p-3">
                  <div className="flex gap-2">
                    <TextInput
                      placeholder="Service name"
                      value={customService.name}
                      onChange={(e) => setCustomService((prev) => ({ ...prev, name: e.target.value }))}
                      className="flex-1 h-8 text-sm"
                      autoFocus
                    />
                    <Select
                      value={customService.category}
                      onValueChange={(v) => setCustomService((prev) => ({ ...prev, category: v }))}
                    >
                      <SelectTrigger className="w-32 h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.filter((c) => c !== "All").map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <CurrencyInput
                      value={customService.amount ? parseFloat(customService.amount) : undefined}
                      onChange={(v) => setCustomService((prev) => ({ ...prev, amount: String(v) }))}
                      className="w-28 h-8 text-sm"
                    />
                    <Button size="sm" className="h-8 px-3" onClick={addCustomService}>
                      Add
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => setShowCustom(false)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}

              {selectedServices.length > 0 && (
                <div className="rounded-[var(--radius-lg)] border border-border bg-muted/30 p-4 space-y-3">
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="tabular-nums">{formatCurrency(subtotal)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Discount</span>
                      <CurrencyInput
                        value={discount || undefined}
                        onChange={(v) => setDiscount(v)}
                        className="h-7 w-28 text-sm"
                      />
                    </div>
                    <Separator />
                    <div className="flex justify-between text-sm font-semibold">
                      <span>Total</span>
                      <span className="tabular-nums">{formatCurrency(total)}</span>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-end gap-3">
                    <div className="space-y-1 flex-1">
                      <span className="text-xs text-muted-foreground">Mode</span>
                      <Select value={paymentMode} onValueChange={setPaymentMode}>
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue />
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
                    <div className="space-y-1 flex-1">
                      <span className="text-xs text-muted-foreground">Received</span>
                      <CurrencyInput
                        value={amountPaid}
                        onChange={(v) => setAmountPaid(v)}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1 flex-1">
                      <span className="text-xs text-muted-foreground">Balance</span>
                      <div
                        className={cn(
                          "h-8 flex items-center justify-end px-3 rounded-[var(--radius-sm)] text-sm font-medium tabular-nums bg-surface border border-border",
                          balanceDue > 0 ? "text-destructive" : "text-foreground",
                        )}
                      >
                        {formatCurrency(balanceDue)}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3 — Receipt */}
          {step === 3 && receiptData && (
            <div ref={printRef} className="bg-muted -mx-6 -my-5 p-4">
              <CashReceipt
                hospital={{
                  name: hospitalProfile?.name ?? "",
                  displayName: hospitalProfile?.displayName,
                  address: hospitalProfile?.address,
                  phone: hospitalProfile?.phone,
                  email: hospitalProfile?.email,
                  website: hospitalProfile?.website,
                  registrationNo: hospitalProfile?.registrationNo,
                }}
                patient={{
                  patientName: receiptData.patientName,
                  patientId: receiptData.patientId,
                  date: receiptData.appointmentDate,
                  mobile: patientData.phone || "—",
                  gender: receiptData.gender,
                  age: receiptData.age || "—",
                  address: formatAddress(patientData.address) || "—",
                  referredBy: patientData.referredBy || undefined,
                  receiptNo: receiptData.prescriptionNumber ?? undefined,
                  doctorName: receiptData.doctorName || "—",
                  department: patientData.department || undefined,
                }}
                payment={{
                  mode: receiptData.paymentMode,
                  totalAmount: receiptData.total,
                  discount: receiptData.discount,
                  amountReceived: receiptData.amountPaid,
                  amountDue: receiptData.balanceDue,
                }}
                items={receiptData.services.map((s) => ({
                  description: s.quantity > 1 ? `${s.description} ×${s.quantity}` : s.description,
                  amount: s.amount,
                }))}
              />
            </div>
          )}
        </div>

        <DialogFooter className="px-6 py-3 border-t bg-muted/20">
          <div className="flex items-center justify-between w-full">
            {step < 3 ? (
              <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="text-muted-foreground">
                Cancel
              </Button>
            ) : (
              <div />
            )}
            <div className="flex items-center gap-2">
              {step > 1 && step < 3 && (
                <Button variant="outline" size="sm" onClick={() => setStep((s) => s - 1)}>
                  Back
                </Button>
              )}
              {step === 1 ? (
                <Button size="sm" onClick={handleStep1Next} disabled={savingPatient}>
                  {savingPatient && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                  {savingPatient ? "Saving..." : "Next"}
                  {!savingPatient && <ChevronRight className="h-3.5 w-3.5 ml-1" />}
                </Button>
              ) : step === 2 ? (
                <Button size="sm" onClick={handleRegister} disabled={submitting}>
                  {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                  {submitting ? "Registering..." : "Confirm & Register"}
                </Button>
              ) : (
                <>
                  <Button variant="outline" size="sm" onClick={handlePrintReceipt}>
                    <Printer className="h-3.5 w-3.5 mr-1.5" /> Print
                  </Button>
                  <Button size="sm" onClick={() => onOpenChange(false)}>
                    Done
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
