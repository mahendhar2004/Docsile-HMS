import { useState, useCallback } from "react"
import { NavLink } from "react-router-dom"
import {
  LayoutDashboard,
  Users,
  Receipt,
  Pill,
  FlaskConical,
  Glasses,
  ShieldCheck,
  ListOrdered,
  Stethoscope,
  ClipboardPlus,
  UserCog,
  Settings,
  Wallet,
  Bell,
  PhoneCall,
  BadgeCheck,
  BarChart2,
  FileText,
  ChevronLeft,
  ChevronRight,
  type LucideIcon,
} from "lucide-react"
import { usePermissions } from "@/hooks/usePermissions"

// ─── Types ──────────────────────────────────────────────────────────────────

type NavItem = {
  label: string
  path: string
  icon: LucideIcon
  /** Permission string checked via usePermissions().can(). Omit = always visible. */
  permission?: string
}

type NavGroup = {
  /** Section heading shown in expanded mode; replaced by a divider when collapsed. */
  label?: string
  items: NavItem[]
}

// ─── Navigation definition ───────────────────────────────────────────────────

const NAV_GROUPS: NavGroup[] = [
  {
    items: [
      { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Clinical",
    items: [
      { label: "Patients",  path: "/patients",  icon: Users,         permission: "patients:view"  },
      { label: "Billing",   path: "/billing",   icon: Receipt,       permission: "billing:view"   },
      { label: "Pharmacy",  path: "/pharmacy",  icon: Pill,          permission: "pharmacy:view"  },
      { label: "Labs",      path: "/labs",      icon: FlaskConical,  permission: "labs:view"      },
      { label: "Optical",   path: "/optical",   icon: Glasses,       permission: "optical:view"   },
      { label: "Insurance", path: "/insurance", icon: ShieldCheck,   permission: "insurance:view" },
      { label: "Queue",     path: "/queue",     icon: ListOrdered,   permission: "queue:view"     },
      { label: "Doctor",    path: "/doctor",    icon: Stethoscope,   permission: "doctor:view"    },
      { label: "Workup",    path: "/workup",    icon: ClipboardPlus, permission: "workup:view"    },
    ],
  },
  {
    label: "Operations",
    items: [
      { label: "Staff",             path: "/staff",            icon: UserCog,   permission: "staff:view"    },
      { label: "Expenses",          path: "/expenses",         icon: Wallet,    permission: "expenses:view" },
      { label: "Dues & Follow-ups", path: "/dues-followups",   icon: Bell,      permission: "dues:view"     },
      { label: "Call Logs",         path: "/call-logs",        icon: PhoneCall, permission: "call_logs:view" },
      { label: "License Tracker",   path: "/license-tracker",  icon: BadgeCheck, permission: "licenses:view" },
    ],
  },
  {
    label: "Analytics",
    items: [
      // Both AnalyticsPage and ReportsPage gate on reports:view — there is no
      // separate analytics:view permission key in src/lib/permissions.ts.
      { label: "Analytics", path: "/analytics", icon: BarChart2, permission: "reports:view" },
      { label: "Reports",   path: "/reports",   icon: FileText,  permission: "reports:view" },
    ],
  },
]

/** Settings is pinned to the sidebar footer, separate from the scrollable group list. */
const SETTINGS_ITEM: NavItem = {
  label: "Settings",
  path: "/settings",
  icon: Settings,
  permission: "settings:view",
}

// ─── Internal NavItemLink ─────────────────────────────────────────────────────

type NavItemLinkProps = {
  item: NavItem
  collapsed: boolean
}

function NavItemLink({ item, collapsed }: NavItemLinkProps) {
  const Icon = item.icon
  return (
    <NavLink
      to={item.path}
      end={item.path === "/dashboard"}
      title={collapsed ? item.label : undefined}
      aria-label={item.label}
      className={({ isActive }) =>
        [
          "flex items-center gap-3 px-3 py-2 w-full rounded-[var(--radius-sm)]",
          "text-sm font-medium whitespace-nowrap overflow-hidden",
          "motion-interactive outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-1",
          isActive
            ? "bg-[rgba(37,99,235,0.06)] text-[var(--color-sidebar-active-foreground)]"
            : "text-[var(--color-sidebar-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]",
        ].join(" ")
      }
    >
      {({ isActive }) => (
        <>
          <Icon
            size={18}
            className="shrink-0"
            aria-hidden="true"
            style={isActive ? { color: "var(--color-sidebar-active-foreground)" } : undefined}
          />
          {!collapsed && <span className="truncate">{item.label}</span>}
        </>
      )}
    </NavLink>
  )
}

// ─── Sidebar component ────────────────────────────────────────────────────────

export interface SidebarProps {
  /**
   * Control collapse state externally. When provided, the component is
   * controlled and `onCollapsedChange` fires on toggle. When omitted,
   * the sidebar manages its own internal state.
   */
  collapsed?: boolean
  onCollapsedChange?: (collapsed: boolean) => void
  className?: string
}

export function Sidebar({
  collapsed: controlledCollapsed,
  onCollapsedChange,
  className = "",
}: SidebarProps) {
  const [internalCollapsed, setInternalCollapsed] = useState(false)
  const { can } = usePermissions()

  const isCollapsed =
    controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed

  const handleToggle = useCallback(() => {
    const next = !isCollapsed
    if (controlledCollapsed !== undefined) {
      onCollapsedChange?.(next)
    } else {
      setInternalCollapsed(next)
    }
  }, [isCollapsed, controlledCollapsed, onCollapsedChange])

  function isVisible(item: NavItem): boolean {
    if (!item.permission) return true
    return can(item.permission)
  }

  return (
    <aside
      style={{
        width: isCollapsed ? "3.5rem" : "15rem",
        transition: `width var(--duration-macro) var(--ease-spring)`,
        backgroundColor: "var(--color-sidebar)",
        borderRight: "1px solid var(--color-sidebar-border)",
      }}
      className={`flex flex-col h-full shrink-0 overflow-hidden ${className}`}
      aria-label="Application sidebar"
    >
      {/* ── Header: logo/app name + collapse toggle ── */}
      <div
        className={`flex items-center px-3 py-4 ${isCollapsed ? "justify-center" : "justify-between"}`}
        style={{ minHeight: "64px" }}
      >
        {!isCollapsed && (
          <span
            className="text-sm font-bold tracking-tight truncate"
            style={{ color: "var(--color-foreground)" }}
          >
            Docsile HMS
          </span>
        )}
        <button
          type="button"
          onClick={handleToggle}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!isCollapsed}
          className={[
            "flex items-center justify-center w-8 h-8 rounded-[var(--radius-sm)] shrink-0",
            "motion-interactive outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]",
            "hover:bg-[var(--color-muted)]",
          ].join(" ")}
          style={{ color: "var(--color-muted-foreground)" }}
        >
          {isCollapsed ? (
            <ChevronRight size={16} aria-hidden="true" />
          ) : (
            <ChevronLeft size={16} aria-hidden="true" />
          )}
        </button>
      </div>

      {/* ── Scrollable nav groups ── */}
      <nav
        aria-label="Main navigation"
        className="flex-1 overflow-y-auto overflow-x-hidden px-2 pb-2"
      >
        {NAV_GROUPS.map((group, groupIndex) => {
          const visibleItems = group.items.filter(isVisible)
          if (visibleItems.length === 0) return null
          return (
            <div key={groupIndex} className="mb-1">
              {/* Section label in expanded mode */}
              {group.label && !isCollapsed && (
                <p
                  className="px-3 py-1.5 text-xs font-semibold tracking-widest uppercase select-none"
                  style={{ color: "var(--color-muted-foreground)" }}
                >
                  {group.label}
                </p>
              )}
              {/* Divider replacing the label in collapsed mode */}
              {group.label && isCollapsed && (
                <div
                  className="my-2 mx-2"
                  style={{ height: "1px", backgroundColor: "var(--color-sidebar-border)" }}
                  role="separator"
                  aria-hidden="true"
                />
              )}
              <ul role="list" className="space-y-0.5">
                {visibleItems.map((item) => (
                  <li key={item.path}>
                    <NavItemLink item={item} collapsed={isCollapsed} />
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </nav>

      {/* ── Footer: settings pinned at bottom ── */}
      <div
        className="px-2 py-3 shrink-0"
        style={{ borderTop: "1px solid var(--color-sidebar-border)" }}
      >
        <ul role="list">
          {isVisible(SETTINGS_ITEM) && (
            <li>
              <NavItemLink item={SETTINGS_ITEM} collapsed={isCollapsed} />
            </li>
          )}
        </ul>
      </div>
    </aside>
  )
}
