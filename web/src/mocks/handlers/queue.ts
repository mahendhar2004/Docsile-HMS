/**
 * MSW handlers for the Queue module.
 *
 * Endpoints:
 *   GET /queue/opd        → OpdQueueEntry[]
 *   GET /queue/workup     → WorkupQueueEntry[]
 *   GET /queue/inpatients → InpatientEntry[]
 *
 * No Realtime mocking needed — the page's polling fallback hits these GET endpoints.
 */

import { http } from "msw"
import { ok } from "../envelope"
import { opdQueue, workupQueue, inpatientBoard } from "../fixtures/queue"

export const queueHandlers = [
  http.get("/queue/opd", () => {
    return ok(opdQueue)
  }),

  http.get("/queue/workup", () => {
    return ok(workupQueue)
  }),

  http.get("/queue/inpatients", () => {
    return ok(inpatientBoard)
  }),
]
