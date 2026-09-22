/**
 * MSW v2 handlers for the Settings module.
 * Covers all 33 endpoints across 10 sub-scopes.
 */

import { http } from "msw"
import { ok, created } from "../envelope"
import {
  serviceTemplates,
  hospitalProfile,
  printConfig,
  prescriptionTemplates,
  inpatientTemplates,
  packages,
  surgeries,
  discharges,
  medicineMaster,
  uid,
} from "../fixtures/settings"
import type {
  ServiceTemplate,
  ServiceTemplateInput,
  HospitalProfileInput,
  PrescriptionTemplate,
  InpatientTemplate,
  PredefinedPackage,
  PredefinedSurgery,
  PredefinedDischarge,
  MedicineMaster,
} from "@/pages/settings/types"

function nowIso(): string {
  return new Date().toISOString()
}

export const settingsHandlers = [

  // ─── Service Templates ────────────────────────────────────────────────────────

  http.get("/settings/service-templates", () => ok(serviceTemplates)),

  http.post("/settings/service-templates", async ({ request }) => {
    const body = await request.json() as ServiceTemplateInput
    const tmpl: ServiceTemplate = {
      id: uid("svc"), name: body.name, category: body.category ?? null,
      description: body.description ?? null, amount: body.amount,
      discount: body.discount ?? 0, sortOrder: body.sortOrder ?? serviceTemplates.length + 1,
      isActive: body.isActive ?? true, hospitalId: "mock-hospital-id",
      createdAt: nowIso(), updatedAt: nowIso(),
    }
    serviceTemplates.push(tmpl)
    return created(tmpl)
  }),

  http.patch("/settings/service-templates/:id", async ({ params, request }) => {
    const id = params.id as string
    const body = await request.json() as Partial<ServiceTemplateInput>
    const idx = serviceTemplates.findIndex((t) => t.id === id)
    if (idx === -1) return ok(null)
    serviceTemplates[idx] = { ...serviceTemplates[idx], ...body, updatedAt: nowIso() }
    return ok(serviceTemplates[idx])
  }),

  http.delete("/settings/service-templates/:id", ({ params }) => {
    const id = params.id as string
    const idx = serviceTemplates.findIndex((t) => t.id === id)
    if (idx !== -1) serviceTemplates.splice(idx, 1)
    return ok(null)
  }),

  // ─── Hospital Profile ─────────────────────────────────────────────────────────

  http.get("/settings/hospital-profile", () => ok(hospitalProfile)),

  http.patch("/settings/hospital-profile", async ({ request }) => {
    const body = await request.json() as HospitalProfileInput
    Object.assign(hospitalProfile, body)
    return ok(hospitalProfile)
  }),

  // ─── Print Config ─────────────────────────────────────────────────────────────

  http.get("/settings/print-config", () => ok(printConfig)),

  http.patch("/settings/print-config", async ({ request }) => {
    const body = await request.json() as Record<string, unknown>
    Object.assign(printConfig, body)
    // Also merge into hospitalProfile.settings (mimics real backend)
    const settings = JSON.parse(hospitalProfile.settings ?? "{}")
    Object.assign(settings, { defaultPrint: body })
    hospitalProfile.settings = JSON.stringify(settings)
    return ok(printConfig)
  }),

  // ─── Nav Style ────────────────────────────────────────────────────────────────

  http.patch("/settings/nav-style", async ({ request }) => {
    const body = await request.json() as { navStyle: string }
    const settings = JSON.parse(hospitalProfile.settings ?? "{}")
    settings.navStyle = body.navStyle
    hospitalProfile.settings = JSON.stringify(settings)
    return ok({ navStyle: body.navStyle })
  }),

  // ─── Prescription Templates ───────────────────────────────────────────────────

  http.get("/settings/prescription-templates", () => ok(prescriptionTemplates.filter((t) => t.isActive))),

  http.post("/settings/prescription-templates", async ({ request }) => {
    const body = await request.json() as Omit<PrescriptionTemplate, "id" | "createdAt" | "updatedAt">
    const tmpl: PrescriptionTemplate = {
      id: uid("pt"), ...body, createdAt: nowIso(), updatedAt: nowIso(),
    }
    prescriptionTemplates.push(tmpl)
    return created(tmpl)
  }),

  http.patch("/settings/prescription-templates/:id", async ({ params, request }) => {
    const id = params.id as string
    const body = await request.json() as Partial<Omit<PrescriptionTemplate, "id">>
    const idx = prescriptionTemplates.findIndex((t) => t.id === id)
    if (idx === -1) return ok(null)
    prescriptionTemplates[idx] = { ...prescriptionTemplates[idx], ...body, updatedAt: nowIso() }
    return ok(prescriptionTemplates[idx])
  }),

  http.delete("/settings/prescription-templates/:id", ({ params }) => {
    const id = params.id as string
    const idx = prescriptionTemplates.findIndex((t) => t.id === id)
    if (idx !== -1) prescriptionTemplates[idx] = { ...prescriptionTemplates[idx], isActive: false, updatedAt: nowIso() }
    return ok(null)
  }),

  // ─── Inpatient Templates ──────────────────────────────────────────────────────

  http.get("/settings/inpatient-templates", () => ok(inpatientTemplates.filter((t) => t.isActive))),

  http.post("/settings/inpatient-templates", async ({ request }) => {
    const body = await request.json() as Omit<InpatientTemplate, "id">
    const tmpl: InpatientTemplate = { id: uid("it"), ...body }
    inpatientTemplates.push(tmpl)
    return created(tmpl)
  }),

  http.patch("/settings/inpatient-templates/:id", async ({ params, request }) => {
    const id = params.id as string
    const body = await request.json() as Partial<Omit<InpatientTemplate, "id">>
    const idx = inpatientTemplates.findIndex((t) => t.id === id)
    if (idx === -1) return ok(null)
    inpatientTemplates[idx] = { ...inpatientTemplates[idx], ...body }
    return ok(inpatientTemplates[idx])
  }),

  http.delete("/settings/inpatient-templates/:id", ({ params }) => {
    const id = params.id as string
    const idx = inpatientTemplates.findIndex((t) => t.id === id)
    if (idx !== -1) inpatientTemplates[idx] = { ...inpatientTemplates[idx], isActive: false }
    return ok(null)
  }),

  // ─── Packages ─────────────────────────────────────────────────────────────────

  http.get("/settings/packages", () => ok(packages.filter((p) => p.isActive))),

  http.post("/settings/packages", async ({ request }) => {
    const body = await request.json() as Omit<PredefinedPackage, "id">
    const pkg: PredefinedPackage = { id: uid("pkg"), ...body }
    packages.push(pkg)
    return created(pkg)
  }),

  http.patch("/settings/packages/:id", async ({ params, request }) => {
    const id = params.id as string
    const body = await request.json() as Partial<Omit<PredefinedPackage, "id">>
    const idx = packages.findIndex((p) => p.id === id)
    if (idx === -1) return ok(null)
    packages[idx] = { ...packages[idx], ...body }
    return ok(packages[idx])
  }),

  http.delete("/settings/packages/:id", ({ params }) => {
    const id = params.id as string
    const idx = packages.findIndex((p) => p.id === id)
    if (idx !== -1) packages[idx] = { ...packages[idx], isActive: false }
    return ok(null)
  }),

  // ─── Surgeries ────────────────────────────────────────────────────────────────

  http.get("/settings/surgeries", () => ok(surgeries.filter((s) => s.isActive !== false))),

  http.post("/settings/surgeries", async ({ request }) => {
    const body = await request.json() as Omit<PredefinedSurgery, "id">
    const surg: PredefinedSurgery = { id: uid("surg"), ...body, sortOrder: surgeries.length + 1 }
    surgeries.push(surg)
    return created(surg)
  }),

  http.patch("/settings/surgeries/:id", async ({ params, request }) => {
    const id = params.id as string
    const body = await request.json() as Partial<Omit<PredefinedSurgery, "id">>
    const idx = surgeries.findIndex((s) => s.id === id)
    if (idx === -1) return ok(null)
    surgeries[idx] = { ...surgeries[idx], ...body }
    return ok(surgeries[idx])
  }),

  http.delete("/settings/surgeries/:id", ({ params }) => {
    const id = params.id as string
    const idx = surgeries.findIndex((s) => s.id === id)
    if (idx !== -1) surgeries[idx] = { ...surgeries[idx], isActive: false }
    return ok(null)
  }),

  // ─── Discharges ───────────────────────────────────────────────────────────────

  http.get("/settings/discharges", () => ok(discharges.filter((d) => d.isActive !== false))),

  http.post("/settings/discharges", async ({ request }) => {
    const body = await request.json() as Omit<PredefinedDischarge, "id">
    const disch: PredefinedDischarge = { id: uid("disch"), ...body, sortOrder: discharges.length + 1 }
    discharges.push(disch)
    return created(disch)
  }),

  http.patch("/settings/discharges/:id", async ({ params, request }) => {
    const id = params.id as string
    const body = await request.json() as Partial<Omit<PredefinedDischarge, "id">>
    const idx = discharges.findIndex((d) => d.id === id)
    if (idx === -1) return ok(null)
    discharges[idx] = { ...discharges[idx], ...body }
    return ok(discharges[idx])
  }),

  http.delete("/settings/discharges/:id", ({ params }) => {
    const id = params.id as string
    const idx = discharges.findIndex((d) => d.id === id)
    if (idx !== -1) discharges[idx] = { ...discharges[idx], isActive: false }
    return ok(null)
  }),

  // ─── Medicine Master ──────────────────────────────────────────────────────────

  http.get("/settings/medicine-master", () => ok(medicineMaster.filter((m) => m.isActive))),

  http.post("/settings/medicine-master", async ({ request }) => {
    const body = await request.json() as Omit<MedicineMaster, "id">
    const med: MedicineMaster = {
      id: uid("mm"), name: body.name, category: body.category ?? null,
      defaultTiming: body.defaultTiming ?? null, defaultDays: body.defaultDays ?? null,
      note: body.note ?? null, sortOrder: body.sortOrder ?? medicineMaster.length + 1,
      isActive: body.isActive ?? true,
    }
    medicineMaster.push(med)
    return created(med)
  }),

  http.patch("/settings/medicine-master/:id", async ({ params, request }) => {
    const id = params.id as string
    const body = await request.json() as Partial<Omit<MedicineMaster, "id">>
    const idx = medicineMaster.findIndex((m) => m.id === id)
    if (idx === -1) return ok(null)
    medicineMaster[idx] = { ...medicineMaster[idx], ...body }
    return ok(medicineMaster[idx])
  }),

  http.delete("/settings/medicine-master/:id", ({ params }) => {
    const id = params.id as string
    const idx = medicineMaster.findIndex((m) => m.id === id)
    if (idx !== -1) medicineMaster[idx] = { ...medicineMaster[idx], isActive: false }
    return ok(null)
  }),
]
