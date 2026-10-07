import type { ReactNode } from "react"
import { Sidebar } from "@/components/patterns/navigation/sidebar"
import { SithaWidget } from "./sitha-widget"
import { InstallPrompt } from "./install-prompt"

/**
 * AppShell — the persistent frame around every protected route. Matches
 * main's (hospital) layout.tsx: the Sidebar is a hover-reveal overlay (see
 * patterns/navigation/sidebar.tsx), not a permanent-width rail, so content
 * fills the full viewport width underneath it. Content padding is owned
 * here (matching main's responsive `px-3 py-4 md:px-4 md:py-6 lg:px-6
 * lg:pt-6 lg:pb-8`) instead of each page applying its own flat `p-6`.
 *
 * Takes `children` (rather than rendering its own <Outlet/>) so the router
 * can wrap the routed content in its own Suspense boundary while the
 * sidebar stays mounted during route-level code-split loading.
 *
 * Also mounts the two persistent, page-independent overlays: the global
 * Sitha AI floating widget and the PWA install prompt.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="h-screen overflow-hidden bg-[var(--color-background)] flex flex-col">
      <Sidebar />
      <main className="h-full overflow-y-auto flex-1">
        <div className="min-h-full px-3 py-4 md:px-4 md:py-6 lg:px-6 lg:pt-6 lg:pb-8">
          {children}
        </div>
      </main>
      <SithaWidget />
      <InstallPrompt />
    </div>
  )
}
