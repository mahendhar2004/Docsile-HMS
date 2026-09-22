import { create } from "zustand"

export interface SessionUser {
  id: string
  name: string
  role: string
  permissions: string[]
  hospitalId: string
}

interface SessionState {
  user: SessionUser | null
  isAuthenticated: boolean
  setUser: (user: SessionUser | null) => void
  clearSession: () => void
}

export const useSessionStore = create<SessionState>((set) => ({
  user: null,
  isAuthenticated: false,
  setUser: (user) => set({ user, isAuthenticated: user !== null }),
  clearSession: () => set({ user: null, isAuthenticated: false }),
}))
