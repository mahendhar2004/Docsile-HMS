/**
 * staff/roles-tab.tsx
 *
 * Roles & Permissions tab:
 *  - Left sidebar: list of roles with permission count + progress bar
 *  - Right panel: permission grid (module → individual toggles)
 *  - Empty state: Seed System Roles button + Create Custom Role
 *
 * Permission grid sources from ALL_PERMISSIONS catalog in web/src/lib/permissions.ts.
 * Role permissions are returned as string[] by the Edge Function (not JSON-encoded).
 *
 * Permission gating:
 *  - staff:manage_roles — create/edit/delete roles, toggle permissions, seed
 */

import { useState } from "react"
import { Plus, Shield, Trash2, Lock, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import { ErrorState } from "@/components/patterns/feedback"
import { ConfirmationModal } from "@/components/patterns/modals"
import { usePermissions } from "@/hooks/usePermissions"
import { ALL_PERMISSIONS } from "@/lib/permissions"
import { useStaffRoles, useDeleteRole, useUpdateRolePerms, useSeedSystemRoles } from "./hooks"
import { RoleForm } from "./role-form"
import type { StaffRole } from "./types"

// ─── Component ────────────────────────────────────────────────────────────────

export function RolesTab() {
  const { can } = usePermissions()
  const canManageRoles = can("staff:manage_roles")

  const { data: roles = [], isLoading, isError, error, refetch } = useStaffRoles()

  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null)
  const [permSearch, setPermSearch] = useState("")

  // Form state
  const [showRoleForm, setShowRoleForm] = useState(false)
  const [roleToEdit, setRoleToEdit] = useState<StaffRole | null>(null)

  // Delete confirmation
  const [roleToDelete, setRoleToDelete] = useState<StaffRole | null>(null)
  const deleteRole = useDeleteRole(() => {
    // If the deleted role was selected, clear selection
    if (roleToDelete && selectedRoleId === roleToDelete.id) {
      const remaining = roles.filter((r) => r.id !== roleToDelete.id)
      setSelectedRoleId(remaining.length > 0 ? remaining[0].id : null)
    }
    setRoleToDelete(null)
  })

  // Permission mutations
  const updatePerms = useUpdateRolePerms()

  // Seed system roles
  const seedRoles = useSeedSystemRoles()

  // Compute totals for progress bars
  const totalPerms = Object.values(ALL_PERMISSIONS).reduce(
    (sum, m) => sum + m.permissions.length,
    0,
  )

  // Resolve selected role
  const selectedRole = roles.find((r) => r.id === selectedRoleId) ?? null

  // Auto-select first role when roles load (if nothing selected)
  if (roles.length > 0 && selectedRoleId == null) {
    setSelectedRoleId(roles[0].id)
  }

  // ── Toggle individual permission ───────────────────────────────────────────
  function handleTogglePermission(permKey: string) {
    if (!selectedRole || !canManageRoles) return
    const current = selectedRole.permissions
    const updated = current.includes(permKey)
      ? current.filter((p) => p !== permKey)
      : [...current, permKey]
    updatePerms.mutate({ id: selectedRole.id, permissions: updated })
  }

  // ── Toggle all permissions in a module ─────────────────────────────────────
  function handleToggleModule(moduleKey: string) {
    if (!selectedRole || !canManageRoles) return
    const modulePerms = ALL_PERMISSIONS[moduleKey as keyof typeof ALL_PERMISSIONS]
      .permissions.map((p) => p.key)
    const current = selectedRole.permissions
    // Cast to string[] to avoid TypeScript's strict Array.includes() type check
    // (modulePerms is a readonly literal-union array from ALL_PERMISSIONS as const).
    const modulePermsStr = modulePerms as string[]
    const allEnabled = modulePermsStr.every((p) => current.includes(p))
    const updated = allEnabled
      ? current.filter((p) => !modulePermsStr.includes(p))
      : [...new Set([...current, ...modulePermsStr])]
    updatePerms.mutate({ id: selectedRole.id, permissions: updated })
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    )
  }

  if (isError) {
    return (
      <ErrorState
        title="Could not load roles"
        error={error}
        onRetry={() => void refetch()}
      />
    )
  }

  // Empty state — no roles configured yet
  if (roles.length === 0) {
    return (
      <div className="rounded-2xl border bg-card p-12 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          <Shield className="h-8 w-8 text-primary" aria-hidden="true" />
        </div>
        <h3 className="text-lg font-semibold mb-1">No roles configured</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
          Initialize the default system roles to get started with permission management.
          You can customize permissions for each role after setup.
        </p>
        {canManageRoles && (
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Button
              onClick={() => seedRoles.mutate()}
              disabled={seedRoles.isPending}
              className="gap-2"
            >
              <Shield className="h-4 w-4" aria-hidden="true" />
              {seedRoles.isPending ? "Setting up…" : "Initialize Default Roles"}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setRoleToEdit(null)
                setShowRoleForm(true)
              }}
              className="gap-2"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Create Custom Role
            </Button>
          </div>
        )}

        <RoleForm
          open={showRoleForm}
          onOpenChange={(v) => {
            setShowRoleForm(v)
            if (!v) setRoleToEdit(null)
          }}
          role={roleToEdit}
        />
      </div>
    )
  }

  // ── Main layout: sidebar + permission panel ────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Permission search — standalone, not paired with "New Role" here;
          matches main's exact layout (search bar alone above the two-column
          sidebar+panel, "New" button lives in the sidebar header instead). */}
      {roles.length > 0 && (
        <div className="relative max-w-md">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"
            aria-hidden="true"
          />
          <Input
            value={permSearch}
            onChange={(e) => setPermSearch(e.target.value)}
            placeholder="Search permissions…"
            className="pl-9 h-10"
            aria-label="Search permissions"
          />
        </div>
      )}

      <div className="flex gap-5 min-h-[500px]">
        {/* ── Role Sidebar ──────────────────────────────────────────────── */}
        <div className="w-64 shrink-0 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Roles</h3>
            {canManageRoles && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setRoleToEdit(null)
                  setShowRoleForm(true)
                }}
                className="h-7 text-xs gap-1.5"
                aria-label="Create new role"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                New
              </Button>
            )}
          </div>

          <nav aria-label="Roles" className="space-y-1.5">
          {roles.map((role) => {
            const permCount = role.permissions.length
            const pct = totalPerms > 0 ? Math.round((permCount / totalPerms) * 100) : 0
            const isSelected = selectedRoleId === role.id

            return (
              <button
                key={role.id}
                type="button"
                onClick={() => setSelectedRoleId(role.id)}
                aria-pressed={isSelected}
                aria-label={`Select ${role.displayName} role`}
                className={[
                  "w-full text-left rounded-xl border p-3 transition-all duration-150",
                  isSelected
                    ? "border-primary/30 bg-accent shadow-sm"
                    : "border-border bg-card hover:bg-muted/50",
                ].join(" ")}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-white text-xs font-bold"
                    aria-hidden="true"
                  >
                    {role.displayName.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-foreground truncate">
                        {role.displayName}
                      </span>
                      {role.isSystem && (
                        <Lock
                          className="h-3 w-3 text-muted-foreground shrink-0"
                          aria-label="System role"
                        />
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[0.65rem] text-muted-foreground">
                        {permCount} permission{permCount !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div
                      className="mt-2 h-1.5 w-full rounded-full bg-muted overflow-hidden"
                      role="progressbar"
                      aria-valuenow={pct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${pct}% permissions enabled`}
                    >
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              </button>
            )
          })}
          </nav>
        </div>

        {/* ── Permission Panel ──────────────────────────────────────────── */}
        <div className="flex-1 min-w-0">
          {selectedRole == null ? (
            <div className="flex items-center justify-center h-80 text-muted-foreground">
              <div className="text-center">
                <Shield className="h-10 w-10 mx-auto mb-2 opacity-30" aria-hidden="true" />
                <p className="text-sm">Select a role to manage permissions</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Role header card */}
              <div className="rounded-xl border bg-card p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white text-sm font-bold"
                      aria-hidden="true"
                    >
                      {selectedRole.displayName.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold">{selectedRole.displayName}</h3>
                        <Badge variant="outline" size="sm" className="font-mono">
                          {selectedRole.name}
                        </Badge>
                        {selectedRole.isSystem && (
                          <Badge variant="muted" size="sm">
                            System
                          </Badge>
                        )}
                      </div>
                      {selectedRole.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {selectedRole.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p className="text-lg font-bold text-primary">
                        {selectedRole.permissions.length}
                      </p>
                      <p className="text-[0.65rem] text-muted-foreground -mt-0.5">
                        of {totalPerms}
                      </p>
                    </div>

                    {canManageRoles && (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setRoleToEdit(selectedRole)
                            setShowRoleForm(true)
                          }}
                          aria-label={`Edit ${selectedRole.displayName} role`}
                        >
                          Edit
                        </Button>
                        {!selectedRole.isSystem && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:bg-destructive/10"
                            onClick={() => setRoleToDelete(selectedRole)}
                            aria-label={`Delete ${selectedRole.displayName} role`}
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Permission module cards */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                {Object.entries(ALL_PERMISSIONS).map(([moduleKey, module]) => {
                  const query = permSearch.trim().toLowerCase()
                  const moduleMatches = query === "" || module.label.toLowerCase().includes(query)
                  const visiblePerms =
                    query === ""
                      ? module.permissions
                      : moduleMatches
                      ? module.permissions
                      : module.permissions.filter(
                          (p) =>
                            p.label.toLowerCase().includes(query) ||
                            p.key.toLowerCase().includes(query),
                        )
                  if (visiblePerms.length === 0) return null

                  const modulePermKeys = module.permissions.map((p) => p.key)
                  const enabledCount = modulePermKeys.filter((k) =>
                    selectedRole.permissions.includes(k),
                  ).length
                  const allEnabled = enabledCount === modulePermKeys.length
                  const someEnabled = enabledCount > 0

                  return (
                    <div
                      key={moduleKey}
                      className="rounded-xl border bg-card overflow-hidden"
                    >
                      {/* Module header */}
                      <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
                        <div className="flex items-center gap-2.5">
                          <span className="text-sm font-semibold text-foreground">
                            {module.label}
                          </span>
                          <span className="text-xs text-muted-foreground tabular-nums">
                            {enabledCount}/{modulePermKeys.length}
                          </span>
                        </div>
                        <Switch
                          checked={allEnabled}
                          onCheckedChange={() => handleToggleModule(moduleKey)}
                          disabled={!canManageRoles || updatePerms.isPending}
                          aria-label={`Toggle all ${module.label} permissions`}
                        />
                      </div>

                      {/* Individual permission rows */}
                      <div className="px-4 py-2.5 space-y-0.5">
                        {visiblePerms.map((perm) => {
                          const isEnabled = selectedRole.permissions.includes(perm.key)
                          return (
                            <label
                              key={perm.key}
                              className={[
                                "flex items-center justify-between py-1.5 px-2 -mx-2 rounded-lg cursor-pointer",
                                isEnabled ? "hover:bg-accent/50" : "hover:bg-muted/60",
                                !canManageRoles ? "cursor-default" : "",
                              ].join(" ")}
                            >
                              <span
                                className={`text-sm ${isEnabled ? "text-foreground font-medium" : "text-muted-foreground"}`}
                              >
                                {perm.label}
                              </span>
                              <Switch
                                checked={isEnabled}
                                onCheckedChange={() => handleTogglePermission(perm.key)}
                                disabled={!canManageRoles || updatePerms.isPending}
                                aria-label={`${isEnabled ? "Disable" : "Enable"} ${perm.label} permission`}
                              />
                            </label>
                          )
                        })}
                      </div>

                      {/* Bottom progress bar */}
                      {someEnabled && (
                        <div className="h-0.5 bg-muted">
                          <div
                            className="h-full bg-primary transition-all duration-300"
                            style={{
                              width: `${(enabledCount / modulePermKeys.length) * 100}%`,
                            }}
                          />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Role create/edit dialog */}
      <RoleForm
        open={showRoleForm}
        onOpenChange={(v) => {
          setShowRoleForm(v)
          if (!v) setRoleToEdit(null)
        }}
        role={roleToEdit}
      />

      {/* Delete role confirmation */}
      <ConfirmationModal
        open={roleToDelete != null}
        onOpenChange={(v) => {
          if (!v) setRoleToDelete(null)
        }}
        variant="destructive"
        title="Delete Role"
        description={
          roleToDelete
            ? `Are you sure you want to delete the "${roleToDelete.displayName}" role? This cannot be undone. Staff members assigned to this role must be reassigned first.`
            : undefined
        }
        confirmLabel="Delete Role"
        isLoading={deleteRole.isPending}
        onConfirm={() => {
          if (roleToDelete) {
            deleteRole.mutate(roleToDelete.id)
          }
        }}
      />
    </div>
  )
}
