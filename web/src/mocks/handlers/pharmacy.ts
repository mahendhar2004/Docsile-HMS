/**
 * MSW v2 handlers for the Pharmacy module.
 * All GET endpoints + create/update/delete mutations modify in-memory fixtures.
 */

import { http } from "msw"
import { ok, created, paginate } from "../envelope"
import {
  medicines,
  suppliers,
  stock,
  purchaseOrders,
  bills,
  pendingMedicines,
  patientPrescriptionMap,
  getStockSummary,
  searchStock,
  uid,
  nowIso,
} from "../fixtures/pharmacy"
import type {
  MedicineFormValues,
  AddStockBody,
  UpdateStockBody,
  SupplierFormValues,
  CreatePurchaseOrderBody,
  ReceivePurchaseOrderBody,
  CreatePharmacyBillBody,
  PharmacyMedicine,
  PharmacyStockItem,
  PharmacySupplier,
  PurchaseOrder,
} from "@/pages/pharmacy/types"

const HOSPITAL_ID = "mock-hospital-id"

export const pharmacyHandlers = [

  // ─── Medicines ────────────────────────────────────────────────────────────────

  http.get("/pharmacy/medicines", () => ok(medicines.filter((m) => m.isActive))),

  http.post("/pharmacy/medicines", async ({ request }) => {
    const body = await request.json() as MedicineFormValues
    const med: PharmacyMedicine = {
      id: uid("med"), ...body, isActive: true, hospitalId: HOSPITAL_ID,
      createdAt: nowIso(), updatedAt: nowIso(),
    }
    medicines.push(med)
    return created(med)
  }),

  http.patch("/pharmacy/medicines/:id", async ({ params, request }) => {
    const id = params.id as string
    const body = await request.json() as Partial<MedicineFormValues>
    const idx = medicines.findIndex((m) => m.id === id)
    if (idx === -1) return ok(null)
    medicines[idx] = { ...medicines[idx], ...body, updatedAt: nowIso() }
    return ok(medicines[idx])
  }),

  http.delete("/pharmacy/medicines/:id", ({ params }) => {
    const id = params.id as string
    const idx = medicines.findIndex((m) => m.id === id)
    if (idx !== -1) medicines[idx] = { ...medicines[idx], isActive: false, updatedAt: nowIso() }
    return ok(null)
  }),

  // ─── Stock ────────────────────────────────────────────────────────────────────

  // NOTE: /pharmacy/stock/summary and /pharmacy/stock/search must come before /pharmacy/stock/:id
  http.get("/pharmacy/stock/summary", () => ok(getStockSummary())),

  http.get("/pharmacy/stock/search", ({ request }) => {
    const q = new URL(request.url).searchParams.get("q") ?? ""
    return ok(searchStock(q))
  }),

  http.get("/pharmacy/stock", () => ok(stock.filter((s) => s.isActive))),

  http.post("/pharmacy/stock", async ({ request }) => {
    const body = await request.json() as AddStockBody
    const med = medicines.find((m) => m.id === body.medicineId)
    const sup = body.supplierId ? suppliers.find((s) => s.id === body.supplierId) : null
    const entry: PharmacyStockItem = {
      id: uid("stk"),
      medicineId: body.medicineId,
      batchNumber: body.batchNumber,
      quantity: body.quantity,
      mrp: body.mrp,
      costPrice: body.costPrice,
      gstPercent: body.gstPercent,
      unitsPerPack: body.unitsPerPack,
      expiryDate: body.expiryDate,
      supplierId: body.supplierId ?? null,
      manufacturingDate: null,
      purchaseOrderId: null,
      hospitalId: HOSPITAL_ID,
      isActive: true,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      medicine: {
        name: med?.name ?? "Unknown",
        genericName: med?.genericName ?? null,
        manufacturer: med?.manufacturer ?? null,
        category: med?.category ?? null,
        gstPercent: med?.gstPercent ?? body.gstPercent,
        unitOfMeasure: med?.unitOfMeasure ?? "Nos",
      },
      supplier: sup ? { name: sup.name } : null,
    }
    stock.push(entry)
    return created(entry)
  }),

  http.patch("/pharmacy/stock/:id", async ({ params, request }) => {
    const id = params.id as string
    const body = await request.json() as UpdateStockBody
    const idx = stock.findIndex((s) => s.id === id)
    if (idx === -1) return ok(null)
    stock[idx] = { ...stock[idx], ...body, updatedAt: nowIso() }
    return ok(stock[idx])
  }),

  // ─── Suppliers ────────────────────────────────────────────────────────────────

  http.get("/pharmacy/suppliers", () => ok(suppliers.filter((s) => s.isActive))),

  http.post("/pharmacy/suppliers", async ({ request }) => {
    const body = await request.json() as SupplierFormValues
    const sup: PharmacySupplier = {
      id: uid("sup"), ...body, hospitalId: HOSPITAL_ID, isActive: true,
      createdAt: nowIso(), updatedAt: nowIso(),
    }
    suppliers.push(sup)
    return created(sup)
  }),

  http.patch("/pharmacy/suppliers/:id", async ({ params, request }) => {
    const id = params.id as string
    const body = await request.json() as Partial<SupplierFormValues>
    const idx = suppliers.findIndex((s) => s.id === id)
    if (idx === -1) return ok(null)
    suppliers[idx] = { ...suppliers[idx], ...body, updatedAt: nowIso() }
    return ok(suppliers[idx])
  }),

  http.delete("/pharmacy/suppliers/:id", ({ params }) => {
    const id = params.id as string
    const idx = suppliers.findIndex((s) => s.id === id)
    if (idx !== -1) suppliers[idx] = { ...suppliers[idx], isActive: false, updatedAt: nowIso() }
    return ok(null)
  }),

  // ─── Purchase Orders ──────────────────────────────────────────────────────────

  // NOTE: /pharmacy/purchase-orders/:id/receive must come before /pharmacy/purchase-orders/:id/status
  http.get("/pharmacy/purchase-orders", ({ request }) => {
    const status = new URL(request.url).searchParams.get("status")
    const filtered = status
      ? purchaseOrders.filter((po) => po.status === status)
      : purchaseOrders
    return ok(filtered)
  }),

  http.post("/pharmacy/purchase-orders", async ({ request }) => {
    const body = await request.json() as CreatePurchaseOrderBody
    const sup = suppliers.find((s) => s.id === body.order.supplierId)
    const orderNum = `PO-${new Date().getFullYear()}-${String(purchaseOrders.length + 1).padStart(3, "0")}`
    const subtotal = body.items.reduce((acc, it) => acc + it.quantity * it.costPrice, 0)
    const gstAmount = body.items.reduce((acc, it) => acc + (it.quantity * it.costPrice * it.gstPercent) / 100, 0)
    const po: PurchaseOrder = {
      id: uid("po"), orderNumber: orderNum, supplierId: body.order.supplierId,
      status: "DRAFT",
      subtotal, gstAmount, discount: body.order.discount ?? 0,
      totalAmount: subtotal + gstAmount - (body.order.discount ?? 0),
      amountPaid: body.order.amountPaid ?? 0,
      balanceDue: subtotal + gstAmount - (body.order.discount ?? 0) - (body.order.amountPaid ?? 0),
      paymentMode: body.order.paymentMode ?? null,
      invoiceNumber: body.order.invoiceNumber ?? null,
      invoiceDate: body.order.invoiceDate ?? null,
      expectedDate: body.order.expectedDate ?? null,
      notes: body.order.notes ?? null,
      hospitalId: HOSPITAL_ID,
      createdAt: nowIso(), updatedAt: nowIso(),
      supplier: { name: sup?.name ?? "Unknown", phone: sup?.phone ?? null },
      items: body.items.map((it, i) => {
        const med = medicines.find((m) => m.id === it.medicineId)
        return {
          id: uid("poi"),
          purchaseOrderId: uid("po-ref"),
          medicineId: it.medicineId,
          batchNumber: it.batchNumber ?? null,
          quantity: it.quantity, receivedQty: 0,
          costPrice: it.costPrice, mrp: it.mrp, gstPercent: it.gstPercent,
          expiryDate: it.expiryDate ?? null,
          amount: it.quantity * it.costPrice,
          medicine: { name: med?.name ?? `Item ${i + 1}` },
        }
      }),
    }
    purchaseOrders.push(po)
    return created({ orderNumber: orderNum })
  }),

  http.post("/pharmacy/purchase-orders/:id/receive", async ({ params, request }) => {
    const id = params.id as string
    const body = await request.json() as ReceivePurchaseOrderBody
    const idx = purchaseOrders.findIndex((po) => po.id === id)
    if (idx === -1) return ok(null)
    const po = purchaseOrders[idx]
    let allReceived = true
    const updatedItems = po.items.map((item) => {
      const recv = body.receivedItems.find((r) => r.itemId === item.id)
      if (recv) {
        const newRcvd = item.receivedQty + recv.receivedQty
        if (newRcvd < item.quantity) allReceived = false
        return { ...item, receivedQty: newRcvd, batchNumber: recv.batchNumber, expiryDate: recv.expiryDate, mrp: recv.mrp, costPrice: recv.costPrice }
      }
      if (item.receivedQty < item.quantity) allReceived = false
      return item
    })
    purchaseOrders[idx] = {
      ...po,
      items: updatedItems,
      status: allReceived ? "RECEIVED" : "PARTIALLY_RECEIVED",
      updatedAt: nowIso(),
    }
    return ok(purchaseOrders[idx])
  }),

  http.patch("/pharmacy/purchase-orders/:id/status", async ({ params, request }) => {
    const id = params.id as string
    const body = await request.json() as { status: string }
    const idx = purchaseOrders.findIndex((po) => po.id === id)
    if (idx === -1) return ok(null)
    purchaseOrders[idx] = { ...purchaseOrders[idx], status: body.status as PurchaseOrder["status"], updatedAt: nowIso() }
    return ok(purchaseOrders[idx])
  }),

  // ─── Bills ────────────────────────────────────────────────────────────────────

  http.get("/pharmacy/bills", ({ request }) => {
    const sp = new URL(request.url).searchParams
    const page = Number(sp.get("page") ?? "1")
    const pageSize = Number(sp.get("pageSize") ?? "50")
    const { data, meta } = paginate(bills, page, pageSize)
    return ok(data, meta)
  }),

  http.post("/pharmacy/bills", async ({ request }) => {
    const body = await request.json() as CreatePharmacyBillBody
    const subtotal = body.items.reduce((acc, it) => acc + it.total, 0)
    const discountAmount = (subtotal * (body.bill.discountPercent ?? 0)) / 100
    const gstAmount = body.items.reduce((acc, it) => acc + (it.amount * it.gstPercent) / 100, 0)
    const netAmount = subtotal - discountAmount + gstAmount
    const billNum = `PB-${new Date().getFullYear()}-${String(bills.length + 1).padStart(3, "0")}`
    const bill = {
      id: uid("pbill"), billNumber: billNum,
      patientId: body.bill.patientId ?? null,
      patientName: body.bill.patientName, patientPhone: body.bill.patientPhone ?? null,
      gender: body.bill.gender ?? null, email: body.bill.email ?? null,
      referredDoctor: body.bill.referredDoctor ?? null,
      prescriptionId: body.bill.prescriptionId ?? null,
      subtotal, discountPercent: body.bill.discountPercent ?? 0,
      discountAmount, gstAmount, netAmount,
      roundOff: body.bill.roundOff ?? 0,
      billAmount: netAmount + (body.bill.roundOff ?? 0),
      paidAmount: body.bill.paidAmount,
      balanceDue: netAmount + (body.bill.roundOff ?? 0) - body.bill.paidAmount,
      paymentMode: body.bill.paymentMode,
      paymentRef: body.bill.paymentRef ?? null,
      status: body.bill.paidAmount >= netAmount ? "PAID" : "PENDING",
      billDate: nowIso(), hospitalId: HOSPITAL_ID, createdAt: nowIso(), updatedAt: nowIso(),
      items: body.items.map((it) => ({ id: uid("pbi"), billId: uid("pbill-ref"), ...it })),
    }
    bills.unshift(bill)
    return created({ billNumber: billNum, billAmount: bill.billAmount })
  }),

  // ─── Pending Medicines ────────────────────────────────────────────────────────

  http.get("/pharmacy/pending-medicines", () => ok(pendingMedicines)),

  // ─── Patient Prescription Lookup ──────────────────────────────────────────────

  http.get("/pharmacy/patients/:patientId/prescription", ({ params }) => {
    const patientId = params.patientId as string
    const result = patientPrescriptionMap[patientId] ?? {
      patient: { patientId, name: "Unknown Patient", age: null, gender: null, phone: "", email: null, doctorName: null },
      prescription: null,
    }
    return ok(result)
  }),
]
