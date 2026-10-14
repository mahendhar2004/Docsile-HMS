/**
 * DashboardPage — static module-navigation grid, matching main's
 * DashboardClient.tsx exactly (src/app/(hospital)/dashboard/DashboardClient.tsx
 * + page.tsx on main) for the grid of module nav cards.
 *
 * Main's `enabledModules` admin-config gate doesn't exist in this app (no
 * equivalent hospital-wide module-enablement system was migrated), so
 * per-tile visibility uses the same permission keys as the Sidebar instead
 * — main's own comment notes permission checks are "currently disabled at
 * the app level" there anyway, so this is at least as permissive as main.
 *
 * Deliberate deviation from main (2026-10-14, explicit request): the
 * greeting banner + rotating quote block main has above the grid is
 * removed — straight into the module grid instead.
 */

import { Link } from "react-router-dom"
import {
  Users,
  Eye,
  Stethoscope,
  BedDouble,
  Pill,
  Glasses,
  FlaskConical,
  Shield,
  ClipboardList,
  Wallet,
  BarChart3,
  FileBarChart,
  DatabaseZap,
  ScrollText,
  UserCog,
  Settings,
  ArrowRight,
  type LucideIcon,
} from "lucide-react"
import { usePermissions } from "@/hooks/usePermissions"

// ─── Module sections (labels/descriptions/icon tints verbatim from main) ────

type DashboardModule = {
  href: string
  icon: LucideIcon
  label: string
  description: string
  iconBg: string
  iconColor: string
  permission?: string
}

type DashboardSection = {
  label: string
  items: DashboardModule[]
}

const sections: DashboardSection[] = [
  {
    label: "Clinical",
    items: [
      { href: "/patients",   icon: Users,       label: "Patients",        description: "Register and manage OPD & IPD patient visits, appointments and billing", iconBg: "bg-blue-50",    iconColor: "text-blue-500",   permission: "patients:view" },
      { href: "/workup",     icon: Eye,         label: "Refraction",      description: "Pre-consultation eye assessment with refraction and clinical findings",    iconBg: "bg-sky-50",     iconColor: "text-sky-500",    permission: "workup:view" },
      { href: "/doctor",     icon: Stethoscope, label: "Doctor Console",  description: "Diagnosis, prescriptions, vitals recording and follow-up notes",            iconBg: "bg-indigo-50",  iconColor: "text-indigo-500", permission: "doctor:view" },
      { href: "/inpatients", icon: BedDouble,   label: "In-Patients",     description: "Patient admissions, surgery tracking, billing and discharge",               iconBg: "bg-violet-50",  iconColor: "text-violet-500", permission: "inpatients:view" },
    ],
  },
  {
    label: "Services",
    items: [
      { href: "/pharmacy", icon: Pill,         label: "Pharmacy", description: "Medicine inventory, billing, suppliers and purchase orders",        iconBg: "bg-emerald-50", iconColor: "text-emerald-600", permission: "pharmacy:view" },
      { href: "/optical",  icon: Glasses,      label: "Optical",  description: "Frames, lenses and contact lens inventory with AR readings",         iconBg: "bg-blue-50",    iconColor: "text-blue-600",     permission: "optical:view" },
      { href: "/labs",     icon: FlaskConical, label: "Labs",     description: "Lab investigations, test billing and report configuration",          iconBg: "bg-teal-50",    iconColor: "text-teal-600",     permission: "labs:view" },
    ],
  },
  {
    label: "Finance",
    items: [
      { href: "/insurance",       icon: Shield,        label: "Insurance",           description: "TPA insurance claims, preauth tracking and settlements",            iconBg: "bg-cyan-50",  iconColor: "text-cyan-600",  permission: "insurance:view" },
      { href: "/dues-followups",  icon: ClipboardList, label: "Dues & Follow-Ups",   description: "Track pending dues and schedule patient follow-up reminders",        iconBg: "bg-amber-50", iconColor: "text-amber-600", permission: "dues:view" },
      { href: "/expenses",        icon: Wallet,        label: "Expenses",            description: "Record and categorize hospital expenses and expenditures",          iconBg: "bg-orange-50", iconColor: "text-orange-500", permission: "expenses:view" },
    ],
  },
  {
    label: "Insights",
    items: [
      { href: "/analytics",       icon: BarChart3,    label: "Analytics",   description: "Comprehensive dashboard with trends, financials and insights",       iconBg: "bg-rose-50",   iconColor: "text-rose-500" },
      { href: "/reports",         icon: FileBarChart, label: "Reports",     description: "Patient history, visit records, prescriptions and billing reports", iconBg: "bg-sky-50",    iconColor: "text-sky-600",   permission: "reports:view" },
      { href: "/data",            icon: DatabaseZap,  label: "Data Export", description: "Select, filter and export hospital data in CSV or Excel",           iconBg: "bg-cyan-50",   iconColor: "text-cyan-700",  permission: "data:export" },
      { href: "/license-tracker", icon: ScrollText,   label: "Licenses",    description: "Track hospital licenses, registrations and renewal dates",          iconBg: "bg-indigo-50", iconColor: "text-indigo-600", permission: "licenses:view" },
    ],
  },
  {
    label: "Administration",
    items: [
      { href: "/staff",    icon: UserCog,  label: "Staff",          description: "Manage staff members, roles and module-level permissions",      iconBg: "bg-purple-50", iconColor: "text-purple-600", permission: "staff:view" },
      { href: "/settings", icon: Settings, label: "Configurations", description: "Hospital profile, service templates and user management",         iconBg: "bg-slate-100", iconColor: "text-slate-600",  permission: "settings:view" },
    ],
  },
]

