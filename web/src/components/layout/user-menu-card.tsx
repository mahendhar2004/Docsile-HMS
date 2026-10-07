/**
 * layout/user-menu-card.tsx
 *
 * Sidebar footer user card — avatar (initials), full name, role, and a
 * logout icon-button. Matches main's Sidebar.tsx bottom user card
 * (src/components/layout/Sidebar.tsx) in a standalone component so the
 * migrated Sidebar can render it without duplicating the avatar/logout markup.
 */

import { LogOut } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { getInitials } from "@/lib/utils"

export interface UserMenuCardProps {
  fullName: string
  role: string
  onLogout: () => void
}

export function UserMenuCard({ fullName, role, onLogout }: UserMenuCardProps) {
  return (
    <div className="mt-1 flex items-center rounded-lg bg-[var(--color-muted)] border border-[var(--color-border)] gap-3 px-3 py-2.5">
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarFallback className="text-[11px] bg-primary/10 text-primary font-bold">
          {getInitials(fullName)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-[var(--color-foreground)] truncate leading-snug">
          {fullName}
        </p>
        <p className="text-[11px] text-[var(--color-muted-foreground)] capitalize leading-snug">
          {role.toLowerCase()}
        </p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        title="Logout"
        aria-label="Logout"
        onClick={onLogout}
        className="h-8 w-8 p-0 text-[var(--color-muted-foreground)] hover:text-destructive hover:bg-destructive/10"
      >
        <LogOut className="h-4 w-4" aria-hidden="true" />
      </Button>
    </div>
  )
}
