/**
 * MSW v2 handlers for the Insurance module.
 */

import { http } from "msw"
import { ok, created, paginate } from "../envelope"
import {
  companies,
  claims,
  inpatientSearchData,
  uid,
  nowIso,
} from "../fixtures/insurance"
import type {
  InsuranceCompany,
  InsuranceCompanyBody,
  CreateInsuranceClaimBody,
  UpdateClaimStatusBody,
  UpdateClaimDetailsBody,
  AddClaimPaymentBody,
  InsuranceClaim,
} from "@/pages/insurance/types"

export const insuranceHandlers = [

  // ─── Companies ────────────────────────────────────────────────────────────────

  http.get("/insurance/companies", ({ request }) => {
    const sp = new URL(request.url).searchParams
    const paginated = sp.get("paginated")
    // Unpaginated dropdown mode
    if (paginated === "false") {
      return ok(companies.filter((c) => c.isActive))
    }
    const page = Number(sp.get("page") ?? "1")
    const pageSize = Number(sp.get("pageSize") ?? "25")
    const { data, meta } = paginate(companies, page, pageSize)
    return ok(data, meta)
  }),

  http.post("/insurance/companies", async ({ request }) => {
    const body = await request.json() as InsuranceCompanyBody
    const co: InsuranceCompany = {
      id: uid("ico"), name: body.name, tpaName: body.tpaName ?? null,
      contactNumber: body.contactNumber ?? null, email: body.email ?? null,
      address: body.address ?? null, isActive: body.isActive ?? true,
      createdAt: nowIso(), updatedAt: nowIso(),
    }
    companies.push(co)
    return created(co)
  }),

  http.patch("/insurance/companies/:id", async ({ params, request }) => {
    const id = params.id as string
    const body = await request.json() as InsuranceCompanyBody
    const idx = companies.findIndex((c) => c.id === id)
    if (idx === -1) return ok(null)
    companies[idx] = { ...companies[idx], ...body, updatedAt: nowIso() }
    return ok(companies[idx])
  }),

  http.delete("/insurance/companies/:id", ({ params }) => {
    const id = params.id as string
    const idx = companies.findIndex((c) => c.id === id)
    if (idx !== -1) companies[idx] = { ...companies[idx], isActive: false, updatedAt: nowIso() }
    return ok(null)
  }),

  // ─── Claims ───────────────────────────────────────────────────────────────────

  // NOTE: /insurance/claims/:id/status, /insurance/claims/:id/details, /insurance/claims/:id/payments
  // must come before /insurance/claims/:id

  http.get("/insurance/claims", ({ request }) => {
    const sp = new URL(request.url).searchParams
    const page = Number(sp.get("page") ?? "1")
    const pageSize = Number(sp.get("pageSize") ?? "25")
    const statusFilter = sp.get("status")
    let filtered = [...claims]
    if (statusFilter) filtered = filtered.filter((c) => c.status === statusFilter)
    const { data, meta } = paginate(filtered, page, pageSize)
    return ok(data, meta)
  }),

  http.post("/insurance/claims", async ({ request }) => {
    const body = await request.json() as CreateInsuranceClaimBody
    const co = body.insuranceCompanyId ? companies.find((c) => c.id === body.insuranceCompanyId) : null
    const claimNum = `CLM-${new Date().getFullYear()}-${String(claims.length + 1).padStart(3, "0")}`
    const claim: InsuranceClaim = {
      id: uid("clm"), claimNumber: claimNum, inPatientId: body.inPatientId,
      insuranceCompanyId: body.insuranceCompanyId ?? null,
      patientName: "New Patient", ipNumber: "IP-NEW",
      age: 0, gender: "Unknown", phone: "",
      guardianName: null, department: null, doctorNames: "[]",
      operationName: null, provisionDiagnosis: null,
      admissionDate: null, dischargeDate: null,
      insuranceCompanyName: body.insuranceCompanyName,
      tpaName: body.tpaName ?? co?.tpaName ?? null,
      policyNumber: body.policyNumber ?? null,
      policyHolderName: body.policyHolderName ?? null,
      insuranceCardNumber: body.insuranceCardNumber ?? null,
      relationToInsured: body.relationToInsured ?? null,
      packageAmount: 0, totalBillAmount: 0,
      preauthAmount: body.preauthAmount,
      enhancementAmount: 0, enhancementApproved: 0,
      totalApprovedAmount: 0, finalSettledAmount: 0,
      deductions: 0, discount: 0, patientPayableAmount: 0,
      patientPaidAmount: 0, patientBalance: 0,
      status: "PREAUTH_SUBMITTED",
      preauthSubmittedDate: new Date().toISOString().split("T")[0],
      preauthApprovedDate: null, preauthRejectionReason: null, preauthQueryNotes: null,
      enhancementClaimedDate: null, enhancementApprovedDate: null,
      enhancementRejectionReason: null, enhancementQueryNotes: null,
      finalBillSubmittedDate: null, settlementDate: null, settlementReference: null,
      statusHistory: JSON.stringify([{ status: "PREAUTH_SUBMITTED", date: new Date().toISOString().split("T")[0], updatedBy: "mock-admin-id" }]),
      notes: body.notes ?? null, packageInclusions: null,
      createdById: "mock-admin-id", updatedBy: "mock-admin-id",
      createdAt: nowIso(), updatedAt: nowIso(),
    }
    claims.unshift(claim)
    return created({ claimNumber: claimNum })
  }),

  http.patch("/insurance/claims/:id/status", async ({ params, request }) => {
    const id = params.id as string
    const body = await request.json() as UpdateClaimStatusBody
    const idx = claims.findIndex((c) => c.id === id)
    if (idx === -1) return ok(null)
    const claim = claims[idx]
    const today = new Date().toISOString().split("T")[0]

    // Build history entry
    const history: unknown[] = JSON.parse(claim.statusHistory ?? "[]")
    history.push({ status: body.status, date: today, notes: body.notes, updatedBy: "mock-admin-id" })

    const patch: Partial<InsuranceClaim> = {
      status: body.status, updatedAt: nowIso(), updatedBy: "mock-admin-id",
      statusHistory: JSON.stringify(history),
    }

    // Apply status-specific fields
    if (body.amount !== undefined) patch.preauthAmount = body.amount
    if (body.rejectionReason) patch.preauthRejectionReason = body.rejectionReason
    if (body.settlementReference) patch.settlementReference = body.settlementReference
    if (body.deductions !== undefined) patch.deductions = body.deductions
    if (body.notes) patch.notes = body.notes

    // Set lifecycle dates
    const dateMap: Record<string, keyof InsuranceClaim> = {
      PREAUTH_APPROVED: "preauthApprovedDate",
      PREAUTH_REJECTED: "preauthApprovedDate",
      ENHANCEMENT_CLAIMED: "enhancementClaimedDate",
      ENHANCEMENT_APPROVED: "enhancementApprovedDate",
      FINAL_BILL_SUBMITTED: "finalBillSubmittedDate",
      SETTLED: "settlementDate",
      PARTIALLY_SETTLED: "settlementDate",
    }
    const dateField = dateMap[body.status]
    if (dateField) (patch as Record<string, unknown>)[dateField] = today

    claims[idx] = { ...claim, ...patch }
    return ok(claims[idx])
  }),

  http.patch("/insurance/claims/:id/details", async ({ params, request }) => {
    const id = params.id as string
    const body = await request.json() as UpdateClaimDetailsBody
    const idx = claims.findIndex((c) => c.id === id)
    if (idx === -1) return ok(null)
    claims[idx] = { ...claims[idx], ...body, updatedAt: nowIso() }
    return ok(claims[idx])
  }),

  http.post("/insurance/claims/:id/payments", async ({ params, request }) => {
    const id = params.id as string
    const body = await request.json() as AddClaimPaymentBody
    const idx = claims.findIndex((c) => c.id === id)
    if (idx === -1) return ok(null)
    const claim = claims[idx]
    const newPaid = claim.patientPaidAmount + body.amount
    claims[idx] = {
      ...claim,
      patientPaidAmount: newPaid,
      patientBalance: Math.max(0, claim.patientPayableAmount - newPaid),
      updatedAt: nowIso(),
    }
    return created({ id: uid("cpay"), claimId: id, paymentMode: body.paymentMode, amount: body.amount, createdAt: nowIso() })
  }),

  http.get("/insurance/claims/:id", ({ params }) => {
    const id = params.id as string
    const claim = claims.find((c) => c.id === id)
    if (!claim) return ok(null)
    return ok(claim)
  }),

  // ─── Inpatient Search ─────────────────────────────────────────────────────────

  http.get("/insurance/inpatients/search", ({ request }) => {
    const q = new URL(request.url).searchParams.get("q")?.toLowerCase() ?? ""
    if (q.length < 2) return ok([])
    const results = inpatientSearchData.filter(
      (ip) =>
        ip.name.toLowerCase().includes(q) ||
        ip.ipNumber.toLowerCase().includes(q) ||
        ip.phone.includes(q),
    )
    return ok(results)
  }),
]
