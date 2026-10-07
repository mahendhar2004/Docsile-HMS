import type { ComponentType } from "react"
import type { HospitalHeaderProps } from "../ReceiptHeader"

import DefaultHeader from "./DefaultHeader"

/**
 * Registry mapping hospital names to their custom header components.
 *
 * Main's equivalent registry had entries for specific real deployed
 * hospitals (their actual letterheads, doctor names, registration
 * numbers) — not appropriate to carry into a generic product. This
 * starts empty; a new hospital's custom header is added the same way
 * main documents:
 *   1. Create a new file in src/components/receipts/headers/YourHospital.tsx
 *   2. Export default a component that accepts HospitalHeaderProps
 *   3. Import it here and add an entry to the map below
 *
 * The key should match the hospital's `name` field in the DB (case-insensitive).
 */
const headerRegistry: Record<string, ComponentType<HospitalHeaderProps>> = {}

/**
 * Looks up a custom header component for the given hospital name.
 * Returns DefaultHeader if no custom header is registered.
 */
export function getHeaderComponent(hospitalName: string): ComponentType<HospitalHeaderProps> {
  const key = hospitalName.trim().toLowerCase()
  return headerRegistry[key] ?? DefaultHeader
}

export { DefaultHeader }

/** All available header options for the header picker UI */
export const HEADER_OPTIONS: { key: string; label: string }[] = [
  { key: "default", label: "Default (hospital name)" },
  ...Object.keys(headerRegistry).map((key) => ({
    key,
    label: key
      .split(" ")
      .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" "),
  })),
]
