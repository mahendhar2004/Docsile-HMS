/**
 * MSW v2 handlers for the License Tracker module.
 *
 * GET    /license-tracker
 * POST   /license-tracker
 * PATCH  /license-tracker/:id
 * DELETE /license-tracker/:id
 * PATCH  /license-tracker/:id/document   ← before /:id for specificity
 * DELETE /license-tracker/:id/document
 */

import { http } from "msw"
import { ok, created } from "../envelope"
import { licenses, nextLicId } from "../fixtures/license-tracker"
import type { CreateLicenseBody, UpdateLicenseBody } from "@/pages/license-tracker/types"

export const licenseTrackerHandlers = [
  // ── List ────────────────────────────────────────────────────────────────────

  http.get("/license-tracker", () => {
    // Return sorted by expiry date ascending (soonest-expiring first)
    const sorted = [...licenses].sort((a, b) => a.expiryDate.localeCompare(b.expiryDate))
    return ok(sorted)
  }),

  // ── Create ──────────────────────────────────────────────────────────────────

  http.post("/license-tracker", async ({ request }) => {
    const body = (await request.json()) as CreateLicenseBody
    const newLic = {
      id: nextLicId(),
      name: body.name,
      licenseNumber: body.licenseNumber ?? null,
      issuingBody: body.issuingBody ?? null,
      category: body.category ?? null,
      issueDate: body.issueDate ?? null,
      expiryDate: body.expiryDate,
      reminderDays: body.reminderDays ?? 30,
      status: null,
      documentUrl: null,
      notes: body.notes ?? null,
      hospitalId: "mock-hospital-id",
      createdBy: "mock-admin-id",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    licenses.push(newLic)
    return created(newLic)
  }),

  // Document sub-resource handlers — must precede /:id to avoid swallowing "document" as :id

  http.patch("/license-tracker/:id/document", async ({ params, request }) => {
    const { id } = params as { id: string }
    const { documentUrl } = (await request.json()) as { documentUrl: string }
    const lic = licenses.find((l) => l.id === id)
    if (lic) {
      lic.documentUrl = documentUrl
      lic.updatedAt = new Date().toISOString()
    }
    return ok(null)
  }),

  http.delete("/license-tracker/:id/document", ({ params }) => {
    const { id } = params as { id: string }
    const lic = licenses.find((l) => l.id === id)
    if (lic) {
      lic.documentUrl = null
      lic.updatedAt = new Date().toISOString()
    }
    return ok(null)
  }),

  // ── Update ──────────────────────────────────────────────────────────────────

  http.patch("/license-tracker/:id", async ({ params, request }) => {
    const { id } = params as { id: string }
    const body = (await request.json()) as UpdateLicenseBody
    const lic = licenses.find((l) => l.id === id)
    if (lic) {
      if (body.name !== undefined) lic.name = body.name
      if (body.licenseNumber !== undefined) lic.licenseNumber = body.licenseNumber ?? null
      if (body.issuingBody !== undefined) lic.issuingBody = body.issuingBody ?? null
      if (body.category !== undefined) lic.category = body.category ?? null
      if (body.issueDate !== undefined) lic.issueDate = body.issueDate ?? null
      if (body.expiryDate !== undefined) lic.expiryDate = body.expiryDate
      if (body.reminderDays !== undefined) lic.reminderDays = body.reminderDays ?? 30
      if (body.notes !== undefined) lic.notes = body.notes ?? null
      lic.updatedAt = new Date().toISOString()
    }
    return ok(null)
  }),

  // ── Delete ──────────────────────────────────────────────────────────────────

  http.delete("/license-tracker/:id", ({ params }) => {
    const { id } = params as { id: string }
    const idx = licenses.findIndex((l) => l.id === id)
    if (idx !== -1) licenses.splice(idx, 1)
    return ok(null)
  }),
]
