/**
 * DischargesSection — CRUD for /settings/discharges.
 * Permission: settings:view (read) / settings:edit (write)
 *
 * Field shapes verified from:
 * - supabase/functions/settings/types.ts PredefinedDischargeSchema
 * - old app SettingsPage.tsx DischargeRow type + DischargeFormDialog
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
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import { ConfirmationModal, ErrorState, EmptyState, PageToolbar } from "@/components/patterns"
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
  const { data: discharges = [], isLoading, error, refetch } = useDischarges()
  const [search, setSearch] = useState("")
  const [showInactive, setShowInactive] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editItem, setEditItem] = useState<PredefinedDischarge | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteName, setDeleteName] = useState("")

  const deleteM = useDeleteDischarge()

  const filtered = discharges.filter((d) => {
    if (!showInactive && !d.isActive) return false
    if (!search) return true
    return d.name.toLowerCase().includes(search.toLowerCase())
  })

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
      <PageToolbar>
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
      </PageToolbar>

      <div className="rounded-[var(--radius-lg)] bg-[var(--color-card)] shadow-[var(--shadow-card)] overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="w-48">Name</TableHead>
              <TableHead>Condition</TableHead>
              <TableHead>Discharge Diagnosis</TableHead>
              <TableHead>Follow-up Instructions</TableHead>
              <TableHead className="text-center">Status</TableHead>
              {canEdit && <TableHead className="text-right">Actions</TableHead>}
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
              filtered.map((d) => (
                <TableRow key={d.id} className={d.isActive === false ? "opacity-60" : ""}>
                  <TableCell className="font-medium">{d.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {d.conditionAtDischarge || "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[220px] truncate">
                    {d.dischargeDiagnosis || "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                    {d.followUpInstructions ? d.followUpInstructions.split("\n")[0] : "—"}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={d.isActive !== false ? "default" : "muted"}>
                      {d.isActive !== false ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  {canEdit && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setEditItem(d); setDialogOpen(true) }}
                          aria-label={`Edit ${d.name}`}
                        >
                          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setDeleteId(d.id); setDeleteName(d.name) }}
                          className="text-destructive hover:bg-destructive/10"
                          aria-label={`Delete ${d.name}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
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
