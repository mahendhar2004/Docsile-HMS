/**
 * labs/lab-form.tsx
 *
 * Create / edit lab dialog.
 *
 * Fields verified against:
 *   - supabase/functions/labs/types.ts LabSchema
 *   - src/app/(hospital)/labs/components/LabForm.tsx (old Next.js app)
 *
 * Permission gate: caller must hold labs:config before rendering.
 */

import { useState, useEffect } from "react"
import { Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { SingleSelect } from "@/components/patterns"
import { HEADER_OPTIONS } from "@/components/receipts/headers/registry"
import { useCreateLab, useUpdateLab } from "./hooks"
import type { Lab } from "./types"

interface LabFormProps {
  open: boolean
  /** null → create mode; non-null → edit mode */
  lab: Lab | null
  onClose: () => void
}

export function LabForm({ open, lab, onClose }: LabFormProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [location, setLocation] = useState("")
  const [printHeaderKey, setPrintHeaderKey] = useState("")
  const [isActive, setIsActive] = useState(true)

  // Sync form state when the dialog opens or the target lab changes
  useEffect(() => {
    if (open) {
      setName(lab?.name ?? "")
      setDescription(lab?.description ?? "")
      setLocation(lab?.location ?? "")
      setPrintHeaderKey(lab?.printHeaderKey ?? "")
      setIsActive(lab?.isActive ?? true)
    }
  }, [open, lab])

  const createLab = useCreateLab(onClose)
  const updateLab = useUpdateLab(lab?.id ?? "", onClose)

  const saving = createLab.isPending || updateLab.isPending
  const canSubmit = name.trim().length > 0 && !saving

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return

    const body = {
      name: name.trim(),
      description: description.trim() || null,
      location: location.trim() || null,
      printHeaderKey: printHeaderKey.trim() || null,
      isActive,
    }

    if (lab) {
      updateLab.mutate(body)
    } else {
      // Strip isActive from create — new labs start active by default
      createLab.mutate({ ...body })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{lab ? "Edit Lab" : "Add New Lab"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* Lab Name */}
          <div className="space-y-1.5">
            <Label htmlFor="lab-name">
              Lab Name{" "}
              <span className="text-destructive" aria-hidden="true">
                *
              </span>
            </Label>
            <Input
              id="lab-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Pathology Lab"
              autoFocus
              required
              aria-required="true"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="lab-desc">Description</Label>
            <Input
              id="lab-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Blood tests and lab investigations"
            />
          </div>

          {/* Location */}
          <div className="space-y-1.5">
            <Label htmlFor="lab-loc">Location</Label>
            <Input
              id="lab-loc"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g., Ground Floor, Room 5"
            />
          </div>

          {/* Receipt Header — matches main's LabForm.tsx exactly: a Select over
              HEADER_OPTIONS, not free text (users shouldn't have to know/type
              the raw printHeaderKey string). */}
          <div className="space-y-1.5">
            <Label htmlFor="lab-header">Receipt Header</Label>
            <SingleSelect
              options={HEADER_OPTIONS.map((o) => ({ value: o.key, label: o.label }))}
              value={printHeaderKey || "default"}
              onChange={(v) => setPrintHeaderKey(v === "default" ? "" : (v ?? ""))}
              aria-label="Receipt header"
            />
            <p className="text-xs text-muted-foreground">
              Choose which header appears on this lab&apos;s printed receipt.
            </p>
          </div>

          {/* Active toggle — edit mode only */}
          {lab && (
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <Label
                  htmlFor="lab-active"
                  className="cursor-pointer text-sm font-medium"
                >
                  Active
                </Label>
                <p className="text-xs text-muted-foreground">
                  Inactive labs won&apos;t appear in billing
                </p>
              </div>
              <Switch
                id="lab-active"
                checked={isActive}
                onCheckedChange={setIsActive}
                aria-label="Lab active status"
              />
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {saving && (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden="true" />
              )}
              {lab ? "Save Changes" : "Create Lab"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
