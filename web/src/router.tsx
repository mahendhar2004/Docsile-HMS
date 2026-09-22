import React, { Suspense } from "react"
import {
  createBrowserRouter,
  Navigate,
  Outlet,
  RouterProvider,
} from "react-router-dom"
import { useSessionStore } from "@/store/session"
import { Skeleton } from "@/components/ui/skeleton"

// Lazy-load all page components (route-level code splitting)
const LoginPage = React.lazy(() => import("@/pages/LoginPage"))
const DashboardPage = React.lazy(() => import("@/pages/DashboardPage"))
const PatientCarePage = React.lazy(() => import("@/pages/PatientCarePage"))
const BillingPage = React.lazy(() => import("@/pages/BillingPage"))
const PharmacyPage = React.lazy(() => import("@/pages/PharmacyPage"))
const LabsPage = React.lazy(() => import("@/pages/LabsPage"))
const OpticalPage = React.lazy(() => import("@/pages/OpticalPage"))
const InsurancePage = React.lazy(() => import("@/pages/InsurancePage"))
const QueuePage = React.lazy(() => import("@/pages/QueuePage"))
const DoctorPage = React.lazy(() => import("@/pages/DoctorPage"))
const StaffPage = React.lazy(() => import("@/pages/StaffPage"))
const SettingsPage = React.lazy(() => import("@/pages/SettingsPage"))
const AnalyticsPage = React.lazy(() => import("@/pages/AnalyticsPage"))
const ReportsPage = React.lazy(() => import("@/pages/ReportsPage"))
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
 * The session is stored in Zustand (in-memory). On hard reload the store
 * is empty, so the user is redirected to /login, which calls POST /auth/refresh
 * to attempt silent reauthentication from the HttpOnly cookie.
 */
function ProtectedRoute() {
  const isAuthenticated = useSessionStore((s) => s.isAuthenticated)
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Outlet />
    </Suspense>
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
      { path: "patients", element: <PatientCarePage /> },
      { path: "billing", element: <BillingPage /> },
      { path: "pharmacy", element: <PharmacyPage /> },
      { path: "labs", element: <LabsPage /> },
      { path: "optical", element: <OpticalPage /> },
      { path: "insurance", element: <InsurancePage /> },
      { path: "queue", element: <QueuePage /> },
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
    ],
  },

  // Fallback
  { path: "*", element: <Navigate to="/dashboard" replace /> },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}
