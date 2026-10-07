/**
 * LicensesList — card-based list of hospital licenses.
 *
 * Matches old app LicenseTrackerPage.tsx layout exactly:
 *   - 4-tile summary row (Total / Active / Expiring Soon / Expired)
 *   - Filter bar (search, status filter, dynamic category filter)
 *   - One card per license with:
 *       left:   category label, name, licenseNumber · issuingBody, notes (truncated)
 *       middle: Issued / Expires / Remind columns (hidden on small screens)
 *       right:  status badge, countdown chip, edit / delete buttons, document actions
 *
 * Document upload: client uploads to Supabase Storage (bucket: "license-documents"),
 * then PATCHes the public URL to /license-tracker/{id}/document.
 * Document remove: DELETE /license-tracker/{id}/document — server handles Storage deletion.
 *
 * Status computation is client-side (getLicenseStatus) because the backend's
 * `status` column may be stale. Threshold = per-license `reminderDays`.
 */

import { useMemo, useRef, useState, forwardRef, useImperativeHandle } from "react"
import { format } from "date-fns"
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  Loader2,
  Pencil,
  Trash2,
  Upload,
  X,
  XCircle,
} from "lucide-react"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"
import {
  ConfirmationModal,
  EmptyState,
  ErrorState,
  SearchBar,
  SingleSelect,
} from "@/components/patterns"
import type { SelectOption } from "@/components/patterns"
import { supabase } from "@/lib/supabase-client"
import { usePermissions } from "@/hooks/usePermissions"
import { useDeleteLicense, useLicenses, useRemoveDocument, useSaveDocumentUrl } from "./hooks"
import {
  getLicenseFilePath,
  getLicenseStatus,
  LICENSE_STORAGE_BUCKET,
} from "./types"
import type { License, LicenseStatusLabel } from "./types"
import { LicenseForm } from "./license-form"

// ─── Status filter values ─────────────────────────────────────────────────────

type StatusFilterValue = "all" | "active" | "expiring" | "expired"

const STATUS_FILTER_OPTIONS: SelectOption[] = [
  { value: "all", label: "All Statuses" },
  { value: "active", label: "Active" },
  { value: "expiring", label: "Expiring Soon" },
  { value: "expired", label: "Expired" },
]

// ─── Status badge config ──────────────────────────────────────────────────────

type StatusConfig = {
  pillClass: string
  borderClass: string
  Icon: typeof CheckCircle2
}

