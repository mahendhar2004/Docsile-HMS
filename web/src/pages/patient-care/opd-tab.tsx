/**
 * OpdTab
 *
 * OPD patient management:
 * - Date navigator to switch between appointment dates
 * - Existing-patient autocomplete search (cursor-based API, useQuery + debounce)
 * - Offset-paginated patient table via PaginatedDataTable
 * - Register new patient (PatientRegistrationForm)
 * - Patient detail panel (PatientDetailPanel / Sheet)
 * - Edit patient (inline edit form)
 * - Delete with ConfirmationModal
 *
 * Permissions:
 *   patients:view    — always required (caller gates the whole tab)
 *   patients:create  — shows Register button
 *   patients:edit    — shows edit actions
 *   patients:delete  — shows delete action
 *   billing:create   — shows Add Service in detail panel
 *   billing:view     — shows Print Receipt in detail panel
 */

import { useState, useEffect, useId, useMemo, useRef, forwardRef, useImperativeHandle } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { format } from "date-fns"
import { toast } from "@/components/ui/sonner"
import { calculateAge, formatCurrency } from "@/lib/utils"
import { apiClient } from "@/lib/api-client"
import { printReceiptsHtml } from "@/lib/print-receipts"
import { Pencil, Trash2, MoreVertical, Settings, Loader2, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { IconButton } from "@/components/ui/icon-button"
import { QuickPrintRenderer } from "@/components/receipts/quick-print-renderer"
import { useDefaultPrintConfig } from "@/pages/settings/hooks"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import {
  PaginatedDataTable,
  ColumnDef,
  StatusPill,
  SearchBar,
  DatePicker,
  DateNavigator,
  FormField,
  FormSection,
  TextInput,
  PhoneInput,
  SingleSelect,
  ConfirmationModal,
  EmptyState,
  PageToolbar,
} from "@/components/patterns"
import type { Suggestion } from "@/components/patterns"
import {
  useOpdPatients,
  usePatientSearch,
  useUpdatePatient,
  useDeletePatient,
} from "./hooks"
import { PatientRegistrationForm } from "./patient-registration-form"
import { PatientDetailPanel } from "./patient-detail-panel"
import type { Patient, PatientReceiptData } from "./types"

// ─── Edit form schema ──────────────────────────────────────────────────────────

const editSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phone: z.string().min(7, "Valid phone number required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  gender: z.enum(["Male", "Female", "Other"]),
  dateOfBirth: z.date().optional(),
  address: z.string().optional(),
  patientType: z.string().min(1, "Patient type is required"),
  appointmentDate: z.date(),
  referredBy: z.string().optional(),
})

type EditFormValues = z.infer<typeof editSchema>

const GENDER_OPTIONS = [
  { value: "Male", label: "Male" },
  { value: "Female", label: "Female" },
  { value: "Other", label: "Other" },
]

const PATIENT_TYPE_OPTIONS = [
  { value: "OPD", label: "OPD" },
  { value: "Walk-in", label: "Walk-in" },
  { value: "Referral", label: "Referral" },
]

// ─── PatientEditForm (inline) ─────────────────────────────────────────────────

