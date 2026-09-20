"use client"

import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { cn } from "@/lib/utils"

interface BackToDashboardProps {
  className?: string
}

/**
 * Inline back-to-dashboard button. Place at the end of a page/module header
 * so it appears on the right side.
 */
export function BackToDashboard({ className }: BackToDashboardProps) {
  const router = useRouter()

  return (
    <button
      onClick={() => router.push("/dashboard")}
      title="Back to Dashboard"
      aria-label="Back to Dashboard"
      className={cn(
        "h-8 px-2.5 shrink-0 inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-white text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors",
        className,
      )}
    >
      <ArrowLeft className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">Dashboard</span>
    </button>
  )
}
