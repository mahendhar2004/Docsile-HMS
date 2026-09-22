/**
 * MSW v2 handlers for the Labs module.
 */

import { http } from "msw"
import { ok, created, paginate } from "../envelope"
import {
  labs,
  investigations,
  labBills,
  pendingPatients,
  patientInvestigationMap,
  labInvestigationMappings,
  getLabWithInvestigations,
  getLabBillDetail,
  uid,
} from "../fixtures/labs"
import type {
  Lab,
  InvestigationMaster,
  LabInvestigationMapping,
  CreateLabBillsBody,
  LabBillRow,
} from "@/pages/labs/types"

function nowIso(): string {
  return new Date().toISOString()
}

export const labsHandlers = [

  // ─── Labs CRUD ───────────────────────────────────────────────────────────────

  http.get("/labs/labs", () => ok(labs.filter((l) => l.isActive))),

  http.post("/labs/labs", async ({ request }) => {
    const body = await request.json() as Omit<Lab, "id" | "sortOrder">
    const lab: Lab = { id: uid("lab"), ...body, sortOrder: labs.length + 1 }
    labs.push(lab)
    labInvestigationMappings[lab.id] = []
    return created(lab)
  }),

  http.patch("/labs/labs/:id", async ({ params, request }) => {
    const id = params.id as string
    const body = await request.json() as Partial<Omit<Lab, "id">>
    const idx = labs.findIndex((l) => l.id === id)
    if (idx === -1) return ok(null)
    labs[idx] = { ...labs[idx], ...body }
    return ok(labs[idx])
  }),

  http.delete("/labs/labs/:id", ({ params }) => {
    const id = params.id as string
    const idx = labs.findIndex((l) => l.id === id)
    if (idx !== -1) labs[idx] = { ...labs[idx], isActive: false }
    return ok(null)
  }),

  // ─── Lab detail with investigations ──────────────────────────────────────────

  // NOTE: /labs/labs/:labId/investigations must come before /labs/labs/:id
  http.get("/labs/labs/:labId/investigations", ({ params }) => {
    const labId = params.labId as string
    const mappings = labInvestigationMappings[labId] ?? []
    const result = mappings.map((m) => {
      const inv = investigations.find((i) => i.id === m.investigationId)
      return inv ?? { id: m.investigationId, name: "Unknown", category: null, description: null }
    })
    return ok(result)
  }),

  http.put("/labs/labs/:labId/investigations", async ({ params, request }) => {
    const labId = params.labId as string
    const body = await request.json() as { investigations: LabInvestigationMapping[] }
    labInvestigationMappings[labId] = body.investigations
    return ok({ labId, investigations: body.investigations })
  }),

  http.get("/labs/labs/:id", ({ params }) => {
    const id = params.id as string
    const result = getLabWithInvestigations(id)
    if (!result) return ok(null)
    return ok(result)
  }),

  // ─── Investigations Master ────────────────────────────────────────────────────

  http.get("/labs/investigations", () => ok(investigations)),

  http.post("/labs/investigations", async ({ request }) => {
    const body = await request.json() as { name: string; category?: string | null; description?: string | null }
    const inv: InvestigationMaster = {
      id: uid("inv"), name: body.name, category: body.category ?? null, description: body.description ?? null,
    }
    investigations.push(inv)
    return created(inv)
  }),

  // ─── Patient Investigations ───────────────────────────────────────────────────

  http.get("/labs/patients/:patientId/investigations", ({ params }) => {
    const patientId = params.patientId as string
    const result = patientInvestigationMap[patientId] ?? {
      patient: { patientId, name: "Unknown", age: null, gender: "Unknown", phone: "", doctorName: null },
      prescription: null,
      labGroups: [],
      unassigned: [],
      existingBills: [],
    }
    return ok(result)
  }),

  // ─── Pending Investigations ───────────────────────────────────────────────────

  http.get("/labs/pending-investigations", () => ok(pendingPatients)),

  // ─── Lab Bills ───────────────────────────────────────────────────────────────

  // NOTE: /labs/bills/:id must come after /labs/bills
  http.get("/labs/bills", ({ request }) => {
    const sp = new URL(request.url).searchParams
    const page = Number(sp.get("page") ?? "1")
    const pageSize = Number(sp.get("pageSize") ?? "25")
    const dateFilter = sp.get("date")
    let filtered: LabBillRow[] = [...labBills]
    if (dateFilter) {
      filtered = filtered.filter((b) => b.createdAt.startsWith(dateFilter))
    }
    const { data, meta } = paginate(filtered, page, pageSize)
    return ok(data, meta)
  }),

  http.get("/labs/bills/:id", ({ params }) => {
    const id = params.id as string
    const detail = getLabBillDetail(id)
    if (!detail) return ok(null)
    return ok(detail)
  }),

  http.post("/labs/bills", async ({ request }) => {
    const body = await request.json() as CreateLabBillsBody
    const created_bills = body.bills.map((entry) => {
      const lab = labs.find((l) => l.id === entry.bill.labId)
      const subtotal = entry.items.reduce((acc, it) => acc + it.amount, 0)
      const total = subtotal - (entry.bill.discount ?? 0)
      const amountPaid = entry.payment?.amount ?? 0
      const billNum = `LB-${new Date().getFullYear()}-${String(labBills.length + 1).padStart(3, "0")}`
      const newBill: LabBillRow = {
        id: uid("lbill"), billNumber: billNum, createdAt: nowIso(),
        subtotal, discount: entry.bill.discount ?? 0, total,
        amountPaid, balanceDue: total - amountPaid,
        status: amountPaid >= total ? "PAID" : amountPaid > 0 ? "PARTIAL" : "PENDING",
        paymentMode: entry.payment?.paymentMode ?? null,
        lab: { name: lab?.name ?? "Unknown Lab", printHeaderKey: lab?.printHeaderKey ?? null },
        patient: {
          id: uid("p-uuid"), patientId: entry.bill.patientId,
          firstName: "Patient", lastName: null,
          phone: "", age: null, gender: null, address: null,
        },
        items: entry.items.map((it) => ({ name: it.name, amount: it.amount })),
      }
      labBills.unshift(newBill)
      return newBill
    })
    return created(created_bills)
  }),
]
