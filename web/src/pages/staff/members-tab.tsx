/**
 * staff/members-tab.tsx
 *
 * Staff members list with:
 *  - Search (by name, email, phone, employee ID)
 *  - Role filter
 *  - Active/Inactive status filter
 *  - Create / Edit via MemberForm Dialog
 *  - Toggle active (with ConfirmationModal for deactivation)
 *  - Reset password (Dialog with password input)
 *
 * Permission gating:
 *  - staff:create  — Add Member button
 *  - staff:edit    — Edit action + Reset Password action
 *  - staff:deactivate — Toggle Active/Inactive action
 */

import { useState } from "react"
import { Plus, Search, UserCog, KeyRound, MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { DataTable, type ColumnDef } from "@/components/patterns/tables"
import { EmptyState, ErrorState } from "@/components/patterns/feedback"
import { ConfirmationModal } from "@/components/patterns/modals"
import { SingleSelect } from "@/components/patterns/selection"
import { PageToolbar } from "@/components/patterns"
import { usePermissions } from "@/hooks/usePermissions"
import { useStaffMembers, useToggleActive, useResetPassword } from "./hooks"
import { MemberForm } from "./member-form"
import type { StaffMember, StaffRole } from "./types"

// ─── Props ────────────────────────────────────────────────────────────────────

interface MembersTabProps {
  roles: StaffRole[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

function formatDate(iso: string | null): string {
  if (!iso) return "Never"
  try {
    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

// Status filter options
const STATUS_OPTIONS = [
  { value: "ALL", label: "All Status" },
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
]

// ─── Component ────────────────────────────────────────────────────────────────

export function MembersTab({ roles }: MembersTabProps) {
  const { can } = usePermissions()

  // ── Data ──────────────────────────────────────────────────────────────────
  const { data: members = [], isLoading, isError, error, refetch } = useStaffMembers()

  // ── Filters ───────────────────────────────────────────────────────────────
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState("ALL")
  const [statusFilter, setStatusFilter] = useState("ALL")

  // ── Form state ────────────────────────────────────────────────────────────
  const [showForm, setShowForm] = useState(false)
  const [memberToEdit, setMemberToEdit] = useState<StaffMember | null>(null)

  // ── Deactivate confirmation ───────────────────────────────────────────────
  const [memberToDeactivate, setMemberToDeactivate] = useState<StaffMember | null>(null)
  const toggleActive = useToggleActive()

  // ── Reset password dialog ─────────────────────────────────────────────────
  const [memberToReset, setMemberToReset] = useState<StaffMember | null>(null)
  const [newPassword, setNewPassword] = useState("")
  const resetPassword = useResetPassword(() => {
    setMemberToReset(null)
    setNewPassword("")
  })

  // ── Filtering ─────────────────────────────────────────────────────────────
  const q = search.toLowerCase()
  const filtered = members.filter((m) => {
    const matchesSearch =
      m.fullName.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q) ||
      (m.phone?.includes(search) ?? false) ||
      (m.employeeId?.toLowerCase().includes(q) ?? false)
    const matchesRole = roleFilter === "ALL" || m.role === roleFilter
    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "ACTIVE" ? m.isActive : !m.isActive)
    return matchesSearch && matchesRole && matchesStatus
  })

  // Build role options for filter from unique roles in the member list
  const availableRoles: { value: string; label: string }[] = [
    { value: "ALL", label: "All Roles" },
    ...Array.from(new Set(members.map((m) => m.role)))
      .sort()
      .map((r) => {
        const roleMeta = roles.find((rl) => rl.name === r)
        return { value: r, label: roleMeta?.displayName ?? r }
      }),
  ]

  // ── Column definitions ────────────────────────────────────────────────────
  const columns: ColumnDef<StaffMember>[] = [
    {
      key: "name",
      header: "Name",
      cell: (m) => (
        <div className="flex items-center gap-3">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white bg-primary"
            aria-hidden="true"
          >
            {getInitials(m.fullName)}
          </div>
          <div>
            <p className="font-medium text-sm">{m.fullName}</p>
            <p className="text-xs text-muted-foreground">{m.email}</p>
          </div>
        </div>
      ),
      minWidth: "200px",
    },
    {
      key: "role",
      header: "Role",
      cell: (m) => {
        const roleMeta = roles.find((r) => r.name === m.role)
        return (
          <Badge variant="info" size="sm">
            {roleMeta?.displayName ?? m.role}
          </Badge>
        )
      },
    },
    {
      key: "department",
      header: "Department",
      cell: (m) => (
        <span className="text-sm text-muted-foreground">{m.department ?? "—"}</span>
      ),
    },
    {
      key: "phone",
      header: "Phone",
      cell: (m) => (
        <span className="text-sm text-muted-foreground">{m.phone ?? "—"}</span>
      ),
    },
    {
      key: "employeeId",
      header: "Employee ID",
      cell: (m) => (
        <span className="text-sm font-mono text-muted-foreground">
          {m.employeeId ?? "—"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (m) => (
        <Badge variant={m.isActive ? "success" : "error"} size="sm">
          {m.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: "lastLogin",
      header: "Last Login",
      cell: (m) => (
        <span className="text-sm text-muted-foreground">{formatDate(m.lastLogin)}</span>
      ),
    },
  ]

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <PageToolbar>
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"
            aria-hidden="true"
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, phone, or ID…"
            className="pl-9"
            aria-label="Search staff members"
          />
        </div>

        <SingleSelect
          options={availableRoles}
          value={roleFilter}
          onChange={setRoleFilter}
          placeholder="All Roles"
          aria-label="Filter by role"
          className="min-w-[140px]"
        />
        <SingleSelect
          options={STATUS_OPTIONS}
          value={statusFilter}
          onChange={setStatusFilter}
          placeholder="All Status"
          aria-label="Filter by status"
          className="min-w-[130px]"
        />

        {can("staff:create") && (
          <Button
            onClick={() => {
              setMemberToEdit(null)
              setShowForm(true)
            }}
            className="gap-2 shrink-0 ml-auto"
            aria-label="Add new staff member"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add Member
          </Button>
        )}
      </PageToolbar>

      {/* Loading state */}
      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-md" />
          ))}
        </div>
      )}

      {/* Error state */}
      {isError && !isLoading && (
        <ErrorState
          title="Could not load staff members"
          error={error}
          onRetry={() => void refetch()}
        />
      )}

      {/* Table */}
      {!isLoading && !isError && (
        <>
          {filtered.length === 0 ? (
            <EmptyState
              icon={<UserCog size={48} aria-hidden="true" />}
              title={members.length === 0 ? "No staff members yet" : "No members match your filters"}
              description={
                members.length === 0
                  ? "Add your first staff member to get started."
                  : "Try adjusting your search or filter criteria."
              }
              action={
                members.length === 0 && can("staff:create")
                  ? {
                      label: "Add Staff Member",
                      onClick: () => {
                        setMemberToEdit(null)
                        setShowForm(true)
                      },
                    }
                  : undefined
              }
            />
          ) : (
            <div className="rounded-lg border bg-card overflow-hidden">
              <DataTable
                data={filtered}
                columns={columns}
                variant="with-row-actions"
                aria-label="Staff members"
                rowActions={(m) => (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Actions for ${m.fullName}`}
                        className="h-8 w-8 p-0"
                      >
                        <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {can("staff:edit") && (
                        <DropdownMenuItem
                          onClick={() => {
                            setMemberToEdit(m)
                            setShowForm(true)
                          }}
                        >
                          Edit
                        </DropdownMenuItem>
                      )}
                      {can("staff:edit") && (
                        <DropdownMenuItem
                          onClick={() => {
                            setMemberToReset(m)
                            setNewPassword("")
                          }}
                        >
                          <KeyRound className="h-4 w-4 mr-2" aria-hidden="true" />
                          Reset Password
                        </DropdownMenuItem>
                      )}
                      {can("staff:deactivate") && (
                        <>
                          <DropdownMenuSeparator />
                          {m.isActive ? (
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setMemberToDeactivate(m)}
                            >
                              Deactivate
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              className="text-success-foreground focus:text-success-foreground"
                              onClick={() => {
                                toggleActive.mutate({ id: m.id, isActive: true })
                              }}
                            >
                              Activate
                            </DropdownMenuItem>
                          )}
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              />
            </div>
          )}
        </>
      )}

      {/* Create / Edit form */}
      <MemberForm
        open={showForm}
        onOpenChange={(v) => {
          setShowForm(v)
          if (!v) setMemberToEdit(null)
        }}
        member={memberToEdit}
        roles={roles}
      />

      {/* Deactivate confirmation */}
      <ConfirmationModal
        open={memberToDeactivate != null}
        onOpenChange={(v) => {
          if (!v) setMemberToDeactivate(null)
        }}
        variant="destructive"
        title="Deactivate Staff Member"
        description={
          memberToDeactivate
            ? `Are you sure you want to deactivate ${memberToDeactivate.fullName}? They will no longer be able to log in.`
            : undefined
        }
        confirmLabel="Deactivate"
        isLoading={toggleActive.isPending}
        onConfirm={() => {
          if (memberToDeactivate) {
            toggleActive.mutate(
              { id: memberToDeactivate.id, isActive: false },
              { onSettled: () => setMemberToDeactivate(null) },
            )
          }
        }}
      />

      {/* Reset password dialog */}
      <Dialog
        open={memberToReset != null}
        onOpenChange={(v) => {
          if (!v) {
            setMemberToReset(null)
            setNewPassword("")
          }
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <p className="text-sm text-muted-foreground">
              Set a new password for{" "}
              <span className="font-medium text-foreground">
                {memberToReset?.fullName}
              </span>
              .
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="reset-password">New Password</Label>
              <Input
                id="reset-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                aria-required="true"
              />
              {newPassword.length > 0 && newPassword.length < 6 && (
                <p className="text-xs text-error" role="alert">
                  Password must be at least 6 characters.
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setMemberToReset(null)
                setNewPassword("")
              }}
              disabled={resetPassword.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (memberToReset) {
                  resetPassword.mutate({
                    id: memberToReset.id,
                    newPassword,
                  })
                }
              }}
              disabled={resetPassword.isPending || newPassword.length < 6}
            >
              {resetPassword.isPending ? "Resetting…" : "Reset Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
