/**
 * MSW handlers for the Dashboard module.
 *
 * Endpoints:
 *   GET /dashboard/summary     → TodaySummary
 *   GET /dashboard/quick-stats → QuickStats
 */

import { http } from "msw"
import { ok } from "../envelope"
import { todaySummary, quickStats } from "../fixtures/dashboard"

export const dashboardHandlers = [
  http.get("/dashboard/summary", () => {
    return ok(todaySummary)
  }),

  http.get("/dashboard/quick-stats", () => {
    return ok(quickStats)
  }),
]
