/**
 * useQueueRealtime — Supabase Realtime subscription hook for queue/bed channels.
 *
 * Subscribes to postgres_changes on the given Supabase Realtime channel for the
 * specified tables. On any change event, calls `onEvent` (typically a TanStack
 * Query refetch). On connection loss, calls `onStatusChange(false)` so the caller
 * can activate a polling fallback.
 *
 * ADR-003: channel naming convention
 *   hospital:{hospitalId}:queue  → Patient / Prescription / EyeReading table changes
 *   hospital:{hospitalId}:beds   → InPatient table changes
 *
 * ADR-003 PII note: postgres_changes payloads may contain patient PII because the
 * server-side Supabase column allowlist is not yet configured. The payload is
 * intentionally ignored here — change events are used solely as refetch triggers,
 * and the actual data is fetched via the authenticated HTTP API (apiClient).
 *
 * Fallback: the caller activates polling (TanStack Query refetchInterval) when
 * onStatusChange(false) fires. The `?since=` param mentioned in the stub is not
 * yet implemented server-side (QueueQuerySchema only accepts `date`); polling
 * therefore performs a full refetch of today's data at the caller's interval.
 */

import { useEffect, useRef } from "react"
import { supabase } from "@/lib/supabase-client"

export interface UseQueueRealtimeOptions {
  /** Realtime channel name, e.g. `hospital:${hospitalId}:queue`. */
  channel: string
  /** Hospital ID — skips subscription if empty (unauthenticated state). */
  hospitalId: string
  /**
   * Database table names to watch. Each table gets its own postgres_changes
   * listener on the same channel.
   */
  tables: readonly string[]
  /**
   * Invoked on every postgres_changes event from any watched table.
   * Typically `() => void query.refetch()`.
   */
  onEvent: () => void
  /**
   * Invoked when the Realtime connection status changes.
   * `true` → live (cancel polling fallback).
   * `false` → disconnected (activate polling fallback + show banner).
   */
  onStatusChange: (isLive: boolean) => void
}

/**
 * Supabase Realtime subscription for queue/bed channels.
 * Cleans up the channel on unmount or when deps change.
 */
export function useQueueRealtime({
  channel,
  hospitalId,
  tables,
  onEvent,
  onStatusChange,
}: UseQueueRealtimeOptions): void {
  // Keep callbacks in refs to avoid re-subscribing when they change identity
  const onEventRef = useRef(onEvent)
  const onStatusChangeRef = useRef(onStatusChange)
  onEventRef.current = onEvent
  onStatusChangeRef.current = onStatusChange

  // Serialize the tables array for a stable effect dependency
  const tableKey = tables.join(",")

  useEffect(() => {
    if (!hospitalId) return

    const ch = supabase.channel(channel)

    // Wire a postgres_changes listener for each watched table
    for (const table of tableKey.split(",")) {
      ch.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        () => {
          onEventRef.current()
        },
      )
    }

    ch.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        onStatusChangeRef.current(true)
      } else if (
        status === "CHANNEL_ERROR" ||
        status === "CLOSED" ||
        status === "TIMED_OUT"
      ) {
        onStatusChangeRef.current(false)
      }
    })

    return () => {
      void supabase.removeChannel(ch)
    }
  }, [channel, hospitalId, tableKey])
}
