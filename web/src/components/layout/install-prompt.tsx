/**
 * layout/install-prompt.tsx
 *
 * A dismissible "Install App" banner using the standard beforeinstallprompt
 * flow — ported from main's src/components/pwa/InstallPrompt.tsx (layout,
 * copy, icon, footer hint) with two deliberate improvements over main:
 *
 * - Dismissal is remembered in localStorage (permanent "don't show again"),
 *   not main's sessionStorage (which re-nags every new browser session) —
 *   explicit user request, taking precedence over matching main exactly here.
 * - Explicitly checks `display-mode: standalone` and bails before ever
 *   registering the beforeinstallprompt listener, so it can never appear
 *   once the app is already installed — matching main's own same check,
 *   kept as a deliberate belt-and-suspenders on top of the browser's own
 *   (not fully consistent cross-browser) suppression of that event for an
 *   already-installed PWA.
 */

import { useEffect, useState } from "react"
import { Download, Monitor, Stethoscope, X } from "lucide-react"
import { Button } from "@/components/ui/button"

const DISMISSED_KEY = "docsile-install-prompt-dismissed"

// Not in lib.dom.d.ts yet — minimal shape for what we actually use.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

export function InstallPrompt() {
  const [deferredEvent, setDeferredEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(DISMISSED_KEY) === "true",
  )

  useEffect(() => {
    // Already running as the installed PWA — no prompt needed, ever.
    if (window.matchMedia("(display-mode: standalone)").matches) return
    if (localStorage.getItem(DISMISSED_KEY) === "true") return

    function handleBeforeInstallPrompt(e: Event) {
      e.preventDefault()
      setDeferredEvent(e as BeforeInstallPromptEvent)
    }
    function handleAppInstalled() {
      setDeferredEvent(null)
      localStorage.setItem(DISMISSED_KEY, "true")
    }
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    window.addEventListener("appinstalled", handleAppInstalled)
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
      window.removeEventListener("appinstalled", handleAppInstalled)
    }
  }, [])

  if (!deferredEvent || dismissed) return null

  async function handleInstall() {
    if (!deferredEvent) return
    const { outcome } = await (async () => {
      await deferredEvent.prompt()
      return deferredEvent.userChoice
    })()
    if (outcome === "accepted") setDeferredEvent(null)
  }

  function handleDismiss() {
    setDismissed(true)
    localStorage.setItem(DISMISSED_KEY, "true")
  }

  return (
    <div
      className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4"
      role="region"
      aria-label="Install app prompt"
    >
      <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-overlay)] overflow-hidden motion-list-item-in">
        <div className="h-1 bg-[var(--color-primary)] w-full" />

        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--color-primary)]">
              <Stethoscope className="h-5 w-5 text-[var(--color-primary-foreground)]" aria-hidden="true" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-tight text-[var(--color-foreground)]">
                Install Docsile HMS
              </p>
              <p className="mt-1 text-xs leading-relaxed text-[var(--color-muted-foreground)]">
                Install the app to use it full-screen without browser bars — like a native desktop app.
              </p>

              <div className="mt-3 flex items-center gap-2">
                <Button size="sm" className="h-8 gap-1.5 px-3 text-xs" onClick={() => void handleInstall()}>
                  <Download className="h-3.5 w-3.5" aria-hidden="true" />
                  Install App
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 px-3 text-xs text-[var(--color-muted-foreground)]"
                  onClick={handleDismiss}
                >
                  Not now
                </Button>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDismiss}
              aria-label="Dismiss"
              className="shrink-0 rounded-md p-0.5 text-[var(--color-muted-foreground)] transition-colors hover:text-[var(--color-foreground)]"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 border-t border-[var(--color-border)] bg-[var(--color-muted)]/40 px-4 py-2.5">
          <Monitor className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]" aria-hidden="true" />
          <p className="text-xs text-[var(--color-muted-foreground)]">
            Opens without browser bars — just your app, full screen
          </p>
        </div>
      </div>
    </div>
  )
}
