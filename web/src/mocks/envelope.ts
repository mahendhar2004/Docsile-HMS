import { HttpResponse } from "msw"
import type { ApiMeta } from "@/lib/api-client"

/**
 * Wraps mock data in the same { statusCode, message, data, meta? } envelope
 * every real Edge Function returns (see web/src/lib/api-client.ts).
 */
export function ok<T>(data: T, meta?: ApiMeta, status = 200) {
  return HttpResponse.json({ statusCode: status, message: "OK", data, meta }, { status })
}

export function created<T>(data: T) {
  return ok(data, undefined, 201)
}

export function fail(message: string, status = 400) {
  return HttpResponse.json({ statusCode: status, message, data: null }, { status })
}

/** Paginate an in-memory array the same way the real offset-based endpoints do. */
export function paginate<T>(rows: T[], page: number, pageSize: number) {
  const total = rows.length
  const start = (page - 1) * pageSize
  const data = rows.slice(start, start + pageSize)
  const meta: ApiMeta = { page, pageSize, total, hasMore: start + pageSize < total }
  return { data, meta }
}
