import { useMutation } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

/**
 * Sitha AI (Gemini-backed clinical/analytics assistant) — shared across the
 * app via the global floating widget (see components/layout/sitha-widget.tsx),
 * not scoped to any one page. Moved out of pages/doctor/ once Sitha stopped
 * being Doctor-only.
 *
 * Endpoint: POST /doctor/ai/ask
 * Permission: doctor:consult — required unconditionally, even in analytics
 * mode (matches the old app's behavior exactly; see .sde/schemas/openapi.yaml
 * for the full rationale).
 */

/** One turn in the AI conversation history. */
export interface SithaHistoryTurn {
  role: "user" | "model"
  text: string
}

/** Request body for POST /doctor/ai/ask. */
export interface AskSithaBody {
  /** Patient UUID or sequential ID — locks context to this patient. */
  patientId?: string | null
  /** The question (max 4000 chars). */
  question: string
  /** Prior turns; server caps to last 6. */
  history?: SithaHistoryTurn[]
  /** "analytics" switches to hospital-analytics mode; anything else = clinical mode. */
  module?: string
}

/** Data field in the POST /doctor/ai/ask response envelope. */
export interface AskSithaResponse {
  answer: string
}

/** Plain useMutation — conversation history is managed by the caller. */
export function useAskSitha() {
  return useMutation({
    mutationFn: (body: AskSithaBody) =>
      apiClient.post<AskSithaResponse>("/doctor/ai/ask", body).then((e) => e.data),
  })
}
