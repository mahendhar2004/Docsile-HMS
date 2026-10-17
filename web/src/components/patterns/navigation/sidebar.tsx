import { useState, useRef, useEffect, useCallback } from "react"
import { NavLink, useNavigate } from "react-router-dom"
import {
  LayoutDashboard,
  Users,
  Eye,
  Stethoscope,
  BedDouble,
  Pill,
  Glasses,
  FlaskConical,
  Phone,
  Shield,
  ClipboardList,
  Wallet,
  BarChart3,
  FileBarChart,
  DatabaseZap,
  ScrollText,
  UserCog,
  Settings,
  Menu,
  type LucideIcon,
} from "lucide-react"
import { usePermissions } from "@/hooks/usePermissions"
import { useSessionStore } from "@/store/session"
import { apiClient } from "@/lib/api-client"
import { queryClient } from "@/lib/query-client"
import { UserMenuCard } from "@/components/layout/user-menu-card"

// ─── Types ──────────────────────────────────────────────────────────────────

type NavItem = {
  label: string
  path: string
  icon: LucideIcon
  /** Permission string checked via usePermissions().can(). Omit = always visible. */
  permission?: string
}

type NavGroup = {
  /** Section heading shown above the group; omitted for the lone Dashboard item. */
  label?: string
  items: NavItem[]
}

// ─── Navigation definition ──────────────────────────────────────────────────
// Mirrors main's exact nav-items.ts groups/order/labels (src/components/layout/nav-items.ts).

