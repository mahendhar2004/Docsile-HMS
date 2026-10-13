/**
 * MSW handlers for the Patient Care module.
 *
 * Static sub-paths (search, registration-form, next-id, admission-form, next-id)
 * are registered BEFORE the :id wildcard handler so MSW matches them first.
 *
 * Endpoints covered:
 *   GET  /patient-care/patients/search
 *   GET  /patient-care/patients/registration-form
 *   GET  /patient-care/patients/next-id
 *   GET  /patient-care/patients              (offset-paginated)
 *   GET  /patient-care/patients/:id
 *   POST /patient-care/patients
 *   PATCH /patient-care/patients/:id
 *   DELETE /patient-care/patients/:id
 *   PATCH /patient-care/patients/:id/status
 *   PATCH /patient-care/patients/:id/date
 *   POST  /patient-care/patients/:id/services
 *
 *   GET  /patient-care/inpatients/admission-form
 *   GET  /patient-care/inpatients/next-id
 *   GET  /patient-care/inpatients            (offset-paginated)
 *   GET  /patient-care/inpatients/:id
 *   POST /patient-care/inpatients
 *   PATCH /patient-care/inpatients/:id
 *   DELETE /patient-care/inpatients/:id
 *   PATCH /patient-care/inpatients/:id/basic-info
 *   PATCH /patient-care/inpatients/:id/status
 *
 *   GET  /patient-care/dropdown-options
 */

import { http } from "msw"
import { ok, created, fail, paginate } from "../envelope"
import {
  patients,
  inpatients,
  dropdownOptions,
  registrationFormData,
  admissionFormData,
  getNextPatientId,
  getNextIpNumber,
  bumpPatientSeq,
  bumpIpSeq,
} from "../fixtures/patient-care"

let _patIdSeq = 200
function newPatientUuid(): string {
  return `pat-mock-${String(_patIdSeq++).padStart(4, "0")}`
}

let _ipIdSeq = 200
function newIpUuid(): string {
  return `ip-mock-${String(_ipIdSeq++).padStart(4, "0")}`
}

