/**
 * layout/sitha-widget.tsx
 *
 * Global "Ask Sitha" floating action button + slide-in panel, mounted once
 * in AppShell so it's reachable from every page — not just buried inside
 * Doctor's consultation view, where it lived before. Context-aware via
 * useAiContextStore: Doctor's consultation view sets patientId when a
 * patient is selected; Analytics sets module: "analytics". Everywhere else
 * it runs in general clinical mode (no patient, no module).
 *
 * Gated on doctor:consult — the backend requires this permission
 * unconditionally, even in analytics mode (see .sde/schemas/openapi.yaml),
 * so the button is hidden entirely for roles that would just get a 403.
 *
 * Accept: copies the AI's answer to the clipboard (toast notification).
 * Dismiss: clears the current answer banner; conversation history is
 * retained (per browser session, reset on full reload) so follow-ups have
 * context.
 */

import { useCallback, useState } from "react"
import { Bot, Send, Clipboard, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetBody,
} from "@/components/ui/sheet"
// Direct path, not the top-level @/components/patterns barrel — that barrel
// also re-exports patterns/charts (recharts), and this widget is mounted
// eagerly in AppShell (not a lazy-loaded page), so importing from the
// barrel would drag recharts into the main bundle instead of staying
// split off in whichever page actually renders a chart.
import { AlertBanner } from "@/components/patterns/feedback/alert-banner"
import { toast } from "@/components/ui/sonner"
import { usePermissions } from "@/hooks/usePermissions"
import { useAiContextStore } from "@/store/ai-context"
import { useAskSitha, type SithaHistoryTurn } from "@/hooks/useAskSitha"

export function SithaWidget() {
  const { can } = usePermissions()
  const canConsult = can("doctor:consult")

  const [open, setOpen] = useState(false)
  const [question, setQuestion] = useState("")
  const [history, setHistory] = useState<SithaHistoryTurn[]>([])
  const [currentAnswer, setCurrentAnswer] = useState<string | null>(null)

  const { patientId, module } = useAiContextStore()
  const askMutation = useAskSitha()

  const handleSubmit = useCallback(() => {
    const q = question.trim()
    if (!q || askMutation.isPending) return

    askMutation.mutate(
      {
        patientId: patientId ?? null,
        question: q,
        history: history.slice(-6), // server caps to 6, send at most 6
        ...(module ? { module } : {}),
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
  }, [question, history, patientId, module, askMutation])

  const handleAccept = useCallback(() => {
    if (!currentAnswer) return
    navigator.clipboard
      .writeText(currentAnswer)
      .then(() => toast.success("AI suggestion copied to clipboard."))
      .catch(() => toast.error("Could not copy to clipboard."))
  }, [currentAnswer])

  const handleDismiss = useCallback(() => setCurrentAnswer(null), [])

  // Nothing to show for roles the backend would reject anyway.
  if (!canConsult) return null

  const contextLabel = patientId
    ? "This patient's history, dues, and clinical suggestions"
    : module === "analytics"
      ? "Hospital analytics — revenue, patients, performance"
      : "General clinical question"

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Ask Sitha AI"
        className={[
          "fixed bottom-5 right-5 z-40 flex items-center justify-center h-12 w-12",
          "rounded-[var(--radius-full)] bg-[var(--color-primary)]",
          "shadow-[var(--shadow-overlay)] motion-interactive",
        ].join(" ")}
      >
        <Sparkles size={20} className="text-[var(--color-primary-foreground)]" aria-hidden="true" />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" size="md">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Bot size={18} aria-hidden="true" />
              Sitha AI Assist
            </SheetTitle>
          </SheetHeader>

          <SheetBody className="flex flex-col gap-3">
            <p className="text-[length:var(--text-caption)] text-[var(--color-muted-foreground)]">
              {contextLabel}
            </p>

            {currentAnswer && (
              <>
                <AlertBanner
                  variant="info"
                  title="Sitha"
                  description={
                    <div className="whitespace-pre-wrap text-[length:var(--text-body)]">
                      {currentAnswer}
                    </div>
                  }
                  onDismiss={handleDismiss}
                />
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
                  <Button type="button" variant="ghost" size="sm" onClick={handleDismiss}>
                    Dismiss
                  </Button>
                </div>
              </>
            )}

            <div className="flex flex-col gap-2 mt-auto">
              <Textarea
                placeholder={
                  patientId
                    ? "Ask about this patient's history, dues, or get clinical suggestions…"
                    : "Ask a general clinical question…"
                }
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                disabled={askMutation.isPending}
                aria-label="Ask Sitha AI a question"
                className="min-h-[80px] resize-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault()
                    handleSubmit()
                  }
                }}
              />
              <div className="flex items-center justify-between gap-2">
                {history.length > 0 && (
                  <span className="text-[length:var(--text-caption)] text-[var(--color-muted-foreground)]">
                    {history.length / 2} turn{history.length / 2 === 1 ? "" : "s"} in session
                  </span>
                )}
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSubmit}
                  disabled={!question.trim() || askMutation.isPending || question.length > 4000}
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
                <p className="text-[length:var(--text-caption)] text-[var(--color-warning-soft-foreground)]">
                  {4000 - question.length} characters remaining
                </p>
              )}
            </div>
          </SheetBody>
        </SheetContent>
      </Sheet>
    </>
  )
}
