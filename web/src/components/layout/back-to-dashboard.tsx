/**
 * layout/back-to-dashboard.tsx
 *
 * Inline back-to-dashboard button, matching main's BackToDashboard.tsx
 * exactly. Rendered automatically by PageHeader on every page except
 * Dashboard itself (see page-header.tsx).
 */

import { useNavigate } from "react-router-dom"
import { ArrowLeft } from "lucide-react"
import { cn } from "@/lib/utils"

export interface BackToDashboardProps {
  className?: string
}

export function BackToDashboard({ className }: BackToDashboardProps) {
  const navigate = useNavigate()

  return (
    <button
      type="button"
      onClick={() => navigate("/dashboard")}
      title="Back to Dashboard"
      aria-label="Back to Dashboard"
      className={cn(
        "h-8 px-2.5 shrink-0 inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-white text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors",
        className,
      )}
    >
      <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
      <span className="hidden sm:inline">Dashboard</span>
    </button>
  )
}
