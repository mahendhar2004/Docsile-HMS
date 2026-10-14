import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { QueryClientProvider } from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import { queryClient } from "@/lib/query-client"
import { AppRouter } from "@/router"
import { Toaster } from "@/components/ui/sonner"
import { PwaUpdatePrompt } from "@/components/layout/pwa-update-prompt"
import "./index.css"

const rootElement = document.getElementById("root")
if (!rootElement) throw new Error("Root element #root not found in index.html")

/**
 * Mock mode — VITE_USE_MOCKS=true (npm run dev:mock) starts an MSW worker
 * that intercepts every API call with fake data, so the app runs fully
 * client-side with no real Supabase backend. See web/src/mocks/.
 */
async function prepare() {
  if (import.meta.env.DEV && import.meta.env.VITE_USE_MOCKS === "true") {
    const { worker } = await import("./mocks/browser")
    // "warn" (not "bypass") so an unmocked/mismatched endpoint logs the exact
    // URL to the console instead of silently falling through to Vite's dev
    // server, which serves index.html for any unmatched path — that HTML
    // response is what produces "Unexpected token '<' ... is not valid JSON".
    await worker.start({ onUnhandledRequest: "warn" })
  }
}

prepare().then(() => {
  createRoot(rootElement).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <AppRouter />
        <Toaster position="top-right" richColors />
        <PwaUpdatePrompt />
        {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
      </QueryClientProvider>
    </StrictMode>,
  )
})
