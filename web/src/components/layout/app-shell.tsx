import type { ReactNode } from "react"
import { Sidebar } from "@/components/patterns/navigation/sidebar"
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
 * The global Sitha AI floating widget (`./sitha-widget`) is deliberately
 * NOT mounted — explicit product decision (2026-10-14): AI isn't part of
 * reception/front-desk workflows for now. Per-page "Ask Sitha" header
 * buttons were removed to match. The component itself is untouched, so
 * re-enabling later is a two-line change (re-add the import + mount here).
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
      <InstallPrompt />
    </div>
  )
}
