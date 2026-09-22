/**
 * API client for the Docsile HMS Edge Functions backend.
 *
 * - Base URL: VITE_API_BASE_URL env var
 * - Auth: HttpOnly cookie (credentials: 'include') — no Bearer header
 * - Response envelope: { statusCode, message, data, meta? }
 * - On 401: attempts one POST /auth/refresh, then retries the original request once.
 *   If refresh also fails, redirects to /login.
 */

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

let isRefreshing = false
let refreshFailed = false

async function attemptRefresh(): Promise<boolean> {
  if (isRefreshing) {
    // Another call is already refreshing — wait briefly then assume it succeeded
    await new Promise((r) => setTimeout(r, 500))
    return !refreshFailed
  }
  isRefreshing = true
  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    })
    if (!res.ok) {
      refreshFailed = true
      return false
    }
    refreshFailed = false
    return true
  } catch {
    refreshFailed = true
    return false
  } finally {
    isRefreshing = false
  }
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
