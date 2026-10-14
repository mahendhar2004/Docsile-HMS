import { create } from "zustand"

export interface SessionUser {
  id: string
  name: string
  role: string
  permissions: string[]
  hospitalId: string
}

/** Raw shape the backend's /auth/login and /auth/refresh responses carry. */
export interface RawSessionUser {
  userId: string
  name: string
  role: string
  hospitalId: string
  permissions: string[]
}

export function mapSessionUser(raw: RawSessionUser): SessionUser {
  return {
    id: raw.userId,
    name: raw.name,
    role: raw.role,
    permissions: raw.permissions,
    hospitalId: raw.hospitalId,
  }
}

/**
 * "checking" is the initial state on every fresh page load — the app doesn't
 * yet know if an HttpOnly refresh cookie can silently re-authenticate it.
 * The router must not redirect to /login while in this state (see
 * AppRouter in router.tsx), or a valid session gets thrown away on reload.
 */
export type SessionStatus = "checking" | "authenticated" | "unauthenticated"

interface SessionState {
  user: SessionUser | null
  status: SessionStatus
  setUser: (user: SessionUser | null) => void
  clearSession: () => void
}

export const useSessionStore = create<SessionState>((set) => ({
  user: null,
  status: "checking",
  setUser: (user) =>
    set({ user, status: user !== null ? "authenticated" : "unauthenticated" }),
  clearSession: () => set({ user: null, status: "unauthenticated" }),
}))
