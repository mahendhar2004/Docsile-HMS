/**
 * MSW handlers for the Doctor module.
 *
 * Static sub-paths (/reference-data) are registered before the :id wildcard.
 *
 * Endpoints:
 *   GET  /doctor/queue
 *   GET  /doctor/patients/:id/consultation
 *   GET  /doctor/reference-data
 *   POST /doctor/patients/:id/prescriptions  (upsert)
 *   POST /doctor/medicines
 *   POST /doctor/dropdown-options
 *   POST /doctor/ai/ask
 */

import { http } from "msw"
import { ok, created, fail } from "../envelope"
import {
  doctorQueue,
  prescriptionRecords,
  medicines,
  referenceData,
  doctorDropdownOptions,
  buildConsultation,
  nextPrescriptionId,
  nextMedicineId,
} from "../fixtures/doctor"

const CANNED_AI_RESPONSES = [
  "Based on the clinical presentation, the findings are consistent with moderate dry eye disease. Consider prescribing preservative-free lubricating drops four times daily and advising the patient to reduce screen time and use a humidifier at home. A follow-up in 4 weeks is recommended to assess response.",
  "The autorefractometer readings suggest myopia in both eyes. Spectacle correction is advisable. Ensure the prescription is checked with subjective refraction before finalising. Advise the patient about UV protection glasses.",
  "IOP readings are within normal limits. No signs of glaucomatous optic nerve damage on fundus examination. Continue current management and schedule a visual field test at the next visit for baseline documentation.",
  "The patient's history of diabetes warrants dilated fundus examination every 6 months. Current findings show no retinopathy changes. Advise strict glycaemic control and blood pressure management.",
  "Allergic conjunctivitis is the most likely diagnosis given the bilateral itching, papillary reaction, and seasonal presentation. Olopatadine drops twice daily for 2 weeks should provide adequate relief. Cold compresses may help with symptomatic relief.",
]

let _aiIdx = 0
function nextCannedAnswer(): string {
  const answer = CANNED_AI_RESPONSES[_aiIdx % CANNED_AI_RESPONSES.length]
  _aiIdx++
  return answer
}

export const doctorHandlers = [
  // ── Doctor queue ─────────────────────────────────────────────────────────────
  http.get("/doctor/queue", () => {
    return ok(doctorQueue)
  }),

  // ── Reference data (BEFORE :id wildcard) ────────────────────────────────────
  http.get("/doctor/reference-data", () => {
    return ok({ ...referenceData, medicines })
  }),

  // ── Consultation for a specific patient ─────────────────────────────────────
  http.get("/doctor/patients/:id/consultation", ({ params }) => {
    const id = String(params.id)
    const consultation = buildConsultation(id)
    if (!consultation) return fail("Patient not found", 404)
    return ok(consultation)
  }),

  // ── Save (upsert) prescription ───────────────────────────────────────────────
  http.post("/doctor/patients/:id/prescriptions", async ({ params, request }) => {
    const patientUuid = String(params.id)
    const body = await request.json() as Record<string, unknown>

    // Check if there's already a today prescription for this patient.
    const today = new Date().toISOString().slice(0, 10)
    const existingIdx = prescriptionRecords.findIndex(
      (rx) => rx.patientId === patientUuid && rx.prescriptionDate === today,
    )

    const rxId = existingIdx >= 0
      ? prescriptionRecords[existingIdx].id
      : nextPrescriptionId()

    const record = {
      id: rxId,
      patientId: patientUuid,
      patientType: String(body.patientType ?? "OPD"),
      status: "ACTIVE",
      doctorId: null as string | null,
      doctorName: (body.doctorName as string | null) ?? null,
      department: (body.department as string | null) ?? null,
      temperature: (body.temperature as number | null) ?? null,
      pulseRate: (body.pulseRate as number | null) ?? null,
      spo2: (body.spo2 as number | null) ?? null,
      heightCm: (body.heightCm as number | null) ?? null,
      weightKg: (body.weightKg as number | null) ?? null,
      presentComplaint: (body.presentComplaint as string | null) ?? null,
      previousHistory: (body.previousHistory as string | null) ?? null,
      diagnosis: (body.diagnosis as string | null) ?? null,
      additionalNotes: (body.additionalNotes as string | null) ?? null,
      medicines: JSON.stringify(body.medicines ?? []),
      investigations: JSON.stringify(body.investigations ?? []),
      followUpDate: (body.followUpDate as string | null) ?? null,
      notes: (body.notes as string | null) ?? null,
      prescriptionDate: today,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    if (existingIdx >= 0) {
      prescriptionRecords[existingIdx] = record
    } else {
      prescriptionRecords.push(record)
    }

    // Update patient status in the queue.
    const queuePatient = doctorQueue.find((p) => p.id === patientUuid)
    if (queuePatient) {
      queuePatient.status = "VISITED"
      queuePatient.prescriptions = [
        {
          id: rxId,
          prescriptionDate: today,
          status: "ACTIVE",
          doctorName: record.doctorName,
          createdAt: record.createdAt,
        },
      ]
    }

    return created(record)
  }),

  // ── Create medicine ──────────────────────────────────────────────────────────
  http.post("/doctor/medicines", async ({ request }) => {
    const body = await request.json() as Record<string, unknown>
    const newMed = {
      id: nextMedicineId(),
      name: String(body.name ?? ""),
      defaultTiming: (body.defaultTiming as string | null) ?? null,
      defaultDays: (body.defaultDays as string | null) ?? null,
      category: (body.category as string | null) ?? null,
      note: (body.note as string | null) ?? null,
      hospitalId: "mock-hospital-id",
    }
    medicines.push(newMed)
    return created(newMed)
  }),

  // ── Add dropdown option ──────────────────────────────────────────────────────
  http.post("/doctor/dropdown-options", async ({ request }) => {
    const body = await request.json() as { fieldName: string; value: string }
    doctorDropdownOptions.push({ fieldName: body.fieldName, value: body.value })
    return ok(null)
  }),

  // ── AI ask (Sitha) — canned mock answer ─────────────────────────────────────
  http.post("/doctor/ai/ask", () => {
    return ok({ answer: nextCannedAnswer() })
  }),
]
