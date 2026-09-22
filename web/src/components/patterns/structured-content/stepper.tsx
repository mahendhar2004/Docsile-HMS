/**
 * patterns/structured-content/stepper.tsx
 *
 * Stepper — horizontal step indicator for multi-step forms and wizards.
 *
 * Each step has a visual state: completed, active, upcoming, or error.
 * Steps are connected by a horizontal line that fills with the primary color
 * as steps are completed.
 *
 * Props:
 *   steps     — ordered array of step definitions
 *   className — forwarded to the root nav element
 *
 * Usage:
 *   <Stepper
 *     steps={[
 *       { id: "personal", label: "Personal Info", state: "completed" },
 *       { id: "services", label: "Services", state: "active" },
 *       { id: "payment",  label: "Payment",  state: "upcoming" },
 *     ]}
 *   />
 */

import * as React from "react"
import { Check, X } from "lucide-react"
import { cn } from "@/lib/utils"

/* ─── Types ─────────────────────────────────────────────────────────────────── */

export type StepState = "completed" | "active" | "upcoming" | "error"

export interface StepperStep {
  id: string
  label: string
  /** Optional sub-label below the step label */
  description?: string
  state: StepState
}

export interface StepperProps {
  steps: StepperStep[]
  className?: string
}

/* ─── Step number/icon bubble ───────────────────────────────────────────────── */

function StepBubble({ step, index }: { step: StepperStep; index: number }) {
  const isCompleted = step.state === "completed"
  const isActive = step.state === "active"
  const isError = step.state === "error"

  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center",
        "rounded-full border-2 text-xs font-semibold",
        "transition-colors duration-[--duration-macro]",
        isCompleted && [
          "border-[--color-primary] bg-[--color-primary]",
          "text-[--color-primary-foreground]",
        ],
        isActive && [
          "border-[--color-primary] bg-[--color-surface]",
          "text-[--color-primary]",
        ],
        isError && [
          "border-[--color-error] bg-[--color-error-soft]",
          "text-[--color-error-soft-foreground]",
        ],
        !isCompleted && !isActive && !isError && [
          "border-[--color-border] bg-[--color-surface]",
          "text-[--color-muted-foreground]",
        ]
      )}
    >
      {isCompleted ? (
        <Check size={14} strokeWidth={2.5} />
      ) : isError ? (
        <X size={14} strokeWidth={2.5} />
      ) : (
        <span>{index + 1}</span>
      )}
    </span>
  )
}

/* ─── Connector line ────────────────────────────────────────────────────────── */

function StepConnector({ completed }: { completed: boolean }) {
  return (
    <div
      aria-hidden="true"
      className="flex-1 h-0.5 mx-2 mt-[1rem]"
    >
      <div
        className={cn(
          "h-full w-full rounded-full",
          "transition-colors duration-[--duration-macro]",
          completed
            ? "bg-[--color-primary]"
            : "bg-[--color-border]"
        )}
      />
    </div>
  )
}

/* ─── Stepper ───────────────────────────────────────────────────────────────── */

const Stepper = React.forwardRef<HTMLElement, StepperProps>(
  ({ steps, className }, ref) => {
    return (
      <nav
        ref={ref}
        aria-label="Progress"
        className={cn("w-full", className)}
      >
        <ol className="flex items-start w-full">
          {steps.map((step, index) => {
            const isLast = index === steps.length - 1
            const connectorFilled = step.state === "completed"

            return (
              <React.Fragment key={step.id}>
                {/* Step */}
                <li
                  className="flex flex-col items-center min-w-0"
                  aria-current={step.state === "active" ? "step" : undefined}
                >
                  <StepBubble step={step} index={index} />

                  <div className="mt-1.5 text-center px-1">
                    <p
                      className={cn(
                        "text-[length:var(--text-caption)] font-medium leading-[--leading-tight]",
                        "whitespace-nowrap",
                        step.state === "active" && "text-[--color-primary]",
                        step.state === "completed" && "text-[--color-foreground]",
                        step.state === "error" && "text-[--color-error-soft-foreground]",
                        step.state === "upcoming" && "text-[--color-muted-foreground]"
                      )}
                    >
                      {step.label}
                    </p>

                    {step.description && (
                      <p className="text-[10px] text-[--color-muted-foreground] mt-0.5">
                        {step.description}
                      </p>
                    )}
                  </div>
                </li>

                {/* Connector */}
                {!isLast && (
                  <StepConnector completed={connectorFilled} />
                )}
              </React.Fragment>
            )
          })}
        </ol>
      </nav>
    )
  }
)
Stepper.displayName = "Stepper"

export { Stepper }
