/**
 * ui/card.tsx
 *
 * Card primitive — generic surface container. Uses --shadow-card (a 1px
 * hairline ring in --color-border composited with --shadow-sm as one
 * box-shadow, not a literal `border` property) per the Docsile HMS design
 * system reference — the same treatment every hand-built Settings-style
 * card div already uses via `shadow-[var(--shadow-card)]` directly.
 *
 * Composition:
 *   Card > CardHeader > CardTitle + CardDescription
 *   Card > CardContent
 *   Card > CardFooter
 *
 * Props:
 *   interactive — adds hover/active micro-feedback via .motion-interactive +
 *                 a slightly deeper shadow; use for clickable nav/dashboard tiles
 *                 (main itself has no such concept, kept for call-site compatibility)
 */

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

/* ─── Card root ─────────────────────────────────────────────────────────────── */

const cardVariants = cva(
  [
    "rounded-[var(--radius-lg)]",
    "bg-[var(--color-card)] text-[var(--color-card-foreground)]",
    "shadow-[var(--shadow-card)]",
  ],
  {
    variants: {
      /** No visual difference between variants — main has no elevated/flat
       *  distinction. Kept so existing `variant="flat"` call sites still compile. */
      variant: {
        elevated: "",
        flat: "",
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
          "hover:shadow-[var(--shadow-card-hover)]",
          "focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_rgba(37,99,235,0.35)]",
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
    className={cn("flex flex-col space-y-1.5 p-6", className)}
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
      "text-2xl font-semibold leading-none tracking-tight text-[var(--color-foreground)]",
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
    className={cn("text-sm text-[var(--color-muted-foreground)]", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

/* ─── CardContent ───────────────────────────────────────────────────────────── */

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

/* ─── CardFooter ────────────────────────────────────────────────────────────── */

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
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
