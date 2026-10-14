/**
 * API client for the Docsile HMS Edge Functions backend.
 *
 * - Base URL: VITE_API_BASE_URL env var
 * - Auth: HttpOnly cookie (credentials: 'include') — no Bearer header
 * - Response envelope: { statusCode, message, data, meta? }
 * - On 401: attempts one POST /auth/refresh, then retries the original request once.
 *   If refresh also fails, redirects to /login.
 * - checkSession() exposes the same refresh call for the app-boot flow (router.tsx),
 *   so a hard reload can silently re-authenticate from the HttpOnly refresh cookie
 *   instead of bouncing straight to /login.
 */

import { useSessionStore, mapSessionUser, type RawSessionUser } from "@/store/session"

// Falls back to "" (relative paths) rather than leaving this `undefined` — an
// unset env var must never end up interpolated as the literal string
// "undefined" in front of every request path (`${BASE_URL}${path}`), which is
// what happens with no .env configured (e.g. mock mode, via MSW's relative
// path matching, or before a real backend is wired up).
const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? ""

if (!BASE_URL) {
  console.warn(
    "[api-client] VITE_API_BASE_URL is not set. Requests will use relative paths " +
      "(only useful with mocks — real API calls will fail).",
  )
}

export interface ApiMeta {
  page?: number
  pageSize?: number
  total?: number
  cursor?: string | null
  hasMore?: boolean
}

export interface ApiEnvelope<T> {
  statusCode: number
  message: string
  data: T
  meta?: ApiMeta
}

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public data?: unknown,
  ) {
    super(message)
    this.name = "ApiError"
  }
}

let refreshPromise: Promise<boolean> | null = null

async function doRefresh(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    })
    if (!res.ok) {
      useSessionStore.getState().setUser(null)
      return false
    }
    const envelope = (await res.json()) as ApiEnvelope<RawSessionUser>
    useSessionStore.getState().setUser(mapSessionUser(envelope.data))
    return true
  } catch {
    useSessionStore.getState().setUser(null)
    return false
  }
}

/** De-dupes concurrent refresh attempts — every caller awaits the same in-flight request. */
async function attemptRefresh(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = doRefresh().finally(() => {
      refreshPromise = null
    })
  }
  return refreshPromise
}

/**
 * Attempts silent re-authentication from the HttpOnly refresh cookie, populating
 * the session store on success. Used once at app boot (see AppRouter in
 * router.tsx) to decide whether a hard reload should land on /login or restore
 * the previous session — bypasses `request()`'s own 401-redirect-to-/login
 * handling, since a boot-time failure here is an expected "not logged in yet"
 * outcome, not a mid-session error.
 */
export async function checkSession(): Promise<boolean> {
  return attemptRefresh()
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  retried = false,
): Promise<ApiEnvelope<T>> {
  const url = `${BASE_URL}${path}`
  const res = await fetch(url, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  })

  if (res.status === 401 && !retried) {
    const refreshed = await attemptRefresh()
    if (refreshed) {
      return request<T>(path, init, true)
    }
    // Refresh failed — redirect to login
    window.location.href = "/login"
    // Return a never-resolving promise to stop execution
    return new Promise(() => {})
  }

  const envelope = (await res.json()) as ApiEnvelope<T>

  if (!res.ok) {
    throw new ApiError(
      envelope.statusCode ?? res.status,
      envelope.message ?? res.statusText,
      envelope.data,
    )
  }

  return envelope
}

export const apiClient = {
  get<T>(path: string, init?: RequestInit) {
    return request<T>(path, { ...init, method: "GET" })
  },
  post<T>(path: string, body?: unknown, init?: RequestInit) {
    return request<T>(path, {
      ...init,
      method: "POST",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  },
  patch<T>(path: string, body?: unknown, init?: RequestInit) {
    return request<T>(path, {
      ...init,
      method: "PATCH",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  },
  put<T>(path: string, body?: unknown, init?: RequestInit) {
    return request<T>(path, {
      ...init,
      method: "PUT",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  },
  delete<T>(path: string, init?: RequestInit) {
    return request<T>(path, { ...init, method: "DELETE" })
  },
}
