/**
 * doctor/ai-assist-panel.tsx
 *
 * Sitha AI assist panel — a collapsible section at the bottom of the
 * consultation view. Maintains conversation history within the session
 * (discarded on patient change).
 *
 * Accept: copies the AI's answer to the clipboard (toast notification).
 * Dismiss: clears the current answer banner; conversation history is retained
 * so follow-up questions have context.
 *
 * Permission guard: canConsult (doctor:consult) — shows a disabled state
 * if the user lacks the permission.
 */

import { useState, useCallback } from "react"
import { Bot, Send, Clipboard } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { AlertBanner } from "@/components/patterns"
import { useAskSitha } from "./hooks"
import type { SithaHistoryTurn } from "./types"
import { toast } from "@/components/ui/sonner"

// ─── Props ────────────────────────────────────────────────────────────────────

interface AiAssistPanelProps {
  /** The UUID of the currently selected patient — sent for patient-clinical context. */
  patientId: string | null
  /** Gate derived from doctor:consult permission. */
  canConsult: boolean
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AiAssistPanel({ patientId, canConsult }: AiAssistPanelProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [question, setQuestion] = useState("")
  const [history, setHistory] = useState<SithaHistoryTurn[]>([])
  const [currentAnswer, setCurrentAnswer] = useState<string | null>(null)

  const askMutation = useAskSitha()

  const handleSubmit = useCallback(() => {
    const q = question.trim()
    if (!q || askMutation.isPending) return

    askMutation.mutate(
      {
        patientId: patientId ?? null,
        question: q,
        history: history.slice(-6), // server caps to 6, send at most 6
      },
      {
        onSuccess: (data) => {
          setCurrentAnswer(data.answer)
          setHistory((prev) => [
            ...prev,
            { role: "user", text: q },
            { role: "model", text: data.answer },
          ])
          setQuestion("")
        },
        onError: () => {
          toast.error("Sitha AI is unavailable. Please try again.")
        },
      },
    )
  }, [question, history, patientId, askMutation])

  const handleAccept = useCallback(() => {
    if (!currentAnswer) return
    navigator.clipboard
      .writeText(currentAnswer)
      .then(() => {
        toast.success("AI suggestion copied to clipboard.")
      })
      .catch(() => {
        toast.error("Could not copy to clipboard.")
      })
  }, [currentAnswer])

  const handleDismiss = useCallback(() => {
    setCurrentAnswer(null)
  }, [])

  return (
    <section className="border-t border-border pt-4 mt-4">
      {/* Toggle header */}
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls="ai-assist-body"
        onClick={() => setIsOpen((o) => !o)}
        className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground motion-interactive w-full"
      >
        <Bot size={16} aria-hidden="true" />
        <span>Sitha AI Assist</span>
        <span className="ml-auto text-xs">{isOpen ? "▲" : "▼"}</span>
      </button>

      {/* Panel body */}
      {isOpen && (
        <div id="ai-assist-body" className="mt-3 flex flex-col gap-3">
          {!canConsult && (
            <AlertBanner
              variant="warning"
              description="You need the doctor:consult permission to use AI assist."
            />
          )}

          {/* Answer banner */}
          {currentAnswer && (
            <AlertBanner
              variant="info"
              title="Sitha"
              description={
                <div className="whitespace-pre-wrap text-sm">{currentAnswer}</div>
              }
              onDismiss={handleDismiss}
            >
              {/* Accept action embedded below the description */}
            </AlertBanner>
          )}
          {currentAnswer && (
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAccept}
                aria-label="Copy AI suggestion to clipboard"
              >
                <Clipboard size={14} aria-hidden="true" />
                Accept (copy)
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleDismiss}
                aria-label="Dismiss AI suggestion"
              >
                Dismiss
              </Button>
            </div>
          )}

          {/* Input + send */}
          <div className="flex flex-col gap-2">
            <Textarea
              placeholder={
                patientId
                  ? "Ask about this patient's history, dues, or get clinical suggestions…"
                  : "Select a patient first, or ask a general clinical question…"
              }
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              disabled={!canConsult || askMutation.isPending}
              aria-label="Ask Sitha AI a question"
              className="min-h-[72px] resize-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault()
                  handleSubmit()
                }
              }}
            />
            <div className="flex items-center justify-between gap-2">
              {history.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  {history.length / 2} turn{history.length / 2 === 1 ? "" : "s"} in session
                </span>
              )}
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleSubmit}
                disabled={
                  !canConsult ||
                  !question.trim() ||
                  askMutation.isPending ||
                  question.length > 4000
                }
                aria-label="Send question to Sitha AI"
                className="ml-auto"
              >
                {askMutation.isPending ? (
                  "Thinking…"
                ) : (
                  <>
                    <Send size={14} aria-hidden="true" />
                    Ask Sitha
                  </>
                )}
              </Button>
            </div>
            {question.length > 3800 && (
              <p className="text-xs text-warning-soft-foreground">
                {4000 - question.length} characters remaining
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