interface PatientEditFormProps {
  patient: Patient
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

function PatientEditForm({ patient, open, onOpenChange, onSuccess }: PatientEditFormProps) {
  const formId = useId()
  const updatePatient = useUpdatePatient(patient.id, () => {
    onSuccess()
    onOpenChange(false)
  })

  const { register, control, handleSubmit, reset, formState: { errors } } = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
  })

  useEffect(() => {
    if (open) {
      reset({
        firstName: patient.firstName,
        lastName: patient.lastName,
        phone: patient.phone,
        email: patient.email ?? "",
        gender: patient.gender,
        dateOfBirth: patient.dateOfBirth ? new Date(patient.dateOfBirth) : undefined,
        address: patient.address ?? "",
        patientType: patient.patientType,
        appointmentDate: new Date(patient.appointmentDate),
        referredBy: patient.referredBy ?? "",
      })
      updatePatient.reset()
    }
  }, [open, patient]) // eslint-disable-line react-hooks/exhaustive-deps

  function onSubmit(values: EditFormValues) {
    updatePatient.mutate({
      firstName: values.firstName,
      lastName: values.lastName,
      phone: values.phone,
      email: values.email || null,
      gender: values.gender,
      dateOfBirth: values.dateOfBirth ? format(values.dateOfBirth, "yyyy-MM-dd") : null,
      address: values.address || null,
      patientType: values.patientType,
      appointmentDate: format(values.appointmentDate, "yyyy-MM-dd"),
      referredBy: values.referredBy || null,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="xl">
        <DialogHeader>
          <DialogTitle>Edit Patient — {patient.patientId}</DialogTitle>
          <DialogDescription>Update patient details below.</DialogDescription>
        </DialogHeader>
        <form id={formId} onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-6">
          <FormSection title="Personal Information">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="First Name" htmlFor={`${formId}-fn`} required error={errors.firstName?.message}>
                <TextInput id={`${formId}-fn`} hasError={Boolean(errors.firstName)} {...register("firstName")} />
              </FormField>
              <FormField label="Last Name" htmlFor={`${formId}-ln`} required error={errors.lastName?.message}>
                <TextInput id={`${formId}-ln`} hasError={Boolean(errors.lastName)} {...register("lastName")} />
              </FormField>
              <FormField label="Phone" htmlFor={`${formId}-ph`} required error={errors.phone?.message}>
                <Controller name="phone" control={control} render={({ field }) => (
                  <PhoneInput id={`${formId}-ph`} value={field.value ?? ""} onChange={field.onChange} hasError={Boolean(errors.phone)} />
                )} />
              </FormField>
              <FormField label="Email" htmlFor={`${formId}-em`} error={errors.email?.message}>
                <TextInput id={`${formId}-em`} inputType="email" hasError={Boolean(errors.email)} {...register("email")} />
              </FormField>
              <FormField label="Gender" htmlFor={`${formId}-gd`} required error={errors.gender?.message}>
                <Controller name="gender" control={control} render={({ field }) => (
                  <SingleSelect options={GENDER_OPTIONS} value={field.value ?? ""} onChange={field.onChange} placeholder="Select gender" error={Boolean(errors.gender)} />
                )} />
              </FormField>
              <FormField label="Date of Birth" htmlFor={`${formId}-dob`}>
                <Controller name="dateOfBirth" control={control} render={({ field }) => (
                  <DatePicker id={`${formId}-dob`} value={field.value} onChange={field.onChange} toDate={new Date()} aria-label="Date of birth" />
                )} />
              </FormField>
            </div>
            <FormField label="Address" htmlFor={`${formId}-addr`}>
              <Textarea id={`${formId}-addr`} rows={2} className="resize-none" {...register("address")} />
            </FormField>
          </FormSection>
          <FormSection title="Visit Information">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Patient Type" htmlFor={`${formId}-pt`} required error={errors.patientType?.message}>
                <Controller name="patientType" control={control} render={({ field }) => (
                  <SingleSelect options={PATIENT_TYPE_OPTIONS} value={field.value ?? ""} onChange={field.onChange} placeholder="Select type" error={Boolean(errors.patientType)} />
                )} />
              </FormField>
              <FormField label="Appointment Date" htmlFor={`${formId}-ad`} required error={errors.appointmentDate?.message}>
                <Controller name="appointmentDate" control={control} render={({ field }) => (
                  <DatePicker id={`${formId}-ad`} value={field.value} onChange={field.onChange} error={Boolean(errors.appointmentDate)} aria-label="Appointment date" />
                )} />
              </FormField>
              <FormField label="Referred By" htmlFor={`${formId}-rb`}>
                <TextInput id={`${formId}-rb`} {...register("referredBy")} />
              </FormField>
            </div>
          </FormSection>
          {updatePatient.isError && (
            <p role="alert" className="text-sm text-[var(--color-error)]">
              {updatePatient.error instanceof Error ? updatePatient.error.message : "Update failed."}
            </p>
          )}
        </form>
        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={updatePatient.isPending}>
            Cancel
          </Button>
          <Button type="submit" form={formId} loading={updatePatient.isPending}>
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Table columns ─────────────────────────────────────────────────────────────

/**
 * Token is a stable per-day registration-order number, matching main's
 * PatientTable (tokenMap sorts the whole day ascending by createdAt and
 * assigns 1, 2, 3…). The migrated table paginates server-side (offset,
 * newest first), so the same numbering is reconstructed from total/page/
 * pageSize rather than re-sorting the current page alone.
 */
function buildColumns(args: {
  total: number
  page: number
  pageSize: number
  canViewReceipt: boolean
  defaultPrintConfigured: boolean
  printingId: string | null
  onQuickPrint: (patient: Patient) => void
}): ColumnDef<Patient>[] {
  const { total, page, pageSize, canViewReceipt, defaultPrintConfigured, printingId, onQuickPrint } =
    args

  return [
    {
      key: "token",
      header: "Token",
      cell: (_p, index) => {
        const token = total - ((page - 1) * pageSize + index)
        return (
          <span className="inline-flex items-center justify-center h-6 min-w-7 rounded bg-primary/10 border border-primary/20 border-dashed text-xs font-bold text-primary tabular-nums px-1.5">
            {token}
          </span>
        )
      },
      minWidth: "48px",
    },
    {
      key: "time",
      header: "Time",
      cell: (p) => (
        <span className="text-muted-foreground text-sm tabular-nums whitespace-nowrap">
          {format(new Date(p.createdAt), "hh:mm a")}
        </span>
      ),
    },
    {
      key: "patientId",
      header: "ID",
      cell: (p) => <span className="font-mono text-xs">{p.patientId}</span>,
    },
    {
      key: "name",
      header: "Name",
      cell: (p) => (
        <span className="font-medium">
          {p.firstName} {p.lastName}
        </span>
      ),
    },
    {
      key: "ageGender",
      header: "Age / Gender",
      cell: (p) =>
        p.dateOfBirth
          ? `${calculateAge(p.dateOfBirth)} / ${p.gender}`
          : p.gender,
    },
    {
      key: "phone",
      header: "Phone",
      cell: (p) => p.phone,
    },
    {
      key: "doctor",
      header: "Doctor",
      cell: (p) => {
        const doctorName = p.prescriptions?.[0]?.doctorName
        if (!doctorName) return <span className="text-muted-foreground/50">—</span>
        return (
          <span className="text-sm font-medium">
            {doctorName.startsWith("Dr") ? doctorName : `Dr. ${doctorName}`}
          </span>
        )
      },
    },
    {
      key: "patientType",
      header: "Type",
      cell: (p) => p.patientType,
    },
    {
      key: "status",
      header: "Status",
      cell: (p) => <StatusPill status={p.status ?? "REGISTERED"} size="sm" />,
    },
    {
      key: "services",
      header: "Services",
      cell: (p) => {
        const items = p.prescriptions?.[0]?.items ?? []
        if (items.length === 0) return <span className="text-muted-foreground/50">—</span>
        const sorted = [...items].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        const extra = sorted.length - 1
        return (
          <Tooltip delayDuration={150}>
            <TooltipTrigger asChild>
              <div className="inline-flex items-center gap-1 max-w-[200px] cursor-default">
                <span className="inline-flex items-center h-6 px-2 rounded-md bg-muted/70 border border-border/40 text-[12px] font-medium truncate">
                  {sorted[0].description}
                </span>
                {extra > 0 && (
                  <span className="inline-flex items-center justify-center h-6 px-1.5 rounded-md bg-muted/70 border border-border/40 text-[11px] font-semibold text-muted-foreground tabular-nums shrink-0">
                    +{extra}
                  </span>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" align="start" className="max-w-xs px-3 py-2">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Services ({sorted.length})
              </p>
              <ul className="space-y-1 text-xs">
                {sorted.map((it, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-muted-foreground/60 mt-0.5">•</span>
                    <span>{it.description}</span>
                  </li>
                ))}
              </ul>
            </TooltipContent>
          </Tooltip>
        )
      },
    },
    {
      key: "receipt",
      header: "Receipt",
      cell: (p) => {
        const rx = p.prescriptions?.[0]
        if (!rx) return <span className="text-muted-foreground/50">—</span>
        return (
          <div>
            <span className="font-semibold text-sm tabular-nums">{formatCurrency(rx.total)}</span>
            {rx.balanceDue > 0 && (
              <p className="text-[11px] text-orange-600 font-medium mt-0.5 tabular-nums">
                Due: {formatCurrency(rx.balanceDue)}
              </p>
            )}
          </div>
        )
      },
    },
    {
      key: "referredBy",
      header: "Referred By",
      cell: (p) => p.referredBy ?? "—",
    },
    ...(canViewReceipt
      ? [
          {
            key: "print",
            header: "",
            align: "center" as const,
            cell: (p: Patient) => {
              if (p.status !== "COMPLETED") return null
              const isPrinting = printingId === p.patientId
              return (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={!defaultPrintConfigured || isPrinting}
                      className={
                        defaultPrintConfigured
                          ? "h-7 w-7 p-0 text-primary opacity-70 group-hover:opacity-100 transition-opacity"
                          : "h-7 w-7 p-0 text-muted-foreground/40"
                      }
                      onClick={() => onQuickPrint(p)}
                      aria-label={`Quick print receipt for ${p.firstName} ${p.lastName}`}
                    >
                      {isPrinting ? (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      ) : (
                        <Zap className="h-4 w-4" aria-hidden />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="text-xs">
                    {defaultPrintConfigured
                      ? "Quick print (default receipts)"
                      : "Configure defaults in Settings → Print Defaults"}
                  </TooltipContent>
                </Tooltip>
              )
            },
          } satisfies ColumnDef<Patient>,
        ]
      : []),
  ]
}

// ─── OpdTab component ─────────────────────────────────────────────────────────

export interface OpdTabProps {
  canCreate: boolean
  canEdit: boolean
  canDelete: boolean
  canAddServices: boolean
  canViewReceipt: boolean
  /**
   * Controlled by the parent (PatientsPage) so the header's Stats button can
   * fetch stats for the same date this tab is viewing — matches main, where
   * `selectedDate` lives at the PatientsPage level, not inside the OPD view.
   */
  viewDate: Date
  onViewDateChange: (date: Date) => void
  /**
   * Mirrors the active list-filter search text up to the parent, same
   * reasoning as viewDate: main's Stats modal reads off the same `patients`
   * state the search box filters, so when a search is active the header's
   * Stats button reflects only the filtered subset — not the whole day.
   */
  onListFilterChange?: (filter: string) => void
  /** Opens /settings — matches main's Configurations shortcut in the FilterBar. */
  onOpenSettings: () => void
}

export interface OpdTabHandle {
  /** Opens the Register Patient dialog — main's header button lives one level up. */
  openRegister: () => void
  /** Refetches the current page — main's header Refresh button lives one level up. */
  refetch: () => void
}

export const OpdTab = forwardRef<OpdTabHandle, OpdTabProps>(function OpdTab({
  canCreate,
  canEdit,
  canDelete,
  canAddServices,
  canViewReceipt,
  viewDate,
  onViewDateChange,
  onListFilterChange,
  onOpenSettings,
}, ref) {
  const [searchQ, setSearchQ] = useState("")
  const [listFilter, setListFilter] = useState("")
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null)
  const [showDetail, setShowDetail] = useState(false)
  const [showRegister, setShowRegister] = useState(false)
  const [editPatient, setEditPatient] = useState<Patient | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Patient | null>(null)

  const dateStr = format(viewDate, "yyyy-MM-dd")

  // Offset-paginated OPD list for the selected date, scoped to `listFilter` —
  // matches main's "Search by ID, name, phone..." box, which re-fetches the
  // whole day's list on submit rather than filtering client-side.
  const {
    data,
    total,
    page,
    pageSize,
    isLoading,
    isFetching,
    isError,
    error,
    setPage,
    setPageSize,
    refetch,
  } = useOpdPatients(dateStr, listFilter)

  // Autocomplete search using the cursor-based search endpoint.
  const { data: searchData, isLoading: isSearching } = usePatientSearch(searchQ)

  const deletePatient = useDeletePatient(() => {
    setDeleteTarget(null)
    void refetch()
  })

  const searchSuggestions: Suggestion<Patient>[] = (searchData?.patients ?? []).map((p) => ({
    id: p.id,
    label: `${p.firstName} ${p.lastName}`,
    value: p,
  }))

  function handleSearchSelect(suggestion: Suggestion<Patient>) {
    setSearchQ(`${suggestion.value.firstName} ${suggestion.value.lastName} — ${suggestion.value.phone}`)
    setSelectedPatientId(suggestion.value.id)
    setShowDetail(true)
  }

  // Enter with no suggestion highlighted filters the day's list by the typed
  // text (server-side ilike on patientId/phone/firstName/lastName), matching
  // main's SearchInput submit behavior — selecting a suggestion instead jumps
  // straight to that patient's detail panel via handleSearchSelect above.
  function handleListFilterSearch(value: string) {
    setListFilter(value)
    onListFilterChange?.(value)
    setPage(1)
  }

  function navigateDate(direction: -1 | 1) {
    const next = new Date(viewDate)
    next.setDate(next.getDate() + direction)
    onViewDateChange(next)
    setPage(1)
  }

  // ── Quick print (matches main's PatientTable "Print" column exactly) ──────
  const { items: defaultPrintItems } = useDefaultPrintConfig()
  const defaultPrintConfigured = defaultPrintItems.length > 0
  const [printingId, setPrintingId] = useState<string | null>(null)
  const [quickPrintData, setQuickPrintData] = useState<PatientReceiptData | null>(null)
  const quickPrintRef = useRef<HTMLDivElement>(null)

  async function handleQuickPrint(patient: Patient) {
    if (!defaultPrintConfigured) return
    setPrintingId(patient.patientId)
    try {
      const { data } = await apiClient.get<PatientReceiptData>(
        `/patient-care/patients/${patient.id}/receipt`,
      )
      setQuickPrintData(data)
      setTimeout(() => {
        const html = quickPrintRef.current?.innerHTML ?? ""
        if (!html) {
          toast.error("Nothing to print")
          return
        }
        printReceiptsHtml({
          title: `Print - ${patient.firstName} ${patient.lastName}`,
          contentHtml: html,
        })
        setTimeout(() => setQuickPrintData(null), 1500)
      }, 50)
    } catch {
      toast.error("Failed to load receipt data")
    } finally {
      setPrintingId(null)
    }
  }

  const columns = useMemo(
    () =>
      buildColumns({
        total,
        page,
        pageSize,
        canViewReceipt,
        defaultPrintConfigured,
        printingId,
        onQuickPrint: (p) => void handleQuickPrint(p),
      }),
    [total, page, pageSize, canViewReceipt, defaultPrintConfigured, printingId],
  )

  useImperativeHandle(ref, () => ({
    openRegister: () => setShowRegister(true),
    refetch: () => void refetch(),
  }))

  return (
    <div className="space-y-4">
      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <PageToolbar className="items-start sm:items-center">
        {/* Date navigator — matches main's DateNavigator exactly (prev/date/next + Today) */}
        <DateNavigator
          date={dateStr}
          onDateChange={(iso) => {
            onViewDateChange(new Date(iso + "T00:00:00"))
            setPage(1)
          }}
          onPrev={() => navigateDate(-1)}
          onNext={() => navigateDate(1)}
          onToday={() => {
            onViewDateChange(new Date())
            setPage(1)
          }}
          isToday={dateStr === format(new Date(), "yyyy-MM-dd")}
        />

        {/* Existing patient search */}
        <div className="flex-1 max-w-sm">
          <SearchBar<Patient>
            variant="with-autocomplete"
            value={searchQ}
            onChange={setSearchQ}
            suggestions={searchSuggestions}
            onSuggestionSelect={handleSearchSelect}
            onSearch={handleListFilterSearch}
            isLoadingSuggestions={isSearching}
            placeholder="Search patient by name, phone, ID…"
            aria-label="Search existing patients"
            renderSuggestion={(s) => (
              <div className="flex flex-col gap-0.5">
                <span className="font-medium">{s.label}</span>
                <span className="text-xs text-[var(--color-muted-foreground)]">
                  {s.value.patientId} · {s.value.phone}
                </span>
              </div>
            )}
          />
        </div>

        {/* Configurations shortcut — matches main's FilterBar placement exactly
            (main's Register/Add Patient button lives in the page header
            instead, one level up, not in this toolbar). */}
        <IconButton
          variant="outline"
          size="sm"
          className="ml-auto"
          onClick={onOpenSettings}
          aria-label="Open configurations"
          title="Configurations"
        >
          <Settings className="h-4 w-4" aria-hidden />
        </IconButton>
      </PageToolbar>

      {/* ── Patient table ─────────────────────────────────────────────────── */}
      <TooltipProvider delayDuration={150}>
        <PaginatedDataTable<Patient>
          mode="offset"
          data={data}
          columns={columns}
          variant={canEdit || canDelete ? "with-row-actions" : "standard"}
          isLoading={isLoading}
          isFetching={isFetching}
          isError={isError}
          error={error}
          onRetry={refetch}
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          showPageSizeSelector
          aria-label="OPD patients table"
          rowClassName={() => "group"}
          onRowClick={(patient) => {
            setSelectedPatientId(patient.id)
            setShowDetail(true)
          }}
          rowActions={(patient) => (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label={`Actions for ${patient.firstName} ${patient.lastName}`}
                >
                  <MoreVertical className="h-4 w-4" aria-hidden />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {canEdit && (
                  <DropdownMenuItem onSelect={() => setEditPatient(patient)}>
                    <Pencil className="h-3.5 w-3.5 mr-2" aria-hidden />
                    Edit
                  </DropdownMenuItem>
                )}
                {canDelete && (
                  <DropdownMenuItem
                    onSelect={() => setDeleteTarget(patient)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-2" aria-hidden />
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          emptyState={
            <EmptyState
              title="No patients today"
              description={`No patients have been registered for ${format(viewDate, "dd MMM yyyy")}.`}
              action={
                canCreate
                  ? { label: "Register Patient", onClick: () => setShowRegister(true) }
                  : undefined
              }
            />
          }
        />
      </TooltipProvider>

      {/* ── Patient detail panel ──────────────────────────────────────────── */}
      <PatientDetailPanel
        patientId={selectedPatientId}
        open={showDetail}
        onOpenChange={setShowDetail}
        onDeleted={refetch}
        canEdit={canEdit}
        canDelete={canDelete}
        canAddServices={canAddServices}
        canViewReceipt={canViewReceipt}
        onEdit={(patient) => {
          setEditPatient(patient)
          setShowDetail(false)
        }}
      />

      {/* ── Patient registration form ─────────────────────────────────────── */}
      <PatientRegistrationForm
        open={showRegister}
        onOpenChange={setShowRegister}
        defaultAppointmentDate={viewDate}
        onSuccess={() => void refetch()}
      />

      {/* ── Patient edit form ─────────────────────────────────────────────── */}
      {editPatient && (
        <PatientEditForm
          patient={editPatient}
          open={editPatient !== null}
          onOpenChange={(open) => { if (!open) setEditPatient(null) }}
          onSuccess={() => void refetch()}
        />
      )}

      {/* ── Delete confirmation ───────────────────────────────────────────── */}
      {deleteTarget && (
        <ConfirmationModal
          open={deleteTarget !== null}
          onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}
          variant="destructive"
          title="Delete Patient"
          description={`Delete ${deleteTarget.firstName} ${deleteTarget.lastName} (${deleteTarget.patientId})? This cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={() => deletePatient.mutate(deleteTarget.id)}
          isLoading={deletePatient.isPending}
        />
      )}

      {/* ── Hidden quick-print renderer ───────────────────────────────────── */}
      {quickPrintData && (
        <QuickPrintRenderer ref={quickPrintRef} data={quickPrintData} items={defaultPrintItems} />
      )}
    </div>
  )
})