export const patientCareHandlers = [
  // ── Patient search (cursor-style, plain object in data) ─────────────────────
  http.get("/patient-care/patients/search", ({ request }) => {
    const url = new URL(request.url)
    const q = (url.searchParams.get("q") ?? "").toLowerCase().trim()
    const limit = Number(url.searchParams.get("limit") ?? "10")

    if (!q) return ok({ patients: [], nextCursor: null })

    const matched = patients.filter(
      (p) =>
        p.firstName.toLowerCase().includes(q) ||
        p.lastName.toLowerCase().includes(q) ||
        p.patientId.toLowerCase().includes(q) ||
        p.phone.includes(q),
    ).slice(0, limit)

    return ok({ patients: matched, nextCursor: null })
  }),

  // ── Registration form reference data ────────────────────────────────────────
  http.get("/patient-care/patients/registration-form", () => {
    return ok(registrationFormData)
  }),

  // ── Next patient ID preview ──────────────────────────────────────────────────
  http.get("/patient-care/patients/next-id", () => {
    return ok({ nextPatientId: getNextPatientId() })
  }),

  // ── OPD patients list (offset-paginated) ────────────────────────────────────
  http.get("/patient-care/patients", ({ request }) => {
    const url = new URL(request.url)
    const dateFilter = url.searchParams.get("date")
    const searchFilter = (url.searchParams.get("search") ?? "").toLowerCase().trim()
    const page = Number(url.searchParams.get("page") ?? "1")
    const pageSize = Number(url.searchParams.get("pageSize") ?? "50")

    let filtered = dateFilter
      ? patients.filter((p) => p.appointmentDate.startsWith(dateFilter))
      : patients

    if (searchFilter) {
      filtered = filtered.filter(
        (p) =>
          p.firstName.toLowerCase().includes(searchFilter) ||
          p.lastName.toLowerCase().includes(searchFilter) ||
          p.patientId.toLowerCase().includes(searchFilter) ||
          p.phone.includes(searchFilter),
      )
    }

    const { data, meta } = paginate(filtered, page, pageSize)
    return ok(data, meta)
  }),

  // ── Patient detail ──────────────────────────────────────────────────────────
  http.get("/patient-care/patients/:id", ({ params }) => {
    const id = String(params.id)
    const patient = patients.find((p) => p.id === id)
    if (!patient) return fail("Patient not found", 404)
    return ok(patient)
  }),

  // ── Create patient ──────────────────────────────────────────────────────────
  http.post("/patient-care/patients", async ({ request }) => {
    const body = await request.json() as Record<string, unknown>
    const nextId = getNextPatientId()
    bumpPatientSeq()
    const newPatient = {
      id: newPatientUuid(),
      patientId: nextId,
      firstName: String(body.firstName ?? ""),
      lastName: String(body.lastName ?? ""),
      phone: String(body.phone ?? ""),
      email: (body.email as string | null) ?? null,
      gender: String(body.gender ?? "Male"),
      dateOfBirth: (body.dateOfBirth as string | null) ?? null,
      address: (body.address as string | null) ?? null,
      patientType: String(body.patientType ?? "OPD"),
      appointmentDate: String(body.appointmentDate ?? new Date().toISOString()),
      status: "REGISTERED",
      referredBy: (body.referredBy as string | null) ?? null,
      createdById: "mock-admin-id",
      hospitalId: "mock-hospital-id",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    patients.push(newPatient)
    return created(newPatient)
  }),

  // ── Update patient ──────────────────────────────────────────────────────────
  http.patch("/patient-care/patients/:id/status", async ({ params, request }) => {
    const id = String(params.id)
    const body = await request.json() as { status: string }
    const patient = patients.find((p) => p.id === id)
    if (!patient) return fail("Patient not found", 404)
    patient.status = body.status
    patient.updatedAt = new Date().toISOString()
    return ok(patient)
  }),

  http.patch("/patient-care/patients/:id/date", async ({ params, request }) => {
    const id = String(params.id)
    const body = await request.json() as { appointmentDate: string }
    const patient = patients.find((p) => p.id === id)
    if (!patient) return fail("Patient not found", 404)
    patient.appointmentDate = body.appointmentDate
    patient.updatedAt = new Date().toISOString()
    return ok(patient)
  }),

  http.post("/patient-care/patients/:id/services", async ({ params }) => {
    const id = String(params.id)
    const patient = patients.find((p) => p.id === id)
    if (!patient) return fail("Patient not found", 404)
    return ok({ message: "Service added" })
  }),

  http.patch("/patient-care/patients/:id", async ({ params, request }) => {
    const id = String(params.id)
    const body = await request.json() as Record<string, unknown>
    const idx = patients.findIndex((p) => p.id === id)
    if (idx === -1) return fail("Patient not found", 404)
    patients[idx] = { ...patients[idx], ...body, updatedAt: new Date().toISOString() }
    return ok(patients[idx])
  }),

  http.delete("/patient-care/patients/:id", ({ params }) => {
    const id = String(params.id)
    const idx = patients.findIndex((p) => p.id === id)
    if (idx === -1) return fail("Patient not found", 404)
    patients.splice(idx, 1)
    return ok(null)
  }),

  // ── Inpatient admission form reference data ──────────────────────────────────
  http.get("/patient-care/inpatients/admission-form", () => {
    return ok(admissionFormData)
  }),

  // ── Next IP number preview ──────────────────────────────────────────────────
  http.get("/patient-care/inpatients/next-id", () => {
    return ok({ nextIpNumber: getNextIpNumber() })
  }),

  // ── Inpatients list (offset-paginated) ──────────────────────────────────────
  http.get("/patient-care/inpatients", ({ request }) => {
    const url = new URL(request.url)
    const dateFilter = url.searchParams.get("date")
    const statusFilter = url.searchParams.get("status")
    const recentDischargesOnly = url.searchParams.get("recentDischargesOnly") === "true"
    const searchFilter = (url.searchParams.get("search") ?? "").toLowerCase().trim()
    const page = Number(url.searchParams.get("page") ?? "1")
    const pageSize = Number(url.searchParams.get("pageSize") ?? "50")

    let filtered = inpatients
    if (dateFilter) {
      filtered = filtered.filter((ip) => ip.admissionDate.startsWith(dateFilter))
    }
    if (recentDischargesOnly) {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      yesterday.setHours(0, 0, 0, 0)
      filtered = filtered.filter(
        (ip) =>
          ip.status !== "discharged" ||
          (ip.dischargeDate && new Date(ip.dischargeDate) >= yesterday),
      )
    } else if (statusFilter) {
      filtered = filtered.filter((ip) => ip.status === statusFilter)
    }
    if (searchFilter) {
      filtered = filtered.filter(
        (ip) =>
          ip.ipNumber.toLowerCase().includes(searchFilter) ||
          (ip.firstName ?? "").toLowerCase().includes(searchFilter) ||
          (ip.lastName ?? "").toLowerCase().includes(searchFilter) ||
          (ip.phone ?? "").includes(searchFilter),
      )
    }

    const { data, meta } = paginate(filtered, page, pageSize)
    return ok(data, meta)
  }),

  // ── Inpatient detail ────────────────────────────────────────────────────────
  http.get("/patient-care/inpatients/:id", ({ params }) => {
    const id = String(params.id)
    const inpatient = inpatients.find((ip) => ip.id === id)
    if (!inpatient) return fail("InPatient not found", 404)
    return ok(inpatient)
  }),

  // ── Create inpatient ────────────────────────────────────────────────────────
  http.post("/patient-care/inpatients", async ({ request }) => {
    const body = await request.json() as Record<string, unknown>
    const nextNum = getNextIpNumber()
    bumpIpSeq()
    const newIp = {
      id: newIpUuid(),
      ipNumber: nextNum,
      patientId: String(body.patientId ?? ""),
      admissionDate: String(body.admissionDate ?? new Date().toISOString().slice(0, 10)),
      dischargeDate: null as string | null,
      status: "admitted" as const,
      ward: (body.ward as string | null) ?? null,
      bedNumber: (body.bedNumber as string | null) ?? null,
      onDutyDoctors: String(body.onDutyDoctors ?? "[]"),
      paymentRecords: String(body.paymentRecords ?? "[]"),
      prescriptions: String(body.prescriptions ?? "[]"),
      hospitalId: "mock-hospital-id",
      createdById: "mock-admin-id",
      createdAt: new Date().toISOString(),
    }
    inpatients.push(newIp)
    return created(newIp)
  }),

  // ── Update inpatient basic-info ──────────────────────────────────────────────
  http.patch("/patient-care/inpatients/:id/basic-info", async ({ params, request }) => {
    const id = String(params.id)
    const body = await request.json() as Record<string, unknown>
    const idx = inpatients.findIndex((ip) => ip.id === id)
    if (idx === -1) return fail("InPatient not found", 404)
    inpatients[idx] = { ...inpatients[idx], ...body }
    return ok(inpatients[idx])
  }),

  // ── Update inpatient status ─────────────────────────────────────────────────
  http.patch("/patient-care/inpatients/:id/status", async ({ params, request }) => {
    const id = String(params.id)
    const body = await request.json() as { status: string }
    const idx = inpatients.findIndex((ip) => ip.id === id)
    if (idx === -1) return fail("InPatient not found", 404)
    inpatients[idx] = { ...inpatients[idx], status: body.status as "admitted" | "discharged" }
    return ok(inpatients[idx])
  }),

  // ── Update inpatient (generic) ──────────────────────────────────────────────
  http.patch("/patient-care/inpatients/:id", async ({ params, request }) => {
    const id = String(params.id)
    const body = await request.json() as Record<string, unknown>
    const idx = inpatients.findIndex((ip) => ip.id === id)
    if (idx === -1) return fail("InPatient not found", 404)
    inpatients[idx] = { ...inpatients[idx], ...body }
    return ok(inpatients[idx])
  }),

  // ── Delete inpatient ────────────────────────────────────────────────────────
  http.delete("/patient-care/inpatients/:id", ({ params }) => {
    const id = String(params.id)
    const idx = inpatients.findIndex((ip) => ip.id === id)
    if (idx === -1) return fail("InPatient not found", 404)
    inpatients.splice(idx, 1)
    return ok(null)
  }),

  // ── Dropdown options ────────────────────────────────────────────────────────
  http.get("/patient-care/dropdown-options", ({ request }) => {
    const url = new URL(request.url)
    const fieldName = url.searchParams.get("fieldName")
    const filtered = fieldName
      ? dropdownOptions.filter((o) => o.fieldName === fieldName)
      : dropdownOptions
    return ok(filtered)
  }),
]
