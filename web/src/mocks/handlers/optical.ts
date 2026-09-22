/**
 * MSW v2 handlers for the Optical module.
 */

import { http } from "msw"
import { ok, created, paginate } from "../envelope"
import {
  products,
  stock,
  bills,
  opticalSettings,
  hospitalProfile,
  patientArReadings,
  getStockSummary,
  searchStock,
  uid,
} from "../fixtures/optical"
import type {
  CreateOpticalProductBody,
  UpdateOpticalProductBody,
  CreateOpticalStockBody,
  UpdateOpticalStockBody,
  CreateOpticalBillBody,
  OpticalProduct,
  OpticalStockEntry,
  OpticalBillRow,
  OpticalSettings,
} from "@/pages/optical/types"

function nowIso(): string {
  return new Date().toISOString()
}

export const opticalHandlers = [

  // ─── Products ────────────────────────────────────────────────────────────────

  http.get("/optical/products", () => ok(products.filter((p) => p.isActive))),

  http.post("/optical/products", async ({ request }) => {
    const body = await request.json() as CreateOpticalProductBody
    const prod: OpticalProduct = {
      id: uid("opt-prod"), name: body.name, brand: body.brand ?? null,
      category: body.category, type: body.type ?? null, material: body.material ?? null,
      color: body.color ?? null, size: body.size ?? null, coating: body.coating ?? null,
      index: body.index ?? null, modelNumber: body.modelNumber ?? null,
      hsnCode: body.hsnCode ?? null, gstPercent: body.gstPercent ?? 12, isActive: true,
    }
    products.push(prod)
    return created(prod)
  }),

  http.patch("/optical/products/:id", async ({ params, request }) => {
    const id = params.id as string
    const body = await request.json() as UpdateOpticalProductBody
    const idx = products.findIndex((p) => p.id === id)
    if (idx === -1) return ok(null)
    products[idx] = { ...products[idx], ...body }
    return ok(products[idx])
  }),

  http.delete("/optical/products/:id", ({ params }) => {
    const id = params.id as string
    const idx = products.findIndex((p) => p.id === id)
    if (idx !== -1) products[idx] = { ...products[idx], isActive: false }
    return ok(null)
  }),

  // ─── Stock ───────────────────────────────────────────────────────────────────

  // NOTE: specific routes must come before :id wildcard
  http.get("/optical/stock/summary", () => ok(getStockSummary())),

  http.get("/optical/stock/search", ({ request }) => {
    const q = new URL(request.url).searchParams.get("q") ?? ""
    return ok(searchStock(q))
  }),

  http.get("/optical/stock", () => ok(stock.filter((s) => s.isActive))),

  http.post("/optical/stock", async ({ request }) => {
    const body = await request.json() as CreateOpticalStockBody
    const prod = products.find((p) => p.id === body.productId)
    const entry: OpticalStockEntry = {
      id: uid("opt-stk"), productId: body.productId,
      batchNumber: body.batchNumber ?? null, quantity: body.quantity,
      mrp: body.mrp ?? 0, costPrice: body.costPrice ?? 0,
      gstPercent: body.gstPercent ?? 12, power: body.power ?? null,
      isActive: true,
      product: {
        id: body.productId, name: prod?.name ?? "Unknown",
        brand: prod?.brand ?? null, category: prod?.category ?? "Other",
        type: prod?.type ?? null, modelNumber: prod?.modelNumber ?? null,
      },
    }
    stock.push(entry)
    return created(entry)
  }),

  http.patch("/optical/stock/:id", async ({ params, request }) => {
    const id = params.id as string
    const body = await request.json() as UpdateOpticalStockBody
    const idx = stock.findIndex((s) => s.id === id)
    if (idx === -1) return ok(null)
    stock[idx] = { ...stock[idx], ...body }
    return ok(stock[idx])
  }),

  // ─── Bills ───────────────────────────────────────────────────────────────────

  http.get("/optical/bills", ({ request }) => {
    const sp = new URL(request.url).searchParams
    const page = Number(sp.get("page") ?? "1")
    const pageSize = Number(sp.get("pageSize") ?? "25")
    const statusFilter = sp.get("status")
    const searchFilter = sp.get("search")?.toLowerCase()
    let filtered = [...bills]
    if (statusFilter) filtered = filtered.filter((b) => b.status === statusFilter)
    if (searchFilter) filtered = filtered.filter((b) => b.patientName.toLowerCase().includes(searchFilter) || b.billNumber.toLowerCase().includes(searchFilter))
    const { data, meta } = paginate(filtered, page, pageSize)
    return ok(data, meta)
  }),

  http.post("/optical/bills", async ({ request }) => {
    const body = await request.json() as CreateOpticalBillBody
    const subtotal = body.items.reduce((acc, it) => acc + it.total, 0)
    const discountAmount = (subtotal * (body.discountPercent ?? 0)) / 100
    const gstAmount = body.items.reduce((acc, it) => acc + (it.amount * (it.gstPercent ?? 12)) / 100, 0)
    const netAmount = subtotal - discountAmount + gstAmount
    const billNum = `OB-${new Date().getFullYear()}-${String(bills.length + 1).padStart(3, "0")}`
    const bill: OpticalBillRow = {
      id: uid("opt-bill"), billNumber: billNum,
      patientId: body.patientId ?? null, patientName: body.patientName,
      patientPhone: body.patientPhone ?? null, gender: body.gender ?? null,
      referredDoctor: body.referredDoctor ?? null, prescriptionId: body.prescriptionId ?? null,
      lensPrescription: body.lensPrescription ? JSON.stringify(body.lensPrescription) : null,
      billDate: nowIso(), subtotal, discountPercent: body.discountPercent ?? 0,
      discountAmount, gstAmount, netAmount, roundOff: body.roundOff ?? 0,
      billAmount: netAmount + (body.roundOff ?? 0),
      paidAmount: body.paidAmount,
      balanceDue: netAmount + (body.roundOff ?? 0) - body.paidAmount,
      paymentMode: body.paymentMode, paymentRef: body.paymentRef ?? null,
      deliveryDate: body.deliveryDate ?? null, orderNotes: body.orderNotes ?? null,
      status: body.status ?? "COMPLETED",
      createdBy: "mock-admin-id", createdAt: nowIso(), updatedAt: nowIso(),
      items: body.items.map((it) => ({
        id: uid("obi"), billId: uid("opt-bill-ref"),
        stockId: it.stockId ?? null, itemName: it.itemName, category: it.category,
        eye: it.eye ?? null, quantity: it.quantity, mrp: it.mrp ?? 0,
        price: it.price, total: it.total, discountPercent: it.discountPercent ?? 0,
        amount: it.amount, gstPercent: it.gstPercent ?? 12,
      })),
    }
    bills.unshift(bill)
    return created(bill)
  }),

  http.patch("/optical/bills/:id/status", async ({ params, request }) => {
    const id = params.id as string
    const body = await request.json() as { status: string }
    const idx = bills.findIndex((b) => b.id === id)
    if (idx === -1) return ok(null)
    bills[idx] = { ...bills[idx], status: body.status, updatedAt: nowIso() }
    return ok(bills[idx])
  }),

  // ─── Patient AR Reading ───────────────────────────────────────────────────────

  http.get("/optical/patients/:patientId/ar-reading", ({ params }) => {
    const patientId = params.patientId as string
    const reading = patientArReadings[patientId] ?? {
      patientId, name: "Unknown Patient", age: null, gender: null,
      phone: null, doctorName: null,
      autoRefractometer: null, glassesReading: null, presentPrescription: null,
      readingDate: null, prescriptionId: null,
    }
    return ok(reading)
  }),

  // ─── Settings ─────────────────────────────────────────────────────────────────

  http.get("/optical/settings", () => ok(opticalSettings)),

  http.patch("/optical/settings", async ({ request }) => {
    const body = await request.json() as Partial<OpticalSettings>
    Object.assign(opticalSettings, body)
    return ok(opticalSettings)
  }),

  // ─── Hospital Profile ─────────────────────────────────────────────────────────

  http.get("/optical/hospital-profile", () => ok(hospitalProfile)),
]
