/**
 * MSW v2 handlers for the Reports module.
 *
 * GET /reports/patients/search?q=&limit=&cursor=   (cursor-based — returns meta.cursor)
 * GET /reports/patients/:id/summary
 * GET /reports/patients/:id/visits
 * GET /reports/patients/:id/prescriptions
 * GET /reports/patients/:id/inpatient
 * GET /reports/patients/:id/labs
 * GET /reports/patients/:id/billing
 *
 * GET /reports/exports/patients
 * GET /reports/exports/prescriptions
 * GET /reports/exports/eye-readings
 * GET /reports/exports/inpatients
 * GET /reports/exports/insurance-claims
 * GET /reports/exports/lab-bills
 * GET /reports/exports/pharmacy-bills
 * GET /reports/exports/optical-bills
 * GET /reports/exports/expenses
 */

import { http } from "msw"
import { ok } from "../envelope"
import {
  reportPatients,
  patientSummary,
  patientVisits,
  patientPrescriptions,
  patientInpatient,
  patientLabs,
  patientBilling,
  exportPatients,
  exportPrescriptions,
  exportEyeReadings,
  exportInpatients,
  exportInsuranceClaims,
  exportLabBills,
  exportPharmacyBills,
  exportOpticalBills,
  exportExpenses,
} from "../fixtures/reports"

export const reportsHandlers = [
  // ── Patient search (cursor-based) ───────────────────────────────────────────
  // The hook calls useCursorQuery which reads meta.cursor for next-page param.
  // We return cursor: null always (single page of results).

  http.get("/reports/patients/search", ({ request }) => {
    const url = new URL(request.url)
    const q = (url.searchParams.get("q") ?? "").toLowerCase()
    const limit = Number(url.searchParams.get("limit") ?? "8")

    const results = reportPatients
      .filter(
        (p) =>
          p.fullName.toLowerCase().includes(q) ||
          p.patientId.toLowerCase().includes(q) ||
          p.phone.includes(q),
      )
      .slice(0, limit)

    return ok(results, { cursor: null })
  }),

  // ── Patient detail — specificity: /patients/search must be listed before /:id
  // MSW matches by order, and we handle exact string "search" above, so the
  // :id handlers below will only fire for real UUID-like segments.

  http.get("/reports/patients/:id/summary", () => ok(patientSummary)),

  http.get("/reports/patients/:id/visits", () => ok(patientVisits)),

  http.get("/reports/patients/:id/prescriptions", () => ok(patientPrescriptions)),

  http.get("/reports/patients/:id/inpatient", () => ok(patientInpatient)),

  http.get("/reports/patients/:id/labs", () => ok(patientLabs)),

  http.get("/reports/patients/:id/billing", () => ok(patientBilling)),

  // ── Bulk exports ────────────────────────────────────────────────────────────

  http.get("/reports/exports/patients", () => ok(exportPatients)),

  http.get("/reports/exports/prescriptions", () => ok(exportPrescriptions)),

  http.get("/reports/exports/eye-readings", () => ok(exportEyeReadings)),

  http.get("/reports/exports/inpatients", () => ok(exportInpatients)),

  http.get("/reports/exports/insurance-claims", () => ok(exportInsuranceClaims)),

  http.get("/reports/exports/lab-bills", () => ok(exportLabBills)),

  http.get("/reports/exports/pharmacy-bills", () => ok(exportPharmacyBills)),

  http.get("/reports/exports/optical-bills", () => ok(exportOpticalBills)),

  http.get("/reports/exports/expenses", () => ok(exportExpenses)),
]
