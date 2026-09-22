/**
 * Supabase JS client — anon key.
 *
 * Used exclusively for Supabase Realtime subscriptions (ADR-003).
 * Data fetching goes through the API Edge Functions via apiClient (VITE_API_BASE_URL).
 * Authentication uses custom JWT cookies — NOT Supabase Auth (ADR-005).
 *
 * PII note (ADR-003): postgres_changes payloads may include patient PII fields
 * because the server-side column allowlist has not yet been configured in Supabase
 * dashboard. This is a known, accepted limitation. The frontend never reads the
 * payload data — it uses change events solely as refetch triggers.
 */

import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!SUPABASE_URL) {
  console.warn(
    "[supabase-client] VITE_SUPABASE_URL is not set. Realtime subscriptions will fail " +
      "(falling back to a placeholder URL so createClient() doesn't throw at import time).",
  )
}
if (!SUPABASE_ANON_KEY) {
  console.warn(
    "[supabase-client] VITE_SUPABASE_ANON_KEY is not set. Realtime subscriptions will fail.",
  )
}

// createClient() throws synchronously on an empty/invalid URL — fall back to a
// syntactically valid placeholder so the module can still load (e.g. mock mode,
// or the dev server run before a real .env exists). The connection attempt then
// fails asynchronously, which the polling-fallback logic already handles.
export const supabase = createClient(SUPABASE_URL || "https://mock.supabase.co", SUPABASE_ANON_KEY || "mock-anon-key", {
  auth: {
    // Disable Supabase Auth session management — project uses custom JWT cookies.
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
})
