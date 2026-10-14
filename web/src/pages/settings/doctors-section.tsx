/**
 * DoctorsSection — CRUD for /settings/doctors.
 * Permission: settings:view (read) / settings:edit (write)
 *
 * Net-new master entity (migration 20260922070000) — before this, "doctor
 * name" was only ever a free-text DropdownOption(fieldName="doctorName")
 * value with no real ID, department, specialization, fee, or phone. This
 * tab is the single place to manage the real Doctor roster used by every
 * "doctor name" picker app-wide (Patient Registration, IPD Admission,
 * Predefined Surgeries).
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
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import { ConfirmationModal, ErrorState, EmptyState } from "@/components/patterns"
import {
  useDoctors,
  useCreateDoctor,
  useUpdateDoctor,
  useToggleDoctorActive,
  useDeleteDoctor,
} from "./hooks"
import type { Doctor } from "./types"

interface DoctorsSectionProps {
  canEdit: boolean
}

export function DoctorsSection({ canEdit }: DoctorsSectionProps) {
  const [search, setSearch] = useState("")
  const [showInactive, setShowInactive] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editItem, setEditItem] = useState<Doctor | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteName, setDeleteName] = useState("")

  const { data: doctors = [], isLoading, error, refetch } = useDoctors(showInactive)

  const toggleActiveM = useToggleDoctorActive()
  const deleteM = useDeleteDoctor()

  const filtered = doctors.filter((d) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      d.name.toLowerCase().includes(q) ||
      (d.department?.toLowerCase().includes(q) ?? false) ||
      (d.specialization?.toLowerCase().includes(q) ?? false)
    )
  })

  function openCreate() {
    setEditItem(null)
    setDialogOpen(true)
  }

  function openEdit(d: Doctor) {
    setEditItem(d)
    setDialogOpen(true)
  }

  if (error) {
    return (
      <ErrorState
        title="Could not load doctors"
        error={error}
        onRetry={() => void refetch()}
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <Input
          placeholder="Search doctors..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-52 h-9"
          aria-label="Search doctors"
        />
        <label className="flex items-center gap-1.5 text-sm text-muted-foreground cursor-pointer">
          <Checkbox
            checked={showInactive}
            onCheckedChange={(v) => setShowInactive(v === true)}
            aria-label="Show inactive doctors"
          />
          Show inactive
        </label>
        <div className="flex-1" />
        {canEdit && (
          <Button size="sm" className="h-9" onClick={openCreate} aria-label="Add doctor">
            <Plus className="h-4 w-4 mr-1" aria-hidden="true" />
            Add Doctor
          </Button>
        )}
      </div>

      <div className="rounded-[var(--radius-lg)] bg-[var(--color-card)] shadow-[var(--shadow-card)] overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead>Name</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Specialization</TableHead>
              <TableHead className="text-right">Consultation Fee (₹)</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead className="text-center">Status</TableHead>
              {canEdit && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: canEdit ? 7 : 6 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={canEdit ? 7 : 6} className="py-12">
                  <EmptyState
                    title="No doctors yet"
                    description={
                      search ? "No doctors match your search." : "Add your first doctor."
                    }
                  />
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell>
                    <div className="font-medium">{doc.name}</div>
                  </TableCell>
                  <TableCell>
                    {doc.department || <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell>
                    {doc.specialization || <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-right">
                    {doc.consultationFee != null ? (
                      `₹${doc.consultationFee.toLocaleString("en-IN")}`
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {doc.phone || <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={doc.isActive ? "default" : "muted"}>
                      {doc.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  {canEdit && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(doc)}>
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground"
                          onClick={() =>
                            toggleActiveM.mutate({ id: doc.id, isActive: !doc.isActive })
                          }
                        >
                          {doc.isActive ? "Deactivate" : "Activate"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setDeleteId(doc.id)
                            setDeleteName(doc.name)
                          }}
                          className="text-destructive hover:bg-destructive/10"
                        >
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {!isLoading && filtered.length > 0 && (
          <div className="px-4 py-2 border-t border-border bg-muted/20">
            <span className="text-xs text-muted-foreground">
              {filtered.length} doctor{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>

      <DoctorFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        existing={editItem ?? undefined}
      />

      <ConfirmationModal
        open={deleteId != null}
        onOpenChange={(v) => {
          if (!v) {
            setDeleteId(null)
            setDeleteName("")
          }
        }}
        variant="destructive"
        title="Delete doctor?"
        description={`"${deleteName}" will be permanently removed from the doctor list. Patients, prescriptions, and templates that already reference this name are unaffected.`}
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

// ─── Doctor Form Dialog ───────────────────────────────────────────────────────

interface DoctorFormDialogProps {
  open: boolean
  onClose: () => void
  existing?: Doctor
}

function DoctorFormDialog({ open, onClose, existing }: DoctorFormDialogProps) {
  const [name, setName] = useState(existing?.name ?? "")
  const [department, setDepartment] = useState(existing?.department ?? "")
  const [specialization, setSpecialization] = useState(existing?.specialization ?? "")
  const [consultationFee, setConsultationFee] = useState(
    existing?.consultationFee != null ? String(existing.consultationFee) : "",
  )
  const [phone, setPhone] = useState(existing?.phone ?? "")
  const [errors, setErrors] = useState<Record<string, string>>({})

  const createM = useCreateDoctor(() => onClose())
  const updateM = useUpdateDoctor(existing?.id ?? "", () => onClose())

  // Reset when opening — see service-templates-section.tsx for why this
  // must be useEffect, not useState (same copy-pasted bug, fixed there first).
  useEffect(() => {
    if (open) {
      setName(existing?.name ?? "")
      setDepartment(existing?.department ?? "")
      setSpecialization(existing?.specialization ?? "")
      setConsultationFee(existing?.consultationFee != null ? String(existing.consultationFee) : "")
      setPhone(existing?.phone ?? "")
      setErrors({})
    }
  }, [open, existing])

  async function handleSave() {
    const e: Record<string, string> = {}
    if (!name.trim()) e.name = "Doctor name is required"
    if (Object.keys(e).length > 0) {
      setErrors(e)
      return
    }
    const payload = {
      name: name.trim(),
      department: department.trim() || undefined,
      specialization: specialization.trim() || undefined,
      consultationFee: consultationFee.trim() ? parseFloat(consultationFee) : undefined,
      phone: phone.trim() || undefined,
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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{existing ? "Edit Doctor" : "Add Doctor"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="doc-name">
              Doctor Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="doc-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                if (errors.name) setErrors((p) => ({ ...p, name: "" }))
              }}
              placeholder="e.g. Dr. Anita Sharma"
              className={errors.name ? "border-destructive" : ""}
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="doc-dept">Department</Label>
              <Input
                id="doc-dept"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g. Ophthalmology"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="doc-spec">Specialization</Label>
              <Input
                id="doc-spec"
                value={specialization}
                onChange={(e) => setSpecialization(e.target.value)}
                placeholder="e.g. Retina, Cataract"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="doc-fee">Consultation Fee (₹)</Label>
              <Input
                id="doc-fee"
                type="number"
                value={consultationFee}
                onChange={(e) => setConsultationFee(e.target.value)}
                placeholder="0"
                min={0}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="doc-phone">Phone</Label>
              <Input
                id="doc-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="10-digit number"
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={() => void handleSave()} disabled={isLoading}>
            {isLoading ? "Saving..." : existing ? "Save Changes" : "Add Doctor"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
