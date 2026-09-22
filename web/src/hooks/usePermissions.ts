import { useSessionStore } from "@/store/session"

/**
 * Returns permission-checking helpers based on the current session.
 * Mirrors the shape of src/hooks/usePermissions.ts from the old Next.js app.
 *
 * - ADMIN role bypasses all permission checks (full access).
 * - All other roles check against the permissions array from the JWT session.
 */
export function usePermissions() {
  const user = useSessionStore((s) => s.user)

  return {
    can(permission: string): boolean {
      if (!user) return false
      if (user.role === "ADMIN") return true
      return user.permissions.includes(permission)
    },
    canAny(permissions: string[]): boolean {
      if (!user) return false
      if (user.role === "ADMIN") return true
      return permissions.some((p) => user.permissions.includes(p))
    },
    canAll(permissions: string[]): boolean {
      if (!user) return false
      if (user.role === "ADMIN") return true
      return permissions.every((p) => user.permissions.includes(p))
    },
  }
}
