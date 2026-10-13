import React, { useState } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import {
  Loader2,
  Stethoscope,
  Users,
  ListOrdered,
  ClipboardPlus,
  Receipt,
  Pill,
  Glasses,
  FlaskConical,
  ShieldCheck,
  UserCog,
  Settings as SettingsIcon,
  Wallet,
  Bell,
  PhoneCall,
  BadgeCheck,
  BarChart2,
  FileText,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { TextInput } from "@/components/patterns/forms/text-input"
import { FormFieldRow } from "@/components/patterns/forms/form-section"
import { apiClient } from "@/lib/api-client"
import { queryClient } from "@/lib/query-client"
import { useSessionStore } from "@/store/session"
import type { SessionUser } from "@/store/session"
import medicineIllustration from "@/assets/undraw-medicine.svg"

// Mirrors the real sidebar's module list (web/src/components/patterns/navigation/sidebar.tsx)
// — one line per module, not a marketing summary, so this stays accurate as modules change.
const FEATURES = [
  { icon: Users, label: "Patients" },
  { icon: ListOrdered, label: "Queue" },
  { icon: ClipboardPlus, label: "Workup" },
  { icon: Stethoscope, label: "Doctor" },
  { icon: Receipt, label: "Billing" },
  { icon: Pill, label: "Pharmacy" },
  { icon: Glasses, label: "Optical" },
  { icon: FlaskConical, label: "Labs" },
  { icon: ShieldCheck, label: "Insurance" },
  { icon: UserCog, label: "Staff" },
  { icon: Wallet, label: "Expenses" },
  { icon: Bell, label: "Dues & Follow-ups" },
  { icon: PhoneCall, label: "Call Logs" },
  { icon: BadgeCheck, label: "Licenses" },
  { icon: BarChart2, label: "Analytics" },
  { icon: FileText, label: "Reports" },
  { icon: SettingsIcon, label: "Settings" },
] as const

/**
 * LoginPage — auth entry point.
 *
 * POST /auth/login is email + password (see supabase/functions/auth/ —
 * findUserByEmail is the only lookup path, there is no phone-based login).
 * Calls the Edge Function, stores the session in Zustand, and navigates to /dashboard.
 */
export default function LoginPage() {
  const navigate = useNavigate()
  const setUser = useSessionStore((s) => s.setUser)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !password) {
      toast.error("Email and password are required")
      return
    }
    setLoading(true)
    try {
      const envelope = await apiClient.post<SessionUser>("/auth/login", {
        email: email.trim(),
        password,
      })
      setUser(envelope.data)
      queryClient.clear()
      navigate("/dashboard", { replace: true })
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Login failed. Please try again."
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-[var(--color-background)]">
      {/* Left panel — aurora background, illustration, branding. Hidden below lg. */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col items-center justify-center gap-8 px-12 py-10 overflow-hidden">
        {/* Aurora backdrop — two soft blurred color blobs, not a flat gradient */}
        <div className="absolute inset-0 -z-10" aria-hidden="true">
          <div
            className="absolute -top-32 -left-32 h-[34rem] w-[34rem] rounded-full opacity-60"
            style={{
              background: "var(--color-primary)",
              filter: "blur(130px)",
            }}
          />
          <div
            className="absolute -bottom-40 -right-24 h-[32rem] w-[32rem] rounded-full opacity-40"
            style={{
              background: "var(--color-success)",
              filter: "blur(140px)",
            }}
          />
          <div className="absolute inset-0 bg-[var(--color-background)]/70" />
        </div>

        <img
          src={medicineIllustration}
          alt=""
          aria-hidden="true"
          className="w-full max-w-xl motion-list-item-in"
        />

        <h2 className="text-[length:var(--text-display)] font-bold text-[var(--color-foreground)] tracking-tight text-center">
          Care, connected.
        </h2>

        {/* Every module, as a continuously scrolling row of cards — the
            single source of truth for "what this covers" (no separate
            summary sentence saying the same thing, and not all 17 dumped
            on screen at once as a static wall of pills). Edge-faded via
            mask-image; content is duplicated once so the -50% translate
            loops seamlessly. */}
        <div
          className="w-full overflow-hidden"
          style={{
            maskImage:
              "linear-gradient(to right, transparent, black 12%, black 88%, transparent)",
            WebkitMaskImage:
              "linear-gradient(to right, transparent, black 12%, black 88%, transparent)",
          }}
        >
          <div className="flex w-max gap-3 motion-marquee-x">
            {[...FEATURES, ...FEATURES].map(({ icon: Icon, label }, i) => (
              <div
                key={`${label}-${i}`}
                className={[
                  "flex items-center gap-2 pl-3 pr-4 py-2 shrink-0",
                  "rounded-[var(--radius-md)] bg-[var(--color-card)]",
                  "shadow-[var(--shadow-border)]",
                ].join(" ")}
              >
                <Icon
                  size={15}
                  className="shrink-0 text-[var(--color-primary)]"
                  aria-hidden="true"
                />
                <span className="text-[length:var(--text-caption)] font-medium text-[var(--color-foreground)] whitespace-nowrap">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-sm motion-list-item-in">
          <form
            onSubmit={handleSubmit}
            className="rounded-[var(--radius-xl)] bg-[var(--color-card)] shadow-[var(--shadow-card)] p-7 space-y-5"
            aria-label="Login form"
            noValidate
          >
            <div className="flex items-center gap-3 pb-5 mb-2 border-b border-[var(--color-border)]">
              <div
                className={[
                  "flex items-center justify-center h-11 w-11 shrink-0",
                  "rounded-[var(--radius-md)] bg-[var(--color-primary)]",
                  "shadow-[var(--shadow-card)]",
                ].join(" ")}
                aria-hidden="true"
              >
                <Stethoscope size={22} className="text-[var(--color-primary-foreground)]" />
              </div>
              <div className="text-left">
                <h1 className="text-[length:var(--text-title)] font-bold text-[var(--color-foreground)] tracking-tight leading-[var(--leading-tight)]">
                  Docsile HMS
                </h1>
                <p className="text-[length:var(--text-caption)] text-[var(--color-muted-foreground)]">
                  Sign in to your hospital account
                </p>
              </div>
            </div>

            <FormFieldRow label="Email" htmlFor="email" required>
              <TextInput
                id="email"
                inputType="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                autoComplete="email"
                autoFocus
                disabled={loading}
                aria-required="true"
              />
            </FormFieldRow>

            <FormFieldRow label="Password" htmlFor="password" required>
              <TextInput
                id="password"
                inputType="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                disabled={loading}
                aria-required="true"
              />
            </FormFieldRow>

            <Button
              type="submit"
              size="lg"
              className="w-full mt-2"
              disabled={loading}
              aria-label={loading ? "Signing in…" : "Sign in"}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Signing in…
                </>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-[length:var(--text-caption)] text-[var(--color-muted-foreground)]">
            Docsile HMS — hospital management, end to end.
          </p>
        </div>
      </div>
    </div>
  )
}
