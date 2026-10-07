/**
 * SurgeriesSection — CRUD for /settings/surgeries.
 * Permission: settings:view (read) / settings:edit (write)
 *
 * Field shapes verified from:
 * - supabase/functions/settings/types.ts PredefinedSurgerySchema
 * - old app SettingsPage.tsx SurgeryRow type + SurgeryFormDialog
 *
 * Note: `doctorNames` and `onDutyDoctors` are JSON-encoded strings from API
 * (old app uses JSON.parse on them).
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
import { ConfirmationModal, ErrorState, EmptyState } from "@/components/patterns"
import {
  useSurgeries,
  useCreateSurgery,
  useUpdateSurgery,
  useDeleteSurgery,
} from "./hooks"
import type { PredefinedSurgery } from "./types"

interface SurgeriesSectionProps {
  canEdit: boolean
}

export function SurgeriesSection({ canEdit }: SurgeriesSectionProps) {
  const { data: surgeries = [], isLoading, error, refetch } = useSurgeries()
  const [search, setSearch] = useState("")
  const [showInactive, setShowInactive] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editItem, setEditItem] = useState<PredefinedSurgery | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteName, setDeleteName] = useState("")

  const deleteM = useDeleteSurgery()

  const filtered = surgeries.filter((s) => {
    if (!showInactive && !s.isActive) return false
    if (!search) return true
    const q = search.toLowerCase()
    return (
      s.name.toLowerCase().includes(q) ||
      (s.department?.toLowerCase().includes(q) ?? false)
    )
  })

  function parseDoctors(s: PredefinedSurgery): string[] {
    try {
      return JSON.parse(s.doctorNames ?? "[]") as string[]
    } catch {
      return []
    }
  }

  function parseOnDuty(s: PredefinedSurgery): string[] {
    try {
      return JSON.parse(s.onDutyDoctors ?? "[]") as string[]
    } catch {
      return []
    }
  }

  if (error) {
    return (
      <ErrorState
        title="Could not load surgery templates"
        error={error}
        onRetry={() => void refetch()}
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <Input
          placeholder="Search surgeries..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-52 h-9"
          aria-label="Search surgery templates"
        />
        <label className="flex items-center gap-1.5 text-sm text-muted-foreground cursor-pointer">
          <Checkbox
            checked={showInactive}
            onCheckedChange={(v) => setShowInactive(v === true)}
            aria-label="Show inactive surgeries"
          />
          Show inactive
        </label>
        <div className="flex-1" />
        {canEdit && (
          <Button size="sm" className="h-9" onClick={() => { setEditItem(null); setDialogOpen(true) }}>
            <Plus className="h-4 w-4 mr-1" aria-hidden="true" />
            Add Surgery
          </Button>
        )}
      </div>

      <div className="rounded-[var(--radius-lg)] bg-[var(--color-card)] shadow-[var(--shadow-card)] overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead>Operation Name</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Doctors</TableHead>
              <TableHead>On-Duty</TableHead>
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
                    title="No surgery templates"
                    description={
                      search ? "No surgeries match your search." : "Create your first surgery template."
                    }
                  />
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((s) => {
                const doctors = parseDoctors(s)
                const onDuty = parseOnDuty(s)
                return (
                  <TableRow key={s.id} className={s.isActive === false ? "opacity-60" : ""}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {s.department || "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {doctors.length > 0 ? doctors.join(", ") : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {onDuty.length > 0 ? onDuty.join(", ") : "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={s.isActive !== false ? "default" : "muted"}>
                        {s.isActive !== false ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    {canEdit && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => { setEditItem(s); setDialogOpen(true) }}
                            aria-label={`Edit ${s.name}`}
                          >
                            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => { setDeleteId(s.id); setDeleteName(s.name) }}
                            className="text-destructive hover:bg-destructive/10"
                            aria-label={`Delete ${s.name}`}
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
      </div>

      <SurgeryDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditItem(null) }}
        existing={editItem ?? undefined}
      />

      <ConfirmationModal
        open={deleteId != null}
        onOpenChange={(v) => { if (!v) { setDeleteId(null); setDeleteName("") } }}
        variant="destructive"
        title="Delete surgery template?"
        description={`"${deleteName}" will be soft-deleted. Existing inpatient records are not affected.`}
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

// ─── Surgery Dialog ───────────────────────────────────────────────────────────

interface SurgeryDialogProps {
  open: boolean
  onClose: () => void
  existing?: PredefinedSurgery
}

function SurgeryDialog({ open, onClose, existing }: SurgeryDialogProps) {
  const [name, setName] = useState(existing?.name ?? "")
  const [department, setDepartment] = useState(existing?.department ?? "")
  const [doctorNames, setDoctorNames] = useState<string[]>(() => {
    try { return (JSON.parse(existing?.doctorNames ?? "[]") as string[]) }
    catch { return [""] }
  })
  const [onDutyDoctors, setOnDutyDoctors] = useState<string[]>(() => {
    try { return (JSON.parse(existing?.onDutyDoctors ?? "[]") as string[]) }
    catch { return [""] }
  })
  const [provisionDiagnosis, setProvisionDiagnosis] = useState(existing?.provisionDiagnosis ?? "")
  const [operationProcedure, setOperationProcedure] = useState(existing?.operationProcedure ?? "")
  const [operationDetails, setOperationDetails] = useState(existing?.operationDetails ?? "")

  const createM = useCreateSurgery(() => onClose())
  const updateM = useUpdateSurgery(existing?.id ?? "", () => onClose())

  function updateRow(rows: string[], setter: (v: string[]) => void, i: number, v: string) {
    setter(rows.map((x, j) => (j === i ? v : x)))
  }

  async function handleSave() {
    if (!name.trim()) return
    const payload = {
      name: name.trim(),
      department: department.trim() || undefined,
      doctorNames: JSON.stringify(doctorNames.map((d) => d.trim()).filter(Boolean)),
      onDutyDoctors: JSON.stringify(onDutyDoctors.map((d) => d.trim()).filter(Boolean)),
      provisionDiagnosis: provisionDiagnosis.trim() || undefined,
      operationProcedure: operationProcedure.trim() || undefined,
      operationDetails: operationDetails.trim() || undefined,
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
          <DialogTitle>{existing ? "Edit Surgery Template" : "Add Surgery Template"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-1">
          <div>
            <Label htmlFor="surg-name">
              Operation Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="surg-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Phacoemulsification + IOL"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="surg-dept">Department</Label>
            <Input
              id="surg-dept"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="e.g. Ophthalmology"
              className="mt-1"
            />
          </div>

          {/* Doctor names */}
          <div>
            <Label>Doctor Names</Label>
            <div className="space-y-2 mt-1">
              {doctorNames.map((d, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    value={d}
                    onChange={(e) => updateRow(doctorNames, setDoctorNames, i, e.target.value)}
                    placeholder={`Doctor ${i + 1}`}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setDoctorNames((prev) =>
                        prev.length > 1 ? prev.filter((_, j) => j !== i) : prev,
                      )
                    }
                    disabled={doctorNames.length === 1}
                    aria-label={`Remove doctor ${i + 1}`}
                  >
                    −
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDoctorNames((prev) => [...prev, ""])}
              >
                + Add doctor
              </Button>
            </div>
          </div>

          {/* On-duty doctors */}
          <div>
            <Label>On-Duty Doctors</Label>
            <div className="space-y-2 mt-1">
              {onDutyDoctors.map((d, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    value={d}
                    onChange={(e) => updateRow(onDutyDoctors, setOnDutyDoctors, i, e.target.value)}
                    placeholder={`On-duty doctor ${i + 1}`}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setOnDutyDoctors((prev) =>
                        prev.length > 1 ? prev.filter((_, j) => j !== i) : prev,
                      )
                    }
                    disabled={onDutyDoctors.length === 1}
                    aria-label={`Remove on-duty doctor ${i + 1}`}
                  >
                    −
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setOnDutyDoctors((prev) => [...prev, ""])}
              >
                + Add on-duty doctor
              </Button>
            </div>
          </div>

          <div>
            <Label htmlFor="surg-diag">Provision Diagnosis</Label>
            <Input
              id="surg-diag"
              value={provisionDiagnosis}
              onChange={(e) => setProvisionDiagnosis(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="surg-proc">Operation Procedure</Label>
            <Textarea
              id="surg-proc"
              value={operationProcedure}
              onChange={(e) => setOperationProcedure(e.target.value)}
              rows={3}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="surg-details">Operation Details</Label>
            <Textarea
              id="surg-details"
              value={operationDetails}
              onChange={(e) => setOperationDetails(e.target.value)}
              rows={3}
              className="mt-1"
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
            {isLoading ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
