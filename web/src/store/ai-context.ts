import { create } from "zustand"

/**
 * Sitha AI's current context — which patient (if any) and which `module`
 * mode it should ask the backend for. Set by whichever page currently has
 * a meaningful context to offer (Doctor's consultation view sets patientId;
 * Analytics sets module: "analytics"); read by the global floating widget
 * in AppShell so it's never coupled to one specific page.
 *
 * Pages that set a context MUST clear it on unmount (see the `useEffect`
 * cleanup pattern in DoctorPage/AnalyticsPage) so navigating away doesn't
 * leave a stale patientId/module active for whichever page you land on next.
 */
export interface AiContext {
  /** Sequential patient ID or phone token — see AskSithaBody. */
  patientId: string | null
  /** "analytics" switches Sitha to hospital-analytics mode; omit for clinical. */
  module: string | null
}

interface AiContextState extends AiContext {
  setAiContext: (ctx: Partial<AiContext>) => void
  clearAiContext: () => void
  /**
   * Whether the Sitha panel is open. Main has a per-page "Ask Sitha" toggle
   * button in several headers (Patients, Doctor) that open/close the SAME
   * chat panel this app renders once, globally, in AppShell — so any page's
   * header button just flips this flag rather than owning its own panel.
   */
  open: boolean
  setOpen: (open: boolean) => void
  toggleOpen: () => void
}

const EMPTY_CONTEXT: AiContext = { patientId: null, module: null }

export const useAiContextStore = create<AiContextState>((set) => ({
  ...EMPTY_CONTEXT,
  open: false,
  setAiContext: (ctx) => set((prev) => ({ ...prev, ...ctx })),
  clearAiContext: () => set((prev) => ({ ...prev, ...EMPTY_CONTEXT })),
  setOpen: (open) => set({ open }),
  toggleOpen: () => set((prev) => ({ open: !prev.open })),
}))