const STATUS_CONFIG: Record<LicenseStatusLabel, StatusConfig> = {
  Active: {
    pillClass: "bg-green-100 text-green-700",
    borderClass: "border-l-green-400",
    Icon: CheckCircle2,
  },
  "Expiring Soon": {
    pillClass: "bg-amber-100 text-amber-700",
    borderClass: "border-l-amber-400",
    Icon: AlertTriangle,
  },
  Expired: {
    pillClass: "bg-red-100 text-red-700",
    borderClass: "border-l-red-400",
    Icon: XCircle,
  },
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface LicensesListProps {
  /** Controlled by the parent PageHeader "Add License" button. */
  createOpen: boolean
  onCreateOpenChange: (open: boolean) => void
}

export interface LicensesListHandle {
  /** Refetches the license list — main's header Refresh button lives one level up. */
  refetch: () => void
}

// ─── LicensesList ─────────────────────────────────────────────────────────────

export const LicensesList = forwardRef<LicensesListHandle, LicensesListProps>(
  function LicensesList({ createOpen, onCreateOpenChange }, ref) {
  const { can } = usePermissions()

  // ── Data ──────────────────────────────────────────────────────────────────────
  const { data: licenses = [], isLoading, error, refetch } = useLicenses()
  const deleteLicense = useDeleteLicense()

  useImperativeHandle(ref, () => ({
    refetch: () => void refetch(),
  }))
  const saveDocUrl = useSaveDocumentUrl()
  const removeDoc = useRemoveDocument()

  // ── Filter state ──────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>("all")
  const [categoryFilter, setCategoryFilter] = useState("all")

  // ── Edit / delete / doc-remove dialog state ───────────────────────────────────
  const [editingLicense, setEditingLicense] = useState<License | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [removeDocLicense, setRemoveDocLicense] = useState<License | null>(null)

  // ── Storage upload state ──────────────────────────────────────────────────────
  const [uploadingIds, setUploadingIds] = useState<Set<string>>(new Set())
  const [uploadingForId, setUploadingForId] = useState<string | null>(null)
  const [docLoadingId, setDocLoadingId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Derived: dynamic category options (built from loaded data, not a fixed enum) ─
  const categoryOptions: SelectOption[] = useMemo(() => {
    const cats = new Set<string>()
    for (const lic of licenses) {
      if (lic.category) cats.add(lic.category)
    }
    return [
      { value: "all", label: "All Categories" },
      ...Array.from(cats)
        .sort()
        .map((c) => ({ value: c, label: c })),
    ]
  }, [licenses])

  // ── Derived: summary counts ────────────────────────────────────────────────────
  const summary = useMemo(() => {
    let active = 0
    let expiring = 0
    let expired = 0
    for (const lic of licenses) {
      const { label } = getLicenseStatus(lic.expiryDate, lic.reminderDays)
      if (label === "Active") active++
      else if (label === "Expiring Soon") expiring++
      else expired++
    }
    return { total: licenses.length, active, expiring, expired }
  }, [licenses])

  // ── Derived: filtered list ─────────────────────────────────────────────────────
  const filteredLicenses = useMemo(() => {
    return licenses.filter((lic) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        if (
          !lic.name.toLowerCase().includes(q) &&
          !(lic.licenseNumber?.toLowerCase().includes(q) ?? false) &&
          !(lic.issuingBody?.toLowerCase().includes(q) ?? false)
        ) {
          return false
        }
      }
      if (categoryFilter !== "all" && lic.category !== categoryFilter) return false
      if (statusFilter !== "all") {
        const { label } = getLicenseStatus(lic.expiryDate, lic.reminderDays)
        if (statusFilter === "active" && label !== "Active") return false
        if (statusFilter === "expiring" && label !== "Expiring Soon") return false
        if (statusFilter === "expired" && label !== "Expired") return false
      }
      return true
    })
  }, [licenses, searchQuery, categoryFilter, statusFilter])

  // ── Handlers ──────────────────────────────────────────────────────────────────

  function handleEdit(license: License) {
    setEditingLicense(license)
    setEditOpen(true)
  }

  function handleEditOpenChange(open: boolean) {
    setEditOpen(open)
    if (!open) setEditingLicense(null)
  }

  async function handleDelete() {
    if (!deleteId) return
    try {
      await deleteLicense.mutateAsync(deleteId)
      toast.success("License deleted")
    } catch {
      toast.error("Failed to delete license")
    } finally {
      setDeleteId(null)
    }
  }

  function handleUploadClick(licenseId: string) {
    setUploadingForId(licenseId)
    fileInputRef.current?.click()
  }

  async function handleView(licenseId: string, documentUrl: string) {
    setDocLoadingId(licenseId)
    try {
      const res = await fetch(documentUrl)
      const blob = await res.blob()
      const blobUrl = URL.createObjectURL(blob)
      window.open(blobUrl, "_blank")
    } catch {
      toast.error("Failed to open document")
    } finally {
      setDocLoadingId(null)
    }
  }

  async function handleDownload(licenseId: string, documentUrl: string) {
    setDocLoadingId(licenseId)
    try {
      const res = await fetch(documentUrl)
      const blob = await res.blob()
      const blobUrl = URL.createObjectURL(blob)
      const segments = documentUrl.split("/")
      const raw = segments[segments.length - 1] ?? "document"
      const filename = raw.replace(/^\d+-/, "") || "document"
      const a = document.createElement("a")
      a.href = blobUrl
      a.download = filename
      a.click()
      URL.revokeObjectURL(blobUrl)
    } catch {
      toast.error("Failed to download document")
    } finally {
      setDocLoadingId(null)
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !uploadingForId) return
    e.target.value = ""

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File too large. Maximum size is 10 MB.")
      setUploadingForId(null)
      return
    }

    const licenseId = uploadingForId
    setUploadingForId(null)
    setUploadingIds((prev) => new Set(prev).add(licenseId))

    try {
      const filePath = getLicenseFilePath(licenseId, file.name)
      const { error: uploadError } = await supabase.storage
        .from(LICENSE_STORAGE_BUCKET)
        .upload(filePath, file, { upsert: false })
      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from(LICENSE_STORAGE_BUCKET)
        .getPublicUrl(filePath)

      await saveDocUrl.mutateAsync({ id: licenseId, documentUrl: urlData.publicUrl })
      toast.success("Document uploaded successfully")
    } catch {
      toast.error("Upload failed. Please try again.")
    } finally {
      setUploadingIds((prev) => {
        const next = new Set(prev)
        next.delete(licenseId)
        return next
      })
    }
  }

  async function handleRemoveDoc() {
    if (!removeDocLicense) return
    try {
      await removeDoc.mutateAsync(removeDocLicense.id)
      toast.success("Document removed")
    } catch {
      toast.error("Failed to remove document")
    } finally {
      setRemoveDocLicense(null)
    }
  }

  // ── Loading skeleton ──────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[72px] rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-14 rounded-xl" />
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-[var(--radius-lg)] bg-[var(--color-card)] shadow-[var(--shadow-card)] p-5 space-y-3"
            >
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ── Error state ───────────────────────────────────────────────────────────────

  if (error) {
    return (
      <ErrorState
        title="Could not load licenses"
        error={error}
        onRetry={() => void refetch()}
      />
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Hidden file input — shared across all cards (same pattern as old app) */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        className="hidden"
        aria-hidden="true"
        onChange={handleFileChange}
      />

      {/* ── Summary stats ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-[var(--radius-lg)] bg-[var(--color-card)] shadow-[var(--shadow-card)] px-4 py-3">
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="text-2xl font-bold text-foreground">{summary.total}</p>
        </div>
        <div className="rounded-[var(--radius-lg)] bg-[var(--color-success-soft)] shadow-[var(--shadow-card)] px-4 py-3">
          <p className="text-xs text-green-600">Active</p>
          <p className="text-2xl font-bold text-green-700">{summary.active}</p>
        </div>
        <div className="rounded-[var(--radius-lg)] bg-[var(--color-warning-soft)] shadow-[var(--shadow-card)] px-4 py-3">
          <p className="text-xs text-amber-600">Expiring Soon</p>
          <p className="text-2xl font-bold text-amber-700">{summary.expiring}</p>
        </div>
        <div className="rounded-[var(--radius-lg)] bg-[var(--color-error-soft)] shadow-[var(--shadow-card)] px-4 py-3">
          <p className="text-xs text-red-600">Expired</p>
          <p className="text-2xl font-bold text-red-700">{summary.expired}</p>
        </div>
      </div>

      {/* ── Filters — plain bordered card, not the sticky PageToolbar/FilterBar;
          matches main's exact filter-row treatment for this page. ──────────── */}
      <div className="bg-white rounded-xl shadow-sm border border-border/60 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <SearchBar
            variant="standalone"
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search licenses..."
            aria-label="Search licenses by name, number, or issuing authority"
            className="flex-1 min-w-[200px]"
          />

          <SingleSelect
            options={STATUS_FILTER_OPTIONS}
            value={statusFilter}
            onChange={(v) => setStatusFilter(v as StatusFilterValue)}
            placeholder="All Statuses"
          />

          {/* Only show category filter if there is more than just "All Categories" */}
          {categoryOptions.length > 1 && (
            <SingleSelect
              options={categoryOptions}
              value={categoryFilter}
              onChange={setCategoryFilter}
              placeholder="All Categories"
            />
          )}
        </div>
      </div>

      {/* ── License cards ───────────────────────────────────────────────────────── */}
      {filteredLicenses.length === 0 ? (
        <EmptyState
          icon={<Clock size={48} aria-hidden="true" />}
          title={
            licenses.length === 0
              ? "No licenses added yet"
              : "No licenses match the current filters"
          }
          description={
            licenses.length === 0
              ? 'Click "Add License" to start tracking your hospital licenses.'
              : "Try clearing the filters to see all licenses."
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {filteredLicenses.map((lic) => {
            const { label: statusLabel, daysLeft } = getLicenseStatus(
              lic.expiryDate,
              lic.reminderDays,
            )
            const cfg = STATUS_CONFIG[statusLabel]
            const StatusIcon = cfg.Icon
            const expiryColor =
              daysLeft < 0
                ? "text-red-600"
                : daysLeft <= lic.reminderDays
                  ? "text-amber-600"
                  : "text-foreground"
            const countdownClass =
              daysLeft < 0
                ? "text-red-600 bg-red-50"
                : daysLeft <= lic.reminderDays
                  ? "text-amber-600 bg-amber-50"
                  : "text-green-600 bg-green-50"
            const isUploadingThis = uploadingIds.has(lic.id)
            const isDocLoading = docLoadingId === lic.id

            return (
              <article
                key={lic.id}
                aria-label={`License: ${lic.name}`}
                className={`rounded-[var(--radius-lg)] bg-[var(--color-card)] border-l-4 ${cfg.borderClass} shadow-[var(--shadow-card)] px-5 py-4 hover:shadow-md transition-shadow`}
              >
                <div className="flex items-start gap-4">
                  {/* Left: category label + name + meta */}
                  <div className="flex-1 min-w-0">
                    {lic.category != null && (
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                        {lic.category}
                      </p>
                    )}
                    <h3 className="font-semibold text-foreground text-sm truncate">
                      {lic.name}
                    </h3>
                    {(lic.licenseNumber != null || lic.issuingBody != null) && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {[lic.licenseNumber, lic.issuingBody]
                          .filter((v): v is string => v != null && v !== "")
                          .join(" · ")}
                      </p>
                    )}
                    {lic.notes != null && lic.notes !== "" && (
                      <p className="text-xs text-muted-foreground/70 mt-1 line-clamp-1">
                        {lic.notes}
                      </p>
                    )}
                  </div>

                  {/* Middle: date columns (hidden on small screens) */}
                  <div className="hidden md:flex items-center gap-6 shrink-0 self-center">
                    <div className="text-center">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">
                        Issued
                      </p>
                      <p className="text-xs font-medium text-foreground">
                        {lic.issueDate != null
                          ? format(new Date(lic.issueDate), "dd MMM yy")
                          : "—"}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">
                        Expires
                      </p>
                      <p className={`text-xs font-medium ${expiryColor}`}>
                        {format(new Date(lic.expiryDate), "dd MMM yy")}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">
                        Remind
                      </p>
                      <p className="text-xs font-medium text-foreground">
                        {lic.reminderDays}d
                      </p>
                    </div>
                  </div>

                  {/* Right: status badge + countdown + action buttons */}
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    {/* Status badge + countdown + edit/delete */}
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.pillClass}`}
                        aria-label={`Status: ${statusLabel}`}
                      >
                        <StatusIcon className="h-3 w-3" aria-hidden="true" />
                        {statusLabel}
                      </span>

                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-md whitespace-nowrap ${countdownClass}`}
                        aria-label={
                          daysLeft < 0
                            ? `Expired ${Math.abs(daysLeft)} days ago`
                            : daysLeft === 0
                              ? "Expires today"
                              : `${daysLeft} days remaining`
                        }
                      >
                        {daysLeft < 0
                          ? `${Math.abs(daysLeft)}d ago`
                          : daysLeft === 0
                            ? "Today"
                            : `${daysLeft}d left`}
                      </span>

                      {can("licenses:edit") && (
                        <button
                          type="button"
                          onClick={() => handleEdit(lic)}
                          className="p-1.5 rounded-md text-muted-foreground hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          aria-label={`Edit ${lic.name}`}
                        >
                          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      )}

                      {can("licenses:delete") && (
                        <button
                          type="button"
                          onClick={() => setDeleteId(lic.id)}
                          className="p-1.5 rounded-md text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors"
                          aria-label={`Delete ${lic.name}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      )}
                    </div>

                    {/* Document actions */}
                    <div className="flex items-center gap-1.5">
                      {isUploadingThis ? (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground px-2 py-1">
                          <Loader2
                            className="h-3.5 w-3.5 animate-spin"
                            aria-hidden="true"
                          />
                          Uploading...
                        </span>
                      ) : lic.documentUrl != null ? (
                        <>
                          {isDocLoading ? (
                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground px-2 py-1">
                              <Loader2
                                className="h-3.5 w-3.5 animate-spin"
                                aria-hidden="true"
                              />
                              Loading...
                            </span>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  void handleView(lic.id, lic.documentUrl!)
                                }
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 transition-colors"
                                aria-label={`View document for ${lic.name}`}
                              >
                                <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                                View
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  void handleDownload(lic.id, lic.documentUrl!)
                                }
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-cyan-600 bg-cyan-50 hover:bg-cyan-100 transition-colors"
                                aria-label={`Download document for ${lic.name}`}
                              >
                                <Download
                                  className="h-3.5 w-3.5"
                                  aria-hidden="true"
                                />
                                Download
                              </button>
                              {can("licenses:edit") && (
                                <button
                                  type="button"
                                  onClick={() => setRemoveDocLicense(lic)}
                                  className="p-1.5 rounded-md text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors"
                                  aria-label={`Remove document for ${lic.name}`}
                                >
                                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                                </button>
                              )}
                            </>
                          )}
                        </>
                      ) : (
                        can("licenses:edit") && (
                          <button
                            type="button"
                            onClick={() => handleUploadClick(lic.id)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors"
                            aria-label={`Upload document for ${lic.name}`}
                          >
                            <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                            Upload
                          </button>
                        )
                      )}
                    </div>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}

      {/* ── Create form (triggered by PageHeader button in parent) ─────────────── */}
      <LicenseForm
        license={null}
        open={createOpen}
        onOpenChange={onCreateOpenChange}
      />

      {/* ── Edit form ─────────────────────────────────────────────────────────── */}
      <LicenseForm
        license={editingLicense}
        open={editOpen}
        onOpenChange={handleEditOpenChange}
      />

      {/* ── Delete confirmation ────────────────────────────────────────────────── */}
      <ConfirmationModal
        open={deleteId != null}
        onOpenChange={(v) => {
          if (!v) setDeleteId(null)
        }}
        variant="destructive"
        title="Delete License"
        description="Are you sure you want to delete this license? This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        isLoading={deleteLicense.isPending}
      />

      {/* ── Remove document confirmation ───────────────────────────────────────── */}
      <ConfirmationModal
        open={removeDocLicense != null}
        onOpenChange={(v) => {
          if (!v) setRemoveDocLicense(null)
        }}
        variant="destructive"
        title="Remove Document"
        description={
          removeDocLicense != null
            ? `Remove the attached document from "${removeDocLicense.name}"? The file will be permanently deleted from storage.`
            : undefined
        }
        confirmLabel="Remove"
        onConfirm={handleRemoveDoc}
        isLoading={removeDoc.isPending}
      />
    </>
  )
})
