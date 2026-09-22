import { http } from "msw"
import { ok } from "../envelope"
import { ALL_PERMISSIONS } from "@/lib/permissions"
import type { SessionUser } from "@/store/session"

function allPermissionKeys(): string[] {
  const keys: string[] = []
  for (const group of Object.values(ALL_PERMISSIONS)) {
    for (const p of group.permissions) keys.push(p.key)
  }
  return keys
}

/**
 * Mock session — ADMIN bypasses every permission check in usePermissions(),
 * so every page's gates pass regardless of the permissions array content.
 * The full catalog is included anyway for any code that reads it directly.
 */
const MOCK_ADMIN: SessionUser = {
  id: "mock-admin-id",
  name: "Dr. Admin (Mock)",
  role: "ADMIN",
  permissions: allPermissionKeys(),
  hospitalId: "mock-hospital-id",
}

export const authHandlers = [
  // Any phone/password combination logs in as the mock admin.
  http.post("/auth/login", () => ok(MOCK_ADMIN)),
  http.post("/auth/refresh", () => ok(MOCK_ADMIN)),
  http.post("/auth/logout", () => ok(null)),
]
