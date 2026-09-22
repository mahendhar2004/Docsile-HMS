/**
 * layout/install-prompt.tsx
 *
 * A dismissible "Install App" banner using the standard beforeinstallprompt
 * flow — the PWA infra (manifest + service worker) was already wired up in
 * vite.config.ts, but nothing in the app ever surfaced an install action.
 * Browsers can show their own small install icon, but that's easy to miss;
 * this makes installability an explicit, discoverable choice.
 *
 * Dismissal is remembered in localStorage (per-browser, not per-session) so
 * it doesn't nag on every visit — but it comes back if the browser fires a
 * fresh beforeinstallprompt (e.g. after the site data is cleared).
 */

import { useEffect, useState } from "react"
import { Download, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { IconButton } from "@/components/ui/icon-button"

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
    await deferredEvent.prompt()
    await deferredEvent.userChoice
    setDeferredEvent(null)
  }

  function handleDismiss() {
    setDismissed(true)
    localStorage.setItem(DISMISSED_KEY, "true")
  }

  return (
    <div
      className={[
        "fixed bottom-4 left-4 z-50 flex items-center gap-3 max-w-sm",
        "rounded-[var(--radius-lg)] bg-[var(--color-card)] shadow-[var(--shadow-overlay)]",
        "px-4 py-3 motion-list-item-in",
      ].join(" ")}
      role="region"
      aria-label="Install app prompt"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary)]">
        <Download size={18} className="text-[var(--color-primary-foreground)]" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[length:var(--text-body)] font-medium text-[var(--color-foreground)]">
          Install Docsile HMS
        </p>
        <p className="text-[length:var(--text-caption)] text-[var(--color-muted-foreground)]">
          Add it to your device for faster access.
        </p>
      </div>
      <Button size="sm" onClick={() => void handleInstall()} aria-label="Install the app">
        Install
      </Button>
      <IconButton
        variant="ghost"
        size="sm"
        aria-label="Dismiss install prompt"
        onClick={handleDismiss}
      >
        <X size={16} aria-hidden="true" />
      </IconButton>
    </div>
  )
}