const NAV_GROUPS: NavGroup[] = [
  {
    items: [{ label: "Dashboard", path: "/dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Clinical",
    items: [
      { label: "Patients",    path: "/patients",   icon: Users,       permission: "patients:view"   },
      { label: "Refraction",  path: "/workup",     icon: Eye,         permission: "workup:view"     },
      { label: "Doctor",      path: "/doctor",     icon: Stethoscope, permission: "doctor:view"     },
      { label: "In-Patients", path: "/inpatients", icon: BedDouble,   permission: "inpatients:view" },
    ],
  },
  {
    label: "Services",
    items: [
      { label: "Pharmacy",  path: "/pharmacy",  icon: Pill,         permission: "pharmacy:view" },
      { label: "Optical",   path: "/optical",   icon: Glasses,      permission: "optical:view"  },
      { label: "Labs",      path: "/labs",      icon: FlaskConical, permission: "labs:view"     },
      { label: "Call Logs", path: "/call-logs", icon: Phone },
    ],
  },
  {
    label: "Finance",
    items: [
      { label: "Insurance",         path: "/insurance",      icon: Shield,        permission: "insurance:view" },
      { label: "Dues & Follow-Ups", path: "/dues-followups", icon: ClipboardList, permission: "dues:view"      },
      { label: "Expenses",          path: "/expenses",       icon: Wallet,        permission: "expenses:view"  },
    ],
  },
  {
    label: "Insights",
    items: [
      { label: "Analytics",   path: "/analytics",       icon: BarChart3,   permission: "reports:view"  },
      { label: "Reports",     path: "/reports",         icon: FileBarChart, permission: "reports:view" },
      { label: "Data Export", path: "/data",            icon: DatabaseZap, permission: "data:export"  },
      { label: "Licenses",    path: "/license-tracker",  icon: ScrollText,  permission: "licenses:view" },
      { label: "Staff",       path: "/staff",            icon: UserCog,     permission: "staff:view"   },
    ],
  },
]

/** Pinned to the sidebar footer, separate from the scrollable group list — matches main's "Configurations" link. */
const SETTINGS_ITEM: NavItem = {
  label: "Configurations",
  path: "/settings",
  icon: Settings,
  permission: "settings:view",
}

// ─── Sidebar ────────────────────────────────────────────────────────────────
// Hover-reveal overlay, matching main's Sidebar.tsx exactly: hidden off-screen
// by default, slides in when the mouse enters the sidebar or comes within a
// few px of the left edge, and auto-hides ~300ms after the mouse leaves.

export function Sidebar() {
  const { can } = usePermissions()
  const user = useSessionStore((s) => s.user)
  const clearSession = useSessionStore((s) => s.clearSession)
  const navigate = useNavigate()

  const [visible, setVisible] = useState(false)
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showSidebar = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current)
      hideTimeoutRef.current = null
    }
    setVisible(true)
  }, [])

  const hideSidebar = useCallback(() => {
    hideTimeoutRef.current = setTimeout(() => setVisible(false), 300)
  }, [])

  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      if (e.clientX <= 6) showSidebar()
    }
    window.addEventListener("mousemove", handleMouseMove)
    return () => window.removeEventListener("mousemove", handleMouseMove)
  }, [showSidebar])

  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current)
    }
  }, [])

  function isVisible(item: NavItem): boolean {
    if (!item.permission) return true
    return can(item.permission)
  }

  const handleLogout = useCallback(() => {
    apiClient.post("/auth/logout").catch(() => {
      // Best-effort — clear the local session and redirect regardless of
      // whether the server call succeeds, matching main's form-POST logout
      // which never surfaces a failure to the user.
    })
    clearSession()
    // Drop every cached query — otherwise the next login (possibly as a
    // different user) could briefly render stale data from this session
    // before each query refetches. Added during final review.
    queryClient.clear()
    navigate("/login", { replace: true })
  }, [clearSession, navigate])

  return (
    <>
      {/* Mobile hamburger — fixed top-left, only visible on small screens when sidebar is closed */}
      {!visible && (
        <button
          type="button"
          className="fixed top-2 left-2 z-50 md:hidden flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-white shadow-md"
          onClick={showSidebar}
          aria-label="Open menu"
        >
          <Menu className="h-4 w-4" aria-hidden="true" />
        </button>
      )}

      {/* Overlay backdrop */}
      {visible && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px] transition-opacity duration-300"
          onClick={() => setVisible(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        onMouseEnter={showSidebar}
        onMouseLeave={hideSidebar}
        onFocusCapture={showSidebar}
        // When hidden, `inert` removes the whole subtree from the tab order
        // and from find-in-page/AT traversal — without it, Tab could move
        // focus into links the user can't see (fixed during final review).
        inert={!visible}
        aria-label="Application sidebar"
        className={[
          "fixed left-0 top-0 z-50 flex h-full w-64 flex-col",
          "bg-[var(--color-sidebar)] border-r border-[var(--color-sidebar-border)] shadow-2xl",
          "transition-transform duration-300 ease-in-out",
          visible ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        {/* Brand */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--color-divider)]">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary shadow-sm">
            <Stethoscope className="h-5 w-5 text-white" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-[var(--color-foreground)] truncate leading-snug">
              Docsile HMS
            </p>
            <p className="text-[11px] text-[var(--color-muted-foreground)] leading-snug">
              Hospital Management
            </p>
          </div>
        </div>

        {/* Navigation */}
        <nav aria-label="Main navigation" className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
          {NAV_GROUPS.map((group, groupIndex) => {
            const visibleItems = group.items.filter(isVisible)
            if (visibleItems.length === 0) return null
            return (
              <div key={groupIndex}>
                {group.label && (
                  <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-[var(--color-muted-foreground)]">
                    {group.label}
                  </p>
                )}
                <div className="space-y-0.5">
                  {visibleItems.map((item) => (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      end={item.path === "/dashboard"}
                      onClick={() => setVisible(false)}
                      className={({ isActive }) =>
                        [
                          "flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-150",
                          isActive
                            ? "bg-primary/8 text-primary"
                            : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-muted)]",
                        ].join(" ")
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <item.icon
                            className={[
                              "h-4 w-4 shrink-0",
                              isActive ? "text-primary" : "text-[var(--color-muted-foreground)]",
                            ].join(" ")}
                            aria-hidden="true"
                          />
                          <span className="truncate">{item.label}</span>
                          {isActive && (
                            <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
                          )}
                        </>
                      )}
                    </NavLink>
                  ))}
                </div>
              </div>
            )
          })}
        </nav>

        {/* Footer: Configurations link + user card */}
        <div className="border-t border-[var(--color-divider)] px-3 pt-3 pb-4 space-y-1">
          {isVisible(SETTINGS_ITEM) && (
            <NavLink
              to={SETTINGS_ITEM.path}
              onClick={() => setVisible(false)}
              className={({ isActive }) =>
                [
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-150",
                  isActive
                    ? "bg-primary/8 text-primary"
                    : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-muted)]",
                ].join(" ")
              }
            >
              {({ isActive }) => (
                <>
                  <SETTINGS_ITEM.icon
                    className={["h-4 w-4 shrink-0", isActive ? "text-primary" : "text-[var(--color-muted-foreground)]"].join(" ")}
                    aria-hidden="true"
                  />
                  <span>{SETTINGS_ITEM.label}</span>
                </>
              )}
            </NavLink>
          )}

          {user && (
            <UserMenuCard fullName={user.name} role={user.role} onLogout={handleLogout} />
          )}
        </div>
      </aside>
    </>
  )
}
