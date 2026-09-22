/**
 * ui/avatar.tsx
 *
 * Avatar primitive — circular user/entity avatar with image + fallback
 * (initials or generic icon). Built on @radix-ui/react-avatar.
 *
 * Sizes: sm (32 px), md (40 px, default), lg (48 px)
 *
 * Composition:
 *   <Avatar size="md">
 *     <AvatarImage src={user.avatarUrl} alt={user.name} />
 *     <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
 *   </Avatar>
 *
 * AvatarFallback renders whatever children you pass — typically 1-2 initials
 * (use the getInitials() helper from @/lib/utils) or a lucide icon.
 */

import * as React from "react"
import * as AvatarPrimitive from "@radix-ui/react-avatar"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

/* ─── Size variants ─────────────────────────────────────────────────────────── */

const avatarVariants = cva(
  [
    "relative shrink-0 overflow-hidden rounded-full",
    "inline-flex items-center justify-center",
    "select-none",
    // Hairline ring so the avatar boundary reads clearly against
    // both light and image backgrounds (e.g. a white avatar on a
    // white card, or the fallback swatch against a pale sidebar).
    "shadow-[var(--shadow-border)]",
  ],
  {
    variants: {
      size: {
        sm: "h-8 w-8",
        md: "h-10 w-10",
        lg: "h-12 w-12",
      },
    },
    defaultVariants: {
      size: "md",
    },
  }
)

const fallbackTextSize: Record<NonNullable<VariantProps<typeof avatarVariants>["size"]>, string> = {
  sm: "text-[10px]",
  md: "text-xs",
  lg: "text-sm",
}

/* ─── Context (pass size down to children) ──────────────────────────────────── */

type AvatarSize = NonNullable<VariantProps<typeof avatarVariants>["size"]>

const AvatarSizeContext = React.createContext<AvatarSize>("md")

/* ─── Avatar ────────────────────────────────────────────────────────────────── */

export interface AvatarProps
  extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>,
    VariantProps<typeof avatarVariants> {}

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  AvatarProps
>(({ className, size = "md", ...props }, ref) => (
  <AvatarSizeContext.Provider value={size ?? "md"}>
    <AvatarPrimitive.Root
      ref={ref}
      className={cn(avatarVariants({ size }), className)}
      {...props}
    />
  </AvatarSizeContext.Provider>
))
Avatar.displayName = "Avatar"

/* ─── AvatarImage ───────────────────────────────────────────────────────────── */

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={cn("aspect-square h-full w-full object-cover", className)}
    {...props}
  />
))
AvatarImage.displayName = "AvatarImage"

/* ─── AvatarFallback ────────────────────────────────────────────────────────── */

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => {
  const size = React.useContext(AvatarSizeContext)
  return (
    <AvatarPrimitive.Fallback
      ref={ref}
      className={cn(
        "flex h-full w-full items-center justify-center rounded-full",
        "bg-[var(--color-muted)] text-[var(--color-muted-foreground)]",
        "font-semibold uppercase tracking-wide",
        fallbackTextSize[size],
        className
      )}
      {...props}
    />
  )
})
AvatarFallback.displayName = "AvatarFallback"

export { Avatar, AvatarImage, AvatarFallback, avatarVariants }
export type { AvatarSize }
