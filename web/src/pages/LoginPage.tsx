import React, { useState } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import {
  Loader2,
  Stethoscope,
  Users,
  Receipt,
  Pill,
  FlaskConical,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { TextInput } from "@/components/patterns/forms/text-input"
import { FormFieldRow } from "@/components/patterns/forms/form-section"
import { apiClient } from "@/lib/api-client"
import { queryClient } from "@/lib/query-client"
import { useSessionStore } from "@/store/session"
import type { SessionUser } from "@/store/session"
import medicineIllustration from "@/assets/undraw-medicine.svg"

const FEATURE_PILLS = [
  { icon: Users, label: "Patients" },
  { icon: Receipt, label: "Billing" },
  { icon: Pill, label: "Pharmacy" },
  { icon: FlaskConical, label: "Labs" },
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
      <div className="hidden lg:flex lg:w-1/2 relative flex-col items-center justify-center gap-10 p-12 overflow-hidden">
        {/* Aurora backdrop — two soft blurred color blobs, not a flat gradient */}
        <div className="absolute inset-0 -z-10" aria-hidden="true">
          <div
            className="absolute -top-24 -left-24 h-[28rem] w-[28rem] rounded-full opacity-60"
            style={{
              background: "var(--color-primary)",
              filter: "blur(120px)",
            }}
          />
          <div
            className="absolute -bottom-32 -right-16 h-[26rem] w-[26rem] rounded-full opacity-40"
            style={{
              background: "var(--color-success)",
              filter: "blur(130px)",
            }}
          />
          <div className="absolute inset-0 bg-[var(--color-background)]/70" />
        </div>

        <img
          src={medicineIllustration}
          alt=""
          aria-hidden="true"
          className="w-full max-w-md motion-list-item-in"
        />

        <div className="text-center max-w-sm">
          <h2 className="text-[length:var(--text-title)] font-bold text-[var(--color-foreground)] tracking-tight">
            Care, connected.
          </h2>
          <p className="mt-2 text-[length:var(--text-body)] text-[var(--color-muted-foreground)] leading-[var(--leading-normal)]">
            Patients, prescriptions, billing, and every department in one
            place — built for the pace of a real hospital.
          </p>
        </div>

        {/* Feature highlights */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {FEATURE_PILLS.map(({ icon: Icon, label }) => (
            <div
              key={label}
              className={[
                "flex items-center gap-1.5 pl-2 pr-3 py-1.5",
                "rounded-[var(--radius-full)] bg-[var(--color-card)]",
                "shadow-[var(--shadow-border)]",
                "text-[length:var(--text-caption)] font-medium text-[var(--color-foreground)]",
              ].join(" ")}
            >
              <Icon
                size={14}
                className="text-[var(--color-primary)]"
                aria-hidden="true"
              />
              {label}
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-sm motion-list-item-in">
          <div className="mb-8 flex items-center gap-3 lg:justify-start justify-center">
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

          <form
            onSubmit={handleSubmit}
            className="rounded-[var(--radius-xl)] bg-[var(--color-card)] shadow-[var(--shadow-card)] p-7 space-y-5"
            aria-label="Login form"
            noValidate
          >
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
