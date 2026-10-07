/**
 * InpatientTemplatesSection — CRUD for /settings/inpatient-templates.
 * Permission: settings:view (read) / settings:edit (write)
 *
 * Field shapes verified from:
 * - supabase/functions/settings/types.ts InpatientTemplateSchema
 * - old app SettingsPage.tsx InpatientTemplateRow type + InpatientFormDialog
 * IMPORTANT: field is `provisionDiagnosis` (NOT `provisionalDiagnosis`)
 */

import { useState } from "react"
import { Plus, Pencil, Trash2 } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ConfirmationModal, ErrorState, EmptyState } from "@/components/patterns"
import {
  useInpatientTemplates,
  useCreateInpatientTemplate,
  useUpdateInpatientTemplate,
  useDeleteInpatientTemplate,
  useMedicineMaster,
} from "./hooks"
import {
  PRESCRIPTION_TIMINGS,
  PRESCRIPTION_DAYS,
  type InpatientTemplate,
  type InpatientTemplateMed,
} from "./types"

interface InpatientTemplatesSectionProps {
  canEdit: boolean
}

export function InpatientTemplatesSection({ canEdit }: InpatientTemplatesSectionProps) {
  const { data: templates = [], isLoading, error, refetch } = useInpatientTemplates()
  const [search, setSearch] = useState("")
  const [showInactive, setShowInactive] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editItem, setEditItem] = useState<InpatientTemplate | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const deleteM = useDeleteInpatientTemplate()

  const filtered = templates.filter((t) => {
    if (!showInactive && !t.isActive) return false
    if (!search) return true
    const q = search.toLowerCase()
    return (
      t.code.toLowerCase().includes(q) ||
      t.name.toLowerCase().includes(q) ||
      (t.operationName?.toLowerCase().includes(q) ?? false)
    )
  })

  function parseMeds(t: InpatientTemplate): InpatientTemplateMed[] {
    try {
      return JSON.parse(t.medicines ?? "[]") as InpatientTemplateMed[]
    } catch {
      return []
    }
  }

  if (error) {
    return (
      <ErrorState
        title="Could not load inpatient templates"
        error={error}
        onRetry={() => void refetch()}
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <Input
          placeholder="Search by code, name or operation..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-72 h-9"
          aria-label="Search inpatient templates"
        />
        <label className="flex items-center gap-1.5 text-sm text-muted-foreground cursor-pointer">
          <Checkbox
            checked={showInactive}
            onCheckedChange={(v) => setShowInactive(v === true)}
            aria-label="Show inactive templates"
          />
          Show inactive
        </label>
        <div className="flex-1" />
        {canEdit && (
          <Button size="sm" className="h-9" onClick={() => { setEditItem(null); setDialogOpen(true) }}>
            <Plus className="h-4 w-4 mr-1" aria-hidden="true" />
            Add Template
          </Button>
        )}
      </div>

      <div className="rounded-[var(--radius-lg)] bg-[var(--color-card)] shadow-[var(--shadow-card)] overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="w-28">Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Operation</TableHead>
              <TableHead>Medicines</TableHead>
              <TableHead className="text-center">Status</TableHead>
              {canEdit && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: canEdit ? 6 : 5 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={canEdit ? 6 : 5} className="py-12">
                  <EmptyState
                    title="No inpatient templates"
                    description={
                      search ? "No templates match your search." : "Create your first inpatient template."
                    }
                  />
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((tmpl) => {
                const meds = parseMeds(tmpl)
                return (
                  <TableRow key={tmpl.id}>
                    <TableCell>
                      <Badge variant="secondary" className="font-mono text-xs">
                        {tmpl.code}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{tmpl.name}</div>
                      {/* Note: field is provisionDiagnosis — verified from old app */}
                      {tmpl.provisionDiagnosis && (
                        <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {tmpl.provisionDiagnosis}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm truncate max-w-[180px]">
                        {tmpl.operationName || (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {meds.length} medicine{meds.length !== 1 ? "s" : ""}
                      </div>
                      {meds.slice(0, 2).map((m, i) => (
                        <div key={i} className="text-xs text-muted-foreground truncate max-w-[160px]">
                          {m.name}
                        </div>
                      ))}
                      {meds.length > 2 && (
                        <div className="text-xs text-muted-foreground">+{meds.length - 2} more</div>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={tmpl.isActive ? "default" : "muted"}>
                        {tmpl.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    {canEdit && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => { setEditItem(tmpl); setDialogOpen(true) }}
                            aria-label={`Edit ${tmpl.name}`}
                          >
                            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteId(tmpl.id)}
                            className="text-destructive hover:bg-destructive/10"
                            aria-label={`Delete ${tmpl.name}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
        {!isLoading && filtered.length > 0 && (
          <div className="px-4 py-2 border-t border-border bg-muted/20">
            <span className="text-xs text-muted-foreground">
              {filtered.length} template{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>

      <InpatientFormDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditItem(null) }}
        existing={editItem ?? undefined}
      />

      <ConfirmationModal
        open={deleteId != null}
        onOpenChange={(v) => { if (!v) setDeleteId(null) }}
        variant="destructive"
        title="Delete inpatient template?"
        description="This template will be permanently deleted."
        confirmLabel="Delete"
        onConfirm={async () => {
          if (deleteId) {
            await deleteM.mutateAsync(deleteId)
            setDeleteId(null)
          }
        }}
        isLoading={deleteM.isPending}
      />
    </div>
  )
}

// ─── Inpatient Form Dialog ────────────────────────────────────────────────────

interface InpatientFormDialogProps {
  open: boolean
  onClose: () => void
  existing?: InpatientTemplate
}

const EMPTY_MED: InpatientTemplateMed = { name: "", days: "", timing: "", note: "" }

function InpatientFormDialog({ open, onClose, existing }: InpatientFormDialogProps) {
  const { data: medicineMasterList = [] } = useMedicineMaster()
  const medicineMasterNames = medicineMasterList.map((m) => m.name)

  const [code, setCode] = useState(existing?.code ?? "")
  const [name, setName] = useState(existing?.name ?? "")
  const [operationName, setOperationName] = useState(existing?.operationName ?? "")
  // Field is provisionDiagnosis (NOT provisionalDiagnosis) — verified from old app
  const [provisionDiagnosis, setProvisionDiagnosis] = useState(existing?.provisionDiagnosis ?? "")
  const [meds, setMeds] = useState<InpatientTemplateMed[]>(() => {
    try {
      const parsed = JSON.parse(existing?.medicines ?? "[]") as InpatientTemplateMed[]
      return parsed.length > 0 ? parsed : [{ ...EMPTY_MED }]
    } catch {
      return [{ ...EMPTY_MED }]
    }
  })
  const [followUpDays, setFollowUpDays] = useState(String(existing?.followUpDays ?? ""))
  const [additionalNotes, setAdditionalNotes] = useState(existing?.additionalNotes ?? "")
  const [errors, setErrors] = useState<Record<string, string>>({})

  const createM = useCreateInpatientTemplate(() => onClose())
  const updateM = useUpdateInpatientTemplate(existing?.id ?? "", () => onClose())

  function updateMed(i: number, field: keyof InpatientTemplateMed, v: string) {
    setMeds((prev) => prev.map((m, j) => (j === i ? { ...m, [field]: v } : m)))
  }

  async function handleSave() {
    const e: Record<string, string> = {}
    if (!code.trim()) e.code = "Template code is required"
    if (!name.trim()) e.name = "Template name is required"
    if (!meds.some((m) => m.name.trim())) e.medicines = "At least one medicine is required"
    if (Object.keys(e).length > 0) { setErrors(e); return }

    const cleanMeds = meds.filter((m) => m.name.trim())
    const payload = {
      code: code.trim(),
      name: name.trim(),
      operationName: operationName.trim() || undefined,
      provisionDiagnosis: provisionDiagnosis.trim() || undefined,
      medicines: JSON.stringify(cleanMeds),
      followUpDays: followUpDays.trim() ? parseInt(followUpDays.trim()) : undefined,
      additionalNotes: additionalNotes.trim() || undefined,
      isActive: true,
    }
    if (existing) {
      await updateM.mutateAsync(payload)
    } else {
      await createM.mutateAsync(payload)
    }
  }

  const isLoading = createM.isPending || updateM.isPending

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-3xl flex flex-col gap-0 p-0 max-h-[92vh]">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <DialogTitle>
            {existing ? "Edit Inpatient Template" : "Add Inpatient Template"}
          </DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          {/* Identity */}
          <div className="rounded-lg border border-border bg-muted/20 p-4 grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="it-code">
                Template Code <span className="text-destructive">*</span>
              </Label>
              <Input
                id="it-code"
                value={code}
                onChange={(e) => { setCode(e.target.value.toUpperCase()); setErrors((p) => ({ ...p, code: "" })) }}
                className={`mt-1 font-mono uppercase ${errors.code ? "border-destructive" : ""}`}
                placeholder="e.g. CAT-001"
              />
              {errors.code && <p className="text-xs text-destructive mt-1">{errors.code}</p>}
            </div>
            <div>
              <Label htmlFor="it-name">
                Template Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="it-name"
                value={name}
                onChange={(e) => { setName(e.target.value); setErrors((p) => ({ ...p, name: "" })) }}
                className={`mt-1 ${errors.name ? "border-destructive" : ""}`}
                placeholder="e.g. Cataract Surgery"
              />
              {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
            </div>
          </div>

          {/* Operation details */}
          <div className="rounded-lg border border-border bg-muted/20 p-4 grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="it-op">Operation Name</Label>
              <Input
                id="it-op"
                value={operationName}
                onChange={(e) => setOperationName(e.target.value)}
                className="mt-1"
                placeholder="e.g. Phaco + IOL"
              />
            </div>
            <div>
              <Label htmlFor="it-diag">Provisional Diagnosis</Label>
              <Input
                id="it-diag"
                value={provisionDiagnosis}
                onChange={(e) => setProvisionDiagnosis(e.target.value)}
                className="mt-1"
                placeholder="e.g. Cataract - RE"
              />
            </div>
          </div>

          {/* Medicines */}
          <div className="rounded-lg border border-border bg-muted/20">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div>
                <p className="text-sm font-medium">
                  Discharge Medicines <span className="text-destructive">*</span>
                </p>
                {errors.medicines && (
                  <p className="text-xs text-destructive">{errors.medicines}</p>
                )}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setMeds((prev) => [...prev, { ...EMPTY_MED }])}
                className="h-7 text-xs"
              >
                + Add Medicine
              </Button>
            </div>
            <div className="p-3 space-y-3">
              {meds.map((med, i) => (
                <div key={i} className="space-y-1.5">
                  <p className="text-xs text-muted-foreground font-medium">Medicine {i + 1}</p>
                  <div className="grid grid-cols-[2fr_1fr_1fr_32px] gap-2 items-center">
                    <Input
                      value={med.name}
                      onChange={(e) => updateMed(i, "name", e.target.value)}
                      placeholder="Medicine name"
                      list={`ipt-med-names-${i}`}
                    />
                    <datalist id={`ipt-med-names-${i}`}>
                      {medicineMasterNames.map((n) => <option key={n} value={n} />)}
                    </datalist>
                    <Select
                      value={med.days || "__none__"}
                      onValueChange={(v) => updateMed(i, "days", v === "__none__" ? "" : v)}
                    >
                      <SelectTrigger className="text-sm" aria-label="Days">
                        <SelectValue placeholder="Days" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">—</SelectItem>
                        {PRESCRIPTION_DAYS.map((d) => (
                          <SelectItem key={d} value={d}>
                            {d === "Continuous" ? "Continuous" : `${d} days`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={med.timing || "__none__"}
                      onValueChange={(v) => updateMed(i, "timing", v === "__none__" ? "" : v)}
                    >
                      <SelectTrigger className="text-sm" aria-label="Timing">
                        <SelectValue placeholder="Timing" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">—</SelectItem>
                        {PRESCRIPTION_TIMINGS.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <button
                      type="button"
                      onClick={() =>
                        setMeds((prev) => (prev.length > 1 ? prev.filter((_, j) => j !== i) : prev))
                      }
                      disabled={meds.length === 1}
                      className="flex items-center justify-center w-8 h-8 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 disabled:opacity-30"
                      aria-label={`Remove medicine ${i + 1}`}
                    >
                      ×
                    </button>
                  </div>
                  <Input
                    value={med.note}
                    onChange={(e) => updateMed(i, "note", e.target.value)}
                    placeholder="Note: After food, shake well..."
                    className="text-sm text-muted-foreground"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Follow-up & notes */}
          <div className="rounded-lg border border-border bg-muted/20 p-4 grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="it-followup">Follow-up (days)</Label>
              <Input
                id="it-followup"
                type="number"
                value={followUpDays}
                onChange={(e) => setFollowUpDays(e.target.value)}
                className="mt-1"
                placeholder="e.g. 7"
                min={1}
              />
            </div>
            <div>
              <Label htmlFor="it-notes">Additional Notes</Label>
              <Input
                id="it-notes"
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                className="mt-1"
                placeholder="Any additional instructions..."
              />
            </div>
          </div>
        </div>
        <DialogFooter className="px-6 py-4 border-t border-border">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={() => void handleSave()} disabled={isLoading}>
            {isLoading ? "Saving..." : existing ? "Update Template" : "Create Template"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