export default function DashboardPage() {
  const { can } = usePermissions()

  const visibleSections = sections
    .map((s) => ({
      ...s,
      items: s.items.filter((item) => !item.permission || can(item.permission)),
    }))
    .filter((s) => s.items.length > 0)

  return (
    <div className="-mx-3 -my-4 md:-mx-4 md:-my-6 lg:-mx-6 lg:-mb-8 min-h-[calc(100vh-4rem)] bg-white">
      <div className="max-w-6xl mx-auto px-3 py-4 md:px-4 md:py-6 lg:px-6 lg:pt-6 lg:pb-8">
        {/* Sectioned Modules */}
        <div className="space-y-8 sm:space-y-10 mt-8 md:mt-0">
          {visibleSections.map((section) => (
            <section key={section.label} aria-label={section.label}>
              <div className="flex items-center gap-3 mb-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground shrink-0">
                  {section.label}
                </p>
                <div className="h-px flex-1 bg-border/60" />
                <span className="text-xs text-muted-foreground/70 shrink-0">
                  {section.items.length}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {section.items.map((mod) => (
                  <Link
                    key={mod.href}
                    to={mod.href}
                    className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm ring-1 ring-slate-900/[0.02] hover:shadow-md hover:border-slate-300 hover:ring-slate-900/[0.04]"
                  >
                    <div
                      aria-hidden="true"
                      className={`pointer-events-none absolute -top-8 -right-8 h-24 w-24 rounded-full ${mod.iconBg} opacity-40 blur-2xl`}
                    />
                    <div className="relative">
                      <div className="flex items-start justify-between mb-4">
                        <div
                          className={`h-11 w-11 rounded-xl ${mod.iconBg} ring-1 ring-inset ring-white/60 shadow-sm flex items-center justify-center`}
                        >
                          <mod.icon className={`h-5 w-5 ${mod.iconColor}`} aria-hidden="true" />
                        </div>
                        <div className="h-7 w-7 rounded-full bg-slate-100 text-slate-400 group-hover:bg-slate-900 group-hover:text-white flex items-center justify-center">
                          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                        </div>
                      </div>
                      <h3 className="text-[15px] font-semibold text-slate-900 tracking-tight mb-1">
                        {mod.label}
                      </h3>
                      <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                        {mod.description}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
