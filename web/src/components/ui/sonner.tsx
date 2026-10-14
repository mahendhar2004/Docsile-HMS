/**
 * ui/sonner.tsx
 *
 * Themed Toaster wrapper around the `sonner` library.
 *
 * Maps our design-token color variables onto sonner's CSS variable names so
 * success/warning/error/info toasts use the same semantic soft-color palette
 * as StatusPills and AlertBanners. Always `theme="light"` — we are light-mode
 * only for this pass.
 *
 * Place once in the app root (e.g. App.tsx):
 *   <Toaster />
 *
 * Trigger toasts anywhere via the re-exported `toast` helper:
 *   import { toast } from "@/components/ui/sonner"
 *   toast.success("Patient registered")
 *   toast.error("Failed to save", { description: "Check your connection." })
 */

import * as React from "react"
import { Toaster as SonnerToaster, toast } from "sonner"
import {
  CircleCheck,
  Info,
  TriangleAlert,
  OctagonX,
  Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"

/* ─── Types ─────────────────────────────────────────────────────────────────── */

type ToasterProps = React.ComponentProps<typeof SonnerToaster>

/* ─── Toaster ───────────────────────────────────────────────────────────────── */

const Toaster = ({ className, ...props }: ToasterProps) => (
  <SonnerToaster
    theme="light"
    richColors
    position="top-right"
    closeButton
    className={cn("toaster", className)}
    icons={{
      success: <CircleCheck size={16} aria-hidden="true" />,
      info: <Info size={16} aria-hidden="true" />,
      warning: <TriangleAlert size={16} aria-hidden="true" />,
      error: <OctagonX size={16} aria-hidden="true" />,
      loading: <Loader2 size={16} className="animate-spin" aria-hidden="true" />,
    }}
    style={
      {
        // Map our CSS token names onto sonner's internal CSS variable names.
        // These override sonner's default palette when richColors is active.
        "--success-bg": "var(--color-success-soft)",
        "--success-border": "var(--color-success)",
        "--success-text": "var(--color-success-soft-foreground)",
        "--error-bg": "var(--color-error-soft)",
        "--error-border": "var(--color-error)",
        "--error-text": "var(--color-error-soft-foreground)",
        "--warning-bg": "var(--color-warning-soft)",
        "--warning-border": "var(--color-warning)",
        "--warning-text": "var(--color-warning-soft-foreground)",
        "--info-bg": "var(--color-info-soft)",
        "--info-border": "var(--color-info)",
        "--info-text": "var(--color-info-soft-foreground)",
        "--normal-bg": "var(--color-surface)",
        "--normal-border": "var(--color-border)",
        "--normal-text": "var(--color-foreground)",
        "--border-radius": "var(--radius)",
        "--font-family": "var(--font-sans)",
        // Toasts float above page content — use the popover elevation tier
        // (hairline ring + strong blur shadow) so they read as clearly lifted.
        "--toast-shadow": "var(--shadow-popover)",
      } as React.CSSProperties
    }
    toastOptions={{
      classNames: {
        // Entrance animation uses our .motion-toast-in utility (toast-in keyframe
        // + --ease-spring + --duration-macro) for an expressive spring pop-in.
        toast: "motion-toast-in",
        description: "opacity-80",
      },
    }}
    {...props}
  />
)
Toaster.displayName = "Toaster"

export { Toaster, toast }
