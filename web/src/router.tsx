import React, { Suspense, useEffect } from "react"
import {
  createBrowserRouter,
  Navigate,
  Outlet,
  RouterProvider,
} from "react-router-dom"
import { Loader2 } from "lucide-react"
import { useSessionStore } from "@/store/session"
import { checkSession } from "@/lib/api-client"
import { Skeleton } from "@/components/ui/skeleton"
import { AppShell } from "@/components/layout/app-shell"

// Lazy-load all page components (route-level code splitting)
const LoginPage = React.lazy(() => import("@/pages/LoginPage"))
const DashboardPage = React.lazy(() => import("@/pages/DashboardPage"))
const PatientsPage = React.lazy(() => import("@/pages/PatientsPage"))
const PatientDetailPage = React.lazy(() => import("@/pages/patient-care/patient-detail-page"))
const InPatientsPage = React.lazy(() => import("@/pages/InPatientsPage"))
const PharmacyPage = React.lazy(() => import("@/pages/PharmacyPage"))
const LabsPage = React.lazy(() => import("@/pages/LabsPage"))
const OpticalPage = React.lazy(() => import("@/pages/OpticalPage"))
const InsurancePage = React.lazy(() => import("@/pages/InsurancePage"))
const DoctorPage = React.lazy(() => import("@/pages/DoctorPage"))
const StaffPage = React.lazy(() => import("@/pages/StaffPage"))
const SettingsPage = React.lazy(() => import("@/pages/SettingsPage"))
const AnalyticsPage = React.lazy(() => import("@/pages/AnalyticsPage"))
const ReportsPage = React.lazy(() => import("@/pages/ReportsPage"))
const DataExportPage = React.lazy(() => import("@/pages/DataExportPage"))
const UnauthorizedPage = React.lazy(() => import("@/pages/UnauthorizedPage"))
const WorkupPage = React.lazy(() => import("@/pages/WorkupPage"))
const ExpensesPage = React.lazy(() => import("@/pages/ExpensesPage"))
const DuesFollowupsPage = React.lazy(() => import("@/pages/DuesFollowupsPage"))
const CallLogsPage = React.lazy(() => import("@/pages/CallLogsPage"))
const LicenseTrackerPage = React.lazy(() => import("@/pages/LicenseTrackerPage"))

/**
 * Page-level loading skeleton shown while lazy chunks are loading.
 */
function PageSkeleton() {
  return (
    <div className="p-6 space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-96" />
      <div className="grid grid-cols-3 gap-4 mt-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    </div>
  )
}

/**
 * Wraps protected routes. Redirects unauthenticated users to /login.
 * By the time this renders, AppRouter below has already resolved the
 * "checking" boot state, so status here is always a definite
 * "authenticated" or "unauthenticated" — never a stale in-memory read.
 */
function ProtectedRoute() {
  const status = useSessionStore((s) => s.status)
  if (status !== "authenticated") {
    return <Navigate to="/login" replace />
  }
  return (
    <AppShell>
      <Suspense fallback={<PageSkeleton />}>
        <Outlet />
      </Suspense>
    </AppShell>
  )
}

/**
 * Full-page loading state shown only during the one-time app-boot session
 * check (see AppRouter) — never shown again after that resolves.
 */
function BootLoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-[var(--color-muted-foreground)]" aria-hidden />
    </div>
  )
}

const router = createBrowserRouter([
  // Public
  {
    path: "/login",
    element: (
      <Suspense fallback={<PageSkeleton />}>
        <LoginPage />
      </Suspense>
    ),
  },

  // Protected app shell
  {
    path: "/",
    element: <ProtectedRoute />,
    children: [
      // Root redirect
      { index: true, element: <Navigate to="/dashboard" replace /> },

      // Dashboard
      { path: "dashboard", element: <DashboardPage /> },

      // Clinical modules
      { path: "patients", element: <PatientsPage /> },
      { path: "patients/:id", element: <PatientDetailPage /> },
      { path: "inpatients", element: <InPatientsPage /> },
      { path: "pharmacy", element: <PharmacyPage /> },
      { path: "labs", element: <LabsPage /> },
      { path: "optical", element: <OpticalPage /> },
      { path: "insurance", element: <InsurancePage /> },
      { path: "doctor", element: <DoctorPage /> },
      { path: "workup", element: <WorkupPage /> },

      // Operations modules
      { path: "staff", element: <StaffPage /> },
      { path: "settings", element: <SettingsPage /> },
      { path: "expenses", element: <ExpensesPage /> },
      { path: "dues-followups", element: <DuesFollowupsPage /> },
      { path: "call-logs", element: <CallLogsPage /> },
      { path: "license-tracker", element: <LicenseTrackerPage /> },

      // Analytics & reporting
      { path: "analytics", element: <AnalyticsPage /> },
      { path: "reports", element: <ReportsPage /> },
      { path: "data", element: <DataExportPage /> },
      { path: "unauthorized", element: <UnauthorizedPage /> },
    ],
  },

  // Fallback
  { path: "*", element: <Navigate to="/dashboard" replace /> },
])

/**
 * Runs once per page load, before any route renders: attempts a silent
 * refresh from the HttpOnly cookie so a hard reload (or a fresh tab) can
 * restore a valid session instead of unconditionally bouncing to /login —
 * the session store starts every page load in "checking" status specifically
 * to give this a chance to run first.
 */
export function AppRouter() {
  const status = useSessionStore((s) => s.status)

  useEffect(() => {
    if (status !== "checking") return
    void checkSession()
  }, [status])

  if (status === "checking") {
    return <BootLoadingScreen />
  }

  return <RouterProvider router={router} />
}
