/**
 * layout/pwa-update-prompt.tsx
 *
 * Belt-and-suspenders safety net on top of vite-plugin-pwa's own
 * `registerType: "autoUpdate"` (vite.config.ts) — that mode already tries to
 * skip-waiting and reload automatically the next time workbox's update
 * check resolves, but nothing in the app ever surfaced that check failing
 * to fire promptly, or an already-open tab never getting a chance to
 * re-check at all. Found this session: a tab left open across a deploy
 * kept running the OLD JS bundle against the NEW backend schema, producing
 * confusing client/server mismatch errors with no visible cause — the only
 * fix at the time was manually unregistering the service worker.
 *
 * This surfaces the same `needRefresh` signal `autoUpdate` already computes
 * as a visible "Update available" toast with a Reload action, so a stuck
 * tab is never silently wrong — worst case, the user sees a toast and
 * clicks Reload instead of the page silently never updating.
 */

import { useEffect } from "react"
import { useRegisterSW } from "virtual:pwa-register/react"
import { RefreshCw } from "lucide-react"
import { toast } from "@/components/ui/sonner"

export function PwaUpdatePrompt() {
  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW()

  useEffect(() => {
    if (!needRefresh) return
    const toastId = toast.info("A new version of Docsile HMS is available.", {
      duration: Infinity,
      icon: <RefreshCw className="h-4 w-4" aria-hidden="true" />,
      action: {
        label: "Reload",
        onClick: () => void updateServiceWorker(true),
      },
    })
    return () => {
      toast.dismiss(toastId)
    }
  }, [needRefresh, updateServiceWorker])

  return null
}
