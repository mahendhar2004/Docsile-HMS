/**
 * ui/skeleton.tsx
 *
 * Skeleton — pulsing placeholder block for loading states.
 * Uses --color-muted background and Tailwind's animate-pulse.
 *
 * For text skeletons, use rounded-full + specific widths/heights.
 * For card/block skeletons, use rounded-[--radius-lg] + height.
 *
 * Usage:
 *   // A line of text
 *   <Skeleton className="h-4 w-48 rounded-full" />
 *
 *   // An avatar
 *   <Skeleton className="h-10 w-10 rounded-full" />
 *
 *   // A card block
 *   <Skeleton className="h-32 w-full rounded-[--radius-lg]" />
 *
 * Note: DataTable and DataModal roll their own inline skeleton rows —
 * this primitive is for general-purpose use (e.g. StatCard loading state).
 */

import * as React from "react"
import { cn } from "@/lib/utils"

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      aria-hidden="true"
      className={cn(
        "animate-pulse bg-[--color-muted] rounded-[--radius-sm]",
        className
      )}
      {...props}
    />
  )
)
Skeleton.displayName = "Skeleton"

export { Skeleton }
