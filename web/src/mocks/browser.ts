import { setupWorker } from "msw/browser"
import { handlers } from "./handlers"

/**
 * MSW browser worker — started conditionally from main.tsx when
 * VITE_USE_MOCKS=true (see `npm run dev:mock`). Never included in a
 * production build's initial bundle since the import is dynamic.
 */
export const worker = setupWorker(...handlers)
