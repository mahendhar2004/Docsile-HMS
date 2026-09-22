/**
 * HospitalProfileSection — GET/PATCH /settings/hospital-profile + PATCH /settings/nav-style.
 * Permission: settings:view (read) / settings:edit (write)
 */

import { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import { ErrorState } from "@/components/patterns"
import { useHospitalProfile, useUpdateHospitalProfile, useUpdateNavStyle } from "./hooks"

interface HospitalProfileSectionProps {
  canEdit: boolean
}

export function HospitalProfileSection({ canEdit }: HospitalProfileSectionProps) {
  const { data: profile, isLoading, error, refetch } = useHospitalProfile()
  const updateProfileM = useUpdateHospitalProfile()
  const updateNavM = useUpdateNavStyle()

  const [name, setName] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [website, setWebsite] = useState("")
  const [registrationNo, setRegistrationNo] = useState("")
  const [gstin, setGstin] = useState("")
  const [regFeeEnabled, setRegFeeEnabled] = useState(false)
  const [regFeeAmount, setRegFeeAmount] = useState("")
  const [regFeeDefaultChecked, setRegFeeDefaultChecked] = useState(true)
  const [navStyle, setNavStyle] = useState<"side" | "top">("side")

  // Populate form when data arrives
  useEffect(() => {
    if (!profile) return
    setName(profile.name ?? "")
    setDisplayName(profile.displayName ?? "")
    setPhone(profile.phone ?? "")
    setEmail(profile.email ?? "")
    setWebsite(profile.website ?? "")
    setRegistrationNo(profile.registrationNo ?? "")
    setGstin(profile.gstin ?? "")
    setRegFeeEnabled(profile.registrationFeeEnabled ?? false)
    setRegFeeAmount(
      profile.registrationFeeAmount != null ? String(profile.registrationFeeAmount) : "",
    )
    setRegFeeDefaultChecked(profile.registrationFeeDefaultChecked ?? true)
    if (profile.settings) {
      try {
        const s = JSON.parse(profile.settings) as { navStyle?: unknown }
        if (s?.navStyle === "top") setNavStyle("top")
        else setNavStyle("side")
      } catch {
        setNavStyle("side")
      }
    }
  }, [profile])

  async function handleSaveProfile() {
    const parsedAmount = parseFloat(regFeeAmount)
    await updateProfileM.mutateAsync({
      name: name.trim() || undefined,
      displayName: displayName.trim() || undefined,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      website: website.trim() || undefined,
      registrationNo: registrationNo.trim() || undefined,
      gstin: gstin.trim() || undefined,
      registrationFeeEnabled: regFeeEnabled,
      registrationFeeAmount: Number.isFinite(parsedAmount) ? parsedAmount : 0,
      registrationFeeDefaultChecked: regFeeDefaultChecked,
    })
  }

  async function handleNavStyleChange(style: "side" | "top") {
    setNavStyle(style)
    await updateNavM.mutateAsync(style)
  }

  if (error) {
    return (
      <ErrorState
        title="Could not load hospital profile"
        error={error}
        onRetry={() => void refetch()}
      />
    )
  }

  if (isLoading) {
    return (
      <div className="max-w-xl space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    )
  }

  return (
    <div className="max-w-xl">
      <div className="rounded-xl border border-border bg-white p-6 space-y-5">
        {/* Basic info */}
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label htmlFor="hp-name">
              Hospital Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="hp-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1.5"
              placeholder="Full hospital name"
              disabled={!canEdit}
            />
          </div>
          <div className="col-span-2">
            <Label htmlFor="hp-display">Display Name</Label>
            <Input
              id="hp-display"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="mt-1.5"
              placeholder="Shorter name shown in app"
              disabled={!canEdit}
            />
          </div>
        </div>

        {/* Contact info */}
        <div className="border-t border-border pt-4 grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="hp-phone">Phone</Label>
            <Input
              id="hp-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1.5"
              placeholder="Contact number"
              disabled={!canEdit}
            />
          </div>
          <div>
            <Label htmlFor="hp-email">Email</Label>
            <Input
              id="hp-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5"
              placeholder="contact@hospital.com"
              disabled={!canEdit}
            />
          </div>
          <div>
            <Label htmlFor="hp-website">Website</Label>
            <Input
              id="hp-website"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className="mt-1.5"
              placeholder="www.hospital.com"
              disabled={!canEdit}
            />
          </div>
          <div>
            <Label htmlFor="hp-reg">Registration No.</Label>
            <Input
              id="hp-reg"
              value={registrationNo}
              onChange={(e) => setRegistrationNo(e.target.value)}
              className="mt-1.5"
              placeholder="MCI registration number"
              disabled={!canEdit}
            />
          </div>
          <div>
            <Label htmlFor="hp-gstin">GSTIN</Label>
            <Input
              id="hp-gstin"
              value={gstin}
              onChange={(e) => setGstin(e.target.value)}
              className="mt-1.5"
              placeholder="GST identification number"
              disabled={!canEdit}
            />
          </div>
        </div>

        {/* Registration fee */}
        <div className="border-t border-border pt-4 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Registration Fee</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Charge a one-time fee when registering a new out-patient.
            </p>
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label className="text-sm font-medium">Enable registration fee</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Show a Registration Fee option in patient registration.
              </p>
            </div>
            <Switch
              checked={regFeeEnabled}
              onCheckedChange={setRegFeeEnabled}
              disabled={!canEdit}
              aria-label="Enable registration fee"
            />
          </div>
          <div
            className={`grid grid-cols-2 gap-4 ${!regFeeEnabled || !canEdit ? "opacity-50 pointer-events-none" : ""}`}
          >
            <div>
              <Label htmlFor="hp-fee-amount">Amount (₹)</Label>
              <Input
                id="hp-fee-amount"
                type="number"
                inputMode="decimal"
                min={0}
                value={regFeeAmount}
                onChange={(e) => setRegFeeAmount(e.target.value)}
                className="mt-1.5"
                placeholder="500"
                disabled={!regFeeEnabled || !canEdit}
              />
            </div>
            <div className="flex flex-col justify-end">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1.5">
                Pre-check by default
              </Label>
              <div className="h-9 flex items-center gap-2">
                <Switch
                  checked={regFeeDefaultChecked}
                  onCheckedChange={setRegFeeDefaultChecked}
                  disabled={!regFeeEnabled || !canEdit}
                  aria-label="Pre-check registration fee by default"
                />
                <span className="text-xs text-muted-foreground">
                  {regFeeDefaultChecked ? "Checked when form opens" : "Unchecked by default"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Nav style */}
        <div className="border-t border-border pt-4 space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Navigation Style</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Choose how navigation is displayed across the app.
            </p>
          </div>
          <div className="flex items-center gap-0" role="group" aria-label="Navigation style">
            <button
              type="button"
              disabled={!canEdit || updateNavM.isPending}
              onClick={() => void handleNavStyleChange("side")}
              className={`flex items-center gap-2 px-4 h-9 text-sm font-medium border transition-colors rounded-l-lg rounded-r-none focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                navStyle === "side"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-border hover:text-foreground hover:bg-muted/50"
              }`}
              aria-pressed={navStyle === "side"}
            >
              Sidebar
            </button>
            <button
              type="button"
              disabled={!canEdit || updateNavM.isPending}
              onClick={() => void handleNavStyleChange("top")}
              className={`flex items-center gap-2 px-4 h-9 text-sm font-medium border-t border-b border-r transition-colors rounded-r-lg rounded-l-none focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                navStyle === "top"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-border hover:text-foreground hover:bg-muted/50"
              }`}
              aria-pressed={navStyle === "top"}
            >
              Top Bar
            </button>
          </div>
          <p className="text-xs text-muted-foreground">Takes effect on next page load.</p>
        </div>

        {/* Save */}
        {canEdit && (
          <div className="border-t border-border pt-4 flex justify-end">
            <Button
              onClick={() => void handleSaveProfile()}
              disabled={updateProfileM.isPending}
              size="sm"
              className="h-9"
            >
              {updateProfileM.isPending ? "Saving..." : "Save Profile"}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
