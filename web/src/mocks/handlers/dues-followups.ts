/**
 * MSW v2 handlers for the Dues & Follow-ups module.
 *
 * GET   /dues-followups/dues?page=N&pageSize=N
 * GET   /dues-followups/followups?page=N&pageSize=N
 * GET   /dues-followups/doctors
 * GET   /dues-followups/departments
 * GET   /dues-followups/email-templates
 * GET   /dues-followups/hospital-name
 * PATCH /dues-followups/dues/:id/mark-paid
 * POST  /dues-followups/send-email
 */

import { http } from "msw"
import { ok, paginate } from "../envelope"
import {
  dues,
  followups,
  emailTemplates,
  doctors,
  departments,
  hospitalName,
} from "../fixtures/dues-followups"
import type { MarkPaidBody } from "@/pages/dues-followups/types"

export const duesFollowupsHandlers = [
  // ── Dues (offset-paginated) ─────────────────────────────────────────────────

  http.get("/dues-followups/dues", ({ request }) => {
    const url = new URL(request.url)
    const page = Number(url.searchParams.get("page") ?? "1")
    const pageSize = Number(url.searchParams.get("pageSize") ?? "25")
    const { data, meta } = paginate([...dues], page, pageSize)
    return ok(data, meta)
  }),

  // ── Follow-ups (offset-paginated) ───────────────────────────────────────────

  http.get("/dues-followups/followups", ({ request }) => {
    const url = new URL(request.url)
    const page = Number(url.searchParams.get("page") ?? "1")
    const pageSize = Number(url.searchParams.get("pageSize") ?? "25")
    const { data, meta } = paginate([...followups], page, pageSize)
    return ok(data, meta)
  }),

  http.get("/dues-followups/followups/summary", () => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowEnd = new Date(tomorrow)
    tomorrowEnd.setDate(tomorrowEnd.getDate() + 1)

    return ok({
      todayCount: followups.filter((f) => {
        const d = new Date(f.followUpDate)
        return d >= today && d < tomorrow
      }).length,
      tomorrowCount: followups.filter((f) => {
        const d = new Date(f.followUpDate)
        return d >= tomorrow && d < tomorrowEnd
      }).length,
      totalCount: followups.length,
      overdueCount: followups.filter((f) => f.isOverdue).length,
    })
  }),

  // ── Reference lists ─────────────────────────────────────────────────────────

  http.get("/dues-followups/doctors", () => ok(doctors)),

  http.get("/dues-followups/departments", () => ok(departments)),

  http.get("/dues-followups/email-templates", () => ok(emailTemplates)),

  http.get("/dues-followups/hospital-name", () => ok(hospitalName)),

  // ── Mutations ───────────────────────────────────────────────────────────────

  http.patch("/dues-followups/dues/:id/mark-paid", async ({ params, request }) => {
    const { id } = params as { id: string }
    const body = (await request.json()) as MarkPaidBody
    const due = dues.find((d) => d.id === id)
    if (due) {
      const paid = body.amount ?? due.balanceDue
      due.amountPaid = Math.min(due.amountPaid + paid, due.totalAmount)
      due.balanceDue = due.totalAmount - due.amountPaid
      if (due.balanceDue <= 0) {
        // Remove from dues list (fully paid)
        const idx = dues.findIndex((d) => d.id === id)
        if (idx !== -1) dues.splice(idx, 1)
      }
    }
    return ok(null)
  }),

  http.post("/dues-followups/send-email", () => ok({ sent: true })),
]
