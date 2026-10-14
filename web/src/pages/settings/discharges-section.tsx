/**
 * DischargesSection — CRUD for /settings/discharges.
 * Permission: settings:view (read) / settings:edit (write)
 *
 * Field shapes verified from:
 * - supabase/functions/settings/types.ts PredefinedDischargeSchema
 * - old app SettingsPage.tsx DischargeRow type + DischargeFormDialog
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
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import { ConfirmationModal, ErrorState, EmptyState } from "@/components/patterns"
import {
  useDischarges,
  useCreateDischarge,
  useUpdateDischarge,
  useDeleteDischarge,
} from "./hooks"
import type { PredefinedDischarge } from "./types"

interface DischargesSectionProps {
  canEdit: boolean
}

export function DischargesSection({ canEdit }: DischargesSectionProps) {
  const [search, setSearch] = useState("")
  const [showInactive, setShowInactive] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editItem, setEditItem] = useState<PredefinedDischarge | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteName, setDeleteName] = useState("")

  // `showInactive` is a real server-side param now — see
  // service-templates-section.tsx for why a client-side filter alone can't
  // work (the backend used to unconditionally exclude inactive rows). Note:
  // main's own Discharges tab has no reactivate button at all — "Delete"
  // here is a one-way soft-delete (isActive=false), matching main exactly.
  const { data: discharges = [], isLoading, error, refetch } = useDischarges(showInactive)

  const deleteM = useDeleteDischarge()

  const filtered = discharges.filter((d) => {
    if (!search) return true
    return d.name.toLowerCase().includes(search.toLowerCase())
  })

  function medicationCount(d: PredefinedDischarge): number {
    try {
      const parsed: unknown = JSON.parse(d.dischargeMedications ?? "[]")
      if (!Array.isArray(parsed)) return 0
      return parsed.filter((r: { medicine?: string }) => r.medicine?.trim()).length
    } catch {
      return 0
    }
  }

  if (error) {
    return (
      <ErrorState
        title="Could not load discharge templates"
        error={error}
        onRetry={() => void refetch()}
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <Input
          placeholder="Search discharge templates..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-52 h-9"
          aria-label="Search discharge templates"
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
            Add Discharge Template
          </Button>
        )}
      </div>

      <div className="rounded-[var(--radius-lg)] bg-[var(--color-card)] shadow-[var(--shadow-card)] overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="w-48">Name</TableHead>
              <TableHead className="w-28">Condition</TableHead>
              <TableHead>Discharge Diagnosis</TableHead>
              <TableHead>Prescription</TableHead>
              <TableHead className="w-28">Follow-up</TableHead>
              {canEdit && <TableHead className="w-28 text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
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
                    title="No discharge templates"
                    description={
                      search ? "No templates match your search." : "Create your first discharge template."
                    }
                  />
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((d) => {
                const rxCount = medicationCount(d)
                return (
                  <TableRow key={d.id} className={d.isActive === false ? "opacity-50" : ""}>
                    <TableCell className="font-medium">{d.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {d.conditionAtDischarge || "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[260px] truncate">
                      {d.dischargeDiagnosis || "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {rxCount > 0 ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-primary bg-primary/8 px-2 py-0.5 rounded-full">
                          {rxCount} med{rxCount !== 1 ? "s" : ""}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground truncate max-w-[180px]">
                      {d.followUpInstructions ? d.followUpInstructions.split("\n")[0] : "—"}
                    </TableCell>
                    {canEdit && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => { setEditItem(d); setDialogOpen(true) }}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => { setDeleteId(d.id); setDeleteName(d.name) }}
                            className="text-destructive"
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
      </div>

      <DischargeDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditItem(null) }}
        existing={editItem ?? undefined}
      />

      <ConfirmationModal
        open={deleteId != null}
        onOpenChange={(v) => { if (!v) { setDeleteId(null); setDeleteName("") } }}
        variant="destructive"
        title="Delete discharge template?"
        description={`"${deleteName}" will be soft-deleted.`}
        confirmLabel="Delete"
        onConfirm={async () => {
          if (deleteId) {
            await deleteM.mutateAsync(deleteId)
            setDeleteId(null)
            setDeleteName("")
          }
        }}
        isLoading={deleteM.isPending}
      />
    </div>
  )
}

// ─── Discharge Dialog ─────────────────────────────────────────────────────────

interface DischargeDialogProps {
  open: boolean
  onClose: () => void
  existing?: PredefinedDischarge
}

function DischargeDialog({ open, onClose, existing }: DischargeDialogProps) {
  const [name, setName] = useState(existing?.name ?? "")
  const [dischargeDiagnosis, setDischargeDiagnosis] = useState(existing?.dischargeDiagnosis ?? "")
  const [conditionAtDischarge, setConditionAtDischarge] = useState(existing?.conditionAtDischarge ?? "")
  const [dischargeMedications, setDischargeMedications] = useState(existing?.dischargeMedications ?? "")
  const [followUpInstructions, setFollowUpInstructions] = useState(existing?.followUpInstructions ?? "")

  const createM = useCreateDischarge(() => onClose())
  const updateM = useUpdateDischarge(existing?.id ?? "", () => onClose())

  // Reset when opening — this dialog is mounted once and kept alive (only
  // `open` toggles visibility), so the useState initializers above only
  // seed the very first render. Without this, reopening for "Add" after an
  // edit (or editing a different row) left every field showing whatever was
  // last loaded/typed (same bug found and fixed in service-templates-section.tsx).
  useEffect(() => {
    if (open) {
      setName(existing?.name ?? "")
      setDischargeDiagnosis(existing?.dischargeDiagnosis ?? "")
      setConditionAtDischarge(existing?.conditionAtDischarge ?? "")
      setDischargeMedications(existing?.dischargeMedications ?? "")
      setFollowUpInstructions(existing?.followUpInstructions ?? "")
    }
  }, [open, existing])

  async function handleSave() {
    if (!name.trim()) return
    const payload = {
      name: name.trim(),
      dischargeDiagnosis: dischargeDiagnosis.trim() || undefined,
      conditionAtDischarge: conditionAtDischarge.trim() || undefined,
      dischargeMedications: dischargeMedications.trim() || undefined,
      followUpInstructions: followUpInstructions.trim() || undefined,
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {existing ? "Edit Discharge Template" : "Add Discharge Template"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-1">
          <div>
            <Label htmlFor="disch-name">
              Template Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="disch-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Post-Cataract Surgery Discharge"
              className="mt-1"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="disch-diag">Discharge Diagnosis</Label>
              <Input
                id="disch-diag"
                value={dischargeDiagnosis}
                onChange={(e) => setDischargeDiagnosis(e.target.value)}
                placeholder="e.g. Cataract RE post Phaco + IOL"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="disch-condition">Condition at Discharge</Label>
              <Input
                id="disch-condition"
                value={conditionAtDischarge}
                onChange={(e) => setConditionAtDischarge(e.target.value)}
                placeholder="e.g. Stable, Vision improving"
                className="mt-1"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="disch-meds">Discharge Medications</Label>
            <Textarea
              id="disch-meds"
              value={dischargeMedications}
              onChange={(e) => setDischargeMedications(e.target.value)}
              rows={4}
              className="mt-1"
              placeholder="List discharge medications and instructions..."
            />
          </div>
          <div>
            <Label htmlFor="disch-followup">Follow-up Instructions</Label>
            <Textarea
              id="disch-followup"
              value={followUpInstructions}
              onChange={(e) => setFollowUpInstructions(e.target.value)}
              rows={3}
              className="mt-1"
              placeholder="Review after 1 week, avoid eye rubbing..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={() => void handleSave()}
            disabled={isLoading || !name.trim()}
          >
            {isLoading ? "Saving..." : existing ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
