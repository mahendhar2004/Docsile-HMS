/**
 * MSW handlers for the Billing module.
 *
 * Endpoints:
 *   GET    /billing/daily                                    → DailySummary
 *   GET    /billing/prescriptions                           → BillingPrescription[] (offset-paginated)
 *   GET    /billing/prescriptions/:id                       → PrescriptionDetailData
 *   POST   /billing/prescriptions/:id/payments             → PaymentRecord
 *   DELETE /billing/prescriptions/:id/payments/:payId      → void
 */

import { http } from "msw"
import { ok, created, fail, paginate } from "../envelope"
import {
  dailySummaries,
  billingPrescriptions,
  invoiceItems,
  paymentRecords,
  nextPaymentId,
} from "../fixtures/billing"

export const billingHandlers = [
  // ── Daily billing summary ───────────────────────────────────────────────────
  http.get("/billing/daily", ({ request }) => {
    const url = new URL(request.url)
    const date = url.searchParams.get("date") ?? "2026-09-22"
    const summary = dailySummaries[date] ?? {
      date,
      totalPatients: 0,
      totalPrescriptions: 0,
      totalBilled: 0,
      totalCollected: 0,
      totalDues: 0,
      totalDiscount: 0,
    }
    return ok(summary)
  }),

  // ── Billing prescriptions list (offset-paginated) ────────────────────────────
  http.get("/billing/prescriptions", ({ request }) => {
    const url = new URL(request.url)
    const dateFilter = url.searchParams.get("date")
    const page = Number(url.searchParams.get("page") ?? "1")
    const pageSize = Number(url.searchParams.get("pageSize") ?? "25")

    const filtered = dateFilter
      ? billingPrescriptions.filter((p) => p.prescriptionDate === dateFilter)
      : billingPrescriptions

    const { data, meta } = paginate(filtered, page, pageSize)
    return ok(data, meta)
  }),

  // ── Prescription detail (items + payments) ───────────────────────────────────
  // Payment sub-routes must come BEFORE the bare :id handler.
  http.post("/billing/prescriptions/:id/payments", async ({ params, request }) => {
    const id = String(params.id)
    const prescription = billingPrescriptions.find((p) => p.id === id)
    if (!prescription) return fail("Prescription not found", 404)

    const body = await request.json() as { paymentMode: string; amount: number }
    const newPayment = {
      id: nextPaymentId(),
      prescriptionId: id,
      amount: body.amount,
      paymentMode: body.paymentMode,
      paymentRef: null as string | null,
      receivedBy: "Reception",
      paymentDate: new Date().toISOString().slice(0, 10),
      notes: null as string | null,
    }

    if (!paymentRecords[id]) paymentRecords[id] = []
    paymentRecords[id].push(newPayment)

    // Update the prescription's amountPaid and balanceDue.
    prescription.amountPaid += body.amount
    prescription.balanceDue = Math.max(0, prescription.total - prescription.amountPaid)

    return created(newPayment)
  }),

  http.delete("/billing/prescriptions/:id/payments/:payId", ({ params }) => {
    const id = String(params.id)
    const payId = String(params.payId)
    const payments = paymentRecords[id]
    if (!payments) return fail("Prescription not found", 404)

    const payIdx = payments.findIndex((p) => p.id === payId)
    if (payIdx === -1) return fail("Payment not found", 404)

    const voided = payments[payIdx]
    payments.splice(payIdx, 1)

    // Reverse the amount from the prescription summary.
    const prescription = billingPrescriptions.find((p) => p.id === id)
    if (prescription) {
      prescription.amountPaid = Math.max(0, prescription.amountPaid - voided.amount)
      prescription.balanceDue = prescription.total - prescription.amountPaid
    }

    return ok(null)
  }),

  // ── Prescription full detail ─────────────────────────────────────────────────
  http.get("/billing/prescriptions/:id", ({ params }) => {
    const id = String(params.id)
    const prescription = billingPrescriptions.find((p) => p.id === id)
    if (!prescription) return fail("Prescription not found", 404)

    return ok({
      prescription,
      invoiceItems: invoiceItems[id] ?? [],
      payments: paymentRecords[id] ?? [],
    })
  }),
]
