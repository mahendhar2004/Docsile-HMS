import type { ReactNode } from "react"
import { Sidebar } from "@/components/patterns/navigation/sidebar"

/**
 * AppShell — the persistent frame around every protected route: sidebar on
 * the left, routed page content filling the rest. The Sidebar manages its
 * own collapsed/expanded state internally. Takes `children` (rather than
 * rendering its own <Outlet/>) so the router can wrap the routed content in
 * its own Suspense boundary while the sidebar stays mounted during
 * route-level code-split loading.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 min-w-0 overflow-y-auto">{children}</main>
    </div>
  )
}
