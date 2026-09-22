/**
 * ui/card.tsx
 *
 * Card primitive — generic surface container.
 *
 * Composition:
 *   Card > CardHeader > CardTitle + CardDescription
 *   Card > CardContent
 *   Card > CardFooter
 *
 * Variants:
 *   elevated (default) — hairline ring + soft resting shadow (--shadow-card),
 *                        the standard dashboard/panel card look
 *   flat               — hairline ring only, no shadow (use inside another
 *                        elevated surface, e.g. a detail panel inside a sheet)
 *
 * Both use the same box-shadow-based ring (--shadow-border / --shadow-card)
 * rather than the `border` property — renders crisp at any radius and lets
 * `interactive` swap in --shadow-card-hover without a border/shadow seam.
 *
 * Props:
 *   interactive — adds hover/active micro-feedback via .motion-interactive +
 *                 a lifted shadow + faint tint; use for clickable nav/dashboard tiles
 */

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

/* ─── Card root ─────────────────────────────────────────────────────────────── */

const cardVariants = cva(
  [
    "rounded-[--radius-lg]",
    "bg-[--color-card] text-[--color-card-foreground]",
  ],
  {
    variants: {
      variant: {
        elevated: "shadow-[--shadow-card]",
        flat: "shadow-[--shadow-border]",
      },
    },
    defaultVariants: {
      variant: "elevated",
    },
  }
)

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  /** Makes the card look and feel clickable — hover tint + press scale */
  interactive?: boolean
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, interactive = false, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        cardVariants({ variant }),
        interactive && [
          "motion-interactive cursor-pointer",
          "hover:shadow-[--shadow-card-hover] hover:bg-[--color-surface]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-ring] focus-visible:ring-offset-2",
        ],
        className
      )}
      {...(interactive ? { role: "button", tabIndex: 0 } : {})}
      {...props}
    />
  )
)
Card.displayName = "Card"

/* ─── CardHeader ────────────────────────────────────────────────────────────── */

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col gap-1.5 px-5 pt-5 pb-0", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

/* ─── CardTitle ─────────────────────────────────────────────────────────────── */

const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-[length:var(--text-subtitle)] font-semibold leading-[--leading-tight] text-[--color-foreground]",
      className
    )}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

/* ─── CardDescription ───────────────────────────────────────────────────────── */

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn(
      "text-[length:var(--text-body)] text-[--color-muted-foreground] leading-[--leading-normal]",
      className
    )}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

/* ─── CardContent ───────────────────────────────────────────────────────────── */

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("px-5 py-5", className)} {...props} />
))
CardContent.displayName = "CardContent"

/* ─── CardFooter ────────────────────────────────────────────────────────────── */

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex items-center gap-2 px-5 pb-5 pt-0",
      className
    )}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export {
  Card,
  cardVariants,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
}
