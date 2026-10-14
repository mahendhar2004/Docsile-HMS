import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

export function formatDateLong(dateString: string): string {
  // Plain "yyyy-MM-dd" dates need "T00:00:00" appended so `new Date()` parses
  // them in local time instead of UTC midnight (which can roll back a day in
  // IST). Full ISO timestamps (the shape of every backend createdAt/
  // prescriptionDate/admissionDate/etc field) already have a "T" and must be
  // passed through as-is — appending another "T00:00:00" to those produced
  // an unparseable string and silently rendered "Invalid Date" everywhere
  // this was called with a real timestamp (every call site in reports/
  // except the Stats modal's plain `date` param).
  const hasTime = dateString.includes("T")
  return new Date(hasTime ? dateString : `${dateString}T00:00:00`).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

export function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`
}

export function calculateAge(dob: string): number {
  const today = new Date()
  const birthDate = new Date(dob)
  let age = today.getFullYear() - birthDate.getFullYear()
  const m = today.getMonth() - birthDate.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--
  return age
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join("")
}

export function todayISO(): string {
  // Hard-anchored to IST (same approach as the backend's `toISTDateISO()` in
  // supabase/functions/workup/repository.ts), not the browser/OS's ambient
  // local timezone — this hospital operates in IST regardless of what
  // timezone an individual workstation's clock happens to be set to. Using
  // `toLocalDateISO(new Date())` here would silently roll the "today" pill
  // to the wrong calendar day (and therefore query the wrong day's queue)
  // on any machine not set to IST, especially right around the IST midnight
  // boundary when UTC and IST disagree on the calendar date entirely.
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date())
}

export function toLocalDateISO(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}
