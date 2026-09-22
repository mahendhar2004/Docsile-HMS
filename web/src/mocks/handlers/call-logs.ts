/**
 * MSW v2 handlers for the Call Logs module.
 *
 * GET  /call-logs?page=N&pageSize=N&date=YYYY-MM-DD
 * GET  /call-logs/stats
 * GET  /call-logs/analytics?filter=today|week|month|year
 * GET  /call-logs/patients/search?q=...
 * PATCH /call-logs/:id/notes
 * PATCH /call-logs/:id/patient
 * POST  /call-logs/sync
 */

import { http } from "msw"
import { ok, paginate } from "../envelope"
import {
  callLogs,
  callStats,
  callAnalytics,
  callPatientSearchResults,
} from "../fixtures/call-logs"
import type { SyncResponse } from "@/pages/call-logs/types"

export const callLogsHandlers = [
  // ── List (offset-paginated) ─────────────────────────────────────────────────

  http.get("/call-logs", ({ request }) => {
    const url = new URL(request.url)
    const page = Number(url.searchParams.get("page") ?? "1")
    const pageSize = Number(url.searchParams.get("pageSize") ?? "50")
    const dateFilter = url.searchParams.get("date")

    let filtered = [...callLogs]
    if (dateFilter) {
      filtered = filtered.filter((cl) => cl.startTime.startsWith(dateFilter))
    }

    const { data, meta } = paginate(filtered, page, pageSize)
    return ok(data, meta)
  }),

  // ── Stats ───────────────────────────────────────────────────────────────────

  http.get("/call-logs/stats", () => ok(callStats)),

  // ── Analytics ───────────────────────────────────────────────────────────────

  http.get("/call-logs/analytics", () => ok(callAnalytics)),

  // ── Patient search ──────────────────────────────────────────────────────────

  http.get("/call-logs/patients/search", ({ request }) => {
    const url = new URL(request.url)
    const q = (url.searchParams.get("q") ?? "").toLowerCase()
    const results = callPatientSearchResults.filter(
      (p) =>
        p.fullName.toLowerCase().includes(q) ||
        p.patientId.toLowerCase().includes(q) ||
        p.phone.includes(q),
    )
    return ok(results)
  }),

  // ── Mutations ───────────────────────────────────────────────────────────────

  http.patch("/call-logs/:id/notes", async ({ params, request }) => {
    const { id } = params as { id: string }
    const { notes } = (await request.json()) as { notes: string }
    const log = callLogs.find((cl) => cl.id === id)
    if (log) {
      log.notes = notes
      log.updatedAt = new Date().toISOString()
    }
    return ok(null)
  }),

  http.patch("/call-logs/:id/patient", async ({ params, request }) => {
    const { id } = params as { id: string }
    const { patientId } = (await request.json()) as { patientId: string }
    const log = callLogs.find((cl) => cl.id === id)
    const patient = callPatientSearchResults.find((p) => p.id === patientId)
    if (log) {
      log.patientId = patientId
      log.callerName = patient?.fullName ?? null
      log.updatedAt = new Date().toISOString()
    }
    return ok(null)
  }),

  http.post("/call-logs/sync", () => {
    const response: SyncResponse = {
      success: true,
      synced: 0,
      message: "Mock sync complete — no new calls from Exotel",
    }
    return ok(response)
  }),
]
