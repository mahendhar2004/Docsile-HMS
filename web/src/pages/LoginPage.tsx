import React, { useState } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TextInput } from "@/components/patterns/forms/text-input"
import { FormFieldRow } from "@/components/patterns/forms/form-section"
import { apiClient } from "@/lib/api-client"
import { queryClient } from "@/lib/query-client"
import { useSessionStore } from "@/store/session"
import type { SessionUser } from "@/store/session"

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
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            Docsile HMS
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            Sign in to your hospital account
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl bg-white shadow-md border border-border/60 p-6 space-y-4"
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
      </div>
    </div>
  )
}
