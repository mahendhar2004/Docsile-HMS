import { QueryClient } from "@tanstack/react-query"
import { ApiError } from "./api-client"

/**
 * Shared TanStack Query client.
 *
 * Defaults:
 * - staleTime: 5 min (per architecture §7.3 — most list data is fine at 5 min)
 * - gcTime: 10 min
 * - retry: retries only on network errors, not API errors (4xx/5xx are final)
 * - refetchOnWindowFocus: true (background refresh on tab return)
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: true,
      retry(failureCount, error) {
        // Do not retry on API errors (4xx / 5xx) — those are deterministic
        if (error instanceof ApiError) return false
        // Retry network errors up to 2 times
        return failureCount < 2
      },
    },
    mutations: {
      retry: false,
    },
  },
})
