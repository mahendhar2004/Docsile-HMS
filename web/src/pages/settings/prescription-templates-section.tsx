/**
 * PrescriptionTemplatesSection — CRUD for /settings/prescription-templates.
 * Permission: settings:view (read) / settings:edit (write)
 *
 * Field shapes verified from:
 * - supabase/functions/settings/types.ts PredefinedTemplateSchema
 * - old app SettingsPage.tsx PrescriptionTemplateRow + PrescriptionFormDialog
 */

import { useState, useEffect } from "react"
import { Plus } from "lucide-react"
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
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import { ConfirmationModal, ErrorState, EmptyState } from "@/components/patterns"
import {
  usePrescriptionTemplates,
  useCreatePrescriptionTemplate,
  useUpdatePrescriptionTemplate,
  useTogglePrescriptionTemplateActive,
  useDeletePrescriptionTemplate,
  useMedicineMaster,
} from "./hooks"
import {
  PRESCRIPTION_TIMINGS,
  PRESCRIPTION_DAYS,
  type PrescriptionTemplate,
  type PrescriptionTemplateMed,
} from "./types"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface PrescriptionTemplatesSectionProps {
  canEdit: boolean
}

export function PrescriptionTemplatesSection({ canEdit }: PrescriptionTemplatesSectionProps) {
  const [search, setSearch] = useState("")
  const [showInactive, setShowInactive] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editItem, setEditItem] = useState<PrescriptionTemplate | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  // `showInactive` is a real server-side param now — see
  // service-templates-section.tsx for why a client-side filter alone can't
  // work (the backend used to unconditionally exclude inactive rows).
  const { data: templates = [], isLoading, error, refetch } = usePrescriptionTemplates(showInactive)

  const toggleActiveM = useTogglePrescriptionTemplateActive()
  const deleteM = useDeletePrescriptionTemplate()

  const filtered = templates.filter((t) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      t.code.toLowerCase().includes(q) ||
      t.name.toLowerCase().includes(q) ||
      (t.provisionalDiagnosis?.toLowerCase().includes(q) ?? false)
    )
  })

  function parseMeds(t: PrescriptionTemplate): PrescriptionTemplateMed[] {
    try {
      return JSON.parse(t.medicines ?? "[]") as PrescriptionTemplateMed[]
    } catch {
      return []
    }
  }

  if (error) {
    return (
      <ErrorState
        title="Could not load prescription templates"
        error={error}
        onRetry={() => void refetch()}
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <Input
          placeholder="Search by code, name or diagnosis..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-72 h-9"
          aria-label="Search prescription templates"
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
              <TableHead>Diagnosis</TableHead>
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
                    title="No prescription templates"
                    description={
                      search ? "No templates match your search." : "Create your first prescription template."
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
                      {tmpl.presentComplaint && (
                        <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {tmpl.presentComplaint}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm truncate max-w-[180px]">
                        {tmpl.provisionalDiagnosis || (
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
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground"
                            onClick={() =>
                              toggleActiveM.mutate({ id: tmpl.id, isActive: !tmpl.isActive })
                            }
                          >
                            {tmpl.isActive ? "Deactivate" : "Activate"}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteId(tmpl.id)}
                            className="text-destructive hover:bg-destructive/10"
                          >
                            Delete
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

      <PrescriptionFormDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditItem(null) }}
        existing={editItem ?? undefined}
      />

      <ConfirmationModal
        open={deleteId != null}
        onOpenChange={(v) => { if (!v) setDeleteId(null) }}
        variant="destructive"
        title="Delete prescription template?"
        description="This template will be permanently deleted and cannot be recovered."
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

// ─── Prescription Form Dialog ─────────────────────────────────────────────────

interface PrescriptionFormDialogProps {
  open: boolean
  onClose: () => void
  existing?: PrescriptionTemplate
}

const EMPTY_MED: PrescriptionTemplateMed = { name: "", days: "", timing: "", note: "" }

function PrescriptionFormDialog({ open, onClose, existing }: PrescriptionFormDialogProps) {
  const { data: medicineMasterList = [] } = useMedicineMaster()
  const medicineMasterNames = medicineMasterList.map((m) => m.name)

  const [code, setCode] = useState(existing?.code ?? "")
  const [name, setName] = useState(existing?.name ?? "")
  const [presentComplaint, setPresentComplaint] = useState(existing?.presentComplaint ?? "")
  const [previousHistory, setPreviousHistory] = useState(existing?.previousHistory ?? "")
  const [provisionalDiagnosis, setProvisionalDiagnosis] = useState(existing?.provisionalDiagnosis ?? "")
  const [meds, setMeds] = useState<PrescriptionTemplateMed[]>(() => {
    try {
      const parsed = JSON.parse(existing?.medicines ?? "[]") as PrescriptionTemplateMed[]
      return parsed.length > 0 ? parsed : [{ ...EMPTY_MED }]
    } catch {
      return [{ ...EMPTY_MED }]
    }
  })
  const [investigations, setInvestigations] = useState<string[]>(() => {
    try {
      const parsed = JSON.parse(existing?.investigations ?? "[]") as string[]
      return parsed.length > 0 ? parsed : [""]
    } catch {
      return [""]
    }
  })
  const [followUpDays, setFollowUpDays] = useState(String(existing?.followUpDays ?? ""))
  const [additionalNotes, setAdditionalNotes] = useState(existing?.additionalNotes ?? "")
  const [errors, setErrors] = useState<Record<string, string>>({})

  const createM = useCreatePrescriptionTemplate(() => onClose())
  const updateM = useUpdatePrescriptionTemplate(existing?.id ?? "", () => onClose())

  // Reset when opening — this dialog is mounted once and kept alive (only
  // `open` toggles visibility), so the useState initializers above only
  // seed the very first render (same bug found and fixed in
  // service-templates-section.tsx).
  useEffect(() => {
    if (open) {
      setCode(existing?.code ?? "")
      setName(existing?.name ?? "")
      setPresentComplaint(existing?.presentComplaint ?? "")
      setPreviousHistory(existing?.previousHistory ?? "")
      setProvisionalDiagnosis(existing?.provisionalDiagnosis ?? "")
      try {
        const parsed = JSON.parse(existing?.medicines ?? "[]") as PrescriptionTemplateMed[]
        setMeds(parsed.length > 0 ? parsed : [{ ...EMPTY_MED }])
      } catch {
        setMeds([{ ...EMPTY_MED }])
      }
      try {
        const parsed = JSON.parse(existing?.investigations ?? "[]") as string[]
        setInvestigations(parsed.length > 0 ? parsed : [""])
      } catch {
        setInvestigations([""])
      }
      setFollowUpDays(String(existing?.followUpDays ?? ""))
      setAdditionalNotes(existing?.additionalNotes ?? "")
      setErrors({})
    }
  }, [open, existing])

  function updateMed(i: number, field: keyof PrescriptionTemplateMed, v: string) {
    setMeds((prev) => prev.map((m, j) => (j === i ? { ...m, [field]: v } : m)))
  }

  function addMed() {
    setMeds((prev) => [...prev, { ...EMPTY_MED }])
  }

  function removeMed(i: number) {
    if (meds.length > 1) setMeds((prev) => prev.filter((_, j) => j !== i))
  }

  function updateInv(i: number, v: string) {
    setInvestigations((prev) => prev.map((x, j) => (j === i ? v : x)))
  }

  async function handleSave() {
    const e: Record<string, string> = {}
    if (!code.trim()) e.code = "Template code is required"
    if (!name.trim()) e.name = "Template name is required"
    if (!meds.some((m) => m.name.trim())) e.medicines = "At least one medicine is required"
    if (Object.keys(e).length > 0) { setErrors(e); return }

    const cleanMeds = meds.filter((m) => m.name.trim())
    const cleanInvs = investigations.filter((i) => i.trim())
    const payload = {
      code: code.trim(),
      name: name.trim(),
      presentComplaint: presentComplaint.trim() || undefined,
      previousHistory: previousHistory.trim() || undefined,
      provisionalDiagnosis: provisionalDiagnosis.trim() || undefined,
      medicines: JSON.stringify(cleanMeds),
      investigations: JSON.stringify(cleanInvs),
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
            {existing ? "Edit Prescription Template" : "Add Prescription Template"}
          </DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          {/* Identity */}
          <div className="rounded-lg border border-border bg-muted/20 p-4 grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="pt-code">
                Template Code <span className="text-destructive">*</span>
              </Label>
              <Input
                id="pt-code"
                value={code}
                onChange={(e) => { setCode(e.target.value.toUpperCase()); setErrors((p) => ({ ...p, code: "" })) }}
                className={`mt-1 font-mono uppercase ${errors.code ? "border-destructive" : ""}`}
                placeholder="e.g. CONJ-001"
              />
              {errors.code && <p className="text-xs text-destructive mt-1">{errors.code}</p>}
            </div>
            <div>
              <Label htmlFor="pt-name">
                Template Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="pt-name"
                value={name}
                onChange={(e) => { setName(e.target.value); setErrors((p) => ({ ...p, name: "" })) }}
                className={`mt-1 ${errors.name ? "border-destructive" : ""}`}
                placeholder="e.g. Conjunctivitis Treatment"
              />
              {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
            </div>
          </div>

          {/* Clinical notes */}
          <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
            <p className="text-sm font-medium">Clinical Notes</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="pt-complaint">Present Complaint</Label>
                <Textarea
                  id="pt-complaint"
                  value={presentComplaint}
                  onChange={(e) => setPresentComplaint(e.target.value)}
                  rows={2}
                  className="mt-1"
                  placeholder="e.g. Redness, itching, watering"
                />
              </div>
              <div>
                <Label htmlFor="pt-history">Previous History</Label>
                <Textarea
                  id="pt-history"
                  value={previousHistory}
                  onChange={(e) => setPreviousHistory(e.target.value)}
                  rows={2}
                  className="mt-1"
                  placeholder="e.g. Operated eye, Diabetic"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="pt-diagnosis">Provisional Diagnosis</Label>
              <Input
                id="pt-diagnosis"
                value={provisionalDiagnosis}
                onChange={(e) => setProvisionalDiagnosis(e.target.value)}
                className="mt-1"
                placeholder="e.g. Acute Conjunctivitis"
              />
            </div>
          </div>

          {/* Medicines */}
          <div className="rounded-lg border border-border bg-muted/20">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div>
                <p className="text-sm font-medium">
                  Medicines <span className="text-destructive">*</span>
                </p>
                {errors.medicines && (
                  <p className="text-xs text-destructive">{errors.medicines}</p>
                )}
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addMed} className="h-7 text-xs">
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
                      list={`med-names-${i}`}
                    />
                    <datalist id={`med-names-${i}`}>
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
                      onClick={() => removeMed(i)}
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

          {/* Investigations/Advice */}
          <div className="rounded-lg border border-border bg-muted/20">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <p className="text-sm font-medium">Investigations / Advice</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setInvestigations((prev) => [...prev, ""])}
                className="h-7 text-xs"
              >
                + Add
              </Button>
            </div>
            <div className="p-3 space-y-2">
              {investigations.map((inv, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <Input
                    value={inv}
                    onChange={(e) => updateInv(i, e.target.value)}
                    placeholder="Investigation or advice..."
                    className="flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => setInvestigations((prev) => prev.filter((_, j) => j !== i))}
                    disabled={investigations.length === 1}
                    className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-destructive disabled:opacity-30"
                    aria-label={`Remove item ${i + 1}`}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Follow-up & Notes */}
          <div className="rounded-lg border border-border bg-muted/20 p-4 grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="pt-followup">Follow-up (days)</Label>
              <Input
                id="pt-followup"
                type="number"
                value={followUpDays}
                onChange={(e) => setFollowUpDays(e.target.value)}
                className="mt-1"
                placeholder="e.g. 7"
                min={1}
              />
            </div>
            <div>
              <Label htmlFor="pt-notes">Additional Notes</Label>
              <Input
                id="pt-notes"
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
